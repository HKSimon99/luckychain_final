import WinnersClient from './_components/WinnersClient';

interface PageProps {
  params: Promise<{ drawId: string }>;
}

export default async function WinnersResultPage({ params }: PageProps) {
  const resolvedParams = await params;
  const drawIdNumber = parseInt(resolvedParams.drawId, 10);

  return <WinnersClient initialDrawId={drawIdNumber} />;
}
