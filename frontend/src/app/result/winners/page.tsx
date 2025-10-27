'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import MobileStatusBar from '@/components/MobileStatusBar';
import { useKaiaPrice } from '@/contexts/KaiaPriceContext';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface WinnerCard {
  rank: string;
  rankColor: [string, string];
  matches: string;
  people: string;
  kaia: string;
  won: string;
  nums: number[];
  matchCount: number;
  ticketCount: number;
}

export default function ResultWinnersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { kaiaPrice } = useKaiaPrice();
  const drawId = parseInt(searchParams.get('drawId') || '0');

  const [cards, setCards] = useState<WinnerCard[]>([]);
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWinnerData = async () => {
      if (!drawId || drawId <= 0) {
        setIsLoading(false);
        return;
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 1. 당첨 번호 조회 (오름차순 정렬)
        const nums: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          nums.push(Number(num));
        }
        nums.sort((a, b) => a - b);
        setWinningNumbers(nums);

        // 2. 상금 정보 조회
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2000000);

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

        // 3. 총 참여 티켓 수 조회
        const ticketFilter = contract.filters.TicketPurchased(null, null, drawId);
        const ticketEvents = await contract.queryFilter(ticketFilter, fromBlock, 'latest');
        const totalTickets = ticketEvents.length;

        // 4. 카드 데이터 생성
        const winnerCards: WinnerCard[] = [];

        if (firstCount > 0) {
          winnerCards.push({
            rank: '1등',
            rankColor: ['#FFE500', '#FF8000'],
            matches: '6개 일치',
            people: `${firstCount}명 당첨`,
            kaia: `${firstPrize.toFixed(2)} KAIA`,
            won: `₩${Math.floor(firstPrize * kaiaPrice).toLocaleString('ko-KR')}`,
            nums,
            matchCount: 6,
            ticketCount: totalTickets,
          });
        }

        if (secondCount > 0) {
          winnerCards.push({
            rank: '2등',
            rankColor: ['#D2D2D2', '#787878'],
            matches: '5개 일치',
            people: `${secondCount}명 당첨`,
            kaia: `${secondPrize.toFixed(2)} KAIA`,
            won: `₩${Math.floor(secondPrize * kaiaPrice).toLocaleString('ko-KR')}`,
            nums,
            matchCount: 5,
            ticketCount: totalTickets,
          });
        }

        if (thirdCount > 0) {
          winnerCards.push({
            rank: '3등',
            rankColor: ['#FFB048', '#DA4C00'],
            matches: '4개 일치',
            people: `${thirdCount}명 당첨`,
            kaia: `${thirdPrize.toFixed(2)} KAIA`,
            won: `₩${Math.floor(thirdPrize * kaiaPrice).toLocaleString('ko-KR')}`,
            nums,
            matchCount: 4,
            ticketCount: totalTickets,
          });
        }

        setCards(winnerCards);

      } catch (error) {
        console.error('당첨자 정보 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWinnerData();
  }, [drawId, kaiaPrice]);

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
        minHeight: '100vh',
        background: '#380D44',
        fontFamily: 'SF Pro, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단 상태바 */}
      <MobileStatusBar />

      {/* 헤더 */}
      <div
        style={{
          width: '100%',
          height: 'clamp(48px, 12vw, 52px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 clamp(16px, 4vw, 18px)',
          color: '#fff',
          position: 'relative',
        }}
      >
        <div
          onClick={() => router.push('/my')}
          style={{
            position: 'absolute',
            left: 'clamp(16px, 4vw, 18px)',
            fontSize: 'clamp(18px, 4.5vw, 20px)',
            cursor: 'pointer',
          }}
        >
          ←
        </div>
        <div
          style={{
            fontSize: 'clamp(15px, 3.8vw, 17px)',
            fontWeight: '700',
          }}
        >
          복권 결과(당첨자)
        </div>
      </div>

      {/* 카드 섹션 */}
      <div
        style={{
          width: '100%',
          flex: 1,
          padding: 'clamp(15px, 3.8vw, 20px) clamp(8px, 2vw, 10px) clamp(20px, 5vw, 25px) clamp(8px, 2vw, 10px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(20px, 5vw, 25px)',
          alignItems: 'center',
        }}
      >
        {cards.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'white',
              fontSize: 'clamp(14px, 3.5vw, 15px)',
              marginTop: 'clamp(40px, 10vw, 60px)',
              opacity: 0.7,
            }}
          >
            당첨자가 없습니다
          </div>
        ) : (
          cards.map((card, idx) => (
            <div
              key={idx}
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'linear-gradient(312deg, #6E0058 0%, #450058 64%)',
                borderRadius: 'clamp(12px, 3vw, 14px)',
                border: '0.5px solid #fff',
                boxShadow: '2px 2px 6px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(16px, 4vw, 18px) clamp(14px, 3.5vw, 16px) clamp(14px, 3.5vw, 16px) clamp(14px, 3.5vw, 16px)',
                color: '#fff',
                position: 'relative',
              }}
            >
              {/* 카드 헤더 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* 등수 배지 */}
                <div
                  style={{
                    width: 'clamp(45px, 11.3vw, 48px)',
                    height: 'clamp(45px, 11.3vw, 48px)',
                    background: `linear-gradient(135deg, ${card.rankColor[0]}, ${card.rankColor[1]})`,
                    color: '#222',
                    borderRadius: 'clamp(8px, 2vw, 10px)',
                    fontSize: 'clamp(15px, 3.8vw, 16px)',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {card.rank}
                </div>

                {/* 일치 정보 */}
                <div
                  style={{
                    flex: 1,
                    marginLeft: 'clamp(12px, 3vw, 15px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(15px, 3.8vw, 16px)',
                      fontWeight: '600',
                    }}
                  >
                    {card.matches}
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      marginTop: '3px',
                    }}
                  >
                    {card.people}
                  </div>
                </div>

                {/* 보상 정보 */}
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 'clamp(15px, 3.8vw, 16px)',
                      color: '#9DFF00',
                      fontWeight: '700',
                    }}
                  >
                    {card.kaia}
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(12px, 3vw, 13px)',
                      color: '#fff',
                      opacity: 0.85,
                    }}
                  >
                    {card.won}
                  </div>
                </div>
              </div>

              {/* 번호 행 */}
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(7px, 1.8vw, 8px)',
                  margin: 'clamp(12px, 3vw, 15px) 0 clamp(8px, 2vw, 10px) 0',
                  justifyContent: 'center',
                }}
              >
                {card.nums.map((num, i) => {
                  // 해당 등수의 일치 개수만큼만 노란색 표시
                  const isMatched = i < card.matchCount;
                  
                  return (
                    <div
                      key={i}
                      style={{
                        width: 'clamp(42px, 10.5vw, 45px)',
                        height: 'clamp(42px, 10.5vw, 45px)',
                        borderRadius: 'clamp(8px, 2vw, 10px)',
                        fontSize: 'clamp(16px, 4vw, 17px)',
                        fontWeight: '700',
                        background: isMatched ? '#F4CB42' : '#fff',
                        color: isMatched ? '#222' : '#333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: isMatched ? '2px solid #FFC400' : 'none',
                        opacity: isMatched ? 1 : 0.7,
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>

              {/* 카드 푸터 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'clamp(12px, 3vw, 13px)',
                  opacity: 0.9,
                }}
              >
                <div>구매한 장수: {card.ticketCount}장</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

