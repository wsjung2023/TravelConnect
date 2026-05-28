// @ts-nocheck
// 인증 미들웨어 — JWT·세션 기반 인증(authenticateToken, authenticateHybrid), AuthRequest 타입, requireAdmin을 정의한다.
/**
 * ============================================
 * 인증 모듈 (Authentication Module)
 * ============================================
 * 
 * 이 모듈은 사용자 인증 및 권한 관리를 담당합니다.
 * 
 * 지원하는 인증 방식:
 * 1. JWT (JSON Web Token) - API 클라이언트용
 * 2. 세션 기반 - 웹 브라우저용
 * 3. OAuth 2.0 (Google, Replit Auth) - 소셜 로그인
 * 
 * 보안 특징:
 * - JWT 토큰은 HS256 알고리즘으로 서명
 * - 비밀번호는 bcrypt로 12라운드 해싱
 * - 토큰 만료: 7일
 * - 세션 타임아웃: 24시간
 * 
 * 사용자 역할 (Roles):
 * - user: 일반 사용자 (기본)
 * - host: 가이드/호스트
 * - admin: 관리자
 * 
 * 미들웨어:
 * - authenticateToken: JWT 전용 인증
 * - authenticateHybrid: JWT + 세션 통합 인증
 * - requireAdmin: 관리자 권한 필요
 * 
 * 환경 변수 (필수):
 * - JWT_SECRET: JWT 서명 키 (필수, openssl rand -hex 32)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { storage } from './storage';

// ============================================
// Express Request 타입 확장
// ============================================
// 인증된 사용자 정보를 req.user에 저장하기 위한 타입 확장
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
    }
    interface Request {
      user?: User;
      validatedData?: unknown;
    }
  }
  
  // 글로벌 변수 타입 선언
  var loggedOutSessions: Set<string> | undefined;
  var lastLogoutTime: number;
}

export type AuthRequest = Request; // 호환성을 위한 타입 별칭

// ============================================
// JWT 설정
// ============================================
// JWT_SECRET은 토큰 서명에 사용되는 비밀 키
// 보안상 반드시 환경 변수로 설정해야 함
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 환경변수가 설정되지 않았습니다.');
  console.error('💡 Replit Secrets에서 JWT_SECRET을 설정해주세요.');
  console.error('   예시 값: openssl rand -hex 32');
  throw new Error('JWT_SECRET은 필수 환경변수입니다. 보안상 fallback을 제거했습니다.');
}

// JWT 옵션: HS256 알고리즘, 7일 만료
export const jwtOptions: jwt.SignOptions = { algorithm: 'HS256' as const, expiresIn: '7d' };

// ============================================
// JWT 토큰 생성
// ============================================
// 사용자 정보(id, email, role)를 페이로드에 포함한 JWT 생성
// 클라이언트는 이 토큰을 Authorization 헤더에 Bearer 형식으로 전송
export function generateToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    jwtOptions
  );
}

// ============================================
// JWT 토큰 검증
// ============================================
// 토큰의 서명과 만료 시간을 검증
// 유효한 토큰이면 디코딩된 페이로드 반환, 아니면 null
export function verifyToken(token: string) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return decoded as {
      id: string;
      email: string;
      role: string;
    };
  } catch (error) {
    return null;
  }
}

// ============================================
// 비밀번호 해싱
// ============================================
// bcrypt 알고리즘으로 비밀번호 해싱
// 솔트 라운드 12: 보안과 성능의 균형점
// 약 250ms 소요 (GPU 공격 방어에 효과적)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// ============================================
// 비밀번호 검증
// ============================================
// 평문 비밀번호와 해시된 비밀번호 비교
// 타이밍 공격 방지를 위해 상수 시간 비교 사용
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================
// 인증 미들웨어: JWT 전용
// ============================================
// Authorization 헤더에서 Bearer 토큰 추출 및 검증
// 사용 예: app.get('/api/protected', authenticateToken, handler)
// 성공 시 req.user에 사용자 정보 설정
export const authenticateToken: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let bearer = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  // H-5: 레거시 클라이언트가 'Bearer null'/'Bearer undefined'/'Bearer ' 를 송신하는 경우를 "헤더 없음"으로 간주
  if (bearer === 'null' || bearer === 'undefined' || bearer === '') bearer = undefined as any;

  const { readCookie, COOKIE_ACCESS, isStateChangingMethod, validateCsrf } = await import('./utils/cookies');
  const cookieToken = readCookie(req, COOKIE_ACCESS);
  const { isAccessTokenRevoked } = await import('./services/tokenService');

  // H-5: 후보 토큰을 순서대로 시도 — (1) Bearer (있고 유효하면 우선) (2) 쿠키 폴백.
  // stale Bearer가 유효한 쿠키를 가리지 않도록 둘 다 시도한다(점진 마이그레이션 안정성).
  const candidates: Array<{ token: string; viaCookie: boolean }> = [];
  if (bearer) candidates.push({ token: bearer, viaCookie: false });
  if (cookieToken && cookieToken !== bearer) candidates.push({ token: cookieToken, viaCookie: true });

  if (candidates.length === 0) {
    return res.status(401).json({ message: 'Access token required' });
  }

  let lastError: 'invalid' | 'revoked' | null = null;
  for (const cand of candidates) {
    const decoded = verifyToken(cand.token);
    if (!decoded) { lastError = 'invalid'; continue; }
    try {
      if (await isAccessTokenRevoked(cand.token)) { lastError = 'revoked'; continue; }
    } catch (revErr) {
      console.error('[AUTH] revoked check failed (fail-closed):', revErr);
      return res.status(503).json({ message: 'Auth check unavailable' });
    }
    const user = await storage.getUser(decoded.id);
    if (!user) { lastError = 'invalid'; continue; }
    // 쿠키 기반 인증으로 통과시키려는 시점에 CSRF 검증 — 실패는 하드 403 (다른 후보로 우회 금지)
    if (cand.viaCookie && isStateChangingMethod(req.method) && !validateCsrf(req)) {
      return res.status(403).json({ message: 'CSRF token missing or invalid' });
    }
    req.user = decoded;
    return next();
  }

  return res.status(401).json({
    message: lastError === 'revoked' ? 'Token revoked' : 'Invalid or expired token',
  });
};

// ============================================
// 인증 미들웨어: 하이브리드 (JWT + 세션)
// ============================================
// JWT 토큰과 세션 기반 인증을 모두 지원
// 우선순위: JWT > 세션 > 인증 실패
// 웹 브라우저(세션)와 API 클라이언트(JWT)를 동시 지원
export const authenticateHybrid: RequestHandler = async (req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.path} - Starting authentication`);
  console.log(`[AUTH] Session user:`, req.user ? 'PRESENT' : 'NOT PRESENT');
  console.log(`[AUTH] Authorization header:`, req.headers.authorization ? 'PRESENT' : 'NOT PRESENT');
  
  // 1. JWT Bearer + 쿠키 토큰 후보 수집 (둘 중 하나라도 유효하면 통과 — stale Bearer가 쿠키 인증을 가리지 않게)
  const authHeader = req.headers.authorization;
  let bearer = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (bearer === 'null' || bearer === 'undefined' || bearer === '') bearer = undefined as any;

  const { readCookie, COOKIE_ACCESS, isStateChangingMethod, validateCsrf } = await import('./utils/cookies');
  const cookieToken = readCookie(req, COOKIE_ACCESS);

  const candidates: Array<{ token: string; viaCookie: boolean }> = [];
  if (bearer) candidates.push({ token: bearer, viaCookie: false });
  if (cookieToken && cookieToken !== bearer) candidates.push({ token: cookieToken, viaCookie: true });

  if (candidates.length > 0) {
    for (const cand of candidates) {
      const decoded = verifyToken(cand.token);
      if (!decoded) continue;
      try {
        const { isAccessTokenRevoked } = await import('./services/tokenService');
        if (await isAccessTokenRevoked(cand.token)) continue;
      } catch (revErr) {
        console.error('[AUTH] revoked check failed (Hybrid, fail-closed):', revErr);
        return res.status(503).json({ message: 'Auth check unavailable' });
      }
      const user = await storage.getUser(decoded.id);
      if (!user) continue;
      // 쿠키 인증 + 상태 변경 메서드 → CSRF 검증 (실패 시 하드 403, 다른 후보로 우회 금지)
      if (cand.viaCookie && isStateChangingMethod(req.method) && !validateCsrf(req)) {
        console.log(`[AUTH] CSRF check failed for cookie-auth ${req.method} ${req.path}`);
        return res.status(403).json({ message: 'CSRF token missing or invalid' });
      }
      console.log(`[AUTH] JWT authentication successful for user ${decoded.id} via ${cand.viaCookie ? 'cookie' : 'bearer'}`);
      req.user = decoded;
      return next();
    }
    console.log(`[AUTH] All token candidates failed`);
  }

  // 2. 세션 기반 인증 확인 (OIDC 또는 기존 세션)
  if (req.user) {
    // 이미 세션에서 인증된 사용자
    console.log(`[AUTH] Session authentication successful for user ${req.user.id}`);
    return next();
  }

  // 3. 개발 환경에서 기본 사용자 생성 (테스트용)
  // SKIP_DEV_AUTO_LOGIN=true 로 설정하면 자동 로그인 비활성화 (E2E 테스트용)
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_DEV_AUTO_LOGIN !== 'true') {
    console.log(`[AUTH] Development mode - checking session:`, req.session ? 'EXISTS' : 'NOT EXISTS');
    console.log(`[AUTH] Session ID:`, req.sessionID || 'undefined');
    
    // 로그아웃된 세션 ID 확인
    const loggedOutSessions = global.loggedOutSessions;
    const lastLogoutTime = global.lastLogoutTime || 0;
    
    console.log(`[AUTH] loggedOutSessions:`, loggedOutSessions ? `Set with ${loggedOutSessions.size} items` : 'NOT AVAILABLE');
    console.log(`[AUTH] lastLogoutTime:`, lastLogoutTime, 'current:', Date.now());
    
    // 로그아웃 상태 확인 - 세션 ID가 있으면 개별 세션 확인, 없으면 전역 시간 확인
    let shouldSkipAutoLogin = false;
    
    if (req.sessionID && loggedOutSessions) {
      const isLoggedOut = loggedOutSessions.has(req.sessionID);
      console.log(`[AUTH] Session ${req.sessionID} logged out check:`, isLoggedOut);
      if (isLoggedOut) {
        shouldSkipAutoLogin = true;
        console.log(`[AUTH] Specific session logged out`);
      }
    }
    
    // 최근 30초 이내에 로그아웃이 발생했다면 로그아웃 상태로 간주 (세션이 없어도)
    const recentLogout = lastLogoutTime > 0 && (Date.now() - lastLogoutTime) < 30000; // 30초
    console.log(`[AUTH] Recent logout check (within 30s):`, recentLogout);
    
    if (recentLogout) {
      shouldSkipAutoLogin = true;
      console.log(`[AUTH] Recent logout detected`);
    }
    
    if (shouldSkipAutoLogin) {
      console.log(`[AUTH] User explicitly logged out - skipping auto login`);
      return res.status(401).json({ message: 'User logged out' });
    }
    
    console.log(`[AUTH] Development mode - creating default user`);
    
    // 기본 테스트 사용자 ID 생성 (고정 ID 대신 동적 생성)
    const defaultUserId = generateUserId();
    
    // 이메일로 기존 사용자 확인
    const existingUser = await storage.getUserByEmail('test@example.com');
    let userId = defaultUserId;
    
    if (existingUser) {
      // 기존 사용자가 있으면 그 사용자 사용
      userId = existingUser.id;
      console.log(`[AUTH] Using existing user: ${existingUser.id} (${existingUser.email})`);
    } else {
      // 새 사용자 생성
      try {
        await storage.upsertUser({
          id: userId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          isHost: true, // 테스트를 위해 호스트로 설정
        });
        console.log(`[AUTH] Created default test user: ${userId}`);
      } catch (error) {
        console.log(`[AUTH] Failed to create user, using existing one if available`);
        const fallbackUser = await storage.getUserByEmail('test@example.com');
        if (fallbackUser) {
          userId = fallbackUser.id;
        }
      }
    }
    
    // 기존 사용자 정보 사용, 없으면 기본값
    const userInfo = existingUser || {
      id: userId,
      email: 'test@example.com',
      role: 'user'
    };
    
    const defaultUser = {
      id: userInfo.id,
      email: userInfo.email,
      role: userInfo.role
    };
    
    req.user = defaultUser;
    console.log(`[AUTH] Setting req.user:`, {id: defaultUser.id, email: defaultUser.email, role: defaultUser.role});
    return next();
  }

  // 4. 프로덕션에서는 401 반환
  console.log(`[AUTH] Authentication failed - no valid JWT or session`);
  return res.status(401).json({ message: 'Authentication required' });
};

// 관리자 권한 확인 미들웨어 (authenticateToken 이후에 사용)
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

// 이메일 유효성 검증
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 비밀번호 강도 검증
export function isValidPassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 6) {
    return { valid: false, message: '비밀번호는 최소 6자 이상이어야 합니다' };
  }
  if (password.length > 100) {
    return { valid: false, message: '비밀번호는 100자를 초과할 수 없습니다' };
  }
  return { valid: true };
}

// UUID 생성 (사용자 ID용)
export function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
