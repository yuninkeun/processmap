'use client';
// 프로세스맵 보기/편집 화면 전체 (헤더·툴바·캔버스·인스펙터·변경 이력·모달)
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapStatus, ProcessMap, Progress, StepNode } from '@/lib/types';
import { MAP_STATUS, PROGRESS, fmtDate, safeName, today, uid } from '@/lib/constants';
import { isTrackable, laneOf } from '@/lib/status';
import { newNode, parseQuick } from '@/lib/quick';
import { api } from '@/lib/api';
import { useData } from './DataProvider';
import { useToast } from './Toast';
import { Modal } from './Modal';
import { MapCanvas, buildExportSvg } from './MapCanvas';
import { Inspector } from './Inspector';

type ModalKind = 'save' | 'quick' | 'cancel' | 'delete' | 'conflict' | null;

export function MapView({ id }: { id: string }) {
  const { db, mapById, deptById, refresh } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const saved = mapById(id);

  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<ProcessMap | null>(null);
  const [snap, setSnap] = useState('');
  // ?node= 로 들어오면 해당 단계를 처음부터 선택 (없는 id 면 아무것도 선택되지 않음)
  const [sel, setSel] = useState<string | null>(() => params.get('node'));
  const [zoom, setZoom] = useState(1);
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [bump, setBump] = useState(false);
  const [quick, setQuick] = useState('');
  const [quickSE, setQuickSE] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const t = today();

  const startEdit = useCallback((m: ProcessMap) => {
    const d = structuredClone(m);
    setDraft(d); setSnap(JSON.stringify(d)); setEdit(true); setBump(false); setNote('');
  }, []);

  // ?edit=1 로 들어오면 데이터가 준비된 뒤 편집 모드로 시작 (최초 1회, URL 은 정리)
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || !saved) return;
    initRef.current = true;
    if (params.get('edit') === '1') {
      queueMicrotask(() => { startEdit(saved); router.replace(`/map/${id}`); });
    }
  }, [saved, params, id, router, startEdit]);

  const map = edit && draft ? draft : saved;
  const isDirty = edit && draft && JSON.stringify(draft) !== snap;

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [isDirty]);

  const savedNodeIds = useMemo(() => new Set((saved?.nodes || []).map((n) => n.id)), [saved]);

  if (!map) return <div className="empty">프로세스맵을 찾을 수 없습니다. <Link href="/" className="btn small">전사 현황</Link></div>;
  const dept = deptById(map.deptId);

  // ---- 편집 조작 ----
  const change = (fn: (m: ProcessMap) => void) => setDraft((d) => { if (!d) return d; const c = structuredClone(d); fn(c); return c; });
  const pickAfter = (d: ProcessMap): string | null => {
    if (!d.nodes.length) return null;
    if (sel && d.nodes.some((n) => n.id === sel)) return sel;
    const hasOut = new Set(d.edges.map((e) => e.from));
    const tail = [...d.nodes].reverse().find((n) => !hasOut.has(n.id) && n.type !== 'end');
    return tail ? tail.id : (d.nodes.find((n) => n.type === 'start') || d.nodes[0]).id;
  };
  const insertChain = (d: ProcessMap, afterId: string | null, chain: StepNode[]) => {
    chain.forEach((n) => d.nodes.push(n));
    for (let i = 0; i < chain.length - 1; i++) d.edges.push({ id: uid(), from: chain[i].id, to: chain[i + 1].id, label: '' });
    if (afterId) {
      const outs = d.edges.filter((e) => e.from === afterId && !chain.some((c) => c.id === e.to));
      if (outs.length === 1) outs[0].from = chain[chain.length - 1].id;
      d.edges.push({ id: uid(), from: afterId, to: chain[0].id, label: '' });
    }
  };
  const addNode = (afterId?: string) => {
    if (!draft) return;
    const after = afterId === undefined ? pickAfter(draft) : afterId;
    const ref = after ? draft.nodes.find((n) => n.id === after) : null;
    const isFirst = !draft.nodes.length;
    const n = newNode({ type: isFirst ? 'start' : 'task', label: isFirst ? '시작' : '새 단계', lane: ref ? laneOf(ref) : dept?.name || '' });
    change((d) => insertChain(d, after, [n]));
    setSel(n.id);
  };
  const delNode = (nid: string) => {
    change((d) => {
      const ins = d.edges.filter((e) => e.to === nid), outs = d.edges.filter((e) => e.from === nid);
      d.edges = d.edges.filter((e) => e.from !== nid && e.to !== nid);
      if (ins.length === 1 && outs.length === 1 && ins[0].from !== outs[0].to) d.edges.push({ id: uid(), from: ins[0].from, to: outs[0].to, label: outs[0].label || '' });
      d.nodes = d.nodes.filter((n) => n.id !== nid);
    });
    setSel(null);
  };
  const applyQuick = () => {
    if (!draft) return;
    if (!quick.trim()) return toast('입력된 내용이 없습니다');
    const selNode = sel ? draft.nodes.find((n) => n.id === sel) : undefined;
    const last = draft.nodes[draft.nodes.length - 1];
    const lane = selNode ? laneOf(selNode) : last ? laneOf(last) : dept?.name || '';
    const chain = parseQuick(quick, lane, quickSE && !draft.nodes.length);
    if (!chain.length) return;
    change((d) => insertChain(d, pickAfter(d), chain));
    setSel(chain[0].id); setModal(null); setQuick('');
    toast(`${chain.length}개 단계를 추가했습니다`);
  };
  const setMeta = (k: 'title' | 'purpose' | 'owner' | 'freq' | 'status', v: string) => change((d) => { (d as unknown as Record<string, string>)[k] = v; });

  // ---- 저장/취소/삭제 ----
  const exitEdit = () => { setEdit(false); setDraft(null); setModal(null); };
  const doSave = async (force: boolean) => {
    if (!draft) return;
    if (!draft.title.trim()) { toast('프로세스 이름을 입력해 주세요'); return; }
    setBusy(true);
    try {
      const r = await api.saveMap(draft, note, bump, force);
      await refresh();
      exitEdit();
      toast(r.notified ? `저장했습니다 · 담당자 알림 ${r.notified}건 생성` : '저장했습니다');
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) setModal('conflict'); else toast(err.message || '저장하지 못했습니다');
    } finally { setBusy(false); }
  };
  const doDelete = async () => {
    setBusy(true);
    try { await api.deleteMap(map.id); await refresh(); router.push(`/dept/${map.deptId}`); }
    catch (e) { toast(e instanceof Error ? e.message : '삭제하지 못했습니다'); setBusy(false); }
  };
  // 보기 모드에서 진행 STATUS 만 바로 바꿔 저장 (수행자용)
  const quickProgress = async (nid: string, p: Progress) => {
    if (!saved) return;
    const n = saved.nodes.find((x) => x.id === nid); if (!n) return;
    const next = structuredClone(saved);
    const x = next.nodes.find((q) => q.id === nid)!; x.progress = p;
    setBusy(true);
    try {
      await api.saveMap(next, `상태 변경: ${n.label} → ${PROGRESS[p]}`, false, false);
      await refresh(); toast(`“${n.label}” 상태를 ${PROGRESS[p]}(으)로 바꿨습니다`);
    } catch (e) { toast(e instanceof Error ? e.message : '상태를 바꾸지 못했습니다'); }
    finally { setBusy(false); }
  };
  const notify = async (nid: string) => {
    setBusy(true);
    try {
      const r = await api.notify(map.id, nid, 'remind');
      await refresh();
      toast(r.status === 'sent' ? `${r.to} 에게 메일을 보냈습니다` : r.status === 'queued' ? `SMTP 미설정 — 알림 내역(발송 대기)에 기록했습니다` : `발송 실패: ${r.error || ''}`);
    } catch (e) { toast(e instanceof Error ? e.message : '알림을 보내지 못했습니다'); }
    finally { setBusy(false); }
  };
  const download = (filename: string, data: string, type: string) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportSvg = () => { if (svgRef.current) download(safeName(map.title) + '.svg', buildExportSvg(map, svgRef.current), 'image/svg+xml'); else toast('내보낼 단계가 없습니다'); };
  const exportJson = () => download(safeName(map.title) + '.json', JSON.stringify(map, null, 2), 'application/json');

  const log = [...(map.changelog || [])].reverse();

  return (
    <>
      <p className="crumb"><Link href="/">전사 현황</Link> / <Link href={`/dept/${map.deptId}`}>{dept?.name || ''}</Link></p>
      {edit && draft ? (
        <>
          <input className="title-input" value={draft.title} maxLength={80} onChange={(e) => setMeta('title', e.target.value)} placeholder="프로세스 이름" aria-label="프로세스 이름" />
          <div className="form-grid">
            <label className="f wide">목적 (한 줄)<input value={draft.purpose || ''} maxLength={120} onChange={(e) => setMeta('purpose', e.target.value)} placeholder="예: 발주 요청부터 입고까지의 표준 절차" /></label>
            <label className="f">프로세스 오너<input value={draft.owner || ''} maxLength={60} onChange={(e) => setMeta('owner', e.target.value)} placeholder="예: 구매팀 홍길동" /></label>
            <label className="f">수행 빈도<input value={draft.freq || ''} maxLength={60} onChange={(e) => setMeta('freq', e.target.value)} placeholder="예: 주 5회, 월 1회" /></label>
            <label className="f">문서 상태<select value={draft.status} onChange={(e) => setMeta('status', e.target.value as MapStatus)}>{(Object.keys(MAP_STATUS) as MapStatus[]).map((k) => <option key={k} value={k}>{MAP_STATUS[k]}</option>)}</select></label>
          </div>
        </>
      ) : (
        <div className="mhead"><div className="grow">
          <h1>{map.title || '제목 없음'}</h1>
          {map.purpose && <p className="lead">{map.purpose}</p>}
          <div className="meta-line">
            <span className={`chip ${map.status || 'draft'}`}>{MAP_STATUS[map.status] || '초안'}</span>
            <span>v{map.version || 1}</span>
            {map.owner && <span>오너 {map.owner}</span>}
            {map.freq && <span>빈도 {map.freq}</span>}
            <span>최종 수정 {fmtDate(map.updatedAt)}</span>
          </div>
        </div></div>
      )}
      <div className="toolbar">
        {edit ? (
          <>
            <button className="btn" onClick={() => addNode()}>+ 단계 추가</button>
            <button className="btn" onClick={() => setModal('quick')}>텍스트로 빠르게 입력</button>
            <Zoom zoom={zoom} setZoom={setZoom} />
            <span className="spacer" />
            <button className="btn" onClick={() => (isDirty ? setModal('cancel') : exitEdit())}>취소</button>
            <button className="btn primary" disabled={busy} onClick={() => { if (!draft?.title.trim()) return toast('프로세스 이름을 입력해 주세요'); setBump(draft.status === 'final'); setModal('save'); }}>저장</button>
          </>
        ) : (
          <>
            <button className="btn primary" onClick={() => saved && startEdit(saved)}>편집</button>
            <button className="btn" onClick={exportSvg}>SVG로 저장</button>
            <button className="btn" onClick={exportJson}>JSON 백업</button>
            <Zoom zoom={zoom} setZoom={setZoom} />
            <span className="spacer" />
            <button className="btn danger" onClick={() => setModal('delete')}>삭제</button>
          </>
        )}
      </div>
      {edit && draft && <DraftHints map={draft} />}
      <div className="stage">
        <MapCanvas map={map} selId={sel} zoom={zoom} today={t} edit={edit} onSelect={setSel} svgRef={svgRef} />
        <Inspector map={map} edit={edit} selId={sel} today={t} depts={db.depts} allMaps={db.maps} onSelect={setSel}
          onChange={change} onAddAfter={(nid) => addNode(nid)} onDelete={delNode} onNotify={notify} onQuickProgress={quickProgress}
          busy={busy} savedNodeIds={savedNodeIds} />
      </div>
      {!edit && log.length > 0 && (
        <div className="hist">
          <h2>변경 이력</h2>
          {log.map((c, i) => <div key={i} className="hist-item"><b className="num">v{c.v}</b><span className="dim num">{fmtDate(c.at)}</span><span>{c.note || '(요약 없음)'}</span></div>)}
        </div>
      )}

      {modal === 'save' && draft && (
        <Modal title="저장" onClose={() => setModal(null)} onSubmit={() => doSave(false)}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn primary" disabled={busy} onClick={() => doSave(false)}>저장</button></>}>
          <label className="f fld">변경 요약 (선택)<input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="예: 검수 단계 추가" /></label>
          <label className="f fld check"><input type="checkbox" checked={bump} onChange={(e) => setBump(e.target.checked)} /> 새 버전으로 기록 (v{draft.version || 1} → v{(draft.version || 1) + 1})</label>
        </Modal>
      )}
      {modal === 'conflict' && (
        <Modal title="다른 사용자가 먼저 수정했습니다" onClose={() => setModal(null)}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn danger" disabled={busy} onClick={() => doSave(true)}>덮어쓰기</button></>}>
          <p style={{ margin: 0 }}>이 맵이 편집 중에 다른 사용자에 의해 저장되었습니다. 지금 저장하면 그 변경 내용이 내 편집본으로 덮어써집니다.</p>
        </Modal>
      )}
      {modal === 'cancel' && (
        <Modal title="편집 취소" onClose={() => setModal(null)}
          actions={<><button className="btn" onClick={() => setModal(null)}>계속 편집</button><button className="btn danger" onClick={exitEdit}>변경 버리기</button></>}>
          <p style={{ margin: 0 }}>저장하지 않은 변경 내용이 사라집니다. 편집을 취소할까요?</p>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="프로세스맵 삭제" onClose={() => setModal(null)}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn danger" disabled={busy} onClick={doDelete}>삭제</button></>}>
          <p style={{ margin: 0 }}>“{map.title}” 맵을 삭제합니다. 되돌릴 수 없습니다.</p>
        </Modal>
      )}
      {modal === 'quick' && draft && (
        <Modal title="텍스트로 빠르게 입력" onClose={() => setModal(null)}
          actions={<><button className="btn" onClick={() => setModal(null)}>취소</button><button className="btn primary" onClick={applyQuick}>단계 만들기</button></>}>
          <p className="mono-note" style={{ margin: '0 0 8px' }}>한 줄이 한 단계입니다. “부서: 단계명” 형식으로 쓰면 주관부서(행)가 지정되고, 부서를 생략하면 앞 줄과 같은 부서입니다. 줄 앞에 <b>?</b> 는 판단, <b>[승인]</b>, <b>[산출물]</b> 로 유형을 지정합니다. 순서대로 자동 연결됩니다.</p>
          <label className="f fld"><textarea className="big" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={'구매팀: 발주 요청서 접수\n구매팀: ? 재고가 충분한가\n구매팀: [승인] 팀장 발주 승인\n구매팀: SAP 발주 등록\nIQC: 입고 검사\nIQC: [산출물] 검사 성적서'} /></label>
          {!draft.nodes.length && <label className="f check"><input type="checkbox" checked={quickSE} onChange={(e) => setQuickSE(e.target.checked)} /> 첫 줄을 시작, 마지막 줄을 종료로 지정</label>}
        </Modal>
      )}
    </>
  );
}

