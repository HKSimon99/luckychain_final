'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import Image from 'next/image';
import MobileStatusBar from '@/components/MobileStatusBar';
import { useKaiaPrice } from '@/contexts/KaiaPriceContext';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface WinningTicket {
  tokenId: number;
  numbers: number[];
  rank: string;
  matchCount: number;
  prizeAmount: number;  // 실제 당첨금 (KAIA)
}

export default function ResultPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { kaiaPrice } = useKaiaPrice();
  
  const [selectedDrawId, setSelectedDrawId] = useState(0);
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [myTicketCount, setMyTicketCount] = useState(0);
  const [totalPrize, setTotalPrize] = useState('0');
  const [prizeKRW, setPrizeKRW] = useState('0');
  const [isWinner, setIsWinner] = useState(false);
  const [winningTickets, setWinningTickets] = useState<WinningTicket[]>([]);
  const [currentWinningTicketIndex, setCurrentWinningTicketIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 현재 회차
        const currentDrawId = await contract.currentDrawId();
        const drawId = Number(currentDrawId) > 1 ? Number(currentDrawId) - 1 : Number(currentDrawId);
        setSelectedDrawId(drawId);

        // 당첨 번호 조회
        const numbers: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          numbers.push(Number(num));
        }
        setWinningNumbers(numbers);

        // 티켓 가격
        const ticketPriceWei = await contract.ticketPrice();
        const ticketPrice = parseFloat(ethers.formatEther(ticketPriceWei));

        // 내 티켓 조회 (당첨 확인)
        if (isConnected && address && walletProvider) {
          const browserProvider = new ethers.BrowserProvider(walletProvider as any);
          const browserContract = new ethers.Contract(contractAddress, lottoAbi, browserProvider);
          
          const currentBlock = await browserProvider.getBlockNumber();
          // 최근 2,000,000 블록 조회 (약 23일 분량)
          const fromBlock = Math.max(0, currentBlock - 2000000);
          
          console.log(`📊 /result 블록 범위: ${fromBlock} ~ ${currentBlock}`);
          
          const filter = browserContract.filters.TicketPurchased(address);
          const events = await browserContract.queryFilter(filter, fromBlock, 'latest');
          
          console.log(`📊 발견된 총 티켓: ${events.length}개`);

          // 선택된 회차의 티켓만
          const myDrawTickets = events.filter((e: any) => Number(e.args[2] || e.args.drawId) === drawId);
          setMyTicketCount(myDrawTickets.length);
          
          console.log(`📊 ${drawId}회차 내 티켓: ${myDrawTickets.length}개`);

          // 상금 정보 조회 (PrizesDistributed 이벤트)
          let firstPrize = 0, secondPrize = 0, thirdPrize = 0;
          try {
            const prizeFilter = browserContract.filters.PrizesDistributed(drawId);
            const prizeEvents = await browserContract.queryFilter(prizeFilter, fromBlock, 'latest');
            
            console.log(`💰 PrizesDistributed 이벤트: ${prizeEvents.length}개 발견`);
            
            if (prizeEvents.length > 0) {
              const prizeEvent = prizeEvents[0] as any;
              firstPrize = Number(ethers.formatEther(prizeEvent.args.firstPrize || 0));
              secondPrize = Number(ethers.formatEther(prizeEvent.args.secondPrize || 0));
              thirdPrize = Number(ethers.formatEther(prizeEvent.args.thirdPrize || 0));
              
              console.log(`💰 상금 정보: 1등=${firstPrize}, 2등=${secondPrize}, 3등=${thirdPrize} KAIA`);
            } else {
              console.warn('⚠️ 상금 정보 이벤트를 찾을 수 없습니다');
            }
          } catch (e) {
            console.error('상금 정보 조회 실패:', e);
          }

          // 당첨 티켓 찾기
          const winners: WinningTicket[] = [];
          
          console.log(`🎯 당첨 번호 (${drawId}회차):`, numbers);
          
          if (numbers.some(n => n > 0)) {
            for (const event of myDrawTickets) {
              const eventData = event as any;
              // TicketPurchased(address buyer, uint256 ticketId, uint256 drawId, uint8[6] numbers)
              const tokenId = Number(eventData.args[1]);  // args[1] = ticketId
              const ticketNumbers = Array.from(eventData.args[3] || []).map((n: any) => Number(n));
              
              console.log(`  티켓 #${tokenId} 번호:`, ticketNumbers);
              
              const matchCount = ticketNumbers.filter((n: number) => numbers.includes(n)).length;
              
              console.log(`  → 일치 개수: ${matchCount}개`);
              
              // 3등(4개 일치)부터 당첨
              if (matchCount >= 4) {
                let rank = '';
                let prizeAmount = 0;
                
                if (matchCount === 6) {
                  rank = '1등';
                  prizeAmount = firstPrize;
                } else if (matchCount === 5) {
                  rank = '2등';
                  prizeAmount = secondPrize;
                } else if (matchCount === 4) {
                  rank = '3등';
                  prizeAmount = thirdPrize;
                }
                
                console.log(`  ✅ ${rank} 당첨! 상금: ${prizeAmount} KAIA`);
                
                winners.push({
                  tokenId,
                  numbers: ticketNumbers,
                  rank,
                  matchCount,
                  prizeAmount,
                });
              } else {
                console.log(`  ❌ 낙첨 (${matchCount}개 일치)`);
              }
            }
          }
          
          console.log(`📊 총 당첨 티켓: ${winners.length}개`);
          
          setWinningTickets(winners);
          setIsWinner(winners.length > 0);
          
          // 금액 계산
          let prize: string;
          if (winners.length > 0) {
            // 당첨된 경우: 실제 당첨금 합계
            const totalWinnings = winners.reduce((sum, ticket) => sum + ticket.prizeAmount, 0);
            prize = totalWinnings.toFixed(2);
          } else {
            // 낙첨된 경우: 구매 금액
            prize = (myDrawTickets.length * ticketPrice).toFixed(2);
          }
          
          setTotalPrize(prize);
          setPrizeKRW((parseFloat(prize) * kaiaPrice).toLocaleString('ko-KR', { maximumFractionDigits: 0 }));
        }

      } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [address, isConnected, walletProvider, kaiaPrice]);

  // 회차 변경 시 데이터 재로드
  useEffect(() => {
    if (selectedDrawId > 0 && !isLoading) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedDrawId]);

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

  // 당첨 티켓 표시용 번호 (여러 개면 현재 인덱스, 없으면 당첨 번호)
  const displayNumbers = isWinner && winningTickets.length > 0
    ? winningTickets[currentWinningTicketIndex].numbers
    : winningNumbers;

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#380D44',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        fontFamily: 'SF Pro, Arial, sans-serif',
      }}
    >
      {/* 상단 상태바 */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <MobileStatusBar />
      </div>

      {/* 네비게이션 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '2vh 5vw',
          zIndex: 10,
        }}
      >
        <div
          onClick={() => router.back()}
          style={{
            position: 'absolute',
            left: '5vw',
            fontSize: 'clamp(18px, 4.5vw, 20px)',
            color: '#FFF',
            cursor: 'pointer',
          }}
        >
          ←
        </div>
        <span
          style={{
            fontSize: 'clamp(15px, 3.8vw, 17px)',
            fontWeight: '700',
            color: '#FFF',
          }}
        >
          {selectedDrawId} 회차 결과
        </span>
      </div>

      {/* 배경 둥근 직사각형 (#CAACC7) - 완전 대칭, 위치 조정 */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          top: '50vh',
          bottom: 0,
          background: '#CAACC7',
          borderTopLeftRadius: '30px',
          borderTopRightRadius: '30px',
          zIndex: 1,
        }}
      />

      {/* 메인 콘텐츠 - 완전 반응형 */}
      <div
        style={{
          position: 'fixed',
          top: '13vh',
          left: 0,
          right: 0,
          bottom: '3vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          zIndex: 2,
          padding: '0 2.5vw',
        }}
      >
        {/* 트로피 이미지 또는 낙첨 아이콘 */}
        <div
          style={{
            width: 'clamp(90px, 22vw, 110px)',
            height: 'clamp(90px, 22vw, 110px)',
          }}
        >
          {isWinner ? (
            <Image
              src="/trophee.png"
              alt="Trophy"
              width={110}
              height={110}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(60px, 15vw, 80px)',
              }}
            >
              😔
            </div>
          )}
        </div>

        {/* 축하 또는 낙첨 문구 */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(22px, 5.5vw, 26px)',
              fontWeight: '700',
              color: '#FFF',
              marginBottom: '1vh',
            }}
          >
            {isWinner ? '당첨을 축하합니다!' : '낙첨'}
          </div>
          <div
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '500',
              color: '#FFF',
            }}
          >
            {isWinner ? '상금은 지갑으로 전송되었습니다' : '다음 기회를 노려보세요'}
          </div>
        </div>

        {/* Blockchain Explorer 박스 */}
        <div
          style={{
            width: '95vw',
            maxWidth: '360px',
            background: '#E0E0E0',
            borderRadius: '15px',
            padding: '2.5vh 5vw',
            textAlign: 'center',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
            zIndex: 3,
          }}
        >
          <div
            style={{
              color: '#740078',
              fontSize: 'clamp(15px, 3.8vw, 17px)',
              fontWeight: '700',
              marginBottom: '1vh',
            }}
          >
            Blockchain Explorer
          </div>
          <div
            style={{
              color: '#4C4C4C',
              fontSize: 'clamp(9px, 2.3vw, 10.5px)',
              lineHeight: '1.6',
              fontWeight: '500',
            }}
          >
            거래가 블록체인 네트워크에<br />
            적법하게 기록되고 위변조되지 않음을 검증합니다.
          </div>
        </div>

        {/* 당첨 번호 섹션 - 낙첨일 때는 숨김 */}
        {isWinner && (
          <div
            style={{
              width: '95vw',
              maxWidth: '370px',
            }}
          >
            <div
              style={{
                color: '#1A1A1A',
                fontSize: 'clamp(13px, 3.3vw, 15px)',
                fontWeight: '700',
                marginBottom: '1.5vh',
              }}
            >
              당첨 번호
            </div>

            {/* 번호 박스들 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(4px, 1vw, 6px)',
              }}
            >
              {/* 왼쪽 화살표 - 당첨 티켓 2개 이상일 때만 */}
              {winningTickets.length > 1 && (
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginRight: '1vw',
                  }}
                  onClick={() => {
                    setCurrentWinningTicketIndex((prev) => 
                      prev > 0 ? prev - 1 : winningTickets.length - 1
                    );
                  }}
                >
                  ◀
                </div>
              )}

              {/* 번호 컨테이너 */}
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(4px, 1vw, 6px)',
                  justifyContent: 'center',
                }}
              >
                {displayNumbers.map((num, idx) => {
                  // 당첨 번호와 일치하는지 확인
                  const isMatched = winningNumbers.includes(num);
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        width: 'clamp(32px, 8.2vw, 40px)',
                        height: 'clamp(32px, 8.2vw, 40px)',
                        background: isMatched ? '#F5A623' : '#6A2C8E',
                        color: '#FFF',
                        fontSize: 'clamp(14px, 3.5vw, 17px)',
                        fontWeight: '700',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>

              {/* 오른쪽 화살표 - 당첨 티켓 2개 이상일 때만 */}
              {winningTickets.length > 1 && (
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginLeft: '1vw',
                  }}
                  onClick={() => {
                    setCurrentWinningTicketIndex((prev) => 
                      prev < winningTickets.length - 1 ? prev + 1 : 0
                    );
                  }}
                >
                  ▶
                </div>
              )}
            </div>

            {/* 당첨 티켓 인디케이터 */}
            {winningTickets.length > 0 && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: '1vh',
                  fontSize: 'clamp(10px, 2.5vw, 11px)',
                  color: '#1A1A1A',
                  fontWeight: '600',
                }}
              >
                {winningTickets.length > 1 && (
                  <>{currentWinningTicketIndex + 1} / {winningTickets.length}{' '}</>
                )}
                ({winningTickets[currentWinningTicketIndex].rank})
              </div>
            )}
          </div>
        )}

        {/* 구매 정보 섹션 */}
        <div
          style={{
            width: '95vw',
            maxWidth: '360px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#1A1A1A',
              fontSize: 'clamp(13px, 3.3vw, 14.5px)',
              fontWeight: '600',
              marginBottom: '1.5vh',
            }}
          >
            <span>구매 장수</span>
            <span>{myTicketCount} 장</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#1A1A1A',
              fontSize: 'clamp(13px, 3.3vw, 14.5px)',
              fontWeight: '600',
            }}
          >
            <span>{isWinner ? '당첨금' : '구매 금액'}</span>
            <div style={{ textAlign: 'right' }}>
              <div>{totalPrize} KAIA</div>
              <div
                style={{
                  fontSize: 'clamp(9px, 2.3vw, 10.5px)',
                  color: '#4C4C4C',
                  marginTop: '0.3vh',
                }}
              >
                ≈ {prizeKRW}원
              </div>
            </div>
          </div>
        </div>

        {/* 당첨자 정보 버튼 */}
        <button
          onClick={() => {
            router.push(`/result/winners?drawId=${selectedDrawId}`);
          }}
          style={{
            width: '95vw',
            maxWidth: '370px',
            height: 'clamp(48px, 12vw, 54px)',
            background: 'linear-gradient(90deg, #6A2C8E 0%, #A030C0 100%)',
            borderRadius: '20px',
            color: '#FFF',
            fontSize: 'clamp(15px, 3.8vw, 17px)',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          당첨자 정보
        </button>
      </div>
    </div>
  );
}
