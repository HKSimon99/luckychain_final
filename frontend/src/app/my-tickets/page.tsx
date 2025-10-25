'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import Image from 'next/image';
import MobileStatusBar from '@/components/MobileStatusBar';
import * as lottoAbiModule from '@/lib/lotto-abi-full.json';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;
const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

interface Ticket {
  tokenId: number;
  drawId: number;
  numbers: number[];
  purchaseTime: number;
  drawEndTime: number;
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 내 티켓 로드
  useEffect(() => {
    const loadMyTickets = async () => {
      if (!isConnected || !address) {
        console.log('❌ 지갑이 연결되지 않음');
        setIsLoading(false);
        return;
      }

      console.log('🔍 티켓 조회 시작:', address);

      // 최근 구매한 트랜잭션 해시 확인
      const recentTxHash = sessionStorage.getItem('recentPurchaseTxHash');
      console.log('💾 저장된 트랜잭션 해시:', recentTxHash);

      try {
        // BrowserProvider 사용 (CORS 우회)
        if (!window.ethereum) {
          throw new Error('MetaMask이 설치되지 않았습니다.');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);

        console.log('📡 컨트랙트 연결됨:', contractAddress);

        // TicketPurchased 이벤트로 내 티켓 조회 (최근 100,000 블록)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000);
        
        const filter = contract.filters.TicketPurchased(address);
        console.log('🔎 이벤트 필터:', filter);
        console.log(`📊 블록 범위: ${fromBlock} ~ ${currentBlock}`);

        const events = await contract.queryFilter(filter, fromBlock, 'latest');
        console.log(`📊 발견된 이벤트: ${events.length}개`);

        const tickets: Ticket[] = [];
        
        for (const event of events) {
          try {
            const eventData = event as any;
            
            // 최근 구매 트랜잭션만 필터링
            if (recentTxHash && eventData.transactionHash !== recentTxHash) {
              console.log(`⏭️ 스킵: 다른 트랜잭션 (${eventData.transactionHash.slice(0, 10)}...)`);
              continue;
            }
            
            // 이벤트 데이터 구조 확인
            console.log('📦 이벤트 원본:', {
              txHash: eventData.transactionHash,
              args: eventData.args,
              topics: eventData.topics,
              data: eventData.data,
            });

            // args가 배열인 경우와 객체인 경우 모두 처리
            let tokenId: number;
            let drawId: number;
            
            if (Array.isArray(eventData.args)) {
              // args가 배열인 경우 [buyer, tokenId, drawId, numbers]
              tokenId = Number(eventData.args[1]);
              drawId = Number(eventData.args[2]);
            } else {
              // args가 객체인 경우
              tokenId = Number(eventData.args.tokenId || eventData.args[1]);
              drawId = Number(eventData.args.drawId || eventData.args[2]);
            }

            console.log(`🎫 티켓 #${tokenId} (회차: ${drawId}) 처리 중...`);

            // 소유권 확인
            try {
              const owner = await contract.ownerOf(tokenId);
              console.log(`  소유자: ${owner}`);
              if (owner.toLowerCase() !== address.toLowerCase()) {
                console.log(`  ⚠️ 다른 소유자의 티켓 - 스킵`);
                continue;
              }
            } catch (e) {
              console.log(`  ⚠️ 소유권 확인 실패 - 스킵`);
              continue;
            }

            // 번호 조회 - 이벤트 데이터에서 직접 가져오기
            let numbers: number[] = [];
            if (Array.isArray(eventData.args.numbers)) {
              numbers = eventData.args.numbers.map((n: any) => Number(n));
            } else if (eventData.args[3]) {
              // args[3]이 numbers 배열
              numbers = Array.from(eventData.args[3] as any).map((n: any) => Number(n));
            }
            console.log(`  번호: [${numbers.join(', ')}]`);

            // 블록 타임스탬프
            const block = await provider.getBlock(eventData.blockNumber);
            const purchaseTime = block ? block.timestamp : 0;

            // Draw 정보
            const draw = await contract.draws(drawId);
            const drawEndTime = Number(draw.endTime);

            tickets.push({
              tokenId,
              drawId,
              numbers,
              purchaseTime: Number(purchaseTime),
              drawEndTime,
            });

            console.log(`  ✅ 티켓 #${tokenId} 추가됨`);
          } catch (error) {
            console.error(`  ❌ 티켓 처리 실패:`, error);
          }
        }

        tickets.sort((a, b) => b.tokenId - a.tokenId);
        console.log(`🎉 총 ${tickets.length}개 티켓 로드 완료`);
        setMyTickets(tickets);
        
        // 티켓 표시 완료 후 세션 스토리지 클리어 (재방문 시 전체 보기)
        // 주석 처리: 사용자가 다시 방문할 때도 최근 구매만 보고 싶을 수 있음
        // if (recentTxHash) {
        //   sessionStorage.removeItem('recentPurchaseTxHash');
        //   console.log('🧹 트랜잭션 해시 클리어됨');
        // }
      } catch (error) {
        console.error('❌ 티켓 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMyTickets();
  }, [address, isConnected]);

  const prevTicket = () => {
    setCurrentTicketIndex((prev) => (prev > 0 ? prev - 1 : myTickets.length - 1));
  };

  const nextTicket = () => {
    setCurrentTicketIndex((prev) => (prev < myTickets.length - 1 ? prev + 1 : 0));
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}  ${hours}:${minutes}:${seconds}`;
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
          fontSize: '16px',
        }}
      >
        로딩 중...
      </div>
    );
  }

  if (myTickets.length === 0) {
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
        <div style={{ fontSize: '20px', marginBottom: '20px' }}>🎫</div>
        <div style={{ fontSize: '16px', marginBottom: '30px' }}>보유한 복권이 없습니다</div>
        <button
          onClick={() => router.push('/buy')}
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
          복권 구매하러 가기
        </button>
      </div>
    );
  }

  const currentTicket = myTickets[currentTicketIndex];
  const isSingleTicket = myTickets.length === 1;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        position: 'relative',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        paddingBottom: '15px',
      }}
    >
      {/* 상단 상태바 */}
      <MobileStatusBar />

      {/* 제목 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 'clamp(15px, 3.8vw, 20px)',
          color: 'white',
          fontSize: 'clamp(18px, 4.5vw, 22px)',
          fontFamily: 'SF Pro, Arial, sans-serif',
          fontWeight: 700,
          textAlign: 'center',
          paddingLeft: '5vw',
          paddingRight: '5vw',
        }}
      >
        구매한 복권을 확인하세요!
      </div>

      {/* 티켓 선택 컨트롤 (여러 개일 때만 - myfortunecon) */}
      {!isSingleTicket && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(100px, 25vw, 140px)',
            marginTop: 'clamp(12px, 3vw, 15px)',
            marginBottom: 'clamp(12px, 3vw, 15px)',
          }}
        >
          <button
            onClick={prevTicket}
            style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              border: '1px solid #fff',
              color: '#fff',
              background: 'transparent',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
            }}
          >
            &lt;
          </button>

          <div
            style={{
              color: 'white',
              fontSize: 'clamp(10px, 2.5vw, 11px)',
              fontWeight: 500,
              minWidth: '40px',
              textAlign: 'center',
            }}
          >
            {currentTicketIndex + 1} / {myTickets.length}
          </div>

          <button
            onClick={nextTicket}
            style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              border: '1px solid #fff',
              color: '#fff',
              background: 'transparent',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
            }}
          >
            &gt;
          </button>
        </div>
      )}

      {/* 번호 박스 - 넓게 (스크린샷처럼 7개 배치) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(10px, 2.5vw, 12px)',
          alignItems: 'center',
          marginTop: 'clamp(15px, 3.8vw, 18px)',
          paddingLeft: '5vw',
          paddingRight: '5vw',
        }}
      >
        {/* 위줄 3개 */}
        <div style={{ display: 'flex', gap: 'clamp(10px, 2.5vw, 12px)', justifyContent: 'center', width: '100%' }}>
          {currentTicket.numbers.slice(0, 3).map((num, idx) => (
            <div
              key={idx}
              style={{
                width: 'clamp(65px, 18vw, 80px)',
                height: 'clamp(65px, 18vw, 80px)',
                background: 'linear-gradient(312deg, #6E0058 0%, #450058 64%)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '3px solid #B084B5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 'clamp(26px, 6.5vw, 30px)',
                color: '#FFFFFF',
              }}
            >
              {num}
            </div>
          ))}
        </div>

        {/* 아래줄 4개 (총 7개 - 스크린샷처럼) */}
        <div style={{ display: 'flex', gap: 'clamp(10px, 2.5vw, 12px)', justifyContent: 'center', width: '100%' }}>
          {currentTicket.numbers.slice(3, 7).map((num, idx) => (
            <div
              key={idx}
              style={{
                width: 'clamp(65px, 18vw, 80px)',
                height: 'clamp(65px, 18vw, 80px)',
                background: 'linear-gradient(312deg, #6E0058 0%, #450058 64%)',
                borderRadius: 'clamp(8px, 2vw, 10px)',
                border: '3px solid #B084B5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 'clamp(26px, 6.5vw, 30px)',
                color: '#ffffff',
              }}
            >
              {num}
            </div>
          ))}
        </div>

        {/* 티켓 정보 박스 - 넓게 */}
        <div
          style={{
            width: '90vw',
            maxWidth: '500px',
            borderRadius: '10px',
            background: 'linear-gradient(312deg, #895283 0%, #794885 64%)',
            padding: 'clamp(15px, 3.8vw, 18px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 'clamp(15px, 3.8vw, 18px)',
            color: 'white',
            fontFamily: 'SF Pro, Arial, sans-serif',
          }}
        >
          <div style={{ fontSize: 'clamp(8px, 2vw, 9px)', fontWeight: 400 }}>티켓 번호</div>
          <div style={{ fontSize: 'clamp(13px, 3.3vw, 14px)', fontWeight: 600, letterSpacing: '2px' }}>
            #{currentTicket.tokenId}
          </div>

          <div style={{ marginTop: '12px', fontSize: 'clamp(8px, 2vw, 9px)', fontWeight: 400 }}>
            구매 일시
          </div>
          <div style={{ fontSize: 'clamp(13px, 3.3vw, 14px)', fontWeight: 600, letterSpacing: '1px' }}>
            {formatDate(currentTicket.purchaseTime)}
          </div>

          <div style={{ marginTop: '12px', fontSize: 'clamp(8px, 2vw, 9px)', fontWeight: 400 }}>
            추첨 일시
          </div>
          <div style={{ fontSize: 'clamp(13px, 3.3vw, 14px)', fontWeight: 600, letterSpacing: '1px' }}>
            {formatDate(currentTicket.drawEndTime)}
          </div>
        </div>

        {/* 블록체인 기록 안내 - 넓게 */}
        <div
          style={{
            width: '90vw',
            maxWidth: '500px',
            background: '#603D69',
            borderRadius: '10px',
            padding: 'clamp(12px, 3vw, 15px)',
            marginTop: 'clamp(10px, 2.5vw, 12px)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            fontFamily: 'SF Pro, Arial, sans-serif',
            border: '0.1px solid rgba(255,255,255,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>🔗</span>
            <div style={{ fontSize: 'clamp(14px, 3.5vw, 15px)', fontWeight: 600 }}>
              블록체인 기록 완료
            </div>
          </div>

          <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', lineHeight: '1.7', paddingLeft: '3px' }}>
            이 복권은 블록체인에 영구적으로 기록되었습니다.
            <br />
            누구도 조작할 수 없는 투명한 추첨이 보장됩니다.
          </div>
        </div>

        {/* 홈으로 가기 버튼 - 넓게 */}
        <button
          onClick={() => router.push('/')}
          style={{
            width: '90vw',
            maxWidth: '500px',
            padding: 'clamp(12px, 3vw, 14px) 0',
            marginTop: 'clamp(12px, 3vw, 15px)',
            marginBottom: 'clamp(15px, 3.8vw, 18px)',
            background: '#BDDF28',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: 'clamp(15px, 3.8vw, 16px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontFamily: 'SF Pro, Arial, sans-serif',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
        >
          {/* 홈 아이콘 SVG */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: 'clamp(18px, 4.5vw, 20px)',
              height: 'auto',
            }}
          >
            <path
              d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M9 22V12H15V22"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          홈으로 가기
        </button>
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}  ${hours}:${minutes}:${seconds}`;
}

