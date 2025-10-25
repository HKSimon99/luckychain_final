'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import Image from 'next/image';
import MobileStatusBar from './MobileStatusBar';
import '@/config/appkit'; // AppKit 초기화 보장

interface HeaderProps {
  showMenu?: boolean;
}

export default function Header({ showMenu = true }: HeaderProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const handleWalletClick = () => {
    if (isConnected) {
      setShowWalletMenu(!showWalletMenu);
    } else {
      open();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowWalletMenu(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

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

      {/* 오른쪽: 지갑 + 메뉴 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2.5vw, 15px)' }}>
        {/* 지갑 연결 버튼 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleWalletClick}
            style={{
              padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 12px)',
              background: isConnected ? '#380D44' : '#93EE00',
              color: isConnected ? '#FFF' : '#000',
              border: isConnected ? '1.5px solid #93EE00' : 'none',
              borderRadius: 'clamp(8px, 2vw, 10px)',
              fontSize: 'clamp(11px, 2.8vw, 13px)',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {isConnected ? `🔗 ${formatAddress(address!)}` : '🔗 연결'}
          </button>

          {/* 지갑 메뉴 (연결됨) */}
          {showWalletMenu && isConnected && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#380D44',
                border: '2px solid #93EE00',
                borderRadius: '10px',
                padding: '6px',
                minWidth: '160px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                zIndex: 1000,
              }}
            >
              <button
                onClick={() => { open(); setShowWalletMenu(false); }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#93EE00',
                  border: 'none',
                  borderRadius: '6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#000',
                  marginBottom: '6px',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#A5FF11';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#93EE00';
                }}
              >
                🔄 지갑 변경
              </button>
              <button
                onClick={handleDisconnect}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#FF3B30',
                  border: 'none',
                  borderRadius: '6px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#FFF',
                  fontFamily: 'SF Pro, Arial, sans-serif',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#FF5C50';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#FF3B30';
                }}
              >
                🔌 연결 해제
              </button>
            </div>
          )}
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
    </div>
  );
}

