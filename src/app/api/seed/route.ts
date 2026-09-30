// POST /api/seed — 처음 써 보는 사람을 위한 샘플 데이터 (맵이 하나도 없을 때만)
import { NextResponse } from 'next/server';
import { mutate } from '@/lib/server/store';
import { uid } from '@/lib/constants';
import type { Dept, ProcessMap, StepNode } from '@/lib/types';

export const dynamic = 'force-dynamic';

const shift = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function POST() {
  const r = await mutate((db) => {
    if (db.maps.length) return { error: '이미 데이터가 있어 샘플을 넣지 않았습니다.' } as const;
    const names = ['구매팀', '품질팀(IQC)', '생산팀'];
    const depts: Dept[] = names.map((name, i) => {
      const found = db.depts.find((d) => d.name === name);
      if (found) return found;
      const d = { id: uid(), name, order: db.depts.length + i + 1 };
      db.depts.push(d);
      return d;
    });
    const [buy, iqc, prod] = depts;
    const n = (over: Partial<StepNode>): StepNode => ({ id: uid(), type: 'task', label: '', lane: buy.name, progress: 'todo', ...over });
    const s = n({ type: 'start', label: '시작' });
    const a = n({ label: '발주 요청서 접수', owner: '김구매', ownerEmail: 'buyer@example.com', rr: '요청서 접수·누락 확인', due: shift(-3), progress: 'done', system: '메일', time: 20 });
    const q = n({ type: 'decision', label: '재고가 충분한가', owner: '김구매', ownerEmail: 'buyer@example.com', rr: '재고 확인 후 판단', due: shift(-2), progress: 'done', system: 'SAP B1' });
    const ap = n({ type: 'approval', label: '팀장 발주 승인', owner: '박팀장', ownerEmail: 'lead@example.com', rr: '금액·거래처 승인', due: shift(-1), progress: 'doing', system: 'SAP B1', pain: true, painNote: '승인 대기가 평균 2일' });
    const po = n({ label: 'SAP 발주 등록', owner: '김구매', ownerEmail: 'buyer@example.com', rr: 'PO 등록·거래처 발송', due: shift(1), progress: 'todo', system: 'SAP B1', time: 15 });
    const ins = n({ lane: iqc.name, label: '입고 검사', owner: '이검사', ownerEmail: 'iqc@example.com', rr: '샘플링 검사·판정', due: shift(-4), progress: 'blocked', system: 'MES', time: 60, note: '검사 장비 점검 중' });
    const doc = n({ lane: iqc.name, type: 'doc', label: '검사 성적서', owner: '이검사', ownerEmail: 'iqc@example.com', rr: '성적서 발행', due: shift(3), progress: 'todo', system: '엑셀' });
    const use = n({ lane: prod.name, label: '자재 투입', owner: '최생산', ownerEmail: 'prod@example.com', rr: '라인 투입·실적 등록', due: shift(5), progress: 'todo', system: 'MES' });
    const e = n({ type: 'end', label: '종료', lane: prod.name });
    const now = new Date().toISOString();
    const edge = (from: StepNode, to: StepNode, label = '') => ({ id: uid(), from: from.id, to: to.id, label });
    const map: ProcessMap = {
      id: uid(), deptId: buy.id, title: '구매 발주 프로세스', purpose: '발주 요청부터 자재 투입까지의 표준 절차',
      owner: '구매팀 김구매', freq: '주 5회', status: 'review', version: 2, rev: 1, nodes: [s, a, q, ap, po, ins, doc, use, e],
      edges: [edge(s, a), edge(a, q), edge(q, use, '예'), edge(q, ap, '아니오'), edge(ap, po), edge(po, ins), edge(ins, doc), edge(doc, use), edge(use, e)],
      changelog: [{ v: 1, at: now, note: '샘플 데이터 생성' }, { v: 2, at: now, note: '입고 검사 단계 추가' }], updatedAt: now,
    };
    db.maps.push(map);
    return { ok: true } as const;
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
