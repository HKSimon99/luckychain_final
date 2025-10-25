'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Image from 'next/image';
import * as lottoAbiModule from '@/lib/lottoAbi.json';
import MobileLayout from '@/components/MobileLayout';
import Header from '@/components/Header';
import { useKaiaPrice, useKaiaToKRW } from '@/contexts/KaiaPriceContext';

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
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // 타이머 상태
  const [days, setDays] = useState(2);
  const [hours, setHours] = useState(18);
  const [minutes, setMinutes] = useState(54);
  const [seconds, setSeconds] = useState(13);

  // 앱 시작 시 항상 스플래시 화면 표시
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (!hasSeenSplash) {
      sessionStorage.setItem('hasSeenSplash', 'true');
      router.push('/splash');
    } else {
      setIsFirstVisit(false);
    }
  }, [router]);

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
          
          tickets = events.filter((event: any) => {
            return Number(event.args?.drawId) === Number(currentDraw);
          }).length;
        } catch (e) {
          console.log('티켓 수 조회 실패 (이벤트):', e);
      }
      
      setCurrentDrawId(Number(currentDraw));
      setTicketPrice(ethers.formatEther(price));
      setPrizePool(ethers.formatEther(pool));
      setAccumulatedJackpot(ethers.formatEther(jackpot));
        setTicketCount(tickets);
    } catch (error) {
        console.error('초기화 실패:', error);
      }
    };

    initContract();
  }, []);

  // 타이머 카운트다운
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev > 0) return prev - 1;
        setMinutes((min) => {
          if (min > 0) return min - 1;
          setHours((hr) => {
            if (hr > 0) return hr - 1;
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

  // KAIA 실시간 가격 및 24시간 변동률 가져오기
  const { kaiaPrice, change24h } = useKaiaPrice();
  
  // 총 상금 계산 (prizePool + accumulatedJackpot)
  const totalPrize = (parseFloat(prizePool) + parseFloat(accumulatedJackpot)).toFixed(0);
  const totalPrizeKRW = (parseFloat(totalPrize) * kaiaPrice).toLocaleString('ko-KR');

  // 현재 회차 금액 (이월 금액 제외, prizePool만)
  const currentDrawPrize = parseFloat(prizePool).toFixed(2);

  // 첫 방문 시 리디렉션 중이면 아무것도 렌더링하지 않음
  if (isFirstVisit) {
    return null;
  }

  return (
    <MobileLayout>
      <Header />

      {/* 메인 콘텐츠 */}
      <div
        style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          bottom: '85px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}
      >
        {/* 타이머 카드 */}
        <div
          style={{
            padding: '0 3vw',
            marginTop: '3.5vh',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '2vw',
              padding: '1.8vh 3vw',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {/* 타이틀 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2vw', marginBottom: '2vh' }}>
              <svg width="clamp(20px, 5vw, 24px)" height="clamp(20px, 5vw, 24px)" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#5E5E5E" strokeWidth="2" />
                <path d="M12 7V12L15 14" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#000', fontWeight: '500', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                다음 추첨까지
                  </span>
            </div>

            {/* 타이머 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2vw' }}>
              {/* 일 */}
              <div style={{ flex: 1, maxWidth: '16vw' }}>
                <div
                  style={{
                    background: '#414141',
                    borderRadius: '1.5vw',
                    padding: '2.5vh 2vw',
                    textAlign: 'center',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif', lineHeight: '1' }}>
                    {days}
                  </div>
                </div>
                <div style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#000', textAlign: 'center', marginTop: '1vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  일
              </div>
            </div>

              {/* 구분자 : */}
              <div style={{ fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: '700', color: '#000', paddingBottom: '2.5vh' }}>
                :
                </div>
                
              {/* 시간 */}
              <div style={{ flex: 1, maxWidth: '16vw' }}>
                <div
                  style={{
                    background: '#414141',
                    borderRadius: '1.5vw',
                    padding: '2.5vh 2vw',
                    textAlign: 'center',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif', lineHeight: '1' }}>
                    {hours}
                  </div>
              </div>
                <div style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#000', textAlign: 'center', marginTop: '1vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  시간
                </div>
                      </div>
                      
              {/* 구분자 : */}
              <div style={{ fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: '700', color: '#000', paddingBottom: '2.5vh' }}>
                :
                        </div>

              {/* 분 */}
              <div style={{ flex: 1, maxWidth: '16vw' }}>
                <div
                  style={{
                    background: '#414141',
                    borderRadius: '1.5vw',
                    padding: '2.5vh 2vw',
                    textAlign: 'center',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif', lineHeight: '1' }}>
                    {minutes}
                              </div>
                            </div>
                <div style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#000', textAlign: 'center', marginTop: '1vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  분
                              </div>
            </div>

              {/* 구분자 : */}
              <div style={{ fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: '700', color: '#000', paddingBottom: '2.5vh' }}>
                :
              </div>
              
              {/* 초 */}
              <div style={{ flex: 1, maxWidth: '16vw' }}>
                <div
                  style={{
                    background: '#414141',
                    borderRadius: '1.5vw',
                    padding: '2.5vh 2vw',
                    textAlign: 'center',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif', lineHeight: '1' }}>
                    {seconds}
                  </div>
                  </div>
                <div style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#000', textAlign: 'center', marginTop: '1vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  초
                  </div>
                </div>
              </div>
                </div>
            </div>

        {/* 누적 상금 카드 */}
        <div
          style={{
            padding: '0 3vw',
            marginTop: '1vh',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #6B0F70 0%, #4A0E68 100%)',
              borderRadius: '2vw',
              padding: '2.3vh 3vw',
              border: '0.5px solid rgba(255, 255, 255, 0.3)',
              textAlign: 'center',
            }}
          >
            {/* 타이틀 */}
            <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: '700', color: '#FFF', marginBottom: '1.5vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
            {currentDrawId}회차 누적 상금
              </div>

            {/* 메인 금액 */}
            <div style={{ marginBottom: '1vh' }}>
              <div style={{ fontSize: 'clamp(28px, 7vw, 36px)', fontWeight: '700', color: '#93EE00', letterSpacing: '0.02em', fontFamily: 'SF Pro, Arial, sans-serif', lineHeight: '1.2' }}>
                {parseInt(totalPrize).toLocaleString()} KAIA
              </div>
            </div>

            {/* 원화 */}
            <div style={{ fontSize: 'clamp(14px, 3.5vw, 18px)', fontWeight: '600', color: '#FFD700', marginBottom: '1.8vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
              ₩{totalPrizeKRW}
              </div>

            {/* 하단 정보 */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2vw' }}>
              <div style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                참여자
                      </div>
              <div style={{ width: '1px', height: '1vh', background: '#FFF' }} />
              <div style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#FFF', fontWeight: '600', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                총 {ticketCount}명
                  </div>
                </div>
            </div>
                    </div>

        {/* KAIA 카드 */}
        <div
          style={{
            padding: '0 3vw',
            marginTop: '1vh',
            marginBottom: '1.5vh',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(292deg, #6E0058 6.55%, #450058 65.52%)',
              borderRadius: '2vw',
              padding: '2vh 3vw',
              border: '0.5px solid #FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5vh' }}>
              {/* 왼쪽: 코인 아이콘 + 이름 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
                <div style={{ width: '10vw', height: '10vw', position: 'relative' }}>
                  <Image
                    src="/coin-icon.png"
                    alt="KAIA"
                    width={57}
                    height={57}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                  <div style={{ fontSize: 'clamp(13px, 3.3vw, 15px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                    KAIA
                    </div>
                  <div style={{ fontSize: 'clamp(8px, 2vw, 9px)', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif', marginTop: 'clamp(2px, 0.5vw, 3px)' }}>
                    카이아
                  </div>
                </div>
                  </div>
                  
              {/* 오른쪽: 가격 정보 */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'clamp(13px, 3.3vw, 15px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  {ticketPrice} KAIA
                </div>
                <div style={{ fontSize: 'clamp(9px, 2.3vw, 10px)', color: '#E0E0E0', marginTop: '0.3vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  ≈ {(parseFloat(ticketPrice) * kaiaPrice).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원
                </div>
                <div 
                  style={{ 
                    fontSize: 'clamp(9px, 2.2vw, 10px)', 
                    fontWeight: '600', 
                    color: change24h > 0 ? '#34D055' : change24h < 0 ? '#FF3B30' : '#8E8E93',
                    marginTop: '0.3vh', 
                    fontFamily: 'SF Pro, Arial, sans-serif' 
                  }}
                >
                  24시간 {change24h > 0 ? '▲' : change24h < 0 ? '▼' : '—'} {change24h > 0 ? '+' : ''}{change24h.toFixed(2)}%
                </div>
              </div>
                </div>

            <div style={{ height: '0.3px', background: '#FFF', marginBottom: '1.5vh' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: '#FFF', marginBottom: '1vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  현재 회차 금액
                    </div>
                <div style={{ fontSize: 'clamp(13px, 3.3vw, 15px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  {currentDrawPrize} KAIA
                      </div>
                    </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: '#FFF', marginBottom: '1vh', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  이월된 금액
                  </div>
                <div style={{ fontSize: 'clamp(13px, 3.3vw, 15px)', fontWeight: '700', color: '#FFF', fontFamily: 'SF Pro, Arial, sans-serif' }}>
                  {parseFloat(accumulatedJackpot).toFixed(2)} KAIA
                </div>
              </div>
          </div>
            </div>
          </div>
      </div>
    </MobileLayout>
  );
}
