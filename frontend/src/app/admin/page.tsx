'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import MobileLayout from '@/components/MobileLayout';
import Header from '@/components/Header';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';
import * as mockVrfAbiModule from '@/lib/mockVrfAbi.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const mockVrfAbi = (mockVrfAbiModule as any).default || mockVrfAbiModule;

const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1'; // 새 컨트랙트 (환경변수 무시)
const mockVrfAddress = process.env.NEXT_PUBLIC_MOCK_VRF_ADDRESS || '0xbb1ced5b060cc67af8c393844b1d3054afb90273';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

export default function AdminPage() {
  const router = useRouter();
  const { address: wagmiAddress, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const [address, setAddress] = useState('');
  const [contractOwner, setContractOwner] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [currentDrawId, setCurrentDrawId] = useState(0);
  const [collectedFees, setCollectedFees] = useState('0');
  const [accumulatedJackpot, setAccumulatedJackpot] = useState('0');
  const [isLoading, setIsLoading] = useState(false);

  // 새 회차 생성용
  const [newDrawId, setNewDrawId] = useState(0);
  const [newDrawTimestamp, setNewDrawTimestamp] = useState('');

  // VRF 요청용
  const [vrfDrawId, setVrfDrawId] = useState(0);
  const [latestRequestId, setLatestRequestId] = useState<number | null>(null);

  // 테스트 당첨번호 설정용
  const [testDrawId, setTestDrawId] = useState(0);
  const [testNumbers, setTestNumbers] = useState<string>(''); // "1,2,3,4,5,6" 형식

  // 티켓 가격 변경용
  const [currentTicketPrice, setCurrentTicketPrice] = useState('0');
  const [newTicketPrice, setNewTicketPrice] = useState('10'); // 기본값 10 KAIA

  // 지갑 연결 확인 (✅ Reown AppKit 패턴: wagmi hook 사용)
  useEffect(() => {
    const checkWallet = async () => {
      if (isConnected && wagmiAddress) {
        try {
          setAddress(wagmiAddress);

          // 컨트랙트에서 실제 owner 가져오기
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
          const owner = await contract.owner();
          setContractOwner(owner);
          
          // 현재 지갑이 owner인지 확인
          const isOwnerWallet = wagmiAddress.toLowerCase() === owner.toLowerCase();
          setIsOwner(isOwnerWallet);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📋 Admin 체크:', { contractAddress, owner, wagmiAddress, isOwner: isOwnerWallet });
          }

          // 컨트랙트 데이터 로드
          await loadContractData();
        } catch (error) {
          console.error('지갑 확인 실패:', error);
        }
      }
    };

    checkWallet();
  }, [isConnected, wagmiAddress]);

  // 컨트랙트 데이터 로드
  const loadContractData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

      const currentDraw = await contract.currentDrawId();
      const fees = await contract.collectedFees();
      const jackpot = await contract.accumulatedJackpot();
      const ticketPrice = await contract.ticketPrice();

      setCurrentDrawId(Number(currentDraw));
      setCollectedFees(ethers.formatEther(fees));
      setAccumulatedJackpot(ethers.formatEther(jackpot));
      setCurrentTicketPrice(ethers.formatEther(ticketPrice));

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Admin 데이터 로드:', { 
          currentDrawId: Number(currentDraw), 
          ticketPrice: ethers.formatEther(ticketPrice) + ' KAIA' 
        });
      }
    } catch (error) {
      console.error('컨트랙트 데이터 로드 실패:', error);
    }
  };

  // ✅ Reown AppKit 패턴: walletProvider를 사용하는 헬퍼 함수
  const getEthersProvider = async () => {
    if (!walletProvider) {
      throw new Error('지갑 프로바이더를 찾을 수 없습니다. 지갑을 다시 연결해주세요.');
    }
    return new ethers.BrowserProvider(walletProvider as any);
  };

  // 지갑 연결 (이미 Reown AppKit으로 연결됨)
  const connectWallet = async () => {
    if (!isConnected || !wagmiAddress) {
      alert('지갑을 먼저 연결해주세요! (Header의 지갑 연결 버튼 사용)');
      return;
    }

    try {
      setAddress(wagmiAddress);
      
      // 컨트랙트에서 owner 가져오기
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
      const owner = await contract.owner();
      setContractOwner(owner);
      setIsOwner(wagmiAddress.toLowerCase() === owner.toLowerCase());

      await loadContractData();
    } catch (error) {
      console.error('지갑 연결 실패:', error);
    }
  };

  // 회차 생성
  const createDraw = async () => {
    if (!isOwner || !newDrawId || !newDrawTimestamp) {
      alert('모든 필드를 입력해주세요!');
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const timestamp = Math.floor(new Date(newDrawTimestamp).getTime() / 1000);

      const tx = await contract.createOrUpdateDraw(newDrawId, timestamp, true, {
        gasLimit: 200000,
      });

      alert(`회차 생성 트랜잭션 전송됨!\n\nTx: ${tx.hash}`);
      await tx.wait();

      // 현재 회차로 설정
      const tx2 = await contract.setCurrentDraw(newDrawId, { gasLimit: 100000 });
      await tx2.wait();

      alert('✅ 회차 생성 완료!');
      await loadContractData();
      setNewDrawId(0);
      setNewDrawTimestamp('');
    } catch (error: any) {
      alert(`회차 생성 실패: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 회차 종료 & 다음 회차 자동 시작 (개선!)
  const finishAndStartNext = async () => {
    if (!isOwner) return;

    const nextDrawId = currentDrawId + 1;
    if (!confirm(`✅ 회차 #${currentDrawId}를 종료하고\n🎯 회차 #${nextDrawId}을 자동 시작하시겠습니까?\n\n(1주일 후 추첨)`)) {
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const nextDrawTimestamp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7일 후

      // 🚀 한 번에 처리! (개선된 함수)
      const tx = await contract.finishCurrentAndStartNext(nextDrawTimestamp, {
        gasLimit: 300000,
      });

      alert(`📤 트랜잭션 전송 완료!\n\nHash: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();

      alert(`✅ 회차 전환 완료!\n\n종료: #${currentDrawId}\n시작: #${nextDrawId} 🎉`);
      await loadContractData();
    } catch (error: any) {
      console.error('회차 전환 실패:', error);
      alert(`❌ 회차 전환 실패:\n${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 회차 리셋 (긴급용 - 처음부터 다시 시작)
  const resetToDrawOne = async () => {
    if (!isOwner) return;

    if (!confirm(`⚠️ 경고!\n\n회차를 #1로 완전히 리셋하시겠습니까?\n\n현재 회차: #${currentDrawId}\n→ 새 회차: #1\n\n(이전 데이터는 유지되지만 판매는 #1부터 다시 시작됩니다)`)) {
      return;
    }

    const doubleCheck = prompt('정말 리셋하시겠습니까?\n확인하려면 "RESET"을 입력하세요.');
    if (doubleCheck !== 'RESET') {
      alert('취소되었습니다.');
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const firstDrawTimestamp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7일 후

      // 🔧 리셋!
      const tx = await contract.resetDrawSystem(1, firstDrawTimestamp, {
        gasLimit: 300000,
      });

      alert(`📤 리셋 트랜잭션 전송!\n\nHash: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();

      alert(`✅ 회차 리셋 완료!\n\n새 회차: #1 🎉\n추첨일: 1주일 후`);
      await loadContractData();
    } catch (error: any) {
      console.error('리셋 실패:', error);
      alert(`❌ 리셋 실패:\n${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // VRF 요청
  const requestWinningNumbers = async () => {
    if (!isOwner || !vrfDrawId) {
      alert('회차를 입력해주세요!');
      return;
    }

    if (vrfDrawId >= currentDrawId) {
      alert('현재 회차보다 이전 회차만 추첨할 수 있습니다!');
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const tx = await contract.requestRandomWinningNumbers(vrfDrawId, {
        gasLimit: 500000,
      });

      alert(`VRF 요청 전송됨!\n\nTx: ${tx.hash}`);
      await tx.wait();
      alert('✅ VRF 요청 완료!');
    } catch (error: any) {
      alert(`VRF 요청 실패: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock VRF fulfillRequest
  const mockVrfFulfillRequest = async () => {
    if (!isOwner || !latestRequestId) {
      alert('Request ID를 입력해주세요!');
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const mockVrfContract = new ethers.Contract(mockVrfAddress, mockVrfAbi, signer);

      const tx = await mockVrfContract.fulfillRequest(latestRequestId, {
        gasLimit: 500000,
      });

      alert(`Mock VRF 실행 중...\n\nTx: ${tx.hash}`);
      await tx.wait();
      alert('✅ 당첨 번호 생성 완료!');
    } catch (error: any) {
      alert(`Mock VRF 실패: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🧪 테스트용 당첨번호 직접 설정
  const setTestWinningNumbers = async () => {
    if (!isOwner || !testDrawId || !testNumbers) {
      alert('회차와 당첨번호를 모두 입력해주세요!');
      return;
    }

    try {
      // 입력 파싱 및 검증
      const numbersArray = testNumbers.split(',').map(n => parseInt(n.trim()));
      
      if (numbersArray.length !== 6) {
        alert('정확히 6개의 번호를 입력해주세요!\n예: 1,2,3,4,5,6');
        return;
      }

      // 1~45 범위 검증
      const invalidNumbers = numbersArray.filter(n => n < 1 || n > 45 || isNaN(n));
      if (invalidNumbers.length > 0) {
        alert('모든 번호는 1~45 사이여야 합니다!');
        return;
      }

      // 중복 검증
      const uniqueNumbers = new Set(numbersArray);
      if (uniqueNumbers.size !== 6) {
        alert('중복된 번호가 있습니다! 6개의 서로 다른 번호를 입력해주세요.');
        return;
      }

      if (!confirm(`회차 #${testDrawId}의 당첨번호를 설정하시겠습니까?\n\n당첨번호: ${numbersArray.join(', ')}\n\n⚠️ 설정 즉시 당첨금이 자동 분배됩니다!`)) {
        return;
      }

      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const tx = await contract.setWinningNumbersForTest(testDrawId, numbersArray, {
        gasLimit: 500000,
      });

      alert(`📤 트랜잭션 전송 완료!\n\nHash: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();

      alert(`✅ 당첨번호 설정 완료! 🎉\n\n회차: #${testDrawId}\n당첨번호: ${numbersArray.join(', ')}\n\n당첨금이 자동으로 분배되었습니다!`);
      
      // 입력 초기화
      setTestDrawId(0);
      setTestNumbers('');
      
      await loadContractData();
    } catch (error: any) {
      console.error('테스트 당첨번호 설정 실패:', error);
      alert(`❌ 설정 실패:\n${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 티켓 가격 변경
  const changeTicketPrice = async () => {
    if (!isOwner) {
      alert('관리자 권한이 필요합니다!');
      return;
    }

    const priceValue = parseFloat(newTicketPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      alert('유효한 가격을 입력해주세요! (0보다 커야 합니다)');
      return;
    }

    if (!confirm(`티켓 가격을 변경하시겠습니까?\n\n현재: ${currentTicketPrice} KAIA\n→ 변경: ${newTicketPrice} KAIA`)) {
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const priceInWei = ethers.parseEther(newTicketPrice);
      const tx = await contract.setTicketPrice(priceInWei, {
        gasLimit: 100000,
      });

      alert(`📤 트랜잭션 전송 완료!\n\nHash: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();

      alert(`✅ 티켓 가격 변경 완료! 🎉\n\n새 가격: ${newTicketPrice} KAIA`);
      
      await loadContractData();
    } catch (error: any) {
      console.error('티켓 가격 변경 실패:', error);
      alert(`❌ 변경 실패:\n${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 수수료 인출
  const withdrawFees = async () => {
    if (!isOwner) return;

    if (!confirm(`수수료 ${collectedFees} KAIA를 인출하시겠습니까?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = await getEthersProvider();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, lottoAbi, signer);

      const tx = await contract.withdrawFees({ gasLimit: 100000 });
      alert(`수수료 인출 중...\n\nTx: ${tx.hash}`);
      await tx.wait();
      alert('✅ 수수료 인출 완료!');
      await loadContractData();
    } catch (error: any) {
      alert(`수수료 인출 실패: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <MobileLayout showBottomNav={false}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 'clamp(20px, 5vw, 30px)',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(20px, 5vw, 24px)',
              fontWeight: '700',
              color: 'white',
              marginBottom: 'clamp(15px, 4vw, 20px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            지갑을 연결해주세요
          </h2>
          <button
            onClick={connectWallet}
            style={{
              padding: 'clamp(12px, 3vw, 15px) clamp(30px, 7vw, 40px)',
              background: 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            🦊 MetaMask 연결
          </button>
        </div>
      </MobileLayout>
    );
  }

  if (!isOwner) {
    return (
      <MobileLayout showBottomNav={false}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 'clamp(20px, 5vw, 30px)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(20px, 5vw, 24px)',
              fontWeight: '700',
              color: 'white',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            ⚠️ 권한 없음
          </h2>
          <p
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            관리자 계정으로 연결해주세요
          </p>
          {contractOwner && (
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                marginBottom: 'clamp(20px, 5vw, 25px)',
                wordBreak: 'break-all',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: '5px',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                👤 컨트랙트 Owner:
              </div>
              <div
                style={{
                  fontSize: 'clamp(11px, 2.8vw, 13px)',
                  color: 'white',
                  fontFamily: 'monospace',
                }}
              >
                {contractOwner}
              </div>
            </div>
          )}
          <button
            onClick={() => router.push('/')}
            style={{
              padding: 'clamp(10px, 3vw, 12px) clamp(25px, 6vw, 30px)',
              background: 'white',
              color: '#333',
              border: 'none',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            홈으로 돌아가기
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav={false}>
      <Header />
      
      {/* 메인 콘텐츠 */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(15px, 4vw, 20px)',
          overflow: 'auto',
        }}
      >
        {/* 제목 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(22px, 5.5vw, 26px)',
              fontWeight: '700',
              color: 'white',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            👑 관리자 패널
          </h2>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: 'clamp(8px, 2vw, 10px) clamp(15px, 4vw, 18px)',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              fontSize: 'clamp(12px, 3vw, 14px)',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            홈으로
          </button>
        </div>

        {/* 현재 상태 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            color: 'white',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            현재 상태
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'clamp(10px, 3vw, 12px)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  opacity: 0.8,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                현재 회차
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: '700',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                #{currentDrawId}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  opacity: 0.8,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                누적 수수료
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: '700',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {parseFloat(collectedFees).toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        {/* 💰 티켓 가격 설정 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: 'white',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            💰 티켓 가격 설정
          </h3>
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              padding: 'clamp(12px, 3vw, 15px)',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'white',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              현재 가격:
            </span>
            <span
              style={{
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '700',
                color: 'white',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {currentTicketPrice} KAIA
            </span>
          </div>
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 10px)', alignItems: 'center', marginBottom: 'clamp(12px, 3vw, 15px)' }}>
            <input
              type="number"
              step="0.01"
              value={newTicketPrice}
              onChange={(e) => setNewTicketPrice(e.target.value)}
              placeholder="새 가격 (KAIA)"
              style={{
                flex: 1,
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '2px solid white',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                color: '#333',
                background: 'white',
              }}
            />
            <span
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'white',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              KAIA
            </span>
          </div>
          <button
            onClick={changeTicketPrice}
            disabled={isLoading || !newTicketPrice}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              background: isLoading || !newTicketPrice ? 'rgba(255,255,255,0.3)' : 'white',
              color: isLoading || !newTicketPrice ? 'rgba(255,255,255,0.6)' : '#059669',
              border: 'none',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '700',
              cursor: isLoading || !newTicketPrice ? 'not-allowed' : 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {isLoading ? '처리 중...' : '💰 가격 변경'}
          </button>
        </div>

        {/* 🔄 회차 관리 (간편) */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            🔄 회차 관리 (한 번에!)
          </h3>
          <p
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#666',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            ✨ <strong>자동화!</strong> 현재 회차 종료 + 다음 회차 시작을 한 번에 처리합니다
          </p>
          <button
            onClick={finishAndStartNext}
            disabled={isLoading || currentDrawId === 0}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              background: isLoading || currentDrawId === 0 ? '#E0E0E0' : 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              cursor: isLoading || currentDrawId === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {isLoading ? '처리 중...' : currentDrawId === 0 ? '회차를 먼저 시작하세요' : `🔄 회차 #${currentDrawId} 종료 → #${currentDrawId + 1} 시작`}
          </button>
        </div>

        {/* ⚠️ 긴급 리셋 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFA726 0%, #FF7043 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
            border: '2px solid #FF5722',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: 'white',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            ⚠️ 긴급 리셋
          </h3>
          <p
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: 'white',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
              opacity: 0.9,
            }}
          >
            <strong>주의:</strong> 회차를 #1부터 완전히 다시 시작합니다. 이전 데이터는 유지되지만 판매는 #1부터 재개됩니다.
          </p>
          <button
            onClick={resetToDrawOne}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              background: isLoading ? '#E0E0E0' : '#FFFFFF',
              color: isLoading ? '#999' : '#FF5722',
              border: '2px solid #FF5722',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {isLoading ? '처리 중...' : '🔧 회차를 #1로 리셋'}
          </button>
        </div>

        {/* 회차 생성 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            새 회차 생성
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 3vw, 12px)' }}>
            <input
              type="number"
              value={newDrawId || ''}
              onChange={(e) => setNewDrawId(Number(e.target.value))}
              placeholder="회차 번호"
              style={{
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '1px solid #E0E0E0',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                color: '#333',
              }}
            />
            <input
              type="datetime-local"
              value={newDrawTimestamp}
              onChange={(e) => setNewDrawTimestamp(e.target.value)}
              style={{
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '1px solid #E0E0E0',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                color: '#333',
              }}
            />
            <button
              onClick={createDraw}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 15px)',
                background: isLoading ? '#E0E0E0' : 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(10px, 3vw, 12px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {isLoading ? '처리 중...' : '회차 생성'}
            </button>
          </div>
        </div>

        {/* VRF 요청 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            VRF 당첨 번호 요청
          </h3>
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 10px)', marginBottom: 'clamp(12px, 3vw, 15px)' }}>
            <input
              type="number"
              value={vrfDrawId || ''}
              onChange={(e) => setVrfDrawId(Number(e.target.value))}
              placeholder="회차 번호"
              style={{
                flex: 1,
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '1px solid #E0E0E0',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                color: '#333',
              }}
            />
            <button
              onClick={requestWinningNumbers}
              disabled={isLoading}
              style={{
                padding: 'clamp(10px, 3vw, 12px) clamp(20px, 5vw, 25px)',
                background: isLoading ? '#E0E0E0' : '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              요청
            </button>
          </div>

          {/* Mock VRF */}
          <div
            style={{
              marginTop: 'clamp(12px, 3vw, 15px)',
              paddingTop: 'clamp(12px, 3vw, 15px)',
              borderTop: '1px solid #E0E0E0',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: '#666',
                marginBottom: 'clamp(8px, 2vw, 10px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              🧪 Mock VRF (테스트용)
            </p>
            <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 10px)' }}>
              <input
                type="number"
                value={latestRequestId || ''}
                onChange={(e) => setLatestRequestId(Number(e.target.value))}
                placeholder="Request ID"
                style={{
                  flex: 1,
                  padding: 'clamp(10px, 3vw, 12px)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  border: '1px solid #E0E0E0',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                  color: '#333',
                }}
              />
              <button
                onClick={mockVrfFulfillRequest}
                disabled={isLoading}
                style={{
                  padding: 'clamp(10px, 3vw, 12px) clamp(20px, 5vw, 25px)',
                  background: isLoading ? '#E0E0E0' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                실행
              </button>
            </div>
          </div>
        </div>

        {/* 🧪 테스트용 당첨번호 직접 설정 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: 'white',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            🧪 테스트용 당첨번호 설정
          </h3>
          <p
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: 'white',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
              opacity: 0.9,
            }}
          >
            종료된 회차에 당첨번호를 직접 설정합니다. 설정 즉시 당첨금이 자동 분배됩니다!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 3vw, 12px)' }}>
            <input
              type="number"
              value={testDrawId || ''}
              onChange={(e) => setTestDrawId(Number(e.target.value))}
              placeholder="회차 번호 (예: 1)"
              style={{
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '2px solid white',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                color: '#333',
                background: 'white',
              }}
            />
            <input
              type="text"
              value={testNumbers}
              onChange={(e) => setTestNumbers(e.target.value)}
              placeholder="당첨번호 (예: 7,15,23,31,38,42)"
              style={{
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '2px solid white',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                color: '#333',
                background: 'white',
              }}
            />
            <div
              style={{
                fontSize: 'clamp(11px, 2.8vw, 13px)',
                color: 'white',
                fontFamily: 'SF Pro, Arial, sans-serif',
                opacity: 0.8,
              }}
            >
              💡 팁: 6개의 서로 다른 번호(1~45)를 쉼표로 구분하여 입력하세요
            </div>
            <button
              onClick={setTestWinningNumbers}
              disabled={isLoading || !testDrawId || !testNumbers}
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 15px)',
                background: isLoading || !testDrawId || !testNumbers ? 'rgba(255,255,255,0.3)' : 'white',
                color: isLoading || !testDrawId || !testNumbers ? 'rgba(255,255,255,0.6)' : '#FB8C00',
                border: 'none',
                borderRadius: 'clamp(10px, 3vw, 12px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '700',
                cursor: isLoading || !testDrawId || !testNumbers ? 'not-allowed' : 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {isLoading ? '처리 중...' : '🎯 당첨번호 설정 & 분배'}
            </button>
          </div>
        </div>

        {/* 수수료 인출 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(60px, 12vh, 80px)',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            💰 수수료 인출
          </h3>
          <p
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#666',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            누적 수수료: {parseFloat(collectedFees).toFixed(4)} KAIA
          </p>
          <button
            onClick={withdrawFees}
            disabled={isLoading || parseFloat(collectedFees) === 0}
            style={{
              width: '100%',
              padding: 'clamp(12px, 3vw, 15px)',
              background:
                isLoading || parseFloat(collectedFees) === 0
                  ? '#E0E0E0'
                  : 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'clamp(10px, 3vw, 12px)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              cursor: isLoading || parseFloat(collectedFees) === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {isLoading ? '처리 중...' : '수수료 인출'}
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}

