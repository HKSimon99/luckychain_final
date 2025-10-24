'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { config, projectId } from '@/config/walletconnect';
import { KaiaPriceProvider } from '@/contexts/KaiaPriceContext';

const queryClient = new QueryClient();

// Web3Modal 초기화 (전역 변수로 중복 방지)
declare global {
  interface Window {
    __walletConnectInitialized?: boolean;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.__walletConnectInitialized && projectId) {
      try {
        createWeb3Modal({
          wagmiConfig: config,
          projectId,
          enableAnalytics: false, // 분석 비활성화로 속도 향상
          themeMode: 'dark',
          themeVariables: {
            '--w3m-accent': '#93EE00',
            '--w3m-border-radius-master': '8px',
          },
        });
        window.__walletConnectInitialized = true;
      } catch (error) {
        console.warn('WalletConnect already initialized');
      }
    }
    setIsReady(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <KaiaPriceProvider>
          {children}
        </KaiaPriceProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

