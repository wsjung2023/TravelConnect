// Smoke 테스트 — 서버 실행 후 demo-login → /me 흐름을 검증하는 최소 통합 테스트 스크립트.
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
