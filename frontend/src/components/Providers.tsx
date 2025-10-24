'use client';

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { config, projectId, metadata, wagmiAdapter, networks } from '@/config/walletconnect';
import { KaiaPriceProvider } from '@/contexts/KaiaPriceContext';

const queryClient = new QueryClient();

// AppKit 초기화 (컴포넌트 외부에서 호출 - SSR 안전)
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [...networks] as any, // 타입 단언 - Reown AppKit의 타입 시스템과 호환
    metadata,
    features: {
      analytics: false, // 분석 비활성화로 속도 향상
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#93EE00',
      '--w3m-border-radius-master': '8px',
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
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

