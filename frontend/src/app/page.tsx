'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import * as lottoAbiModule from '../../lib/lottoAbi.json';
import MobileLayout from '@/components/MobileLayout';

const lottoAbi = (lottoAbiModule as any).default || lottoAbiModule;

const contractAddress = '0x1D8E07AE314204F97611e1469Ee81c64b80b47F1';
const rpcUrl = 'https://public-en-kairos.node.kaia.io';

export default function HomePage() {
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [currentDrawId, setCurrentDrawId] = useState(0);
  const [ticketPrice, setTicketPrice] = useState('0.01');
  const [prizePool, setPrizePool] = useState('0');
  const [accumulatedJackpot, setAccumulatedJackpot] = useState('0');
  const [ticketCount, setTicketCount] = useState(0);

  // 타이머 상태
  const [days, setDays] = useState(2);
  const [hours, setHours] = useState(18);
  const [minutes, setMinutes] = useState(54);
  const [seconds, setSeconds] = useState(13);

  // 컨트랙트 초기화
  useEffect(() => {
    const initContract = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, lottoAbi, provider);
        setContract(contract);

        const currentDraw = await contract.currentDrawId();
        const price = await contract.ticketPrice();
        const pool = await contract.prizePool(currentDraw);
        const jackpot = await contract.accumulatedJackpot();

        // 티켓 수 조회 (이벤트 기반)
        let tickets = 0;
        try {
          const currentBlock = await provider.getBlockNumber();
          // 최근 2000 블록만 조회 (약 1시간 분량)
          const fromBlock = Math.max(0, currentBlock - 2000);
          
          const filter = contract.filters.TicketPurchased();
          const events = await contract.queryFilter(filter, fromBlock, 'latest');
          
          tickets = events.filter((event: any) => 
            Number(event.args.drawId) === Number(currentDraw)
          ).length;
          
          console.log(`✅ 티켓 수 조회 완료: ${tickets}장 (블록 ${fromBlock} ~ ${currentBlock})`);
        } catch (error) {
          console.error('티켓 수 조회 실패 (기본값 0 사용):', error);
          tickets = 0;
        }

        setCurrentDrawId(Number(currentDraw));
        setTicketPrice(ethers.formatEther(price));
        setPrizePool(ethers.formatEther(pool));
        setAccumulatedJackpot(ethers.formatEther(jackpot));
        setTicketCount(tickets);

        console.log('✅ 컨트랙트 데이터 로드 완료');
      } catch (error) {
        console.error('❌ 컨트랙트 연결 실패:', error);
      }
    };

    initContract();
  }, []);

  // 타이머 (더미 - 실제로는 컨트랙트에서 시간 가져와야 함)
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        setMinutes((m) => {
          if (m > 0) return m - 1;
          setHours((h) => {
            if (h > 0) return h - 1;
            setDays((d) => (d > 0 ? d - 1 : 0));
            return 23;
          });
          return 59;
        });
        return 59;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 총 상금 계산
  const totalPrize = (parseFloat(prizePool) + parseFloat(accumulatedJackpot)).toFixed(4);
  const totalPrizeKRW = (parseFloat(totalPrize) * 1430).toFixed(0);

  return (
    <MobileLayout>
      {/* 헤더 */}
      <div
        style={{
          background: 'white',
          padding: 'clamp(12px, 3vw, 15px) clamp(15px, 4vw, 20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 10px)' }}>
          {/* 로고 */}
          <svg width="clamp(30px, 8vw, 40px)" height="clamp(30px, 8vw, 40px)" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="14" r="6" fill="#4A9B8E" />
            <circle cx="14" cy="20" r="6" fill="#4A9B8E" />
            <circle cx="26" cy="20" r="6" fill="#4A9B8E" />
            <circle cx="20" cy="26" r="6" fill="#4A9B8E" />
            <ellipse cx="24" cy="18" rx="4" ry="7" fill="none" stroke="#F4D98B" strokeWidth="2" transform="rotate(45 24 18)" />
            <ellipse cx="22" cy="22" rx="4" ry="7" fill="none" stroke="#F4D98B" strokeWidth="2" transform="rotate(45 22 22)" />
          </svg>
          <span
            style={{
              fontSize: 'clamp(16px, 4vw, 20px)',
              fontWeight: '600',
              color: '#333',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            Luckychain
          </span>
        </div>

        {/* 햄버거 메뉴 (관리자 페이지로 이동) */}
        <div
          onClick={() => router.push('/admin')}
          style={{ cursor: 'pointer', opacity: 0.3 }}
        >
          <svg width="clamp(24px, 6vw, 30px)" height="clamp(24px, 6vw, 30px)" viewBox="0 0 30 30">
            <rect y="7" width="30" height="3" fill="#333" rx="1.5" />
            <rect y="14" width="30" height="3" fill="#333" rx="1.5" />
            <rect y="21" width="30" height="3" fill="#333" rx="1.5" />
          </svg>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div
        style={{
          flex: 1,
          padding: 'clamp(20px, 5vw, 30px) clamp(15px, 4vw, 20px) clamp(120px, 20vh, 150px)',
          overflow: 'auto',
        }}
      >
        {/* 타이틀 */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 5vw, 30px)' }}>
          <h1
            style={{
              fontSize: 'clamp(20px, 5vw, 24px)',
              fontWeight: '700',
              color: 'white',
              marginBottom: 'clamp(15px, 4vw, 20px)',
              lineHeight: '1.4',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            지금 참여하고
            <br />
            당첨의 주인공이 되세요!
          </h1>

          {/* 상금 카드 */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'clamp(15px, 4vw, 20px)',
              padding: 'clamp(20px, 5vw, 25px)',
              marginBottom: 'clamp(8px, 2vw, 10px)',
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                color: 'white',
                marginBottom: 'clamp(12px, 3vw, 15px)',
                fontFamily: 'SF Pro, Arial, sans-serif',
                textAlign: 'center',
              }}
            >
              현재 회차 #{currentDrawId} 총 상금
            </div>

            {/* 총 상금 */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: 'clamp(15px, 4vw, 20px)',
                paddingBottom: 'clamp(12px, 3vw, 15px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(32px, 8vw, 42px)',
                  fontWeight: '700',
                  color: '#93EE00',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                }}
              >
                {totalPrize} KAIA
              </div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                ₩ {parseInt(totalPrizeKRW).toLocaleString()}원
              </div>
            </div>

            {/* 상금 구성 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'clamp(10px, 3vw, 12px)' }}>
              {/* 현재 회차 */}
              <div
                style={{
                  flex: 1,
                  background: 'rgba(147, 238, 0, 0.15)',
                  borderRadius: 'clamp(10px, 3vw, 12px)',
                  padding: 'clamp(10px, 3vw, 12px)',
                  border: '1px solid rgba(147, 238, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(9px, 2.5vw, 11px)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: 'clamp(5px, 1.5vw, 6px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  💰 현재 회차
                </div>
                <div
                  style={{
                    fontSize: 'clamp(14px, 4vw, 16px)',
                    fontWeight: '700',
                    color: '#93EE00',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  {parseFloat(prizePool).toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: 'clamp(8px, 2vw, 9px)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 'clamp(3px, 1vw, 4px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  KAIA
                </div>
              </div>

              {/* 누적 잭팟 */}
              <div
                style={{
                  flex: 1,
                  background: 'rgba(255, 193, 7, 0.15)',
                  borderRadius: 'clamp(10px, 3vw, 12px)',
                  padding: 'clamp(10px, 3vw, 12px)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(9px, 2.5vw, 11px)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: 'clamp(5px, 1.5vw, 6px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  🔥 누적 잭팟
                </div>
                <div
                  style={{
                    fontSize: 'clamp(14px, 4vw, 16px)',
                    fontWeight: '700',
                    color: '#FFC107',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  {parseFloat(accumulatedJackpot).toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: 'clamp(8px, 2vw, 9px)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 'clamp(3px, 1vw, 4px)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                    textAlign: 'center',
                  }}
                >
                  KAIA
                </div>
              </div>
            </div>

            {/* 참여자 수 */}
            {ticketCount > 0 && (
              <div
                style={{
                  marginTop: 'clamp(10px, 3vw, 12px)',
                  textAlign: 'center',
                  fontSize: 'clamp(9px, 2.5vw, 11px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                👥 {ticketCount}명 참여 중
              </div>
            )}
          </div>
        </div>

        {/* 타이머 */}
        <div
          style={{
            background: 'white',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(20px, 5vw, 30px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(8px, 2vw, 10px)',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              color: '#666',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            <span>⏰</span>
            <span>다음 추첨까지</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', gap: 'clamp(8px, 2vw, 10px)' }}>
            {[
              { value: days, label: '일' },
              { value: hours, label: '시간' },
              { value: minutes, label: '분' },
              { value: seconds, label: '초' },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'clamp(6px, 2vw, 8px)',
                }}
              >
                <div
                  style={{
                    background: '#4A4A4A',
                    borderRadius: 'clamp(10px, 3vw, 12px)',
                    padding: 'clamp(12px, 3vw, 15px)',
                    minWidth: 'clamp(50px, 12vw, 60px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(20px, 5vw, 28px)',
                      fontWeight: '700',
                      color: 'white',
                      fontFamily: 'SF Pro, Arial, sans-serif',
                    }}
                  >
                    {String(item.value).padStart(2, '0')}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: '#666',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* KAIA 카드 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            padding: 'clamp(20px, 5vw, 25px)',
            marginBottom: 'clamp(15px, 4vw, 20px)',
            boxShadow: '0 8px 24px rgba(147, 51, 234, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'clamp(15px, 4vw, 20px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 15px)' }}>
              {/* KAIA 아이콘 */}
              <div
                style={{
                  width: 'clamp(40px, 10vw, 50px)',
                  height: 'clamp(40px, 10vw, 50px)',
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700', color: '#FF6B00' }}>K</span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 'clamp(18px, 4.5vw, 22px)',
                    fontWeight: '700',
                    color: 'white',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  KAIA
                </div>
                <div
                  style={{
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontFamily: 'SF Pro, Arial, sans-serif',
                  }}
                >
                  카이아
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 22px)',
                  fontWeight: '700',
                  color: 'white',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                티켓 {ticketPrice} KAIA
              </div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: '#93EE00',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                ₩ {(parseFloat(ticketPrice) * 1430).toFixed(0)}원
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              paddingTop: 'clamp(15px, 4vw, 20px)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: 'clamp(6px, 2vw, 8px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                현재 회차 상금
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 22px)',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {totalPrize} KAIA
              </div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                ₩ {parseInt(totalPrizeKRW).toLocaleString()}원
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: 'clamp(6px, 2vw, 8px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                참여자
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 22px)',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: 'clamp(4px, 1vw, 5px)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                총 {ticketCount}명
              </div>
              <div
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                {ticketCount > 0 ? '🎫 티켓 판매중' : '🎫 첫 참여자가 되세요!'}
              </div>
            </div>
          </div>
        </div>

        {/* 복권 사기 버튼 */}
        <button
          onClick={() => router.push('/buy')}
          style={{
            width: '100%',
            height: 'clamp(55px, 10vh, 70px)',
            background: 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)',
            border: 'none',
            borderRadius: 'clamp(15px, 4vw, 20px)',
            color: 'white',
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: 'SF Pro, Arial, sans-serif',
            boxShadow: '0 6px 20px rgba(147, 238, 0, 0.4)',
            transition: 'all 0.3s ease',
            marginBottom: 'clamp(15px, 4vw, 20px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(147, 238, 0, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(147, 238, 0, 0.4)';
          }}
        >
          🎫 복권 사기
        </button>
      </div>
    </MobileLayout>
  );
}
