# 논스톱 바이브 코딩 개발 런북

> 제이시스 "Vibe Coding 실무 교육" 핸드북(Part 1~5)을 **한 번에 실행되는 절차**로 정리한 파일입니다.
> **맨 위 `INPUT` 블록만 채워서** Claude Code(+bkit)에 이 파일을 통째로 주면,
> 나머지 Part 1~5는 **확인·중단 없이 논스톱**으로 진행됩니다.

---

## 사용법 (딱 2가지)

1. 같은 폴더의 **`INPUT.txt`** 에서 `«...»` 부분만 내 프로젝트 정보로 채운다.
2. **`시작.bat` 더블클릭.** — 폴더 준비·claude 실행·논스톱 진행까지 자동.

> 수동으로 하려면: `my-app` 폴더에서 Claude Code를 켜고 아래를 붙여넣으면 됩니다.
> ```
> 같은 폴더의 개발-런북.md와 INPUT.txt를 읽고, Part 1~5를 확인·질문 없이
> 논스톱으로 끝까지 진행해줘. 모든 판단은 기본값으로 알아서 정하고 절대 멈추지 마.
> ```

---

## 1. INPUT — `INPUT.txt`에서 관리

입력값(앱 정의·프로필·키·스택)은 **같은 폴더의 `INPUT.txt`** 에 있습니다.
실행 시 그 파일의 값을 그대로 사용한다. `«...»` 가 그대로 남아 있는 항목은
**질문하지 말고** 합리적인 기본값으로 채워서 진행한다(로그 한 줄만 남김).

- 키(`.env`) 값은 `INPUT.txt`에 붙여넣지 않는다 — `my-app/.env`에 직접 넣고, 런북은 값을 출력하지 않는다.
- 스택 기본: **Next.js 고정 · 배포 Vercel**.

---

## 2. 논스톱 실행 규칙 (AI 행동 지침 · 공격적 모드)

이 런북을 실행하는 동안 **항상** 지킬 것:

1. **절대 멈추지 않는다**: 확인·승인·질문을 하지 않는다. 판단이 필요하면 초보자에게 무난한 기본값으로 **즉시 결정**하고 한 줄 로그만 남긴 뒤 계속한다. "진행할까요?"류의 확인을 하지 않는다.
2. **막히면 우회**: 어떤 STEP이 막히면 물어보지 말고 ⓐ스스로 고치기 → ⓑ더 단순한 대안으로 대체 → ⓒ그래도 안 되면 그 항목을 건너뛰고 `SKIPPED.md`에 한 줄 기록 후 다음으로 진행한다.
3. **자동 검증 루프**: 코드를 바꿀 때마다 `npm run lint` → `npm run build`(화면 작업이면 `npm run dev`까지)를 스스로 돌려 통과시킨 뒤 다음으로 넘어간다. 3회 고쳐도 실패하면 규칙 2로 우회한다.
4. **비밀값 보호**: `.env`의 키·토큰 값을 채팅에 절대 출력하지 않는다. 인증은 `.env` 값을 **읽어서** 쓴다. `.env`·`node_modules`는 항상 `.gitignore`에 두고 커밋하지 않는다. *(이 보호만은 절대 예외 없음)*
5. **스택 고정**: Next.js 유지, 마이그레이션 제안 금지. 배포는 Vercel.
6. **작게, 순서대로**: 한 번에 한 조각씩, 핵심 흐름이 끝까지 돌게 만든 뒤 다듬는다. 코드를 바꾸면 무엇을 왜 바꿨는지 한 줄로 남긴다.
7. **진행 표시**: 각 STEP 시작 `▶ [Part n · STEP m] 제목`, 완료 `✅ 통과` 한 줄만.
8. **공개 배포도 자동**: Part 5 배포(공개 URL 발급)까지 확인 없이 진행한다. 끝나면 결과 URL과 산출물 체크리스트만 보고한다.

### 멈추지 않는 예외 (그래도 물어보지 말 것)
- 필수 키(`OPENAI_API_KEY`)가 비어 있으면 → **멈추지 말고** 챗봇 기능만 "키 입력 후 동작" 상태로 두고 나머지를 끝까지 완성한 뒤, 마지막 보고에 "OPENAI_API_KEY 필요"만 한 줄로 남긴다.
- 배포 키(`GITHUB_TOKEN`/`VERCEL_TOKEN`)가 없으면 → 배포(Part 5 STEP 1~2)만 건너뛰고 `SKIPPED.md`에 기록, 나머지는 완료한다.
- must 기능이 서로 모순되면 → 더 단순한 쪽을 채택하고 로그만 남긴 뒤 진행한다.

---

## 3. Part 1 — 계정·도구 준비와 헬로페이지

