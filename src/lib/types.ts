// 데이터 모델 정의 — DESIGN.md 2절과 동일하게 유지한다.

/** 단계(노드) 유형: 시작·업무·판단·승인·산출물·종료 */
export type NodeType = 'start' | 'task' | 'decision' | 'approval' | 'doc' | 'end';

/** 맵 문서 상태: 초안·검토중·확정 */
export type MapStatus = 'draft' | 'review' | 'final';

/** 단계 진행 STATUS: 대기·진행중·완료·보류 (4개 고정) */
export type Progress = 'todo' | 'doing' | 'done' | 'blocked';

export interface Dept {
  id: string;
  name: string;
  order: number;
}

export interface StepNode {
  id: string;
  type: NodeType;
  label: string;
  /** 주관부서명(스윔레인). 비어 있으면 '담당 미지정'으로 취급 */
  lane: string;
  /** 담당자 이름 */
  owner?: string;
  /** 담당자 이메일(알림 대상) */
  ownerEmail?: string;
  /** R&R 한 줄 */
  rr?: string;
  /** 납기일 YYYY-MM-DD */
  due?: string;
  /** 진행 STATUS (기본 todo) */
  progress?: Progress;
  system?: string;
  time?: number | '';
  note?: string;
  pain?: boolean;
  painNote?: string;
  /** 연계 맵 id */
  link?: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface ChangeLog {
  v: number;
  at: string;
  note: string;
}

export interface ProcessMap {
  id: string;
  deptId: string;
  title: string;
  purpose?: string;
  owner?: string;
  freq?: string;
  status: MapStatus;
  version: number;
  rev: number;
  nodes: StepNode[];
  edges: Edge[];
  changelog: ChangeLog[];
  updatedAt: string;
}

export type NoticeKind = 'assign' | 'remind';
export type NoticeStatus = 'sent' | 'queued' | 'failed';

/** 메일 알림 기록 (Outbox 겸 발송 이력) */
export interface Notice {
  id: string;
  at: string;
  to: string;
  subject: string;
  body: string;
  mapId: string;
  nodeId: string;
  kind: NoticeKind;
  status: NoticeStatus;
  error?: string;
}

export interface DB {
  depts: Dept[];
  maps: ProcessMap[];
  notices: Notice[];
}

export const emptyDB = (): DB => ({ depts: [], maps: [], notices: [] });
