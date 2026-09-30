// 텍스트로 빠르게 입력: 한 줄 = 한 단계. "부서: 단계명" 이면 주관부서 지정, 줄 앞 ? = 판단, [승인], [산출물] 로 유형 지정.
import type { StepNode, NodeType } from './types';
import { uid } from './constants';

export const newNode = (over?: Partial<StepNode>): StepNode => ({
  id: uid(), type: 'task', label: '새 단계', lane: '', progress: 'todo', ...over,
});

export function parseQuick(text: string, defaultLane: string, addStartEnd: boolean): StepNode[] {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  let lane = defaultLane;
  const out: StepNode[] = [];
  for (const ln of lines) {
    let l = ln;
    let ty: NodeType = 'task';
    const m = l.match(/^([^:：|]{1,20})[:：|]\s*(.+)$/);
    if (m) { lane = m[1].trim(); l = m[2].trim(); }
    if (/^[?？]/.test(l)) { ty = 'decision'; l = l.replace(/^[?？]\s*/, ''); }
    else if (/^\[승인\]/.test(l)) { ty = 'approval'; l = l.replace(/^\[승인\]\s*/, ''); }
    else if (/^\[산출물\]/.test(l)) { ty = 'doc'; l = l.replace(/^\[산출물\]\s*/, ''); }
    if (!l) continue;
    out.push(newNode({ type: ty, label: l.slice(0, 120), lane: lane.slice(0, 40) }));
  }
  if (addStartEnd && out.length >= 2) { out[0].type = 'start'; out[out.length - 1].type = 'end'; }
  return out;
}
