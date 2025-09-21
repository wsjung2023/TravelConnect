import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 환경변수가 설정되지 않았습니다.');
  console.error('💡 Replit Secrets에서 JWT_SECRET을 설정해주세요.');
  console.error('   예시 값: openssl rand -hex 32');
  throw new Error('JWT_SECRET은 필수 환경변수입니다. 보안상 fallback을 제거했습니다.');
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
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
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
