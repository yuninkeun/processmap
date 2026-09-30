'use client';
// 전사 현황: 숫자 카드 + 부서별 등록 현황 + 개선 후보 단계
import Link from 'next/link';
import { useState } from 'react';
import { useData } from '@/components/DataProvider';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { fmtDate, today } from '@/lib/constants';
import { isOverdue } from '@/lib/status';

export default function HomePage() {
  const { db, mapsOf, mapById, deptById, refresh } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const t = today();

  let pain = 0, cross = 0, overdue = 0;
  db.maps.forEach((m) => m.nodes.forEach((n) => {
    if (n.pain) pain++;
    if (isOverdue(n, t)) overdue++;
    if (n.link) { const x = mapById(n.link); if (x && x.deptId !== m.deptId) cross++; }
  }));
  const st = {
    depts: db.depts.length, maps: db.maps.length, final: db.maps.filter((m) => m.status === 'final').length,
    pain, cross, overdue, empty: db.depts.filter((d) => !mapsOf(d.id).length).length,
  };
  const painList = db.maps.flatMap((m) => m.nodes.filter((n) => n.pain).map((n) => ({ m, n })))
    .sort((a, b) => (b.m.updatedAt || '').localeCompare(a.m.updatedAt || ''));

  const seed = async () => {
    setBusy(true);
    try { await api.seed(); await refresh(); toast('샘플 데이터를 넣었습니다'); }
    catch (e) { toast(e instanceof Error ? e.message : '샘플을 넣지 못했습니다'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <h1>전사 프로세스맵 현황</h1>
      <p className="lead">각 부서가 등록한 업무 절차를 한곳에서 확인합니다. 단계마다 주관부서·담당자·납기를 지정하면 진행 현황에서 지연과 병목이 자동으로 집계됩니다.</p>
      <div className="figures">
        <div className="fig"><b>{st.depts}</b><span>부서</span></div>
        <div className="fig"><b>{st.maps}</b><span>프로세스맵</span></div>
        <div className="fig"><b>{st.final}</b><span>확정</span></div>
        <div className={`fig ${st.overdue ? 'alert' : ''}`}><b>{st.overdue}</b><span>지연 단계</span></div>
        <div className="fig"><b>{st.pain}</b><span>개선 후보 단계</span></div>
        <div className="fig"><b>{st.cross}</b><span>부서 간 연계</span></div>
        <div className="fig"><b>{st.empty}</b><span>맵 미등록 부서</span></div>
      </div>
      <div className="section">
        <h2>부서별 등록 현황</h2>
        {db.depts.length ? (
          <>
            <div className="grid-head cols-home"><span>부서</span><span>맵</span><span>확정</span><span>검토중</span><span>초안</span><span>지연</span><span>최근 수정</span></div>
            {db.depts.map((d) => {
              const ms = mapsOf(d.id);
              const od = ms.reduce((a, m) => a + m.nodes.filter((n) => isOverdue(n, t)).length, 0);
              const last = ms.map((m) => m.updatedAt).filter(Boolean).sort().pop();
              return (
                <Link key={d.id} className="grid-row cols-home" href={`/dept/${d.id}`}>
                  <span>{d.name}</span>
                  <span className="num">{ms.length}</span>
                  <span className="num">{ms.filter((m) => m.status === 'final').length}</span>
                  <span className="num">{ms.filter((m) => m.status === 'review').length}</span>
                  <span className="num">{ms.filter((m) => m.status === 'draft').length}</span>
                  <span className={`num ${od ? 'bad' : 'dim'}`}>{od}</span>
                  <span className="dim num">{fmtDate(last)}</span>
                </Link>
              );
            })}
          </>
        ) : (
          <div className="empty">
            아직 등록된 부서가 없습니다. 왼쪽의 “+ 부서 추가”로 시작하거나, 샘플 데이터로 먼저 둘러보세요.
            <div style={{ marginTop: 12 }}><button className="btn primary" disabled={busy} onClick={seed}>샘플 데이터 넣기</button></div>
          </div>
        )}
        {db.depts.length > 0 && db.maps.length === 0 && (
          <div className="banner info" style={{ marginTop: 12 }}>아직 프로세스맵이 없습니다. 부서를 열어 “+ 프로세스맵 추가”를 누르거나 <button className="btn small" disabled={busy} onClick={seed}>샘플 데이터 넣기</button></div>
        )}
      </div>
      <div className="section">
        <h2>개선 후보로 표시된 단계 {painList.length > 10 && <span className="dim" style={{ fontWeight: 400 }}>(최근 10건 / 전체 {painList.length}건)</span>}</h2>
        {painList.length ? painList.slice(0, 10).map(({ m, n }) => (
          <Link key={m.id + n.id} className="pain-row" href={`/map/${m.id}?node=${n.id}`}>
            <span className="pn">{n.label}</span>
            <span className="pw">{deptById(m.deptId)?.name || ''} / {m.title}{n.painNote ? ` — ${n.painNote}` : ''}</span>
          </Link>
        )) : <div className="empty">아직 개선 후보로 표시된 단계가 없습니다. 단계 편집에서 “개선 후보”를 체크하면 여기에 모입니다.</div>}
      </div>
    </>
  );
}
