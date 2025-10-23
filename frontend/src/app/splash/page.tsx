'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function SplashPage() {
  const router = useRouter();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 2초 후 fade out 시작
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // 3초 후 페이지 전환 (fade out 애니메이션 완료 후)
    const navTimer = setTimeout(() => {
      const agreementCompleted = localStorage.getItem('agreementCompleted');
      if (agreementCompleted) {
        router.push('/wallet');
      } else {
        router.push('/agreement');
      }
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

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
        gap: 'clamp(30px, 5vh, 40px)',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 1s ease-out',
      }}
    >
      {/* 로고 이미지 */}
      <div
        style={{
          width: 'clamp(150px, 30vw, 200px)',
          height: 'clamp(150px, 30vw, 200px)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src="/logo.png"
          alt="Luckychain Logo"
          width={200}
          height={200}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          priority
        />
      </div>

      {/* Luckychain 텍스트 */}
      <div
        style={{
          fontSize: 'clamp(36px, 8vw, 48px)',
          fontWeight: '700',
          color: '#4A9B8E',
          fontFamily: 'SF Pro, Arial, sans-serif',
          letterSpacing: '-0.5px',
          textAlign: 'center',
        }}
      >
        Luckychain
      </div>
    </div>
  );
}

