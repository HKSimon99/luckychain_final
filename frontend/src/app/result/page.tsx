'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import MobileLayout from '@/components/MobileLayout';
import Header from '@/components/Header';
import * as lottoAbiModule from '@/lib/lottoAbi.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface PrizeDistribution {
  drawId: number;
  firstWinners: number;
  secondWinners: number;
  thirdWinners: number;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  rolloverAmount: string;
}

export default function ResultPage() {
  const [contract, setContract] = useState<any>(null);
  const [currentDrawId, setCurrentDrawId] = useState(0);
  const [selectedDraw, setSelectedDraw] = useState(0);
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [prizeDistributions, setPrizeDistributions] = useState<PrizeDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 컨트랙트 초기화
  useEffect(() => {
    const initContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
        setContract(contract);

        const currentDraw = await contract.currentDrawId();
        setCurrentDrawId(Number(currentDraw));
        setSelectedDraw(Number(currentDraw) - 1); // 이전 회차 기본 선택

        // 상금 분배 내역 로드
        await loadPrizeDistributions(provider, contract);

        setIsLoading(false);
      } catch (error) {
        console.error('컨트랙트 초기화 실패:', error);
        setIsLoading(false);
      }
    };

    initContract();
  }, []);

  // 상금 분배 내역 로드
  const loadPrizeDistributions = async (provider: any, contract: any) => {
    try {
      const currentBlock = await provider.getBlockNumber();
      // 최근 5000 블록만 조회 (약 2~3시간 분량)
      const fromBlock = Math.max(0, currentBlock - 5000);

      const filter = contract.filters.PrizesDistributed();
      const events = await contract.queryFilter(filter, fromBlock, 'latest');
      
      console.log(`✅ 상금 분배 조회: ${events.length}개 이벤트 발견`);

      const distributions: PrizeDistribution[] = [];

      for (const event of events) {
        const eventLog = event as any; // TypeScript 타입 오류 회피
        const drawId = eventLog.args?.drawId;
        const firstWinners = eventLog.args?.firstWinners;
        const secondWinners = eventLog.args?.secondWinners;
        const thirdWinners = eventLog.args?.thirdWinners;
        const firstPrize = eventLog.args?.firstPrize;
        const secondPrize = eventLog.args?.secondPrize;
        const thirdPrize = eventLog.args?.thirdPrize;
        const rolloverAmount = eventLog.args?.rolloverAmount;

        distributions.push({
          drawId: Number(drawId),
          firstWinners: Number(firstWinners),
          secondWinners: Number(secondWinners),
          thirdWinners: Number(thirdWinners),
          firstPrize: firstPrize ? ethers.formatEther(firstPrize) : '0',
          secondPrize: secondPrize ? ethers.formatEther(secondPrize) : '0',
          thirdPrize: thirdPrize ? ethers.formatEther(thirdPrize) : '0',
          rolloverAmount: rolloverAmount ? ethers.formatEther(rolloverAmount) : '0',
        });
      }

      setPrizeDistributions(distributions.sort((a, b) => b.drawId - a.drawId));
    } catch (error) {
      console.error('상금 분배 내역 로드 실패:', error);
    }
  };

  // 당첨 번호 조회
  const loadWinningNumbers = async () => {
    if (!contract || !selectedDraw) {
      alert('회차를 선택해주세요!');
      return;
    }

    if (selectedDraw >= currentDrawId) {
      alert('아직 추첨이 진행되지 않은 회차입니다!');
      return;
    }

    try {
      const numbers: number[] = [];
      for (let i = 0; i < 6; i++) {
        const num = await contract.winningNumbers(selectedDraw, i);
        numbers.push(Number(num));
      }

      if (numbers[0] === 0) {
        alert('아직 당첨 번호가 생성되지 않았습니다!');
        setWinningNumbers([]);
      } else {
        setWinningNumbers(numbers);
      }
    } catch (error) {
      console.error('당첨 번호 조회 실패:', error);
      alert('당첨 번호 조회에 실패했습니다.');
      setWinningNumbers([]);
    }
  };

  // 번호 색상
  const getNumberColor = (num: number) => {
    if (num <= 10) return '#FFC107';
    if (num <= 20) return '#2196F3';
    if (num <= 30) return '#F44336';
    if (num <= 40) return '#9E9E9E';
    return '#4CAF50';
  };

  // 해당 회차의 상금 분배 정보
  const currentPrizeInfo = prizeDistributions.find((p) => p.drawId === selectedDraw);

  if (isLoading) {
    return (
      <MobileLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <p style={{ color: 'white', fontSize: 'clamp(14px, 3.5vw, 16px)' }}>로딩 중...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
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
        <h2
          style={{
            fontSize: 'clamp(22px, 5.5vw, 26px)',
            fontWeight: '700',
            color: 'white',
            textAlign: 'center',
            marginBottom: 'clamp(20px, 5vw, 25px)',
            fontFamily: 'SF Pro, Arial, sans-serif',
          }}
        >
          🏆 당첨 결과
        </h2>

        {/* 회차 선택 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              color: '#333',
              marginBottom: 'clamp(10px, 3vw, 12px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            조회할 회차 선택
          </label>
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 10px)' }}>
            <input
              type="number"
              min="1"
              max={currentDrawId - 1}
              value={selectedDraw || ''}
              onChange={(e) => setSelectedDraw(Number(e.target.value))}
              style={{
                flex: 1,
                padding: 'clamp(10px, 3vw, 12px)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '1px solid #E0E0E0',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
              placeholder="회차 번호"
            />
            <button
              onClick={loadWinningNumbers}
              style={{
                padding: 'clamp(10px, 3vw, 12px) clamp(20px, 5vw, 25px)',
                background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              조회
            </button>
          </div>
          <p
            style={{
              fontSize: 'clamp(11px, 3vw, 13px)',
              color: '#999',
              marginTop: 'clamp(8px, 2vw, 10px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            현재 회차: #{currentDrawId} (조회 가능: 1 ~ {currentDrawId - 1})
          </p>
        </div>

        {/* 당첨 번호 표시 */}
        {winningNumbers.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              borderRadius: 'clamp(15px, 4vw, 20px)',
              padding: 'clamp(20px, 5vw, 25px)',
              marginBottom: 'clamp(15px, 4vw, 20px)',
              boxShadow: '0 8px 24px rgba(255, 215, 0, 0.4)',
            }}
          >
            <h3
              style={{
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '700',
                color: '#333',
                textAlign: 'center',
                marginBottom: 'clamp(15px, 4vw, 18px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              🎯 {selectedDraw}회차 당첨 번호
            </h3>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'clamp(8px, 2vw, 10px)',
                flexWrap: 'wrap',
              }}
            >
              {winningNumbers.map((num, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 'clamp(50px, 12vw, 60px)',
                    height: 'clamp(50px, 12vw, 60px)',
                    borderRadius: '50%',
                    background: getNumberColor(num),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(20px, 5vw, 24px)',
                    fontWeight: '700',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 상금 분배 정보 */}
        {currentPrizeInfo && (
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
                marginBottom: 'clamp(15px, 4vw, 18px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              💰 상금 분배
            </h3>

            {parseFloat(currentPrizeInfo.rolloverAmount) > 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 'clamp(20px, 5vw, 25px)',
                  background: '#FFF3CD',
                  borderRadius: 'clamp(10px, 3vw, 12px)',
                }}
              >
                <p
                  style={{
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    color: '#856404',
                    fontWeight: '600',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  1등 당첨자 없음
                </p>
                <p
                  style={{
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: '#856404',
                    marginTop: 'clamp(6px, 2vw, 8px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {parseFloat(currentPrizeInfo.rolloverAmount).toFixed(4)} KAIA 다음 회차로 이월
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(10px, 3vw, 12px)',
                }}
              >
                {/* 1등 */}
                {currentPrizeInfo.firstWinners > 0 && (
                  <div
                    style={{
                      padding: 'clamp(12px, 3vw, 15px)',
                      background: 'linear-gradient(135deg, #FFD700 30%, #FFA500 100%)',
                      borderRadius: 'clamp(10px, 3vw, 12px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(14px, 3.5vw, 16px)',
                          fontWeight: '700',
                          color: '#333',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        🥇 1등 (6개 일치)
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: '#666',
                          marginTop: 'clamp(3px, 1vw, 4px)',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        {currentPrizeInfo.firstWinners}명 당첨
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(16px, 4vw, 18px)',
                        fontWeight: '700',
                        color: '#333',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {parseFloat(currentPrizeInfo.firstPrize).toFixed(4)} KAIA
                    </div>
                  </div>
                )}

                {/* 2등 */}
                {currentPrizeInfo.secondWinners > 0 && (
                  <div
                    style={{
                      padding: 'clamp(12px, 3vw, 15px)',
                      background: 'linear-gradient(135deg, #C0C0C0 30%, #A9A9A9 100%)',
                      borderRadius: 'clamp(10px, 3vw, 12px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(14px, 3.5vw, 16px)',
                          fontWeight: '700',
                          color: '#333',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        🥈 2등 (5개 일치)
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: '#666',
                          marginTop: 'clamp(3px, 1vw, 4px)',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        {currentPrizeInfo.secondWinners}명 당첨
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(16px, 4vw, 18px)',
                        fontWeight: '700',
                        color: '#333',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {parseFloat(currentPrizeInfo.secondPrize).toFixed(4)} KAIA
                    </div>
                  </div>
                )}

                {/* 3등 */}
                {currentPrizeInfo.thirdWinners > 0 && (
                  <div
                    style={{
                      padding: 'clamp(12px, 3vw, 15px)',
                      background: 'linear-gradient(135deg, #CD7F32 30%, #A0522D 100%)',
                      borderRadius: 'clamp(10px, 3vw, 12px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(14px, 3.5vw, 16px)',
                          fontWeight: '700',
                          color: 'white',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        🥉 3등 (4개 일치)
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: 'rgba(255,255,255,0.8)',
                          marginTop: 'clamp(3px, 1vw, 4px)',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        {currentPrizeInfo.thirdWinners}명 당첨
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(16px, 4vw, 18px)',
                        fontWeight: '700',
                        color: 'white',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      {parseFloat(currentPrizeInfo.thirdPrize).toFixed(4)} KAIA
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 전체 상금 분배 내역 */}
        {prizeDistributions.length > 0 && (
          <div
            style={{
              background: 'white',
              borderRadius: 'clamp(15px, 4vw, 20px)',
              padding: 'clamp(20px, 5vw, 25px)',
              marginBottom: 'clamp(80px, 15vh, 100px)',
            }}
          >
            <h3
              style={{
                fontSize: 'clamp(16px, 4vw, 18px)',
                fontWeight: '600',
                color: '#333',
                marginBottom: 'clamp(12px, 3vw, 15px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
              }}
            >
              📋 전체 당첨 내역
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(8px, 2vw, 10px)',
                maxHeight: 'clamp(250px, 50vh, 350px)',
                overflowY: 'auto',
              }}
            >
              {prizeDistributions.slice(0, 10).map((dist) => (
                <div
                  key={dist.drawId}
                  style={{
                    padding: 'clamp(10px, 3vw, 12px)',
                    background: '#F9F9F9',
                    borderRadius: 'clamp(8px, 2vw, 10px)',
                    border: '1px solid #E0E0E0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 'clamp(6px, 2vw, 8px)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'clamp(13px, 3.5vw, 15px)',
                        fontWeight: '600',
                        color: '#333',
                        fontFamily: 'SF Pro, Arial, sans-serif',
                      }}
                    >
                      회차 #{dist.drawId}
                    </span>
                    {parseFloat(dist.rolloverAmount) > 0 ? (
                      <span
                        style={{
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: '#F44336',
                          fontWeight: '600',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        당첨자 없음
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: '#4CAF50',
                          fontWeight: '600',
                          fontFamily: 'SF Pro, Arial, sans-serif',
                        }}
                      >
                        당첨자 {dist.firstWinners + dist.secondWinners + dist.thirdWinners}명
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(11px, 3vw, 13px)',
                      color: '#666',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                    }}
                  >
                    {parseFloat(dist.rolloverAmount) > 0
                      ? `이월: ${parseFloat(dist.rolloverAmount).toFixed(4)} KAIA`
                      : `1등: ${dist.firstWinners}명 | 2등: ${dist.secondWinners}명 | 3등: ${dist.thirdWinners}명`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

