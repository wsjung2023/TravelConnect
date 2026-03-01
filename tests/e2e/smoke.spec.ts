// E2E smoke test: verifies demo-login and /me endpoint (T10).
// NOTE: Chromium is not available in Replit dev environment.
// Use `node scripts/smoke/smoke-auth.mjs` instead for CI smoke testing.
import { test, expect } from '@playwright/test';

test('demo-login returns token and /me returns user id', async ({ request }) => {
  const loginRes = await request.post('/api/auth/demo-login');
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();
  expect(token).toBeTruthy();

  const meRes = await request.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(meRes.ok()).toBeTruthy();
  const me = await meRes.json();
  expect(me.id).toBeTruthy();
});
