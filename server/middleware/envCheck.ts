/**
 * 환경 변수 검증 미들웨어
 * 
 * 프로덕션 배포 시 필수 환경 변수 존재 여부 확인
 * - 결제 관련 API 호출 전 PortOne 설정 검증
 * - 서버 시작 시 필수 환경 변수 체크
 * 
 * 참고: IntegrationTest.md Phase 11
 */

import { Request, Response, NextFunction } from 'express';

export interface EnvConfig {
  key: string;
  required: boolean;
  description: string;
}

const PAYMENT_ENV_VARS: EnvConfig[] = [
  { key: 'PORTONE_API_SECRET', required: true, description: 'PortOne API 인증 키' },
  { key: 'PORTONE_STORE_ID', required: true, description: 'PortOne 상점 ID' },
  { key: 'PORTONE_CHANNEL_KEY', required: true, description: '결제 채널 키 (KG이니시스)' },
  { key: 'PORTONE_WEBHOOK_SECRET', required: true, description: '웹훅 서명 검증 키' },
];

const DATABASE_ENV_VARS: EnvConfig[] = [
  { key: 'DATABASE_URL', required: true, description: 'PostgreSQL 연결 문자열' },
];

const AI_ENV_VARS: EnvConfig[] = [
  { key: 'OPENAI_API_KEY', required: false, description: 'OpenAI API 키' },
  { key: 'GOOGLE_TRANSLATE_API_KEY', required: false, description: 'Google Translate API 키' },
];

/**
 * 서버 시작 시 필수 환경 변수 검증
 * 프로덕션 환경에서는 필수 환경 변수가 없으면 서버 시작 실패
 */
export function validateStartupEnv(): { valid: boolean; missing: string[] } {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  // 데이터베이스 필수
  for (const env of DATABASE_ENV_VARS) {
    if (env.required && !process.env[env.key]) {
      missing.push(`${env.key} (${env.description})`);
    }
  }

  // 프로덕션에서는 결제 환경 변수도 필수
  if (isProduction) {
    for (const env of PAYMENT_ENV_VARS) {
      if (env.required && !process.env[env.key]) {
        missing.push(`${env.key} (${env.description})`);
      }
    }
  }

  if (missing.length > 0) {
    console.error('❌ 필수 환경 변수 누락:');
    missing.forEach(m => console.error(`   - ${m}`));
    
    if (isProduction) {
      console.error('⚠️ 프로덕션 환경에서 필수 환경 변수가 누락되었습니다.');
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * 결제 API 호출 전 환경 변수 검증 미들웨어
 * 결제 관련 엔드포인트에서 사용
 */
export function requirePaymentEnv(req: Request, res: Response, next: NextFunction) {
  const missing: string[] = [];

  for (const env of PAYMENT_ENV_VARS) {
    if (env.required && !process.env[env.key]) {
      missing.push(env.key);
    }
  }

  if (missing.length > 0) {
    console.error(`[EnvCheck] 결제 환경 변수 누락: ${missing.join(', ')}`);
    
    return res.status(503).json({
      success: false,
      error: 'payment_not_configured',
      message: '결제 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.',
    });
  }

  next();
}

/**
 * AI API 호출 전 환경 변수 검증 미들웨어
 */
export function requireAiEnv(req: Request, res: Response, next: NextFunction) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[EnvCheck] OpenAI API 키 누락');
    
    return res.status(503).json({
      success: false,
      error: 'ai_not_configured',
      message: 'AI 서비스가 설정되지 않았습니다.',
    });
  }

  next();
}

/**
 * 환경 변수 상태 조회 (관리자용)
 */
export function getEnvStatus(): Record<string, { configured: boolean; description: string }> {
  const allEnvVars = [...PAYMENT_ENV_VARS, ...DATABASE_ENV_VARS, ...AI_ENV_VARS];
  const status: Record<string, { configured: boolean; description: string }> = {};

  for (const env of allEnvVars) {
    status[env.key] = {
      configured: !!process.env[env.key],
      description: env.description,
    };
  }

  return status;
}

/**
 * 환경 변수 검증 결과 로그 출력
 */
export function logEnvStatus(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('🔧 환경 변수 상태:');
  console.log(`   환경: ${isProduction ? '프로덕션' : '개발'}`);
  
  // 데이터베이스
  console.log('   📦 데이터베이스:');
  for (const env of DATABASE_ENV_VARS) {
    const configured = !!process.env[env.key];
    console.log(`      ${configured ? '✅' : '❌'} ${env.key}`);
  }
  
  // 결제
  console.log('   💳 결제:');
  for (const env of PAYMENT_ENV_VARS) {
    const configured = !!process.env[env.key];
    console.log(`      ${configured ? '✅' : '❌'} ${env.key}`);
  }
  
  // AI
  console.log('   🤖 AI:');
  for (const env of AI_ENV_VARS) {
    const configured = !!process.env[env.key];
    console.log(`      ${configured ? '✅' : '⚪'} ${env.key} (선택)`);
  }
}
