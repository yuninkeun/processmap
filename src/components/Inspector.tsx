'use client';
// 오른쪽 패널: 단계 상세(보기) / 단계 편집(편집). 담당 배정·R&R·납기·진행 STATUS 를 여기서 입력한다.
import Link from 'next/link';
import type { Dept, NodeType, ProcessMap, Progress, StepNode } from '@/lib/types';
import { PROGRESS, SYSTEMS, TYPES } from '@/lib/constants';
import { daysOverdue, isOverdue, isTrackable, laneOf, progressOf } from '@/lib/status';

interface Props {
  map: ProcessMap;
  edit: boolean;
  selId: string | null;
  today: string;
  depts: Dept[];
  allMaps: ProcessMap[];
  onSelect: (id: string | null) => void;
  onChange: (fn: (m: ProcessMap) => void) => void;
  onAddAfter: (id: string) => void;
  onDelete: (id: string) => void;
  onNotify: (id: string) => void;
  onQuickProgress: (id: string, p: Progress) => void;
  busy: boolean;
  savedNodeIds: Set<string>;
}

export function Inspector(props: Props) {
  const { map, edit, selId, today, depts, allMaps, onSelect, onChange, onAddAfter, onDelete, onNotify, onQuickProgress, busy, savedNodeIds } = props;
  const n = map.nodes.find((x) => x.id === selId);
  const deptById = (id: string) => depts.find((d) => d.id === id);

  if (!n) {
    const pains = map.nodes.filter((x) => x.pain);
    const overdue = map.nodes.filter((x) => isOverdue(x, today));
    const links = map.nodes.filter((x) => x.link && allMaps.some((m) => m.id === x.link));
    return (
      <aside className="insp" aria-live="polite">
        <h2>{edit ? '단계 편집' : '단계 상세'}</h2>
        <Legend />
        <p className="mono-note">{edit ? '흐름도에서 단계를 선택하면 담당·R&R·납기·연결을 편집할 수 있습니다. 새 단계는 선택한 단계 뒤에 삽입됩니다.' : '흐름도에서 단계를 선택하면 상세 내용이 표시됩니다.'}</p>
        {overdue.length > 0 && <><h2 style={{ marginTop: 14 }} className="bad">지연 ({overdue.length})</h2>
          {overdue.map((p) => <button key={p.id} className="pain-row compact" onClick={() => onSelect(p.id)}><span className="pn">{p.label}</span><span className="pw">{p.owner || '담당 미지정'} · 납기 {p.due} · D+{daysOverdue(p, today)}</span></button>)}</>}
        {pains.length > 0 && <><h2 style={{ marginTop: 14 }}>개선 후보 ({pains.length})</h2>
          {pains.map((p) => <button key={p.id} className="pain-row compact" onClick={() => onSelect(p.id)}><span className="pn">{p.label}</span>{p.painNote && <span className="pw">{p.painNote}</span>}</button>)}</>}
        {links.length > 0 && <><h2 style={{ marginTop: 14 }}>연계 프로세스</h2>
          {links.map((p) => { const t = allMaps.find((m) => m.id === p.link)!; return <Link key={p.id} className="pain-row compact" href={`/map/${t.id}`}><span className="pn">{t.title}</span><span className="pw">{deptById(t.deptId)?.name || ''} / {p.label}</span></Link>; })}</>}
      </aside>
    );
  }

  const outs = map.edges.filter((e) => e.from === n.id);
  const nodeName = (id: string) => map.nodes.find((q) => q.id === id)?.label || '(삭제됨)';
  const lk = n.link ? allMaps.find((m) => m.id === n.link) : null;
  const overdue = isOverdue(n, today);
  const canNotify = !!n.ownerEmail && savedNodeIds.has(n.id);

  if (!edit) {
    return (
      <aside className="insp" aria-live="polite">
        <h2>{n.label}</h2>
        <dl className="kv"><dt>유형</dt><dd>{TYPES[n.type] || '업무'}</dd></dl>
        <dl className="kv"><dt>주관부서</dt><dd>{laneOf(n)}</dd></dl>
        {isTrackable(n) && (
          <div className="assign-box">
            <h3>담당 · 진행</h3>
            <dl className="kv"><dt>담당자</dt><dd className={n.owner ? '' : 'warn'}>{n.owner || '담당 미지정'}{n.ownerEmail ? ` (${n.ownerEmail})` : ''}</dd></dl>
            {n.rr && <dl className="kv"><dt>R&R</dt><dd>{n.rr}</dd></dl>}
            <dl className="kv"><dt>납기</dt><dd className={overdue ? 'bad' : ''}>{n.due || '-'}{overdue ? ` · 지연 D+${daysOverdue(n, today)}` : ''}</dd></dl>
            <label className="f fld">진행 STATUS
              <select value={progressOf(n)} disabled={busy} onChange={(e) => onQuickProgress(n.id, e.target.value as Progress)}>
                {(Object.keys(PROGRESS) as Progress[]).map((k) => <option key={k} value={k}>{PROGRESS[k]}</option>)}
              </select>
            </label>
            <button className="btn small" disabled={!canNotify || busy} onClick={() => onNotify(n.id)} title={canNotify ? '담당자에게 진행 요청 메일' : '담당자 이메일이 있어야 보낼 수 있습니다'}>담당자에게 알림</button>
          </div>
        )}
        {n.system && <dl className="kv"><dt>사용 시스템</dt><dd>{n.system}</dd></dl>}
        {!!n.time && <dl className="kv"><dt>소요 시간</dt><dd>{n.time}분</dd></dl>}
        {n.note && <dl className="kv"><dt>비고</dt><dd>{n.note}</dd></dl>}
        {n.pain && <dl className="kv"><dt>개선 후보</dt><dd className="warn">{n.painNote || '표시됨'}</dd></dl>}
        {outs.length > 0 && <dl className="kv"><dt>다음 단계</dt><dd>{outs.map((e) => (e.label ? `[${e.label}] ` : '') + nodeName(e.to)).join('\n')}</dd></dl>}
        {lk && <Link className="btn small" href={`/map/${lk.id}`}>연계: {deptById(lk.deptId)?.name || ''} / {lk.title}</Link>}
      </aside>
    );
  }

  // ---- 편집 모드 ----
  const setF = <K extends keyof StepNode>(k: K, v: StepNode[K]) => onChange((m) => { const x = m.nodes.find((q) => q.id === n.id); if (x) x[k] = v; });
  const setE = (eid: string, k: 'to' | 'label', v: string) => onChange((m) => { const e = m.edges.find((q) => q.id === eid); if (!e) return; if (k === 'to') e.to = v; else e.label = v; });
  const lanes = [...new Set(depts.map((d) => d.name).concat(map.nodes.map(laneOf)))];
  const targets = map.nodes.filter((x) => x.id !== n.id);
  const others = allMaps.filter((x) => x.id !== map.id);
  const addEdge = () => {
    const cands = targets.filter((x) => !outs.some((e) => e.to === x.id));
    if (!cands.length) return;
    onChange((m) => { m.edges.push({ id: Math.random().toString(36).slice(2, 10), from: n.id, to: cands[0].id, label: '' }); });
  };

  return (
    <aside className="insp" aria-live="polite">
      <h2>단계 편집</h2>
      <label className="f fld">단계명<textarea rows={2} value={n.label} maxLength={120} onChange={(e) => setF('label', e.target.value)} /></label>
      <div className="two">
        <label className="f fld">유형<select value={n.type} onChange={(e) => setF('type', e.target.value as NodeType)}>{(Object.keys(TYPES) as NodeType[]).map((k) => <option key={k} value={k}>{TYPES[k]}</option>)}</select></label>
        <label className="f fld">주관부서 (행)<input list="dl-lanes" value={n.lane || ''} maxLength={40} onChange={(e) => setF('lane', e.target.value)} placeholder="예: 구매팀" />
          <datalist id="dl-lanes">{lanes.map((l) => <option key={l} value={l} />)}</datalist></label>
      </div>
      {isTrackable(n) && (
        <div className="assign-box">
          <h3>담당 배정 · R&R · 납기</h3>
          <div className="two">
            <label className="f fld">담당자<input value={n.owner || ''} maxLength={40} onChange={(e) => setF('owner', e.target.value)} placeholder="예: 홍길동" /></label>
            <label className="f fld">담당자 이메일<input type="email" value={n.ownerEmail || ''} maxLength={120} onChange={(e) => setF('ownerEmail', e.target.value.trim())} placeholder="hong@company.com" /></label>
          </div>
          <label className="f fld">R&R (역할·책임 한 줄)<input value={n.rr || ''} maxLength={200} onChange={(e) => setF('rr', e.target.value)} placeholder="예: 요청서 검토 후 2일 내 승인" /></label>
          <div className="two">
            <label className="f fld">납기일<input type="date" value={n.due || ''} onChange={(e) => setF('due', e.target.value)} /></label>
            <label className="f fld">진행 STATUS<select value={progressOf(n)} onChange={(e) => setF('progress', e.target.value as Progress)}>{(Object.keys(PROGRESS) as Progress[]).map((k) => <option key={k} value={k}>{PROGRESS[k]}</option>)}</select></label>
          </div>
          <p className="mono-note" style={{ margin: 0 }}>{n.ownerEmail ? '저장하면 담당자에게 “업무 배정” 메일 알림이 자동으로 만들어집니다.' : '이메일을 넣으면 저장 시 담당자에게 알림이 갑니다.'}</p>
        </div>
      )}
      <div className="two">
        <label className="f fld">사용 시스템<input list="dl-sys" value={n.system || ''} maxLength={40} onChange={(e) => setF('system', e.target.value)} />
          <datalist id="dl-sys">{SYSTEMS.map((s) => <option key={s} value={s} />)}</datalist></label>
        <label className="f fld">소요(분)<input type="number" min={0} value={n.time ?? ''} onChange={(e) => setF('time', e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value))))} /></label>
      </div>
      <label className="f fld">비고<textarea rows={2} value={n.note || ''} maxLength={500} onChange={(e) => setF('note', e.target.value)} /></label>
      <label className="f fld check"><input type="checkbox" checked={!!n.pain} onChange={(e) => setF('pain', e.target.checked)} /> 개선 후보 (번거롭거나 반복되는 단계)</label>
      {n.pain && <label className="f fld">무엇이 번거로운가요?<textarea rows={2} value={n.painNote || ''} maxLength={500} onChange={(e) => setF('painNote', e.target.value)} /></label>}
      <label className="f fld">연계 프로세스 (다른 맵으로 이동)
        <select value={n.link || ''} onChange={(e) => setF('link', e.target.value)}>
          <option value="">없음</option>
          {depts.map((d) => { const ms = others.filter((x) => x.deptId === d.id); return ms.length ? <optgroup key={d.id} label={d.name}>{ms.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</optgroup> : null; })}
        </select>
      </label>
      <h2 style={{ marginTop: 12 }}>다음 단계</h2>
      {outs.length ? outs.map((e) => (
        <div className="edge-edit" key={e.id}>
          <select value={e.to} onChange={(ev) => setE(e.id, 'to', ev.target.value)}>{targets.map((t) => <option key={t.id} value={t.id}>{t.label.slice(0, 24)}</option>)}</select>
          <input value={e.label || ''} maxLength={40} onChange={(ev) => setE(e.id, 'label', ev.target.value)} placeholder={n.type === 'decision' ? '예/아니오' : '조건'} aria-label="분기 조건" />
          <button className="icon-btn" onClick={() => onChange((m) => { m.edges = m.edges.filter((x) => x.id !== e.id); })} aria-label="연결 삭제">✕</button>
        </div>
      )) : <p className="mono-note">연결된 다음 단계가 없습니다.</p>}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn small" onClick={addEdge} disabled={!targets.length}>+ 연결 추가</button>
        <button className="btn small" onClick={() => onAddAfter(n.id)}>이 단계 뒤에 새 단계</button>
      </div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn small danger" onClick={() => onDelete(n.id)}>이 단계 삭제</button></div>
    </aside>
  );
}

