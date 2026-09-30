'use client';
// 스윔레인 흐름도(SVG). 레이아웃은 lib/layout.ts 가 계산하고 여기서는 JSX 로만 그린다 (HTML 문자열 삽입 없음).
import { useMemo, type RefObject } from 'react';
import type { ProcessMap, StepNode } from '@/lib/types';
import { computeLayout, edgeGeom, halfSize, wrapText } from '@/lib/layout';
import { LANE_H, TYPES } from '@/lib/constants';
import { daysOverdue, isOverdue, isTrackable, progressOf } from '@/lib/status';

interface Props {
  map: ProcessMap;
  selId: string | null;
  zoom: number;
  today: string;
  edit: boolean;
  onSelect: (id: string | null) => void;
  svgRef?: RefObject<SVGSVGElement | null>;
}

export function MapCanvas({ map, selId, zoom, today, edit, onSelect, svgRef }: Props) {
  const L = useMemo(() => computeLayout(map), [map]);
  const nById = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map.nodes]);

  if (!map.nodes.length) {
    return <div className="canvas"><div className="empty" style={{ width: '100%' }}>{edit ? '“+ 단계 추가” 또는 “텍스트로 빠르게 입력”으로 절차를 만들어 보세요.' : '아직 단계가 없습니다.'}</div></div>;
  }
  const W = L.W, H = L.H + L.extra;
  return (
    <div className="canvas">
      <div className="lane-col">
        {L.lanes.map((l) => <div key={l} className="lane-lbl" style={{ height: LANE_H * zoom }}>{l}</div>)}
        {L.extra > 0 && <div style={{ height: L.extra * zoom }} />}
      </div>
      <div className="scroll">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W * zoom} height={H * zoom}
          role="img" aria-label={`${map.title} 프로세스 흐름도`} onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path className="arrow" d="M0,0 L10,5 L0,10 z" />
            </marker>
          </defs>
          {L.lanes.map((l, i) => (
            <g key={l}>
              <rect className={`band${i % 2}`} x={0} y={i * LANE_H} width={W} height={LANE_H} onClick={() => onSelect(null)} />
              <line className="lane-sep" x1={0} x2={W} y1={(i + 1) * LANE_H} y2={(i + 1) * LANE_H} />
            </g>
          ))}
          {L.extra > 0 && <rect className="band0" x={0} y={L.H} width={W} height={L.extra} onClick={() => onSelect(null)} />}
          {L.edges.map((e) => {
            const g = edgeGeom(e, L, nById);
            return g ? <path key={e.id} className="edge" d={g.d} markerEnd="url(#arr)" /> : null;
          })}
          {L.edges.map((e) => {
            const g = edgeGeom(e, L, nById);
            return g && e.label ? <text key={'l' + e.id} className="edge-lbl" x={g.lx} y={g.ly} textAnchor={g.anchor}>{e.label}</text> : null;
          })}
          {map.nodes.map((n) => <NodeShape key={n.id} n={n} p={L.pos.get(n.id)!} selected={selId === n.id} today={today} onSelect={onSelect} />)}
        </svg>
      </div>
    </div>
  );
}

