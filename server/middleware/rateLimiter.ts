/**
 * ============================================
 * Rate Limiting 미들웨어
 * ============================================
 * 
 * API 엔드포인트에 대한 요청 속도 제한을 구현합니다.
 * DDoS 공격 및 과도한 API 사용을 방지합니다.
 * 
 * 사용 예시:
 * ```typescript
 * import { apiLimiter, authLimiter, strictLimiter } from '../middleware/rateLimiter';
 * 
 * router.post('/login', authLimiter, loginHandler);
 * router.get('/posts', apiLimiter, getPostsHandler);
 * router.post('/ai/generate', strictLimiter, aiGenerateHandler);
 * ```
 */

import rateLimit from 'express-rate-limit';

// ============================================
// 기본 API Rate Limiter
// ============================================
// 일반 API 엔드포인트용 - 분당 100회 요청 허용
// 피드, 검색, 프로필 조회 등에 사용
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 최대 100회 요청
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    retryAfter: 60,
  },
  standardHeaders: true, // RateLimit-* 헤더 포함
  legacyHeaders: false, // X-RateLimit-* 헤더 비활성화
  keyGenerator: (req) => {
    // 인증된 사용자는 user.id 기준, 미인증은 IP 기준
    return (req.user as any)?.id || req.ip || 'unknown';
  },
  handler: (req, res) => {
    console.log(`[RateLimit] API 제한 초과: ${(req.user as any)?.id || req.ip}`);
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: 60,
    });
  },
});

// ============================================
// 인증 API Rate Limiter
// ============================================
// 로그인/회원가입 엔드포인트용 - 분당 10회 요청 허용
// 브루트포스 공격 방지
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 최대 10회 요청
  message: {
    success: false,
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: '인증 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (req, res) => {
    console.log(`[RateLimit] 인증 제한 초과: ${req.ip}`);
    res.status(429).json({
      success: false,
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: '인증 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
      retryAfter: 60,
    });
  },
});

// ============================================
// 엄격한 Rate Limiter
// ============================================
// AI 서비스, 결제 등 비용이 높은 작업용 - 분당 5회 요청 허용
// 비용 과다 청구 방지
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5, // 최대 5회 요청
  message: {
    success: false,
    code: 'STRICT_RATE_LIMIT_EXCEEDED',
    message: '이 작업에 대한 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.user as any)?.id || req.ip || 'unknown';
  },
  handler: (req, res) => {
    console.log(`[RateLimit] 엄격 제한 초과: ${(req.user as any)?.id || req.ip}`);
    res.status(429).json({
      success: false,
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      message: '이 작업에 대한 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
      retryAfter: 60,
    });
  },
});

// ============================================
// 파일 업로드 Rate Limiter
// ============================================
// 미디어 업로드용 - 시간당 50회 요청 허용
// 스토리지 과다 사용 방지
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 50, // 최대 50회 요청
  message: {
    success: false,
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    message: '파일 업로드 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.user as any)?.id || req.ip || 'unknown';
  },
  handler: (req, res) => {
    console.log(`[RateLimit] 업로드 제한 초과: ${(req.user as any)?.id || req.ip}`);
    res.status(429).json({
      success: false,
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: '파일 업로드 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.',
      retryAfter: 3600,
    });
  },
});

// ============================================
// 커스텀 Rate Limiter 생성기
// ============================================
// 특정 엔드포인트에 맞는 커스텀 제한기 생성
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: any) => string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: options.message || '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => {
      return (req.user as any)?.id || req.ip || 'unknown';
    }),
  });
}
