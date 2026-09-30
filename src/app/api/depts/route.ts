// POST /api/depts — 부서 추가
import { NextResponse } from 'next/server';
import { mutate } from '@/lib/server/store';
import { validateDeptName } from '@/lib/validate';
import { uid } from '@/lib/constants';
import type { Dept } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = validateDeptName(body?.name);
  if (!name.ok) return NextResponse.json({ error: name.error }, { status: 400 });
  const dept = await mutate<Dept | null>((db) => {
    if (db.depts.some((d) => d.name === name.value)) return null;
    const order = db.depts.reduce((a, d) => Math.max(a, d.order || 0), 0) + 1;
    const d: Dept = { id: uid(), name: name.value, order };
    db.depts.push(d);
    return d;
  });
  if (!dept) return NextResponse.json({ error: '같은 이름의 부서가 이미 있습니다.' }, { status: 409 });
  return NextResponse.json(dept, { status: 201 });
}
