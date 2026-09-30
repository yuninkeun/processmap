# DEPLOY.md — 배포 절차와 점검표

> 현재 상태: `.env`에 `GITHUB_TOKEN`·`VERCEL_TOKEN`이 없어 **배포는 건너뜀** (`SKIPPED.md`). 로컬 git 저장소와 초기 커밋만 준비되어 있습니다.

## 배포 절차 (토큰을 넣은 뒤)

1. `.gitignore`에 `.env`, `/node_modules`, `/data/db.json`이 있는지 확인 (있음).
2. GitHub public 저장소 생성 후 push
   ```bash
   gh auth login --with-token < <(grep GITHUB_TOKEN .env | cut -d= -f2-)   # 값은 화면에 출력하지 않음
   gh repo create processmap --public --source=. --remote=origin --push
   ```
3. Vercel 배포
   ```bash
   npx vercel --prod --yes --token "$VERCEL_TOKEN"     # 토큰은 .env 에서 읽어 환경변수로 전달
   ```
4. Vercel 환경 변수 등록(앱이 쓰는 값만): `NEXT_PUBLIC_BASE_URL`(공개 URL), 메일을 쓰면 `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM`.
5. ~~주의: Vercel 은 파일 쓰기가 되지 않아 메모리 저장으로만 동작~~ → **2026-09-30 해결**: Supabase Postgres 연동 완료 (아래 "영구 저장(Supabase Postgres)" 참고). `DATABASE_URL`이 없으면 기존처럼 파일→메모리로 자동 폴백.

## 영구 저장(Supabase Postgres) 프로비저닝

코드는 이미 준비되어 있음(`src/lib/server/db.ts`, `store.ts`, 범용 `postgres` 드라이버 사용 — Supabase·Neon 등 어떤 Postgres든 호환). `DATABASE_URL` 환경변수만 연결하면 자동으로 Postgres를 쓴다.

1. supabase.com 대시보드 → **New project** → processmap 전용 프로젝트 생성 (리전은 가까운 곳)
2. 생성 후 **Project Settings → Database → Connection string** 에서 **"Session pooler"**(포트 6543, `pgbouncer` 사용) 연결 문자열 복사 — 서버리스 환경에는 이 풀러 연결을 써야 함(Direct connection 아님)
3. Vercel 대시보드 → `jeisys2/processmap` 프로젝트 → **Settings → Environment Variables** → `DATABASE_URL`에 위 연결 문자열 붙여넣기 (Production·Preview·Development 모두 체크) → Save
4. 재배포하면(또는 다음 push부터) 자동으로 Postgres 사용. 최초 접근 시 `processmap_store` 테이블을 코드가 알아서 생성함(마이그레이션 파일 불필요, 스키마가 단순한 JSON 한 문서라 자동 생성으로 충분)
5. 로컬에서도 Postgres로 테스트하려면: 같은 연결 문자열을 `processmap/.env`의 `DATABASE_URL=...`에 추가. 안 넣으면 로컬은 계속 `data/db.json` 파일로 동작(정상)
6. **참고**: `.env`에 있던 옛 `SUPABASE_ACCESS_TOKEN`(Management API 토큰)은 만료/무효 상태(401)라 API로 프로젝트 자동 생성은 불가 — 대시보드에서 직접 생성 필요.

### 저장 방식
- 관계형 테이블이 아니라 `processmap_store(key, value jsonb, rev)` 한 행에 앱 전체 데이터(부서·맵·알림)를 JSON으로 저장 — 기존 파일 저장 방식과 동일한 구조를 그대로 DB로 옮긴 것. 동시 쓰기는 `rev` 값 비교(낙관적 동시성 제어)로 충돌을 감지하고 최대 5회 재시도.
- 데이터가 커지거나(다부서·다수 사용자 동시 편집) 진짜 관계형 스키마가 필요해지면, 그때 `depts`/`maps`/`notices`를 별도 테이블로 분리하는 리팩토링을 고려.

## 배포 점검표

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| `origin`이 GitHub, 미push 커밋 없음 | `git remote -v`, `git status` | 미실시(건너뜀) |
| 저장소 public · README 있음 · `.env` 없음 | GitHub 화면 / `git ls-files | grep .env` → 없음 | README 있음 · `.env` 미추적 확인 · public 미실시 |
| `.vercel` 연결 | `.vercel/project.json` 존재 | 미실시 |
| 공개 URL 200 응답 · 제목 노출 | `curl -I https://….vercel.app` / `<title>` 에 “프로세스맵” | 미실시 |
| Vercel 환경 변수 등록 | `vercel env ls` | 미실시 |
| 로컬 `npm run build` 통과 | 실행 | 통과 |
