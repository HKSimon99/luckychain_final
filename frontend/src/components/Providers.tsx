'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { config, projectId, metadata, wagmiAdapter, networks } from '@/config/walletconnect';
import { KaiaPriceProvider } from '@/contexts/KaiaPriceContext';

const queryClient = new QueryClient();

// AppKit 초기화를 클라이언트 사이드에서만 실행
let appKitInitialized = false;

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 브라우저에서만 실행
    if (!appKitInitialized && projectId) {
      try {
        createAppKit({
          adapters: [wagmiAdapter],
          projectId,
          networks: [...networks] as any,
          metadata,
          features: {
            analytics: false,
          },
          themeMode: 'dark',
          themeVariables: {
            '--w3m-accent': '#93EE00',
            '--w3m-border-radius-master': '8px',
          },
        });
        appKitInitialized = true;
      } catch (error) {
        console.warn('AppKit initialization error:', error);
      }
    }
    setMounted(true);
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

