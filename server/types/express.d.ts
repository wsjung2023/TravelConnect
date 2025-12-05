/**
 * ============================================
 * Express 타입 확장
 * ============================================
 * 
 * 이 파일은 Express.Request 객체에 추가 속성을 정의합니다.
 * 검증 미들웨어에서 사용하는 validatedData, validatedQuery, validatedParams
 * 속성의 타입을 전역으로 선언합니다.
 * 
 * 이 파일은 TypeScript 컴파일러가 자동으로 인식하며,
 * 별도의 import 없이 모든 라우터에서 타입이 적용됩니다.
 */

import 'express';

declare global {
  namespace Express {
    interface Request {
      // 검증된 요청 본문 데이터
      // validateBody() 미들웨어에서 설정됨
      validatedData?: unknown;
      
      // 검증된 쿼리 파라미터
      // validateQuery() 미들웨어에서 설정됨
      validatedQuery?: unknown;
      
      // 검증된 URL 파라미터
      // validateParams() 미들웨어에서 설정됨
      validatedParams?: unknown;
      
      // AI 사용량 정보
      // checkAiUsage() 미들웨어에서 설정됨
      usageInfo?: {
        source: 'trip_pass' | 'free_tier';
        tripPassId?: number;
        remaining: number;
      };
    }
  }
}

export {};
