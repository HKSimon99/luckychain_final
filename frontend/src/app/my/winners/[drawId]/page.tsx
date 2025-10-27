'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ethers } from 'ethers';
import MobileStatusBar from '@/components/MobileStatusBar';
import { useKaiaPrice } from '@/contexts/KaiaPriceContext';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface WinnerInfo {
  grade: string;
  match: string;
  winner: string;
  reward: string;
  rewardKRW: string;
  numbers: number[];
  ticketCount: number;
}

export default function WinnersResultPage() {
  const router = useRouter();
  const params = useParams();
  const { kaiaPrice } = useKaiaPrice();
  const drawId = parseInt(params.drawId as string);

  const [searchInput, setSearchInput] = useState('');
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [totalPrize, setTotalPrize] = useState('0');
  const [totalPrizeKRW, setTotalPrizeKRW] = useState('0');
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [winners, setWinners] = useState<WinnerInfo[]>([]);
  const [availableDrawIds, setAvailableDrawIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDrawResults = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 1. 당첨 번호 조회 (오름차순 정렬)
        const nums: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          nums.push(Number(num));
        }
        nums.sort((a, b) => a - b); // 오름차순 정렬
        setWinningNumbers(nums);

        // 빠른 조회용 회차 목록 생성 (최대 8개)
        const currentDrawId = await contract.currentDrawId();
        const current = Number(currentDrawId);
        const draws: number[] = [];
        for (let i = Math.max(1, current - 1); i >= Math.max(1, current - 8); i--) {
          draws.push(i);
        }
        setAvailableDrawIds(draws);

        // 2. 상금 정보 조회 (PrizesDistributed 이벤트)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 500000);
        
        const prizeFilter = contract.filters.PrizesDistributed(drawId);
        const prizeEvents = await contract.queryFilter(prizeFilter, fromBlock, 'latest');

        let firstPrize = 0, secondPrize = 0, thirdPrize = 0;
        let firstCount = 0, secondCount = 0, thirdCount = 0;

        if (prizeEvents.length > 0) {
          const prizeEvent = prizeEvents[0] as any;
          firstCount = Number(prizeEvent.args.firstWinners || 0);
          secondCount = Number(prizeEvent.args.secondWinners || 0);
          thirdCount = Number(prizeEvent.args.thirdWinners || 0);
          firstPrize = Number(ethers.formatEther(prizeEvent.args.firstPrize || 0));
          secondPrize = Number(ethers.formatEther(prizeEvent.args.secondPrize || 0));
          thirdPrize = Number(ethers.formatEther(prizeEvent.args.thirdPrize || 0));
        }

        const total = firstPrize * firstCount + secondPrize * secondCount + thirdPrize * thirdCount;
        setTotalPrize(total.toFixed(2));
        setTotalPrizeKRW(Math.floor(total * kaiaPrice).toLocaleString('ko-KR'));

        // 3. 참여자 수 조회 (TicketPurchased 이벤트)
        const ticketFilter = contract.filters.TicketPurchased(null, null, drawId);
        const ticketEvents = await contract.queryFilter(ticketFilter, fromBlock, 'latest');
        const totalTickets = ticketEvents.length; // 해당 회차의 총 구매 장수
        setTotalParticipants(totalTickets);

        // 4. 당첨자 정보 구성
        const winnerList: WinnerInfo[] = [];

        if (firstCount > 0) {
          winnerList.push({
            grade: '1등',
            match: '6개 일치',
            winner: `${firstCount}명 당첨`,
            reward: `${firstPrize.toFixed(2)} KAIA`,
            rewardKRW: `₩${Math.floor(firstPrize * kaiaPrice).toLocaleString('ko-KR')}`,
            numbers: nums,
            ticketCount: totalTickets, // 총 구매 장수 사용
          });
        }

        if (secondCount > 0) {
          winnerList.push({
            grade: '2등',
            match: '5개 일치',
            winner: `${secondCount}명 당첨`,
            reward: `${secondPrize.toFixed(2)} KAIA`,
            rewardKRW: `₩${Math.floor(secondPrize * kaiaPrice).toLocaleString('ko-KR')}`,
            numbers: nums,
            ticketCount: totalTickets, // 총 구매 장수 사용
          });
        }

        if (thirdCount > 0) {
          winnerList.push({
            grade: '3등',
            match: '4개 일치',
            winner: `${thirdCount}명 당첨`,
            reward: `${thirdPrize.toFixed(2)} KAIA`,
            rewardKRW: `₩${Math.floor(thirdPrize * kaiaPrice).toLocaleString('ko-KR')}`,
            numbers: nums,
            ticketCount: totalTickets, // 총 구매 장수 사용
          });
        }

        setWinners(winnerList);

      } catch (error) {
        console.error('회차 결과 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (drawId) {
      loadDrawResults();
    }
  }, [drawId, kaiaPrice]);

  const handleSearch = () => {
    const newDrawId = parseInt(searchInput);
    if (!isNaN(newDrawId) && newDrawId > 0) {
      router.push(`/my/winners/${newDrawId}`);
    }
  };

  const getGradeGradient = (grade: string) => {
    if (grade === '1등') return 'linear-gradient(135deg, #FFE500 0%, #FF8000 100%)';
    if (grade === '2등') return 'linear-gradient(135deg, #D2D2D2 0%, #787878 100%)';
    return 'linear-gradient(135deg, #FFB048 0%, #DA4C00 100%)';
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          background: '#380D44',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 'clamp(14px, 3.5vw, 16px)',
        }}
      >
        로딩 중...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 상단 고정 영역 */}
      <div style={{ flexShrink: 0 }}>
        <MobileStatusBar />

        {/* back + 회차별 당첨자 정보 텍스트 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'clamp(20px, 5vw, 25px)',
            position: 'relative',
          }}
        >
          <div
            onClick={() => router.push('/my/winners')}
            style={{
              position: 'absolute',
              left: 'clamp(18px, 4.5vw, 20px)',
              fontSize: 'clamp(18px, 4.5vw, 20px)',
              cursor: 'pointer',
              color: 'white',
            }}
          >
            ←
          </div>
          <span
            style={{
              color: 'white',
              fontSize: 'clamp(14px, 3.5vw, 15px)',
              fontWeight: '700',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            회차별 당첨자 정보
          </span>
        </div>

        {/* 검색창 박스 (고정) */}
        <div
          style={{
            marginTop: 'clamp(20px, 5vw, 25px)',
            padding: '0 clamp(18px, 4.5vw, 20px)',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(217,217,217,0.2)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              padding: '0 clamp(10px, 2.5vw, 12px)',
              height: 'clamp(45px, 11.3vw, 50px)',
            }}
          >
            <input
              type="number"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`현재: ${drawId}회차`}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                fontSize: 'clamp(12px, 3vw, 13px)',
                fontWeight: '300',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(4px, 1vw, 5px)',
                background: 'linear-gradient(122deg, #B715BF 0%, #C10E8E 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                padding: 'clamp(7px, 1.8vw, 8px) clamp(13px, 3.3vw, 15px)',
                cursor: 'pointer',
                fontSize: 'clamp(13px, 3.3vw, 14px)',
                fontWeight: '400',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              <span>🔍</span>
              조회
            </button>
          </div>
        </div>

        {/* 빠른 조회 */}
        <div
          style={{
            padding: '0 clamp(18px, 4.5vw, 20px)',
            marginTop: 'clamp(10px, 2.5vw, 12px)',
          }}
        >
          <div
            style={{
              textAlign: 'left',
              color: 'white',
              fontSize: 'clamp(12px, 3vw, 13px)',
              marginBottom: 'clamp(6px, 1.5vw, 8px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            빠른 조회
          </div>
          <div
            style={{
              display: 'flex',
              gap: 'clamp(8px, 2vw, 10px)',
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingBottom: 'clamp(8px, 2vw, 10px)',
            }}
          >
            {availableDrawIds.map((id) => (
              <div
                key={id}
                onClick={() => router.push(`/my/winners/${id}`)}
                style={{
                  flex: '0 0 auto',
                  width: 'clamp(70px, 17.5vw, 75px)',
                  background: id === drawId 
                    ? 'linear-gradient(122deg, #B715BF 0%, #C10E8E 100%)' 
                    : 'rgba(217,217,217,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  textAlign: 'center',
                  padding: 'clamp(8px, 2vw, 10px) 0',
                  color: 'white',
                  fontSize: 'clamp(12px, 3vw, 13px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                  cursor: 'pointer',
                  fontWeight: id === drawId ? '600' : '400',
                  whiteSpace: 'nowrap',
                }}
              >
                제 {id}회
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div
        style={{
          flex: 1,
          width: '100%',
          marginTop: 'clamp(15px, 3.8vw, 20px)',
          overflowY: 'auto',
          padding: '0 clamp(18px, 4.5vw, 20px)',
          paddingBottom: 'clamp(20px, 5vh, 30px)',
        }}
      >
        {/* 결과 박스 */}
        <div
          style={{
            marginBottom: 'clamp(20px, 5vw, 25px)',
            width: '100%',
            background: 'rgba(195,112,208,0.23)',
            borderRadius: 'clamp(8px, 2vw, 10px)',
            padding: 'clamp(18px, 4.5vw, 20px)',
            color: 'white',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(18px, 4.5vw, 20px)',
              fontWeight: '700',
              textAlign: 'center',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            제 {drawId}회 추첨 결과
          </div>

          {/* 총 상금 박스 */}
          <div
            style={{
              marginTop: 'clamp(12px, 3vw, 15px)',
              background: 'rgba(202,58,92,0.35)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              padding: 'clamp(12px, 3vw, 15px)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(13px, 3.3vw, 14px)',
                color: '#DED13A',
                fontWeight: '550',
                marginBottom: 'clamp(4px, 1vw, 5px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              총 상금
            </div>
            <div
              style={{
                fontSize: 'clamp(18px, 4.5vw, 20px)',
                color: 'white',
                fontWeight: '700',
                marginBottom: 'clamp(4px, 1vw, 5px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {totalPrize} KAIA
            </div>
            <div
              style={{
                fontSize: 'clamp(13px, 3.3vw, 14px)',
                color: '#DED13A',
                fontWeight: '400',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              ₩{totalPrizeKRW}
            </div>
          </div>

          {/* 당첨 번호 */}
          <div
            style={{
              marginTop: 'clamp(20px, 5vw, 25px)',
              textAlign: 'center',
              fontSize: 'clamp(13px, 3.3vw, 14px)',
              fontWeight: '700',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            당첨 번호
          </div>
          <div
            style={{
              marginTop: 'clamp(12px, 3vw, 15px)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'clamp(4px, 1vw, 6px)',
            }}
          >
            {winningNumbers.map((num, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  aspectRatio: '1',
                  maxWidth: 'clamp(36px, 9vw, 38px)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  background: 'linear-gradient(312deg, #6E0058 0%, #450058 100%)',
                  border: '2px solid rgba(193, 135, 184, 0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: '600',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {num}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 'clamp(15px, 3.8vw, 20px)',
              textAlign: 'center',
              fontSize: 'clamp(9px, 2.3vw, 10px)',
              color: 'white',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            총 {totalParticipants}명 참여
          </div>
        </div>

        {/* 당첨자 정보 박스 */}
        {winners.length > 0 && (
          <div
            style={{
              width: '100%',
              background: 'rgba(195,112,208,0.23)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              padding: 'clamp(18px, 4.5vw, 20px)',
              marginBottom: 'clamp(20px, 5vw, 25px)',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(15px, 3.8vw, 16px)',
                fontWeight: '700',
                marginBottom: 'clamp(12px, 3vw, 15px)',
                color: 'white',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              당첨자 정보
            </div>

            {/* 1,2,3등 카드 */}
            {winners.map((info, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(195,112,208,0.23)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  border: '0.5px solid white',
                  padding: 'clamp(12px, 3vw, 15px)',
                  marginBottom: idx < winners.length - 1 ? 'clamp(15px, 3.8vw, 20px)' : '0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {/* 왼쪽 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'clamp(8px, 2vw, 10px)',
                    }}
                  >
                    {/* 등수 박스 */}
                    <div
                      style={{
                        width: 'clamp(38px, 9.5vw, 40px)',
                        height: 'clamp(38px, 9.5vw, 40px)',
                        background: getGradeGradient(info.grade),
                        borderRadius: 'clamp(4px, 1vw, 5px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: 'clamp(13px, 3.3vw, 14px)',
                        color: 'black',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {info.grade}
                    </div>

                    {/* 옆 텍스트 */}
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(13px, 3.3vw, 14px)',
                          color: 'white',
                          fontWeight: '550',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        {info.match}
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(9px, 2.3vw, 10px)',
                          color: 'white',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        {info.winner}
                      </div>
                    </div>
                  </div>

                  {/* 오른쪽 보상 */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        color: '#9DFF00',
                        fontSize: 'clamp(14px, 3.5vw, 16px)',
                        fontWeight: '600',
                        marginBottom: 'clamp(2px, 0.5vw, 3px)',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {info.reward}
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(9px, 2.3vw, 10px)',
                        color: 'white',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {info.rewardKRW}
                    </div>
                  </div>
                </div>

                {/* 숫자 박스 6개 */}
                <div
                  style={{
                    marginTop: 'clamp(12px, 3vw, 15px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'clamp(4px, 1vw, 6px)',
                  }}
                >
                  {info.numbers.map((num, nIdx) => (
                    <div
                      key={nIdx}
                      style={{
                        flex: 1,
                        aspectRatio: '1',
                        maxWidth: 'clamp(32px, 8vw, 34px)',
                        borderRadius: 'clamp(8px, 2vw, 10px)',
                        background: 'linear-gradient(312deg, #6E0058 0%, #450058 100%)',
                        border: '2px solid rgba(255, 196, 1, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'clamp(13px, 3.3vw, 15px)',
                        fontWeight: '600',
                        color: 'white',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {num}
                    </div>
                  ))}
                </div>

                {/* 구매한 장수 */}
                <div
                  style={{
                    marginTop: 'clamp(8px, 2vw, 10px)',
                    fontSize: 'clamp(8px, 2vw, 9px)',
                    color: 'white',
                    textAlign: 'left',
                    fontWeight: '300',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  구매한 장수: {info.ticketCount}장
                </div>
              </div>
            ))}
          </div>
        )}

        {winners.length === 0 && (
          <div
            style={{
              width: '100%',
              background: 'rgba(195,112,208,0.23)',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              padding: 'clamp(30px, 7.5vw, 40px)',
              textAlign: 'center',
              color: 'white',
              fontSize: 'clamp(14px, 3.5vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            아직 당첨자 정보가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

