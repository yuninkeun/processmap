# SKIPPED.md — 건너뛴 항목

| 일시 | 항목 | 이유 | 다시 하려면 |
|---|---|---|---|
| 2026-09-30 | Part 5 STEP 1 — GitHub public 저장소 생성 + Vercel 배포(공개 URL) | `.env`에 `GITHUB_TOKEN`·`VERCEL_TOKEN`이 없음 (런북 규칙: 배포 키 없으면 이 STEP만 건너뜀). 로컬 git 저장소·초기 커밋까지만 준비함 | `.env`에 두 토큰을 넣고 `DEPLOY.md`의 절차대로 실행 |
| 2026-09-30 | Part 5 STEP 2 — 배포 점검(origin·public URL 200·Vercel 환경변수) | STEP 1을 건너뛰어 점검 대상이 없음. 체크리스트는 `DEPLOY.md`에 준비함 | 배포 후 `DEPLOY.md` 체크리스트 수행 |
| 2026-09-30 | 실제 메일 발송 확인 | `.env`에 SMTP 설정이 없어 알림은 발송 대기함(Outbox)에 기록됨 — 기능은 완성, 실발송만 미확인 | `.env`에 `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM` 추가 |

## 결정 로그 (질문 대신 기본값으로 진행한 것)

- 작업 폴더는 `my-app`이 아니라 이 폴더(`processmap`)를 사용.
- 폴더에 문서가 이미 있어 `create-next-app`을 임시 폴더에서 실행한 뒤 복사(스캐폴드 생성 `CLAUDE.md`·`AGENTS.md`는 제외).
- 로그인 없음(INPUT 기본값), 외부 DB 없음 → `data/db.json` 파일 저장(쓰기 불가 시 메모리).
- 새 프로세스맵은 "만들고 편집 시작" 시 서버에 초안으로 먼저 저장(새로고침해도 유실되지 않도록).
- 진행 STATUS 4종(`todo/doing/done/blocked`)과 지연 규칙(납기 < 오늘 & 미완료)을 채택.
- 메일: nodemailer + SMTP 환경변수, 없으면 Outbox + `mailto:`.
