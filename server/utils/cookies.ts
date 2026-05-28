// 인증 쿠키 헬퍼 — 액세스/리프레시/CSRF 쿠키 이름·옵션과 read/set/clear, CSRF 토큰 발급/검증을 제공한다.
import type { Request, Response } from 'express';
import crypto from 'crypto';

export const COOKIE_ACCESS = 'tg_access';
export const COOKIE_REFRESH = 'tg_refresh';
export const COOKIE_CSRF = 'tg_csrf';

const isProd = process.env.NODE_ENV === 'production';

// httpOnly 액세스 토큰 쿠키 — 모든 /api 경로로 전송되도록 path='/'
export const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 86400 * 1000, // 7d (access TTL과 동일)
};

// httpOnly 리프레시 토큰 쿠키 — /api/auth/* 로만 전송 (탈출면 축소)
export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 86400 * 1000, // 30d
};

// CSRF 토큰 쿠키 — 클라이언트 JS가 읽어 X-CSRF-Token 헤더로 보내야 하므로 httpOnly=false (double-submit cookie 패턴)
export const csrfCookieOptions = {
  httpOnly: false,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 86400 * 1000,
};

// cookie-parser 없이 raw Cookie 헤더에서 특정 쿠키 추출
export function readCookie(req: Request, name: string): string | undefined {
  const raw = (req.headers?.cookie as string | undefined) || undefined;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return undefined;
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function setAuthCookies(res: Response, opts: {
  accessToken?: string;
  refreshToken?: string;
  csrfToken?: string;
}): void {
  if (opts.accessToken !== undefined) res.cookie(COOKIE_ACCESS, opts.accessToken, accessCookieOptions);
  if (opts.refreshToken !== undefined) res.cookie(COOKIE_REFRESH, opts.refreshToken, refreshCookieOptions);
  if (opts.csrfToken !== undefined) res.cookie(COOKIE_CSRF, opts.csrfToken, csrfCookieOptions);
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_ACCESS, { path: '/' });
  res.clearCookie(COOKIE_REFRESH, { path: '/api/auth' });
  res.clearCookie(COOKIE_CSRF, { path: '/' });
}

// 상태 변경 요청(POST/PUT/PATCH/DELETE) 판별
export function isStateChangingMethod(method: string): boolean {
  const m = (method || '').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

// CSRF 검증 — 쿠키 기반 인증일 때만 호출. 헤더와 쿠키 값을 timing-safe 비교.
export function validateCsrf(req: Request): boolean {
  const cookieToken = readCookie(req, COOKIE_CSRF);
  const headerToken = (req.headers['x-csrf-token'] || req.headers['X-CSRF-Token']) as string | undefined;
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
