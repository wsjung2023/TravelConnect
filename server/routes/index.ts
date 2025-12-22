/**
 * ============================================
 * 라우터 인덱스 (Router Index)
 * ============================================
 * 
 * 이 모듈은 모든 기능별 라우터를 내보내고 메인 앱에 마운트하는 역할을 합니다.
 * 
 * 라우터 구조:
 * - authRouter: 인증 관련 (/api/auth/*)
 * - socialRouter: 소셜 기능 (/api/posts/*, /api/users/*, /api/feed)
 * - adminRouter: 관리자 기능 (/api/admin/*)
 * - billingRouter: 결제/구독 (/api/billing/*)
 * - chatRouter: 채팅 (/api/conversations/*, /api/channels/*, /api/messages/*)
 * - contractsRouter: 계약/에스크로 (/api/contracts/*, /api/escrow/*)
 * - experienceRouter: 경험 (/api/experiences/*, /api/guide/*, /api/host/*)
 * - timelineRouter: 타임라인/여행 (/api/timelines/*, /api/trips/*)
 * - notificationRouter: 알림 (/api/notifications/*)
 * - profileRouter: 프로필 (/api/profile/*, /api/user/*, /api/portfolio/*)
 * - aiRouter: AI 기능 (/api/mini-concierge/*, /api/cinemap/*)
 * 
 * 사용법:
 * import { mountRouters } from './routes';
 * mountRouters(app);
 */

import { Express, Router, Request, Response } from 'express';
import { storage } from '../storage';

// ============================================
// 기능별 라우터 임포트
// ============================================
export { authRouter } from './auth';
export { socialRouter } from './social';
export { adminRouter } from './admin';
export { billingRouter } from './billing';
export { chatRouter } from './chat';
export { contractsRouter } from './contracts';
export { experienceRouter } from './experience';
export { timelineRouter } from './timeline';
export { notificationRouter } from './notification';
export { profileRouter } from './profile';
export { aiRouter } from './ai';
export { tripsRouter } from './trips';

// ============================================
// 라우터 마운트 함수
// ============================================
// 모든 라우터를 앱에 마운트합니다.
// 각 라우터는 해당 기능의 API 엔드포인트를 처리합니다.
import { authRouter } from './auth';
import { socialRouter } from './social';
import { adminRouter } from './admin';
import { billingRouter } from './billing';
import { chatRouter } from './chat';
import { contractsRouter } from './contracts';
import { experienceRouter } from './experience';
import { timelineRouter } from './timeline';
import { notificationRouter } from './notification';
import { profileRouter } from './profile';
import { aiRouter } from './ai';
import { tripsRouter } from './trips';

/**
 * 모든 기능별 라우터를 Express 앱에 마운트합니다.
 * 
 * 마운트 순서:
 * 1. 인증 라우터 (우선순위 높음)
 * 2. 사용자/프로필 라우터
 * 3. 소셜 기능 라우터
 * 4. 비즈니스 라우터 (경험, 예약, 계약)
 * 5. 채팅 라우터
 * 6. AI 기능 라우터
 * 7. 빌링/관리자 라우터
 * 
 * @param app - Express 애플리케이션 인스턴스
 */
export function mountRouters(app: Express): void {
  console.log('📦 라우터 마운트 시작...');

  // 인증 라우터 - /api/auth 경로에 마운트
  // 회원가입, 로그인, 토큰 관리 등
  app.use('/api/auth', authRouter);
  console.log('  ✓ 인증 라우터 마운트됨: /api/auth');

  // 관리자 라우터 - /api/admin 경로에 마운트
  // 관리자 대시보드, 통계, 설정 등
  app.use('/api/admin', adminRouter);
  console.log('  ✓ 관리자 라우터 마운트됨: /api/admin');

  // 빌링 라우터 - /api/billing 경로에 마운트
  // 구독, Trip Pass, 결제 처리 등
  app.use('/api/billing', billingRouter);
  console.log('  ✓ 빌링 라우터 마운트됨: /api/billing');

  // 계약/에스크로 라우터 - /api/contracts 경로에 마운트
  // P2P 계약, 분할 결제, 환불 등
  app.use('/api/contracts', contractsRouter);
  console.log('  ✓ 계약 라우터 마운트됨: /api/contracts');

  // 알림 라우터 - /api/notifications 경로에 마운트
  // 알림 조회, 읽음 표시 등
  app.use('/api/notifications', notificationRouter);
  console.log('  ✓ 알림 라우터 마운트됨: /api/notifications');

  // 타임라인 라우터 - /api/timelines 경로에 마운트
  // 여행 타임라인 관리
  app.use('/api/timelines', timelineRouter);
  console.log('  ✓ 타임라인 라우터 마운트됨: /api/timelines');

  // 여행 라우터 - /api/trips 경로에 마운트
  // 여행 계획 관리 (별도 trips.ts)
  app.use('/api/trips', tripsRouter);
  console.log('  ✓ 여행 라우터 마운트됨: /api/trips');

  // AI 라우터 - Mini Concierge, CineMap 등
  // 여러 경로에 걸쳐 마운트됨
  app.use('/api', aiRouter);
  console.log('  ✓ AI 라우터 마운트됨: /api/mini-concierge, /api/cinemap');

  // 소셜 라우터 - 포스트, 좋아요, 댓글, 팔로우 등
  // /api 루트에 마운트 (다양한 경로 포함)
  app.use('/api', socialRouter);
  console.log('  ✓ 소셜 라우터 마운트됨: /api/posts, /api/users, /api/feed');

  // 프로필 라우터 - 사용자 프로필, 포트폴리오 등
  app.use('/api', profileRouter);
  console.log('  ✓ 프로필 라우터 마운트됨: /api/profile, /api/portfolio');

  // 채팅 라우터 - 대화, 채널, 메시지 등
  app.use('/api', chatRouter);
  console.log('  ✓ 채팅 라우터 마운트됨: /api/conversations, /api/channels');

  // 경험 라우터 - 경험, 가이드, 호스트 대시보드 등
  app.use('/api', experienceRouter);
  console.log('  ✓ 경험 라우터 마운트됨: /api/experiences, /api/guide, /api/host');

  // 번역 API는 server/routes.ts에 직접 정의됨 (DB 기반 i18n 데이터 조회)
  // /api/translations/:namespace 경로는 registerRoutes에서 처리됨

  console.log('📦 라우터 마운트 완료!');
}

