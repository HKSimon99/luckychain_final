'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import MobileLayout from '@/components/MobileLayout';
import { getRandomFortune } from '@/data/fortuneData';

export default function FortuneOpenPage() {
  const router = useRouter();
  const [fortune, setFortune] = useState('');
  const [fortuneParts, setFortuneParts] = useState<{ top: string; bottom: string }>({
    top: '',
    bottom: '',
  });
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // 포춘 메시지 선택
    const selectedFortune = getRandomFortune();
    setFortune(selectedFortune);

    // <br /> 기준으로 분리
    const parts = selectedFortune.split('<br />');
    setFortuneParts({
      top: parts[0] || '',
      bottom: parts[1] || '',
    });

    // Fade in 효과
    setTimeout(() => setFadeIn(true), 100);
  }, []);

  return (
    <MobileLayout showBottomNav={false}>
      <div
        style={{
          flex: 1,
          background: '#380D44',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0',
        }}
      >
        {/* 배경 분홍색 원 */}
        <div
          style={{
            width: 'clamp(550px, 140vw, 750px)',
            height: 'clamp(550px, 140vw, 750px)',
            position: 'absolute',
            top: '70%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, #E700B1 25%, #870D6B 100%)',
            borderRadius: '50%',
            zIndex: 0,
          }}
        />

        {/* 타이틀과 별 장식 */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '12vh',
            zIndex: 10,
          }}
        >
            {/* 왼쪽 별 이미지 */}
            <div
              style={{
                position: 'absolute',
                left: 'calc(50% - clamp(145px, 36vw, 180px))',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 'clamp(50px, 12vw, 70px)',
                height: 'auto',
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 1s ease 0.3s',
                animation: fadeIn ? 'twinkle 2.5s ease-in-out infinite' : 'none',
              }}
            >
              <Image
                src="/img/stars.webp"
                alt="Stars"
                width={70}
                height={70}
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                }}
                priority
              />
            </div>

            {/* 타이틀 */}
            <div
              style={{
                textAlign: 'center',
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 0.8s ease',
                animation: fadeIn ? 'fadeInDown 0.8s ease' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(18px, 4.5vw, 22px)',
                  fontWeight: '700',
                  color: '#FFF',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
              >
                포춘 쿠키가 열렸습니다!
              </div>
            </div>

            {/* 오른쪽 별 이미지 (좌우 반전된 파일 사용) */}
            <div
              style={{
                position: 'absolute',
                right: 'calc(50% - clamp(145px, 36vw, 180px))',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 'clamp(50px, 12vw, 70px)',
                height: 'auto',
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 1s ease 0.5s',
                animation: fadeIn ? 'twinkle 2.5s ease-in-out infinite 0.3s' : 'none',
              }}
            >
              <Image
                src="/img/starsr.webp"
                alt="Stars"
                width={70}
                height={70}
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                }}
                priority
              />
            </div>
          </div>

        {/* 포춘 메시지 박스 - 타이틀 아래 11vh, 높이 18vh */}
        <div
          style={{
            width: '88vw',
            height: '14vh',
            background: '#EFEFEF',
            boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.35)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '22vh',
            opacity: fadeIn ? 1 : 0,
            transform: `scale(${fadeIn ? 1 : 0.9})`,
            transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
            zIndex: 10,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: '#430303',
              fontSize: 'clamp(16px, 4.2vw, 20px)',
              fontWeight: '700',
              lineHeight: '1.5',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            {fortuneParts.top}
          </div>
        </div>

        {/* 서브 텍스트 - 메시지 박스 아래 2-3vh */}
        <div
          style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.95)',
            fontSize: 'clamp(12px, 3vw, 14px)',
            fontWeight: '500',
            fontFamily: 'SF Pro, Arial, sans-serif',
            marginTop: '2.5vh',
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 0.8s ease 0.5s',
            zIndex: 10,
          }}
        >
          - {fortuneParts.bottom} -
        </div>

        {/* 쿠키 이미지 - 서브 텍스트 아래 8vh (조금 위로) */}
        <div
          style={{
            width: '100%',
            height: '21vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '2vh',
            zIndex: 5,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '62vw',
              height: '62vw',
              maxWidth: '250px',
              maxHeight: '250px',
              opacity: fadeIn ? 1 : 0,
              transform: `rotate(21deg) scale(${fadeIn ? 1 : 0.8})`,
              transition: 'opacity 1s ease 0.5s, transform 1s ease 0.5s',
              animation: fadeIn ? 'float 3s ease-in-out infinite 1s' : 'none',
            }}
          >
            <img
              src="/img/fortuneopen.webp"
              alt="Opened Fortune Cookie"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.35))',
              }}
            />
          </div>
        </div>

        {/* 하단 버튼 - 쿠키 이미지 아래 11vh, 하단에서 4.5vh */}
        <div
          style={{
            position: 'absolute',
            bottom: '4.5vh',
            left: '0',
            right: '0',
            width: '100%',
            display: 'flex',
            gap: '4.5vw',
            padding: '0 4.5vw',
            zIndex: 10,
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 0.8s ease 0.8s',
            animation: fadeIn ? 'fadeInUp 0.8s ease 0.8s' : 'none',
          }}
        >
          {/* 새로운 복권 구매 */}
          <button
            onClick={() => router.push('/buy')}
            style={{
              flex: 1,
              height: '7.5vh',
              background: '#380D44',
              color: '#FFF',
              fontSize: 'clamp(13px, 3.3vw, 15px)',
              fontWeight: '500',
              border: '0.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.3s ease',
            }}

            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            새로운 복권 구매
          </button>

          {/* 내 복권 확인하기 */}
          <button
            onClick={() => router.push('/my-tickets')}
            style={{
              flex: 1,
              height: '7.5vh',
              background: 'linear-gradient(135deg, #DF78EC 0%, #FF20A2 100%)',
              color: '#FFF',
              fontSize: 'clamp(13px, 3.3vw, 15px)',
              fontWeight: '500',
              border: '0.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.35)',
              transition: 'all 0.3s ease',
            }}

            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            내 복권 확인하기
          </button>
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

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%,
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.05);
              opacity: 0.9;
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: rotate(21deg) translateY(0) scale(1);
            }
            50% {
              transform: rotate(21deg) translateY(-12px) scale(1.03);
            }
          }

          @keyframes twinkle {
            0%,
            100% {
              opacity: 1;
              transform: translateY(-50%) scale(1);
            }
            50% {
              opacity: 0.7;
              transform: translateY(-50%) scale(0.95);
            }
          }
        `}</style>
      </div>
    </MobileLayout>
  );
}
