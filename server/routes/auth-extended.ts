// 인증 확장 라우터 — JWT Refresh Token 회전 + 이메일 인증 + 로그아웃 DB 영속화
import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticateHybrid, type AuthRequest } from '../auth';
import { db } from '../db';
import { users, emailVerificationTokens } from '@shared/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import {
  generateAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAccessToken,
  revokeAllRefreshTokens,
} from '../services/tokenService';
import {
  setAuthCookies,
  clearAuthCookies,
  generateCsrfToken,
  readCookie,
  COOKIE_REFRESH,
} from '../utils/cookies';

const router = Router();

function hashToken(t: string): string {
  return crypto.createHash('sha256').update(t).digest('hex');
}

// Refresh 토큰 발급 (로그인 직후 호출 권장) — H-5: 액세스 + CSRF 쿠키도 함께 발급
router.post('/refresh/issue', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const refreshToken = await issueRefreshToken(req.user.id);
    const accessToken = generateAccessToken({ id: req.user.id, email: req.user.email || '', role: req.user.role || 'user' });
    const csrfToken = generateCsrfToken();
    setAuthCookies(res, { accessToken, refreshToken, csrfToken });
    // H-5: csrfToken을 응답 본문에 노출하지 않음. 클라이언트는 tg_csrf 쿠키에서 직접 읽음.
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] refresh/issue 오류:', err);
    res.status(500).json({ message: 'Failed to issue refresh token' });
  }
});

// 액세스 토큰 갱신 (회전) — H-5: 새 액세스/CSRF 쿠키도 함께 재발급
// NOTE: routes/auth.ts에서도 동일한 /api/auth/refresh를 등록하며, authRouter가 먼저 마운트되어 그쪽이 우선 매칭됨.
// 이 핸들러는 authRouter 변경 실패 시 폴백 경로로 남겨두고 동일한 쿠키 동작을 유지한다.
router.post('/refresh', async (req, res: Response) => {
  try {
    const cookieToken = readCookie(req, COOKIE_REFRESH);
    const rawToken = cookieToken || req.body?.refreshToken;
    if (!rawToken) return res.status(401).json({ message: 'No refresh token' });
    // H-5: 쿠키 기반 refresh는 CSRF 검증 필수.
    if (cookieToken) {
      const { validateCsrf } = await import('../utils/cookies');
      if (!validateCsrf(req)) {
        clearAuthCookies(res);
        return res.status(403).json({ message: 'CSRF validation failed' });
      }
    }
    const rotated = await rotateRefreshToken(rawToken);
    if (!rotated) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    const [user] = await db.select().from(users).where(eq(users.id, rotated.userId)).limit(1);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const accessToken = generateAccessToken({ id: user.id, email: user.email || '', role: user.role || 'user' });
    const csrfToken = generateCsrfToken();
    setAuthCookies(res, { accessToken, refreshToken: rotated.newRefreshToken, csrfToken });
    // H-5: 토큰은 쿠키로만 전달.
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] refresh 오류:', err);
    res.status(500).json({ message: 'Failed to refresh token' });
  }
});

// 로그아웃 (DB 영속화: 액세스 토큰 폐기 + refresh 전체 폐기 + 모든 인증 쿠키 만료)
router.post('/logout-secure', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    // 쿠키에 액세스 토큰이 있으면 그것도 함께 폐기
    const { COOKIE_ACCESS } = await import('../utils/cookies');
    const cookieAccess = readCookie(req, COOKIE_ACCESS);
    if (bearer) await revokeAccessToken(bearer, req.user?.id);
    if (cookieAccess && cookieAccess !== bearer) await revokeAccessToken(cookieAccess, req.user?.id);
    if (req.user?.id) await revokeAllRefreshTokens(req.user.id);
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] logout-secure 오류:', err);
    res.status(500).json({ message: 'Failed to logout' });
  }
});

// 이메일 인증 토큰 발급 (회원가입 후 또는 재발송)
router.post('/email/verify/send', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isEmailVerified) return res.json({ success: true, alreadyVerified: true });

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24h

    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash,
      email: user.email || '',
      expiresAt,
    });

    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/email/verify?token=${rawToken}`;
    // 실 발송: 외부 SMTP/SendGrid 연동 필요. 현재는 콘솔 출력 + 응답 노출 (개발용).
    console.log(`[EmailVerify] ${user.email} → ${verifyUrl}`);

    res.json({
      success: true,
      message: 'Verification email queued (SMTP integration pending)',
      devOnly: process.env.NODE_ENV !== 'production' ? { verifyUrl } : undefined,
    });
  } catch (err) {
    console.error('[Auth] email/verify/send 오류:', err);
    res.status(500).json({ message: 'Failed to send verification email' });
  }
});

// 이메일 인증 확인 (토큰 클릭)
router.get('/email/verify', async (req, res: Response) => {
  try {
    const rawToken = req.query.token as string;
    if (!rawToken) return res.status(400).json({ message: 'Token required' });
    const tokenHash = hashToken(rawToken);
    const [row] = await db.select().from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        isNull(emailVerificationTokens.verifiedAt),
        gt(emailVerificationTokens.expiresAt, new Date()),
      )).limit(1);
    if (!row) return res.status(400).json({ message: 'Invalid or expired token' });

    await db.transaction(async (tx) => {
      await tx.update(emailVerificationTokens).set({ verifiedAt: new Date() }).where(eq(emailVerificationTokens.id, row.id));
      await tx.update(users).set({ isEmailVerified: true }).where(eq(users.id, row.userId));
    });

    console.log(`[EmailVerify] 완료: user=${row.userId} email=${row.email}`);
    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error('[Auth] email/verify 오류:', err);
    res.status(500).json({ message: 'Failed to verify email' });
  }
});

export default router;
