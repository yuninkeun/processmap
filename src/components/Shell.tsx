'use client';
// 사이드바 + 본문 셸. 검색어가 있으면 본문 대신 검색 결과를 보여준다.
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useData } from './DataProvider';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { api } from '@/lib/api';
import { MapRow } from './MapRow';
import { isOverdue } from '@/lib/status';
import { today } from '@/lib/constants';

export function Shell({ children }: { children: React.ReactNode }) {
  const { db, loading, error, q, setQ, refresh, mapsOf, meta } = useData();
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [newDept, setNewDept] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const cur = (href: string) => (!q && (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined);
  const overdue = db.maps.reduce((a, m) => a + m.nodes.filter((n) => isOverdue(n, today())).length, 0);

  const addDept = async () => {
    if (!name.trim()) return toast('부서명을 입력해 주세요');
    setBusy(true);
    try {
      const d = await api.createDept(name.trim());
      await refresh();
      setNewDept(false); setName(''); setQ('');
      router.push(`/dept/${d.id}`);
    } catch (e) { toast(e instanceof Error ? e.message : '저장하지 못했습니다'); }
    finally { setBusy(false); }
  };

  return (
    <div className="shell">
      <aside className="side">
        <p className="brand">프로세스맵</p>
        <p className="brand-sub">부서별 업무 절차 등록 · 진행 현황</p>
        <input className="search" type="search" placeholder="맵·단계·담당 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="검색" />
        <nav className="navlist">
          <Link className="nav-item" href="/" aria-current={cur('/')} onClick={() => setQ('')}><span>전사 현황</span><span className="nav-count">{db.maps.length}</span></Link>
          <Link className="nav-item" href="/status" aria-current={cur('/status')} onClick={() => setQ('')}><span>진행 현황</span><span className={`nav-count ${overdue ? 'bad' : ''}`}>{overdue ? `지연 ${overdue}` : ''}</span></Link>
          <Link className="nav-item" href="/notifications" aria-current={cur('/notifications')} onClick={() => setQ('')}><span>알림 내역</span><span className="nav-count">{db.notices.length}</span></Link>
          <div className="nav-sep" />
          {db.depts.map((d) => (
            <Link key={d.id} className="nav-item" href={`/dept/${d.id}`} onClick={() => setQ('')}
              aria-current={!q && (path === `/dept/${d.id}` || db.maps.some((m) => path === `/map/${m.id}` && m.deptId === d.id)) ? 'page' : undefined}>
              <span>{d.name}</span><span className="nav-count">{mapsOf(d.id).length}</span>
            </Link>
          ))}
          <div className="nav-sep" />
          <button className="nav-item nav-add" onClick={() => setNewDept(true)}>+ 부서 추가</button>
        </nav>
        {meta.storage === 'memory' && <p className="mono-note" style={{ marginTop: 12 }}>파일에 저장할 수 없는 환경이라 서버가 재시작되면 데이터가 사라집니다. JSON 백업을 활용하세요.</p>}
      </aside>
      <main className="main">
        {loading ? <div className="empty">불러오는 중…</div>
          : error ? <div className="banner">{error} <button className="btn small" onClick={refresh}>다시 시도</button></div>
          : q.trim() ? <SearchView /> : children}
      </main>
      {newDept && (
        <Modal title="부서 추가" onClose={() => setNewDept(false)} onSubmit={addDept}
          actions={<><button className="btn" onClick={() => setNewDept(false)}>취소</button><button className="btn primary" disabled={busy} onClick={addDept}>추가</button></>}>
          <label className="f fld">부서명<input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 구매팀" maxLength={40} /></label>
        </Modal>
      )}
    </div>
  );
}

function SearchView() {
  const { db, q, deptById } = useData();
  const s = q.trim().toLowerCase();
  const hits = db.maps.filter((m) => {
    const hay = [m.title, m.purpose, m.owner, deptById(m.deptId)?.name]
      .concat(m.nodes.flatMap((n) => [n.label, n.lane, n.owner, n.ownerEmail, n.rr, n.system, n.note, n.painNote]))
      .join(' ').toLowerCase();
    return hay.includes(s);
  });
  return (
    <>
      <h1>검색 결과</h1>
      <p className="lead">“{q.trim()}” — {hits.length}건</p>
      <div className="section">{hits.length ? hits.map((m) => <MapRow key={m.id} map={m} showDept />) : <div className="empty">일치하는 프로세스맵이 없습니다.</div>}</div>
    </>
  );
}
