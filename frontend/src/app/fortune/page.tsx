'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

export default function FortunePage() {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);

  const handleCookieClick = () => {
    setIsOpening(true);
    // 애니메이션 후 페이지 전환
    setTimeout(() => {
      router.push('/fortune/open');
    }, 800);
  };

  return (
    <MobileLayout showBottomNav={false}>
      <div
        style={{
          flex: 1,
          background: '#380D44',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0',
        }}
      >
        {/* 타이틀 - 분홍 원 위쪽 */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 'clamp(50px, 8vh, 70px)',
            marginBottom: 'clamp(30px, 5vh, 40px)',
            zIndex: 10,
            animation: 'fadeInDown 0.8s ease',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(26px, 6.5vw, 34px)',
              fontWeight: '700',
              color: '#FFF',
              marginBottom: 'clamp(10px, 2vh, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
              lineHeight: '1.3',
            }}
          >
            복권을 구매하셨습니다
          </div>
          <div
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.95)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            행운의 메세지를 확인하세요!
          </div>
        </div>

        {/* 배경 원 (펄스 애니메이션) - 타이틀 아래에 위치 */}
        <div
          style={{
            width: 'clamp(450px, 110vw, 580px)',
            height: 'clamp(450px, 110vw, 580px)',
            position: 'absolute',
            top: 'clamp(200px, 32vh, 280px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, #E700B1 25%, #870D6B 100%)',
            borderRadius: '50%',
            zIndex: 0,
            animation: isOpening ? 'none' : 'pulse 3s ease-in-out infinite',
          }}
        />

        {/* 포춘 쿠키 이미지 */}
        <div
          onClick={handleCookieClick}
          style={{
            position: 'relative',
            width: 'clamp(260px, 65vw, 340px)',
            height: 'clamp(285px, 71vw, 374px)',
            cursor: 'pointer',
            zIndex: 10,
            marginTop: 'clamp(60px, 10vh, 80px)',
            transition: 'transform 0.5s ease, opacity 0.5s ease',
            opacity: isOpening ? 0 : 1,
            transform: isOpening ? 'scale(0.9) rotate(10deg)' : 'scale(1)',
            animation: isOpening ? 'none' : 'float 3s ease-in-out infinite',
          }}
        >
          <img
            src="/img/fortunecookie.webp"
            alt="Fortune Cookie"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.35))',
            }}
          />
        </div>

        <style jsx>{`
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%,
            100% {
              transform: translateX(-50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateX(-50%) scale(1.05);
              opacity: 0.9;
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0) scale(1);
            }
            50% {
              transform: translateY(-15px) scale(1.02);
            }
          }
        `}</style>
      </div>
    </MobileLayout>
  );
}
