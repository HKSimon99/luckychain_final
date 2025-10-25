'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import Image from 'next/image';
import MobileStatusBar from '@/components/MobileStatusBar';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';

interface Ticket {
  round: string;
  numbers: number[];
  status: '당첨' | '낙첨' | '대기중';
  prize: string;
  ticketId: string;
  rank: string;
  drawId: number;
  tokenId: number;
  purchasePrice: string;
}

const statusColors = {
  당첨: '#ADD012',
  낙첨: '#BB3335',
  대기중: '#B5B2A1',
};

export default function LotteryListPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTab, setSelectedTab] = useState<'전체' | '당첨' | '낙첨'>('전체');
  const [isLoading, setIsLoading] = useState(true);

  // 티켓 로드
  useEffect(() => {
    const loadTickets = async () => {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }

      try {
        // ✅ Reown AppKit 패턴: walletProvider 사용 (모바일 지원)
        if (!walletProvider) {
          throw new Error('지갑 프로바이더를 찾을 수 없습니다. 지갑을 다시 연결해주세요.');
        }

        const provider = new ethers.BrowserProvider(walletProvider as any);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 티켓 가격
        const ticketPriceWei = await contract.ticketPrice();
        const ticketPrice = ethers.formatEther(ticketPriceWei);

        // 현재 회차
        const currentDrawId = await contract.currentDrawId();

        // 내가 구매한 티켓 이벤트 조회 (모든 회차)
        const currentBlock = await provider.getBlockNumber();
        // 블록 범위 확대 (최대한 많은 블록 조회)
        const fromBlock = Math.max(0, currentBlock - 500000);  // 약 2주 분량
        
        const filter = contract.filters.TicketPurchased(address);
        const events = await contract.queryFilter(filter, fromBlock, 'latest');

        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 발견된 티켓: ${events.length}개`);
        }

        const loadedTickets: Ticket[] = [];

        for (const event of events) {
          try {
            const eventData = event as any;
            
            const tokenId = Number(eventData.args[1] || eventData.args.tokenId);
            const drawId = Number(eventData.args[2] || eventData.args.drawId);
            const numbers = Array.from(eventData.args[3] || eventData.args.numbers || []).map((n: any) => Number(n));

            console.log(`🎫 티켓 #${tokenId} - ${drawId}회차 처리 중...`);

            // 소유권 확인
            try {
              const owner = await contract.ownerOf(tokenId);
              if (owner.toLowerCase() !== address.toLowerCase()) {
                console.log(`  ⏭️ 다른 소유자 - 스킵`);
                continue;
              }
            } catch (e) {
              console.log(`  ⚠️ 소유권 확인 실패 - 스킵`);
              continue;
            }

            // 회차 상태 확인
            const draw = await contract.draws(drawId);
            const drawStatus = Number(draw.status);

            console.log(`  회차 상태: ${drawStatus} (0=Open, 1=Drawn, 2=Distributed)`);

            let status: '당첨' | '낙첨' | '대기중' = '대기중';
            let prize = '-';
            let rank = '';

            // 당첨 번호 조회
            const winningNums: number[] = [];
            for (let i = 0; i < 6; i++) {
              const num = await contract.winningNumbers(drawId, i);
              winningNums.push(Number(num));
            }

            console.log(`  당첨 번호: [${winningNums.join(', ')}]`);
            console.log(`  내 번호: [${numbers.join(', ')}]`);

            // 당첨 번호가 모두 0이면 아직 추첨 안됨
            const hasWinningNumbers = winningNums.some(n => n > 0);

            if (!hasWinningNumbers) {
              // 당첨 번호가 설정되지 않음 (아직 추첨 안됨)
              if (drawId < Number(currentDrawId)) {
                status = '대기중';
                prize = '추첨 대기';
                console.log(`  ⏳ 추첨 대기 중 (회차 종료됨)`);
              } else if (drawId === Number(currentDrawId)) {
                status = '대기중';
                prize = '진행 중';
                console.log(`  ⏳ 현재 진행 중인 회차`);
              } else {
                status = '대기중';
                prize = '대기';
                console.log(`  ⏳ 미래 회차`);
              }
            } else {
              // 당첨 번호가 설정됨 → 당첨/낙첨 판정
              const matchCount = numbers.filter(n => winningNums.includes(n)).length;

              console.log(`  일치 개수: ${matchCount}개`);

              if (matchCount >= 2) {
                status = '당첨';
                
                // 등수 계산
                if (matchCount === 6) {
                  rank = '1등';
                  prize = '잭팟!';
                } else if (matchCount === 5) {
                  rank = '2등';
                  prize = '고액 당첨!';
                } else if (matchCount === 4) {
                  rank = '3등';
                  prize = '중위 당첨!';
                } else if (matchCount === 3) {
                  rank = '4등';
                  prize = '소액 당첨!';
                } else if (matchCount === 2) {
                  rank = '5등';
                  prize = '참가상!';
                }
                console.log(`  ✅ ${rank} 당첨!`);
              } else {
                status = '낙첨';
                prize = '0원';
                console.log(`  ❌ 낙첨 (일치 ${matchCount}개)`);
              }
            }

            loadedTickets.push({
              round: `${drawId}회차`,
              numbers,
              status,
              prize,
              ticketId: `티켓 #${tokenId}`,
              rank,
              drawId,
              tokenId,
              purchasePrice: `${ticketPrice} KAIA`,
            });

          } catch (error) {
            console.error('티켓 처리 실패:', error);
          }
        }

        // 최신순 정렬 (회차 → 티켓ID)
        loadedTickets.sort((a, b) => {
          if (a.drawId !== b.drawId) {
            return b.drawId - a.drawId;  // 최신 회차 먼저
          }
          return b.tokenId - a.tokenId;  // 같은 회차면 최신 티켓 먼저
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ 총 ${loadedTickets.length}개 티켓 (당첨:${loadedTickets.filter(t => t.status === '당첨').length}, 낙첨:${loadedTickets.filter(t => t.status === '낙첨').length}, 대기:${loadedTickets.filter(t => t.status === '대기중').length})`);
        }
        
        setTickets(loadedTickets);
        setFilteredTickets(loadedTickets);

      } catch (error) {
        console.error('❌ 티켓 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [address, isConnected]);

  // 탭 필터링
  useEffect(() => {
    if (selectedTab === '전체') {
      setFilteredTickets(tickets);
    } else if (selectedTab === '당첨') {
      setFilteredTickets(tickets.filter(t => t.status === '당첨'));
    } else if (selectedTab === '낙첨') {
      setFilteredTickets(tickets.filter(t => t.status === '낙첨'));
    }
  }, [selectedTab, tickets]);

  if (!isConnected) {
    return (
      <div
        style={{
          width: '100%',
          height: '100vh',
          background: '#380D44',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <div style={{ fontSize: '20px', marginBottom: '20px' }}>🔒</div>
        <div style={{ fontSize: '16px', marginBottom: '30px' }}>지갑을 연결해주세요</div>
        <button
          onClick={() => router.push('/wallet')}
          style={{
            padding: '12px 24px',
            background: '#93EE00',
            color: '#000',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          지갑 연결하기
        </button>
      </div>
    );
  }

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
          fontSize: '16px',
        }}
      >
        복권 로딩 중...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#380D44',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단 고정 영역 */}
      <div
        style={{
          flexShrink: 0,
        }}
      >
        {/* 상단 상태바 */}
        <MobileStatusBar />

        {/* 뒤로가기 + 제목 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'clamp(15px, 4vw, 20px)',
            position: 'relative',
            padding: '0 clamp(18px, 4.5vw, 20px)',
          }}
        >
          {/* 뒤로가기 */}
          <div
            onClick={() => router.back()}
            style={{
              position: 'absolute',
              left: 'clamp(18px, 4.5vw, 20px)',
              cursor: 'pointer',
              fontSize: 'clamp(18px, 4.5vw, 20px)',
            }}
          >
            ←
          </div>

          {/* 제목 */}
          <span
            style={{
              color: 'white',
              fontSize: 'clamp(14px, 3.5vw, 15px)',
              fontWeight: '700',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            복권 리스트
          </span>
        </div>

        {/* 탭 버튼 */}
        <div
          style={{
            display: 'flex',
            gap: 'clamp(8px, 2vw, 10px)',
            padding: '0 clamp(18px, 4.5vw, 20px)',
            marginTop: 'clamp(50px, 12.5vw, 70px)',
            marginBottom: 'clamp(20px, 5vw, 25px)',
          }}
        >
          {(['전체', '당첨', '낙첨'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                flex: 1,
                height: 'clamp(36px, 9vw, 40px)',
                background: selectedTab === tab
                  ? 'linear-gradient(136deg, #530768 0%, #B91189 100%)'
                  : 'rgba(255,255,255,0.3)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: 'none',
                color: 'white',
                fontWeight: '700',
                fontSize: 'clamp(13px, 3.3vw, 14px)',
                cursor: 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 티켓 카드 리스트 - 스크롤 영역 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '0 clamp(18px, 4.5vw, 20px)',
          paddingBottom: 'clamp(20px, 5vh, 30px)',
        }}
      >
        {filteredTickets.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'white',
              fontSize: 'clamp(14px, 3.5vw, 15px)',
              marginTop: 'clamp(40px, 10vw, 60px)',
              opacity: 0.7,
            }}
          >
            {selectedTab === '전체' ? '구매한 복권이 없습니다' : `${selectedTab} 티켓이 없습니다`}
          </div>
        ) : (
          filteredTickets.map((ticket, idx) => (
            <div
              key={idx}
              style={{
                width: '100%',
                height: 'clamp(160px, 40vw, 170px)',
                marginBottom: 'clamp(18px, 4.5vw, 20px)',
                background: 'linear-gradient(312deg, #6E0058 0%, #450058 64%)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '0.1px solid rgba(255,255,255,0.4)',
                boxShadow: '4px 4px 4px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                padding: 'clamp(10px, 2.5vw, 12px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* 상단: 회차 박스 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    color: 'white',
                    fontSize: 'clamp(12px, 3vw, 13px)',
                    fontWeight: '500',
                    background: '#845D8F',
                    border: '0.1px solid rgba(255,255,255,0.4)',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'clamp(56px, 14vw, 60px)',
                    height: 'clamp(28px, 7vw, 30px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {ticket.round}
                </div>
              </div>

              {/* 티켓 번호 */}
              <div
                style={{
                  color: 'white',
                  fontSize: 'clamp(9px, 2.3vw, 10px)',
                  marginTop: '5px',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {ticket.ticketId}
              </div>

              {/* 티켓번호 아래 흰색 선 */}
              <div
                style={{
                  height: '1px',
                  background: 'rgba(255,255,255,0.3)',
                  margin: '4px 0 8px 0',
                  marginTop: '10px',
                }}
              />

              {/* 상태 배지 */}
              <div
                style={{
                  width: 'clamp(56px, 14vw, 60px)',
                  height: 'clamp(28px, 7vw, 30px)',
                  background: statusColors[ticket.status],
                  borderRadius: '5px',
                  position: 'absolute',
                  top: 'clamp(10px, 2.5vw, 12px)',
                  right: 'clamp(10px, 2.5vw, 12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: 'clamp(11px, 2.8vw, 12px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {ticket.status}
              </div>

              {/* 등수 (당첨 시만) */}
              {ticket.status === '당첨' && ticket.rank && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'clamp(42px, 10.5vw, 45px)',
                    right: 'clamp(10px, 2.5vw, 12px)',
                    color: '#FFD500',
                    fontSize: 'clamp(10px, 2.5vw, 11px)',
                    fontWeight: '600',
                    marginTop: '5px',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {ticket.rank}
                </div>
              )}

              {/* 숫자 박스 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  gap: 'clamp(4px, 1vw, 6px)',
                }}
              >
                {ticket.numbers.map((num, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 'clamp(40px, 10vw, 42px)',
                      height: 'clamp(40px, 10vw, 42px)',
                      borderRadius: 'clamp(8px, 2vw, 10px)',
                      background: idx < 3 ? '#D9FF32' : '#FDFDFD',
                      boxShadow: idx < 3 ? '0 0 5px #FFFFFF' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.7,
                      fontWeight: '700',
                      fontSize: 'clamp(13px, 3.3vw, 14px)',
                      color: '#000',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>

              {/* 하단: 구매 금액 + 상금 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px',
                }}
              >
                <div
                  style={{
                    color: '#56AC73',
                    fontSize: 'clamp(10px, 2.5vw, 11px)',
                    fontWeight: '500',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {ticket.purchasePrice}
                </div>
                <div
                  style={{
                    color: '#D1D1D1',
                    fontSize: 'clamp(10px, 2.5vw, 11px)',
                    fontWeight: '500',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {ticket.prize}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

