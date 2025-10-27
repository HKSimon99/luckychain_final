'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Winners page error:', error);
  }, [error]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#380D44',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        gap: '20px',
        padding: '20px',
      }}
    >
      <div style={{ fontSize: '24px' }}>⚠️</div>
      <div style={{ fontSize: '16px', textAlign: 'center' }}>
        페이지 로드 중 오류가 발생했습니다
      </div>
      <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', maxWidth: '80%' }}>
        {error.message}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 24px',
            background: '#93EE00',
            color: '#000',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/my')}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}

