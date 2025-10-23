'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WalletConnectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask를 설치해주세요!');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🎯 지갑 연결 시작...');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('✅ 계정 연결됨:', accounts[0]);

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x3e9') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x3e9' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x3e9',
                  chainName: 'Kaia Kairos Testnet',
                  rpcUrls: ['https://public-en-kairos.node.kaia.io'],
                  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
                  blockExplorerUrls: ['https://baobab.klaytnscope.com/'],
                },
              ],
            });
          }
        }
      }

      console.log('🎉 지갑 연결 완료!');
      router.push('/');
    } catch (error: any) {
      console.error('❌ 지갑 연결 실패:', error);
      alert(`지갑 연결 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const rejectWallet = () => {
    router.push('/splash');
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상태바 */}
      <div
        style={{
          height: 'clamp(40px, 5vh, 44px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(15px, 4vw, 20px)',
          color: 'white',
          fontSize: 'clamp(13px, 3.5vw, 15px)',
          fontWeight: '600',
        }}
      >
        <div>9:41</div>
        <div style={{ display: 'flex', gap: 'clamp(3px, 1vw, 5px)' }}>
          <div>📶</div>
          <div>📡</div>
          <div>🔋</div>
        </div>
      </div>

      {/* LuckyChain 헤더 */}
      <div
        style={{
          padding: 'clamp(20px, 4vh, 30px) 0',
          textAlign: 'center',
          color: 'white',
          fontSize: 'clamp(28px, 6vw, 36px)',
          fontWeight: '700',
          fontFamily: 'SF Pro, Arial, sans-serif',
        }}
      >
        LuckyChain
      </div>

      {/* 중앙 카드 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 clamp(20px, 5vw, 30px)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            background: '#F6F5F5',
            borderRadius: 'clamp(20px, 5vw, 30px)',
            padding: 'clamp(40px, 8vw, 60px) clamp(30px, 6vw, 40px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* 지갑 아이콘 */}
          <div
            style={{
              width: 'clamp(100px, 20vw, 120px)',
              height: 'clamp(100px, 20vw, 120px)',
              background: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'clamp(30px, 6vw, 40px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <svg width="60%" height="60%" viewBox="0 0 60 60" fill="none">
              <path d="M10 20 L50 20 L45 40 L5 40 Z" fill="#380D44" />
              <rect x="15" y="25" width="30" height="10" rx="2" fill="white" />
            </svg>
          </div>

          {/* 지갑 연결 텍스트 */}
          <div
            style={{
              fontSize: 'clamp(24px, 5vw, 32px)',
              fontWeight: '700',
              color: '#404040',
              marginBottom: 'clamp(12px, 3vw, 15px)',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            지갑 연결
          </div>

          {/* 설명 텍스트 */}
          <div
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#999',
              textAlign: 'center',
              fontFamily: 'SF Pro, Arial, sans-serif',
            }}
          >
            연결 지갑 네트워크 : 카이아 체인(Klaytn)
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div
        style={{
          padding: 'clamp(20px, 4vw, 30px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(12px, 3vw, 15px)',
        }}
      >
        {/* YES 버튼 */}
        <button
          onClick={connectWallet}
          disabled={isLoading}
          style={{
            width: '100%',
            height: 'clamp(50px, 8vh, 60px)',
            background: '#93EE00',
            border: 'none',
            borderRadius: 'clamp(10px, 2vw, 12px)',
            color: 'white',
            fontSize: 'clamp(16px, 4vw, 18px)',
            fontWeight: '700',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s',
            fontFamily: 'SF Pro, Arial, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          {isLoading ? '연결 중...' : 'YES'}
        </button>

        {/* NO 버튼 */}
        <button
          onClick={rejectWallet}
          style={{
            width: '100%',
            height: 'clamp(50px, 8vh, 60px)',
            background: '#93EE00',
            border: 'none',
            borderRadius: 'clamp(10px, 2vw, 12px)',
            color: 'white',
            fontSize: 'clamp(16px, 4vw, 18px)',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'SF Pro, Arial, sans-serif',
            textTransform: 'uppercase',
          }}
        >
          NO
        </button>
      </div>
    </div>
  );
}

