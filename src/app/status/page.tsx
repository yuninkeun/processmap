'use client';
// 관리자 진행 현황: 전사 합계 · 부서별 표 · 병목 부서 · 지연 단계 목록 (must 1)
import Link from 'next/link';
import { useState } from 'react';
import { useData } from '@/components/DataProvider';
import { aggregate, isTrackable, laneOf, progressOf } from '@/lib/status';
import { PROGRESS, today } from '@/lib/constants';
import type { Progress } from '@/lib/types';

export default function StatusPage() {
  const { db, deptById } = useData();
  const t = today();
  const { rows, total, overdueList, bottleneck } = aggregate(db.maps, db.depts, t);
  const [lane, setLane] = useState('');
  const [prog, setProg] = useState<Progress | ''>('');

  // 단계 전체 목록(필터용)
  const steps = db.maps.flatMap((m) => m.nodes.filter(isTrackable).map((n) => ({ m, n })))
    .filter(({ n }) => (!lane || laneOf(n) === lane) && (!prog || progressOf(n) === prog))
    .sort((a, b) => (a.n.due || '9999').localeCompare(b.n.due || '9999'));

  return (
    <>
      <h1>진행 현황 (관리자)</h1>
      <p className="lead">모든 프로세스맵의 단계를 주관부서별로 집계합니다. 지연 = 완료가 아니면서 납기일이 지난 단계, 병목 = 지연·보류가 가장 많은 부서입니다. 기준일 {t}</p>
      <div className="figures">
        <div className="fig"><b>{total.total}</b><span>관리 단계</span></div>
        <div className="fig"><b>{total.todo}</b><span>대기</span></div>
        <div className="fig"><b>{total.doing}</b><span>진행중</span></div>
        <div className="fig"><b>{total.done}</b><span>완료</span></div>
        <div className="fig"><b>{total.blocked}</b><span>보류</span></div>
        <div className={`fig ${total.overdue ? 'alert' : ''}`}><b>{total.overdue}</b><span>지연</span></div>
        <div className="fig"><b>{total.rate}%</b><span>완료율</span></div>
        <div className={`fig ${total.unassigned ? 'alert' : ''}`}><b>{total.unassigned}</b><span>담당 미지정</span></div>
      </div>
      {bottleneck && <div className="banner">병목 부서: <b>{bottleneck.dept}</b> — 지연 {bottleneck.overdue}건 · 보류 {bottleneck.blocked}건. 이 부서의 판단 기준·인력 배치를 먼저 확인하세요.</div>}

      <div className="section">
        <h2>부서별 진행 현황</h2>
        {rows.length ? (
          <>
            <div className="grid-head cols-status"><span>주관부서</span><span>전체</span><span>대기</span><span>진행중</span><span>완료</span><span>보류</span><span>지연</span><span>완료율</span></div>
            {rows.map((r) => (
              <button key={r.dept} className={`grid-row cols-status ${bottleneck?.dept === r.dept ? 'hl' : ''}`} onClick={() => setLane(lane === r.dept ? '' : r.dept)} aria-pressed={lane === r.dept}>
                <span>{r.dept}{bottleneck?.dept === r.dept && <span className="chip overdue" style={{ marginLeft: 8 }}>병목</span>}</span>
                <span className="num">{r.total}</span>
                <span className="num">{r.todo}</span>
                <span className="num">{r.doing}</span>
                <span className="num">{r.done}</span>
                <span className={`num ${r.blocked ? 'warn' : 'dim'}`}>{r.blocked}</span>
                <span className={`num ${r.overdue ? 'bad' : 'dim'}`}>{r.overdue}</span>
                <span className="num">{r.rate}%</span>
              </button>
            ))}
          </>
        ) : <div className="empty">아직 집계할 단계가 없습니다. 프로세스맵을 만들고 단계에 담당자와 납기를 지정하세요.</div>}
      </div>

      <div className="section">
        <h2>지연 단계 ({overdueList.length})</h2>
        {overdueList.length ? (
          <>
            <div className="grid-head cols-overdue"><span>단계</span><span>프로세스</span><span>주관부서</span><span>담당자</span><span>납기</span><span>경과</span></div>
            {overdueList.map(({ map, node, days }) => (
              <Link key={map.id + node.id} className="grid-row cols-overdue" href={`/map/${map.id}?node=${node.id}`}>
                <span>{node.label}</span>
                <span className="dim">{deptById(map.deptId)?.name || ''} / {map.title}</span>
                <span>{laneOf(node)}</span>
                <span className={node.owner ? '' : 'warn'}>{node.owner || '담당 미지정'}</span>
                <span className="num">{node.due}</span>
                <span className="num bad">D+{days}</span>
              </Link>
            ))}
          </>
        ) : <div className="empty">지연된 단계가 없습니다.</div>}
      </div>

      <div className="section">
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>단계 목록 ({steps.length})</h2><span className="spacer" />
          <select value={lane} onChange={(e) => setLane(e.target.value)} aria-label="주관부서 필터"><option value="">모든 부서</option>{rows.map((r) => <option key={r.dept} value={r.dept}>{r.dept}</option>)}</select>
          <select value={prog} onChange={(e) => setProg(e.target.value as Progress | '')} aria-label="상태 필터"><option value="">모든 상태</option>{(Object.keys(PROGRESS) as Progress[]).map((k) => <option key={k} value={k}>{PROGRESS[k]}</option>)}</select>
        </div>
        {steps.length ? (
          <>
            <div className="grid-head cols-overdue"><span>단계</span><span>프로세스</span><span>주관부서</span><span>담당자</span><span>납기</span><span>상태</span></div>
            {steps.map(({ m, n }) => (
              <Link key={m.id + n.id} className="grid-row cols-overdue" href={`/map/${m.id}?node=${n.id}`}>
                <span>{n.label}</span>
                <span className="dim">{m.title}</span>
                <span>{laneOf(n)}</span>
                <span className={n.owner ? '' : 'warn'}>{n.owner || '담당 미지정'}</span>
                <span className="num">{n.due || '-'}</span>
                <span><span className={`chip ${progressOf(n)}`}>{PROGRESS[progressOf(n)]}</span></span>
              </Link>
            ))}
          </>
        ) : <div className="empty">조건에 맞는 단계가 없습니다.</div>}
      </div>
    </>
  );
}
