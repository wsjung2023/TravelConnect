# Tourgether — Replit 작업지시서 (Guardrails T1~T4 적용)
작성 목적: **Replit AI 비용 없이(=Agent/AI 안 씀)**, 프로젝트에 `Replit_VibeCoding_Guardrails.md`의 핵심 규칙을 **실제로 “작동”하게** 심는다.  
적용 범위: **T1~T4** (용량/레포 위생 + 가드레일 문서 고정 + 메모/가이드 + 커밋 차단장치)

---

## 0) 전제/원칙 (반드시 지키기)
- **Replit Agent / AI 기능 사용 금지**: 이 작업은 “파일 생성/붙여넣기”만으로 끝난다.
- “정리/리팩토링/포맷팅” 같은 추가 작업 금지.  
- 수정 파일은 아래 목록만. (그 외 파일은 건드리지 말 것)

### 이번 작업에서 수정/추가하는 파일 목록(정확히 이만)
- 수정: `/.gitignore`
- 추가: `/GUARDRAILS.md`
- 추가: `/docs/AI_MEMO.md`
- 추가: `/scripts/guardrails/check-lines.mjs`
- 추가: `/scripts/guardrails/check-header.mjs`
- 수정: `/.lintstagedrc.json`
- 추가(폴더/빈파일): `/uploads/.gitkeep`, `/attached_assets/.gitkeep`

---

## 1) Replit에서 진행 방식 (터미널 없이)
1. Replit 프로젝트 열기
2. 좌측 **Files(파일 탐색기)** 에서 아래 단계대로 파일을 생성/수정
3. 저장(Ctrl+S)만 하면 끝

> 팁: Replit 파일 만들기  
> - 폴더 우클릭 → **New file** / **New folder**  
> - 또는 상단 **+** 버튼으로 생성

---

## 2) T1 — 용량/데이터 분리(레포 위생): `.gitignore` 수정
### 작업
`/.gitignore` 파일 맨 아래에 아래 2줄을 **추가**한다.

```gitignore
# Runtime uploads / attachments (DO NOT COMMIT)
uploads/
attached_assets/
```

### 기대 효과
- `uploads/`, `attached_assets/` 안의 **대용량 이미지/영상**이 커밋/공유/수정에 섞이지 않아서
  - 레포 용량 폭증 방지
  - Replit “수정하다가 파일 덩어리까지 휘말리는” 사고 방지

---

## 3) T2 — 가드레일 규칙을 프로젝트에 “박제”: `GUARDRAILS.md` 생성
### 작업
루트에 새 파일 생성: `/GUARDRAILS.md`  
아래 내용을 **그대로 전체 붙여넣기**.

```md
# Replit VibeCoding Guardrails (강제 규칙 파일)

> 목적: Replit 및 AI 코딩 에이전트가 불필요한 수정, 거짓 보고, 과도한 코드 생성, 비용 낭비를 하지 못하도록 강제하기 위한 프로젝트 규칙.

---

## 1. 기본 원칙 (상황 → 행동 규칙)

- 코드가 250~400줄을 초과하면 → 반드시 파일을 분리한다.
- 에러 가능성이 있으면 → 반드시 try-catch 또는 안전장치를 추가한다.
- 새 파일을 만들면 → 파일 상단에 한 줄 설명을 반드시 작성한다.
- 기능이 증가하면 → 하나의 파일에 몰아넣지 말고 기능별로 분리한다.
- 설명 반복이 발생하면 → 파일에 메모를 남겨 다음 세션에서도 유지한다.

---

## 2. Hooks 개념 (트리거 기반 자동 규칙)

명령 감지 → 트리거 발동 → 자동 실행 → 검증 완료

다음 상황에서 자동 규칙 적용:

- 파일이 250~400줄 초과 → 분리 강제
- 에러 가능 코드 발견 → 안전장치 삽입
- 신규 파일 생성 → 상단 설명 추가
- 기능 증가 감지 → 모듈 분리 제안

---

## 3. 모노레포 구조 규칙

절대 금지:
- 하나의 파일에 다수 기능 몰아넣기

권장:
- auth.ts
- api.ts
- ui.tsx
- utils.ts

각 폴더 규칙:
- 모든 폴더에 GUIDE.md 존재해야 함
- 파일마다 상단 한 줄 설명 필수

---

## 4. 데이터 및 설계 규칙

- DB 연결은 기본적으로 읽기 전용으로 시작
- 충분한 기획/설계 시간을 확보 후 구현 시작
- 즉흥 리팩토링 금지

---

## 5. Replit Agent 금지 행동 (강제 가드레일)

절대 금지:

- 400줄 이상 코드 한 번에 생성
- 테스트 실행 없이 "성공" 또는 "완료" 주장
- 실행하지 않은 코드를 실행했다고 보고
- 기존 구조 무시한 대규모 리팩토링
- 사용자 확인 없이 파일 대량 생성
- 동일 기능 반복 재작성
- 추측 기반 설명(사실처럼 말하기 금지)
- 로그 확인 없이 원인 단정

---

## 6. 검증 규칙

모든 변경 후 반드시:

- 테스트 실행 또는 최소한의 실행 검증
- 실제 실행 여부 확인
- 에러 로그 확인
- 변경 범위 최소화 검토
- 기존 동작 유지 여부 점검

---

## 7. 파일 메모 유지 규칙

중요 발견 시 즉시 기록한다.
목적:
- 반복 설명 비용 감소
- 세션 기억 의존도 최소화
- AI 오동작 방지

---

## 8. 최종 원칙

AI는 편의 도구이며 결정권자는 사용자다.
불확실하면 수정하지 말고 질문한다.
과도한 자동화보다 안정성을 우선한다.
```

