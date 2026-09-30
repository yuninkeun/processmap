// PATCH /api/depts/[id] — 이름 변경 · DELETE — 삭제(맵이 없는 부서만)
import { NextResponse } from 'next/server';
import { mutate } from '@/lib/server/store';
import { validateDeptName } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = validateDeptName(body?.name);
  if (!name.ok) return NextResponse.json({ error: name.error }, { status: 400 });
  const r = await mutate((db) => {
    const d = db.depts.find((x) => x.id === id);
    if (!d) return { error: '부서를 찾을 수 없습니다.', status: 404 } as const;
    if (db.depts.some((x) => x.id !== id && x.name === name.value)) return { error: '같은 이름의 부서가 이미 있습니다.', status: 409 } as const;
    // 레인 이름도 함께 바꿔 준다 (해당 부서 맵의 단계)
    db.maps.forEach((m) => m.nodes.forEach((n) => { if (n.lane === d.name) n.lane = name.value; }));
    d.name = name.value;
    return { dept: d } as const;
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.dept);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await mutate((db) => {
    const d = db.depts.find((x) => x.id === id);
    if (!d) return { error: '부서를 찾을 수 없습니다.', status: 404 } as const;
    if (db.maps.some((m) => m.deptId === id)) return { error: '등록된 프로세스맵이 있는 부서는 삭제할 수 없습니다.', status: 409 } as const;
    db.depts = db.depts.filter((x) => x.id !== id);
    return { ok: true } as const;
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
