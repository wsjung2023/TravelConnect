/**
 * ============================================
 * 공통 요청 검증 미들웨어
 * ============================================
 * 
 * 모든 라우터에서 사용하는 Zod 스키마 기반 요청 검증 미들웨어입니다.
 * 중복 코드를 제거하고 일관된 에러 응답 형식을 제공합니다.
 * 
 * 사용 예시:
 * ```typescript
 * import { validateBody, validateQuery, validateParams } from '../middleware/validation';
 * import { MySchema } from '@shared/api/schema';
 * 
 * router.post('/endpoint', validateBody(MySchema), (req, res) => {
 *   const data = req.validatedData; // 타입이 보장된 검증된 데이터
 * });
 * ```
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// ============================================
// 타입 정의
// ============================================
// Express.Request 타입 확장은 server/types/express.d.ts에서 전역으로 정의됨
// 여기서는 레거시 호환성을 위한 별칭만 제공
export type ValidatedRequest = Request;

// ============================================
// 에러 응답 포맷터
// ============================================
// Zod 에러를 사용자 친화적인 형식으로 변환
function formatValidationError(error: ZodError): { message: string; errors: any[] } {
  const friendlyError = fromZodError(error);
  return {
    message: friendlyError.message,
    errors: error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

// ============================================
// 요청 본문(Body) 검증 미들웨어
// ============================================
// POST, PUT, PATCH 요청의 본문을 검증합니다.
// 검증 성공 시 req.validatedData에 파싱된 데이터를 저장합니다.
export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const formatted = formatValidationError(result.error);
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          ...formatted,
        });
      }
      
      req.validatedData = result.data;
      next();
    } catch (error) {
      console.error('[Validation] 예기치 않은 오류:', error);
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: '요청 데이터를 처리할 수 없습니다.',
      });
    }
  };
}

// ============================================
// 쿼리 파라미터 검증 미들웨어
// ============================================
// GET 요청의 쿼리 파라미터를 검증합니다.
// 검증 성공 시 req.validatedQuery에 파싱된 데이터를 저장합니다.
export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const formatted = formatValidationError(result.error);
        return res.status(400).json({
          success: false,
          code: 'QUERY_VALIDATION_ERROR',
          ...formatted,
        });
      }
      
      req.validatedQuery = result.data;
      next();
    } catch (error) {
      console.error('[Validation] 쿼리 검증 오류:', error);
      return res.status(400).json({
        success: false,
        code: 'QUERY_VALIDATION_ERROR',
        message: '쿼리 파라미터를 처리할 수 없습니다.',
      });
    }
  };
}

// ============================================
// URL 파라미터 검증 미들웨어
// ============================================
// 경로 파라미터(:id 등)를 검증합니다.
// 검증 성공 시 req.validatedParams에 파싱된 데이터를 저장합니다.
export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const formatted = formatValidationError(result.error);
        return res.status(400).json({
          success: false,
          code: 'PARAMS_VALIDATION_ERROR',
          ...formatted,
        });
      }
      
      req.validatedParams = result.data;
      next();
    } catch (error) {
      console.error('[Validation] 파라미터 검증 오류:', error);
      return res.status(400).json({
        success: false,
        code: 'PARAMS_VALIDATION_ERROR',
        message: 'URL 파라미터를 처리할 수 없습니다.',
      });
    }
  };
}

// ============================================
// 레거시 호환 validateSchema 함수
// ============================================
// 기존 코드와의 호환성을 위해 validateBody의 별칭을 제공합니다.
// 새로운 코드에서는 validateBody를 사용하는 것이 권장됩니다.
export const validateSchema = validateBody;

// ============================================
// 복합 검증 미들웨어
// ============================================
// 본문, 쿼리, 파라미터를 한 번에 검증합니다.
// 모든 검증이 통과해야 다음 미들웨어로 진행합니다.
export function validateRequest<TBody = any, TQuery = any, TParams = any>(options: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
}): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];
    
    // 본문 검증
    if (options.body) {
      const result = options.body.safeParse(req.body);
      if (!result.success) {
        errors.push({
          location: 'body',
          ...formatValidationError(result.error),
        });
      } else {
        req.validatedData = result.data;
      }
    }
    
    // 쿼리 검증
    if (options.query) {
      const result = options.query.safeParse(req.query);
      if (!result.success) {
        errors.push({
          location: 'query',
          ...formatValidationError(result.error),
        });
      } else {
        req.validatedQuery = result.data;
      }
    }
    
    // 파라미터 검증
    if (options.params) {
      const result = options.params.safeParse(req.params);
      if (!result.success) {
        errors.push({
          location: 'params',
          ...formatValidationError(result.error),
        });
      } else {
        req.validatedParams = result.data;
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: '요청 검증에 실패했습니다.',
        errors,
      });
    }
    
    next();
  };
}

// ============================================
// ID 파라미터 검증 헬퍼
// ============================================
// 숫자 ID 파라미터를 검증하고 변환합니다.
// 유효하지 않은 ID는 400 에러를 반환합니다.
export function parseIntParam(paramName: string = 'id'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    
    if (!value) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAM',
        message: `${paramName} 파라미터가 필요합니다.`,
      });
    }
    
    const parsed = parseInt(value, 10);
    
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ID',
        message: `유효하지 않은 ${paramName} 값입니다.`,
      });
    }
    
    req.params[paramName] = String(parsed);
    next();
  };
}
