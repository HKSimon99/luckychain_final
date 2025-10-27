'use client';

export default function Loading() {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#380D44',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 'clamp(14px, 3.5vw, 16px)',
      }}
    >
      로딩 중...
    </div>
  );
}

