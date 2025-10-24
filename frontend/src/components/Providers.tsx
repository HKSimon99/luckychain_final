'use client';

import { ReactNode, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/walletconnect';
import { initializeAppKit } from '@/config/appkit';
import { KaiaPriceProvider } from '@/contexts/KaiaPriceContext';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 클라이언트 사이드에서 AppKit 초기화 확인
    initializeAppKit();
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