function NodeShape({ n, p, selected, today, onSelect }: { n: StepNode; p: { x: number; y: number }; selected: boolean; today: string; onSelect: (id: string) => void }) {
  const h = halfSize(n), t = n.type || 'task';
  const inv = t === 'start' || t === 'end';
  const lines = wrapText(n.label, t === 'decision' ? 6.6 : inv ? 8.6 : 10.2, t === 'decision' ? 3 : inv ? 1 : 2);
  const sub = [n.owner, n.system, n.time ? `${n.time}분` : ''].filter(Boolean).join(' / ');
  const showSub = !!sub && !inv && t !== 'decision';
  const blockH = lines.length * 15 + (showSub ? 13 : 0);
  const y0 = p.y - blockH / 2 + 11;
  const overdue = isOverdue(n, today);
  const days = daysOverdue(n, today);
  const prog = progressOf(n);

  let shape: React.ReactNode;
  if (inv) shape = <rect className={`nd nd-${t}`} x={p.x - h.w} y={p.y - h.h} width={h.w * 2} height={h.h * 2} rx={h.h} />;
  else if (t === 'decision') shape = <polygon className="nd nd-decision" points={`${p.x},${p.y - h.h} ${p.x + h.w},${p.y} ${p.x},${p.y + h.h} ${p.x - h.w},${p.y}`} />;
  else if (t === 'approval') shape = <>
    <rect className="nd nd-approval" x={p.x - h.w} y={p.y - h.h} width={h.w * 2} height={h.h * 2} rx={6} />
    <rect className="nd-approval-in" x={p.x - h.w + 4} y={p.y - h.h + 4} width={h.w * 2 - 8} height={h.h * 2 - 8} rx={3} />
  </>;
  else if (t === 'doc') shape = <path className="nd nd-doc" d={`M${p.x - h.w},${p.y - h.h} h${h.w * 2} v${h.h * 2 - 10} q${-h.w / 2},14 ${-h.w},0 t${-h.w},0 z`} />;
  else shape = <rect className="nd nd-task" x={p.x - h.w} y={p.y - h.h} width={h.w * 2} height={h.h * 2} rx={6} />;

  const rx = inv ? h.h + 5 : 9;
  return (
    <g className="node" tabIndex={0} role="button" aria-label={`${TYPES[t]}: ${n.label}${overdue ? ' (지연)' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(n.id); } }}>
      {selected && <rect className="selring" x={p.x - h.w - 5} y={p.y - h.h - 5} width={h.w * 2 + 10} height={h.h * 2 + 10} rx={rx} />}
      {overdue && !selected && <rect className="overdue-ring" x={p.x - h.w - 4} y={p.y - h.h - 4} width={h.w * 2 + 8} height={h.h * 2 + 8} rx={rx} />}
      {shape}
      {lines.map((ln, i) => <text key={i} className={`nd-text${inv ? ' inv' : ''}`} x={p.x} y={y0 + i * 15} textAnchor="middle">{ln}</text>)}
      {showSub && <text className="nd-sys" x={p.x} y={y0 + lines.length * 15} textAnchor="middle">{sub.length > 22 ? sub.slice(0, 21) + '…' : sub}</text>}
      {isTrackable(n) && <circle className={`st-dot st-${prog}`} cx={p.x - h.w + 4} cy={p.y - h.h + 4} r={5} />}
      {n.pain && <><circle className="pain" cx={p.x + h.w - 4} cy={p.y - h.h + 4} r={9} /><text className="pain-t" x={p.x + h.w - 4} y={p.y - h.h + 8} textAnchor="middle">!</text></>}
      {n.link && <><circle className="lnk" cx={p.x + h.w - 4} cy={p.y + h.h - 4} r={9} /><text className="lnk-t" x={p.x + h.w - 4} y={p.y + h.h - 0.5} textAnchor="middle">↗</text></>}
      {overdue && <><rect className="ov-badge" x={p.x - 22} y={p.y + h.h - 6} width={44} height={13} rx={6} /><text className="ov-t" x={p.x} y={p.y + h.h + 4} textAnchor="middle">지연 D+{days}</text></>}
    </g>
  );
}

/** 저장(다운로드)용 SVG 문자열 — 화면의 SVG 내용을 그대로 쓰고, 레인 이름·제목·고정 색상만 덧붙인다 */
export function buildExportSvg(map: ProcessMap, svgEl: SVGSVGElement): string {
  const L = computeLayout(map);
  const LW = 118, TOP = 46, W = L.W + LW, H = L.H + L.extra + TOP;
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const font = '"Noto Sans KR","Malgun Gothic",system-ui,sans-serif';
  const css = `
.band0{fill:#FFFFFF}.band1{fill:#F3F6F5}.lane-sep{stroke:#D6DDDB;stroke-width:1}.lane-name{fill:#17242D;font:700 13px ${font}}
.edge{fill:none;stroke:#5A6A72;stroke-width:1.6}.arrow{fill:#5A6A72}
.edge-lbl{fill:#17242D;font:700 11px ${font};paint-order:stroke;stroke:#FFFFFF;stroke-width:3.5px;stroke-linejoin:round}
.nd{stroke-width:1.6}.nd-task{fill:#FFFFFF;stroke:#17242D}.nd-start,.nd-end{fill:#17242D;stroke:#17242D}
.nd-decision{fill:#E8EDF9;stroke:#33529A}.nd-approval{fill:#F0E9FA;stroke:#6A3FA0}.nd-approval-in{fill:none;stroke:#6A3FA0;stroke-width:1}
.nd-doc{fill:#E4F2EE;stroke:#0B6E5C}.nd-text{fill:#17242D;font:500 12.5px ${font}}.nd-text.inv{fill:#FFFFFF}
.nd-sys{fill:#5A6A72;font:400 10.5px ${font}}.pain{fill:#B25E00}.pain-t{fill:#fff;font:700 11px ${font}}
.lnk{fill:#0B6E5C}.lnk-t{fill:#fff;font:700 10px ${font}}.selring{display:none}
.overdue-ring{fill:none;stroke:#B3261E;stroke-width:2.5;stroke-dasharray:5 3}.ov-badge{fill:#B3261E}.ov-t{fill:#fff;font:700 9.5px ${font}}
.st-dot{stroke:#FFFFFF;stroke-width:1.5}.st-todo{fill:#5A6A72}.st-doing{fill:#1F6FB2}.st-done{fill:#0B6E5C}.st-blocked{fill:#B25E00}
.title-t{fill:#17242D;font:700 16px ${font}}`;
  let labels = '';
  L.lanes.forEach((ln, i) => {
    labels += `<rect class="band${i % 2}" x="0" y="${TOP + i * LANE_H}" width="${LW}" height="${LANE_H}"/>`;
    const ls = wrapText(ln, 8.5, 3);
    ls.forEach((t, j) => { labels += `<text class="lane-name" x="12" y="${TOP + i * LANE_H + LANE_H / 2 - (ls.length - 1) * 8 + j * 16 + 4}">${esc(t)}</text>`; });
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><style>${css}</style>
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<text class="title-t" x="12" y="28">${esc(map.title || '')}</text>
${labels}<g transform="translate(${LW},${TOP})">${svgEl.innerHTML}</g></svg>`;
}
