'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/walletconnect';
import { initializeAppKit } from '@/config/appkit';
import { KaiaPriceProvider } from '@/contexts/KaiaPriceContext';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서 AppKit 초기화 대기
    initializeAppKit()
      .then((success) => {
        if (success) {
          console.log('🎉 AppKit ready');
          setIsInitialized(true);
        } else {
          console.error('❌ AppKit initialization failed');
          // 실패해도 렌더링은 계속 (일부 기능만 제한됨)
          setIsInitialized(true);
        }
      })
      .catch((error) => {
        console.error('❌ AppKit initialization error:', error);
        // 오류 발생해도 렌더링은 계속
        setIsInitialized(true);
      });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <KaiaPriceProvider>
          {/* AppKit 초기화 후에만 children 렌더링 */}
          {isInitialized ? children : null}
        </KaiaPriceProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

