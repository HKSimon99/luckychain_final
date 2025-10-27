import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // 컴파일러 최적화 (디버깅을 위해 임시로 console.log 유지)
  compiler: {
    removeConsole: false, // 임시로 비활성화
  },

  // React Strict Mode 비활성화 (중복 초기화 방지)
  reactStrictMode: false,

  // 서버 외부 패키지 (Next.js 15+)
  serverExternalPackages: [
    'lit',
    'lit-html',
    'lit-element',
    '@lit/reactive-element',
    '@reown/appkit',
    '@reown/appkit-utils',
    '@reown/appkit-common',
  ],

  // 실험적 기능 활성화
  experimental: {
    optimizePackageImports: ['ethers', '@web3modal/wagmi', 'wagmi', 'viem'],
  },

  webpack: (config, { isServer, dev }) => {
    // WalletConnect와 MetaMask SDK의 React Native 의존성 무시
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
      'encoding': false,
      'fs': false,
      'net': false,
      'tls': false,
    };

    // 외부 패키지 무시 (서버 사이드)
    if (isServer) {
      config.externals.push(
        'pino-pretty',
        'lit',
        'lit-html',
        'lit-element',
        '@lit/reactive-element',
        '@reown/appkit',
        '@reown/appkit-utils',
        '@reown/appkit-common',
        'lokijs',
        'encoding'
      );
    }

    // 경고 무시
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/pino/ },
      { module: /node_modules\/lit/ },
      { module: /node_modules\/@walletconnect/ },
    ];

    // 최적화 설정
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        minimize: true,
      };
    }

    // 캐시 최적화
    config.cache = dev ? {
      type: 'filesystem',
    } : false;

    return config;
  },
};

export default nextConfig;
