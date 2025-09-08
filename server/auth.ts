import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET required');
  } else {
    console.warn('DEV: using unsafe fallback');
  }
}

export const jwtOptions: jwt.SignOptions = { algorithm: 'HS256' as const, expiresIn: '7d' };

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// JWT 토큰 생성
export function generateToken(user: {
  id: string;
  email: string;
  role: string;
}) {
  const secret = JWT_SECRET || 'dev-fallback-key';
  console.log('토큰 생성:', {
    userId: user.id,
    userRole: user.role,
    secretExists: !!JWT_SECRET,
    jwtOptions
  });
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    jwtOptions
  );
  console.log('생성된 토큰:', token.substring(0, 50) + '...');
  return token;
}

// JWT 토큰 검증
export function verifyToken(token: string) {
  try {
    const secret = JWT_SECRET || 'dev-fallback-key';
    console.log('토큰 검증 시도:', {
      tokenLength: token.length,
      secretExists: !!JWT_SECRET,
      tokenPrefix: token.substring(0, 20)
    });
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    console.log('토큰 검증 성공:', decoded);
    return decoded as {
      id: string;
      email: string;
      role: string;
    };
  } catch (error) {
    console.log('토큰 검증 실패:', error);
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
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  console.log('🔍 authenticateToken 미들웨어 호출됨');
  console.log('요청 정보:', {
    method: req.method,
    url: req.url,
    path: req.path,
    headers: req.headers
  });
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('Authorization 헤더:', authHeader);
  console.log('추출된 토큰:', token ? `있음 (${token.substring(0, 20)}...)` : '없음');

  if (!token) {
    console.log('⚠️ 토큰이 없어서 401 반환');
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
}

// 관리자 권한 확인 미들웨어
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // 먼저 인증 확인
  await authenticateToken(req, res, () => {});

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
}

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
