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

const router = Router();

const REFRESH_COOKIE_NAME = 'tg_refresh';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 86400 * 1000,
};

function hashToken(t: string): string {
  return crypto.createHash('sha256').update(t).digest('hex');
}

// cookie-parser 없이 raw cookie 헤더에서 특정 쿠키 추출
function readCookie(req: any, name: string): string | undefined {
  const raw = req.headers?.cookie as string | undefined;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

// Refresh 토큰 발급 (로그인 직후 호출 권장)
router.post('/refresh/issue', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
    const refreshToken = await issueRefreshToken(req.user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTS);
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth] refresh/issue 오류:', err);
    res.status(500).json({ message: 'Failed to issue refresh token' });
  }
});

// 액세스 토큰 갱신 (회전)
router.post('/refresh', async (req, res: Response) => {
  try {
    const rawToken = readCookie(req, REFRESH_COOKIE_NAME) || req.body?.refreshToken;
    if (!rawToken) return res.status(401).json({ message: 'No refresh token' });
    const rotated = await rotateRefreshToken(rawToken);
    if (!rotated) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    const [user] = await db.select().from(users).where(eq(users.id, rotated.userId)).limit(1);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const accessToken = generateAccessToken({ id: user.id, email: user.email || '', role: user.role || 'user' });
    res.cookie(REFRESH_COOKIE_NAME, rotated.newRefreshToken, REFRESH_COOKIE_OPTS);
    res.json({ success: true, accessToken });
  } catch (err) {
    console.error('[Auth] refresh 오류:', err);
    res.status(500).json({ message: 'Failed to refresh token' });
  }
});

// 로그아웃 (DB 영속화: 액세스 토큰 폐기 + refresh 전체 폐기)
router.post('/logout-secure', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (accessToken) await revokeAccessToken(accessToken, req.user?.id);
    if (req.user?.id) await revokeAllRefreshTokens(req.user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
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
