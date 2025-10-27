'use client';

import { useParams } from 'next/navigation';
import WinnersClient from './_components/WinnersClient';

export default function WinnersResultPage() {
  const params = useParams();
  const drawIdNumber = params?.drawId ? parseInt(params.drawId as string, 10) : 0;

  return <WinnersClient initialDrawId={drawIdNumber} />;
}
