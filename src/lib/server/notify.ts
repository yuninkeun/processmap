// 알림 생성 공통 로직 (서버 전용): 이메일 검증 → 중복 방지 → 발송 → Notice 기록
import 'server-only';
import type { DB, Notice, NoticeKind, ProcessMap, StepNode } from '../types';
import { uid } from '../constants';
import { EMAIL_RE } from '../validate';
import { buildMessage, sendMail } from './mail';

const DEDUPE_MS = 60_000; // 같은 단계·같은 수신자에게 1분 내 중복 자동 발송 금지
const MAX_NOTICES = 500;  // 기록 보관 개수

export function baseUrlFrom(req: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

/** db 에 알림을 기록하고(필요하면 발송) 생성된 Notice 를 돌려준다. 이메일이 없거나 잘못되면 null. */
export async function createNotice(
  db: DB, map: ProcessMap, node: StepNode, kind: NoticeKind, baseUrl: string, opts?: { dedupe?: boolean },
): Promise<Notice | { error: string } | null> {
  const to = (node.ownerEmail || '').trim();
  if (!to) return { error: '담당자 이메일이 없습니다.' };
  if (!EMAIL_RE.test(to)) return { error: '담당자 이메일 형식이 올바르지 않습니다.' };
  if (opts?.dedupe) {
    const cut = Date.now() - DEDUPE_MS;
    const dup = db.notices.some((n) => n.nodeId === node.id && n.to === to && n.kind === kind && new Date(n.at).getTime() > cut);
    if (dup) return null;
  }
  const dept = db.depts.find((d) => d.id === map.deptId);
  const { subject, body } = buildMessage(map, node, kind, baseUrl, dept);
  const r = await sendMail(to, subject, body);
  const notice: Notice = {
    id: uid(), at: new Date().toISOString(), to, subject, body,
    mapId: map.id, nodeId: node.id, kind, status: r.status, ...(r.error ? { error: r.error } : {}),
  };
  db.notices.push(notice);
  if (db.notices.length > MAX_NOTICES) db.notices.splice(0, db.notices.length - MAX_NOTICES);
  return notice;
}
