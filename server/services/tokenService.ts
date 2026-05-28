// JWT Refresh/Revoke 토큰 관리 서비스 — refresh_tokens·revoked_tokens 테이블 기반 영속 인증
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { refreshTokens, revokedTokens } from '@shared/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || '';
const ACCESS_TOKEN_TTL = '7d'; // 기존 호환
const REFRESH_TOKEN_TTL_DAYS = 30;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateAccessToken(user: { id: string; email: string; role: string }): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL }
  );
}

// Refresh 토큰 생성 + DB 저장 (해시만)
export async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000);
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
  return rawToken;
}

// Refresh 토큰 검증 + 회전 (rotate) — 원자적 트랜잭션 + reuse 감지 시 사용자 전체 폐기
export async function rotateRefreshToken(rawToken: string): Promise<{ userId: string; newRefreshToken: string } | null> {
  const tokenHash = hashToken(rawToken);
  const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
  if (!row) return null;

  // Reuse 감지: 이미 폐기된 토큰 재사용 → 탈취로 간주, 사용자의 모든 refresh 토큰 강제 폐기
  if (row.revokedAt) {
    console.warn(`[TokenService] ⚠️ Refresh 토큰 재사용 감지(user=${row.userId}) — 전체 폐기 실행`);
    await revokeAllRefreshTokens(row.userId);
    return null;
  }
  if (row.expiresAt < new Date()) return null;

  // 트랜잭션으로 폐기+신규 발급 원자화 (race condition 방지)
  const newRawToken = crypto.randomBytes(48).toString('base64url');
  const newHash = hashToken(newRawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000);

  const result = await db.transaction(async (tx) => {
    // 조건부 UPDATE: revokedAt이 여전히 null일 때만 폐기 (다른 회전이 이미 일어났다면 실패)
    const updated = await tx.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    if (updated.length === 0) {
      // 동시에 다른 요청이 이미 회전 완료 → 이 요청은 중복으로 처리
      return null;
    }
    await tx.insert(refreshTokens).values({ userId: row.userId, tokenHash: newHash, expiresAt });
    return { userId: row.userId, newRefreshToken: newRawToken };
  });

  return result;
}

// 사용자의 모든 refresh 토큰 폐기 (전체 로그아웃)
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db.update(refreshTokens).set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

// 액세스 토큰 폐기 (로그아웃 시 호출) — JWT 자체는 만료 전까진 유효하므로 DB 블랙리스트
export async function revokeAccessToken(accessToken: string, userId?: string): Promise<void> {
  try {
    const decoded = jwt.decode(accessToken) as any;
    const exp = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 86400 * 1000);
    const tokenHash = hashToken(accessToken);
    await db.insert(revokedTokens).values({ tokenHash, userId: userId || decoded?.id || null, expiresAt: exp })
      .onConflictDoNothing();
  } catch (err) {
    console.warn('[TokenService] revokeAccessToken 실패:', err);
  }
}

// 액세스 토큰 폐기 여부 확인 (인증 미들웨어에서 호출)
export async function isAccessTokenRevoked(accessToken: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(accessToken);
    const [row] = await db.select({ id: revokedTokens.id }).from(revokedTokens)
      .where(eq(revokedTokens.tokenHash, tokenHash)).limit(1);
    return !!row;
  } catch {
    return false;
  }
}

// 만료된 revoked 토큰 GC (배치/주기 호출용)
export async function cleanupExpiredRevokedTokens(): Promise<number> {
  const result = await db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, new Date())).returning({ id: revokedTokens.id });
  return result.length;
}
