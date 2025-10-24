/**
 * KAIA 토큰의 실시간 KRW 가격을 가져오는 유틸리티
 */

interface UpbitTicker {
  market: string;
  trade_price: number;
  trade_timestamp: number;
  change: string;
  change_rate: number;
}

interface CoinGeckoPrice {
  kaia: {
    krw: number;
  };
}

/**
 * Upbit API를 사용하여 KAIA/KRW 실시간 가격을 가져옵니다
 * @returns KAIA 1개의 원화 가격
 */
export async function getKaiaPriceFromUpbit(): Promise<number> {
  try {
    const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-KAIA', {
      cache: 'no-store', // 항상 최신 가격
    });

    if (!response.ok) {
      throw new Error(`Upbit API error: ${response.status}`);
    }

    const data: UpbitTicker[] = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('No data from Upbit API');
    }

    return data[0].trade_price;
  } catch (error) {
    console.error('❌ Upbit API 오류:', error);
    return 155; // 폴백 가격
  }
}

/**
 * CoinGecko API를 사용하여 KAIA/KRW 가격을 가져옵니다 (대체 수단)
 * @returns KAIA 1개의 원화 가격
 */
export async function getKaiaPriceFromCoinGecko(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=kaia&vs_currencies=krw',
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoPrice = await response.json();
    
    if (!data.kaia || !data.kaia.krw) {
      throw new Error('No data from CoinGecko API');
    }

    return data.kaia.krw;
  } catch (error) {
    console.error('❌ CoinGecko API 오류:', error);
    return 155; // 폴백 가격
  }
}

/**
 * KAIA 가격을 가져옵니다 (CoinGecko 우선, 실패 시 Upbit)
 * @returns KAIA 1개의 원화 가격
 */
export async function getKaiaPrice(): Promise<number> {
  try {
    // CoinGecko 먼저 시도 (현재 작동 확인됨)
    const coingeckoPrice = await getKaiaPriceFromCoinGecko();
    if (coingeckoPrice > 0 && coingeckoPrice !== 155) {
      return coingeckoPrice;
    }

    // CoinGecko 실패 시 Upbit 시도
    const upbitPrice = await getKaiaPriceFromUpbit();
    if (upbitPrice > 0 && upbitPrice !== 155) {
      return upbitPrice;
    }

    // 둘 다 실패 시 폴백
    return 155; // 현재 시세 기준 폴백 가격
  } catch (error) {
    console.error('❌ KAIA 가격 조회 실패:', error);
    return 155; // 폴백 가격
  }
}

/**
 * KAIA 금액을 원화로 환산합니다
 * @param kaiaAmount KAIA 수량
 * @param kaiaPrice KAIA 1개의 원화 가격 (선택사항)
 * @returns 원화 금액 (포맷팅: "1,234,567")
 */
export async function convertKaiaToKRW(
  kaiaAmount: string | number,
  kaiaPrice?: number
): Promise<string> {
  try {
    const price = kaiaPrice || (await getKaiaPrice());
    const amount = typeof kaiaAmount === 'string' ? parseFloat(kaiaAmount) : kaiaAmount;
    
    const krw = amount * price;
    
    // 천 단위 콤마 추가
    return Math.floor(krw).toLocaleString('ko-KR');
  } catch (error) {
    console.error('❌ KRW 환산 실패:', error);
    return '0';
  }
}

/**
 * 주기적으로 KAIA 가격을 업데이트하는 훅을 위한 함수
 * @param intervalMs 업데이트 간격 (밀리초)
 * @returns 가격과 업데이트 함수
 */
export function createPriceUpdater(intervalMs: number = 30000) {
  let currentPrice = 155;
  let isUpdating = false;

  const updatePrice = async () => {
    if (isUpdating) return currentPrice;
    
    isUpdating = true;
    try {
      currentPrice = await getKaiaPrice();
    } finally {
      isUpdating = false;
    }
    
    return currentPrice;
  };

  return {
    getCurrentPrice: () => currentPrice,
    updatePrice,
    startAutoUpdate: () => {
      updatePrice(); // 즉시 한 번 실행
      return setInterval(updatePrice, intervalMs);
    },
  };
}