function Legend() {
  const sw = (label: string, inner: React.ReactNode) => <span><svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">{inner}</svg>{label}</span>;
  return (
    <div className="legend">
      {sw(TYPES.start, <rect className="nd nd-start" x="2" y="3" width="22" height="10" rx="5" />)}
      {sw(TYPES.task, <rect className="nd nd-task" x="2" y="2" width="22" height="12" rx="3" />)}
      {sw(TYPES.decision, <polygon className="nd nd-decision" points="13,1 24,8 13,15 2,8" />)}
      {sw(TYPES.approval, <><rect className="nd nd-approval" x="2" y="2" width="22" height="12" rx="3" /><rect className="nd-approval-in" x="5" y="5" width="16" height="6" rx="1" /></>)}
      {sw(TYPES.doc, <path className="nd nd-doc" d="M2,2 h22 v9 q-5.5,5 -11,0 t-11,0 z" />)}
      {sw('개선 후보', <><circle className="pain" cx="13" cy="8" r="7" /><text className="pain-t" x="13" y="12" textAnchor="middle">!</text></>)}
      {sw('지연', <rect className="overdue-ring" x="2" y="2" width="22" height="12" rx="3" />)}
      {sw('상태 점', <><circle className="st-dot st-todo" cx="5" cy="8" r="4" /><circle className="st-dot st-doing" cx="13" cy="8" r="4" /><circle className="st-dot st-done" cx="21" cy="8" r="4" /></>)}
    </div>
  );
}
