# Tourgether — Replit 작업지시서 (Guardrails T10)
작업명: **T10 — Playwright 기반 “최소 E2E” 도입(가드레일 #6 충족)**  
목적: Guardrails 문서가 요구하는 “Playwright 기반 테스트 실행”을 **프로젝트에 실제로 심는다**.  
주의: Playwright는 설치가 무겁고 환경에 따라 실패할 수 있다. 실패 시에는 **즉시 중단하고, 실패 로그를 AI_MEMO.md에 기록**한다.

---

## 1) 이번 티켓 변경 파일(최소 세트)
- 수정: `package.json` (devDependencies + scripts)
- 추가: `playwright.config.ts`
- 추가: `tests/e2e/smoke.spec.ts`

> 설치 과정에서 `package-lock.json`이 바뀔 수 있음(정상).  
> 이 티켓은 “의존성 추가”가 포함되므로, 이전 티켓과 별도로 수행한다.

---

## 2) Replit Agent에게 줄 실행 지시문(그대로 복붙)
```text
[SAFE PATCH MODE - T10 Playwright Minimal E2E]

Goal:
- Add Playwright test setup with ONE smoke test:
  - Open base URL (http://127.0.0.1:5000)
  - Check that the page loads (has some expected text or title)
- Add scripts:
  - "test:e2e": "playwright test"
- Add devDependencies:
  - "@playwright/test"

Allowed files:
- package.json
- playwright.config.ts
- tests/e2e/smoke.spec.ts
- package-lock.json (only if npm updates it)

Forbidden:
- No other code changes.
- No refactors.

Output:
- Provide step-by-step instructions AND the unified diff.

Verify:
- I will run:
  npm install
  npx playwright install chromium
  npm run test:e2e
```

---

## 3) 수동 적용(직접)
### A) 설치(터미널)
```bash
npm i -D @playwright/test
npx playwright install chromium
```

> 만약 `playwright install`이 실패하면:
- 실패 로그를 `docs/AI_MEMO.md`에 기록하고
- **T8 smoke 테스트로 검증을 대체**한다(=현실적 예외)

### B) `playwright.config.ts` 생성(루트)
```ts
// Playwright minimal config for Tourgether E2E smoke.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000',
  },
});
```

### C) 테스트 파일 생성: `tests/e2e/smoke.spec.ts`
```ts
// E2E smoke: verify the app loads (basic page load check).
import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  // 아주 약한 조건: title이 비어있지 않기 (프로젝트마다 다를 수 있음)
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
```

### D) `package.json` scripts 추가
```json
"test:e2e": "playwright test"
```

---

## 4) 실행(검증)
1) 서버 실행(콘솔 1)
```bash
npm run dev
```

2) 테스트 실행(콘솔 2)
```bash
npm run test:e2e
```

---

## 5) 완료 기준
- Playwright가 설치되어 있고
- `npm run test:e2e`가 PASS(최소 1개 테스트)

---

## 6) 실패 시 처리(현실적 대응)
- Playwright 설치/실행이 Replit 환경에서 실패하면:
  - 에러 로그를 `docs/AI_MEMO.md`에 기록
  - T8의 `npm run smoke:auth`를 “검증 대체 수단”으로 사용한다.

---

## 7) 롤백
- devDependency 제거
- `playwright.config.ts`, `tests/e2e/` 삭제
- package-lock.json 원복(가능하면 Git로)
