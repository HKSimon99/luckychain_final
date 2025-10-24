import { createAppKit } from '@reown/appkit/react';
import { projectId, metadata, wagmiAdapter, networks } from './walletconnect';

// AppKit 초기화 상태
let appKitInstance: ReturnType<typeof createAppKit> | null = null;
let isInitializing = false;
let isInitialized = false;

export function initializeAppKit(): Promise<boolean> {
  // 이미 초기화되었으면 즉시 반환
  if (isInitialized) {
    return Promise.resolve(true);
  }

  // 초기화 중이면 대기
  if (isInitializing) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (isInitialized) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 50);
      // 최대 5초 대기
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 5000);
    });
  }

  // 브라우저 환경이 아니면 실패
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // 초기화 시작
  isInitializing = true;

  return new Promise((resolve) => {
    try {
      if (!projectId) {
        console.warn('⚠️ ProjectId not found');
        isInitializing = false;
        resolve(false);
        return;
      }

      appKitInstance = createAppKit({
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

      isInitialized = true;
      isInitializing = false;
      console.log('✅ AppKit initialized successfully');
      resolve(true);
    } catch (error) {
      console.error('❌ AppKit initialization error:', error);
      isInitializing = false;
      resolve(false);
    }
  });
}

export function isAppKitInitialized(): boolean {
  return isInitialized;
}

export { appKitInstance };

