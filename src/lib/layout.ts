// 스윔레인 자동 배치 — 좌표를 직접 그리지 않아도 부서(레인)×순서(열)로 단계를 정렬한다. (DESIGN.md 4절)
import type { Edge, ProcessMap, StepNode } from './types';
import { COL_W, LANE_H, PAD_X } from './constants';
import { laneOf } from './status';

export interface Layout {
  edges: Edge[];                 // 유효한 간선만
  back: Set<string>;             // 역방향 간선 id
  rank: Map<string, number>;     // 노드 → 열
  lanes: string[];               // 레인 이름(등장 순서)
  maxRank: number;
  pos: Map<string, { x: number; y: number }>;
  W: number;                     // 캔버스 폭
  H: number;                     // 레인 영역 높이
  extra: number;                 // 역방향 간선용 아래 여백
}

/** 글자 폭 단위(한글 1, 영문 0.58, 공백 0.35)로 줄바꿈 */
export function wrapText(t: string, maxUnits: number, maxLines: number): string[] {
  const out: string[] = [];
  let cur = '', w = 0;
  for (const ch of [...String(t || '')]) {
    if (ch === '\n') { if (cur.trim()) out.push(cur.trim()); cur = ''; w = 0; continue; }
    const cw = /[ᄀ-ᇿ㄰-㆏가-힯一-鿿＀-￯]/.test(ch) ? 1 : ch === ' ' ? 0.35 : 0.58;
    if (w + cw > maxUnits && cur) { out.push(cur.trim()); cur = ''; w = 0; }
    cur += ch; w += cw;
  }
  if (cur.trim()) out.push(cur.trim());
  if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].replace(/.$/, '…'); }
  return out.length ? out : [''];
}

/** 노드 반폭·반높이 */
export function halfSize(n: Pick<StepNode, 'type'>) {
  if (n.type === 'decision') return { w: 75, h: 45 };
  if (n.type === 'start' || n.type === 'end') return { w: 60, h: 22 };
  return { w: 74, h: 34 };
}

export function computeLayout(map: Pick<ProcessMap, 'nodes' | 'edges'>): Layout {
  const nodes = map.nodes || [];
  const ids = new Set(nodes.map((n) => n.id));
  const E = (map.edges || []).filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
  const out = new Map<string, Edge[]>(nodes.map((n) => [n.id, []]));
  const inc = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  E.forEach((e) => { out.get(e.from)!.push(e); inc.set(e.to, (inc.get(e.to) || 0) + 1); });

  // DFS로 역방향 간선(back edge) 검출
  const state = new Map<string, number>();
  const back = new Set<string>();
  const dfs = (u: string) => {
    state.set(u, 1);
    for (const e of out.get(u) || []) {
      const s = state.get(e.to);
      if (s === 1) back.add(e.id); else if (!s) dfs(e.to);
    }
    state.set(u, 2);
  };
  const order = nodes.filter((n) => inc.get(n.id) === 0).map((n) => n.id).concat(nodes.map((n) => n.id));
  order.forEach((id) => { if (!state.get(id)) dfs(id); });

  // 정방향 간선으로 열(rank) 계산, 같은 레인·같은 열 충돌은 뒤로 밀기
  const fwd = E.filter((e) => !back.has(e.id));
  const rank = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let it = 0; it < 500; it++) {
    let ch = false;
    fwd.forEach((e) => {
      if (rank.get(e.to)! < rank.get(e.from)! + 1) { rank.set(e.to, rank.get(e.from)! + 1); ch = true; }
    });
    const seen = new Set<string>();
    nodes.forEach((n) => {
      const k = laneOf(n) + '|' + rank.get(n.id);
      if (seen.has(k)) { rank.set(n.id, rank.get(n.id)! + 1); ch = true; } else seen.add(k);
    });
    if (!ch) break;
  }
  const lanes: string[] = [];
  nodes.forEach((n) => { const l = laneOf(n); if (!lanes.includes(l)) lanes.push(l); });
  const maxRank = nodes.length ? Math.max(...nodes.map((n) => rank.get(n.id)!)) : 0;
  const pos = new Map(nodes.map((n) => [n.id, {
    x: PAD_X + rank.get(n.id)! * COL_W + COL_W / 2,
    y: lanes.indexOf(laneOf(n)) * LANE_H + LANE_H / 2,
  }]));
  const W = PAD_X * 2 + (maxRank + 1) * COL_W;
  const H = Math.max(1, lanes.length) * LANE_H;
  const extra = back.size ? 22 + back.size * 10 : 0;
  return { edges: E, back, rank, lanes, maxRank, pos, W, H, extra };
}

export interface EdgeGeom { d: string; lx: number; ly: number; anchor: 'start' | 'middle' }

/** 간선 경로: 같은 레인 → 직선, 판단 분기 → 수직 후 수평, 다른 레인 → ㄱ자, 역방향 → 아래로 우회 */
export function edgeGeom(e: Edge, L: Layout, nById: Map<string, StepNode>): EdgeGeom | null {
  const na = nById.get(e.from), nb = nById.get(e.to);
  const a = L.pos.get(e.from), b = L.pos.get(e.to);
  if (!na || !nb || !a || !b) return null;
  const ha = halfSize(na), hb = halfSize(nb);
  if (L.back.has(e.id)) {
    const k = [...L.back].indexOf(e.id), yy = L.H + 14 + k * 10;
    return { d: `M${a.x},${a.y + ha.h} V${yy} H${b.x} V${b.y + hb.h}`, lx: (a.x + b.x) / 2, ly: yy - 4, anchor: 'middle' };
  }
  if (na.type === 'decision' && a.y !== b.y) {
    const up = b.y < a.y, sy = a.y + (up ? -ha.h : ha.h);
    return { d: `M${a.x},${sy} V${b.y} H${b.x - hb.w}`, lx: a.x + 6, ly: sy + (up ? -6 : 14), anchor: 'start' };
  }
  if (a.y === b.y) return { d: `M${a.x + ha.w},${a.y} H${b.x - hb.w}`, lx: a.x + ha.w + 6, ly: a.y - 7, anchor: 'start' };
  const mx = a.x + ha.w + 16;
  return { d: `M${a.x + ha.w},${a.y} H${mx} V${b.y} H${b.x - hb.w}`, lx: a.x + ha.w + 5, ly: a.y - 7, anchor: 'start' };
}
