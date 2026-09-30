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
5. 주의: Vercel 은 파일 쓰기가 되지 않아 `data/db.json` 대신 **메모리 저장**으로 동작합니다(서버 재시작 시 초기화). 지속 저장이 필요하면 다음 단계에서 Vercel KV/Postgres 등으로 저장소만 교체(스택은 Next.js 유지).

## 배포 점검표

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| `origin`이 GitHub, 미push 커밋 없음 | `git remote -v`, `git status` | 미실시(건너뜀) |
| 저장소 public · README 있음 · `.env` 없음 | GitHub 화면 / `git ls-files | grep .env` → 없음 | README 있음 · `.env` 미추적 확인 · public 미실시 |
| `.vercel` 연결 | `.vercel/project.json` 존재 | 미실시 |
| 공개 URL 200 응답 · 제목 노출 | `curl -I https://….vercel.app` / `<title>` 에 “프로세스맵” | 미실시 |
| Vercel 환경 변수 등록 | `vercel env ls` | 미실시 |
| 로컬 `npm run build` 통과 | 실행 | 통과 |
