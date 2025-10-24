import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defineChain } from 'viem';

// Kaia Kairos 테스트넷 정의
export const kaiaKairos = defineChain({
  id: 1001,
  name: 'Kaia Kairos Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: {
      http: ['https://public-en-kairos.node.kaia.io'],
    },
    public: {
      http: ['https://public-en-kairos.node.kaia.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Klaytn Scope',
      url: 'https://baobab.klaytnscope.com',
    },
  },
  testnet: true,
});

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️  WalletConnect Project ID가 설정되지 않았습니다.');
  console.warn('   https://cloud.walletconnect.com 에서 Project ID를 발급받으세요.');
}

// Wagmi 설정
const metadata = {
  name: 'Luckychain',
  description: 'Orakl VRF를 활용한 탈중앙화 로또 시스템',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: ['/logo.png'],
};

export const config = defaultWagmiConfig({
  chains: [kaiaKairos],
  projectId,
  metadata,
  enableAnalytics: true, // 선택사항
  enableOnramp: false, // 암호화폐 구매 기능 비활성화
});

export { projectId };

// Web3Modal은 Provider에서 초기화합니다

