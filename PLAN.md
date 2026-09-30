# PLAN.md — processmap 작업 계획

> 근거: `PRD.md` ⑧ 개발 단위. 한 번에 한 작업씩, 각 작업마다 `lint → build → dev` 검증 루프를 돈다.

## 목표

1. 현업 담당자가 **10분 안에** 프로세스맵 1건을 작성할 수 있다(텍스트 빠른 입력 + 자동 배치).
2. 모든 단계에 **주관부서·담당자·R&R·납기·상태**가 붙고, 관리자는 **진행 현황 화면**에서 지연·병목을 한눈에 본다.
3. 담당자 지정 시 **메일 알림**이 자동으로 나간다(SMTP 없으면 Outbox로 기록).

## 성공 기준 (Check 단계에서 판정)

| # | 기준 | 판정 방법 |
|---|---|---|
| S1 | `npm run lint`, `npm run build` 통과 | 실행 결과 |
| S2 | 부서 추가 → 맵 추가 → 텍스트 6줄 입력 → 저장 → 새로고침 후 유지 | dev 서버에서 API 호출로 확인 |
| S3 | 단계에 부서·담당자·이메일·R&R·납기·상태 저장 가능 | `/api/maps/[id]` PUT 후 GET |
| S4 | 납기 지난 미완료 단계가 `/status`에서 "지연"으로 집계 | 샘플 데이터로 확인 |
| S5 | 담당자 이메일 지정 저장 시 알림 1건 생성(Outbox 또는 발송) | `/api/notifications` GET |
| S6 | 잘못된 입력(빈 제목·긴 문자열·잘못된 이메일)은 400 | API 호출 |
| S7 | `.env`·`node_modules`·`data/db.json` 이 `.gitignore`에 있음 | 파일 확인 |
| S8 | 화면 폭 400px에서도 가로 스크롤 없이 사용 가능 | dev 확인 |

## 작업 순서

| # | 작업 | 산출물 | 상태 |
|---|---|---|---|
| T1 | 골격: Next.js 생성, `.env`/`.gitignore`, `src/lib/types.ts`, JSON 저장소 `src/lib/server/store.ts`, `/api/state` | 빈 데이터 응답 | ☐ |
| T2 | 부서·맵 CRUD API (`/api/depts`, `/api/depts/[id]`, `/api/maps`, `/api/maps/[id]`) + 입력 검증 `src/lib/validate.ts` | API 동작 | ☐ |
| T3 | 공통 UI: 레이아웃(사이드바·검색), 홈(전사 현황), 부서 화면, 모달·토스트 | 화면 이동 | ☐ |
| T4 | 맵 보기: 자동 배치 `src/lib/layout.ts` + `MapCanvas`(SVG) + `Inspector`(보기) | 흐름도 렌더 | ☐ |
| T5 | 맵 편집: 단계 추가/삭제/연결, 텍스트 빠른 입력 `parseQuick`, 저장(변경 이력) | 편집·저장 | ☐ |
| T6 | must 1: 단계 필드(담당자·이메일·R&R·납기·상태) + `isOverdue` + `/status` 대시보드 | 지연 집계 | ☐ |
| T7 | must 2: `/api/notify`(nodemailer, SMTP 없으면 Outbox) + 저장 시 자동 알림 + 수동 버튼 + `/notifications` | 알림 생성 | ☐ |
| T8 | 마무리: 검색, SVG/JSON 내보내기, 샘플 데이터 시드 버튼, 반응형·다크모드, README | CHECK 통과 | ☐ |

## 규칙

- `CLAUDE/PRD/PLAN/DESIGN/.env/.gitignore` 는 Do 단계에서 고치지 않는다.
- 막히면 더 단순한 대안 → 그래도 안 되면 `SKIPPED.md`에 한 줄.
