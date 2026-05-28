// 인증 라우터 — 이메일 회원가입/로그인, Replit/Google OAuth, /me, 온보딩 엔드포인트.
/**
 * ============================================
 * 인증 라우터 (Auth Router)
 * ============================================
 * 
 * 이 모듈은 사용자 인증과 관련된 모든 API 엔드포인트를 관리합니다.
 * 
 * 주요 기능:
 * - 회원가입 (이메일/비밀번호)
 * - 로그인/로그아웃
 * - 현재 사용자 정보 조회
 * - 온보딩 처리
 * - 데모 로그인 (개발용)
 * - 테스트 토큰 생성 (개발용)
 * 
 * 인증 방식:
 * - JWT 토큰 기반 인증
 * - Google OAuth 2.0 (별도 googleAuth.ts에서 처리)
 * - 하이브리드 인증 (세션 + JWT 동시 지원)
 * 
 * 보안:
 * - Rate Limiting 적용 (분당 20회 제한)
 * - 비밀번호 bcrypt 해싱
 * - 입력값 Zod 스키마 검증
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isValidPassword,
  generateUserId,
  AuthRequest,
} from '../auth';
import { LoginSchema, RegisterSchema, OnboardingSchema } from '@shared/api/schema';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// Rate Limiter 설정
// ============================================
// 인증 관련 API는 보안을 위해 분당 20회로 제한
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 20, // 분당 최대 20회
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// ============================================
// 스키마 검증 미들웨어
// ============================================
// Zod 스키마를 사용하여 요청 본문을 검증하는 미들웨어
function validateSchema(schema: any) {
  return (req: any, res: Response, next: Function) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.errors,
        });
      }
      req.validatedData = result.data;
      next();
    } catch (error) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  };
}

// ============================================
// 회원가입 API
// ============================================
// POST /api/auth/register
// 이메일과 비밀번호로 새 계정을 생성합니다.
// 비밀번호는 bcrypt로 해싱되어 저장됩니다.
router.post('/register', authLimiter, validateSchema(RegisterSchema), async (req: any, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.validatedData;

    // 필수 입력값 검증
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호는 필수입니다' });
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다' });
    }

    // 비밀번호 강도 검증 (최소 8자, 영문+숫자+특수문자 포함)
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    // 중복 이메일 확인
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 이메일입니다' });
    }

    // 비밀번호 해싱 (bcrypt, salt rounds: 10)
    const hashedPassword = await hashPassword(password);

    // 사용자 생성
    const user = await storage.createUser({
      id: generateUserId(),
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      authProvider: 'email',
      // 이메일 인증 시스템 활성화: 가입 시 false → /api/auth/email/verify/send로 토큰 발급 → /api/auth/email/verify로 확인
      // 실 발송은 SMTP/SendGrid 연동 필요 (현재 콘솔 출력 + 개발 모드 응답에 verifyUrl 노출)
      isEmailVerified: false,
    });

    // 이메일 인증 토큰 자동 발급 (회원가입 직후)
    try {
      const crypto = await import('crypto');
      const { db } = await import('../db');
      const { emailVerificationTokens } = await import('@shared/schema');
      const rawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
      await db.insert(emailVerificationTokens).values({ userId: user.id, tokenHash, email: user.email || '', expiresAt });
      const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/email/verify?token=${rawToken}`;
      console.log(`[Signup→EmailVerify] ${user.email} → ${verifyUrl}`);
    } catch (verifErr) {
      console.warn('[Signup] 이메일 인증 토큰 발급 실패 (가입은 진행):', verifErr);
    }

    // JWT 토큰 생성 (7일 유효)
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    });

    res.status(201).json({
      message: '회원가입이 완료되었습니다',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ message: '회원가입 중 오류가 발생했습니다' });
  }
});

// ============================================
// FIXME-TODO [JWT리프레시없음]: 현재 Access Token만 발급 (7일 만료), Refresh Token 없음.
// 7일 후 사용자가 자동 로그아웃됨. 탈취된 토큰을 7일간 폐기 불가.
// 구현 경로: 로그인 시 shortLived accessToken(15분) + longLived refreshToken(30일, DB 저장) 발급.
// POST /api/auth/refresh 엔드포인트로 accessToken 갱신.
// 로그인 API
// ============================================
// POST /api/auth/login
// 이메일과 비밀번호로 로그인합니다.
// 성공 시 JWT 토큰을 반환합니다.
router.post('/login', authLimiter, validateSchema(LoginSchema), async (req: any, res: Response) => {
  try {
    const { email, password } = req.validatedData;

    // 입력값 검증
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요' });
    }

    // 사용자 조회
    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      // 보안상 어떤 필드가 틀렸는지 구체적으로 알려주지 않음
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // 비밀번호 검증 (bcrypt compare)
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // JWT 토큰 생성
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    });

    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다' });
  }
});

// ============================================
// 현재 사용자 정보 조회 API
// ============================================
// GET /api/auth/me
// 현재 로그인한 사용자의 상세 정보를 반환합니다.
// 하이브리드 인증 지원 (JWT 토큰 또는 세션)
router.get('/me', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // 사용자 정보 조회
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 민감한 정보(비밀번호 등)는 제외하고 반환
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      location: user.location,
      role: user.role,
      isHost: user.isHost || false,
      profileImageUrl: user.profileImageUrl,
      userType: user.userType || 'traveler',
      onboardingCompleted: user.onboardingCompleted || false,
      interests: user.interests || [],
      languages: user.languages || [],
      timezone: user.timezone || 'Asia/Seoul',
      portfolioMode: user.portfolioMode || false,
      publicProfileUrl: user.publicProfileUrl,
      serendipityEnabled: user.serendipityEnabled ?? false,
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다' });
  }
});

// ============================================
// 데모 로그인 API (개발용)
// ============================================
// POST /api/auth/demo-login
// TEST 계정으로 비밀번호 없이 로그인합니다.
// 개발 및 테스트 목적으로만 사용됩니다.
router.post('/demo-login', authLimiter, async (req: Request, res: Response) => {
  try {
    // TEST 사용자 조회
    const user = await storage.getUser('TEST');
    if (!user) {
      return res.status(404).json({ message: '데모 계정을 찾을 수 없습니다' });
    }

    // JWT 토큰 생성
    const token = generateToken({
      id: user.id,
      email: user.email || 'test@demo.com',
      role: user.role || 'user',
    });

    res.json({
      message: '데모 로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('데모 로그인 오류:', error);
    res.status(500).json({ message: '데모 로그인 중 오류가 발생했습니다' });
  }
});

// ============================================
// 온보딩 완료 API
// ============================================
// POST /api/auth/onboarding
// 사용자 온보딩 정보를 저장합니다.
// userType, 관심사, 언어 등을 설정합니다.
router.post('/onboarding', authenticateHybrid, validateSchema(OnboardingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { userType, interests, languages, timezone } = req.validatedData as {
      userType?: 'traveler' | 'influencer' | 'host';
      interests: string[];
      languages: string[];
      timezone: string;
    };

    // 사용자 정보 업데이트 (location/bio는 덮어쓰지 않음)
    const updatedUser = await storage.updateUser(userId, {
      userType: userType || 'traveler',
      interests: interests || [],
      languages: languages || [],
      timezone: timezone || 'Asia/Seoul',
      onboardingCompleted: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    res.json({
      message: '온보딩이 완료되었습니다',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        userType: updatedUser.userType,
        onboardingCompleted: updatedUser.onboardingCompleted,
        timezone: updatedUser.timezone,
      },
    });
  } catch (error) {
    console.error('온보딩 오류:', error);
    res.status(500).json({ message: '온보딩 처리 중 오류가 발생했습니다' });
  }
});

// ============================================
// 사용자 정보 조회 API (레거시)
// ============================================
// GET /api/auth/user
// authenticateToken 미들웨어로 인증된 사용자 정보를 반환합니다.
router.get('/user', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await storage.getUser(req.user.id);
    // 비밀번호 해시 등 민감 필드는 응답에서 제거
    const { sanitizeUser } = await import('../utils/sanitizeUser');
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// ============================================
// JWT 토큰 생성 API
// ============================================
// POST /api/auth/generate-token
// 현재 로그인한 사용자의 새 JWT 토큰을 발급합니다.
// 토큰 갱신에 사용됩니다.
// SECURITY-TODO [H-5]: 현재 토큰을 JSON body로 반환 → client가 localStorage에 저장.
// 개선 방향: 이 엔드포인트에서 Set-Cookie(httpOnly, SameSite=Lax)로 발급하고
// client에서는 Authorization 헤더 대신 쿠키를 사용하도록 전환.
router.post('/generate-token', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 새 JWT 토큰 생성
    const token = generateToken({
      id: user.id,
      email: user.email || '',
      role: user.role || 'user',
    });

    res.json({ token });
  } catch (error) {
    console.error('토큰 생성 오류:', error);
    res.status(500).json({ message: '토큰 생성 중 오류가 발생했습니다' });
  }
});

// ============================================
// 개발 전용: 특정 사용자 JWT 토큰 발급
// ============================================
// POST /api/auth/dev-token
// 개발 환경에서만 동작. userId를 받아 해당 사용자의 JWT 발급.
router.post('/dev-token', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Dev only endpoint' });
  }
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    return res.status(400).json({ message: 'userId required' });
  }
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: `User not found: ${userId}` });
    }
    const token = generateToken({
      id: user.id,
      email: user.email || '',
      role: user.role || 'user',
    });
    res.json({ token, userId: user.id, email: user.email });
  } catch (error) {
    console.error('dev-token 오류:', error);
    res.status(500).json({ message: '토큰 생성 중 오류' });
  }
});

export const authRouter = router;
