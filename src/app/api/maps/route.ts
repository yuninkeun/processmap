// POST /api/maps — 프로세스맵 추가 (시작·종료 2단계로 시작, 바로 초안 저장)
import { NextResponse } from 'next/server';
import { mutate } from '@/lib/server/store';
import { validateMapMeta } from '@/lib/validate';
import { uid } from '@/lib/constants';
import type { ProcessMap, StepNode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const meta = validateMapMeta({ title: body?.title, purpose: body?.purpose });
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 });
  const deptId = typeof body?.deptId === 'string' ? body.deptId : '';
  const r = await mutate((db) => {
    const dept = db.depts.find((d) => d.id === deptId);
    if (!dept) return { error: '부서를 선택해 주세요.' } as const;
    const s: StepNode = { id: uid(), type: 'start', label: '시작', lane: dept.name, progress: 'todo' };
    const e: StepNode = { id: uid(), type: 'end', label: '종료', lane: dept.name, progress: 'todo' };
    const now = new Date().toISOString();
    const map: ProcessMap = {
      id: uid(), deptId, title: meta.value.title, purpose: meta.value.purpose, owner: '', freq: '',
      status: 'draft', version: 1, rev: 1, nodes: [s, e],
      edges: [{ id: uid(), from: s.id, to: e.id, label: '' }],
      changelog: [{ v: 1, at: now, note: '프로세스맵 생성' }], updatedAt: now,
    };
    db.maps.push(map);
    return { map } as const;
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r.map, { status: 201 });
}
