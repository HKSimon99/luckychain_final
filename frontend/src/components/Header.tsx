'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MobileStatusBar from './MobileStatusBar';

interface HeaderProps {
  showMenu?: boolean;
}

export default function Header({ showMenu = true }: HeaderProps) {
  const router = useRouter();

  return (
    <div
      style={{
        background: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* 모바일 상태바 */}
      <MobileStatusBar />

      {/* 메인 헤더 */}
      <div
        style={{
          padding: 'clamp(10px, 2.5vw, 12px) clamp(15px, 4vw, 18px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #380D44',
        }}
      >
      {/* 로고 */}
      <div
        onClick={() => router.push('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 2vw, 10px)',
          cursor: 'pointer',
        }}
      >
        <div style={{ width: 'clamp(32px, 8vw, 37px)', height: 'clamp(32px, 8vw, 37px)', position: 'relative' }}>
          <Image
            src="/logo.png"
            alt="Luckychain Logo"
            width={37}
            height={37}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            priority
          />
        </div>
        <span
          style={{
            fontSize: 'clamp(13px, 3.5vw, 15px)',
            fontWeight: '200',
            color: '#000',
            fontFamily: 'SF Pro, Arial, sans-serif',
            letterSpacing: '-0.5px',
          }}
        >
          Luckychain
        </span>
      </div>

      {/* 햄버거 메뉴 */}
      {showMenu && (
        <div
          onClick={() => router.push('/admin')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(4px, 1vw, 5px)',
          }}
        >
          <div style={{ width: 'clamp(20px, 5vw, 24px)', height: '2px', background: '#1E293B', borderRadius: '2px' }} />
          <div style={{ width: 'clamp(20px, 5vw, 24px)', height: '2px', background: '#1E293B', borderRadius: '2px' }} />
          <div style={{ width: 'clamp(20px, 5vw, 24px)', height: '2px', background: '#1E293B', borderRadius: '2px' }} />
        </div>
      )}
      </div>
    </div>
  );
}

