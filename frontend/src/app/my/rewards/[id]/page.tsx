'use client';

import { useParams } from 'next/navigation';
import RewardDetailClient from './_components/RewardDetailClient';

export default function RewardDetailPage() {
  const params = useParams();
  console.log('📄 [DEBUG] RewardDetailPage 렌더링');
  console.log('  - params:', params);
  
  const id = params?.id ? (params.id as string) : '';
  console.log('  - id:', id);
  
  const parts = id.split('-');
  console.log('  - parts:', parts);
  
  const drawId = parts.length >= 1 ? parseInt(parts[0], 10) : 0;
  const tokenId = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  console.log('  - drawId:', drawId);
  console.log('  - tokenId:', tokenId);

  return <RewardDetailClient initialDrawId={drawId} initialTokenId={tokenId} />;
}
