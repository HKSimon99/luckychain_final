'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getKaiaPrice, type KaiaPriceData } from '@/lib/kaiaPrice';

interface KaiaPriceContextType {
  kaiaPrice: number;
  change24h: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const KaiaPriceContext = createContext<KaiaPriceContextType | undefined>(undefined);

/**
 * KAIA 가격 및 24시간 변동률을 전역으로 관리하는 Provider
 * 
 * 최적화:
 * - 60초마다 자동 업데이트 (Rate Limit 방지)
 * - API Route의 캐시와 협력
 * - 탭 포커스 시 자동 갱신
 */
export function KaiaPriceProvider({ children }: { children: ReactNode }) {
  const [kaiaPrice, setKaiaPrice] = useState<number>(155); // 기본값
  const [change24h, setChange24h] = useState<number>(0); // 24시간 변동률
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrice = async () => {
    try {
      setError(null);
      const data: KaiaPriceData = await getKaiaPrice();
      
      // 값이 유효한 경우에만 업데이트
      if (data.price > 0) {
        setKaiaPrice(data.price);
        setChange24h(data.change24h);
        setLastUpdated(new Date());
        // 개발 환경에서만 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('💰 KAIA:', data.price, 'KRW, 변동:', data.change24h.toFixed(2) + '%');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      console.error('❌ KAIA 가격 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 초기 로드
    fetchPrice();
    
    // 60초마다 자동 업데이트 (Rate Limit 방지)
    const interval = setInterval(fetchPrice, 60000);
    
    // 탭이 포커스 받을 때 갱신 (최신 가격 유지)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastUpdate = lastUpdated 
          ? Date.now() - lastUpdated.getTime() 
          : Infinity;
        
        // 마지막 업데이트가 60초 이상 경과했으면 갱신
        if (timeSinceLastUpdate > 60000) {
          fetchPrice();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastUpdated]);

  return (
    <KaiaPriceContext.Provider
      value={{
        kaiaPrice,
        change24h,
        isLoading,
        error,
        lastUpdated,
        refresh: fetchPrice,
      }}
    >
      {children}
    </KaiaPriceContext.Provider>
  );
}

/**
 * KAIA 가격을 사용하는 Hook
 * Context에서 공유되는 가격을 가져옴 (API 호출 X)
 */
export function useKaiaPrice(): KaiaPriceContextType {
  const context = useContext(KaiaPriceContext);
  if (context === undefined) {
    throw new Error('useKaiaPrice must be used within a KaiaPriceProvider');
  }
  return context;
}

/**
 * KAIA를 KRW로 환산하는 헬퍼 함수
 */
export function useKaiaToKRW(kaiaAmount: string | number): string {
  const { kaiaPrice } = useKaiaPrice();
  const amount = typeof kaiaAmount === 'string' ? parseFloat(kaiaAmount) : kaiaAmount;
  
  if (isNaN(amount)) return '0';
  
  const krw = amount * kaiaPrice;
  return Math.floor(krw).toLocaleString('ko-KR');
}

