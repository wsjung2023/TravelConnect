/**
 * ============================================
 * 미들웨어 중앙 내보내기
 * ============================================
 * 
 * 모든 공통 미들웨어를 한 곳에서 내보내기 합니다.
 * 라우터에서 쉽게 가져다 사용할 수 있도록 합니다.
 * 
 * 사용 예시:
 * ```typescript
 * import { 
 *   validateBody, 
 *   apiLimiter, 
 *   requirePaymentEnv,
 *   checkAiUsage 
 * } from '../middleware';
 * 
 * router.post('/endpoint', apiLimiter, validateBody(Schema), handler);
 * ```
 */

// 요청 검증 미들웨어
export {
  validateBody,
  validateQuery,
  validateParams,
  validateSchema, // 레거시 호환
  validateRequest,
  parseIntParam,
  ValidatedRequest,
} from './validation';

// Rate Limiting 미들웨어
export {
  apiLimiter,
  authLimiter,
  strictLimiter,
  uploadLimiter,
  createRateLimiter,
} from './rateLimiter';

// 환경 변수 검증 미들웨어
export {
  validateStartupEnv,
  requirePaymentEnv,
  requireAiEnv,
} from './envCheck';

// AI 사용량 제한 미들웨어
export { checkAiUsage } from './checkAiUsage';
