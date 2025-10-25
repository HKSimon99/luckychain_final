import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface CoinGeckoResponse {
  kaia: {
    krw: number;
    krw_24h_change: number;
  };
}

// 🔒 Rate Limit 방지: 캐시 저장소
let cachedData: {
  price: number;
  change24h: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 60000; // 60초 (1분)

/**
 * KAIA 실시간 가격 및 24시간 변동률 API
 * 
 * 최적화 전략:
 * 1. 60초 캐시 - CoinGecko API Rate Limit 방지
 * 2. Next.js 자체 캐싱 - 서버 사이드 최적화
 * 3. 폴백 처리 - API 실패 시 안정성
 */
export async function GET() {
  try {
    // ✅ 캐시 확인: 60초 이내 데이터가 있으면 재사용
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        ...cachedData,
        cached: true,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=kaia&vs_currencies=krw&include_24hr_change=true',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: {
          revalidate: 60, // 60초마다 재검증
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoResponse = await response.json();

    if (!data.kaia || !data.kaia.krw) {
      throw new Error('Invalid response from CoinGecko');
    }

    // 캐시 업데이트
    cachedData = {
      price: data.kaia.krw,
      change24h: data.kaia.krw_24h_change || 0,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      success: true,
      ...cachedData,
      cached: false,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('❌ KAIA price API error:', error);

    // 캐시된 데이터가 있으면 그것을 사용 (최대 5분까지 허용)
    if (cachedData && Date.now() - cachedData.timestamp < 300000) {
      return NextResponse.json({
        success: true,
        ...cachedData,
        cached: true,
        stale: true,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
        },
      });
    }

    // 폴백 응답 (고정값)
    return NextResponse.json({
      success: false,
      price: 155, // 폴백 가격
      change24h: 0,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30',
      },
    });
  }
}

