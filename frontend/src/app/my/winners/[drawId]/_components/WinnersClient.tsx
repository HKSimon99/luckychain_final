'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface WinnersClientProps {
  initialDrawId: number;
}

export default function WinnersClient({ initialDrawId }: WinnersClientProps) {
  const router = useRouter();
  const { kaiaPrice } = useKaiaPrice();
  
  const [drawId, setDrawId] = useState<number>(initialDrawId);
  const [searchInput, setSearchInput] = useState('');
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [totalPrize, setTotalPrize] = useState('0');
  const [totalPrizeKRW, setTotalPrizeKRW] = useState('0');
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [winners, setWinners] = useState<WinnerInfo[]>([]);
  const [availableDrawIds, setAvailableDrawIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 회차 데이터 로드
  useEffect(() => {
    const loadDrawData = async () => {
      if (isNaN(drawId) || !drawId || drawId <= 0) {
        setError('유효하지 않은 회차 번호입니다');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 현재 회차 확인
        const currentDrawId = await contract.currentDrawId();
        const current = Number(currentDrawId);

        // 빠른 조회용 회차 목록 생성 (최대 8개)
        const pastDrawIds: number[] = [];
        for (let i = 1; i <= Math.min(8, current); i++) {
          if (current - i + 1 > 0) {
            pastDrawIds.unshift(current - i + 1);
          }
        }
        setAvailableDrawIds(pastDrawIds);

        // 당첨 번호 조회 (개별 인덱스로)
        const numArray: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          numArray.push(Number(num));
        }
        numArray.sort((a, b) => a - b);
        setWinningNumbers(numArray);

        // 총 참여자 수 조회 및 티켓 번호 맵 생성
        const filter = contract.filters.TicketPurchased(null, drawId);
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2000000);
        const events = await contract.queryFilter(filter, fromBlock, 'latest');
        const uniqueUsers = new Set(events.map((e: any) => e.args[0]));
        setTotalParticipants(uniqueUsers.size);

        // TokenId별 번호 맵 생성 (성능 최적화)
        const ticketNumbersMap = new Map<number, number[]>();
        for (const event of events) {
          if (!('args' in event)) continue;
          const tokenId = Number(event.args[2]);
          const numbers = event.args[3].map((n: any) => Number(n));
          ticketNumbersMap.set(tokenId, numbers);
        }

        // 당첨자 정보 조회
        const firstPrizeWei = await contract.firstPrize(drawId);
        const secondPrizeWei = await contract.secondPrize(drawId);
        const thirdPrizeWei = await contract.thirdPrize(drawId);

        const firstPrize = parseFloat(ethers.formatEther(firstPrizeWei));
        const secondPrize = parseFloat(ethers.formatEther(secondPrizeWei));
        const thirdPrize = parseFloat(ethers.formatEther(thirdPrizeWei));

        // 총 상금 계산 (1등 + 2등 + 3등)
        const totalPrizeValue = firstPrize + secondPrize + thirdPrize;
        setTotalPrize(totalPrizeValue.toFixed(2));
        setTotalPrizeKRW(Math.floor(totalPrizeValue * kaiaPrice).toLocaleString('ko-KR'));

        // PrizesDistributed 이벤트로 당첨자 조회
        const prizeFilter = contract.filters.PrizesDistributed(drawId);
        const prizeEvents = await contract.queryFilter(prizeFilter, fromBlock, 'latest');

        const winnerMap = new Map<string, { tokenIds: number[]; rank: string; prize: number }>();

        for (const event of prizeEvents) {
          // EventLog 타입 체크
          if (!('args' in event)) continue;
          
          const tokenId = Number(event.args[1]);
          const winner = event.args[2];
          const rank = event.args[3];

          // 맵에서 티켓 번호 가져오기
          const ticketArray = ticketNumbersMap.get(tokenId);
          if (!ticketArray) {
            console.warn(`TokenId ${tokenId}의 번호를 찾을 수 없습니다`);
            continue;
          }
          const matchCount = ticketArray.filter((n: number) => numArray.includes(n)).length;

          let rankStr = '';
          let prizeAmount = 0;
          if (matchCount === 6) {
            rankStr = '1등';
            prizeAmount = firstPrize;
          } else if (matchCount === 5) {
            rankStr = '2등';
            prizeAmount = secondPrize;
          } else if (matchCount === 4) {
            rankStr = '3등';
            prizeAmount = thirdPrize;
          }

          if (!winnerMap.has(rankStr)) {
            winnerMap.set(rankStr, { tokenIds: [], rank: rankStr, prize: prizeAmount });
          }
          winnerMap.get(rankStr)!.tokenIds.push(tokenId);
        }

        const winnerList: WinnerInfo[] = [];
        for (const [rankStr, data] of winnerMap.entries()) {
          const matchCount = rankStr === '1등' ? 6 : rankStr === '2등' ? 5 : 4;
          winnerList.push({
            grade: rankStr,
            match: `${matchCount}/6`,
            winner: `${data.tokenIds.length}명`,
            reward: `${data.prize.toFixed(2)} KAIA`,
            rewardKRW: `${Math.floor(data.prize * kaiaPrice).toLocaleString('ko-KR')}원`,
            numbers: numArray,
            ticketCount: events.length,
          });
        }

        const sortOrder = { '1등': 1, '2등': 2, '3등': 3 };
        winnerList.sort((a, b) => sortOrder[a.grade as keyof typeof sortOrder] - sortOrder[b.grade as keyof typeof sortOrder]);

        setWinners(winnerList);
      } catch (error) {
        console.error('회차 데이터 로드 오류:', error);
        setError('회차 데이터를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    loadDrawData();
  }, [drawId, kaiaPrice]);

  const handleSearch = () => {
    const newDrawId = parseInt(searchInput);
    if (!isNaN(newDrawId) && newDrawId > 0) {
      router.push(`/my/winners/${newDrawId}`);
    }
  };

  const handleQuickSearch = (newDrawId: number) => {
    if (!isNaN(newDrawId) && newDrawId > 0) {
      router.push(`/my/winners/${newDrawId}`);
    }
  };

  const getGradeGradient = (grade: string) => {
    if (grade === '1등') return 'linear-gradient(135deg, #FFE500 0%, #FF8000 100%)';
    if (grade === '2등') return 'linear-gradient(135deg, #D2D2D2 0%, #787878 100%)';
    return 'linear-gradient(135deg, #FFB048 0%, #DA4C00 100%)';
  };

  if (error) {
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
          gap: '20px',
        }}
      >
        <div style={{ fontSize: '24px' }}>⚠️</div>
        <div style={{ fontSize: '16px' }}>{error}</div>
        <button
          onClick={() => router.push('/my/winners')}
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
          검색 페이지로 돌아가기
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        paddingBottom: 'clamp(20px, 5vw, 30px)',
      }}
    >
      <MobileStatusBar />

      {/* 고정 상단 바 */}
      <div
        style={{
          width: '100%',
          background: '#380D44',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          paddingTop: 'clamp(40px, 10vw, 50px)',
          paddingBottom: 'clamp(15px, 3.75vw, 20px)',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginBottom: 'clamp(20px, 5vw, 25px)',
          }}
        >
          <button
            onClick={() => router.push('/my/winners')}
            style={{
              position: 'absolute',
              left: 'clamp(15px, 3.75vw, 20px)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="clamp(20, 5vw, 24)" height="clamp(20, 5vw, 24)" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            style={{
              fontSize: 'clamp(18px, 4.5vw, 20px)',
              fontWeight: 700,
              color: 'white',
            }}
          >
            회차별 당첨자 정보
          </div>
        </div>

        {/* 검색 바 */}
        <div
          style={{
            width: '100%',
            paddingLeft: 'clamp(15px, 3.75vw, 20px)',
            paddingRight: 'clamp(15px, 3.75vw, 20px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(8px, 2vw, 10px)',
            }}
          >
            <input
              type="number"
              placeholder="회차를 입력하세요"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1,
                padding: 'clamp(12px, 3vw, 14px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: 'none',
                background: '#93EE00',
                color: '#000',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              조회
            </button>
          </div>

          {/* 빠른 조회 */}
          <div
            style={{
              marginTop: 'clamp(12px, 3vw, 15px)',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: 'clamp(8px, 2vw, 10px)',
              }}
            >
              빠른 조회
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'clamp(8px, 2vw, 10px)',
                overflowX: 'auto',
                paddingBottom: 'clamp(5px, 1.25vw, 8px)',
              }}
            >
              {availableDrawIds.map((id) => (
                <div
                  key={id}
                  onClick={() => handleQuickSearch(id)}
                  style={{
                    flex: '0 0 auto',
                    width: 'clamp(70px, 17.5vw, 75px)',
                    padding: 'clamp(8px, 2vw, 10px)',
                    borderRadius: 'clamp(8px, 2vw, 10px)',
                    background: id === drawId ? '#93EE00' : 'rgba(255, 255, 255, 0.1)',
                    color: id === drawId ? '#000' : 'white',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    fontWeight: id === drawId ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: id === drawId ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  제 {id}회
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div
        style={{
          width: '100%',
          paddingLeft: 'clamp(15px, 3.75vw, 20px)',
          paddingRight: 'clamp(15px, 3.75vw, 20px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(15px, 3.75vw, 20px)',
        }}
      >
        {/* 회차 정보 카드 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 'clamp(12px, 3vw, 15px)',
            padding: 'clamp(20px, 5vw, 25px)',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: 700,
              color: 'white',
              marginBottom: 'clamp(15px, 3.75vw, 20px)',
            }}
          >
            제 {drawId}회 추첨 결과
          </div>

          {/* 당첨 번호 */}
          <div
            style={{
              marginBottom: 'clamp(15px, 3.75vw, 20px)',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: 'clamp(8px, 2vw, 10px)',
              }}
            >
              당첨 번호
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'clamp(8px, 2vw, 10px)',
                flexWrap: 'wrap',
              }}
            >
              {winningNumbers.map((num, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 'clamp(40px, 10vw, 50px)',
                    height: 'clamp(40px, 10vw, 50px)',
                    borderRadius: '50%',
                    background: '#D9FF32',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(16px, 4vw, 18px)',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* 통계 정보 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'clamp(10px, 2.5vw, 15px)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: 'clamp(5px, 1.25vw, 8px)',
                }}
              >
                총 당첨금
              </div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {totalPrize} KAIA
              </div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
              >
                {totalPrizeKRW}원
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: 'clamp(5px, 1.25vw, 8px)',
                }}
              >
                총 참여자
              </div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {totalParticipants}명
              </div>
            </div>
          </div>
        </div>

        {/* 당첨자 정보 카드들 */}
        {winners.map((winner, idx) => (
          <div
            key={idx}
            style={{
              background: getGradeGradient(winner.grade),
              borderRadius: 'clamp(12px, 3vw, 15px)',
              padding: 'clamp(20px, 5vw, 25px)',
              position: 'relative',
            }}
          >
            {/* 등수 배지 */}
            <div
              style={{
                position: 'absolute',
                top: 'clamp(15px, 3.75vw, 20px)',
                right: 'clamp(15px, 3.75vw, 20px)',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 15px)',
                borderRadius: 'clamp(15px, 3.75vw, 20px)',
                fontSize: 'clamp(12px, 3vw, 14px)',
                fontWeight: 700,
                color: 'white',
              }}
            >
              {winner.grade}
            </div>

            {/* 매칭 정보 */}
            <div
              style={{
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: 600,
                color: 'white',
                marginBottom: 'clamp(15px, 3.75vw, 20px)',
              }}
            >
              {winner.match} 일치
            </div>

            {/* 당첨자 수 */}
            <div
              style={{
                marginBottom: 'clamp(10px, 2.5vw, 12px)',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: 'clamp(5px, 1.25vw, 8px)',
                }}
              >
                당첨자
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 20px)',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {winner.winner}
              </div>
            </div>

            {/* 당첨금 */}
            <div
              style={{
                marginBottom: 'clamp(10px, 2.5vw, 12px)',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: 'clamp(5px, 1.25vw, 8px)',
                }}
              >
                1인당 당첨금
              </div>
              <div
                style={{
                  fontSize: 'clamp(16px, 4vw, 18px)',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {winner.reward}
              </div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                {winner.rewardKRW}
              </div>
            </div>

            {/* 구매한 장수 */}
            <div
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              구매한 장수: {winner.ticketCount}장
            </div>
          </div>
        ))}

        {winners.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 'clamp(40px, 10vw, 60px)',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
            }}
          >
            당첨자 정보가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