---

## 4) T2(메모 유지) — `docs/AI_MEMO.md` 생성
### 작업
폴더 생성: `/docs` (없으면 만들기)  
파일 생성: `/docs/AI_MEMO.md`  
아래 내용 붙여넣기.

```md
# AI MEMO (중요 결정/발견 기록)

- 날짜:
- 작업 범위(티켓/기능):
- 왜 했나(문제):
- 무엇을 바꿨나(요약):
- 위험/주의사항:
- 롤백 방법:
- 다음 액션:
```

---

## 5) T4 — 커밋 차단장치(가드레일 자동 실행) 파일 2개 추가
> 목적: “대형 파일(>400줄) 생성” 및 “신규 파일 헤더 누락”을 **커밋 단계에서 자동 차단**한다.  
> (Replit AI가 폭주해도, 커밋에서 잡히게 만들기)

### 5-1) `/scripts/guardrails/check-lines.mjs` 생성
폴더 생성: `/scripts/guardrails` (없으면 만들기)  
파일 생성: `/scripts/guardrails/check-lines.mjs`  
아래 내용 붙여넣기.

```js
// Guardrail: block committing files over 400 lines; warn over 250 lines.
import fs from "node:fs";

const files = process.argv.slice(2).filter(Boolean);
if (files.length === 0) process.exit(0);

let hardFail = false;

for (const f of files) {
  try {
    if (!fs.existsSync(f)) continue;
    const stat = fs.statSync(f);
    if (!stat.isFile()) continue;

    const text = fs.readFileSync(f, "utf8");
    const lines = text.split("\n").length;

    if (lines > 400) {
      console.error(`❌ Guardrail: ${f} has ${lines} lines (>400). Split the file.`);
      hardFail = true;
    } else if (lines > 250) {
      console.warn(`⚠️ Guardrail: ${f} has ${lines} lines (>250). Consider splitting soon.`);
    }
  } catch (e) {
    console.warn(`⚠️ Guardrail: skipped ${f} (read error).`, e?.message ?? e);
  }
}

if (hardFail) process.exit(1);
process.exit(0);
```

### 5-2) `/scripts/guardrails/check-header.mjs` 생성
파일 생성: `/scripts/guardrails/check-header.mjs`  
아래 내용 붙여넣기.

