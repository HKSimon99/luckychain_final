import { createAppKit } from '@reown/appkit/react';
import { projectId, metadata, wagmiAdapter, networks } from './walletconnect';

// AppKit 초기화 (모듈 로드 시 즉시 실행)
let appKitInstance: ReturnType<typeof createAppKit> | null = null;

export function initializeAppKit() {
  // 브라우저 환경이고, 아직 초기화되지 않았을 때만 실행
  if (typeof window !== 'undefined' && !appKitInstance && projectId) {
    try {
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
      console.log('✅ AppKit initialized successfully');
    } catch (error) {
      console.warn('⚠️ AppKit initialization error:', error);
    }
  }
  return appKitInstance;
}

// 브라우저 환경에서 즉시 초기화
if (typeof window !== 'undefined') {
  initializeAppKit();
}

export { appKitInstance };

