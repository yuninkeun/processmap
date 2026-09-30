// POST /api/notify — 담당자에게 수동 알림(배정/진행 요청)
import { NextResponse } from 'next/server';
import { mutate } from '@/lib/server/store';
import { baseUrlFrom, createNotice } from '@/lib/server/notify';
import type { NoticeKind } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mapId = typeof body?.mapId === 'string' ? body.mapId : '';
  const nodeId = typeof body?.nodeId === 'string' ? body.nodeId : '';
  const kind: NoticeKind = body?.kind === 'assign' ? 'assign' : 'remind';
  if (!mapId || !nodeId) return NextResponse.json({ error: '맵과 단계를 지정해 주세요.' }, { status: 400 });
  const baseUrl = baseUrlFrom(req);
  const r = await mutate(async (db) => {
    const map = db.maps.find((m) => m.id === mapId);
    const node = map?.nodes.find((n) => n.id === nodeId);
    if (!map || !node) return { error: '단계를 찾을 수 없습니다. 먼저 저장해 주세요.', status: 404 } as const;
    // 수동 알림도 1분 내 같은 단계·같은 수신자 중복 발송은 막는다 (메일 남용 방지)
    const res = await createNotice(db, map, node, kind, baseUrl, { dedupe: true });
    if (!res) return { error: '방금 같은 알림을 보냈습니다.', status: 429 } as const;
    if ('error' in res) return { error: res.error, status: 400 } as const;
    return { notice: res } as const;
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.notice, { status: 201 });
}
