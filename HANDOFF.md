# HANDOFF.md — processmap 진행 상황 및 인수인계

> 마지막 업데이트: 2026-09-30
> 다음에 이어서 작업할 때 이 파일부터 읽으면 됩니다.

## 한 줄 요약

업무 프로세스맵을 정의·모니터링하는 Next.js 앱. **개발·배포 완료**, 공개 URL로 서비스 중. 남은 건 메일 실발송 확인과 데이터 영구 저장 전환 두 가지.

## 바로 쓸 수 있는 것

| 항목 | 위치 |
|---|---|
| 공개 URL | https://processmap-nine.vercel.app |
| GitHub 저장소 | https://github.com/yuninkeun/processmap (public) |
| Vercel 프로젝트 | `jeisys2` 팀 소유 (대시보드: vercel.com/jeisys2/processmap) |
| 로컬 폴더 | `projects/processmap` — `npm run dev` → localhost:3000 |
| 발표 자료 | `processmap-발표.pptx` (10장) |
| 기획·설계 문서 | `PRD.md` · `PLAN.md` · `DESIGN.md` · `CHECK.md`(판정: 통과) |
| 프로젝트 규칙 | `CLAUDE.md` (이 폴더에서 작업 시 지킬 규칙 5종 + 검증 루프) |

## 완료된 것 (Part 2~5 전체)

- Next.js 16 앱: 전사 현황(`/`) · 부서별(`/dept/[id]`) · 맵 편집(`/map/[id]`, 스윔레인 SVG 자동배치·SVG/JSON 내보내기) · 관리자 현황(`/status`, 지연·병목) · 알림 이력(`/notifications`)
- must 기능 2개: ①단계별 주관부서·담당자·이메일·R&R·납기·진행 STATUS + 지연 자동판정, ②담당자 배정/변경 시 자동 알림(현재는 Outbox 기록, 실발송 미확인)
- lint 0건·build 성공, API 시나리오 25건 통과, npm audit 0건
- GitHub public 저장소 생성 + push
- Vercel 배포 (대시보드에서 GitHub Import 방식으로 진행 — 아래 "배포 관련 특이사항" 참고)
- Deployment Protection 해제 → 로그인 없이 공개 접속 확인 완료

## 남은 작업

### 1. 실제 메일 발송 확인 (선택)
지금은 `.env`에 SMTP 정보가 없어서 알림이 실제 발송되지 않고 앱 내 "Outbox"에만 기록됩니다. 실제 메일을 보내려면:
1. `.env`에 추가: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
2. Vercel 대시보드 → 프로젝트 Settings → Environment Variables에도 동일하게 등록 (로컬 `.env`는 Vercel에 자동 반영 안 됨)
3. 재배포 후 담당자 배정 테스트해서 실제 메일 도착 확인

### 2. ~~데이터 영구 저장 전환~~ — 코드는 완료, DB 연결만 남음
`src/lib/server/db.ts`·`store.ts`에 Neon Postgres 연동 코드가 이미 들어가 있습니다 (`DATABASE_URL`이 있으면 자동으로 Postgres 사용, 없으면 기존 파일/메모리로 폴백). **아직 실제 DB를 만들어 연결하지 않았다면** Vercel 대시보드 → `jeisys2/processmap` → Storage 탭 → Postgres(Neon) 생성 → Connect 하면 끝 (자동으로 환경변수 주입됨). 절차는 `DEPLOY.md`의 "영구 저장(Neon Postgres) 프로비저닝" 참고.

### 3. Vercel 계정/팀 권한 정리 (배경 지식)
- 이 프로젝트는 `jeisys2`라는 **팀** 소유로 생성됐는데, `.env`의 `VERCEL_TOKEN`은 이 팀에 대한 API 접근 권한이 없음 (팀 조회 시도 시 403).
- 그래서 CLI(`vercel --prod`)로는 배포가 안 됐고, **대시보드에서 GitHub 저장소를 수동으로 Import**해서 배포함.
- 앞으로 CLI로 재배포하려면: vercel.com에서 `jeisys2` 팀 범위(scope)에 접근 가능한 새 토큰을 발급받아야 함 (Team Settings → Tokens, 또는 팀 소유자에게 요청). 그 전까지는 **GitHub main 브랜치에 push하면 Vercel이 자동으로 재배포**하므로 (Git 연동), 코드만 고치고 push하면 배포는 자동으로 됨 — 별도 CLI 배포 불필요.

### 4. 보안 정리 (해야 함)
작업 중 실수로 이전 `VERCEL_TOKEN` 값이 대화 로그에 노출된 적이 있습니다. **아직 안 하셨다면**:
- vercel.com/account/tokens 에서 옛 토큰들 확인 후 안 쓰는 것 삭제
- 현재 `.env`의 토큰이 그 노출된 토큰과 같은 값이면 재발급 권장

## 재개 방법

**코드를 더 고치고 싶을 때**: `projects/processmap` 폴더에서 Claude Code 실행 후 "CLAUDE.md 읽고 [원하는 기능] 추가해줘" 형식으로 요청하면 됨. `main` 브랜치에 push되면 Vercel이 자동 재배포함.

**막히면**: 이 폴더의 `SKIPPED.md`(그동안 건너뛴 항목과 이유), `DEPLOY.md`(배포 절차·점검표)도 함께 참고.
