// 메일 알림 (서버 전용). SMTP 환경변수가 모두 있으면 nodemailer 로 발송, 없으면 Outbox(queued)로 기록한다.
// 비밀값(SMTP_PASS 등)은 어떤 로그·응답에도 남기지 않는다.
import 'server-only';
import nodemailer from 'nodemailer';
import type { Dept, NoticeKind, NoticeStatus, ProcessMap, StepNode } from '../types';
import { PROGRESS } from '../constants';
import { laneOf, progressOf } from '../status';

export function smtpConfigured(): boolean {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  return !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && MAIL_FROM);
}

/** 알림 제목·본문 생성 */
export function buildMessage(map: ProcessMap, node: StepNode, kind: NoticeKind, baseUrl: string, dept?: Dept) {
  const subject = `[프로세스맵] ${map.title} — "${node.label}" ${kind === 'assign' ? '업무 배정' : '진행 요청'}`;
  const link = `${baseUrl}/map/${map.id}?node=${node.id}`;
  const body = [
    `${node.owner || '담당자'}님, 안녕하세요.`,
    '',
    kind === 'assign'
      ? `아래 업무 단계의 담당자로 지정되었습니다. 내용을 확인하고 진행해 주세요.`
      : `아래 업무 단계의 진행을 요청드립니다. 상태를 갱신해 주세요.`,
    '',
    `■ 프로세스: ${map.title}${dept ? ` (${dept.name})` : ''}`,
    `■ 단계: ${node.label}`,
    `■ 주관부서: ${laneOf(node)}`,
    `■ 담당자: ${node.owner || '-'}`,
    `■ R&R: ${node.rr || '-'}`,
    `■ 납기: ${node.due || '-'}`,
    `■ 현재 상태: ${PROGRESS[progressOf(node)]}`,
    '',
    `▶ 바로 열기: ${link}`,
    '',
    '— processmap 자동 알림',
  ].join('\n');
  return { subject, body };
}

/** 실제 발송. 성공 sent / 설정 없음 queued / 실패 failed */
export async function sendMail(to: string, subject: string, text: string): Promise<{ status: NoticeStatus; error?: string }> {
  if (!smtpConfigured()) return { status: 'queued' };
  try {
    const port = Number(process.env.SMTP_PORT);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
    return { status: 'sent' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '발송 실패';
    // 오류 메시지에 계정 정보가 섞이지 않도록 길이만 제한해 저장
    return { status: 'failed', error: msg.slice(0, 200) };
  }
}
