import RewardDetailClient from './_components/RewardDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RewardDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const parts = resolvedParams.id.split('-');
  
  const drawId = parts.length >= 1 ? parseInt(parts[0], 10) : 0;
  const tokenId = parts.length >= 2 ? parseInt(parts[1], 10) : 0;

  return <RewardDetailClient initialDrawId={drawId} initialTokenId={tokenId} />;
}
