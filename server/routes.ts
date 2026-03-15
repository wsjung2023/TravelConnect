// @ts-nocheck
// 메인 라우트 진입점 — 모든 API 엔드포인트를 등록하는 Express 라우터. 대형 레거시 파일로, 각 기능별 legacy 라우터를 호출한다. 새 엔드포인트는 반드시 server/routes/ 하위 모듈에 추가할 것.
// [2026-03-08] 파일 업로드를 로컬 디스크(uploads/)에서 Object Storage(GCS)로 마이그레이션.
//   - multer.diskStorage → multer.memoryStorage (파일을 메모리에서 바로 Object Storage로 PUT)
//   - /api/files/:filename → Object Storage 서명 URL로 redirect
//   - fs 모듈 의존성 제거 (uploads/ 디렉터리 불필요)
import express, { type Express, type Request, type Response, type NextFunction } from 'express';

// Add Express session type declarations
declare module 'express-serve-static-core' {
  interface Request {
    session?: any;
    sessionID?: string;
  }
}
import { createServer, type Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import multer from 'multer';
import path from 'path';
import * as objectStorageService from './services/objectStorageService';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import exifr from 'exifr';
import i18next from 'i18next';
import * as i18nMiddleware from 'i18next-http-middleware';
import i18nFsBackend from 'i18next-fs-backend';
import { storage } from './storage';
import { tripsRouter } from './routes/trips';
import { translateText, detectLanguage, isTranslationEnabled } from './translate';
import { generateConciergeResponse, isConciergeEnabled, type ConciergeContext } from './ai/concierge';
import { generateMiniPlans, isMiniConciergeEnabled, type MiniPlanContext } from './ai/miniConcierge';
import { generateStoryboard, type PhotoWithExif } from './ai/cinemap';
//import { authenticateToken } from "./auth";
import passport from 'passport';
import {
  authenticateToken,
  authenticateHybrid,
  requireAdmin,
  generateToken,
  verifyToken,
  AuthRequest,
} from './auth';
import { authRouter } from './routes/auth';
import { registerLegacyModules } from './routes/legacyRegistrations';
import { checkAiUsage, getUserAiUsageStats } from './middleware/checkAiUsage';
import { requirePaymentEnv, requireAiEnv, getEnvStatus } from './middleware/envCheck';
import {
  insertExperienceSchema,
  insertPostSchema,
  insertCommentSchema,
  insertBookingSchema,
  insertTripSchema,
  insertTimelineSchema,
  insertPurchaseRequestSchema,
  insertPurchaseQuoteSchema,
  insertPurchaseOrderSchema,
  insertReviewSchema,
  insertHelpRequestSchema,
  insertRequestResponseSchema,
  insertServiceTemplateSchema,
  insertServicePackageSchema,
  insertSlotSchema,
  insertMiniPlanSchema,
  insertMiniPlanSpotSchema,
  insertMiniPlanCheckinSchema,
} from '@shared/schema';
import {
  CreatePostSchema,
  CreateTimelineSchema,
  CreateEventSchema,
  SendMessageSchema,
  FollowUserSchema,
  CreateConversationSchema,
  UpdateProfileOpenSchema,
  PortfolioModeSchema,
} from '@shared/api/schema';


const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 20, // 분당 최대 20회
  message: {
    error: 'Too many upload attempts',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100, // 분당 최대 100회 (일반 API)
  message: {
    error: 'Too many API requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 스키마 검증 미들웨어 헬퍼
function validateSchema(schema: any) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: result.error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      req.validatedData = result.data;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        code: 'PARSE_ERROR'
      });
    }
  };
}

// 허용된 MIME 타입 화이트리스트
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime'
];

