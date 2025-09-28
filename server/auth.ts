import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { storage } from './storage';

// Express Request 타입 확장
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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 환경변수가 설정되지 않았습니다.');
  console.error('💡 Replit Secrets에서 JWT_SECRET을 설정해주세요.');
  console.error('   예시 값: openssl rand -hex 32');
  throw new Error('JWT_SECRET은 필수 환경변수입니다. 보안상 fallback을 제거했습니다.');
}

export const jwtOptions: jwt.SignOptions = { algorithm: 'HS256' as const, expiresIn: '7d' };

// JWT 토큰 생성
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

// JWT 토큰 검증
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

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// 비밀번호 검증
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 인증 미들웨어
export const authenticateToken: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // 사용자 정보 확인
  const user = await storage.getUser(decoded.id);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  req.user = decoded;
  next();
};

// 하이브리드 인증 미들웨어 (JWT + 세션 모두 지원)
export const authenticateHybrid: RequestHandler = async (req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.path} - Starting authentication`);
  console.log(`[AUTH] Session user:`, req.user ? 'PRESENT' : 'NOT PRESENT');
  console.log(`[AUTH] Authorization header:`, req.headers.authorization ? 'PRESENT' : 'NOT PRESENT');
  
  // 1. JWT Bearer 토큰 확인
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token) {
    console.log(`[AUTH] JWT token found, verifying...`);
    const decoded = verifyToken(token);
    if (decoded) {
      // JWT 토큰이 유효하면 사용자 정보 설정
      const user = await storage.getUser(decoded.id);
      if (user) {
        console.log(`[AUTH] JWT authentication successful for user ${decoded.id}`);
        req.user = decoded;
        return next();
      }
    }
    console.log(`[AUTH] JWT authentication failed`);
  }

  // 2. 세션 기반 인증 확인 (OIDC 또는 기존 세션)
  if (req.user) {
    // 이미 세션에서 인증된 사용자
    console.log(`[AUTH] Session authentication successful for user ${req.user.id}`);
    return next();
  }

  // 3. 개발 환경에서 기본 사용자 생성 (테스트용)
  if (process.env.NODE_ENV === 'development') {
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