> 목적: 개발 환경을 갖추고, 첫 웹페이지(프로필 + RAG 챗봇)를 로컬에서 완성.
> 작업 폴더: **`hello-page`** (연습용, 배포하지 않음)

- **STEP 1 · 도구 확인/설치**: Node.js LTS·Git 설치 여부를 확인하고 없으면 설치한 뒤 `node -v`, `npm -v`, `git --version` 결과를 확인한다. (Windows `winget install OpenJS.NodeJS.LTS`)
- **STEP 2 · 작업 폴더 확인**: 현재 폴더 경로와 내용물을 확인한다.
- **STEP 3 · Next.js 생성**: `hello-page` 바로 아래에 Next.js 프로젝트를 기본값으로 생성한다.
- **STEP 4 · Git 이름표**: `git config --global user.name/user.email`을 INPUT 1-2 값으로 설정한다.
- **STEP 5 · 비밀값 준비**: `.env` 빈 파일 생성, `.gitignore`에 `.env`·`node_modules` 등록 확인.
- **STEP 6 · 프로필 페이지**: 메인 화면을 INPUT 1-2 정보로 프로필 웹페이지로 만든다. (명함 호버 효과 + "이메일 복사" 버튼 포함)
- **STEP 7 · 로컬 미리보기**: 개발 서버를 켜고 `localhost:3000`에서 렌더링을 확인한다.
- **STEP 8 · RAG 챗봇**: 프로필 페이지 상단에 "RAG 챗봇" 버튼을 추가하고, PDF를 올려 그 내용만 근거로 답하는 챗봇 화면을 붙인다. 문서에 없으면 "문서에 없습니다"로 답하고 존댓말 한국어. `OPENAI_API_KEY`는 `.env`에서 읽어 쓰고 화면에 노출하지 않는다.
- **점검**: 도구 실행·git 설정·`.env` 키 유무(값 있음/없음만)·Next.js 설치·챗봇 동작을 확인표로 정리.

---

## 4. Part 2 — bkit 설치와 PRD 작성

> 목적: 작업 규율 플러그인(bkit)을 깔고, 기획서 `PRD.md`를 완성.
> 작업 폴더: **`my-app`** (실제 만들 앱 · `hello-page`와 다른 폴더)

- **STEP 1 · bkit 설치**: `claude` CLI 확인/설치 후 마켓플레이스 `popup-studio-ai/bkit-claude-code` 추가 → bkit 설치. `/pdca` 명령이 뜨는지 확인. 사용 가능한 스킬·서브에이전트를 한 줄씩 파악한다.
- **STEP 2 · my-app 생성**: `my-app`에 Next.js를 `hello-page`와 같은 기본값으로 생성하고, `.env` 빈 파일 + `.gitignore` 등록을 확인한다.
- **STEP 3 · PRD 빈 틀**: `PRD.md`에 8개 항목 빈 템플릿을 만든다 — ①추진 배경 ②현행 방식·한계 ③목표·기대효과(숫자) ④사용자·이용 흐름 ⑤주요 기능(must 2개 + AI가 지킬 규칙) ⑥범위·비범위 ⑦신뢰·안전 원칙 ⑧개발 단위.
- **STEP 4 · PRD 채우기 (자동)**: INPUT 1-1을 근거로 8개 항목을 채운다. must 기능은 딱 2개, 각 기능에 숫자·조건 규칙을 뽑는다. 애매하면 기본값으로 채우고 로그만 남긴다.
- **STEP 5 · PRD 검토·개발 단위**: `PRD.md`의 빠진 곳·모호한 문장·예외 상황을 스스로 점검해 보완하고, 맨 아래에 "개발 단위"를 만들 순서대로 정리한다.
- **점검**: bkit 설치(`/pdca`)·my-app 분리·`.env` 4줄 유무·`PRD.md` 8항목을 확인표로 정리.

---

## 5. Part 3 — 규칙과 검증 루프 (CLAUDE.md)

> 목적: 프로젝트 규칙서 `CLAUDE.md`와 자동 검증 루프를 세팅.

- **STEP 1 · CLAUDE.md 초안**: `my-app`을 살펴 `CLAUDE.md` 초안을 만든다(`/init` 활용). 아래 규칙을 넣는다:
  - 모든 설명·주석은 한국어 / 새 파일은 `my-app` 안에만
  - 스택은 Next.js 고정, 배포 Vercel, 마이그레이션 제안 금지
  - 코드 변경 시 무엇을 왜 바꿨는지 한 줄 보고
  - `.env`·`node_modules`는 `.gitignore` 유지·커밋 금지
  - 인증 토큰은 묻거나 출력하지 말고 `.env`에서 읽어 사용