/**
 * 라우터 정보 객체
 * 디버깅 및 문서화 목적으로 사용
 */
export const routerInfo = {
  auth: {
    basePath: '/api/auth',
    description: '인증 관련 API (회원가입, 로그인, 토큰 관리)',
    endpoints: [
      'POST /register',
      'POST /login',
      'GET /me',
      'POST /demo-login',
      'POST /onboarding',
      'POST /generate-token',
    ],
  },
  social: {
    basePath: '/api',
    description: '소셜 기능 API (포스트, 좋아요, 댓글, 팔로우)',
    endpoints: [
      'GET/POST /posts',
      'GET/PATCH/DELETE /posts/:id',
      'POST /posts/:id/like',
      'GET/POST /posts/:id/comments',
      'POST/DELETE /users/:id/follow',
      'GET /feed',
    ],
  },
  admin: {
    basePath: '/api/admin',
    description: '관리자 API (통계, 설정, 분쟁 관리)',
    endpoints: [
      'GET /commerce/stats',
      'GET /experiences',
      'GET /bookings',
      'GET /disputes',
      'POST /analytics/etl/full',
      'GET /analytics/dashboard',
    ],
  },
  billing: {
    basePath: '/api/billing',
    description: '결제 API (구독, Trip Pass, 결제 처리)',
    endpoints: [
      'GET /plans',
      'GET/POST/DELETE /subscription',
      'GET/POST /trip-pass',
      'GET /usage',
      'POST /prepare-payment',
      'POST /confirm-payment',
    ],
  },
  contracts: {
    basePath: '/api/contracts',
    description: '계약/에스크로 API (P2P 계약, 분할 결제)',
    endpoints: [
      'GET/POST /contracts',
      'GET /contracts/:id',
      'POST /contracts/:id/initiate-payment',
      'POST /contracts/:id/confirm-payment',
      'POST /contracts/:id/complete',
      'POST /contracts/:id/cancel',
    ],
  },
  chat: {
    basePath: '/api',
    description: '채팅 API (대화, 채널, 메시지)',
    endpoints: [
      'GET/POST /conversations',
      'GET /conversations/:id',
      'GET/POST /channels',
      'GET/POST /channels/:id/messages',
      'GET /messages/:id/thread',
    ],
  },
  experience: {
    basePath: '/api',
    description: '경험 API (경험 CRUD, 가이드, 호스트)',
    endpoints: [
      'GET/POST /experiences',
      'GET/PATCH/DELETE /experiences/:id',
      'GET /guide/:id',
      'GET /host/experiences',
      'GET /host/bookings',
    ],
  },
  timeline: {
    basePath: '/api/timelines',
    description: '타임라인 API (여행 기록)',
    endpoints: [
      'GET/POST /timelines',
      'GET/PATCH/DELETE /timelines/:id',
      'GET/POST /trips',
      'POST /trips/:id/clone',
    ],
  },
  notification: {
    basePath: '/api/notifications',
    description: '알림 API',
    endpoints: [
      'GET /notifications',
      'POST /notifications',
      'PATCH /notifications/:id/read',
      'PATCH /notifications/read-all',
      'DELETE /notifications/:id',
    ],
  },
  profile: {
    basePath: '/api',
    description: '프로필 API (사용자 설정, 포트폴리오)',
    endpoints: [
      'GET/PATCH /profile/open',
      'PUT /profile/portfolio-mode',
      'PATCH /user/profile',
      'GET /portfolio/:publicProfileUrl',
      'GET /users/open',
    ],
  },
  ai: {
    basePath: '/api',
    description: 'AI 기능 API (Mini Concierge, CineMap)',
    endpoints: [
      'GET /mini-concierge/status',
      'POST /mini-concierge/generate',
      'GET /mini-concierge/plans',
      'POST /cinemap/jobs',
      'GET /cinemap/jobs/:id',
    ],
  },
};
