// 인증/CSRF 쿠키 흐름 회귀 방지 통합 스모크 — Task #11. 로그인이 tg_access/tg_refresh/tg_csrf 셋을 발급하고, 쿠키 POST는 X-CSRF-Token 필수, /refresh가 셋을 회전, /logout-secure가 모두 만료+토큰 폐기, Bearer 경로는 CSRF 면제임을 검증한다.
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';

let failed = 0;
function ok(msg) { console.log(`✅ ${msg}`); }
function bad(msg, detail) {
  failed++;
  console.error(`❌ ${msg}`);
  if (detail !== undefined) {
    try { console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)); }
    catch { console.error(detail); }
  }
}
function assert(cond, msg, detail) { if (cond) ok(msg); else bad(msg, detail); }

function parseSetCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') return res.headers.getSetCookie();
  if (typeof res.headers.raw === 'function') {
    const arr = res.headers.raw()['set-cookie'];
    if (arr) return arr;
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function parseCookie(raw) {
  const parts = raw.split(';').map((s) => s.trim()).filter(Boolean);
  const [nv, ...attrs] = parts;
  const eq = nv.indexOf('=');
  const name = nv.slice(0, eq);
  const value = nv.slice(eq + 1);
  const flags = {};
  for (const a of attrs) {
    const i = a.indexOf('=');
    if (i < 0) flags[a.toLowerCase()] = true;
    else flags[a.slice(0, i).toLowerCase()] = a.slice(i + 1);
  }
  return { name, value, flags };
}

const findCookie = (cookies, name) => cookies.find((c) => c.name === name);
const cookieHeader = (cookies, names) =>
  cookies.filter((c) => names.includes(c.name) && c.value !== '').map((c) => `${c.name}=${c.value}`).join('; ');

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/auth/me`, { method: 'GET' });
      // 어떤 응답이든 (200/401 등) 서버가 응답하면 준비된 것으로 간주
      if (r.status > 0) return;
    } catch (e) { lastErr = e; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not reachable at ${BASE} within ${timeoutMs}ms: ${lastErr}`);
}

async function req(method, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json, setCookies: parseSetCookies(res).map(parseCookie) };
}

