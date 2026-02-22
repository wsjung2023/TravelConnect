# Tourgether — Replit 작업지시서 (Guardrails T8)
작업명: **T8 — “실행 없이 완료 주장 금지”를 강제하는 Smoke Test(초경량) 추가**  
목적: Guardrails 6번(검증 규칙)을 “말”이 아니라 “스크립트”로 만든다.  
원칙: Playwright는 무겁고 실패율이 있을 수 있으니, **먼저 초경량 smoke**를 만들고, T10에서 Playwright를 별도로 설치한다.

---

## 1) 이번 티켓 변경 파일(정확히 2개)
- 추가: `scripts/smoke/smoke-auth.mjs`
- 수정: `package.json` (scripts에 1줄 추가만)

---

## 2) Replit Agent에게 줄 실행 지시문(그대로 복붙)
```text
[SAFE PATCH MODE - T8 Smoke Auth]

Goal:
- Add a lightweight smoke test script that checks:
  1) /api/auth/demo-login returns token
  2) /api/auth/me works with that token
- Add npm script: "smoke:auth": "node scripts/smoke/smoke-auth.mjs"

Allowed files (ONLY):
- scripts/smoke/smoke-auth.mjs
- package.json

Forbidden:
- No other files changed.
- No dependency changes.
- No formatting unrelated sections.

Output:
- Unified diff only.

Verify:
- I will run:
  npm run dev   (in one console)
  npm run smoke:auth (in another)
```

---

## 3) 수동 적용(직접 붙여넣기)

### A) `scripts/smoke/smoke-auth.mjs` 생성
폴더 생성: `scripts/smoke`  
파일 생성: `scripts/smoke/smoke-auth.mjs`  
내용:

```js
// Smoke test: verify auth endpoints (demo-login -> me) while server is running.
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

function fail(msg, detail) {
  console.error(`❌ SMOKE FAIL: ${msg}`);
  if (detail) console.error(detail);
  process.exit(1);
}

(async () => {
  console.log(`🧪 Smoke auth against ${BASE}`);

  const demo = await post('/api/auth/demo-login', {});
  if (!demo.ok) fail('demo-login request failed', demo);
  const token = demo.json?.token;
  if (!token) fail('demo-login did not return token', demo);

  const me = await get('/api/auth/me', { Authorization: `Bearer ${token}` });
  if (!me.ok) fail('me request failed', me);

  const hasId = !!me.json?.id;
  if (!hasId) fail('me response missing id', me);

  console.log('✅ SMOKE PASS: demo-login -> me works');
  process.exit(0);
})().catch((e) => fail('unexpected error', e));
```

> 주의: 이 스크립트는 **서버가 이미 실행 중**이어야 한다.

### B) `package.json`에 script 1줄 추가
`package.json` → `"scripts"`에 아래 1줄 추가:

```json
"smoke:auth": "node scripts/smoke/smoke-auth.mjs"
```

---

## 4) 실행 방법(검증)
1) 콘솔 1: 서버 실행
```bash
npm run dev
```

2) 콘솔 2: smoke 실행
```bash
npm run smoke:auth
```

---

## 5) 완료 기준
- `npm run smoke:auth`가 ✅ PASS로 끝난다.
- 서버 로직 변경 없음.

---

## 6) 롤백
- `scripts/smoke/smoke-auth.mjs` 삭제
- package.json에서 `smoke:auth` 라인 제거

---

## 7) 메모 기록
`docs/AI_MEMO.md`에 “T8: smoke test 도입(Playwright는 T10)” 기록.
