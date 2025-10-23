'use client';

import { useRouter } from 'next/navigation';

export default function SplashPage() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/wallet')}
      style={{
        width: '100%',
        height: '100vh',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        gap: 'clamp(30px, 5vh, 40px)',
      }}
    >
      {/* 클로버 + 코인 아이콘 */}
      <div
        style={{
          width: 'clamp(150px, 30vw, 200px)',
          height: 'clamp(150px, 30vw, 200px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          fill="none"
          style={{ maxWidth: '200px', maxHeight: '200px' }}
        >
          {/* 클로버 4개 잎 */}
          <circle cx="100" cy="70" r="30" fill="#4A9B8E" />
          <circle cx="70" cy="100" r="30" fill="#4A9B8E" />
          <circle cx="130" cy="100" r="30" fill="#4A9B8E" />
          <circle cx="100" cy="130" r="30" fill="#4A9B8E" />
          
          {/* 코인 링 */}
          <ellipse
            cx="120"
            cy="90"
            rx="20"
            ry="35"
            fill="none"
            stroke="#F4D98B"
            strokeWidth="8"
            transform="rotate(45 120 90)"
          />
          <ellipse
            cx="110"
            cy="110"
            rx="20"
            ry="35"
            fill="none"
            stroke="#F4D98B"
            strokeWidth="8"
            transform="rotate(45 110 110)"
          />
        </svg>
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

      {/* 탭 안내 텍스트 (선택사항) */}
      <div
        style={{
          fontSize: 'clamp(12px, 3vw, 14px)',
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'SF Pro, Arial, sans-serif',
          textAlign: 'center',
          marginTop: 'clamp(20px, 5vh, 40px)',
        }}
      >
        화면을 탭하여 시작
      </div>
    </div>
  );
}

