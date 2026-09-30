# SKIPPED.md — 건너뛴 항목

| 일시 | 항목 | 이유 | 다시 하려면 |
|---|---|---|---|
| 2026-09-30 | ~~Part 5 STEP 1 — GitHub public 저장소 생성 + Vercel 배포~~ | ~~토큰 없어 건너뜀~~ → **2026-09-30 완료**: `github.com/yuninkeun/processmap` (public), Vercel 배포 완료 | — |
| 2026-09-30 | ~~Part 5 STEP 2 — 배포 점검~~ | ~~STEP 1 미실시~~ → **2026-09-30 완료**: 공개 URL 200 확인, 제목 노출 확인, 배포 보호(Deployment Protection) 해제 완료 | — |
| 2026-09-30 | 실제 메일 발송 확인 | `.env`에 SMTP 설정이 없어 알림은 발송 대기함(Outbox)에 기록됨 — 기능은 완성, 실발송만 미확인 | `.env`에 `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/MAIL_FROM` 추가 |

## 배포 정보 (2026-09-30 완료)

- **공개 URL**: https://processmap-nine.vercel.app
- **GitHub**: https://github.com/yuninkeun/processmap
- **Vercel 프로젝트**: `jeisys2` 팀 소유, 대시보드에서 GitHub 저장소 Import 방식으로 생성 (API 토큰은 팀 접근 권한이 없어 CLI 배포는 실패 — 대시보드 수동 배포로 완료)
- **주의**: Vercel 프로덕션 환경은 파일시스템 쓰기가 안 되어 `data/db.json` 대신 메모리 저장으로 동작함 — 서버 재시작/재배포 시 데이터가 초기화됨. 지속 저장이 필요하면 별도 DB 연동 필요
- **주의**: 앱에 로그인이 없어 URL을 아는 사람은 누구나 조회·수정 가능 (의도된 설계 — 사내 링크 공유 전제)

## 결정 로그 (질문 대신 기본값으로 진행한 것)

- 작업 폴더는 `my-app`이 아니라 이 폴더(`processmap`)를 사용.
- 폴더에 문서가 이미 있어 `create-next-app`을 임시 폴더에서 실행한 뒤 복사(스캐폴드 생성 `CLAUDE.md`·`AGENTS.md`는 제외).
- 로그인 없음(INPUT 기본값), 외부 DB 없음 → `data/db.json` 파일 저장(쓰기 불가 시 메모리).
- 새 프로세스맵은 "만들고 편집 시작" 시 서버에 초안으로 먼저 저장(새로고침해도 유실되지 않도록).
- 진행 STATUS 4종(`todo/doing/done/blocked`)과 지연 규칙(납기 < 오늘 & 미완료)을 채택.
- 메일: nodemailer + SMTP 환경변수, 없으면 Outbox + `mailto:`.