/** UX 개선: 저장 전에 빠진 정보(담당자·이메일·납기)를 한 줄로 알려 준다 */
function DraftHints({ map }: { map: ProcessMap }) {
  const steps = map.nodes.filter(isTrackable);
  const noOwner = steps.filter((n) => !n.owner).length;
  const noEmail = steps.filter((n) => n.owner && !n.ownerEmail).length;
  const noDue = steps.filter((n) => !n.due).length;
  if (!steps.length || (!noOwner && !noEmail && !noDue)) return <div className="banner info">모든 단계에 담당자·납기가 지정되어 있습니다. 저장하면 진행 현황에 바로 집계됩니다.</div>;
  const parts = [noOwner && `담당자 미지정 ${noOwner}`, noEmail && `이메일 없음 ${noEmail}`, noDue && `납기 미지정 ${noDue}`].filter(Boolean).join(' · ');
  return <div className="banner">저장 전 확인: {parts} — 단계를 클릭해 오른쪽 패널에서 채워 주세요. (지정하지 않아도 저장은 됩니다)</div>;
}

function Zoom({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  const step = (d: number) => setZoom(Math.min(1.6, Math.max(0.5, +(zoom + d).toFixed(2))));
  return (
    <span className="zoom">
      <button className="btn small" onClick={() => step(-0.15)} aria-label="축소">−</button>
      <span className="num dim">{Math.round(zoom * 100)}%</span>
      <button className="btn small" onClick={() => step(0.15)} aria-label="확대">+</button>
    </span>
  );
}