// Multer 설정 - memoryStorage: 파일을 메모리(buffer)에서 바로 Object Storage로 업로드
// [2026-03-08] diskStorage → memoryStorage 교체 (Object Storage 마이그레이션)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 화이트리스트 기반 MIME 타입 검증
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`허용되지 않는 파일 형식입니다. 지원 형식: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // I18n 초기화
  await i18next
    .use(i18nFsBackend)
    .use(i18nMiddleware.LanguageDetector)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      preload: ['en', 'ko', 'ja', 'zh', 'fr', 'es'],
      backend: {
        loadPath: path.join(process.cwd(), 'client/public/locales/{{lng}}/{{ns}}.json'),
      },
      detection: {
        order: ['header', 'querystring'],
        caches: [],
      },
    });

  // I18n 미들웨어 적용
  app.use(i18nMiddleware.handle(i18next));

  // 보안 헤더 추가 - CSP, XSS 보호 등
  app.use((req, res, next) => {
    // X-Frame-Options: 클릭재킹 공격 방지
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options: MIME 스니핑 방지
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection: XSS 공격 방지
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy: 개인정보 보호
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy: 다양한 공격 방지 (PortOne 결제 SDK 포함)
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.googlesyndication.com *.google.com *.doubleclick.net cdn.portone.io *.portone.io",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com",
      "font-src 'self' fonts.gstatic.com cdnjs.cloudflare.com data:",
      "img-src 'self' data: blob: https: *.unsplash.com *.googleusercontent.com *.googlesyndication.com *.doubleclick.net",
      "connect-src 'self' wss: ws: *.googleapis.com *.replit.app *.replit.dev *.googlesyndication.com *.google.com *.portone.io api.portone.io *.iamport.co checkout-service.prod.iamport.co",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "frame-src 'self' *.googlesyndication.com *.doubleclick.net *.portone.io checkout.portone.io *.iamport.co"
    ].join('; '));
    
    next();
  });

  // Test error endpoint for Sentry testing (development only)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/test-error', (req, res) => {
      throw new Error('Test server error for Sentry integration!');
    });
  }

  // ========================================
  // 위치 기반 언어 감지 API
  // IP 주소를 기반으로 국가를 판별하고 해당 언어 코드 반환
  // ========================================
  app.get('/api/geo/detect-language', async (req: Request, res: Response) => {
    try {
      // 클라이언트 IP 추출 (프록시 환경 고려)
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = forwarded 
        ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0])
        : req.socket.remoteAddress || '';
      
      // 국가 코드 → 언어 코드 매핑
      const countryToLanguage: Record<string, string> = {
        'JP': 'ja',  // 일본
        'KR': 'ko',  // 한국
        'CN': 'zh',  // 중국
        'TW': 'zh',  // 대만
        'HK': 'zh',  // 홍콩
        'FR': 'fr',  // 프랑스
        'BE': 'fr',  // 벨기에 (프랑스어권)
        'CH': 'fr',  // 스위스 (프랑스어 우선)
        'ES': 'es',  // 스페인
        'MX': 'es',  // 멕시코
        'AR': 'es',  // 아르헨티나
        'CO': 'es',  // 콜롬비아
      };
      
      let countryCode = '';
      let detectedLanguage = 'en'; // 기본값: 영어
      
      // IP가 로컬호스트가 아닌 경우에만 외부 API 호출
      const isLocalIp = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.');
      
      if (!isLocalIp && clientIp) {
        try {
          // ip-api.com 무료 API 사용 (HTTP only, 분당 45회 제한)
          const response = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode`);
          if (response.ok) {
            const data = await response.json() as { countryCode?: string };
            countryCode = data.countryCode || '';
            detectedLanguage = countryToLanguage[countryCode] || 'en';
          }
        } catch (geoError) {
          console.warn('[GEO] IP 지오로케이션 실패, 기본 언어(en) 사용:', geoError);
        }
      }
      
      res.json({
        language: detectedLanguage,
        countryCode: countryCode || 'UNKNOWN',
        ip: isLocalIp ? 'local' : clientIp.substring(0, 10) + '...',
      });
    } catch (error) {
      console.error('[GEO] 언어 감지 오류:', error);
      res.json({ language: 'en', countryCode: 'UNKNOWN', ip: 'error' });
    }
  });

  // ========================================
  // 번역 API - DB 기반 i18n 데이터 조회
  // ========================================
  
  // 플랫 키를 중첩 객체로 변환하는 헬퍼 함수
  function unflattenTranslations(flat: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(flat)) {
      const parts = key.split('.');
      let current = result;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[parts[parts.length - 1]] = value;
    }
    
    return result;
  }
  
  app.get('/api/translations/:namespace', async (req: Request, res: Response) => {
    try {
      const namespace = req.params.namespace as string;
      const locale = (req.query.locale as string) || 'en';
      
      console.log(`[Translations API] Fetching namespace: ${namespace}, locale: ${locale}`);
      const flatTranslations = await storage.getTranslationsByNamespace(namespace, locale);
      const translations = unflattenTranslations(flatTranslations);
      console.log(`[Translations API] Found ${Object.keys(flatTranslations).length} translations`);
      
      res.json(translations);
    } catch (error) {
      console.error('Translation API error:', error);
      res.status(500).json({ error: 'Failed to fetch translations' });
    }
  });

  // 번역 데이터 내보내기 API - 운영 DB 동기화용
  app.get('/api/translations-export', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const format = (req.query.format as string) || 'sql';
      
      // 모든 번역 데이터 가져오기
      const allTranslations = await storage.getAllTranslationsForExport();
      
      if (format === 'json') {
        res.json({
          count: allTranslations.length,
          translations: allTranslations
        });
      } else {
        // SQL INSERT 문 생성 (ON CONFLICT DO NOTHING)
        const sqlStatements = allTranslations.map(t => {
          const value = t.value.replace(/'/g, "''"); // SQL 이스케이프
          return `INSERT INTO translations (namespace, key, locale, value, is_reviewed, version) VALUES ('${t.namespace}', '${t.key}', '${t.locale}', '${value}', ${t.is_reviewed || false}, ${t.version || 1}) ON CONFLICT (namespace, key, locale) DO NOTHING;`;
        });
        
        const sql = `-- Tourgether Translation Export
-- Total: ${allTranslations.length} translations
-- Generated: ${new Date().toISOString()}
-- Usage: Run this SQL in production database to sync missing translations

BEGIN;

${sqlStatements.join('\n')}

COMMIT;
`;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=translations_export.sql');
        res.send(sql);
      }
    } catch (error) {
      console.error('Translation export error:', error);
      res.status(500).json({ error: 'Failed to export translations' });
    }
  });

  // 정적 파일 서빙 제거 - 보안상 이유로 직접 접근 차단
  // app.use('/uploads', express.static('uploads')); // 제거됨
  
  // 파일 접근 엔드포인트 — Object Storage 서명 URL로 redirect
  // [2026-03-08] 로컬 디스크 sendFile → Object Storage 서명 URL redirect 교체
  app.get('/api/files/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      
      // 파일명 보안 검증
      if (!filename || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(filename)) {
        return res.status(400).json({ message: '잘못된 파일명입니다.' });
      }

      // Object Storage에서 서명 URL 생성 후 redirect
      const signedUrl = await objectStorageService.getSignedReadUrl(filename);
      return res.redirect(302, signedUrl);
    } catch (error) {
      console.error('파일 접근 오류:', error);
      res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }
  });

  // DB Admin interface - ADMIN ONLY (with query token support)
  app.get('/db-admin', async (req: Request, res: Response) => {
    try {
      // 먼저 쿼리에서 토큰 확인
      const queryToken = req.query.token as string;
      const authHeader = req.headers.authorization;
      
      let token = '';
      if (queryToken) {
        token = queryToken;
      } else if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        return res.status(401).json({ message: 'No token provided' });
      }

      // JWT 토큰 검증
      const decoded = verifyToken(token);
      if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log(`[DB-ADMIN] Admin access granted to ${decoded.email} (${decoded.id})`);
      res.sendFile(path.join(process.cwd(), 'db-admin.html'));
    } catch (error) {
      console.error('[DB-ADMIN] Access denied:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  });

  // SQL execution endpoint for DB admin - ADMIN ONLY
  app.post('/api/sql', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // 강화된 보안 검사 - DDL/DCL 전면 차단
      const dangerousPatterns = [
        // DDL (Data Definition Language) - 구조 변경
        /\b(create|drop|alter)\s+(database|schema|table|index|view|sequence|function|procedure|trigger)/i,
        /\b(truncate)\s+table/i,
        
        // DCL (Data Control Language) - 권한 관리
        /\b(grant|revoke|deny)\b/i,
        
        // 위험한 DML 패턴
        /\b(delete)\s+from\s+(?!.*where)/i, // WHERE 없는 DELETE
        /\b(update)\s+.*set\s+(?!.*where)/i, // WHERE 없는 UPDATE
        /\b(insert)\s+into\s+.*(users|auth|admin)/i, // 사용자 테이블 INSERT
        
        // 시스템 함수/명령어
        /\b(exec|execute|sp_|xp_)/i,
        /\b(shutdown|restart)/i,
        
        // 파일 시스템 접근
        /\b(load_file|into\s+outfile|dumpfile)/i,
        
        // PostgreSQL 특화 위험 명령어
        /\b(copy)\s+.*from\s+program/i,
        /\b(\\\w+)/i, // PostgreSQL 메타명령어
      ];

      const isDangerous = dangerousPatterns.some((pattern) =>
        pattern.test(query)
      );
      if (isDangerous) {
        return res.status(403).json({ error: 'Dangerous query detected' });
      }

      const result = await storage.executeSQL(query);
      res.json(result);
    } catch (error: any) {
      console.error('SQL execution error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Commerce Admin API - ADMIN ONLY
  
  // 커머스 통계 조회
  app.get('/api/admin/commerce/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getCommerceStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching commerce stats:', error);
      res.status(500).json({ error: 'Failed to fetch commerce stats' });
    }
  });

  // 관리자용 경험 목록 조회 (호스트 정보 포함)
  app.get('/api/admin/experiences', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const experiences = await storage.getExperiencesWithHosts();
      res.json(experiences);
    } catch (error) {
      console.error('Error fetching admin experiences:', error);
      res.status(500).json({ error: 'Failed to fetch experiences' });
    }
  });

  // 관리자용 예약 목록 조회 (관련 정보 조인)
  app.get('/api/admin/bookings', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const bookings = await storage.getBookingsWithDetails();
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // 관리자용 결제 목록 조회
  app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error('Error fetching admin payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // ================== 호스트 전용 API ==================
  
  // 호스트용 경험 목록 조회 (자신의 경험만)
  app.get('/api/host/experiences', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const hostId = req.user.id;
      const experiences = await storage.getExperiencesByHost(hostId);
      res.json(experiences);
    } catch (error) {
      console.error('Error fetching host experiences:', error);
      res.status(500).json({ error: 'Failed to fetch experiences' });
    }
  });

  // 호스트용 예약 목록 조회 (자신의 예약만)  
  app.get('/api/host/bookings', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const hostId = req.user.id;
      const bookings = await storage.getBookingsByHost(hostId);
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching host bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // 호스트용 예약 상태 업데이트 (시나리오 7 지원)
  app.patch('/api/host/bookings/:id/status', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const bookingIdParam = req.params.id;
      if (!bookingIdParam) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      const bookingId = parseInt(bookingIdParam);
      const { status } = req.body;
      
      if (isNaN(bookingId) || !status) {
        return res.status(400).json({ error: 'Valid booking ID and status are required' });
      }

      if (!['confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "confirmed" or "cancelled"' });
      }

      // 예약이 현재 호스트의 것인지 확인
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // 해당 예약의 경험이 현재 호스트의 것인지 확인
      if (!booking.experienceId) {
        return res.status(400).json({ error: 'Invalid booking data' });
      }
      const experience = await storage.getExperienceById(booking.experienceId);
      if (!experience || experience.hostId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this booking' });
      }

      // 예약 상태 업데이트
      const updatedBooking = await storage.updateBookingStatus(bookingId, status);
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  });

  // 조건부 인증 설정
  console.log('💡 Google OAuth 인증 사용 중');

  // Passport 초기화 (Google OAuth용)
  app.use(passport.initialize());

  // Google OAuth 설정 (googleAuth.ts는 보안상 .gitignore 대상이므로 선택적으로 로드)
  try {
    const { setupGoogleAuth } = await import('./googleAuth');
    setupGoogleAuth(app);
  } catch {
    console.warn('⚠️ Google OAuth module not found. Skipping /api/auth/google routes.');
  }

  // Auth routes moved to server/routes/auth.ts
  app.use('/api/auth', authRouter);
  // 프로필 만남 상태 업데이트
  app.patch('/api/profile/open', authenticateHybrid, apiLimiter, validateSchema(UpdateProfileOpenSchema), async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { open, region, hours } = req.validatedData as { open: boolean; region?: string; hours?: number };

      console.log(`[PATCH /api/profile/open] 사용자 ${userId}: open=${open}, region=${region}, hours=${hours}`);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
      }

      console.log(`[PATCH /api/profile/open] 현재 사용자 상태: openToMeet=${user.openToMeet}, openUntil=${user.openUntil}`);

      // openUntil 계산 (활성화 시에만)
      let openUntil = null;
      if (open) {
        const activeHours = hours || 12; // 기본값 12시간
        openUntil = new Date(Date.now() + activeHours * 60 * 60 * 1000);
        console.log(`[PATCH /api/profile/open] openUntil 계산: ${openUntil} (${activeHours}시간 후)`);
      } else {
        console.log(`[PATCH /api/profile/open] 비활성화 - openUntil을 null로 설정`);
      }

      // 프로필 업데이트
      const updateData: any = {
        openToMeet: open,
        openUntil: openUntil,
      };
      
      if (region) {
        updateData.regionCode = region;
      }

      console.log(`[PATCH /api/profile/open] 업데이트 데이터:`, updateData);

      const updatedUser = await storage.updateUser(userId, updateData);

      console.log(`[PATCH /api/profile/open] 업데이트 완료: openToMeet=${updatedUser.openToMeet}, openUntil=${updatedUser.openUntil}`);

      // Open to Meet 상태가 활성화되면 근처 사용자들에게 알림 발송
      if (open && updatedUser.lastLatitude && updatedUser.lastLongitude) {
        try {
          // 근처 사용자 검색 (5km 반경)
          const nearbyUsers = await storage.getNearbyUsers(
            parseFloat(updatedUser.lastLatitude as string),
            parseFloat(updatedUser.lastLongitude as string),
            5, // 5km 반경
            50 // 최대 50명
          );

          // 자신을 제외한 근처 사용자들에게 알림 발송
          const displayName = updatedUser.nickname || 
            (updatedUser.firstName && updatedUser.lastName 
              ? `${updatedUser.firstName} ${updatedUser.lastName}` 
              : updatedUser.firstName || '여행자');

          for (const nearbyUser of nearbyUsers) {
            if (nearbyUser.id !== userId) {
              // 알림 생성
              const notification = await storage.createNotification({
                userId: nearbyUser.id,
                type: 'open_to_meet',
                title: '근처에 새로운 여행자!',
                message: `${displayName}님이 만남을 열었습니다`,
                location: updatedUser.location || undefined,
                relatedUserId: userId,
              });

              // WebSocket으로 실시간 알림 전송
              const sendNotificationToUser = (app as any).sendNotificationToUser;
              if (sendNotificationToUser) {
                sendNotificationToUser(nearbyUser.id, notification);
              }
            }
          }

          console.log(`[PATCH /api/profile/open] ${nearbyUsers.length - 1}명의 근처 사용자에게 알림 발송 완료`);
        } catch (notifyError) {
          console.error('[PATCH /api/profile/open] 근처 사용자 알림 발송 오류:', notifyError);
          // 알림 실패는 메인 응답에 영향 주지 않음
        }
      }

      res.json({
        message: '프로필이 업데이트되었습니다',
        openToMeet: updatedUser.openToMeet,
        regionCode: updatedUser.regionCode,
        openUntil: updatedUser.openUntil,
      });
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      res.status(500).json({ message: '프로필 업데이트 중 오류가 발생했습니다' });
    }
  });

  // Portfolio Mode 업데이트
  app.put('/api/profile/portfolio-mode', authenticateHybrid, apiLimiter, validateSchema(PortfolioModeSchema), async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { portfolioMode, publicProfileUrl } = req.validatedData as { portfolioMode: boolean; publicProfileUrl?: string };

      console.log(`[PUT /api/profile/portfolio-mode] 사용자 ${userId}: portfolioMode=${portfolioMode}, publicProfileUrl=${publicProfileUrl}`);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
      }

      // 인플루언서만 포트폴리오 모드 사용 가능
      if (user.userType !== 'influencer') {
        return res.status(403).json({ message: '인플루언서만 포트폴리오 모드를 사용할 수 있습니다' });
      }

      console.log(`[PUT /api/profile/portfolio-mode] 현재 사용자 상태: portfolioMode=${user.portfolioMode}, publicProfileUrl=${user.publicProfileUrl}`);

      // 포트폴리오 모드 활성화 시 URL 체크
      if (portfolioMode && !publicProfileUrl) {
        return res.status(400).json({ message: '포트폴리오 모드 활성화 시 프로필 URL이 필요합니다' });
      }

      // URL 중복 체크 (다른 사용자가 이미 사용 중인지)
      if (publicProfileUrl) {
        const existingUser = await storage.getUserByPublicProfileUrl(publicProfileUrl);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: '이미 사용 중인 프로필 URL입니다' });
        }
      }

      // 프로필 업데이트
      const updateData: any = {
        portfolioMode: portfolioMode,
        publicProfileUrl: portfolioMode ? publicProfileUrl : null,
      };

      console.log(`[PUT /api/profile/portfolio-mode] 업데이트 데이터:`, updateData);

      const updatedUser = await storage.updateUser(userId, updateData);

      console.log(`[PUT /api/profile/portfolio-mode] 업데이트 완료: portfolioMode=${updatedUser.portfolioMode}, publicProfileUrl=${updatedUser.publicProfileUrl}`);

      res.json({
        message: '포트폴리오 모드가 업데이트되었습니다',
        portfolioMode: updatedUser.portfolioMode,
        publicProfileUrl: updatedUser.publicProfileUrl,
      });
    } catch (error) {
      console.error('포트폴리오 모드 업데이트 오류:', error);
      res.status(500).json({ message: '포트폴리오 모드 업데이트 중 오류가 발생했습니다' });
    }
  });


  // 구글 로그인 시작 엔드포인트
  app.get('/api/login', (req, res) => {
    console.log(`[LOGIN] Google OAuth login initiated`);
    // Google OAuth flow 시작 - /auth/google로 리다이렉트
    res.redirect('/auth/google');
  });

  // 로그아웃 엔드포인트
  app.get('/api/logout', (req, res) => {
    console.log(`[LOGOUT] Logout request received`);
    
    // 세션이 있으면 파기
    if (req.session) {
      const sessionId = req.sessionID;
      console.log(`[LOGOUT] Destroying session: ${sessionId}`);
      
      // 글로벌 로그아웃 추적에 세션 ID 추가
      if (!global.loggedOutSessions) {
        global.loggedOutSessions = new Set();
      }
      if (sessionId) {
        global.loggedOutSessions.add(sessionId);
      }
      
      // 마지막 로그아웃 시간 업데이트
      global.lastLogoutTime = Date.now();
      console.log(`[LOGOUT] Updated lastLogoutTime: ${global.lastLogoutTime}`);
      
      req.session.destroy((err: any) => {
        if (err) {
          console.error(`[LOGOUT] Session destruction error:`, err);
          return res.status(500).json({ message: 'Logout failed' });
        }
        
        // 세션 쿠키 제거
        res.clearCookie('connect.sid', { path: '/' });
        console.log(`[LOGOUT] Session destroyed and cookie cleared`);
        
        // 홈페이지로 리다이렉트
        res.redirect('/');
      });
    } else {
      console.log(`[LOGOUT] No session to destroy`);
      // 마지막 로그아웃 시간만 업데이트
      global.lastLogoutTime = Date.now();
      console.log(`[LOGOUT] Updated lastLogoutTime: ${global.lastLogoutTime}`);
      res.redirect('/');
    }
  });

  // Experience routes
  app.get('/api/experiences', async (req, res) => {
    try {
      const { location, category } = req.query;
      const experiences = await storage.getExperiences(
        location as string,
        category as string
      );
      res.json(experiences);
    } catch (error) {
      console.error('Error fetching experiences:', error);
      res.status(500).json({ message: 'Failed to fetch experiences' });
    }
  });

  app.get('/api/experiences/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid experience ID' });
      }
      const experience = await storage.getExperienceById(id);
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }
      res.json(experience);
    } catch (error) {
      console.error('Error fetching experience:', error);
      res.status(500).json({ message: 'Failed to fetch experience' });
    }
  });

  app.post('/api/experiences', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const experienceData = insertExperienceSchema.parse({
        ...req.body,
        hostId: userId,
      });
      const experience = await storage.createExperience(experienceData);

      // 이벤트/Experience 생성 시 근처 사용자에게 알림 발송
      if (experience.latitude && experience.longitude) {
        try {
          const host = await storage.getUser(userId);
          const hostDisplayName = host?.nickname || 
            (host?.firstName && host?.lastName 
              ? `${host.firstName} ${host.lastName}` 
              : host?.firstName || '호스트');

          // 근처 사용자 검색 (10km 반경)
          const nearbyUsers = await storage.getNearbyUsers(
            parseFloat(experience.latitude as string),
            parseFloat(experience.longitude as string),
            10, // 10km 반경
            100 // 최대 100명
          );

          // 자신을 제외한 근처 사용자들에게 알림 발송
          for (const nearbyUser of nearbyUsers) {
            if (nearbyUser.id !== userId) {
              const notification = await storage.createNotification({
                userId: nearbyUser.id,
                type: 'event_nearby',
                title: '근처에 새로운 이벤트!',
                message: `${hostDisplayName}님이 "${experience.title}" 이벤트를 개설했습니다`,
                location: experience.location || undefined,
                relatedUserId: userId,
              });

              // WebSocket으로 실시간 알림 전송
              const sendNotificationToUser = (app as any).sendNotificationToUser;
              if (sendNotificationToUser) {
                sendNotificationToUser(nearbyUser.id, notification);
              }
            }
          }

          console.log(`[POST /api/experiences] ${nearbyUsers.length - 1}명의 근처 사용자에게 알림 발송 완료`);
        } catch (notifyError) {
          console.error('[POST /api/experiences] 근처 사용자 알림 발송 오류:', notifyError);
          // 알림 실패는 메인 응답에 영향 주지 않음
        }
      }

      res.status(201).json(experience);
    } catch (error) {
      console.error('Error creating experience:', error);
      res.status(500).json({ message: 'Failed to create experience' });
    }
  });

  // Update experience (Host or Admin only)
  app.patch('/api/experiences/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const experienceId = parseInt(req.params.id);

      if (isNaN(experienceId)) {
        return res.status(400).json({ message: 'Invalid experience ID' });
      }

      const experience = await storage.getExperienceById(experienceId);
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }

      const user = await storage.getUser(userId);
      const isOwner = experience.hostId === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You can only edit your own experiences' });
      }

      const { title, description, price, currency, location, latitude, longitude, category, duration, maxParticipants, images, included, requirements, isActive } = req.body;
      const updatedExperience = await storage.updateExperience(experienceId, {
        title,
        description,
        price,
        currency,
        location,
        latitude,
        longitude,
        category,
        duration,
        maxParticipants,
        images,
        included,
        requirements,
        isActive,
      });

      if (updatedExperience) {
        res.json(updatedExperience);
      } else {
        res.status(500).json({ message: 'Failed to update experience' });
      }
    } catch (error) {
      console.error('Error updating experience:', error);
      res.status(500).json({ message: 'Failed to update experience' });
    }
  });

  // Delete experience (Host or Admin only)
  app.delete('/api/experiences/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const experienceId = parseInt(req.params.id);

      if (isNaN(experienceId)) {
        return res.status(400).json({ message: 'Invalid experience ID' });
      }

      const experience = await storage.getExperienceById(experienceId);
      if (!experience) {
        return res.status(404).json({ message: 'Experience not found' });
      }

      const user = await storage.getUser(userId);
      const isOwner = experience.hostId === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You can only delete your own experiences' });
      }

      const success = await storage.deleteExperience(experienceId);

      if (success) {
        res.json({ message: 'Experience deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete experience' });
      }
    } catch (error) {
      console.error('Error deleting experience:', error);
      res.status(500).json({ message: 'Failed to delete experience' });
    }
  });

  app.get('/api/experiences/:id/reviews', async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      if (isNaN(experienceId)) {
        return res.status(400).json({ message: 'Invalid experience ID' });
      }
      const reviews = await storage.getReviewsByExperience(experienceId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  // Guide Profile API - 시나리오 7 지원
  app.get('/api/guide/:id', async (req, res) => {
    try {
      const guideId = req.params.id;
      const guide = await storage.getGuideProfile(guideId);
      
      if (!guide) {
        return res.status(404).json({ message: 'Guide not found' });
      }
      
      res.json(guide);
    } catch (error) {
      console.error('Error fetching guide profile:', error);
      res.status(500).json({ message: 'Failed to fetch guide profile' });
    }
  });

  app.get('/api/guide/:id/experiences', async (req, res) => {
    try {
      const guideId = req.params.id;
      const experiences = await storage.getExperiencesByHost(guideId);
      res.json(experiences);
    } catch (error) {
      console.error('Error fetching guide experiences:', error);
      res.status(500).json({ message: 'Failed to fetch guide experiences' });
    }
  });

  app.get('/api/guide/:id/posts', async (req, res) => {
    try {
      const guideId = req.params.id;
      const posts = await storage.getPostsByUser(guideId);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching guide posts:', error);
      res.status(500).json({ message: 'Failed to fetch guide posts' });
    }
  });

  app.get('/api/guide/:id/reviews', async (req, res) => {
    try {
      const guideId = req.params.id;
      const reviews = await storage.getReviewsByHost(guideId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching guide reviews:', error);
      res.status(500).json({ message: 'Failed to fetch guide reviews' });
    }
  });

  // Timeline routes
  app.post('/api/timelines', authenticateToken, apiLimiter, validateSchema(CreateTimelineSchema), async (req: any, res) => {
    try {
      const userId = req.user!.id;
      console.log('타임라인 생성 요청:', req.body);
      console.log('사용자 ID:', userId);

      // 검증된 데이터에 userId 추가
      const timelineData = {
        ...req.validatedData,
        userId,
        startDate: new Date(req.validatedData.startDate),
        endDate: req.validatedData.endDate ? new Date(req.validatedData.endDate) : null,
      };

      console.log('처리된 타임라인 데이터:', timelineData);

      const validatedData = insertTimelineSchema.parse(timelineData);
      console.log('검증된 데이터:', validatedData);

      const timeline = await storage.createTimeline(validatedData);
      console.log('생성된 타임라인:', timeline);

      res.status(201).json(timeline);
    } catch (error) {
      console.error('타임라인 생성 오류:', error);
      res
        .status(400)
        .json({
          message: '타임라인 생성에 실패했습니다',
          error: (error as Error).message,
        });
    }
  });

  app.get('/api/timelines', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const timelines = await storage.getTimelinesByUser(userId);
      res.json(timelines);
    } catch (error) {
      console.error('Error fetching timelines:', error);
      res.status(500).json({ message: 'Failed to fetch timelines' });
    }
  });

  app.get('/api/timelines/:id', async (req, res) => {
    try {
      const timelineId = parseInt(req.params.id);
      const timeline = await storage.getTimelineWithPosts(timelineId);
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }
      res.json(timeline);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ message: 'Failed to fetch timeline' });
    }
  });

  // Post routes
  app.get('/api/posts', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.query.userId as string | undefined;
      
      if (userId) {
        // 특정 사용자의 포스트만 가져오기
        const posts = await storage.getPostsByUser(userId);
        res.json(posts);
      } else {
        // 전체 포스트 가져오기
        const posts = await storage.getPosts(limit, offset);
        res.json(posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Get single post by ID
  app.get('/api/posts/:id', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      res.json(post);
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ message: 'Failed to fetch post' });
    }
  });

  // Update post (Author or Admin only)
  app.patch('/api/posts/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const postId = parseInt(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const user = await storage.getUser(userId);
      const isOwner = post.userId === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You can only edit your own posts' });
      }

      const { title, content, location, latitude, longitude, theme, tags } = req.body;
      const updatedPost = await storage.updatePost(postId, {
        title,
        content,
        location,
        latitude,
        longitude,
        theme,
        tags,
      });

      if (updatedPost) {
        res.json(updatedPost);
      } else {
        res.status(500).json({ message: 'Failed to update post' });
      }
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ message: 'Failed to update post' });
    }
  });

  // Delete post (Author or Admin only)
  app.delete('/api/posts/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const postId = parseInt(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const user = await storage.getUser(userId);
      const isOwner = post.userId === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'You can only delete your own posts' });
      }

      const success = await storage.deletePost(postId);

      if (success) {
        res.json({ message: 'Post deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete post' });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // 파일 업로드 엔드포인트
  app.post(
    '/api/upload',
    authenticateToken,
    uploadLimiter,
    (req, res, next) => {
      upload.array('files', 10)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: '파일 크기가 15MB를 초과합니다.',
              code: 'FILE_TOO_LARGE'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              message: '한 번에 최대 10개의 파일만 업로드 가능합니다.',
              code: 'TOO_MANY_FILES'
            });
          }
          return res.status(400).json({ 
            message: '파일 업로드 오류: ' + err.message,
            code: 'UPLOAD_ERROR'
          });
        }
        if (err) {
          return res.status(400).json({ 
            message: err.message,
            code: 'INVALID_FILE_TYPE'
          });
        }
        next();
      });
    },
    async (req: any, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ 
            message: '업로드된 파일이 없습니다.',
            code: 'NO_FILES'
          });
        }

        // [2026-03-08] Object Storage 업로드: file.buffer → GCS, URL은 /api/files/{filename} 유지
        const uploadedFiles = await Promise.all(req.files.map(async (file: any) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const filename = `${randomUUID()}${ext}`;

          // Object Storage에 업로드
          await objectStorageService.uploadFile(filename, file.buffer, file.mimetype);

          const fileInfo: any = {
            filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: `/api/files/${filename}`,
          };

          // EXIF: 버퍼에서 직접 파싱 (로컬 파일 경로 불필요)
          if (file.mimetype.startsWith('image/')) {
            try {
              const exifData = await exifr.parse(file.buffer, {
                gps: true,
                exif: true,
                iptc: true,
                ifd0: true,
                ifd1: true,
                tiff: true,
              });

              if (exifData) {
                fileInfo.exif = {
                  latitude: exifData.latitude || null,
                  longitude: exifData.longitude || null,
                  datetime: exifData.DateTimeOriginal || exifData.DateTime || null,
                  make: exifData.Make || null,
                  model: exifData.Model || null,
                  orientation: exifData.Orientation || null,
                  metadata: exifData,
                };
              }
            } catch (exifError) {
              console.log(`EXIF extraction skipped for ${filename}:`, exifError);
            }
          }

          return fileInfo;
        }));

        console.log('파일 업로드 성공:', uploadedFiles);
        res.json({ 
          success: true,
          files: uploadedFiles 
        });
      } catch (error) {
        console.error('파일 업로드 오류:', error);
        res.status(500).json({ 
          message: '파일 업로드에 실패했습니다.',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  );

  // 프로필 이미지 업로드 전용 엔드포인트
  app.post(
    '/api/upload/image',
    authenticateToken,
    uploadLimiter,
    (req, res, next) => {
      upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: '파일 크기가 15MB를 초과합니다.',
              code: 'FILE_TOO_LARGE'
            });
          }
          return res.status(400).json({ 
            message: '파일 업로드 오류: ' + err.message,
            code: 'UPLOAD_ERROR'
          });
        }
        if (err) {
          return res.status(400).json({ 
            message: err.message,
            code: 'INVALID_FILE_TYPE'
          });
        }
        next();
      });
    },
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ 
            message: '업로드된 이미지가 없습니다.',
            code: 'NO_FILE'
          });
        }

        // [2026-03-08] Object Storage 업로드
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `${randomUUID()}${ext}`;
        await objectStorageService.uploadFile(filename, req.file.buffer, req.file.mimetype);
        const imageUrl = `/api/files/${filename}`;
        
        console.log('[Upload Image] 이미지 업로드 성공 (Object Storage):', {
          filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: imageUrl
        });

        res.json({ 
          success: true,
          imageUrl: imageUrl,
          filename
        });
      } catch (error) {
        console.error('[Upload Image] 이미지 업로드 오류:', error);
        res.status(500).json({ 
          message: '이미지 업로드에 실패했습니다.',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  );

  // Like/Unlike post (실시간 알림 포함)
  app.post('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;  // JWT에서는 .id로 접근
      const postId = parseInt(req.params.id);

      console.log('좋아요 요청:', { userId, postId });

      // 포스트 정보 미리 조회 (알림 전송용)
      const post = await storage.getPostById(postId);
      
      const isLiked = await storage.toggleLike(userId, postId);

      console.log('좋아요 결과:', isLiked);

      // 실시간 알림 전송 (좋아요 추가 시, 본인 포스트가 아닐 때)
      if (isLiked && post && post.userId !== userId) {
        const sendNotificationToUser = (app as any).sendNotificationToUser;
        if (sendNotificationToUser) {
          // 최신 알림 조회해서 WebSocket으로 전송
          const notifications = await storage.getNotificationsByUser(post.userId);
          const latestNotification = notifications.find(n => 
            n.type === 'reaction' && n.relatedPostId === postId && n.relatedUserId === userId
          );
          if (latestNotification) {
            sendNotificationToUser(post.userId, latestNotification);
            console.log('실시간 좋아요 알림 전송:', post.userId);
          }
        }
      }

      res.json({ isLiked, message: isLiked ? '좋아요!' : '좋아요 취소' });
    } catch (error) {
      console.error('좋아요 오류:', error);
      res.status(500).json({ message: '좋아요 처리 중 오류가 발생했습니다.' });
    }
  });

  // EXIF 기반 Day 자동 계산 함수
  function inferDay(takenAt: Date, tripStart: Date): number {
    const d = Math.floor((+takenAt - +tripStart) / 86400000) + 1;
    return Math.max(1, d);
  }

  app.post('/api/posts', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const postData = insertPostSchema.parse({
        ...req.body,
        userId,
      });
      
      // Day 자동 계산 로직 (EXIF → Day/시간/위치 자동화)
      let calculatedDay = 1;
      let finalTakenAt = postData.takenAt;
      
      // 야간 촬영, 없는 EXIF, 연속 촬영 등 보정 처리
      if (!finalTakenAt) {
        finalTakenAt = new Date();
        console.log('EXIF takenAt 없음, 업로드 시간 사용 (야간촬영/EXIF누락 케이스):', finalTakenAt);
      } else {
        // 연속 촬영 케이스: 같은 시간대 사진들을 약간씩 조정
        const takenTime = new Date(finalTakenAt);
        const now = new Date();
        
        // 미래 시간이면 현재 시간으로 보정 (카메라 시계 오류)
        if (takenTime.getTime() > now.getTime()) {
          finalTakenAt = now;
          console.log('미래 시간 EXIF 보정:', { original: takenTime, corrected: finalTakenAt });
        }
        
        // 너무 과거 시간이면 (10년 전) 현재 시간으로 보정
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        if (takenTime.getTime() < tenYearsAgo.getTime()) {
          finalTakenAt = now;
          console.log('과거 시간 EXIF 보정:', { original: takenTime, corrected: finalTakenAt });
        }
      }
      
      // timeline이나 trip 연결 시 trip.start_date 기준으로 Day 계산
      if (postData.timelineId) {
        try {
          const timeline = await storage.getTimelineById(postData.timelineId);
          if (timeline && timeline.startDate) {
            calculatedDay = inferDay(new Date(finalTakenAt), new Date(timeline.startDate));
            console.log('Timeline 기준 Day 계산:', {
              takenAt: finalTakenAt,
              startDate: timeline.startDate,
              calculatedDay
            });
          }
        } catch (error) {
          console.log('Timeline 정보 조회 실패, 기본 Day 사용:', error);
        }
      } else {
        // timeline이 없는 경우 사용자의 기존 게시글 기준으로 Day 계산
        const userPostsWithTakenAt = await storage.getPostsByUserWithTakenAt(userId);
        
        if (userPostsWithTakenAt && userPostsWithTakenAt.length > 0) {
          const dateMap = new Map<string, number>();
          const allDates = userPostsWithTakenAt
            .map(p => p.takenAt ? new Date(p.takenAt).toDateString() : null)
            .filter(Boolean) as string[];
            
          const newPostDate = new Date(finalTakenAt).toDateString();
          allDates.push(newPostDate);
          
          const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => 
            new Date(a).getTime() - new Date(b).getTime()
          );
          
          uniqueDates.forEach((date, index) => {
            dateMap.set(date, index + 1);
          });
          
          calculatedDay = dateMap.get(newPostDate) || 1;
        }
      }
      
      // GPS 좌표 처리 (클라이언트에서 POI 선택한 경우 우선)
      let finalLatitude = postData.latitude;
      let finalLongitude = postData.longitude;
      
      // EXIF GPS가 없고 초기 위치가 있으면 사용
      if (!finalLatitude && !finalLongitude && req.body.initialLocation) {
        finalLatitude = req.body.initialLocation.lat?.toString();
        finalLongitude = req.body.initialLocation.lng?.toString();
        console.log('EXIF GPS 없음, POI 선택 위치 사용:', { lat: finalLatitude, lng: finalLongitude });
      }
      
      // GPS 좌표 유효성 검증
      if (finalLatitude && finalLongitude) {
        const lat = parseFloat(finalLatitude);
        const lng = parseFloat(finalLongitude);
        
        // 위도는 -90~90, 경도는 -180~180 범위
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.log('유효하지 않은 GPS 좌표 무시:', { lat, lng });
          finalLatitude = null;
          finalLongitude = null;
        }
      }
      
      const finalPostData = {
        ...postData,
        takenAt: finalTakenAt,
        day: calculatedDay,
        latitude: finalLatitude,
        longitude: finalLongitude
      };
      
      console.log('게시글 생성 - EXIF 기반 자동화 완료:', {
        userId,
        takenAt: finalTakenAt,
        calculatedDay,
        latitude: finalLatitude,
        longitude: finalLongitude,
        timelineId: postData.timelineId
      });
      
      const post = await storage.createPost(finalPostData);

      if (req.body.mediaFiles && Array.isArray(req.body.mediaFiles)) {
        const mediaInserts = req.body.mediaFiles.map((file: any, index: number) => ({
          postId: post.id,
          type: file.mimetype?.startsWith('video/') ? 'video' : 'image',
          url: file.url,
          orderIndex: index,
          exifDatetime: file.exif?.datetime ? new Date(file.exif.datetime) : null,
          exifLatitude: file.exif?.latitude?.toString() || null,
          exifLongitude: file.exif?.longitude?.toString() || null,
          exifMetadata: file.exif?.metadata || null,
        }));

        await storage.createPostMediaBatch(mediaInserts);
        console.log(`postMedia 레코드 ${mediaInserts.length}개 생성 완료`);
      }

      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  // Comments API (실시간 알림 포함)
  app.post('/api/posts/:id/comments', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const postId = parseInt(req.params.id);
      
      const post = await storage.getPostById(postId);
      
      const commentData = insertCommentSchema.parse({
        postId,
        userId,
        content: req.body.content,
        parentId: req.body.parentId || null,
        isOffer: req.body.isOffer || false,
        offerPrice: req.body.offerPrice || null,
        offerDescription: req.body.offerDescription || null,
        offerDuration: req.body.offerDuration || null,
        offerStatus: req.body.isOffer ? 'pending' : null,
      });

      const newComment = await storage.createComment(commentData);
      console.log('댓글 생성 성공:', newComment);

      // 실시간 알림 전송 (본인 포스트가 아닐 때)
      if (post && post.userId !== userId) {
        const sendNotificationToUser = (app as any).sendNotificationToUser;
        if (sendNotificationToUser) {
          const notifications = await storage.getNotificationsByUser(post.userId);
          const notificationType = req.body.isOffer ? 'offer' : (req.body.parentId ? 'reply' : 'comment');
          const latestNotification = notifications.find(n => 
            n.type === notificationType && n.relatedPostId === postId && n.relatedUserId === userId
          );
          if (latestNotification) {
            sendNotificationToUser(post.userId, latestNotification);
            console.log('실시간 알림 전송:', post.userId, notificationType);
          }
        }
      }

      res.json(newComment);
    } catch (error) {
      console.error('댓글 생성 실패:', error);
      res.status(500).json({ message: '댓글 작성에 실패했습니다.' });
    }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getCommentsByPost(postId);
      console.log(`포스트 ${postId} 댓글 조회:`, comments.length, '개');
      res.json(comments);
    } catch (error) {
      console.error('댓글 조회 실패:', error);
      res.status(500).json({ message: '댓글 조회에 실패했습니다.' });
    }
  });

  app.delete('/api/comments/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const commentId = parseInt(req.params.id);
      const success = await storage.deleteComment(commentId, userId);
      
      if (success) {
        res.json({ message: '댓글이 삭제되었습니다.' });
      } else {
        res.status(404).json({ message: '댓글을 찾을 수 없거나 삭제 권한이 없습니다.' });
      }
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      res.status(500).json({ message: '댓글 삭제에 실패했습니다.' });
    }
  });

  // Offer status update
  app.patch('/api/comments/:id/offer-status', authenticateToken, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['pending', 'accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: '잘못된 상태입니다.' });
      }
      
      const updated = await storage.updateOfferStatus(commentId, status);
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
      }
    } catch (error) {
      console.error('오퍼 상태 업데이트 실패:', error);
      res.status(500).json({ message: '오퍼 상태 업데이트에 실패했습니다.' });
    }
  });

  // Booking routes
  app.get('/api/bookings', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { type } = req.query;

      let bookings;
      if (type === 'host') {
        bookings = await storage.getBookingsByHost(userId);
      } else {
        bookings = await storage.getBookingsByGuest(userId);
      }
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // "Open to meet" API endpoints
  app.get('/api/profile/open', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // 만료 시간 체크 - 자동 off 처리
      let isOpenToMeet = user.openToMeet;
      if (user.openUntil && new Date() > new Date(user.openUntil)) {
        // 만료된 경우 자동으로 false로 업데이트
        await storage.updateUser(userId, { 
          openToMeet: false, 
          openUntil: null 
        });
        isOpenToMeet = false;
        console.log('Open to meet 자동 만료:', userId);
      }
      
      res.json({
        openToMeet: isOpenToMeet,
        regionCode: user.regionCode,
        openUntil: user.openUntil
      });
    } catch (error) {
      console.error('Error fetching open status:', error);
      res.status(500).json({ message: 'Failed to fetch open status' });
    }
  });

  // 현재 만남 열려있는 사용자들 조회 (지도용)
  app.get('/api/users/open', async (req, res) => {
    try {
      const openUsers = await storage.getOpenUsers();
      res.json(openUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        location: user.location,
        regionCode: user.regionCode,
        openUntil: user.openUntil,
        profileImageUrl: user.profileImageUrl,
        bio: user.bio,
        lastLatitude: user.lastLatitude,
        lastLongitude: user.lastLongitude,
      })));
    } catch (error) {
      console.error('Error fetching open users:', error);
      res.status(500).json({ message: 'Failed to fetch open users' });
    }
  });


  // Public System Settings API - 특정 설정 조회 (누구나 접근 가능)
  app.get('/api/public/settings/:category/:key', async (req, res) => {
    try {
      const { category, key } = req.params;
      const setting = await storage.getSystemSetting(category, key);
      if (!setting) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      res.json({ value: setting });
    } catch (error) {
      console.error('Error fetching public setting:', error);
      res.status(500).json({ message: 'Failed to fetch setting' });
    }
  });

  // System Settings API - 관리자 전용 (new system_config table)
  app.get('/api/system-settings', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const category = req.query.category as string | undefined;
      const configs = category
        ? await storage.getSystemConfigsByCategory(category)
        : await storage.getAllSystemConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching system configs:', error);
      res.status(500).json({ message: 'Failed to fetch system settings' });
    }
  });

  app.put('/api/system-settings/:id', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: 'Setting ID is required' });
      }
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return res.status(400).json({ message: 'Invalid setting ID' });
      }
      const allowedFields = ['valueString', 'valueNumber', 'valueBoolean', 'valueJson', 'description', 'descriptionKo'];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      const config = await storage.updateSystemConfig(numericId, updates);
      if (!config) {
        return res.status(404).json({ message: 'Setting not found' });
      }
      res.json(config);
    } catch (error) {
      console.error('Error updating system config:', error);
      res.status(500).json({ message: 'Failed to update system setting' });
    }
  });

  // AI Prompt Templates API - 관리자 전용
  app.get('/api/ai-prompt-templates', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const category = req.query.category as string | undefined;
      if (category) {
        const templates = await storage.getAiPromptTemplatesByCategory(category);
        return res.json(templates);
      }
      const templates = await storage.getAllAiPromptTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching AI prompt templates:', error);
      res.status(500).json({ message: 'Failed to fetch AI prompt templates' });
    }
  });

  app.post('/api/ai-prompt-templates', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const requiredFields = ['templateKey', 'name', 'category'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ message: `${field} is required` });
        }
      }
      const allowedFields = ['templateKey', 'name', 'nameKo', 'description', 'aiProvider', 'aiModel', 'maxTokens', 'temperature', 'topP', 'frequencyPenalty', 'presencePenalty', 'systemPrompt', 'userPromptTemplate', 'locale', 'responseFormat', 'responseSchema', 'isActive', 'isDefault', 'category', 'tags'];
      const templateData: Record<string, any> = { createdBy: req.user?.id };
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          templateData[field] = req.body[field];
        }
      }
      const template = await storage.createAiPromptTemplate(templateData as any);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating AI prompt template:', error);
      res.status(500).json({ message: 'Failed to create AI prompt template' });
    }
  });

  app.put('/api/ai-prompt-templates/:id', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      const allowedFields = ['name', 'nameKo', 'description', 'aiProvider', 'aiModel', 'maxTokens', 'temperature', 'topP', 'frequencyPenalty', 'presencePenalty', 'systemPrompt', 'userPromptTemplate', 'locale', 'responseFormat', 'responseSchema', 'isActive', 'isDefault', 'tags'];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      const template = await storage.updateAiPromptTemplate(id, updates, req.user?.id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      console.error('Error updating AI prompt template:', error);
      res.status(500).json({ message: 'Failed to update AI prompt template' });
    }
  });

  // DEPRECATED: Old experienceId-based booking API (for backward compatibility)
  // TODO: Migrate frontend to use slot-based booking API at line 4004+
  app.post('/api/bookings', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const guestId = req.user.id;
      const { experienceId, slotId } = req.body;
      
      // 중복 예약 체크
      const existingBooking = await storage.findExistingBooking(guestId, experienceId, slotId);
      if (existingBooking) {
        return res.status(400).json({ error: 'Already booked' });
      }
      
      // 기존 experienceId 기반 데이터
      const basicBookingData = {
        experienceId: req.body.experienceId,
        guestId,
        hostId: req.body.hostId,
        date: new Date(req.body.date),
        participants: req.body.participants,
        totalPrice: req.body.totalPrice,
        specialRequests: req.body.specialRequests,
        status: 'pending',
      };
      
      const booking = await storage.createBooking(basicBookingData);
      
      // 호스트에게 알림 생성 및 WebSocket 브로드캐스트
      try {
        let experience;
        if (experienceId) {
          experience = await storage.getExperienceById(experienceId);
        }
        
        const hostId = booking.hostId;
        if (hostId) {
          const notification = await storage.createNotification({
            userId: hostId,
            type: 'booking',
            title: '새 예약',
            message: '새 예약이 있습니다',
          });
          
          const sendNotificationToUser = (app as any).sendNotificationToUser;
          if (sendNotificationToUser) {
            sendNotificationToUser(hostId, notification);
          }
        }
      } catch (notifError) {
        console.error('Error sending booking notification:', notifError);
      }
      
      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  app.patch('/api/bookings/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id!);
      const { status } = req.body;
      const booking = await storage.updateBookingStatus(id, status);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.json(booking);
    } catch (error) {
      console.error('Error updating booking:', error);
      res.status(500).json({ message: 'Failed to update booking' });
    }
  });

  // Chat routes
  app.get('/api/conversations', authenticateHybrid, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const convList = await storage.getConversationsByUser(userId);
      const otherIds = convList.map(c =>
        c.participant1Id === userId ? c.participant2Id : c.participant1Id
      );
      const uniqueIds = [...new Set(otherIds)];
      const userMap: Record<string, { firstName: string | null; lastName: string | null; profileImageUrl: string | null }> = {};
      await Promise.all(uniqueIds.map(async (id) => {
        const u = await storage.getUser(id);
        if (u) userMap[id] = { firstName: u.firstName ?? null, lastName: u.lastName ?? null, profileImageUrl: u.profileImageUrl ?? null };
      }));
      const result = convList.map(c => {
        const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
        return { ...c, otherUser: userMap[otherId] ? { id: otherId, ...userMap[otherId] } : { id: otherId, firstName: null, lastName: null, profileImageUrl: null } };
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get(
    '/api/conversations/:id/messages',
    authenticateHybrid,
    apiLimiter,
    async (req, res) => {
      try {
        const conversationId = parseInt(req.params.id!);
        const messages =
          await storage.getMessagesByConversation(conversationId);
        res.json(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
      }
    }
  );

  app.post('/api/conversations', authenticateHybrid, apiLimiter, validateSchema(CreateConversationSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const participant1Id = req.user.id;
      const { participant2Id } = req.validatedData as { participant2Id: string };
      const conversation = await storage.getOrCreateConversation(
        participant1Id,
        participant2Id
      );
      res.json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  // Trip routes
  app.get('/api/trips', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const trips = await storage.getTripsByUser(userId);
      res.json(trips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      res.status(500).json({ message: 'Failed to fetch trips' });
    }
  });

  app.post('/api/trips', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { startDate, totalDays = 1, ...rest } = req.body;
      
      // startDate를 Date로 변환
      const start = new Date(startDate);
      
      // endDate 계산 (totalDays가 3이면 startDate부터 3일간)
      const end = new Date(start);
      end.setDate(end.getDate() + (totalDays - 1));
      
      const tripData = insertTripSchema.parse({
        ...rest,
        userId,
        startDate: start,
        endDate: end,
        totalDays,
      });
      
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      console.error('Error creating trip:', error);
      if (error instanceof Error) {
        console.error('Trip creation error details:', error.message);
      }
      res.status(500).json({ message: 'Failed to create trip' });
    }
  });

  // User profile routes
  app.patch('/api/user/profile', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { 
        nickname,
        firstName, 
        lastName, 
        bio, 
        location, 
        isHost, 
        profileImageUrl,
        interests,
        languages 
      } = req.body;

      console.log(`[PATCH /api/user/profile] User ${userId} updating profile with:`, {
        nickname,
        firstName,
        lastName,
        bio: bio?.substring(0, 50),
        location,
        isHost,
        profileImageUrl: profileImageUrl?.substring(0, 50),
        interests,
        languages,
      });

      // 배열 필드 검증
      if (interests && !Array.isArray(interests)) {
        console.error(`[PATCH /api/user/profile] Invalid interests format:`, interests);
        return res.status(400).json({ message: 'Interests must be an array' });
      }
      
      if (languages && !Array.isArray(languages)) {
        console.error(`[PATCH /api/user/profile] Invalid languages format:`, languages);
        return res.status(400).json({ message: 'Languages must be an array' });
      }

      // bio 길이 검증
      if (bio && bio.length > 500) {
        console.error(`[PATCH /api/user/profile] Bio too long:`, bio.length);
        return res.status(400).json({ message: 'Bio must be 500 characters or less' });
      }

      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.error(`[PATCH /api/user/profile] User ${userId} not found`);
        return res.status(404).json({ message: 'User not found' });
      }

      const updateData: any = {
        id: userId,
        email: existingUser.email || 'unknown@example.com',
      };

      // 값이 제공된 필드만 업데이트
      if (nickname !== undefined) updateData.nickname = nickname;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (bio !== undefined) updateData.bio = bio;
      if (location !== undefined) updateData.location = location;
      if (isHost !== undefined) updateData.isHost = isHost;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (interests !== undefined) updateData.interests = interests;
      if (languages !== undefined) updateData.languages = languages;

      console.log(`[PATCH /api/user/profile] Updating user ${userId} with:`, updateData);

      const user = await storage.upsertUser(updateData);
      
      console.log(`[PATCH /api/user/profile] Successfully updated user ${userId}`);
      res.json(user);
    } catch (error: any) {
      console.error('[PATCH /api/user/profile] Error updating profile:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        body: req.body,
      });
      
      res.status(500).json({ 
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  });

  registerLegacyNotificationRoutes(app, { storage, authenticateToken, insertNotificationSchema });

  // Portfolio 공개 API 엔드포인트
  
  // 공개 포트폴리오 사용자 정보 조회
  app.get('/api/portfolio/:publicProfileUrl', async (req, res) => {
    try {
      const { publicProfileUrl } = req.params;
      
      console.log(`[GET /api/portfolio/${publicProfileUrl}] 공개 포트폴리오 조회`);
      
      const user = await storage.getUserByPublicProfileUrl(publicProfileUrl);
      if (!user) {
        return res.status(404).json({ message: '포트폴리오를 찾을 수 없습니다' });
      }
      
      // 포트폴리오 모드가 활성화되어 있고 인플루언서인지 확인
      if (!user.portfolioMode || user.userType !== 'influencer') {
        return res.status(404).json({ message: '포트폴리오를 찾을 수 없습니다' });
      }
      
      // 공개 정보만 반환 (화이트리스트 적용)
      const publicUserInfo = {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        profileImageUrl: user.profileImageUrl || null,
        userType: 'influencer', // 강제로 influencer로 설정
        portfolioMode: true, // 강제로 true로 설정 (이미 체크했으므로)
        publicProfileUrl: user.publicProfileUrl,
      };
      
      console.log(`[GET /api/portfolio/${publicProfileUrl}] 성공: 사용자 ${user.id}`);
      res.json(publicUserInfo);
    } catch (error) {
      console.error('공개 포트폴리오 조회 오류:', error);
      res.status(500).json({ message: '포트폴리오 조회 중 오류가 발생했습니다' });
    }
  });

  // 공개 포트폴리오 서비스 템플릿 조회
  app.get('/api/templates/portfolio/:publicProfileUrl', async (req, res) => {
    try {
      const { publicProfileUrl } = req.params;
      
      console.log(`[GET /api/templates/portfolio/${publicProfileUrl}] 공개 서비스 템플릿 조회`);
      
      const user = await storage.getUserByPublicProfileUrl(publicProfileUrl);
      if (!user || !user.portfolioMode || user.userType !== 'influencer') {
        return res.status(404).json({ message: '포트폴리오를 찾을 수 없습니다' });
      }
      
      // 활성화된 서비스 템플릿만 조회 (공개 필드만)
      const templates = await storage.getServiceTemplatesByCreator(user.id);
      const activeTemplates = templates
        .filter((template: any) => template.isActive && template.creatorId === user.id)
        .map((template: any) => ({
          id: template.id,
          title: template.title,
          description: template.description,
          price: template.price,
          duration: template.duration,
          category: template.category,
          isActive: template.isActive,
        }));
      
      console.log(`[GET /api/templates/portfolio/${publicProfileUrl}] 성공: ${activeTemplates.length}개 템플릿`);
      res.json(activeTemplates);
    } catch (error) {
      console.error('공개 포트폴리오 템플릿 조회 오류:', error);
      res.status(500).json({ message: '템플릿 조회 중 오류가 발생했습니다' });
    }
  });

  // 사용자의 패키지 목록 조회 (인증 필요)
  app.get('/api/packages/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      console.log(`[GET /api/packages/my] 사용자 ${req.user.id}의 패키지 조회`);
      
      const packages = await storage.getServicePackagesByCreator(req.user.id);
      
      // 패키지 아이템 정보를 포함하여 반환
      const packagesWithDetails = await Promise.all(
        packages.map(async (pkg: any) => {
          const items = await storage.getPackageItemsByPackage(pkg.id);
          const itemsWithTemplates = await Promise.all(
            items.map(async (item: any) => {
              // itemType이 'template'인 경우 템플릿 정보를 가져옴
              if (item.itemType === 'template') {
                const template = await storage.getServiceTemplateById(item.itemId);
                return {
                  ...item,
                  template,
                };
              }
              return item;
            })
          );
          return {
            ...pkg,
            packageItems: itemsWithTemplates,
          };
        })
      );
      
      console.log(`[GET /api/packages/my] 성공: ${packagesWithDetails.length}개 패키지`);
      res.json(packagesWithDetails);
    } catch (error) {
      console.error('[GET /api/packages/my] 오류:', error);
      res.status(500).json({ message: '패키지 조회 중 오류가 발생했습니다' });
    }
  });

  // 공개 포트폴리오 패키지 조회
  app.get('/api/packages/portfolio/:publicProfileUrl', async (req, res) => {
    try {
      const { publicProfileUrl } = req.params;
      
      console.log(`[GET /api/packages/portfolio/${publicProfileUrl}] 공개 패키지 조회`);
      
      const user = await storage.getUserByPublicProfileUrl(publicProfileUrl);
      if (!user || !user.portfolioMode || user.userType !== 'influencer') {
        return res.status(404).json({ message: '포트폴리오를 찾을 수 없습니다' });
      }
      
      // 활성화된 패키지만 조회 (공개 필드만)
      const packages = await storage.getServicePackagesByCreator(user.id);
      const activePackagesData = packages.filter((pkg: any) => pkg.isActive && pkg.creatorId === user.id);
      
      const activePackages = await Promise.all(
        activePackagesData.map(async (pkg: any) => {
          const items = await storage.getPackageItemsByPackage(pkg.id);
          const itemsWithTemplates = await Promise.all(
            items.map(async (item: any) => {
              if (item.itemType === 'template') {
                const template = await storage.getServiceTemplateById(item.itemId);
                return {
                  templateId: item.itemId,
                  quantity: item.quantity,
                  template: template ? {
                    id: template.id,
                    title: template.title,
                    basePrice: template.basePrice,
                    templateType: template.templateType,
                  } : null,
                };
              }
              return null;
            })
          );
          return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            totalPrice: pkg.totalPrice,
            discountPercentage: pkg.discountPercentage,
            isActive: pkg.isActive,
            packageItems: itemsWithTemplates.filter(item => item !== null),
          };
        })
      );
      
      console.log(`[GET /api/packages/portfolio/${publicProfileUrl}] 성공: ${activePackages.length}개 패키지`);
      res.json(activePackages);
    } catch (error) {
      console.error('공개 포트폴리오 패키지 조회 오류:', error);
      res.status(500).json({ message: '패키지 조회 중 오류가 발생했습니다' });
    }
  });

  // Trips 라우터 추가
  app.use('/api/trips', tripsRouter);
  
  // [2026-03-08] /uploads/:fileName 엔드포인트 제거 — Object Storage 마이그레이션으로 불필요
  // 파일 접근은 /api/files/:filename 엔드포인트(Object Storage redirect)를 사용

  const httpServer = createServer(app);

  // WebSocket setup for real-time chat and notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  // 알림 전송 헬퍼 함수
  const sendNotificationToUser = (userId: string, notification: any) => {
    const userWs = clients.get(userId);
    if (userWs && userWs.readyState === WebSocket.OPEN) {
      userWs.send(JSON.stringify({
        type: 'notification',
        notification: notification
      }));
    }
  };

  // 전역 알림 전송 함수를 앱 객체에 추가
  (app as any).sendNotificationToUser = sendNotificationToUser;
  // wsClients Map을 app 객체에 추가 (채널 메시지 전송용)
  (app as any).wsClients = clients;

  wss.on('connection', (ws: WebSocket, req) => {
    let userId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          // JWT 토큰 검증으로 보안 강화
          const token = message.token;
          if (!token) {
            console.error('WebSocket: Missing authentication token');
            ws.close(4001, 'Missing authentication token');
            return;
          }
          
          const decoded = verifyToken(token);
          if (!decoded) {
            console.error('WebSocket: Invalid authentication token');
            ws.close(4001, 'Invalid authentication token');
            return;
          }
          
          userId = decoded.id;
          clients.set(userId, ws);
          console.log(`WebSocket: User ${userId} authenticated successfully`);
          ws.send(JSON.stringify({ type: 'auth_success', userId }));
          return;
        }

        if (message.type === 'ping') {
          // 하트비트 응답
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (message.type === 'chat_message' && userId) {
          const { conversationId, content, recipientId, parentMessageId } = message;

          // Save message to database
          const newMessage = await storage.createMessage({
            conversationId,
            senderId: userId,
            content,
            parentMessageId: parentMessageId || null,
          } as any);

          // Send to recipient if online
          const recipientWs = clients.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(
              JSON.stringify({
                type: 'chat_message',
                message: newMessage,
              })
            );
          }

          // Confirm to sender
          ws.send(
            JSON.stringify({
              type: 'message_sent',
              message: newMessage,
            })
          );
        }

        if (message.type === 'channel_message' && userId) {
          const { channelId, content, parentMessageId } = message;

          console.log(`[WebSocket] 채널 메시지 수신 - Channel ${channelId}, User ${userId}`);

          // 보안: 채널 멤버십 확인
          const isMember = await storage.isChannelMember(userId, channelId);
          if (!isMember) {
            console.warn(`[WebSocket] 권한 없음 - User ${userId} is not a member of channel ${channelId}`);
            ws.send(JSON.stringify({
              type: 'error',
              message: '채널 멤버만 메시지를 보낼 수 있습니다.'
            }));
            return;
          }

          // Save message to database
          const newMessage = await storage.createChannelMessage({
            channelId,
            senderId: userId,
            content,
            parentMessageId: parentMessageId || null,
          } as any);

          // Get channel members
          const members = await storage.getChannelMembers(channelId);

          // Broadcast to all channel members except sender
          for (const member of members) {
            if (member.userId !== userId) {
              const memberWs = clients.get(member.userId);
              if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                memberWs.send(JSON.stringify({
                  type: 'channel_message',
                  channelId,
                  message: newMessage,
                }));
              }
            }
          }

          // Confirm to sender
          ws.send(JSON.stringify({
            type: 'channel_message',
            channelId,
            message: newMessage,
          }));

          console.log(`[WebSocket] 채널 메시지 전송 완료 - Message ID ${newMessage.id}`);
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`WebSocket: User ${userId} disconnected`);
      }
    });
  });

  // Legacy route modules registration (compatibility-only)
  // T14 원칙: 신규 엔드포인트는 server/routes/*.ts 모듈에만 추가한다.
  // 이 섹션은 중복 API를 문서화하며 단계적으로 축소한다.
  registerLegacyModules(app, {
    storage,
    authenticateToken,
    authenticateHybrid,
    requireAdmin,
    apiLimiter,
    validateSchema,
                          checkAiUsage,
    requireAiEnv,
    requirePaymentEnv,
  });

  return httpServer;
}
