# DESIGN.md — processmap 설계

> 근거: `PRD.md`, `PLAN.md`. 참고 UI: `process-map-prototype.html`(정적 프로토타입) — 동작을 React/Next.js 컴포넌트로 재구현한다.

## 1. 기술 선택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 15+ App Router, TypeScript, Tailwind CSS | 런북 고정 스택, Vercel 배포 |
| 데이터 저장 | `data/db.json` 단일 JSON 파일 (서버 `fs`) · 쓰기 실패 시 메모리 저장으로 전환 | DB 없이 시작, 초보자 친화 |
| 메일 | `nodemailer` (SMTP 환경변수 있을 때만) · 없으면 Outbox 기록 | 키가 없어도 멈추지 않음 |
| 렌더링 | 페이지는 클라이언트 컴포넌트(`'use client'`), 데이터는 `/api/*` fetch | 프로토타입의 SPA 상호작용 유지 |
| 흐름도 | 순수 SVG(JSX) + 자체 자동 배치 알고리즘 | 외부 그래프 라이브러리 불필요 |
| 인증 | 없음 | INPUT: 로그인 없이 사용 |

## 2. 데이터 모델 (`src/lib/types.ts`)

```ts
type NodeType = 'start' | 'task' | 'decision' | 'approval' | 'doc' | 'end';
type MapStatus = 'draft' | 'review' | 'final';          // 맵 문서 상태: 초안·검토중·확정
type Progress = 'todo' | 'doing' | 'done' | 'blocked';   // 단계 진행 STATUS: 대기·진행중·완료·보류

interface Dept { id: string; name: string; order: number; }

interface StepNode {
  id: string; type: NodeType; label: string;
  lane: string;          // 주관부서명(스윔레인) — 비어 있으면 '담당 미지정'
  owner?: string;        // 담당자 이름
  ownerEmail?: string;   // 담당자 이메일 (알림 대상)
  rr?: string;           // R&R 한 줄
  due?: string;          // 납기일 'YYYY-MM-DD'
  progress?: Progress;   // 기본 'todo'
  system?: string; time?: number | ''; note?: string;
  pain?: boolean; painNote?: string;   // 개선 후보
  link?: string;         // 연계 맵 id
}
interface Edge { id: string; from: string; to: string; label?: string; }

interface ProcessMap {
  id: string; deptId: string; title: string; purpose?: string;
  owner?: string; freq?: string; status: MapStatus;
  version: number; rev: number; nodes: StepNode[]; edges: Edge[];
  changelog: { v: number; at: string; note: string }[];
  updatedAt: string;
}

interface Notice {            // 메일 알림 기록 (Outbox 겸 발송 이력)
  id: string; at: string; to: string; subject: string; body: string;
  mapId: string; nodeId: string; kind: 'assign' | 'remind';
  status: 'sent' | 'queued' | 'failed'; error?: string;
}

interface DB { depts: Dept[]; maps: ProcessMap[]; notices: Notice[]; }
```

## 3. 화면 구성

| 경로 | 화면 | 주요 요소 |
|---|---|---|
| `/` | 전사 현황 | 숫자 카드(부서·맵·확정·개선 후보·지연 단계·미등록 부서), 부서별 표, 개선 후보 목록 |
| `/dept/[id]` | 부서 | 맵 목록(제목·상태 칩·단계 수·지연 수·최근 수정), 이름 변경/삭제, "+ 프로세스맵 추가" |
| `/map/[id]` | 맵 보기/편집 | 헤더(제목·목적·담당·상태), 툴바(편집/저장/취소/빠른 입력/확대축소/내보내기), 스윔레인 캔버스, 인스펙터(단계 상세·편집), 변경 이력 |
| `/status` | 진행 현황(관리자) | 전사 합계, 부서별 표(전체·대기·진행중·완료·보류·지연·완료율), 지연 단계 목록, 병목 부서 강조, 부서/상태 필터 |
| `/notifications` | 알림 내역 | Outbox/발송 이력 표(시각·수신자·제목·상태), `mailto:` 열기 버튼, SMTP 설정 안내 |

공통 레이아웃(`src/app/layout.tsx` + `Sidebar`): 왼쪽 사이드바(브랜드, 검색, 전사 현황, 진행 현황, 알림 내역, 부서 목록, + 부서 추가). 860px 이하에서는 가로 스크롤 탭으로 전환.

### 맵 화면 상호작용 (프로토타입 동일)

- 단계 클릭 → 선택 링 표시 + 인스펙터에 상세/편집 폼.
- 편집 모드: `+ 단계 추가`(선택 단계 뒤에 삽입, 단일 출력 연결 재배선), `텍스트로 빠르게 입력`, 연결 추가/삭제/분기 조건, 단계 삭제(앞뒤 자동 연결).
- 저장 모달: 변경 요약 + 새 버전 기록 체크. 저장 시 담당자 이메일이 새로 지정/변경된 단계는 자동 알림.
- 취소 시 변경 있으면 확인 모달. `beforeunload` 경고.
- 새 맵: 부서·이름·목적 입력 → 시작/종료 2단계로 편집 시작.