```js
// Guardrail: require 1-line description at top for newly added files.
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const stagedFiles = process.argv.slice(2).filter(Boolean);
if (stagedFiles.length === 0) process.exit(0);

// Detect newly added files in git index (status "A")
let added = new Set();
try {
  const out = execSync("git diff --cached --name-status --diff-filter=A", { encoding: "utf8" });
  for (const line of out.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/, 2);
    const status = parts[0];
    const file = parts[1];
    if (status === "A" && file) added.add(file);
  }
} catch {
  // If git isn't available, don't block commits.
  process.exit(0);
}

const needCheck = stagedFiles.filter((f) => added.has(f));
if (needCheck.length === 0) process.exit(0);

function firstMeaningfulLine(text) {
  const lines = text.split("\n");
  let i = 0;
  if (lines[0]?.startsWith("#!")) i = 1; // allow shebang
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    return line;
  }
  return "";
}

function isOkHeader(file, line) {
  const ext = path.extname(file).toLowerCase();
  if ([".json", ".lock", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".pdf"].includes(ext)) return true;

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    return line.startsWith("//") && line.replace("//", "").trim().length >= 5;
  }
  if (ext === ".md") return line.startsWith("#") || line.startsWith(">") || line.length >= 5;
  if (ext === ".css") return line.startsWith("/*") || line.startsWith("//");
  return true; // default: don't block
}

let fail = false;
for (const f of needCheck) {
  try {
    const text = fs.readFileSync(f, "utf8");
    const line = firstMeaningfulLine(text);
    if (!isOkHeader(f, line)) {
      console.error(`❌ Guardrail: New file "${f}" must start with a 1-line description.`);
      console.error(`   Example for TS/TSX: // What this file does (one line)`);
      fail = true;
    }
  } catch (e) {
    console.warn(`⚠️ Guardrail: skipped ${f} (read error).`, e?.message ?? e);
  }
}

if (fail) process.exit(1);
process.exit(0);
```

---

## 6) T4 — `lint-staged`에 guardrails 체크 연결: `/.lintstagedrc.json` 수정
### 작업
루트의 `/.lintstagedrc.json` 파일을 열고 아래처럼 수정한다.  
(기존 값이 있다면, **아래 항목 2개(`check-lines`, `check-header`)를 추가**하는 것이 핵심)

```json
{
  "**/*.{ts,tsx,js,jsx,json,css,md}": [
    "node scripts/guardrails/check-lines.mjs",
    "node scripts/guardrails/check-header.mjs",
    "eslint --fix",
    "prettier --write"
  ]
}
```

> 만약 프로젝트에 `eslint` / `prettier`가 없어서 커밋이 실패하면,  
> 위 배열에서 `eslint --fix`, `prettier --write` 두 줄은 **지우고**,  
> guardrails 두 줄만 남겨도 된다. (핵심은 guardrails 차단장치)

---

## 7) T1 보강 — 런타임 폴더 존재만 유지: `uploads`, `attached_assets`
### 작업
폴더 생성:
- `/uploads`
- `/attached_assets`

각 폴더에 빈 파일 생성:
- `/uploads/.gitkeep`
- `/attached_assets/.gitkeep`

---

## 8) 적용 확인(비용 0원, 터미널 최소)
### 8-1) 파일 존재 확인
- 루트에 `GUARDRAILS.md`가 있는가?
- `docs/AI_MEMO.md`가 있는가?
- `scripts/guardrails/` 안에 `check-lines.mjs`, `check-header.mjs`가 있는가?
- `.gitignore`에 `uploads/`, `attached_assets/`가 있는가?
- `.lintstagedrc.json`에 guardrails 두 줄이 들어갔는가?

### 8-2) (선택) 터미널에서 스크립트 실행 확인
Replit에서 Shell/Console 열 수 있으면 아래 실행(에러 없으면 OK):

```bash
node scripts/guardrails/check-lines.mjs
node scripts/guardrails/check-header.mjs
```

---

## 9) 다음 단계(중요): T5 이후는 “실제 코드 분리” 작업
T1~T4는 **안전 레일 설치**다.  
그 다음부터는 초대형 파일(예: `server/routes.ts`, `server/storage.ts`, `client/src/components/MapComponent.tsx`)을  
가드레일 규칙에 맞게 **작게 쪼개는 작업(T5~)** 로 들어간다.

다음 티켓(T5) 진행 방식(권장):
- “허용 파일 2~3개”
- “변경 200줄 내”
- “검증 체크리스트 포함”
- “완료 후 AI_MEMO.md에 기록”

---

## 부록: 커밋 시 차단이 안 걸리는 경우(자주 나오는 이슈)
- 프로젝트가 Git 관리가 아니라면(커밋/푸시 자체가 없는 상태) → guardrails는 커밋 단계에서 작동하지 않는다.
  - 이 경우에도 `GUARDRAILS.md`가 규칙을 고정해주는 효과는 있고,
  - 추후 Git 연결 후 커밋을 사용하면 즉시 차단장치가 작동한다.
