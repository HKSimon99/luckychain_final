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
        let drawId = initialDrawId; // ⚠️ let으로 변경 (나중에 실제 drawId로 업데이트)
        const tokenId = initialTokenId;

        console.log(`📊 상세 정보 로드 시작: 회차=${drawId}, 티켓=${tokenId}`);
        console.log('1️⃣ RPC Provider 생성 중...');

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
        console.log('✅ RPC Provider 생성 완료');

        // 내 번호 조회 (TicketPurchased 이벤트에서 - tokenId로 검색)
        console.log('3️⃣ 내 번호 조회 중... (tokenId:', tokenId, ')');
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 6000000);
        console.log('  - 블록 범위:', fromBlock, '~', currentBlock);
        
        // ⚠️ ticketId가 indexed되지 않아서 필터링 불가 → 모든 이벤트 조회 후 클라이언트 측 필터링
        console.log('  - TicketPurchased 이벤트 조회 중 (필터 없음)...');
        
        const ticketFilter = contract.filters.TicketPurchased();
        const allTicketEvents = await contract.queryFilter(ticketFilter, fromBlock, 'latest');
        console.log('  - 전체 TicketPurchased 이벤트:', allTicketEvents.length, '개');
        
        // 클라이언트 측에서 tokenId로 필터링
        let myNumArray: number[] = [];
        let actualDrawId = drawId; // URL의 drawId 사용 (초기값)
        let found = false;
        
        for (const event of allTicketEvents) {
          if (!('args' in event)) continue;
          const eventData = event as any;
          
          // TicketPurchased(address buyer, uint256 ticketId, uint256 drawId, uint8[6] numbers)
          const eventTokenId = Number(eventData.args[1]); // args[1] = ticketId
          
          if (eventTokenId === tokenId) {
            actualDrawId = Number(eventData.args[2]); // args[2] = drawId
            myNumArray = Array.from(eventData.args[3] || []).map((n: any) => Number(n));
            found = true;
            console.log('✅ TokenId', tokenId, '찾음! 실제 회차:', actualDrawId, '번호:', myNumArray);
            
            // URL의 drawId와 실제 drawId가 다르면 경고
            if (actualDrawId !== drawId) {
              console.warn(`⚠️ URL의 drawId(${drawId})와 실제 drawId(${actualDrawId})가 다릅니다!`);
            }
            break;
          }
        }
        
        if (!found) {
          console.error('❌ TokenId', tokenId, '를 찾지 못했습니다.');
          console.error('  - 조회된 TokenId 샘플 (최대 10개):', 
            allTicketEvents.slice(0, 10).filter((e: any) => 'args' in e).map((e: any) => Number(e.args[1])));
          throw new Error(`TokenId ${tokenId}의 티켓 정보를 찾을 수 없습니다.`);
        }
        
        // 실제 drawId로 업데이트
        drawId = actualDrawId;
        console.log('✅ 내 번호:', myNumArray, '/ 실제 회차:', drawId);

        // 실제 drawId로 당첨 번호 조회
        console.log('4️⃣ 당첨 번호 조회 중... (실제 회차:', drawId, ')');
        const winningNums: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          winningNums.push(Number(num));
        }
        winningNums.sort((a, b) => a - b);
        console.log('✅ 당첨 번호:', winningNums);

        // 매칭 수 계산
        console.log('5️⃣ 매칭 수 계산 중...');
        const matchCount = myNumArray.filter((n: number) => winningNums.includes(n)).length;
        console.log('✅ 매칭 수:', matchCount, '개');

        let grade = '';
        let prizeAmount = 0;

        console.log('5️⃣ 등수 계산 중...');
        if (matchCount === 6) {
          grade = '1등';
        } else if (matchCount === 5) {
          grade = '2등';
        } else if (matchCount === 4) {
          grade = '3등';
        } else {
          grade = '낙첨';
        }
        console.log('✅ 등수:', grade);

        // PrizesDistributed 이벤트에서 상금 정보 조회
        console.log('6️⃣ PrizesDistributed 이벤트 조회 중...');
        const prizeFilter = contract.filters.PrizesDistributed(drawId);
        
        const prizeEvents = await contract.queryFilter(prizeFilter, fromBlock, 'latest');
        console.log('✅ PrizesDistributed 이벤트:', prizeEvents.length, '개');

        let transactionHash = '';
        let receiptDate = '';

        if (prizeEvents.length > 0 && 'args' in prizeEvents[0]) {
          if (grade === '1등') {
            prizeAmount = parseFloat(ethers.formatEther(prizeEvents[0].args[4]));
          } else if (grade === '2등') {
            prizeAmount = parseFloat(ethers.formatEther(prizeEvents[0].args[5]));
          } else if (grade === '3등') {
            prizeAmount = parseFloat(ethers.formatEther(prizeEvents[0].args[6]));
          }
          console.log('✅ 상금:', prizeAmount, 'KAIA');

          transactionHash = prizeEvents[0].transactionHash;
          console.log('  - TX Hash:', transactionHash);
          const block = await provider.getBlock(prizeEvents[0].blockNumber);
          if (block) {
            const date = new Date(Number(block.timestamp) * 1000);
            receiptDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            console.log('  - 수령 일시:', receiptDate);
          }
        } else {
          console.warn('⚠️ PrizesDistributed 이벤트 없음 (아직 지급되지 않았을 수 있음)');
        }

        // 추첨 날짜는 수령 날짜와 동일
        console.log('7️⃣ 추첨 날짜 설정...');
        let drawDate = receiptDate;
        console.log('✅ 추첨 일시:', drawDate);

        console.log('8️⃣ 최종 데이터 설정 중...');
        const finalDetail = {
          drawId,
          tokenId,
          grade: grade || '-',
          prizeAmount: isNaN(prizeAmount) ? 0 : prizeAmount,
          prizeKRW: isNaN(prizeAmount) || isNaN(kaiaPrice) ? 0 : Math.floor(prizeAmount * kaiaPrice),
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
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          gap: '20px',
        }}
      >
        <div>보상 정보를 찾을 수 없습니다</div>
        <button
          onClick={() => router.push('/my')}
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
          돌아가기
        </button>
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
        alignItems: 'center',
        overflow: 'hidden',
        fontFamily: 'SF Pro, Arial, sans-serif',
      }}
    >
      <MobileStatusBar />

      {/* back + 타이틀 */}
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
          수령 상세내역
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div
        style={{
          flex: 1,
          width: '100%',
          marginTop: 'clamp(18px, 4.5vw, 20px)',
          overflowY: 'auto',
          padding: '0 clamp(18px, 4.5vw, 20px)',
          paddingBottom: 'clamp(20px, 5vw, 25px)',
        }}
      >
        {/* 상단 보상 박스 */}
        <div
          style={{
            marginBottom: 'clamp(18px, 4.5vw, 20px)',
            background: 'rgba(195,112,208,0.23)',
            borderRadius: 'clamp(8px, 2vw, 10px)',
            padding: 'clamp(18px, 4.5vw, 20px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p
                style={{
                  fontSize: 'clamp(15px, 3.8vw, 16px)',
                  fontWeight: '700',
                  margin: 0,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  color: '#DED13A',
                }}
              >
                {detail.grade} 상금
              </p>
              <p
                style={{
                  fontSize: 'clamp(11px, 2.8vw, 12px)',
                  margin: 0,
                  color: '#9DFF00',
                }}
              >
                수령완료
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  fontSize: 'clamp(15px, 3.8vw, 16px)',
                  fontWeight: '700',
                  margin: 0,
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  color: '#DED13A',
                }}
              >
                {detail.prizeAmount.toFixed(2)} KAIA
              </p>
              <p
                style={{
                  fontSize: 'clamp(11px, 2.8vw, 12px)',
                  margin: 0,
                }}
              >
                ￦ {detail.prizeKRW.toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>

        {/* 추첨 정보 */}
        <div
          style={{
            marginBottom: 'clamp(18px, 4.5vw, 20px)',
            background: 'rgba(195,112,208,0.15)',
            borderRadius: 'clamp(8px, 2vw, 10px)',
            padding: 'clamp(14px, 3.5vw, 15px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(13px, 3.3vw, 14px)',
              fontWeight: '700',
              margin: 0,
              marginBottom: 'clamp(18px, 4.5vw, 20px)',
            }}
          >
            추첨 정보
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: 'clamp(7px, 1.8vw, 8px)',
              marginBottom: 'clamp(7px, 1.8vw, 8px)',
            }}
          >
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>추첨 회차</span>
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '500' }}>
              {detail.drawId}회차
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>추첨 일자</span>
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '500' }}>
              {detail.drawDate}
            </span>
          </div>
        </div>

        {/* 당첨 번호 */}
        <div
          style={{
            marginBottom: 'clamp(18px, 4.5vw, 20px)',
            background: 'rgba(195,112,208,0.15)',
            borderRadius: 'clamp(8px, 2vw, 10px)',
            padding: 'clamp(14px, 3.5vw, 15px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(13px, 3.3vw, 14px)',
              fontWeight: '700',
              margin: 0,
              marginBottom: 'clamp(18px, 4.5vw, 20px)',
            }}
          >
            당첨 번호
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'clamp(6px, 1.5vw, 8px)',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            {detail.myNumbers.map((num, idx) => {
              const isMatched = detail.winningNumbers.includes(num);
              return (
                <div
                  key={idx}
                  style={{
                    width: 'clamp(38px, 9.5vw, 40px)',
                    height: 'clamp(38px, 9.5vw, 40px)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    background: isMatched
                      ? '#F4CB42'
                      : 'linear-gradient(312deg, #6E0058 0%, #450058 100%)',
                    border: isMatched
                      ? '2px solid #FFC400'
                      : '2px solid rgba(193, 135, 184, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: 'clamp(14px, 3.5vw, 15px)',
                    color: isMatched ? '#222' : 'white',
                  }}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>

        {/* 거래 정보 */}
        <div
          style={{
            marginBottom: 'clamp(18px, 4.5vw, 20px)',
            background: 'rgba(195,112,208,0.15)',
            borderRadius: 'clamp(8px, 2vw, 10px)',
            padding: 'clamp(14px, 3.5vw, 15px)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(13px, 3.3vw, 14px)',
              fontWeight: '700',
              margin: 0,
              marginBottom: 'clamp(18px, 4.5vw, 20px)',
            }}
          >
            거래 정보
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: 'clamp(7px, 1.8vw, 8px)',
              marginBottom: 'clamp(7px, 1.8vw, 8px)',
            }}
          >
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>티켓 ID</span>
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '500' }}>
              #{detail.tokenId}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: 'clamp(7px, 1.8vw, 8px)',
              marginBottom: 'clamp(7px, 1.8vw, 8px)',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>거래 Hash</span>
            {detail.transactionHash ? (
              <a
                href={`https://kairos.kaiascan.io/tx/${detail.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 'clamp(10px, 2.5vw, 11px)',
                  fontWeight: '500',
                  maxWidth: '60%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#9DFF00',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  window.open(`https://kairos.kaiascan.io/tx/${detail.transactionHash}`, '_blank', 'noopener,noreferrer');
                }}
              >
                {detail.transactionHash.slice(0, 10)}...{detail.transactionHash.slice(-8)}
              </a>
            ) : (
              <span
                style={{
                  fontSize: 'clamp(10px, 2.5vw, 11px)',
                  fontWeight: '500',
                }}
              >
                -
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)' }}>수령 일자</span>
            <span style={{ fontSize: 'clamp(12px, 3vw, 13px)', fontWeight: '500' }}>
              {detail.receiptDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
