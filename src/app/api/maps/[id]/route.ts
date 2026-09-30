// GET/PUT/DELETE /api/maps/[id] — 맵 조회·저장·삭제. 저장 시 담당자 이메일이 새로 지정/변경된 단계에 자동 알림.
import { NextResponse } from 'next/server';
import { mutate, readDB } from '@/lib/server/store';
import { validateGraph, validateMapMeta } from '@/lib/validate';
import { baseUrlFrom, createNotice } from '@/lib/server/notify';
import type { ProcessMap } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await readDB();
  const map = db.maps.find((m) => m.id === id);
  if (!map) return NextResponse.json({ error: '프로세스맵을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(map);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const input = (body?.map || {}) as Record<string, unknown>;
  const meta = validateMapMeta(input);
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 });
  const graph = validateGraph(input.nodes, input.edges);
  if (!graph.ok) return NextResponse.json({ error: graph.error }, { status: 400 });
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 120) : '';
  const bump = !!body?.bump;
  const force = !!body?.force;
  const clientRev = Number(input.rev) || 0;
  const baseUrl = baseUrlFrom(req);

  const r = await mutate(async (db) => {
    const idx = db.maps.findIndex((m) => m.id === id);
    if (idx < 0) return { error: '프로세스맵을 찾을 수 없습니다.', status: 404 } as const;
    const prev = db.maps[idx];
    if (!force && (prev.rev || 0) !== clientRev)
      return { error: '다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하거나 덮어쓰기를 선택해 주세요.', status: 409 } as const;
    const deptId = typeof input.deptId === 'string' && db.depts.some((d) => d.id === input.deptId) ? input.deptId : prev.deptId;
    const now = new Date().toISOString();
    const version = bump ? (prev.version || 1) + 1 : prev.version || 1;
    const changelog = (prev.changelog || []).slice(-29);
    if (note || bump) changelog.push({ v: version, at: now, note });
    const map: ProcessMap = {
      id, deptId, ...meta.value, nodes: graph.value.nodes, edges: graph.value.edges,
      version, rev: (prev.rev || 0) + 1, changelog, updatedAt: now,
    };
    db.maps[idx] = map;
    // 자동 알림: 담당자 이메일이 새로 생겼거나 바뀐 단계
    let notified = 0;
    const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
    for (const n of map.nodes) {
      const before = prevById.get(n.id)?.ownerEmail || '';
      if (n.ownerEmail && n.ownerEmail !== before) {
        const res = await createNotice(db, map, n, 'assign', baseUrl, { dedupe: true });
        if (res && !('error' in res)) notified++;
      }
    }
    return { map, notified } as const;
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = await mutate((db) => {
    const before = db.maps.length;
    db.maps = db.maps.filter((m) => m.id !== id);
    // 다른 맵에서 이 맵으로 걸어 둔 연계 링크 해제
    db.maps.forEach((m) => m.nodes.forEach((n) => { if (n.link === id) n.link = ''; }));
    return db.maps.length < before;
  });
  if (!ok) return NextResponse.json({ error: '프로세스맵을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
