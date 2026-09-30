// 서버 입력 검증 — 사용자 입력은 신뢰하지 않는다. 형식·길이를 확인하고 정리된 값만 저장한다.
import type { Edge, MapStatus, NodeType, ProcessMap, Progress, StepNode } from './types';

const NODE_TYPES: NodeType[] = ['start', 'task', 'decision', 'approval', 'doc', 'end'];
const MAP_STATUSES: MapStatus[] = ['draft', 'review', 'final'];
const PROGRESSES: Progress[] = ['todo', 'doing', 'done', 'blocked'];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown, max: number): string | null => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return null;
  const s = v.replace(/\r/g, '').trim();
  return s.length > max ? null : s;
};

const oneOf = <T extends string>(v: unknown, list: T[], def: T): T | null => {
  if (v === undefined || v === null || v === '') return def;
  return list.includes(v as T) ? (v as T) : null;
};

export function validateDeptName(v: unknown): Result<string> {
  const s = str(v, 40);
  if (s === null) return { ok: false, error: '부서명은 40자 이하의 문자열이어야 합니다.' };
  if (!s) return { ok: false, error: '부서명을 입력해 주세요.' };
  return { ok: true, value: s };
}

export function validateEmail(v: unknown): Result<string> {
  const s = str(v, 120);
  if (s === null) return { ok: false, error: '이메일이 너무 깁니다.' };
  if (s && !EMAIL_RE.test(s)) return { ok: false, error: `이메일 형식이 올바르지 않습니다: ${s.slice(0, 40)}` };
  return { ok: true, value: s };
}

export function validateMapMeta(v: Record<string, unknown>): Result<Pick<ProcessMap, 'title' | 'purpose' | 'owner' | 'freq' | 'status'>> {
  const title = str(v.title, 80);
  if (title === null) return { ok: false, error: '프로세스 이름은 80자 이하여야 합니다.' };
  if (!title) return { ok: false, error: '프로세스 이름을 입력해 주세요.' };
  const purpose = str(v.purpose, 120);
  const owner = str(v.owner, 60);
  const freq = str(v.freq, 60);
  if (purpose === null || owner === null || freq === null) return { ok: false, error: '목적(120자)·담당(60자)·빈도(60자) 길이를 확인해 주세요.' };
  const status = oneOf(v.status, MAP_STATUSES, 'draft');
  if (!status) return { ok: false, error: '상태 값이 올바르지 않습니다.' };
  return { ok: true, value: { title, purpose, owner, freq, status } };
}

function validateNode(raw: unknown, idx: number): Result<StepNode> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: `${idx + 1}번째 단계 형식이 올바르지 않습니다.` };
  const v = raw as Record<string, unknown>;
  const id = str(v.id, 40);
  const label = str(v.label, 120);
  const lane = str(v.lane, 40);
  const owner = str(v.owner, 40);
  const rr = str(v.rr, 200);
  const note = str(v.note, 500);
  const painNote = str(v.painNote, 500);
  const system = str(v.system, 40);
  const link = str(v.link, 40);
  const due = str(v.due, 10);
  if ([id, label, lane, owner, rr, note, painNote, system, link, due].some((x) => x === null))
    return { ok: false, error: `${idx + 1}번째 단계의 글자 수 제한(단계명 120·R&R 200·비고 500)을 확인해 주세요.` };
  if (!id) return { ok: false, error: `${idx + 1}번째 단계에 id가 없습니다.` };
  if (!label) return { ok: false, error: `${idx + 1}번째 단계의 이름이 비어 있습니다.` };
  const type = oneOf(v.type, NODE_TYPES, 'task');
  const progress = oneOf(v.progress, PROGRESSES, 'todo');
  if (!type || !progress) return { ok: false, error: `${idx + 1}번째 단계의 유형/상태 값이 올바르지 않습니다.` };
  const email = validateEmail(v.ownerEmail);
  if (!email.ok) return email;
  if (due && !DATE_RE.test(due)) return { ok: false, error: `${idx + 1}번째 단계의 납기일 형식은 YYYY-MM-DD 여야 합니다.` };
  let time: number | '' = '';
  if (v.time !== undefined && v.time !== '' && v.time !== null) {
    const n = Number(v.time);
    if (!isFinite(n) || n < 0 || n > 100000) return { ok: false, error: `${idx + 1}번째 단계의 소요 시간이 올바르지 않습니다.` };
    time = Math.round(n);
  }
  return {
    ok: true,
    value: {
      id: id!, type, label: label!, lane: lane!, owner: owner!, ownerEmail: email.value, rr: rr!, due: due!,
      progress, system: system!, time, note: note!, pain: !!v.pain, painNote: painNote!, link: link!,
    },
  };
}

/** 저장 요청의 nodes/edges 전체 검증 (id 중복·깨진 연결 포함) */
export function validateGraph(nodesRaw: unknown, edgesRaw: unknown): Result<{ nodes: StepNode[]; edges: Edge[] }> {
  if (!Array.isArray(nodesRaw) || !Array.isArray(edgesRaw)) return { ok: false, error: '단계/연결 목록 형식이 올바르지 않습니다.' };
  if (nodesRaw.length > 300 || edgesRaw.length > 600) return { ok: false, error: '단계는 300개, 연결은 600개까지 저장할 수 있습니다.' };
  const nodes: StepNode[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < nodesRaw.length; i++) {
    const r = validateNode(nodesRaw[i], i);
    if (!r.ok) return r;
    if (ids.has(r.value.id)) return { ok: false, error: '단계 id가 중복되었습니다.' };
    ids.add(r.value.id);
    nodes.push(r.value);
  }
  const edges: Edge[] = [];
  for (const raw of edgesRaw) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Record<string, unknown>;
    const id = str(e.id, 40), from = str(e.from, 40), to = str(e.to, 40), label = str(e.label, 40);
    if (!id || !from || !to || label === null) return { ok: false, error: '연결 정보가 올바르지 않습니다(조건 40자 이하).' };
    if (!ids.has(from) || !ids.has(to)) return { ok: false, error: '존재하지 않는 단계로 연결되어 있습니다.' };
    edges.push({ id, from, to, label });
  }
  return { ok: true, value: { nodes, edges } };
}
