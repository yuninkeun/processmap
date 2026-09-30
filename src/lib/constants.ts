// 화면 공통 상수·간단한 헬퍼 (클라이언트/서버 공용)
import type { MapStatus, NodeType, Progress } from './types';

export const TYPES: Record<NodeType, string> = {
  start: '시작',
  task: '업무',
  decision: '판단',
  approval: '승인',
  doc: '산출물',
  end: '종료',
};

export const MAP_STATUS: Record<MapStatus, string> = {
  draft: '초안',
  review: '검토중',
  final: '확정',
};

export const PROGRESS: Record<Progress, string> = {
  todo: '대기',
  doing: '진행중',
  done: '완료',
  blocked: '보류',
};

export const SYSTEMS = ['SAP B1', 'MES', '엑셀', '메일', 'Teams', '수기', '기타'];

/** 흐름도 배치 상수 */
export const COL_W = 196;
export const LANE_H = 124;
export const PAD_X = 24;

export const UNASSIGNED = '담당 미지정';

/** 짧은 무작위 id */
export const uid = () => Math.random().toString(36).slice(2, 10);

/** ISO 문자열 → YYYY-MM-DD (없으면 '-') */
export const fmtDate = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 오늘 날짜 YYYY-MM-DD (로컬 기준) */
export const today = () => fmtDate(new Date().toISOString());

/** 파일 이름에 쓸 수 없는 문자를 _ 로 치환 */
export const safeName = (s?: string) => (s || 'process').replace(/[\\/:*?"<>|\s]+/g, '_');
