'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

// useAppKit을 사용하는 컴포넌트를 dynamic import (SSR 제외)
const WalletConnectContent = dynamic(
  () => import('./WalletConnectContent'),
  { 
    ssr: false, 
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '100vh',
          background: '#380D44',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 'clamp(120px, 25vw, 150px)',
            height: 'clamp(120px, 25vw, 150px)',
            position: 'relative',
            marginBottom: 'clamp(30px, 7vw, 50px)',
          }}
        >
          <Image
            src="/logo.png"
            alt="Luckychain Logo"
            width={150}
            height={150}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            priority
          />
        </div>
        <div style={{ fontSize: '16px', color: 'white' }}>로딩 중...</div>
      </div>
    )
  }
);

export default function WalletConnectPage() {
  return <WalletConnectContent />;
}
