import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

// Kaia Kairos 테스트넷 정의 (AppKit 호환 형식)
export const kaiaKairos = {
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
  caipNetworkId: 'eip155:1001',
  chainNamespace: 'eip155',
};

// WalletConnect Project ID
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️  WalletConnect Project ID가 설정되지 않았습니다.');
  console.warn('   https://cloud.walletconnect.com 에서 Project ID를 발급받으세요.');
}

// Metadata
export const metadata = {
  name: 'Luckychain',
  description: 'Orakl VRF를 활용한 탈중앙화 로또 시스템',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://luckychain.app',
  icons: ['/logo.png'],
};

// Networks (createAppKit에서 최소 1개 요구)
export const networks = [kaiaKairos];

// Wagmi Adapter (모바일 최적화)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: false, // 모바일 환경 최적화
});

export const config = wagmiAdapter.wagmiConfig;

// AppKit은 Provider에서 초기화합니다

