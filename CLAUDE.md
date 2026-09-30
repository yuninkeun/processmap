# CLAUDE.md — processmap 프로젝트 규칙

> 이 폴더(`processmap`)에서 Claude Code가 작업할 때 **항상** 지키는 규칙입니다.
> 상위 문서: `PRD.md`(기획) → `PLAN.md`(작업 순서) → `DESIGN.md`(설계) → `CHECK.md`(점검).

## 프로젝트 개요

- **앱 이름**: processmap — 업무 프로세스맵을 정의하고 실행·판단·모니터링을 전산으로 수행
- **스택**: Next.js(App Router) + TypeScript + Tailwind CSS · 저장소는 `DATABASE_URL`이 있으면 Neon Postgres, 없으면 `data/db.json`(파일)로 자동 폴백 · 메일은 nodemailer
- **배포**: Vercel
- **로그인**: 없음 (사내 공유 링크로 사용)

## 폴더 구조 (요약)

```
processmap/
├─ src/app/            페이지·API 라우트 (App Router)
│  ├─ api/             /api/state · /api/depts · /api/maps · /api/notify
│  ├─ dept/[id]/       부서 화면
│  ├─ map/[id]/        프로세스맵 보기·편집
│  ├─ status/          관리자 진행 현황
│  └─ notifications/   메일 알림 내역
├─ src/components/     화면 조각(사이드바·캔버스·인스펙터·모달 등)
├─ src/lib/            타입·레이아웃·검증 공통 코드
│  └─ server/          store.ts(저장소, Postgres/파일 자동 분기)·db.ts(Neon 지연 초기화)·mail.ts·notify.ts
├─ data/db.json        로컬 데이터 (DATABASE_URL 없을 때만 사용, git 커밋 안 함)
└─ PRD.md PLAN.md DESIGN.md CHECK.md CLAUDE.md
```

## 규칙 5종

1. **한국어**: 모든 설명·주석·문서·화면 문구는 한국어로 쓴다. 새 파일은 **이 폴더(`processmap`) 안에만** 만든다. 형제 폴더(`my-app`, `hello-page` 등)는 읽지도 고치지도 않는다.
2. **스택 고정**: Next.js 유지. 다른 프레임워크·DB로의 마이그레이션을 제안하지 않는다. 배포는 Vercel.
3. **한 줄 보고**: 코드를 바꾸면 "무엇을 왜 바꿨는지" 한 줄로 남긴다.
4. **비밀값 보호**: `.env`·`node_modules`·`data/db.json`은 `.gitignore`에 유지하고 커밋하지 않는다.
5. **토큰 취급**: 인증 토큰·API 키는 사용자에게 묻거나 화면·채팅에 출력하지 않고 `.env`에서 읽어서만 쓴다. 코드에 하드코딩 금지.

## 작업 절차 (검증 루프)

1. **변경**: `PLAN.md`의 작업을 한 번에 하나씩, `DESIGN.md`대로 구현한다.
2. **검증**: `npm run lint` → `npm run build` 를 직접 실행한다.
3. **화면 확인**: 화면을 바꿨으면 `npm run dev` 로 `localhost:3000`에서 렌더링과 동작을 확인한다.
4. **실패 시**: 원인을 고치고 다시 1번으로. 3회 고쳐도 실패하면 더 단순한 대안으로 바꾸거나 `SKIPPED.md`에 한 줄 기록 후 다음 작업으로 넘어간다.
5. **통과 시**: 한 줄 요약을 남기고 다음 작업으로 진행한다.

## 코딩 규칙

- 사용자 입력은 신뢰하지 않는다: API 라우트에서 `src/lib/validate.ts`로 형식·길이를 검증한다.
- `dangerouslySetInnerHTML` 사용 금지. 렌더링은 JSX만.
- 상태(진행 STATUS)는 `todo | doing | done | blocked` 4개 값만 사용한다. 지연 판정은 `src/lib/status.ts`의 `isOverdue()` 한 곳에서만 한다.
- 컴포넌트는 `src/components/`, 순수 로직은 `src/lib/`에 둔다. 서버 전용 코드(`fs`, nodemailer)는 `src/lib/server/`에만 둔다.
- 새 의존성을 추가할 때는 이유를 한 줄 남긴다.

## 오늘 배운 규칙 (Part 4 Act에서 추가)

- **React 19 lint(`react-hooks/set-state-in-effect`)**: `useEffect` 본문에서 `setState`를 직접 부르지 않는다. URL 파라미터 같은 초기값은 `useState(() => …)` 로, 데이터 로딩은 응답 콜백에서만 상태를 바꾼다.
- **Next.js 16 규칙**: 동적 라우트의 `params`는 `Promise`이므로 반드시 `await` 한다. `useSearchParams`를 쓰는 클라이언트 컴포넌트는 `Suspense`로 감싼다. `next dev`가 `CLAUDE.md` 끝에 붙이는 `nextjs-agent-rules` 블록은 지우지 않는다.
- **알림처럼 외부로 나가는 동작**은 항상 중복 차단(같은 대상·1분)과 상한(기록 500건)을 함께 넣는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
