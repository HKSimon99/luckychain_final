'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function RewardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { address, isConnected } = useAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { kaiaPrice } = useKaiaPrice();
  
  const [detail, setDetail] = useState<RewardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      if (!isConnected || !address || !params.id) {
        setIsLoading(false);
        return;
      }

      if (!walletProvider) {
        console.log('⏳ 지갑 프로바이더 대기 중...');
        return;
      }

      try {
        // ID 파싱 (형식: "drawId-tokenId")
        const [drawIdStr, tokenIdStr] = (params.id as string).split('-');
        const drawId = parseInt(drawIdStr);
        const tokenId = parseInt(tokenIdStr);

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        // 당첨 번호 조회
        const winningNums: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.winningNumbers(drawId, i);
          winningNums.push(Number(num));
        }
        winningNums.sort((a, b) => a - b);

        // 내 번호 조회
        const myNums: number[] = [];
        for (let i = 0; i < 6; i++) {
          const num = await contract.ticketNumbers(tokenId, i);
          myNums.push(Number(num));
        }

        // 일치 개수 확인
        const matchCount = myNums.filter(n => winningNums.includes(n)).length;

        // 상금 정보 조회
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2000000);
        
        const prizeFilter = contract.filters.PrizesDistributed(drawId);
        const prizeEvents = await contract.queryFilter(prizeFilter, fromBlock, 'latest');

        let grade = '';
        let prizeAmount = 0;

        if (prizeEvents.length > 0) {
          const prizeEvent = prizeEvents[0] as any;
          const firstPrize = Number(ethers.formatEther(prizeEvent.args.firstPrize || 0));
          const secondPrize = Number(ethers.formatEther(prizeEvent.args.secondPrize || 0));
          const thirdPrize = Number(ethers.formatEther(prizeEvent.args.thirdPrize || 0));

          if (matchCount === 6) {
            grade = '1등';
            prizeAmount = firstPrize;
          } else if (matchCount === 5) {
            grade = '2등';
            prizeAmount = secondPrize;
          } else if (matchCount === 4) {
            grade = '3등';
            prizeAmount = thirdPrize;
          }
        }

        // 추첨 일자 (회차의 drawTimestamp)
        const draw = await contract.draws(drawId);
        const drawTimestamp = Number(draw.drawTimestamp || draw[0] || 0);
        const drawDate = drawTimestamp > 0 
          ? new Date(drawTimestamp * 1000)
          : new Date();
        const formattedDrawDate = `${drawDate.getFullYear()}.${String(drawDate.getMonth() + 1).padStart(2, '0')}.${String(drawDate.getDate()).padStart(2, '0')}`;

        // 구매(수령) 일자 - 티켓 구매 이벤트의 블록 타임스탬프
        const ticketFilter = contract.filters.TicketPurchased(address, tokenId, drawId);
        const ticketEvents = await contract.queryFilter(ticketFilter, fromBlock, 'latest');
        
        let receiptDate = formattedDrawDate;
        let txHash = '';
        
        if (ticketEvents.length > 0) {
          const ticketEvent = ticketEvents[0] as any;
          txHash = ticketEvent.transactionHash || '';
          
          const block = await provider.getBlock(ticketEvent.blockNumber);
          if (block) {
            const purchaseDate = new Date(Number(block.timestamp) * 1000);
            receiptDate = `${purchaseDate.getFullYear()}.${String(purchaseDate.getMonth() + 1).padStart(2, '0')}.${String(purchaseDate.getDate()).padStart(2, '0')}`;
          }
        }

        setDetail({
          drawId,
          tokenId,
          grade,
          prizeAmount,
          prizeKRW: Math.floor(prizeAmount * kaiaPrice),
          drawDate: formattedDrawDate,
          receiptDate,
          winningNumbers: winningNums,
          myNumbers: myNums,
          transactionHash: txHash,
        });

      } catch (error) {
        console.error('보상 상세 정보 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [params.id, address, isConnected, walletProvider, kaiaPrice]);

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

  if (isLoading || !detail) {
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

