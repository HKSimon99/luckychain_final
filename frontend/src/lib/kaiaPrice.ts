/**
 * KAIA 토큰의 실시간 KRW 가격을 가져오는 유틸리티
 * Next.js API Route를 통해 CORS 문제 해결
 */

export interface KaiaPriceData {
  price: number;
  change24h: number;
  timestamp: number;
}

/**
 * KAIA 가격 및 24시간 변동률을 가져옵니다
 * @returns KAIA 가격 데이터
 */
export async function getKaiaPrice(): Promise<KaiaPriceData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8초 타임아웃
    
    const response = await fetch('/api/kaia-price', {
      cache: 'no-store', // 항상 최신 가격
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ KAIA API 응답 오류: ${response.status}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.price && data.price > 0) {
      return {
        price: data.price,
        change24h: data.change24h || 0,
        timestamp: data.timestamp || Date.now(),
      };
    }
    
    throw new Error('Invalid price data');
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ KAIA 가격 조회 타임아웃 - 폴백 값 사용');
      } else {
        console.warn('⚠️ KAIA 가격 조회 실패 - 폴백 값 사용:', error.message);
      }
    }
    
    // 폴백 데이터
    return {
      price: 155,
      change24h: 0,
      timestamp: Date.now(),
    };
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
    let price = kaiaPrice;
    
    if (!price) {
      const data = await getKaiaPrice();
      price = data.price;
    }
    
    const amount = typeof kaiaAmount === 'string' ? parseFloat(kaiaAmount) : kaiaAmount;
    const krw = amount * price;
    
    // 천 단위 콤마 추가
    return Math.floor(krw).toLocaleString('ko-KR');
  } catch (error) {
    console.error('❌ KRW 환산 실패:', error);
    return '0';
  }
}
