'use client';
// 목록에서 쓰는 프로세스맵 한 줄
import Link from 'next/link';
import type { ProcessMap } from '@/lib/types';
import { MAP_STATUS, fmtDate, today } from '@/lib/constants';
import { isOverdue } from '@/lib/status';
import { useData } from './DataProvider';

export function MapRow({ map: m, showDept }: { map: ProcessMap; showDept?: boolean }) {
  const { deptById, setQ } = useData();
  const overdue = m.nodes.filter((n) => isOverdue(n, today())).length;
  const pain = m.nodes.filter((n) => n.pain).length;
  return (
    <Link className="maprow" href={`/map/${m.id}`} onClick={() => setQ('')}>
      <span>
        <span className="mr-title">{m.title || '제목 없음'}</span>
        <span className="mr-sub">{showDept ? `${deptById(m.deptId)?.name || ''} / ` : ''}{m.purpose || '목적 미입력'}</span>
      </span>
      <span className={`chip ${m.status || 'draft'}`}>{MAP_STATUS[m.status] || '초안'}</span>
      <span className="mr-meta">{m.nodes.length}단계</span>
      <span className={`mr-meta ${overdue ? 'bad' : pain ? 'warn' : ''}`}>{overdue ? `지연 ${overdue}` : pain ? `개선 후보 ${pain}` : ''}</span>
      <span className="mr-meta">{fmtDate(m.updatedAt)}</span>
    </Link>
  );
}
