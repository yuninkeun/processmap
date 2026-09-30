'use client';
// 부서 화면: 맵 목록, 이름 변경/삭제, 프로세스맵 추가
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useData } from '@/components/DataProvider';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { MapRow } from '@/components/MapRow';
import { api } from '@/lib/api';

export default function DeptPage() {
  const { id } = useParams<{ id: string }>();
  const { db, deptById, mapsOf, refresh } = useData();
  const router = useRouter();
  const toast = useToast();
  const d = deptById(id);
  const ms = d ? mapsOf(d.id) : [];
  const [modal, setModal] = useState<'rename' | 'delete' | 'new' | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [deptId, setDeptId] = useState(id);
  const [busy, setBusy] = useState(false);

  if (!d) return <div className="empty">부서를 찾을 수 없습니다. <Link href="/" className="btn small">전사 현황</Link></div>;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await refresh(); setModal(null); }
    catch (e) { toast(e instanceof Error ? e.message : '처리하지 못했습니다'); }
    finally { setBusy(false); }
  };
  const rename = () => run(async () => { await api.renameDept(d.id, name); toast('이름을 바꿨습니다'); });
  const del = () => run(async () => { await api.deleteDept(d.id); router.push('/'); });
  const create = () => run(async () => {
    const m = await api.createMap(deptId, title, purpose);
    router.push(`/map/${m.id}?edit=1`);
  });

  return (
    <>
      <p className="crumb"><Link href="/">전사 현황</Link></p>
      <div className="row">
        <h1>{d.name}</h1><span className="spacer" />
        <button className="btn small" onClick={() => { setName(d.name); setModal('rename'); }}>이름 변경</button>
        {!ms.length && <button className="btn small danger" onClick={() => setModal('delete')}>부서 삭제</button>}
        <button className="btn primary" onClick={() => { setDeptId(d.id); setTitle(''); setPurpose(''); setModal('new'); }}>+ 프로세스맵 추가</button>
      </div>
      <p className="lead">{ms.length ? `${ms.length}개의 프로세스맵이 등록되어 있습니다.` : '아직 등록된 프로세스맵이 없습니다.'}</p>
      <div className="section">
        {ms.length ? ms.map((m) => <MapRow key={m.id} map={m} />)
          : <div className="empty">“+ 프로세스맵 추가”로 첫 번째 업무 절차를 그려 보세요. 부서별 행(스윔레인)에 단계를 배치하고, 단계마다 담당자·R&R·납기를 지정할 수 있습니다.</div>}
      </div>

      {modal === 'rename' && (
        <Modal title="부서 이름 변경" onClose={() => setModal(null)} onSubmit={rename}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn primary" disabled={busy} onClick={rename}>변경</button></>}>
          <label className="f fld">부서명<input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="부서 삭제" onClose={() => setModal(null)}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn danger" disabled={busy} onClick={del}>삭제</button></>}>
          <p style={{ margin: 0 }}>“{d.name}” 부서를 삭제합니다. 등록된 맵이 없는 부서만 삭제할 수 있습니다.</p>
        </Modal>
      )}
      {modal === 'new' && (
        <Modal title="프로세스맵 추가" onClose={() => setModal(null)} onSubmit={create}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn primary" disabled={busy} onClick={create}>만들고 편집 시작</button></>}>
          <label className="f fld">부서<select value={deptId} onChange={(e) => setDeptId(e.target.value)}>{db.depts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="f fld">프로세스 이름<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 구매 발주 프로세스" maxLength={80} /></label>
          <label className="f fld">목적 (한 줄, 선택)<input value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={120} /></label>
        </Modal>
      )}
    </>
  );
}