## 4. 자동 배치 알고리즘 (`src/lib/layout.ts`)

1. 자기 참조/깨진 간선 제외 → DFS로 역방향 간선(back edge) 검출.
2. 정방향 간선으로 rank(열) 계산: `rank[to] ≥ rank[from]+1`, 같은 레인·같은 rank 충돌 시 뒤로 밀기(최대 500회 반복).
3. 레인 = 노드 등장 순서의 `lane` 목록. 위치 `x = PAD + rank*COL_W + COL_W/2`, `y = laneIndex*LANE_H + LANE_H/2`.
4. 간선 경로: 같은 레인 → 직선, 판단 분기 → 수직 후 수평, 다른 레인 → ㄱ자, 역방향 → 캔버스 아래로 우회.
5. 노드 모양: 시작/종료(알약), 업무(사각), 판단(마름모), 승인(이중 사각), 산출물(물결 하단). 배지: 개선 후보 `!`, 연계 `↗`, 지연(빨간 테두리 + `D-n`), 진행중/완료 색 점.

## 5. 데이터 흐름

```
[클라이언트 페이지] --fetch--> /api/state (GET: depts·maps·notices 전체)
   부서:  POST /api/depts {name} · PATCH/DELETE /api/depts/[id]
   맵:    POST /api/maps {deptId,title,purpose} · PUT /api/maps/[id] {map} · DELETE
   알림:  POST /api/notify {mapId,nodeId,kind} → 검증 → SMTP 있으면 발송, 없으면 queued 기록
   조회:  GET /api/notifications
[서버 store] readDB()/writeDB() — data/db.json (없으면 빈 DB 생성, 쓰기 실패 시 메모리)
```

- PUT 저장 규칙: 서버가 `rev+1`, `updatedAt`, `version`(bump 시 +1), `changelog(최근 30개)`를 계산. 클라이언트가 보낸 rev가 서버 rev와 다르면 409(충돌) → 화면에서 "덮어쓰기" 확인.
- 자동 알림: PUT 처리 시 이전 맵과 비교해 `ownerEmail`이 새로 생기거나 바뀐 노드 → `kind:'assign'` 알림 생성(1분 내 같은 노드·같은 수신자 중복 금지).

## 6. 입력 검증 (`src/lib/validate.ts`)

| 필드 | 규칙 |
|---|---|
| 부서명 | 1~40자 |
| 맵 제목 | 1~80자 · 목적 ≤120 · 담당·빈도 ≤60 |
| 단계 label | 1~120자 · lane ≤40 · owner ≤40 · rr ≤200 · note/painNote ≤500 · system ≤40 |
| ownerEmail | 비어 있거나 `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| due | 비어 있거나 `YYYY-MM-DD` |
| progress / type / status | 열거값만 |
| nodes/edges | 배열, 최대 300/600개, edge의 from/to는 존재하는 노드 id |

## 7. 지연 판정 (`src/lib/status.ts`)

```ts
isOverdue(node, today) = node.progress !== 'done' && !!node.due && node.due < today(YYYY-MM-DD)
```
집계: 부서별 `{ total, todo, doing, done, blocked, overdue, rate = done/total }`, 병목 부서 = `overdue + blocked` 최댓값(0이면 없음).

## 8. 메일 (`src/lib/server/mail.ts`)

- 환경변수 `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM` 모두 있으면 nodemailer 전송, 하나라도 없으면 `queued`.
- 제목: `[프로세스맵] {맵 제목} — "{단계명}" 업무 배정` / `… 진행 요청`.
- 본문(텍스트): 프로세스·단계·주관부서·담당자·R&R·납기·상태·링크(`NEXT_PUBLIC_BASE_URL` 또는 요청 origin + `/map/{id}?node={nodeId}`).
- 값(비밀번호)은 어떤 로그에도 남기지 않는다.

## 9. 파일 목록

```
src/app/layout.tsx, page.tsx, globals.css
src/app/dept/[id]/page.tsx · map/[id]/page.tsx · status/page.tsx · notifications/page.tsx
src/app/api/state/route.ts · depts/route.ts · depts/[id]/route.ts · maps/route.ts · maps/[id]/route.ts · notify/route.ts · notifications/route.ts · seed/route.ts
src/components/Sidebar.tsx MapCanvas.tsx Inspector.tsx Modal.tsx Toast.tsx StatChip.tsx
src/lib/types.ts layout.ts status.ts validate.ts quick.ts api.ts (클라이언트 fetch 헬퍼) constants.ts
src/lib/server/store.ts mail.ts
```
