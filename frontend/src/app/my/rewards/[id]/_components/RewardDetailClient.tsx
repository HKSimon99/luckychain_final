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

interface RewardDetail {
  drawId: number;
  tokenId: number;
  grade: string;
  prizeAmount: number;
  prizeKRW: number;
  drawDate: string;
  receiptDate: string;
  winningNumbers: number[];
  myNumbers: number[];
  transactionHash: string;
}

interface RewardDetailClientProps {
  initialDrawId: number;
  initialTokenId: number;
}

export default function RewardDetailClient({ initialDrawId, initialTokenId }: RewardDetailClientProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { kaiaPrice } = useKaiaPrice();
  
  const [detail, setDetail] = useState<RewardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      console.log('🔍 [DEBUG] RewardDetailClient 시작');
      console.log('  - initialDrawId:', initialDrawId);
      console.log('  - initialTokenId:', initialTokenId);
      console.log('  - isConnected:', isConnected);
      console.log('  - address:', address);
      console.log('  - walletProvider:', walletProvider ? '있음' : '없음');

      if (!isConnected || !address) {
        console.warn('⚠️ 지갑이 연결되지 않음');
        setIsLoading(false);
        return;
      }

      if (isNaN(initialDrawId) || isNaN(initialTokenId) || initialDrawId <= 0 || initialTokenId < 0) {
        console.error('❌ 유효하지 않은 ID:', { initialDrawId, initialTokenId });
        setError('유효하지 않은 보상 ID입니다');
        setIsLoading(false);
        return;
      }

      if (!walletProvider) {
        console.log('⏳ 지갑 프로바이더 대기 중...');
        return;
      }

      setIsLoading(true);

      try {
        const drawId = initialDrawId;
        const tokenId = initialTokenId;

        console.log(`📊 상세 정보 로드 시작: 회차=${drawId}, 티켓=${tokenId}`);
        console.log('1️⃣ RPC Provider 생성 중...');

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
        console.log('✅ RPC Provider 생성 완료');

        // 당첨 번호 조회
        console.log('2️⃣ 당첨 번호 조회 중...');
        const winningNums: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          winningNums.push(Number(num));
        }
        winningNums.sort((a, b) => a - b);
        console.log('✅ 당첨 번호:', winningNums);

        // 내 번호 조회 (TicketPurchased 이벤트에서)
        console.log('3️⃣ 내 번호 조회 중... (tokenId:', tokenId, ')');
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2000000);
        console.log('  - 블록 범위:', fromBlock, '~', currentBlock);
        
        const ticketFilter = contract.filters.TicketPurchased(null, drawId);
        console.log('  - TicketPurchased 이벤트 조회 중...');
        
        const ticketEvents = await contract.queryFilter(ticketFilter, fromBlock, 'latest');
        console.log('  - 찾은 이벤트:', ticketEvents.length, '개');
        
        // 해당 tokenId의 이벤트 찾기
        let myNumArray: number[] = [];
        for (const event of ticketEvents) {
          if (!('args' in event)) continue;
          const eventTokenId = Number(event.args[2]);
          if (eventTokenId === tokenId) {
            const numbers = event.args[3];
            myNumArray = numbers.map((n: any) => Number(n));
            console.log('✅ TokenId', tokenId, '의 번호 찾음:', myNumArray);
            break;
          }
        }
        
        if (myNumArray.length === 0) {
          throw new Error(`TokenId ${tokenId}의 티켓 정보를 찾을 수 없습니다`);
        }
        
        console.log('✅ 내 번호:', myNumArray);

        // 매칭 수 계산
        console.log('4️⃣ 매칭 수 계산 중...');
        const matchCount = myNumArray.filter((n: number) => winningNums.includes(n)).length;
        console.log('✅ 매칭 수:', matchCount, '개');

        let grade = '';
        let prizeAmount = 0;

        console.log('5️⃣ 등수 및 상금 조회 중...');
        if (matchCount === 6) {
          grade = '1등';
          const firstPrizeWei = await contract.firstPrize(drawId);
          prizeAmount = parseFloat(ethers.formatEther(firstPrizeWei));
          console.log('✅ 1등! 상금:', prizeAmount, 'KAIA');
        } else if (matchCount === 5) {
          grade = '2등';
          const secondPrizeWei = await contract.secondPrize(drawId);
          prizeAmount = parseFloat(ethers.formatEther(secondPrizeWei));
          console.log('✅ 2등! 상금:', prizeAmount, 'KAIA');
        } else if (matchCount === 4) {
          grade = '3등';
          const thirdPrizeWei = await contract.thirdPrize(drawId);
          prizeAmount = parseFloat(ethers.formatEther(thirdPrizeWei));
          console.log('✅ 3등! 상금:', prizeAmount, 'KAIA');
        } else {
          grade = '낙첨';
          prizeAmount = 0;
          console.log('❌ 낙첨 (매칭 수:', matchCount, ')');
        }

        // PrizesDistributed 이벤트에서 트랜잭션 해시 조회
        console.log('6️⃣ PrizesDistributed 이벤트 조회 중...');
        const prizeFilter = contract.filters.PrizesDistributed(drawId, tokenId);
        
        const prizeEvents = await contract.queryFilter(prizeFilter, fromBlock, 'latest');
        console.log('✅ PrizesDistributed 이벤트:', prizeEvents.length, '개');

        let transactionHash = '';
        let receiptDate = '';

        if (prizeEvents.length > 0) {
          transactionHash = prizeEvents[0].transactionHash;
          console.log('  - TX Hash:', transactionHash);
          const block = await provider.getBlock(prizeEvents[0].blockNumber);
          if (block) {
            const date = new Date(Number(block.timestamp) * 1000);
            receiptDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            console.log('  - 수령 일시:', receiptDate);
          }
        } else {
          console.warn('⚠️ PrizesDistributed 이벤트 없음 (아직 지급되지 않았을 수 있음)');
        }

        // 추첨 날짜 조회 (DrawCompleted 이벤트)
        console.log('7️⃣ DrawCompleted 이벤트 조회 중...');
        const drawFilter = contract.filters.DrawCompleted(drawId);
        const drawEvents = await contract.queryFilter(drawFilter, fromBlock, 'latest');
        console.log('✅ DrawCompleted 이벤트:', drawEvents.length, '개');

        let drawDate = '';
        if (drawEvents.length > 0) {
          const block = await provider.getBlock(drawEvents[0].blockNumber);
          if (block) {
            const date = new Date(Number(block.timestamp) * 1000);
            drawDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            console.log('  - 추첨 일시:', drawDate);
          }
        } else {
          console.warn('⚠️ DrawCompleted 이벤트 없음');
        }

        console.log('8️⃣ 최종 데이터 설정 중...');
        const finalDetail = {
          drawId,
          tokenId,
          grade,
          prizeAmount,
          prizeKRW: Math.floor(prizeAmount * kaiaPrice),
          drawDate,
          receiptDate,
          winningNumbers: winningNums,
          myNumbers: myNumArray,
          transactionHash,
        };
        
        console.log('✅ 최종 데이터:', finalDetail);
        setDetail(finalDetail);
        console.log('🎉 모든 데이터 로드 완료!');
      } catch (error) {
        console.error('❌❌❌ 상세 정보 로드 실패 ❌❌❌');
        console.error('오류 타입:', error instanceof Error ? error.name : typeof error);
        console.error('오류 메시지:', error instanceof Error ? error.message : String(error));
        console.error('전체 오류 객체:', error);
        if (error instanceof Error && error.stack) {
          console.error('스택 트레이스:', error.stack);
        }
        setError('보상 정보를 불러오는데 실패했습니다');
      } finally {
        console.log('🏁 로딩 종료');
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [initialDrawId, initialTokenId, address, isConnected, walletProvider, kaiaPrice]);

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
          onClick={() => router.push('/my/rewards')}
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
          목록으로 돌아가기
        </button>
      </div>
    );
  }

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

  if (!detail) {
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
          gap: '15px',
        }}
      >
        <div style={{ fontSize: '24px' }}>⚠️</div>
        <div style={{ fontSize: '16px' }}>보상 정보를 찾을 수 없습니다</div>
        <button
          onClick={() => router.push('/my/rewards')}
          style={{
            marginTop: '20px',
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
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    if (grade === '1등') return 'linear-gradient(135deg, #FFE500 0%, #FF8000 100%)';
    if (grade === '2등') return 'linear-gradient(135deg, #D2D2D2 0%, #787878 100%)';
    if (grade === '3등') return 'linear-gradient(135deg, #FFB048 0%, #DA4C00 100%)';
    return 'rgba(255, 255, 255, 0.1)';
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 'clamp(20px, 5vw, 30px)',
      }}
    >
      <MobileStatusBar />

      {/* 헤더 */}
      <div
        style={{
          width: '100%',
          paddingTop: 'clamp(40px, 10vw, 50px)',
          paddingBottom: 'clamp(15px, 3.75vw, 20px)',
          paddingLeft: 'clamp(15px, 3.75vw, 20px)',
          paddingRight: 'clamp(15px, 3.75vw, 20px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <button
            onClick={() => router.push('/my')}
            style={{
              position: 'absolute',
              left: 0,
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
            보상 상세 내역
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
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
        {/* 등급 카드 */}
        <div
          style={{
            background: getGradeColor(detail.grade),
            borderRadius: 'clamp(12px, 3vw, 15px)',
            padding: 'clamp(20px, 5vw, 25px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(24px, 6vw, 28px)',
              fontWeight: 700,
              color: 'white',
              marginBottom: 'clamp(10px, 2.5vw, 12px)',
            }}
          >
            {detail.grade}
          </div>
          <div
            style={{
              fontSize: 'clamp(18px, 4.5vw, 20px)',
              fontWeight: 600,
              color: 'white',
              marginBottom: 'clamp(5px, 1.25vw, 8px)',
            }}
          >
            {detail.prizeAmount.toFixed(2)} KAIA
          </div>
          <div
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            {detail.prizeKRW.toLocaleString('ko-KR')}원
          </div>
        </div>

        {/* 기본 정보 */}
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
            기본 정보
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 3vw, 15px)' }}>
            <div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: 'clamp(5px, 1.25vw, 8px)',
                }}
              >
                회차
              </div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                제 {detail.drawId}회
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
                티켓 번호
              </div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                #{detail.tokenId}
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
                추첨 일시
              </div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {detail.drawDate || '-'}
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
                수령 일시
              </div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {detail.receiptDate || '-'}
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
                거래 Hash
              </div>
              <a
                href={`https://kairos.kaiascan.io/tx/${detail.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(
                    `https://kairos.kaiascan.io/tx/${detail.transactionHash}`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  color: '#93EE00',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  wordBreak: 'break-all',
                }}
              >
                {detail.transactionHash
                  ? `${detail.transactionHash.slice(0, 10)}...${detail.transactionHash.slice(-8)}`
                  : '-'}
              </a>
            </div>
          </div>
        </div>

        {/* 추첨 정보 */}
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
            추첨 정보
          </div>

          <div style={{ marginBottom: 'clamp(15px, 3.75vw, 20px)' }}>
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
              {detail.winningNumbers.map((num, idx) => (
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

          <div>
            <div
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: 'clamp(8px, 2vw, 10px)',
              }}
            >
              내 번호
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'clamp(8px, 2vw, 10px)',
                flexWrap: 'wrap',
              }}
            >
              {detail.myNumbers.map((num, idx) => {
                const isMatched = detail.winningNumbers.includes(num);
                return (
                  <div
                    key={idx}
                    style={{
                      width: 'clamp(40px, 10vw, 50px)',
                      height: 'clamp(40px, 10vw, 50px)',
                      borderRadius: '50%',
                      background: isMatched ? '#D9FF32' : 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'clamp(16px, 4vw, 18px)',
                      fontWeight: 700,
                      color: isMatched ? '#000' : 'white',
                    }}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

