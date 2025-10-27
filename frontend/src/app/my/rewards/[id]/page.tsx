'use client';

import { useParams } from 'next/navigation';
import RewardDetailClient from './_components/RewardDetailClient';

export default function RewardDetailPage() {
  const params = useParams();
  const id = params?.id ? (params.id as string) : '';
  const parts = id.split('-');
  
  const drawId = parts.length >= 1 ? parseInt(parts[0], 10) : 0;
  const tokenId = parts.length >= 2 ? parseInt(parts[1], 10) : 0;

  return <RewardDetailClient initialDrawId={drawId} initialTokenId={tokenId} />;
}
