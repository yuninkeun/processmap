# processmap — 업무 프로세스맵

업무 프로세스맵을 정의하고, 단계마다 **주관부서·담당자·R&R·납기**를 지정해 **진행 STATUS**를 모니터링하는 웹앱입니다.
현업 담당자가 텍스트 몇 줄로 절차를 그리고, 담당자는 메일 알림을 받고, 관리자는 지연·병목을 한눈에 봅니다.

- 스택: Next.js 16 (App Router) · TypeScript · Tailwind CSS · nodemailer
- 저장: `data/db.json` (파일) — 외부 DB 없음, 로그인 없음
- 배포: Vercel

## 실행

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run build
```

첫 화면에서 **“샘플 데이터 넣기”** 를 누르면 구매 발주 프로세스 예시가 생깁니다.

## 화면

| 경로 | 설명 |
|---|---|
| `/` | 전사 현황 — 부서별 맵 수·지연 단계·개선 후보 |
| `/dept/[id]` | 부서의 프로세스맵 목록, 맵 추가 |
| `/map/[id]` | 스윔레인 흐름도 보기·편집, 단계별 담당 배정·R&R·납기·진행 STATUS, 텍스트 빠른 입력, SVG/JSON 내보내기 |
| `/status` | 관리자 진행 현황 — 부서별 대기/진행중/완료/보류/지연, 병목 부서, 지연 단계 목록 |
| `/notifications` | 메일 알림 내역(발송/대기/실패), `mailto:` 로 직접 보내기 |

## 환경변수 (`.env`, 값은 커밋하지 않음)

| 이름 | 용도 |
|---|---|
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | 담당자 메일 알림 발송. 모두 있어야 실제 발송, 없으면 발송 대기함에 기록 |
| `NEXT_PUBLIC_BASE_URL` | 메일 본문의 링크 주소(예: `https://processmap.vercel.app`). 없으면 요청 주소 사용 |

## 텍스트로 빠르게 입력 규칙

```
구매팀: 발주 요청서 접수
구매팀: ? 재고가 충분한가        ← ? 는 판단
구매팀: [승인] 팀장 발주 승인     ← [승인] / [산출물] 로 유형 지정
IQC: 입고 검사                   ← "부서:" 를 바꾸면 다른 행(스윔레인)
```

## 문서

`PRD.md`(기획) → `PLAN.md`(작업 계획) → `DESIGN.md`(설계) → `CHECK.md`(점검) · 규칙 `CLAUDE.md` · 배포 `DEPLOY.md` · 건너뛴 항목 `SKIPPED.md`
