'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import Image from 'next/image';

export default function WalletConnectPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  
  const { address, isConnected, chain } = useAccount();
  const { open } = useAppKit();
  const { switchChain } = useSwitchChain();

  // 약관 동의 체크
  useEffect(() => {
    const agreementCompleted = localStorage.getItem('agreementCompleted');
    if (!agreementCompleted) {
      router.push('/agreement');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  // 연결 완료 및 체인 확인
  useEffect(() => {
    if (isConnected && address) {
      console.log('✅ 지갑 연결됨:', address);
      console.log('🔗 현재 체인:', chain?.id);
      
      // Kaia Kairos (chainId: 1001) 확인
      if (chain && chain.id !== 1001) {
        console.log('⚠️  잘못된 네트워크. Kaia Kairos로 전환 요청...');
        try {
          switchChain?.({ chainId: 1001 });
        } catch (error) {
          console.error('네트워크 전환 실패:', error);
        }
      } else {
        // 올바른 네트워크에 연결됨
        console.log('🎉 지갑 연결 완료! 홈으로 이동...');
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    }
  }, [isConnected, address, chain, router, switchChain]);

  const connectWallet = async () => {
    try {
      await open();
    } catch (error) {
      console.error('❌ 지갑 연결 실패:', error);
    }
  };

  const rejectWallet = () => {
    router.push('/splash');
  };

  if (isChecking) {
    return null;
  }

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
        padding: 'clamp(20px, 5vw, 30px)',
      }}
    >
      {/* 로고 */}
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

      {/* 타이틀 */}
      <div
        style={{
          fontSize: 'clamp(24px, 6vw, 32px)',
          fontWeight: '700',
          color: '#FFF',
          marginBottom: 'clamp(15px, 4vw, 20px)',
          textAlign: 'center',
          fontFamily: 'SF Pro, Arial, sans-serif',
        }}
      >
        지갑 연결
      </div>

      {/* 설명 */}
      <div
        style={{
          fontSize: 'clamp(14px, 3.5vw, 16px)',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: 'clamp(40px, 8vw, 60px)',
          textAlign: 'center',
          lineHeight: '1.6',
          fontFamily: 'SF Pro, Arial, sans-serif',
          maxWidth: '400px',
        }}
      >
        {isConnected ? (
          <>
            지갑이 연결되었습니다!
            <br />
            잠시 후 홈으로 이동합니다...
          </>
        ) : (
          <>
            Luckychain을 이용하려면
            <br />
            지갑을 연결해야 합니다
          </>
        )}
      </div>

      {!isConnected && (
        <>
          {/* 지갑 연결 버튼 */}
          <button
            onClick={connectWallet}
            style={{
              width: '100%',
              maxWidth: '350px',
              padding: 'clamp(14px, 3.5vw, 18px) clamp(20px, 5vw, 30px)',
              background: 'linear-gradient(135deg, #93EE00 0%, #7BC800 100%)',
              color: '#000',
              fontSize: 'clamp(15px, 4vw, 18px)',
              fontWeight: '700',
              border: 'none',
              borderRadius: 'clamp(10px, 2.5vw, 12px)',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
              boxShadow: '0 4px 15px rgba(147, 238, 0, 0.3)',
              transition: 'all 0.3s ease',
              marginBottom: 'clamp(12px, 3vw, 15px)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(147, 238, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(147, 238, 0, 0.3)';
            }}
          >
            🔗 지갑 연결하기
          </button>

          {/* 거절 버튼 */}
          <button
            onClick={rejectWallet}
            style={{
              width: '100%',
              maxWidth: '350px',
              padding: 'clamp(14px, 3.5vw, 18px) clamp(20px, 5vw, 30px)',
              background: 'transparent',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '500',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 'clamp(10px, 2.5vw, 12px)',
              cursor: 'pointer',
              fontFamily: 'SF Pro, Arial, sans-serif',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              e.currentTarget.style.color = '#FFF';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            나중에 하기
          </button>

          {/* 지원 지갑 안내 */}
          <div
            style={{
              marginTop: 'clamp(30px, 7vw, 40px)',
              fontSize: 'clamp(11px, 2.8vw, 13px)',
              color: 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            MetaMask, Trust Wallet, Coinbase Wallet 등<br />
            다양한 지갑을 지원합니다
          </div>
        </>
      )}

      {isConnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: 'clamp(13px, 3.3vw, 15px)',
            color: '#93EE00',
            fontFamily: 'SF Pro, Arial, sans-serif',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#93EE00',
              animation: 'pulse 1.5s infinite',
            }}
          />
          연결 완료
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
