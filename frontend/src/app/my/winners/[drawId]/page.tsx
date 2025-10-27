import WinnersClient from './_components/WinnersClient';

interface PageProps {
  params: Promise<{ drawId: string }>;
}

export default async function WinnersResultPage({ params }: PageProps) {
  const { drawId } = await params;
  const drawIdNumber = parseInt(drawId, 10);

  if (isNaN(drawIdNumber) || drawIdNumber <= 0) {
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
        <div style={{ fontSize: '16px' }}>유효하지 않은 회차 번호입니다</div>
      </div>
    );
  }

  return <WinnersClient initialDrawId={drawIdNumber} />;
}