(async () => {
  console.log(`🧪 Auth cookie/CSRF smoke against ${BASE}`);
  await waitForServer();

  // 1) 로그인 → 세 쿠키 발급 + 속성 확인
  const login = await req('POST', '/api/auth/demo-login');
  assert(login.status === 200, 'demo-login returns 200', login.json);

  const access = findCookie(login.setCookies, 'tg_access');
  const refresh = findCookie(login.setCookies, 'tg_refresh');
  const csrf = findCookie(login.setCookies, 'tg_csrf');

  assert(!!access && access.flags.httponly === true && (access.flags.path || '/') === '/',
    'tg_access set HttpOnly, Path=/', access);
  assert(!!refresh && refresh.flags.httponly === true && refresh.flags.path === '/api/auth',
    'tg_refresh set HttpOnly, Path=/api/auth', refresh);
  assert(!!csrf && csrf.flags.httponly !== true,
    'tg_csrf set non-HttpOnly (JS-readable for double-submit)', csrf);

  if (!access || !refresh || !csrf) {
    console.error('❌ 필수 쿠키 누락 — 이후 단계 중단');
    process.exit(1);
  }

  let cookies = login.setCookies;
  let csrfToken = csrf.value;

  // 사전 점검 — 개발 자동 로그인이 켜져 있으면 일부 보안 단언(폐기 Bearer 거부)을 스킵해야 한다.
  // (server/auth.ts: NODE_ENV=development && SKIP_DEV_AUTO_LOGIN!=='true' 일 때 인증 실패 시 기본 사용자 생성)
  const probe = await req('GET', '/api/auth/me', {
    headers: { Authorization: 'Bearer obviously-invalid-token-for-probe' },
  });
  const devAutoLogin = probe.status === 200;
  if (devAutoLogin) {
    console.log('ℹ️  개발 자동 로그인 감지 — 폐기 Bearer 단언은 스킵 (SKIP_DEV_AUTO_LOGIN=true 로 켜면 검증됨)');
  }

  // 2) GET /me — 쿠키 인증만으로 200
  const meCookie = await req('GET', '/api/auth/me', {
    headers: { Cookie: cookieHeader(cookies, ['tg_access', 'tg_csrf']) },
  });
  assert(meCookie.status === 200 && !!meCookie.json?.id,
    'GET /api/auth/me with cookie auth returns 200 with user id', meCookie);

  // 3) 쿠키 인증 + 상태 변경 POST — X-CSRF-Token 없으면 403
  const onboardBody = { userType: 'traveler', interests: [], languages: ['ko'], timezone: 'Asia/Seoul' };
  const noCsrf = await req('POST', '/api/auth/onboarding', {
    headers: { Cookie: cookieHeader(cookies, ['tg_access', 'tg_csrf']) },
    body: onboardBody,
  });
  assert(noCsrf.status === 403,
    'cookie-auth POST without X-CSRF-Token returns 403', noCsrf);

  // 4) 동일 요청 + X-CSRF-Token → 200
  const withCsrf = await req('POST', '/api/auth/onboarding', {
    headers: { Cookie: cookieHeader(cookies, ['tg_access', 'tg_csrf']), 'X-CSRF-Token': csrfToken },
    body: onboardBody,
  });
  assert(withCsrf.status === 200,
    'cookie-auth POST with valid X-CSRF-Token returns 200', withCsrf);

  // 5) /api/auth/refresh — 세 쿠키 모두 회전 (값이 달라야 함)
  // JWT iat는 초 단위 → 같은 초 안에 발급하면 페이로드/서명이 동일해진다. 1.1초 대기 후 회전.
  await new Promise((r) => setTimeout(r, 1100));
  const refreshRes = await req('POST', '/api/auth/refresh', {
    headers: { Cookie: cookieHeader(cookies, ['tg_refresh', 'tg_csrf']), 'X-CSRF-Token': csrfToken },
  });
  assert(refreshRes.status === 200, '/api/auth/refresh returns 200', refreshRes);
  const newAccess = findCookie(refreshRes.setCookies, 'tg_access');
  const newRefresh = findCookie(refreshRes.setCookies, 'tg_refresh');
  const newCsrf = findCookie(refreshRes.setCookies, 'tg_csrf');
  assert(!!newAccess && newAccess.value && newAccess.value !== access.value,
    '/refresh rotates tg_access to a new value', newAccess);
  assert(!!newRefresh && newRefresh.value && newRefresh.value !== refresh.value,
    '/refresh rotates tg_refresh to a new value', newRefresh);
  assert(!!newCsrf && newCsrf.value && newCsrf.value !== csrf.value,
    '/refresh rotates tg_csrf to a new value', newCsrf);

  if (newAccess && newRefresh && newCsrf) {
    cookies = refreshRes.setCookies;
    csrfToken = newCsrf.value;
  }

  // 폐기 검증용 — 로그아웃 전 시점의 refresh/csrf 쿠키 값을 보관
  const preLogoutRefreshCookie = `tg_refresh=${newRefresh.value}; tg_csrf=${newCsrf.value}`;
  const preLogoutCsrfToken = newCsrf.value;

  // 6) Bearer 헤더 경로 — CSRF 없이도 200 (기존 호환)
  const bearerToken = (newAccess && newAccess.value) || access.value;
  const bearerPost = await req('POST', '/api/auth/onboarding', {
    headers: { Authorization: `Bearer ${bearerToken}` },
    body: onboardBody,
  });
  assert(bearerPost.status === 200,
    'Bearer-auth POST without X-CSRF-Token returns 200 (backward compatible)', bearerPost);

  // 7) /api/auth/logout-secure — 세 쿠키 만료 + 액세스 토큰 폐기
  const logout = await req('POST', '/api/auth/logout-secure', {
    headers: { Cookie: cookieHeader(cookies, ['tg_access', 'tg_csrf']), 'X-CSRF-Token': csrfToken },
  });
  assert(logout.status === 200, '/api/auth/logout-secure returns 200', logout);

  const clearedAccess = findCookie(logout.setCookies, 'tg_access');
  const clearedRefresh = findCookie(logout.setCookies, 'tg_refresh');
  const clearedCsrf = findCookie(logout.setCookies, 'tg_csrf');

  const isExpired = (c) =>
    !!c && (c.value === '' ||
      /1970|Thu, 01 Jan/i.test(c.flags.expires || '') ||
      c.flags['max-age'] === '0');

  assert(isExpired(clearedAccess), 'logout expires tg_access', clearedAccess);
  assert(isExpired(clearedRefresh) && clearedRefresh?.flags.path === '/api/auth',
    'logout expires tg_refresh (Path=/api/auth)', clearedRefresh);
  assert(isExpired(clearedCsrf), 'logout expires tg_csrf', clearedCsrf);

  // 8) 로그아웃 후 — refresh 토큰도 서버에서 폐기되어야 한다 (쿠키 만료만으로는 부족).
  //    개발 자동 로그인 여부와 무관하게 /api/auth/refresh는 결정적으로 401이어야 한다 (auto-login은 인증 미들웨어에서만 동작).
  const refreshAfterLogout = await req('POST', '/api/auth/refresh', {
    headers: { Cookie: preLogoutRefreshCookie, 'X-CSRF-Token': preLogoutCsrfToken },
  });
  assert(refreshAfterLogout.status === 401,
    'POST /api/auth/refresh with pre-logout refresh token returns 401 (server-side revoke)',
    refreshAfterLogout);

  // 9) 로그아웃 후 같은 Bearer는 폐기되어 /me가 401 — 단, 개발 자동 로그인 모드에서는 폴백 인증되므로 스킵.
  if (devAutoLogin) {
    console.log('⏭️  skip: revoked Bearer 단언 (개발 자동 로그인이 켜진 환경)');
  } else {
    const meAfter = await req('GET', '/api/auth/me', {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    assert(meAfter.status === 401,
      'GET /me with revoked Bearer returns 401 after logout', meAfter);
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n✅ All auth/CSRF cookie assertions passed');
  process.exit(0);
})().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
