import RewardDetailClient from './_components/RewardDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RewardDetailPage({ params }: PageProps) {
  const { id } = await params;

  // ID 파싱 (형식: "drawId-tokenId")
  const parts = id.split('-');
  
  if (parts.length !== 2) {
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
        }}
      >
        <div style={{ fontSize: '24px' }}>⚠️</div>
        <div style={{ fontSize: '16px' }}>유효하지 않은 보상 ID입니다</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          형식: drawId-tokenId (예: 6-25)
        </div>
      </div>
    );
  }

  const drawId = parseInt(parts[0], 10);
  const tokenId = parseInt(parts[1], 10);

  if (isNaN(drawId) || isNaN(tokenId) || drawId <= 0 || tokenId < 0) {
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
        }}
      >
        <div style={{ fontSize: '24px' }}>⚠️</div>
        <div style={{ fontSize: '16px' }}>유효하지 않은 회차 또는 티켓 번호입니다</div>
      </div>
    );
  }

  return <RewardDetailClient initialDrawId={drawId} initialTokenId={tokenId} />;
}
