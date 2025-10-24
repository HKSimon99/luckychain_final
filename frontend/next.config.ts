import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // React Strict Mode 비활성화 (중복 초기화 방지)
  reactStrictMode: false,

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
        '@lit/reactive-element',
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
