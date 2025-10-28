'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import MobileStatusBar from '@/components/MobileStatusBar';
import { useKaiaPrice } from '@/contexts/KaiaPriceContext';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface Reward {
  id: string;
  drawId: number;
  item: string;
  date: string;
  amountKaia: number;
  amount: number;
  grade: string;
  tokenId: number;
}

export default function RewardsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { kaiaPrice } = useKaiaPrice();
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 등수별 스타일
  const getGradeStyles = (grade: string) => {
    switch (grade) {
      case '1등':
        return { bg: 'linear-gradient(135deg, #FFE500 0%, #FF8000 100%)', color: 'black' };
      case '2등':
        return { bg: 'linear-gradient(135deg, #D2D2D2 0%, #787878 100%)', color: 'black' };
      case '3등':
        return { bg: 'linear-gradient(135deg, #FFB048 0%, #DA4C00 100%)', color: 'black' };
      default:
        return { bg: '#C989D2', color: 'white' };
    }
  };

  useEffect(() => {
    const loadRewards = async () => {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }

      if (!walletProvider) {
        console.log('⏳ 지갑 프로바이더 대기 중...');
        return;
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2000000);

        // 내가 구매한 티켓 이벤트 조회
        const ticketFilter = contract.filters.TicketPurchased(address);
        const ticketEvents = await contract.queryFilter(ticketFilter, fromBlock, 'latest');

        const rewardList: Reward[] = [];

        // 회차별로 그룹화하여 처리
        const drawMap = new Map<number, any[]>();
        for (const event of ticketEvents) {
          if (!('args' in event)) continue;
          const eventData = event as any;
          // TicketPurchased(address buyer, uint256 ticketId, uint256 drawId, uint8[6] numbers)
          const tokenId = Number(eventData.args[1]);  // ✅ args[1] = ticketId
          const drawId = Number(eventData.args[2]);   // ✅ args[2] = drawId
          const numbers = Array.from(eventData.args[3] || []).map((n: any) => Number(n));
          
          if (!drawMap.has(drawId)) {
            drawMap.set(drawId, []);
          }
          drawMap.get(drawId)!.push({ tokenId, numbers, event });
        }

        // 각 회차별로 당첨 확인
        for (const [drawId, tickets] of drawMap.entries()) {
          try {
            // 당첨 번호 조회
            const winningNums: number[] = [];
            for (let i = 0; i < 6; i++) {
              const num = await contract.winningNumbers(drawId, i);
              winningNums.push(Number(num));
            }

            // 당첨 번호가 없으면 스킵
            if (!winningNums.some(n => n > 0)) continue;

            // 상금 정보 조회
            const prizeFilter = contract.filters.PrizesDistributed(drawId);
            const prizeEvents = await contract.queryFilter(prizeFilter, fromBlock, 'latest');

            if (prizeEvents.length === 0) continue;

            const prizeEvent = prizeEvents[0] as any;
            const firstPrize = Number(ethers.formatEther(prizeEvent.args.firstPrize || 0));
            const secondPrize = Number(ethers.formatEther(prizeEvent.args.secondPrize || 0));
            const thirdPrize = Number(ethers.formatEther(prizeEvent.args.thirdPrize || 0));

            // 각 티켓이 당첨되었는지 확인
            for (const ticket of tickets) {
              const matchCount = ticket.numbers.filter((n: number) => winningNums.includes(n)).length;
              
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

              if (rank && prizeAmount > 0) {
                // 블록 타임스탬프로 날짜 생성
                const block = await provider.getBlock(ticket.event.blockNumber);
                const date = block ? new Date(Number(block.timestamp) * 1000) : new Date();
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

                rewardList.push({
                  id: `${drawId}-${ticket.tokenId}`,
                  drawId,
                  item: `${drawId}회차 보상`,
                  date: formattedDate,
                  amountKaia: prizeAmount,
                  amount: Math.floor(prizeAmount * kaiaPrice),
                  grade: rank,
                  tokenId: ticket.tokenId,
                });
              }
            }
          } catch (e) {
            console.error(`회차 ${drawId} 처리 실패:`, e);
          }
        }

        // 최신순 정렬 (회차 높은 순)
        rewardList.sort((a, b) => b.drawId - a.drawId);

        setRewards(rewardList);
        setFilteredRewards(rewardList);

      } catch (error) {
        console.error('보상 내역 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRewards();
  }, [address, isConnected, walletProvider, kaiaPrice]);

  const handleSearch = () => {
    if (!searchInput.trim()) {
      setFilteredRewards(rewards);
      return;
    }

    const filtered = rewards.filter(r => 
      r.item.includes(searchInput) ||
      r.date.includes(searchInput) ||
      r.grade.includes(searchInput) ||
      r.amountKaia.toString().includes(searchInput)
    );
    setFilteredRewards(filtered);
  };

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
          fontSize: 'clamp(14px, 3.5vw, 16px)',
        }}
      >
        보상 내역 로딩 중...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'SF Pro, Arial, sans-serif',
      }}
    >
      {/* 상단 고정 영역 */}
      <div style={{ flexShrink: 0 }}>
        <MobileStatusBar />

        {/* back + 보상 수령내역 텍스트 */}
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
            onClick={() => router.push('/my')}
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
            }}
          >
            보상 수령내역
          </span>
        </div>

        {/* 제목 */}
        <div style={{ marginTop: 'clamp(40px, 10vw, 45px)', textAlign: 'center' }}>
          <div
            style={{
              color: '#e9c3ee',
              fontSize: 'clamp(18px, 4.5vw, 20px)',
              fontWeight: '700',
              marginBottom: 'clamp(8px, 2vw, 10px)',
            }}
          >
            원하는 수령 내역을 찾아보세요
          </div>
        </div>

        {/* 검색창 박스 */}
        <div
          style={{
            marginTop: 'clamp(30px, 7.5vw, 35px)',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: 'calc(100% - clamp(36px, 9vw, 40px))',
            maxWidth: '400px',
            background: 'rgba(213, 126, 225, 0.2)',
            borderRadius: 'clamp(12px, 3vw, 15px)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: 'clamp(18px, 4.5vw, 20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 'clamp(18px, 4.5vw, 20px)',
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
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="상금, 회차, 날짜 ..."
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
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
              <line
                x1="9"
                y1="9"
                x2="13"
                y2="13"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            조회
          </button>
        </div>
      </div>
      </div>

      {/* 수령 내역 리스트 - 스크롤 영역 */}
      <div
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 'clamp(10px, 2.5vw, 12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(12px, 3vw, 15px)',
            width: 'calc(100% - clamp(36px, 9vw, 40px))',
            maxWidth: '400px',
            paddingBottom: 'clamp(20px, 5vw, 25px)',
          }}
        >
        {filteredRewards.length > 0 ? (
          filteredRewards.map((reward) => {
            const gradeStyle = getGradeStyles(reward.grade);
            const isSelected = selectedId === reward.id;
            return (
              <button
                key={reward.id}
                onClick={() => router.push(`/my/rewards/${reward.id}`)}
                style={{
                  background: 'rgba(195,112,208,0.23)',
                  border: isSelected ? '1px solid #b09709' : '0.5px solid rgba(255,255,255,0.6)',
                  borderRadius: 'clamp(8px, 2vw, 10px)',
                  padding: 'clamp(12px, 3vw, 14px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(10px, 2.5vw, 12px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: isSelected
                    ? '0px 0px 10px rgba(255, 215, 0, 0.6)'
                    : '0px 4px 4px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* 등수 정사각형 */}
                <div
                  style={{
                    width: 'clamp(38px, 9.5vw, 42px)',
                    height: 'clamp(38px, 9.5vw, 42px)',
                    background: gradeStyle.bg,
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: gradeStyle.color,
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      fontWeight: '600',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                    }}
                  >
                    {reward.grade}
                  </span>
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p
                    style={{
                      color: 'white',
                      fontSize: 'clamp(13px, 3.3vw, 14px)',
                      fontWeight: '700',
                      marginBottom: 'clamp(3px, 0.8vw, 4px)',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                      margin: 0,
                    }}
                  >
                    {reward.item}
                  </p>
                  <p
                    style={{
                      color: '#C989D2',
                      fontSize: 'clamp(11px, 2.8vw, 12px)',
                      fontWeight: '400',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                      margin: 0,
                      marginTop: 'clamp(3px, 0.8vw, 4px)',
                    }}
                  >
                    {reward.date}
                  </p>
                </div>

                {/* 금액 */}
                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      color: '#9DFF00',
                      fontSize: 'clamp(13px, 3.3vw, 14px)',
                      fontWeight: '590',
                      lineHeight: '1.4',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                      margin: 0,
                    }}
                  >
                    {reward.amountKaia.toFixed(2)} KAIA
                  </p>
                  <p
                    style={{
                      color: 'white',
                      fontSize: 'clamp(9px, 2.3vw, 10px)',
                      fontWeight: '400',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                      margin: 0,
                      marginTop: 'clamp(2px, 0.5vw, 3px)',
                    }}
                  >
                    ￦{reward.amount.toLocaleString('ko-KR')}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: 'clamp(35px, 8.8vw, 40px) clamp(18px, 4.5vw, 20px)' }}>
            <p
              style={{
                color: '#C989D2',
                fontSize: 'clamp(13px, 3.3vw, 14px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              {searchInput ? '검색 결과가 없습니다' : '보상 수령 내역이 없습니다'}
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

