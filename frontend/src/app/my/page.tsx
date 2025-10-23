'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import MobileLayout from '@/components/MobileLayout';
import * as lottoAbiModule from '../../../lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface Ticket {
  tokenId: number;
  drawId: number;
  numbers: number[];
  isWinner: boolean;
  matchCount: number;
  purchaseTime?: number;
}

export default function MyPage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDraw, setSelectedDraw] = useState<number | 'all'>('all');
  const [ticketPrice, setTicketPrice] = useState('0');

  // 지갑 연결 확인
  useEffect(() => {
    const checkWallet = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            
            // 잔액 조회
            const balanceHex = await window.ethereum.request({
              method: 'eth_getBalance',
              params: [accounts[0], 'latest'],
            });
            setBalance((parseInt(balanceHex, 16) / 1e18).toFixed(4));
            
            // 티켓 로드
            await loadMyTickets(accounts[0]);
          }
        } catch (error) {
          console.error('지갑 확인 실패:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    checkWallet();
  }, []);

  // 내 티켓 로드
  const loadMyTickets = async (userAddress: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

      // 티켓 가격 가져오기
      const price = await contract.ticketPrice();
      setTicketPrice(ethers.formatEther(price));
      console.log('💰 현재 티켓 가격:', ethers.formatEther(price), 'KAIA');

      const currentBlock = await provider.getBlockNumber();
      // 최근 5000 블록만 조회 (약 2~3시간 분량)
      const fromBlock = Math.max(0, currentBlock - 5000);

      const filter = contract.filters.TicketPurchased(userAddress);
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
      
      console.log(`✅ 티켓 조회: ${events.length}개 이벤트 발견 (블록 ${fromBlock} ~ ${currentBlock})`);

      const tickets: Ticket[] = [];

      for (const event of events) {
        const eventLog = event as any; // TypeScript 타입 오류 회피
        const tokenId = eventLog.args?.ticketId;
        const drawId = eventLog.args?.drawId;
        const numbers = eventLog.args?.numbers;

        console.log(`🔍 처리 중 - 티켓ID: ${tokenId}, 회차: ${drawId}`);

        try {
          const owner = await contract.ownerOf(tokenId);
          console.log(`   소유자: ${owner}, 내 주소: ${userAddress}`);
          
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            // 당첨 번호 확인
            let isWinner = false;
            let matchCount = 0;
            try {
              // winningNumbers(drawId, index) 형태로 접근
              const winningNums: number[] = [];
              for (let i = 0; i < 6; i++) {
                const num = await contract.winningNumbers(drawId, i);
                winningNums.push(Number(num));
              }
              
              console.log(`   당첨번호 (회차 ${drawId}):`, winningNums);

              if (winningNums[0] > 0) {
                const ticketNums = numbers.map((n: any) => Number(n));
                matchCount = ticketNums.filter((num: number) => winningNums.includes(num)).length;
                isWinner = matchCount >= 4; // 4개 이상 일치
                console.log(`   내 번호:`, ticketNums, `일치: ${matchCount}개`);
              } else {
                console.log(`   당첨번호 없음 (아직 추첨 전)`);
              }
            } catch (e: any) {
              console.log(`   당첨번호 조회 오류:`, e.message);
            }

            tickets.push({
              tokenId: Number(tokenId),
              drawId: Number(drawId),
              numbers: numbers.map((n: any) => Number(n)),
              isWinner,
              matchCount,
            });
            
            console.log(`   ✅ 티켓 추가됨`);
          } else {
            console.log(`   ⏭️  다른 소유자의 티켓`);
          }
        } catch (error: any) {
          console.error(`   ❌ 티켓 처리 실패:`, error.message);
          continue;
        }
      }

      setMyTickets(tickets.sort((a, b) => b.drawId - a.drawId));
      console.log('✅ 티켓 로드 완료:', tickets.length);
    } catch (error) {
      console.error('❌ 티켓 로드 실패:', error);
    }
  };

  // 지갑 연결
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask를 설치해주세요!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);

      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });
      setBalance((parseInt(balanceHex, 16) / 1e18).toFixed(4));

      await loadMyTickets(accounts[0]);
    } catch (error) {
      console.error('지갑 연결 실패:', error);
    }
  };

  // 필터링된 티켓
  const filteredTickets =
    selectedDraw === 'all' ? myTickets : myTickets.filter((t) => t.drawId === selectedDraw);

  // 고유 회차 목록
  const uniqueDraws = [...new Set(myTickets.map((t) => t.drawId))].sort((a, b) => b - a);

  // 통계
  const totalSpent = myTickets.length * parseFloat(ticketPrice || '0');
  const winCount = myTickets.filter((t) => t.isWinner).length;

  // 번호 색상
  const getNumberColor = (num: number) => {
    if (num <= 10) return '#FFC107';
    if (num <= 20) return '#2196F3';
    if (num <= 30) return '#F44336';
    if (num <= 40) return '#9E9E9E';
    return '#4CAF50';
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p style={{ color: 'white', fontSize: 'clamp(14px, 3.5vw, 16px)' }}>로딩 중...</p>
        </div>
      </MobileLayout>
    );
  }

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

  return (
    <MobileLayout>
      {/* 메인 콘텐츠 */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(15px, 4vw, 20px)',
          overflow: 'auto',
        }}
      >
        {/* 지갑 정보 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            color: 'white',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              marginBottom: 'clamp(8px, 2vw, 10px)',
              opacity: 0.8,
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            내 지갑
          </div>
          <div
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 'clamp(12px, 3vw, 15px)',
              borderTop: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  opacity: 0.7,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                잔액
              </div>
              <div
                style={{
                  fontSize: 'clamp(16px, 4vw, 18px)',
                  fontWeight: '700',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {balance} KAIA
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'clamp(11px, 3vw, 13px)',
                  opacity: 0.7,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                총 구매
              </div>
              <div
                style={{
                  fontSize: 'clamp(16px, 4vw, 18px)',
                  fontWeight: '700',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {myTickets.length}장
              </div>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'clamp(10px, 3vw, 12px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'clamp(12px, 3vw, 15px)',
              padding: 'clamp(15px, 4vw, 18px)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(11px, 3vw, 13px)',
                color: '#666',
                marginBottom: 'clamp(6px, 2vw, 8px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              총 사용액
            </div>
            <div
              style={{
                fontSize: 'clamp(18px, 4.5vw, 20px)',
                fontWeight: '700',
                color: '#333',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {totalSpent.toFixed(2)} KAIA
            </div>
          </div>
          <div
            style={{
              background: 'white',
              borderRadius: 'clamp(12px, 3vw, 15px)',
              padding: 'clamp(15px, 4vw, 18px)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(11px, 3vw, 13px)',
                color: '#666',
                marginBottom: 'clamp(6px, 2vw, 8px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              당첨 횟수
            </div>
            <div
              style={{
                fontSize: 'clamp(18px, 4.5vw, 20px)',
                fontWeight: '700',
                color: winCount > 0 ? '#4CAF50' : '#333',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {winCount}회 {winCount > 0 ? '🎉' : ''}
            </div>
          </div>
        </div>

        {/* 내 티켓 목록 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(15px, 4vw, 20px)',
            marginBottom: 'clamp(80px, 15vh, 100px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'clamp(12px, 3vw, 15px)',
            }}
          >
            <h3
              style={{
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: '#333',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              내 티켓 ({myTickets.length}장)
            </h3>

            {/* 회차 필터 */}
            {uniqueDraws.length > 0 && (
              <select
                value={selectedDraw}
                onChange={(e) =>
                  setSelectedDraw(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                style={{
                  padding: 'clamp(6px, 2vw, 8px) clamp(10px, 3vw, 12px)',
                  borderRadius: 'clamp(6px, 2vw, 8px)',
                  border: '1px solid #E0E0E0',
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                <option value="all">전체</option>
                {uniqueDraws.map((draw) => (
                  <option key={draw} value={draw}>
                    회차 #{draw}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filteredTickets.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'clamp(30px, 8vw, 40px)',
                color: '#999',
              }}
            >
              <p style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>
                {myTickets.length === 0 ? '아직 구매한 티켓이 없습니다' : '이 회차에 티켓이 없습니다'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 3vw, 12px)' }}>
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.tokenId}
                  style={{
                    padding: 'clamp(12px, 3vw, 15px)',
                    borderRadius: 'clamp(10px, 3vw, 12px)',
                    border: ticket.isWinner ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                    background: ticket.isWinner ? '#E8F5E9' : '#F9F9F9',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 'clamp(8px, 2vw, 10px)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'clamp(11px, 3vw, 13px)',
                        color: '#666',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      티켓 #{ticket.tokenId}
                    </span>
                    <div style={{ display: 'flex', gap: 'clamp(6px, 2vw, 8px)' }}>
                      <span
                        style={{
                          fontSize: 'clamp(10px, 2.5vw, 12px)',
                          padding: 'clamp(3px, 1vw, 4px) clamp(8px, 2vw, 10px)',
                          background: '#2196F3',
                          color: 'white',
                          borderRadius: 'clamp(10px, 3vw, 12px)',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        회차 {ticket.drawId}
                      </span>
                      {ticket.matchCount >= 4 && (
                        <span
                          style={{
                            fontSize: 'clamp(10px, 2.5vw, 12px)',
                            padding: 'clamp(3px, 1vw, 4px) clamp(8px, 2vw, 10px)',
                            background: ticket.matchCount === 6 ? '#FFC107' : '#4CAF50',
                            color: 'white',
                            borderRadius: 'clamp(10px, 3vw, 12px)',
                            fontWeight: '600',
                            fontFamily: 'SF Pro, Arial, sans-serif',
                          }}
                        >
                          {ticket.matchCount === 6 ? '🥇 1등' : ticket.matchCount === 5 ? '🥈 2등' : '🥉 3등'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 'clamp(6px, 2vw, 8px)',
                      justifyContent: 'center',
                    }}
                  >
                    {ticket.numbers.map((num, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: 'clamp(35px, 9vw, 42px)',
                          height: 'clamp(35px, 9vw, 42px)',
                          borderRadius: '50%',
                          background: getNumberColor(num),
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'clamp(14px, 3.5vw, 16px)',
                          fontWeight: '700',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

