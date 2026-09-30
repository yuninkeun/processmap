// 진행 STATUS·지연 판정·부서별 집계 — 지연 판정은 이 파일의 isOverdue() 한 곳에서만 한다.
import type { Dept, ProcessMap, Progress, StepNode } from './types';
import { UNASSIGNED } from './constants';

/** 단계의 주관부서명(레인). 비어 있으면 '담당 미지정' */
export const laneOf = (n: Pick<StepNode, 'lane'>) => (n.lane || '').trim() || UNASSIGNED;

/** 시작/종료 단계는 진행 관리 대상이 아니다 */
export const isTrackable = (n: StepNode) => n.type !== 'start' && n.type !== 'end';

export const progressOf = (n: StepNode): Progress => n.progress || 'todo';

/** 지연 = 완료가 아니고 납기일이 오늘보다 이전 */
export function isOverdue(n: StepNode, todayStr: string): boolean {
  return isTrackable(n) && progressOf(n) !== 'done' && !!n.due && n.due < todayStr;
}

/** 납기 경과 일수 (지연이 아니면 0) */
export function daysOverdue(n: StepNode, todayStr: string): number {
  if (!isOverdue(n, todayStr) || !n.due) return 0;
  const a = new Date(n.due + 'T00:00:00').getTime();
  const b = new Date(todayStr + 'T00:00:00').getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export interface DeptStat {
  dept: string;
  total: number;
  todo: number;
  doing: number;
  done: number;
  blocked: number;
  overdue: number;
  unassigned: number;
  /** 완료율 0~100 (전체 0이면 0) */
  rate: number;
}

const emptyStat = (dept: string): DeptStat => ({
  dept, total: 0, todo: 0, doing: 0, done: 0, blocked: 0, overdue: 0, unassigned: 0, rate: 0,
});

/** 전사 진행 현황: 레인(주관부서)별 집계 + 합계 + 병목 부서 */
export function aggregate(maps: ProcessMap[], depts: Dept[], todayStr: string) {
  const byDept = new Map<string, DeptStat>();
  depts.forEach((d) => byDept.set(d.name, emptyStat(d.name)));
  const total = emptyStat('전체');

  const overdueList: { map: ProcessMap; node: StepNode; days: number }[] = [];

  for (const m of maps) {
    for (const n of m.nodes || []) {
      if (!isTrackable(n)) continue;
      const lane = laneOf(n);
      if (!byDept.has(lane)) byDept.set(lane, emptyStat(lane));
      const s = byDept.get(lane)!;
      const p = progressOf(n);
      for (const t of [s, total]) {
        t.total++;
        t[p]++;
        if (!n.owner) t.unassigned++;
        if (isOverdue(n, todayStr)) t.overdue++;
      }
      if (isOverdue(n, todayStr)) overdueList.push({ map: m, node: n, days: daysOverdue(n, todayStr) });
    }
  }
  const rows = [...byDept.values()].map((s) => ({ ...s, rate: s.total ? Math.round((s.done / s.total) * 100) : 0 }));
  total.rate = total.total ? Math.round((total.done / total.total) * 100) : 0;

  // 병목 부서 = 지연 + 보류 가 가장 많은 부서 (0이면 없음)
  let bottleneck: DeptStat | null = null;
  for (const r of rows) {
    const score = r.overdue + r.blocked;
    if (score > 0 && (!bottleneck || score > bottleneck.overdue + bottleneck.blocked)) bottleneck = r;
  }
  overdueList.sort((a, b) => b.days - a.days);
  return { rows, total, overdueList, bottleneck };
}
