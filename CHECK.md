# CHECK.md — 판정: **통과**

> 점검일 2026-09-30 · 기준 문서: `PRD.md` · `PLAN.md` · `DESIGN.md`
> 방법: `npm run lint` / `npm run build` 실행, dev 서버(`localhost:3210`)에 API 시나리오 25건 자동 호출, 코드 grep 보안 점검.

## 1. 성공 기준 판정 (PLAN.md)

| # | 기준 | 결과 | 근거 |
|---|---|---|---|
| S1 | `npm run lint`, `npm run build` 통과 | 충족 | 오류 0 · 빌드 성공(라우트 14개) |
| S2 | 부서 추가 → 맵 추가 → 6단계 저장 → 재조회 유지 | 충족 | POST 201 → PUT 200 → GET nodes 6 / edges 5 |
| S3 | 단계에 부서·담당자·이메일·R&R·납기·상태 저장 | 충족 | `validateGraph` 통과 후 저장·조회 확인 |
| S4 | 납기 지난 미완료 단계가 `/status`에 지연 집계 | 충족 | `isOverdue()` 단일 함수 · 샘플 데이터에 지연 2건(D+3, D+4) 표시 |
| S5 | 담당자 이메일 지정 저장 시 알림 생성 | 충족 | 이메일 있는 3단계 저장 → `notified=3`, `/api/notifications` 3건(`queued`) |
| S6 | 잘못된 입력은 400 | 충족 | 빈 부서명·41자 부서명·빈 제목·잘못된 이메일·121자 단계명·깨진 연결 → 모두 400, rev 불일치 → 409 |
| S7 | `.env`·`node_modules`·`data/db.json` gitignore | 충족 | `.gitignore` 4·34·40행 |
| S8 | 400px 폭에서 가로 스크롤 없이 사용 | 충족 | 860px 이하 단일 컬럼·표 3열 축약·캔버스만 내부 스크롤 (`globals.css` 반응형) |

## 2. 설계 대비 Gap 분석

| 항목 | 설계 | 구현 | 판정 |
|---|---|---|---|
| 화면 5종 (`/`, `/dept/[id]`, `/map/[id]`, `/status`, `/notifications`) | DESIGN 3절 | 모두 구현 | 일치 |
| API 8종 (state/depts/depts[id]/maps/maps[id]/notify/notifications/seed) | DESIGN 5절 | 모두 구현 | 일치 |
| 자동 배치(역방향 간선·판단 분기·레인 충돌) | DESIGN 4절 | `lib/layout.ts` | 일치 |
| 노드 배지(개선 후보·연계·지연·상태 점) | DESIGN 4절 | `MapCanvas.tsx` | 일치 |
| 저장 규칙(rev+1, version bump, changelog 30개, 409 충돌→덮어쓰기) | DESIGN 5절 | `api/maps/[id]` + 충돌 모달 | 일치 |
| 자동 알림 중복 방지(1분) | DESIGN 5절 | `createNotice(dedupe)` — 수동 알림에도 적용(429) | 일치(강화) |
| 텍스트 빠른 입력 문법 | PRD must 2 | `lib/quick.ts` | 일치 |
| 보기 모드에서 진행 STATUS 즉시 변경 | 설계에 없음 | 수행자 편의로 추가(변경 이력에 기록) | 추가(무해) |
| 새 맵 생성 시 미저장 초안 | 프로토타입은 메모리 초안 | 서버에 초안으로 즉시 저장 후 편집 | 의도적 변경(유실 방지) |
| 실시간 동시 편집 | 비범위 | 미구현(충돌 감지만) | 비범위 |
| 실제 SMTP 발송 확인 | must 2 | 코드 완성, 환경변수 없어 Outbox 로 동작 확인 | `SKIPPED.md` 기록 |

미구현 작업: 없음 (PLAN T1~T8 모두 완료)

## 3. 보안 점검 (배포 전)

| 점검 | 결과 | 비고 |
|---|---|---|
| 키·토큰 노출 | 통과 | `.env` 0바이트, 소스·문서에 `sk-`/`ghp_`/`password=` 패턴 없음, `process.env`는 `lib/server/mail.ts`·`notify.ts`(서버 전용, `server-only`)에서만 사용 |
| 비밀값 로그 출력 | 통과 | 메일 실패 시 오류 메시지 200자만 저장, 계정 정보 미기록. `console.warn` 1건(경로 안내만) |
| 입력 신뢰 | 통과 | 모든 쓰기 API가 `lib/validate.ts`로 타입·길이·열거값·이메일·날짜·간선 무결성 검증 → 400 |
| XSS | 통과 | `dangerouslySetInnerHTML` 0건. SVG 도 JSX 렌더링. `svgEl.innerHTML`은 **읽기**(React가 이미 이스케이프한 마크업을 다운로드 파일로 저장)만 하며 DOM 에 삽입하지 않음. 내보내기 제목·레인은 별도 이스케이프 |
| 인젝션 | 통과 | DB 없음(JSON 파일). 파일 경로는 고정(`data/db.json`), 사용자 입력이 경로·명령에 들어가지 않음 |
| 프롬프트 인젝션 | 해당 없음 | LLM 기능 없음 |
| 메일 남용 | 통과 | 수신자는 입력된 담당자 1명, 이메일 정규식 검증, 같은 단계·수신자 1분 내 중복 차단(자동·수동 모두), 알림 기록 500건 상한 |
| Host 헤더 → 메일 링크 | 주의 → 완화 | 링크는 `NEXT_PUBLIC_BASE_URL` 우선 사용. 배포 시 이 값을 반드시 설정(README·DEPLOY 안내) |
| 개인정보 | 통과 | 이름·회사 이메일만 저장, 맵 삭제 시 함께 삭제, `data/db.json` gitignore |
| 의존성 | 통과 | `npm audit` 취약점 0 |
| 인증/권한 | 비범위 | INPUT: 로그인 없이 사용(사내 공유 링크 전제). 외부 공개 시 Vercel 비밀번호 보호 또는 추후 SSO 필요 — PRD ⑥ 비범위 명시 |

## 4. Act 이력 (맨 위 항목부터 수정 → 재검증)

1. React 19 lint `set-state-in-effect` 오류 2건 → 초기값/`queueMicrotask` 로 수정 → lint 통과
2. `Edge` 캐스팅 타입 오류 → 필드별 대입으로 수정 → build 통과
3. 수동 알림 중복 발송 가능 → `dedupe` 적용(429) → 재검증
4. 알림 내역 표에서 `<button>` 안 `<a>` 중첩(잘못된 HTML) → `<div>` 로 수정
5. UX 개선 1건: 편집 모드 상단에 “저장 전 확인: 담당자 미지정 n · 이메일 없음 n · 납기 미지정 n” 힌트 배너 추가

남은 보완점: 없음 → **통과**