- **STEP 2 · 검증 루프 섹션**: `CLAUDE.md`에 "작업 절차(검증 루프)"를 추가 — ①변경 → ②`npm run lint`·`npm run build` → ③화면 작업이면 `npm run dev`로 확인 → ④문제면 고치고 다시 ① → 통과하면 한 줄 요약.
- **점검**: 규칙 5종·검증 루프 섹션·`lint`/`build` 실제 통과를 "항목 | 결과 | 실패 시 돌아갈 STEP" 표로 정리.

---

## 6. Part 4 — PDCA로 완성 (Plan·Design·Do·Check·Act)

> 목적: PRD를 실제 동작하는 앱으로. bkit `pdca` 스킬로 논스톱 반복.

- **STEP 1 · Plan & Design**: `pdca` 스킬로 `PRD.md`를 읽어 `PLAN.md`(작업 순서·목표·성공 기준)와 `DESIGN.md`(화면 구성·데이터 흐름·기술 선택, Next.js 기반)를 만든다.
- **STEP 2 · 정합성 검토**: `design-validator`로 `PRD/PLAN/DESIGN` 3문서가 어긋나지 않는지 검토하고 보완 사항을 반영한다.
- **STEP 3 · Do (반복)**: `PLAN.md`의 작업을 **한 번에 하나씩** `DESIGN.md`대로 구현한다. 각 조각마다 STEP 2의 검증 루프를 돌려 통과시키고, 다음 작업을 이어서 자동으로 진행한다. `CLAUDE/PRD/PLAN/DESIGN/.env/.gitignore`는 고치지 않는다. **PLAN의 모든 작업이 끝날 때까지 반복.**
- **STEP 4 · Check**: 설계 대비 Gap(빠진 기능/다른 동작/미처리 예외)을 정리하고, STEP 1 성공 기준의 충족/미충족을 판정한다. `security-architect`로 배포 전 보안 점검(키 노출·입력 신뢰·프롬프트 인젝션·개인정보)까지 한 뒤 결과를 `CHECK.md`(맨 위 통과/실패)로 정리한다.
- **STEP 5 · Act (반복)**: `CHECK.md` 맨 위 항목부터 하나씩 고치고 재검증한다. 보완점이 없어질 때까지 반복 → 없으면 "통과". 그다음 사용자 경험을 높일 작은 개선 1가지를 구현하고, 오늘 반복된 실수/새 기준을 `CLAUDE.md`에 규칙으로 한두 줄 추가한다.
- **점검**: `PLAN/DESIGN` 존재·미구현 작업 없음·`lint`/`build` 통과·`CHECK.md` 통과·`CLAUDE.md` 갱신을 확인표로 정리.

---

## 7. Part 5 — 배포와 발표 자료

> 목적: 인터넷에 공개하고 발표 자료까지 생성.

- **STEP 1 · 배포**: `.gitignore`(`.env`·`node_modules`) 확인 → GitHub **public** 저장소 생성(README.md 포함) → Vercel CLI로 배포. GitHub/Vercel 인증은 `.env`의 `GITHUB_TOKEN`·`VERCEL_TOKEN`을 읽어 쓰고 값은 출력하지 않는다. 앱이 쓰는 키(`OPENAI_API_KEY`)만 **Vercel 환경 변수**로 등록한다. → 공개 URL(`https://…vercel.app`) 발급. *(확인 없이 자동 진행 — 배포 키가 없으면 이 STEP만 건너뛰고 계속)*
- **STEP 2 · 배포 점검**: `origin`이 GitHub이고 미push 커밋 없음, 저장소 public·README 있음·`.env` 없음, `.vercel` 연결, 공개 URL 200 응답·제목 노출, Vercel 환경 변수에 앱 키 등록을 확인.
- **STEP 3 · 발표 PPT**: 폴더 문서(PRD/CLAUDE/README/DESIGN/PLAN)를 읽어 발표용 `.pptx`를 만든다 — 표지→문제→한계→해결책→핵심 기능→신뢰·보안 원칙→성공 기준(큰 숫자 카드)→기술 스택→마무리. (기본: 5~10분·일반 청중·10장 내외)

---

## 산출물 체크리스트 (완료 기준)

- [ ] `hello-page`: 프로필 + RAG 챗봇 로컬 동작
- [ ] `my-app`: `PRD.md` · `PLAN.md` · `DESIGN.md` · `CHECK.md` · `CLAUDE.md`
- [ ] `npm run lint` · `npm run build` 통과
- [ ] `CHECK.md` 맨 위 "통과", 보안 점검 포함
- [ ] GitHub public 저장소(+README, `.env` 미포함)
- [ ] 공개 URL `https://…vercel.app` 200 응답
- [ ] 발표용 `.pptx`

---

### 참고
- 이 런북의 근거 교재: 로컬 핸드북 `../handbook_basic/` (Part 1~5 이론·실습)
- 용어가 낯설면: `../handbook_basic/glossary.html`
- 색깔 안내 박스 의미: `../handbook_basic/guide.html`
