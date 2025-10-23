// contracts/src/Lotto.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// 🚨 [Orakl VRF Import] VRF 기능을 위한 인터페이스를 가져옵니다.
import "./interfaces/IVRFCoordinator.sol";

// 🚨 [Inheritance] ERC721URIStorage, Ownable를 상속받습니다.
contract Lotto is ERC721URIStorage, Ownable {
    
    // --- 💰 [기존 변수] ---
    uint256 public ticketPrice = 0.01 ether;
    uint256 public nextTicketId;
    uint256 public currentDrawId;

    // --- 💾 [데이터 구조] ---
    struct Draw {
        uint256 drawTimestamp;
        bool isOpenForSale;
    }

    mapping(uint256 => Draw) public draws;
    mapping(uint256 => uint8[6]) public ticketNumbers;
    mapping(uint256 => uint256) public purchaseTimestamps;
    mapping(uint256 => uint256) public ticketToDraw;
    // 회차별 발행된 티켓 ID 목록 (정산용)
    mapping(uint256 => uint256[]) private _drawIdToTicketIds;
    
    // --- 🎲 [VRF 및 로또 결과 관련 변수 추가] 🎲 ---
    mapping(uint256 => uint8[6]) public winningNumbers; // 회차별 당첨 번호 저장
    mapping(uint256 => uint256) public prizePool;      // 회차별 총 상금 풀 (80%, 수수료 제외)
    uint256 public accumulatedJackpot;                  // 누적 이월 잭팟 (1등 미당첨 시 이월)
    uint256 public collectedFees;                       // 누적 수수료 (20%)

    // Orakl VRF Coordinator 컨트랙트 주소
    IVRFCoordinator immutable i_vrfCoordinator;
    
    // VRF 설정 값
    uint64 i_accId;  // Orakl Account ID
    bytes32 i_keyHash;
    uint32 i_callbackGasLimit = 500000;
    uint32 constant NUM_WORDS = 6; // 요청할 난수의 개수
    
    // 난수 요청 ID와 회차 ID를 연결
    mapping(uint256 => uint256) public requestIdToDrawId;
    
    // --- 📢 [이벤트 추가] 📢 ---
    event TicketPurchased(address indexed buyer, uint256 indexed ticketId, uint256 indexed drawId, uint8[6] numbers);
    event DrawCreated(uint256 indexed drawId, uint256 drawTimestamp);
    event RandomWordsRequested(uint256 indexed requestId, uint256 indexed drawId);
    event WinningNumbersSet(uint256 indexed drawId, uint8[6] numbers);
    event PrizesDistributed(
        uint256 indexed drawId, 
        uint256 firstWinners, 
        uint256 secondWinners, 
        uint256 thirdWinners,
        uint256 firstPrize,
        uint256 secondPrize,
        uint256 thirdPrize,
        uint256 rolloverAmount
    );
    event JackpotRollover(uint256 indexed fromDrawId, uint256 indexed toDrawId, uint256 amount);


    // --- 🛠️ [Constructor: Orakl VRF 설정] 🛠️ ---
    constructor(
        address vrfCoordinator, 
        uint64 accId,
        bytes32 keyHash
    )
        ERC721("Kiwoom Lottery Ticket", "KLT")
        Ownable(msg.sender)
    {
        i_vrfCoordinator = IVRFCoordinator(vrfCoordinator);
        i_accId = accId;
        i_keyHash = keyHash;
    }


    // --- 💸 [기존 buyTicket 함수] ---
    function buyTicket(uint8[6] memory _numbers, string memory _tokenURI) external payable {
        require(draws[currentDrawId].isOpenForSale, "Current draw is not open for sale");
        require(msg.value >= ticketPrice, "Lotto: Not enough funds");
        _validateNumbers(_numbers);
        
        uint256 tokenId = nextTicketId;
        
        ticketNumbers[tokenId] = _numbers;
        purchaseTimestamps[tokenId] = block.timestamp;
        ticketToDraw[tokenId] = currentDrawId;
        _drawIdToTicketIds[currentDrawId].push(tokenId);
        
        // 💰 [수익 구조] 수수료 20% / 상금 풀 80%
        uint256 fee = (msg.value * 20) / 100;      // 20% 수수료
        uint256 prize = msg.value - fee;            // 80% 상금 풀
        
        collectedFees += fee;
        prizePool[currentDrawId] += prize;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        nextTicketId++;
        emit TicketPurchased(msg.sender, tokenId, currentDrawId, _numbers);
    }

    // --- 🎫 [배치 구매 함수 - 여러 장을 한 번에!] ---
    /**
     * @notice 여러 티켓을 한 번에 구매 (최대 50장)
     * @param _numbersArray 각 티켓의 번호 배열
     * @param _tokenURIs 각 티켓의 URI 배열
     * @dev 가스비를 대폭 절감하고 한 번의 트랜잭션으로 여러 장 구매 가능
     */
    function buyTicketBatch(
        uint8[6][] calldata _numbersArray,
        string[] calldata _tokenURIs
    ) external payable {
        uint256 batchSize = _numbersArray.length;
        
        // 유효성 검사
        require(batchSize > 0 && batchSize <= 50, "Lotto: Batch size must be 1-50");
        require(batchSize == _tokenURIs.length, "Lotto: Array length mismatch");
        require(draws[currentDrawId].isOpenForSale, "Current draw is not open for sale");
        require(msg.value == ticketPrice * batchSize, "Lotto: Incorrect payment amount");
        
        // 총 수익 계산
        uint256 totalPayment = msg.value;
        uint256 totalFee = (totalPayment * 20) / 100;      // 20% 수수료
        uint256 totalPrize = totalPayment - totalFee;      // 80% 상금 풀
        
        // 상태 업데이트 (한 번만)
        collectedFees += totalFee;
        prizePool[currentDrawId] += totalPrize;
        
        // 각 티켓 발행
        for (uint256 i = 0; i < batchSize; i++) {
            // 번호 유효성 검사
            _validateNumbers(_numbersArray[i]);
            
            uint256 tokenId = nextTicketId;
            
            // 티켓 정보 저장
            ticketNumbers[tokenId] = _numbersArray[i];
            purchaseTimestamps[tokenId] = block.timestamp;
            ticketToDraw[tokenId] = currentDrawId;
            _drawIdToTicketIds[currentDrawId].push(tokenId);
            
            // NFT 발행
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, _tokenURIs[i]);
            
            nextTicketId++;
            
            // 이벤트 발행
            emit TicketPurchased(msg.sender, tokenId, currentDrawId, _numbersArray[i]);
        }
    }

    // --- 🔎 [입력 번호 유효성 검증] ---
    function _validateNumbers(uint8[6] memory numbers) internal pure {
        // 각 번호는 1~45 사이, 중복 금지
        bool[46] memory seen;
        for (uint256 i = 0; i < 6; i++) {
            uint8 n = numbers[i];
            require(n >= 1 && n <= 45, "Lotto: numbers must be 1..45");
            require(!seen[n], "Lotto: duplicate numbers");
            seen[n] = true;
        }
    }
    
    // --- (createOrUpdateDraw, setCurrentDraw 함수는 그대로 둡니다) ---
    function createOrUpdateDraw(uint256 _drawId, uint256 _drawTimestamp, bool _isOpenForSale) external onlyOwner {
        draws[_drawId] = Draw({
            drawTimestamp: _drawTimestamp,
            isOpenForSale: _isOpenForSale
        });
        emit DrawCreated(_drawId, _drawTimestamp);
    }

    function setCurrentDraw(uint256 _drawId) external onlyOwner {
        currentDrawId = _drawId;
    }

    // --- 🔄 [회차 종료 및 다음 회차 시작 - 자동화] ---
    /**
     * @notice 현재 회차를 종료하고 다음 회차를 자동으로 시작합니다.
     * @param _nextDrawTimestamp 다음 회차의 추첨 날짜 (timestamp)
     * @dev 현재 회차 판매를 중단하고, 다음 회차를 생성 및 활성화합니다.
     */
    function finishCurrentAndStartNext(uint256 _nextDrawTimestamp) external onlyOwner {
        // 1. 현재 회차 판매 종료
        if (currentDrawId > 0) {
            draws[currentDrawId].isOpenForSale = false;
        }
        
        // 2. 다음 회차 ID
        uint256 nextDrawId = currentDrawId + 1;
        
        // 3. 다음 회차 생성 (판매 시작)
        draws[nextDrawId] = Draw({
            drawTimestamp: _nextDrawTimestamp,
            isOpenForSale: true
        });
        
        // 4. 현재 판매 회차를 다음 회차로 설정
        currentDrawId = nextDrawId;
        
        emit DrawCreated(nextDrawId, _nextDrawTimestamp);
    }

    // --- 🔧 [회차 리셋 - 긴급용] ---
    /**
     * @notice 회차 시스템을 완전히 리셋합니다 (긴급 상황용)
     * @param _newDrawId 새로운 시작 회차 ID (보통 1)
     * @param _drawTimestamp 추첨 날짜
     * @dev 주의: 이전 회차 데이터는 유지되지만 currentDrawId가 변경됩니다.
     */
    function resetDrawSystem(uint256 _newDrawId, uint256 _drawTimestamp) external onlyOwner {
        // 새 회차 생성
        draws[_newDrawId] = Draw({
            drawTimestamp: _drawTimestamp,
            isOpenForSale: true
        });
        
        // 현재 회차 설정
        currentDrawId = _newDrawId;
        
        emit DrawCreated(_newDrawId, _drawTimestamp);
    }

    // --- 🎲 [난수 요청 함수 추가] 🎲 ---
    /**
     * @notice 난수 생성을 요청하고, 요청 ID를 기록합니다. (추첨 시작)
     * @dev Owner에 의해 호출되어야 합니다.
     */
    function requestRandomWinningNumbers(uint256 _drawId) public onlyOwner returns (uint256 requestId) {
        
        // 1. 보안/유효성 검사: 추첨이 진행 중이거나 판매 중인 회차는 안 됩니다.
        require(_drawId < currentDrawId, "Lotto: Cannot draw current or future draw.");
        require(winningNumbers[_drawId][0] == 0, "Lotto: Winning numbers already set.");
        
        // 2. Orakl VRF Coordinator에 난수 생성을 요청합니다.
        requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_accId,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        // 3. 요청 ID와 회차 ID를 연결
        requestIdToDrawId[requestId] = _drawId;

        emit RandomWordsRequested(requestId, _drawId);
    }
    
    // --- 🎲 [난수 수신 및 처리 함수] 🎲 ---
    /**
     * @notice Orakl VRF 시스템으로부터 난수 결과(randomWords)를 수신하는 함수입니다.
     * @dev 이 함수는 Orakl VRF Coordinator에 의해서만 호출됩니다.
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) 
        external 
    {
        require(msg.sender == address(i_vrfCoordinator), "Only VRF Coordinator can fulfill");
        uint256 drawId = requestIdToDrawId[requestId];
        require(drawId != 0, "Lotto: Request ID not found.");
        
        // ✅ 피셔-예이츠 셔플로 중복 없는 6개 번호 생성
        uint8[6] memory finalNumbers = _generateUniqueNumbers(randomWords);

        winningNumbers[drawId] = finalNumbers;
        
        delete requestIdToDrawId[requestId];

        emit WinningNumbersSet(drawId, finalNumbers);
        
        // 당첨금 분배
        _distributePrizes(drawId);
    }

    // --- 🎲 [중복 없는 난수 생성 함수 추가] 🎲 ---
    /**
     * @notice 피셔-예이츠 셔플을 사용하여 1~45 중 중복 없는 6개 번호 생성
     * @param randomWords Chainlink VRF에서 받은 난수 배열
     * @return 중복 없는 6개의 로또 번호 (정렬되지 않음)
     */
    function _generateUniqueNumbers(uint256[] memory randomWords) 
        internal 
        pure 
        returns (uint8[6] memory) 
    {
        // 1~45 배열 생성
        uint8[45] memory pool;
        for (uint8 i = 0; i < 45; i++) {
            pool[i] = i + 1; // 1부터 45까지
        }
        
        // 피셔-예이츠 셔플: 앞 6개 위치만 섞기
        for (uint8 i = 0; i < 6; i++) {
            // randomWords를 순환 사용하여 난수 생성
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(
                randomWords[i % randomWords.length], 
                i
            ))) % (45 - i);
            
            uint8 j = uint8(randomIndex) + i;
            
            // Swap: pool[i] <-> pool[j]
            uint8 temp = pool[i];
            pool[i] = pool[j];
            pool[j] = temp;
        }
        
        // 앞 6개만 리턴
        uint8[6] memory result;
        for (uint8 i = 0; i < 6; i++) {
            result[i] = pool[i];
        }
        
        return result;
    }

    // --- 🧮 [유틸: 번호 일치 개수 계산] ---
    function _countMatches(uint8[6] memory a, uint8[6] memory b) internal pure returns (uint8) {
        bool[46] memory present;
        for (uint256 i = 0; i < 6; i++) {
            present[a[i]] = true;
        }
        uint8 matches;
        for (uint256 j = 0; j < 6; j++) {
            if (present[b[j]]) matches++;
        }
        return matches;
    }

    // --- 💰 [당첨금 분배 - 새로운 구조] ---
    function _distributePrizes(uint256 drawId) internal {
        uint8[6] memory win = winningNumbers[drawId];
        require(win[0] != 0, "Lotto: winning numbers not set");

        uint256[] memory tickets = _drawIdToTicketIds[drawId];
        uint256 totalTickets = tickets.length;
        if (totalTickets == 0) {
            return; // 분배할 대상 없음
        }

        // 1. 각 등수별 당첨자 수 계산 및 티켓 ID 수집
        uint256[] memory firstWinners = new uint256[](totalTickets);
        uint256[] memory secondWinners = new uint256[](totalTickets);
        uint256[] memory thirdWinners = new uint256[](totalTickets);
        uint256 firstCount;
        uint256 secondCount;
        uint256 thirdCount;

        for (uint256 i = 0; i < totalTickets; i++) {
            uint256 tokenId = tickets[i];
            uint8[6] memory picked = ticketNumbers[tokenId];
            uint8 matches = _countMatches(picked, win);
            
            if (matches == 6) {
                firstWinners[firstCount++] = tokenId;
            } else if (matches == 5) {
                secondWinners[secondCount++] = tokenId;
            } else if (matches == 4) {
                thirdWinners[thirdCount++] = tokenId;
            }
        }

        // 2. 총 당첨금 계산 (이 회차 상금 풀 + 이월 잭팟)
        uint256 totalPrize = prizePool[drawId] + accumulatedJackpot;
        if (totalPrize == 0) {
            return; // 상금 풀 없음
        }

        // 3. 기본 배분 비율 계산
        uint256 firstPrize = (totalPrize * 70) / 100;   // 70%
        uint256 secondPrize = (totalPrize * 10) / 100;  // 10%
        uint256 thirdPrize = (totalPrize * 20) / 100;   // 20%
        uint256 rolloverAmount = 0;

        // 4. 케이스별 처리
        if (firstCount == 0) {
            // 케이스 1: 1등 없음 -> 모든 상금 다음 회차로 이월
            rolloverAmount = totalPrize;
            accumulatedJackpot = rolloverAmount;
            emit JackpotRollover(drawId, drawId + 1, rolloverAmount);
        } else if (secondCount == 0 && thirdCount > 0) {
            // 케이스 2: 1등 있음 + 2등 없음 + 3등 있음 -> 2등 몫을 3등에 가산
            thirdPrize += secondPrize;
            secondPrize = 0;
            
            // 배분
            _payoutWinners(firstWinners, firstCount, firstPrize);
            _payoutWinners(thirdWinners, thirdCount, thirdPrize);
            accumulatedJackpot = 0; // 1등 당첨되면 이월금 초기화
        } else if (secondCount == 0 && thirdCount == 0) {
            // 케이스 3: 1등만 있음 -> 모든 상금을 1등에게
            firstPrize = totalPrize;
            _payoutWinners(firstWinners, firstCount, firstPrize);
            accumulatedJackpot = 0; // 1등 당첨되면 이월금 초기화
        } else {
            // 케이스 4: 정상 케이스 (1등 있고 2등 또는 3등도 있음)
            _payoutWinners(firstWinners, firstCount, firstPrize);
            if (secondCount > 0) {
                _payoutWinners(secondWinners, secondCount, secondPrize);
            } else {
                // 2등 없으면 3등에 가산
                thirdPrize += secondPrize;
            }
            if (thirdCount > 0) {
                _payoutWinners(thirdWinners, thirdCount, thirdPrize);
            }
            accumulatedJackpot = 0; // 1등 당첨되면 이월금 초기화
        }

        // 5. 상태 업데이트
        prizePool[drawId] = 0;

        // 6. 이벤트 발행
        emit PrizesDistributed(
            drawId,
            firstCount,
            secondCount,
            thirdCount,
            firstCount > 0 ? firstPrize / firstCount : 0,
            secondCount > 0 ? secondPrize / secondCount : 0,
            thirdCount > 0 ? thirdPrize / thirdCount : 0,
            rolloverAmount
        );
    }

    // --- 💸 [당첨금 지급 헬퍼 함수] ---
    function _payoutWinners(
        uint256[] memory winners,
        uint256 winnerCount,
        uint256 totalAmount
    ) internal {
        if (winnerCount == 0 || totalAmount == 0) {
            return;
        }

        uint256 amountPerWinner = totalAmount / winnerCount;
        
        for (uint256 i = 0; i < winnerCount; i++) {
            uint256 tokenId = winners[i];
            address winner = ownerOf(tokenId);
            (bool ok, ) = payable(winner).call{value: amountPerWinner}("");
            require(ok, "Lotto: payout failed");
        }
    }
    
    // --- 💰 [수수료 인출 함수] ---
    function withdrawFees() external onlyOwner {
        require(collectedFees > 0, "Lotto: No fees to withdraw");
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Lotto: Fee withdrawal failed");
    }
    
    // --- 🚨 [긴급 인출 함수] ---
    function emergencyWithdraw() external onlyOwner {
        // 긴급 상황에서만 사용: 모든 잔액 인출
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Lotto: Emergency withdrawal failed");
    }

    // --- 💰 [티켓 가격 변경 함수] ---
    /// @notice 관리자가 티켓 가격을 변경합니다
    /// @param newPrice 새로운 티켓 가격 (wei 단위)
    function setTicketPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Lotto: Price must be greater than 0");
        ticketPrice = newPrice;
    }

    // --- 🧪 [테스트 전용 함수 - 배포 전 삭제 필수!] ---
    /// @notice 테스트용: 관리자가 당첨번호를 직접 설정 (실제 배포 시 삭제!)
    /// @dev 이 함수는 테스트 목적으로만 사용. 실제 배포 전 반드시 제거할 것!
    function setWinningNumbersForTest(uint256 _drawId, uint8[6] memory _numbers) 
        external 
        onlyOwner 
    {
        require(_drawId < currentDrawId, "Lotto: Cannot set for current/future draw");
        require(winningNumbers[_drawId][0] == 0, "Lotto: Winning numbers already set");
        
        // 번호 유효성 검증
        _validateNumbers(_numbers);
        
        // 당첨번호 설정
        winningNumbers[_drawId] = _numbers;
        emit WinningNumbersSet(_drawId, _numbers);
        
        // 당첨금 즉시 분배
        _distributePrizes(_drawId);
    }

    // --- (ERC721 내부 함수) ---
    function _baseURI() internal pure override returns (string memory) { return ""; }
}