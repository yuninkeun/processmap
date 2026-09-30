'use client';
// /map/[id] — 프로세스맵 보기·편집. useSearchParams 를 쓰므로 Suspense 로 감싼다.
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { MapView } from '@/components/MapView';

export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<div className="empty">불러오는 중…</div>}>
      <MapView id={id} />
    </Suspense>
  );
}
