'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getKaiaPrice } from '@/lib/kaiaPrice';

interface KaiaPriceContextType {
  kaiaPrice: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const KaiaPriceContext = createContext<KaiaPriceContextType | undefined>(undefined);

/**
 * KAIA 가격을 전역으로 관리하는 Provider
 * 전체 앱에서 단 한 번만 API를 호출하여 모든 컴포넌트가 공유
 */
export function KaiaPriceProvider({ children }: { children: ReactNode }) {
  const [kaiaPrice, setKaiaPrice] = useState<number>(155); // 기본값
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrice = async () => {
    try {
      setError(null);
      const price = await getKaiaPrice();
      setKaiaPrice(price);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      console.error('❌ KAIA 가격 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 고정 환율 사용 - API 호출 불필요
    fetchPrice();
    
    // interval 제거 - 고정값이므로 업데이트 불필요
  }, []);

  return (
    <KaiaPriceContext.Provider
      value={{
        kaiaPrice,
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

