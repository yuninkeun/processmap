'use client';
// 알림 내역: 발송/대기(Outbox)/실패 목록. SMTP 가 없으면 mailto: 로 직접 보낼 수 있다. (must 2)
import Link from 'next/link';
import { useState } from 'react';
import { useData } from '@/components/DataProvider';
import type { Notice } from '@/lib/types';

const STATUS_LABEL: Record<Notice['status'], string> = { sent: '발송됨', queued: '발송 대기', failed: '실패' };

export default function NotificationsPage() {
  const { db, meta, mapById } = useData();
  const [open, setOpen] = useState<string | null>(null);
  const list = [...db.notices].sort((a, b) => b.at.localeCompare(a.at));
  const fmt = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR', { hour12: false }); };
  const mailto = (n: Notice) => `mailto:${encodeURIComponent(n.to)}?subject=${encodeURIComponent(n.subject)}&body=${encodeURIComponent(n.body)}`;

  return (
    <>
      <h1>알림 내역</h1>
      <p className="lead">단계 저장 시 담당자 이메일이 새로 지정·변경되면 자동으로 “업무 배정” 알림이 만들어지고, 단계 패널의 “담당자에게 알림”으로 진행 요청을 보낼 수 있습니다.</p>
      {meta.smtp
        ? <div className="banner info">SMTP 가 설정되어 있어 알림이 실제 메일로 발송됩니다.</div>
        : <div className="banner">SMTP 가 설정되지 않아 알림이 <b>발송 대기함</b>에만 기록됩니다. “메일 앱으로 보내기”로 직접 보내거나, 서버 <code>.env</code>에 <code>SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM</code> 을 넣으면 자동 발송됩니다.</div>}
      <div className="section">
        {list.length ? (
          <>
            <div className="grid-head cols-notice"><span>시각</span><span>수신자</span><span>제목</span><span>상태</span><span>보내기</span></div>
            {list.map((n) => (
              <div key={n.id}>
                <div className="grid-row cols-notice" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === n.id ? null : n.id)}>
                  <span className="dim num">{fmt(n.at)}</span>
                  <span>{n.to}</span>
                  <span>{n.subject}</span>
                  <span><span className={`chip ${n.status === 'sent' ? 'done' : n.status === 'queued' ? 'blocked' : 'overdue'}`}>{STATUS_LABEL[n.status]}</span></span>
                  <span><a className="btn small" href={mailto(n)} onClick={(e) => e.stopPropagation()}>메일 앱으로</a></span>
                </div>
                {open === n.id && (
                  <div style={{ padding: '10px 6px 14px', borderBottom: '1px solid var(--line)' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: 13 }}>{n.body}</pre>
                    {n.error && <p className="bad" style={{ margin: '8px 0 0' }}>오류: {n.error}</p>}
                    {mapById(n.mapId) && <p style={{ margin: '8px 0 0' }}><Link className="btn small" href={`/map/${n.mapId}?node=${n.nodeId}`}>해당 단계 열기</Link></p>}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : <div className="empty">아직 알림이 없습니다. 프로세스맵의 단계에 담당자 이메일을 지정하고 저장하면 여기에 기록됩니다.</div>}
      </div>
    </>
  );
}
