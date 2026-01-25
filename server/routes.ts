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
import fs from 'fs';
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
import { setupGoogleAuth } from './googleAuth';
import passport from 'passport';
import {
  authenticateToken,
  authenticateHybrid,
  requireAdmin,
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isValidPassword,
  generateUserId,
  verifyToken,
  AuthRequest,
} from './auth';
import { checkAiUsage, getUserAiUsageStats } from './middleware/checkAiUsage';
import { requirePaymentEnv, requireAiEnv, getEnvStatus } from './middleware/envCheck';
import {
  insertExperienceSchema,
  insertPostSchema,
  insertCommentSchema,
  insertBookingSchema,
  insertTripSchema,
  insertTimelineSchema,
  insertNotificationSchema,
  insertMiniMeetSchema,
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
  LoginSchema,
  RegisterSchema,
  OnboardingSchema,
  CreatePostSchema,
  CreateTimelineSchema,
  CreateEventSchema,
  CreateBookingSchema,
  SendMessageSchema,
  FollowUserSchema,
  UpdateBookingStatusSchema,
  CreateConversationSchema,
  UpdateProfileOpenSchema,
  PortfolioModeSchema,
  CreateMiniMeetSchema,
  JoinMiniMeetSchema,
  GetMiniMeetsSchema,
  CreateSlotSchema,
  UpdateSlotSchema,
  SlotSearchSchema,
  BulkCreateSlotsSchema,
  UpdateSlotAvailabilitySchema,
  BookingSearchSchema,
  CheckSlotAvailabilitySchema,
} from '@shared/api/schema';

// Rate Limit 설정
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 20, // 분당 최대 20회
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Multer 설정 - 보안 강화된 파일 업로드 처리
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // uploads 디렉터리가 없으면 생성
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // UUID + 원본 확장자로 파일명 생성
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: uploadStorage,
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
  
  // 보안이 강화된 파일 접근 엔드포인트
  app.get('/api/files/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      
      // 파일명 보안 검증
      if (!filename || !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(filename)) {
        return res.status(400).json({ message: '잘못된 파일명입니다.' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
      }
      
      // 파일 전송
      res.sendFile(filePath);
    } catch (error) {
      console.error('파일 접근 오류:', error);
      res.status(500).json({ message: '파일 접근에 실패했습니다.' });
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

  // Google OAuth 설정
  setupGoogleAuth(app);

  // 이메일/비밀번호 회원가입
  app.post('/api/auth/register', authLimiter, validateSchema(RegisterSchema), async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.validatedData;

      // 입력 검증
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: '이메일과 비밀번호는 필수입니다' });
      }

      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({ message: '유효하지 않은 이메일 형식입니다' });
      }

      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
      }

      // 기존 사용자 확인
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 이메일입니다' });
      }

      // 비밀번호 해싱
      const hashedPassword = await hashPassword(password);

      // 사용자 생성
      const user = await storage.createUser({
        id: generateUserId(),
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        authProvider: 'email',
        isEmailVerified: true, // 실제 프로덕션에서는 이메일 인증 구현
      });

      // JWT 토큰 생성
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

  // 이메일/비밀번호 로그인
  app.post('/api/auth/login', authLimiter, validateSchema(LoginSchema), async (req: any, res) => {
    try {
      const { email, password } = req.validatedData;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: '이메일과 비밀번호를 입력해주세요' });
      }

      // 사용자 조회
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res
          .status(401)
          .json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
      }

      // 비밀번호 확인
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
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

  // 데모 로그인 - TEST 계정으로 비밀번호 없이 로그인
  // 현재 사용자 정보 조회 (하이브리드 인증)
  app.get('/api/auth/me', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // 사용자 정보 조회
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

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

  app.post('/api/auth/demo-login', authLimiter, async (req, res) => {
    try {
      // TEST 사용자 조회
      const user = await storage.getUser('TEST');
      if (!user) {
        return res
          .status(404)
          .json({ message: '데모 계정을 찾을 수 없습니다' });
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


  // 사용자 조회
  app.get('/api/auth/user', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
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

  // JWT 토큰 생성 엔드포인트 (세션 인증된 사용자용)
  app.post('/api/auth/generate-token', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // JWT 토큰 생성
      const token = generateToken({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role || 'user'
      });

      console.log(`[TOKEN-GEN] JWT 토큰 생성: ${req.user.email}`);
      res.json({ token });
    } catch (error) {
      console.error('토큰 생성 오류:', error);
      res.status(500).json({ message: 'Failed to generate token' });
    }
  });

  // 온보딩 완료
  app.post('/api/auth/onboarding', authenticateHybrid, validateSchema(OnboardingSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { userType, interests, languages, timezone } = req.validatedData as {
        userType?: 'traveler' | 'influencer' | 'host';
        interests: string[];
        languages: string[];
        timezone: string;
      };

      // userType이 없으면 기본값 'traveler' 사용
      const finalUserType = userType || 'traveler';

      // 사용자 정보 업데이트
      const updatedUser = await storage.updateUser(req.user.id, {
        userType: finalUserType,
        interests,
        languages,
        timezone,
        onboardingCompleted: true
      });

      console.log(`[ONBOARDING] 사용자 ${req.user.email} 온보딩 완료: ${finalUserType}`);
      
      res.json({
        message: '온보딩이 완료되었습니다',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          userType: updatedUser.userType,
          interests: updatedUser.interests,
          languages: updatedUser.languages,
          timezone: updatedUser.timezone,
          onboardingCompleted: updatedUser.onboardingCompleted
        }
      });
    } catch (error) {
      console.error('온보딩 오류:', error);
      res.status(500).json({ message: '온보딩 중 오류가 발생했습니다' });
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

        const uploadedFiles = await Promise.all(req.files.map(async (file: any) => {
          const fileInfo: any = {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: `/api/files/${file.filename}`,
          };

          if (file.mimetype.startsWith('image/')) {
            try {
              const filePath = path.join(process.cwd(), 'uploads', file.filename);
              const exifData = await exifr.parse(filePath, {
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
              console.log(`EXIF extraction skipped for ${file.filename}:`, exifError);
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

        const imageUrl = `/api/files/${req.file.filename}`;
        
        console.log('[Upload Image] 이미지 업로드 성공:', {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: imageUrl
        });

        res.json({ 
          success: true,
          imageUrl: imageUrl,
          filename: req.file.filename
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
      const configs = await storage.getAllSystemConfigs(category);
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
      const updates = req.body;
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
  app.get('/api/conversations', authenticateToken, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get(
    '/api/conversations/:id/messages',
    authenticateToken,
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

  // Notification routes
  app.get('/api/notifications', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });

  app.patch('/api/notifications/:id/read', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id!);
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/read-all', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  app.delete('/api/notifications/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id!);
      const success = await storage.deleteNotification(notificationId);
      if (success) {
        res.json({ message: 'Notification deleted' });
      } else {
        res.status(404).json({ message: 'Notification not found' });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

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
  
  // 업로드된 파일 접근 - 환경별 처리
  if (process.env.NODE_ENV === 'production') {
    // 프로덕션: 인증된 사용자만 파일 접근 가능
    app.get('/uploads/:fileName', authenticateToken, async (req: any, res) => {
      try {
        const { fileName } = req.params;
        
        // 파일명 보안 검증 (directory traversal 공격 방지)
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
          return res.status(400).json({ error: '잘못된 파일명입니다.' });
        }
        
        const filePath = path.join(process.cwd(), 'uploads', fileName);
        
        // 파일 존재 확인
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
        }
        
        // 파일 전송
        res.sendFile(filePath);
      } catch (error) {
        console.error('파일 접근 오류:', error);
        res.status(500).json({ error: '파일 접근 중 오류가 발생했습니다.' });
      }
    });
  } else {
    // 개발 환경: 기존 정적 서빙 유지
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  }

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

  // Follow/Following API
  app.post('/api/users/:id/follow', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.user?.id;

      if (!followerId || !followingId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
      }

      if (followerId === followingId) {
        return res.status(400).json({ message: '자기 자신을 팔로우할 수 없습니다' });
      }

      // 이미 팔로우 중인지 확인
      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: '이미 팔로우 중입니다' });
      }

      await storage.followUser(followerId, followingId);

      // 팔로우 알림 생성
      const follower = await storage.getUser(followerId);
      if (follower) {
        const notification = await storage.createNotification({
          userId: followingId,
          type: 'follow',
          title: '새로운 팔로워',
          message: `${follower.firstName || follower.email}님이 회원님을 팔로우하기 시작했습니다.`,
          relatedUserId: followerId,
        });

        // 실시간 알림 전송
        const sendNotificationToUser = (app as any).sendNotificationToUser;
        if (sendNotificationToUser) {
          sendNotificationToUser(followingId, notification);
        }
      }

      res.status(200).json({ message: '팔로우 완료' });
    } catch (error) {
      console.error('Follow error:', error);
      res.status(500).json({ message: '팔로우 중 오류가 발생했습니다' });
    }
  });

  app.delete('/api/users/:id/follow', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const followingId = req.params.id;
      const followerId = req.user?.id;

      if (!followerId || !followingId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
      }

      await storage.unfollowUser(followerId, followingId);
      res.status(200).json({ message: '언팔로우 완료' });
    } catch (error) {
      console.error('Unfollow error:', error);
      res.status(500).json({ message: '언팔로우 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/following-status', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user?.id;

      if (!currentUserId || !targetUserId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
      }

      const isFollowing = await storage.isFollowing(currentUserId, targetUserId);
      res.json({ isFollowing });
    } catch (error) {
      console.error('Following status error:', error);
      res.status(500).json({ message: '팔로우 상태 조회 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/followers', async (req, res) => {
    try {
      const userId = req.params.id;
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({ message: '팔로워 조회 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/following', async (req, res) => {
    try {
      const userId = req.params.id;
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ message: '팔로잉 조회 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/follow-counts', async (req, res) => {
    try {
      const userId = req.params.id;
      const counts = await storage.getFollowCounts(userId);
      res.json(counts);
    } catch (error) {
      console.error('Get follow counts error:', error);
      res.status(500).json({ message: '팔로우 개수 조회 중 오류가 발생했습니다' });
    }
  });

  // MiniMeet 관련 API
  // 모임 생성 (별칭: /api/meets)
  const createMeetHandler = async (req: any, res: any) => {
    try {
      const userId = req.user!.id;
      
      const meetData = {
        ...req.validatedData,
        latitude: req.validatedData.latitude.toString(),
        longitude: req.validatedData.longitude.toString(),
        hostId: userId,
        startAt: new Date(req.validatedData.startAt),
      };

      const validatedData = insertMiniMeetSchema.parse(meetData);
      const miniMeet = await storage.createMiniMeet(validatedData);

      // 생성된 모임 정보와 호스트 정보 함께 반환
      const meetWithHost = await storage.getMiniMeetById(miniMeet.id);
      
      res.status(201).json(meetWithHost);
    } catch (error) {
      console.error('모임 생성 오류:', error);
      res.status(400).json({
        message: '모임 생성에 실패했습니다',
        error: (error as Error).message,
      });
    }
  };
  
  app.post('/api/mini-meets', authenticateToken, apiLimiter, validateSchema(CreateMiniMeetSchema), createMeetHandler);
  app.post('/api/meets', authenticateToken, apiLimiter, validateSchema(CreateMiniMeetSchema), createMeetHandler);

  // 근처 모임 조회 (별칭: /api/meets와 /api/meets/nearby)
  const getNearbyMeetsHandler = async (req: any, res: any) => {
    try {
      const { lat, lng, latitude, longitude, radius = 5 } = req.query;
      
      // latitude/longitude 또는 lat/lng 모두 지원 (nullish coalescing 사용)
      const finalLat = lat ?? latitude;
      const finalLng = lng ?? longitude;
      
      if (finalLat == null || finalLng == null) {
        return res.status(400).json({ 
          message: '위도와 경도는 필수 입니다' 
        });
      }

      const latNum = parseFloat(String(finalLat));
      const lngNum = parseFloat(String(finalLng));
      const searchRadius = parseFloat(String(radius));

      if (isNaN(latNum) || isNaN(lngNum) || isNaN(searchRadius)) {
        return res.status(400).json({ 
          message: '올바른 숫자 값을 입력해주세요' 
        });
      }

      const miniMeets = await storage.getMiniMeetsNearby(latNum, lngNum, searchRadius);
      res.json(miniMeets);
    } catch (error) {
      console.error('근처 모임 조회 오류:', error);
      res.status(500).json({ message: '근처 모임 조회에 실패했습니다' });
    }
  };
  
  app.get('/api/mini-meets', getNearbyMeetsHandler);
  app.get('/api/meets', getNearbyMeetsHandler);
  app.get('/api/meets/nearby', getNearbyMeetsHandler);

  // 모임 상세 조회 (별칭: /api/meets/:id)
  const getMeetByIdHandler = async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: '올바른 모임 ID를 입력해주세요' });
      }

      const miniMeet = await storage.getMiniMeetById(id);
      
      if (!miniMeet) {
        return res.status(404).json({ message: '모임을 찾을 수 없습니다' });
      }

      res.json(miniMeet);
    } catch (error) {
      console.error('모임 상세 조회 오류:', error);
      res.status(500).json({ message: '모임 상세 조회에 실패했습니다' });
    }
  };
  
  app.get('/api/mini-meets/:id', getMeetByIdHandler);
  app.get('/api/meets/:id', getMeetByIdHandler);

  // 모임 참여 (별칭: /api/meets/:id/join)
  const joinMeetHandler = async (req: any, res: any) => {
    try {
      const userId = req.user!.id;
      const meetId = parseInt(req.params.id);
      
      if (isNaN(meetId)) {
        return res.status(400).json({ message: '올바른 모임 ID를 입력해주세요' });
      }

      // 모임 존재 여부 확인
      const meet = await storage.getMiniMeetById(meetId);
      if (!meet) {
        return res.status(404).json({ message: '모임을 찾을 수 없습니다' });
      }

      // 자신이 호스트인 모임에는 참여할 수 없음
      if (meet.hostId === userId) {
        return res.status(400).json({ message: '자신이 만든 모임에는 참여할 수 없습니다' });
      }

      // 모임 시간이 이미 지났는지 확인
      if (new Date(meet.startAt) <= new Date()) {
        return res.status(400).json({ message: '이미 시작된 모임입니다' });
      }

      const attendee = await storage.joinMiniMeet(meetId, userId);

      // 호스트에게 참가 알림 생성
      const participant = await storage.getUser(userId);
      if (participant && meet.hostId !== userId) {
        const notification = await storage.createNotification({
          userId: meet.hostId,
          type: 'chat', // MiniMeet 관련이므로 chat 타입 사용
          title: 'MiniMeet 참가자',
          message: `${participant.firstName || participant.email}님이 "${meet.title}" 모임에 참가했습니다.`,
          relatedUserId: userId,
        });

        // 실시간 알림 전송
        const sendNotificationToUser = (app as any).sendNotificationToUser;
        if (sendNotificationToUser) {
          sendNotificationToUser(meet.hostId, notification);
        }
      }

      // 참여 후 최신 모임 정보 반환
      const updatedMeet = await storage.getMiniMeetById(meetId);
      
      res.status(201).json({
        message: '모임 참여가 완료되었습니다',
        attendee,
        meet: updatedMeet
      });
    } catch (error) {
      console.error('모임 참여 오류:', error);
      
      if ((error as Error).message.includes('이미 참여한 모임')) {
        return res.status(400).json({ message: '이미 참여한 모임입니다' });
      }
      
      if ((error as Error).message.includes('정원이 가득')) {
        return res.status(400).json({ message: '모임 정원이 가득 찼습니다' });
      }

      res.status(500).json({ message: '모임 참여에 실패했습니다' });
    }
  };
  
  app.post('/api/mini-meets/:id/join', authenticateToken, apiLimiter, joinMeetHandler);
  app.post('/api/meets/:id/join', authenticateToken, apiLimiter, joinMeetHandler);

  // 모임 나가기 (별칭: /api/meets/:id/leave)
  const leaveMeetHandler = async (req: any, res: any) => {
    try {
      const userId = req.user!.id;
      const meetId = parseInt(req.params.id);
      
      if (isNaN(meetId)) {
        return res.status(400).json({ message: '올바른 모임 ID를 입력해주세요' });
      }

      await storage.leaveMiniMeet(meetId, userId);
      
      res.json({ message: '모임에서 나갔습니다' });
    } catch (error) {
      console.error('모임 나가기 오류:', error);
      res.status(500).json({ message: '모임 나가기에 실패했습니다' });
    }
  };
  
  app.delete('/api/mini-meets/:id/leave', authenticateToken, apiLimiter, leaveMeetHandler);
  app.delete('/api/meets/:id/leave', authenticateToken, apiLimiter, leaveMeetHandler);

  // 여행 일정 복제 API
  app.post('/api/trips/:id/clone', authenticateToken, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const tripId = parseInt(req.params.id);
      const { days } = req.query; // days=1-3,5 형식
      
      if (isNaN(tripId)) {
        return res.status(400).json({ message: '올바른 여행 ID를 입력해주세요' });
      }

      // 원본 여행 정보 가져오기
      const originalTrip = await storage.getTripById(tripId);
      if (!originalTrip) {
        return res.status(404).json({ message: '여행을 찾을 수 없습니다' });
      }

      // 선택한 일자 파싱 (예: "1-3,5" → [1,2,3,5])
      let selectedDays: number[] = [];
      if (days) {
        const dayParts = (days as string).split(',');
        for (const part of dayParts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (start && end) {
              for (let i = start; i <= end; i++) {
                selectedDays.push(i);
              }
            }
          } else {
            selectedDays.push(parseInt(part));
          }
        }
      }

      const clonedTrip = await storage.cloneTrip(tripId, userId, selectedDays);
      
      res.status(201).json({
        message: '일정이 성공적으로 복제되었습니다',
        trip: clonedTrip
      });
    } catch (error) {
      console.error('여행 복제 오류:', error);
      res.status(500).json({ message: '일정 복제에 실패했습니다' });
    }
  });

  // 법적 문서 편집 API (관리자 전용)
  app.put('/api/legal/:documentType', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { documentType } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: '올바른 내용을 입력해주세요.' });
      }

      const validDocuments = {
        'privacy': 'privacy_ko.md',
        'terms': 'terms_ko.md', 
        'location': 'location_terms_ko.md',
        'cookies': 'cookie_notice_ko.md',
        'oss': 'oss_licenses_ko.md'
      };

      if (!validDocuments[documentType as keyof typeof validDocuments]) {
        return res.status(400).json({ message: '유효하지 않은 문서 타입입니다.' });
      }

      const fileName = validDocuments[documentType as keyof typeof validDocuments];
      const filePath = path.join(process.cwd(), 'client', 'public', 'legal', fileName);

      // 디렉토리가 존재하지 않으면 생성
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 백업 파일 생성
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + `.backup.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
      }

      // 새 내용 저장
      fs.writeFileSync(filePath, content, 'utf8');

      console.log(`✅ 법적 문서 업데이트 완료: ${documentType} by ${req.user?.email}`);

      res.json({ 
        message: '문서가 성공적으로 업데이트되었습니다.',
        documentType,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ 법적 문서 저장 실패:', error);
      res.status(500).json({ message: '문서 저장 중 오류가 발생했습니다.' });
    }
  });

  // =================== 채널 시스템 API 엔드포인트 ===================
  
  // 채널 생성 (그룹 채팅, 토픽 채널)
  app.post('/api/channels', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { type = 'group', name, description, isPrivate = false } = req.body;
      
      if (!['dm', 'group', 'topic'].includes(type)) {
        return res.status(400).json({ message: '유효하지 않은 채널 타입입니다' });
      }

      const channel = await storage.createChannel({
        type,
        name,
        description,
        ownerId: userId,
        isPrivate,
      });

      res.status(201).json(channel);
    } catch (error) {
      console.error('채널 생성 오류:', error);
      res.status(500).json({ message: '채널 생성 중 오류가 발생했습니다' });
    }
  });

  // 사용자의 채널 목록 조회
  app.get('/api/channels', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const aiConciergeChannel = await storage.getOrCreateAIConciergeChannel(userId);
      const userChannels = await storage.getChannelsByUser(userId);
      
      const allChannels = [aiConciergeChannel, ...userChannels.filter(ch => ch.id !== aiConciergeChannel.id)];
      
      res.json(allChannels);
    } catch (error) {
      console.error('채널 목록 조회 오류:', error);
      res.status(500).json({ message: '채널 목록 조회 중 오류가 발생했습니다' });
    }
  });

  // 특정 채널 정보 조회
  app.get('/api/channels/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const channel = await storage.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({ message: '채널을 찾을 수 없습니다' });
      }

      // 채널 멤버인지 확인
      const members = await storage.getChannelMembers(channelId);
      const isMember = members.some(m => m.userId === userId);
      
      if (!isMember && channel.isPrivate) {
        return res.status(403).json({ message: '이 채널에 접근할 권한이 없습니다' });
      }

      res.json({ ...channel, members });
    } catch (error) {
      console.error('채널 조회 오류:', error);
      res.status(500).json({ message: '채널 조회 중 오류가 발생했습니다' });
    }
  });

  // 채널에 멤버 추가
  app.post('/api/channels/:id/members', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const { targetUserId, role = 'member' } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // 채널 존재 확인
      const channel = await storage.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({ message: '채널을 찾을 수 없습니다' });
      }

      // 권한 확인 (채널 소유자 또는 관리자만)
      const members = await storage.getChannelMembers(channelId);
      const requesterMember = members.find(m => m.userId === userId);
      
      if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
        return res.status(403).json({ message: '멤버를 추가할 권한이 없습니다' });
      }

      const newMember = await storage.addChannelMember(channelId, targetUserId, role);
      res.status(201).json(newMember);
    } catch (error) {
      console.error('채널 멤버 추가 오류:', error);
      res.status(500).json({ message: '채널 멤버 추가 중 오류가 발생했습니다' });
    }
  });

  // 채널에서 멤버 제거
  app.delete('/api/channels/:id/members/:userId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const targetUserId = req.params.userId;
      
      if (!requesterId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // 채널 존재 확인
      const channel = await storage.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({ message: '채널을 찾을 수 없습니다' });
      }

      // 자신을 나가는 경우는 항상 허용
      if (requesterId !== targetUserId) {
        // 다른 사람을 내보내는 경우 권한 확인
        const members = await storage.getChannelMembers(channelId);
        const requesterMember = members.find(m => m.userId === requesterId);
        
        if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
          return res.status(403).json({ message: '멤버를 제거할 권한이 없습니다' });
        }
      }

      await storage.removeChannelMember(channelId, targetUserId!);
      res.json({ message: '멤버가 제거되었습니다' });
    } catch (error) {
      console.error('채널 멤버 제거 오류:', error);
      res.status(500).json({ message: '채널 멤버 제거 중 오류가 발생했습니다' });
    }
  });

  // 채널 메시지 목록 조회
  app.get('/api/channels/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // 채널 멤버인지 확인
      const members = await storage.getChannelMembers(channelId);
      const isMember = members.some(m => m.userId === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: '이 채널의 메시지를 볼 권한이 없습니다' });
      }

      const messages = await storage.getMessagesByChannel(channelId, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error('채널 메시지 조회 오류:', error);
      res.status(500).json({ message: '채널 메시지 조회 중 오류가 발생했습니다' });
    }
  });

  // 채널에 메시지 전송
  app.post('/api/channels/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const { content, messageType = 'text', parentMessageId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: '메시지 내용이 필요합니다' });
      }

      // 채널 멤버인지 확인
      const members = await storage.getChannelMembers(channelId);
      const isMember = members.some(m => m.userId === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: '이 채널에 메시지를 보낼 권한이 없습니다' });
      }

      const message = await storage.createChannelMessage({
        channelId,
        senderId: userId,
        content: content.trim(),
        messageType,
        parentMessageId,
      } as any);

      // WebSocket으로 실시간 전송
      const wsClients = (app as any).wsClients as Map<string, any>;
      if (wsClients) {
        for (const member of members) {
          if (member.userId !== userId) { // 발신자 제외
            const memberWs = wsClients.get(member.userId);
            if (memberWs && memberWs.readyState === 1) { // WebSocket.OPEN
              memberWs.send(JSON.stringify({
                type: 'channel_message',
                channelId,
                message,
              }));
            }
          }
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error('채널 메시지 전송 오류:', error);
      res.status(500).json({ message: '채널 메시지 전송 중 오류가 발생했습니다' });
    }
  });

  // 스레드 메시지 조회
  app.get('/api/messages/:id/thread', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const parentMessageId = parseInt(req.params.id!);
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const threadMessages = await storage.getThreadMessages(parentMessageId);
      res.json(threadMessages);
    } catch (error) {
      console.error('스레드 메시지 조회 오류:', error);
      res.status(500).json({ message: '스레드 메시지 조회 중 오류가 발생했습니다' });
    }
  });

  // 테스트용 JWT 토큰 생성 엔드포인트 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/test/create-token', async (req, res) => {
      try {
        const { sub, email, first_name, last_name, role, userType } = req.body;
        
        if (!sub || !email) {
          return res.status(400).json({ message: 'sub and email are required' });
        }

        // 테스트 사용자 생성/업데이트
        const userId = sub;
        const userRole = (role === 'admin') ? 'admin' : 'user';
        const validUserTypes = ['traveler', 'influencer', 'host'];
        const resolvedUserType = validUserTypes.includes(userType) ? userType : 'traveler';
        
        const testUser = {
          id: userId,
          email,
          firstName: first_name || 'Test',
          lastName: last_name || 'User', 
          role: userRole as 'admin' | 'user',
          userType: resolvedUserType as 'traveler' | 'influencer' | 'host',
          profileImageUrl: null,
          bio: null,
          location: null,
          isProfileOpen: true,
        };

        await storage.upsertUser(testUser);

        // JWT 토큰 생성
        const token = generateToken({
          id: userId,
          email,
          role: userRole,
        });

        console.log(`[TEST TOKEN] Created ${userRole} token for ${email} (${userId})`);

        res.json({ 
          token,
          user: testUser,
          message: `Test ${userRole} token created successfully` 
        });
      } catch (error) {
        console.error('Error creating test token:', error);
        res.status(500).json({ message: 'Failed to create test token' });
      }
    });
  }

  // 호스트 신청 API (심사 대기 상태로 설정)
  app.post('/api/user/apply-host', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const userId = req.user.id;
      
      // 이미 호스트인 경우
      const currentUser = await storage.getUser(userId);
      if (currentUser?.isHost) {
        return res.status(400).json({ message: 'Already a host' });
      }
      
      // 이미 신청 대기중인 경우
      if (currentUser?.hostStatus === 'pending') {
        return res.status(400).json({ message: 'Application already pending' });
      }

      // 심사 대기 상태로 설정 (isHost는 false 유지)
      const updates = { hostStatus: 'pending' };
      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`[HOST-APPLY] User ${req.user.email} applied for host (pending review)`);
      res.json({ 
        message: '호스트 신청이 완료되었습니다! 관리자 심사 후 승인됩니다.',
        user: updatedUser,
        hostStatus: 'pending'
      });
    } catch (error) {
      console.error('Error applying for host:', error);
      res.status(500).json({ message: 'Failed to apply for host' });
    }
  });

  // 호스트 신청 상태 조회 API
  app.get('/api/user/host-status', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        isHost: user.isHost,
        hostStatus: user.hostStatus || null
      });
    } catch (error) {
      console.error('Error fetching host status:', error);
      res.status(500).json({ message: 'Failed to fetch host status' });
    }
  });

  // 관리자: 호스트 신청 목록 조회
  app.get('/api/admin/host-applications', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = req.query;
      const filterStatus = status === 'all' ? undefined : (status as string) || 'pending';
      
      const applications = await storage.getHostApplications(filterStatus);
      
      res.json(applications);
    } catch (error) {
      console.error('Error fetching host applications:', error);
      res.status(500).json({ message: 'Failed to fetch host applications' });
    }
  });

  // 관리자: 호스트 신청 승인
  app.patch('/api/admin/host-applications/:userId/approve', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.hostStatus !== 'pending') {
        return res.status(400).json({ message: 'Application is not pending' });
      }

      const updatedUser = await storage.updateUser(userId, {
        hostStatus: 'approved',
        isHost: true,
        userType: 'host'
      });

      console.log(`[HOST-APPROVE] Admin ${req.user?.email} approved host application for user ${userId}`);
      res.json({ 
        message: '호스트 신청이 승인되었습니다.',
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error approving host application:', error);
      res.status(500).json({ message: 'Failed to approve host application' });
    }
  });

  // 관리자: 호스트 신청 거절
  app.patch('/api/admin/host-applications/:userId/reject', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.hostStatus !== 'pending') {
        return res.status(400).json({ message: 'Application is not pending' });
      }

      const updatedUser = await storage.updateUser(userId, {
        hostStatus: 'rejected'
      });

      console.log(`[HOST-REJECT] Admin ${req.user?.email} rejected host application for user ${userId}. Reason: ${reason || 'No reason provided'}`);
      res.json({ 
        message: '호스트 신청이 거절되었습니다.',
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error rejecting host application:', error);
      res.status(500).json({ message: 'Failed to reject host application' });
    }
  });

  // 후기 작성 API
  app.post('/api/reviews', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: req.user.id,
      });

      const review = await storage.createReview(reviewData);
      
      console.log(`[REVIEW] User ${req.user.email} created review for experience ${(reviewData as any).experienceId}`);
      res.json(review);
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Failed to create review' });
    }
  });

  // 후기 조회 API (경험별)
  app.get('/api/experiences/:id/reviews', async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const reviews = await storage.getReviewsByExperience(experienceId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  // ========== 구매대행 서비스 API ==========

  // 구매대행 서비스 목록 조회 (shopping 카테고리 경험들)
  app.get('/api/shopping-services', async (req, res) => {
    try {
      const services = await storage.getShoppingServices();
      res.json(services);
    } catch (error) {
      console.error('Error fetching shopping services:', error);
      res.status(500).json({ message: 'Failed to fetch shopping services' });
    }
  });

  // 구매 요청 생성
  app.post('/api/purchase-requests', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestData = insertPurchaseRequestSchema.parse({
        ...req.body,
        buyerId: req.user.id,
      });

      const request = await storage.createPurchaseRequest(requestData);
      
      console.log(`[PURCHASE-REQUEST] User ${req.user.email} created purchase request for service ${requestData.serviceId}`);
      res.json(request);
    } catch (error) {
      console.error('Error creating purchase request:', error);
      res.status(500).json({ message: 'Failed to create purchase request' });
    }
  });

  // 구매 요청 조회 (구매자)
  app.get('/api/purchase-requests/buyer', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requests = await storage.getPurchaseRequestsByBuyer(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching buyer purchase requests:', error);
      res.status(500).json({ message: 'Failed to fetch purchase requests' });
    }
  });

  // 구매 요청 조회 (판매자)
  app.get('/api/purchase-requests/seller', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requests = await storage.getPurchaseRequestsBySeller(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching seller purchase requests:', error);
      res.status(500).json({ message: 'Failed to fetch purchase requests' });
    }
  });

  // 구매 요청 상세 조회
  app.get('/api/purchase-requests/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }
      
      const request = await storage.getPurchaseRequestById(requestId);
      
      if (!request) {
        return res.status(404).json({ message: 'Purchase request not found' });
      }

      // 구매자 또는 판매자만 조회 가능
      if (request.buyerId !== req.user.id && request.sellerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(request);
    } catch (error) {
      console.error('Error fetching purchase request:', error);
      res.status(500).json({ message: 'Failed to fetch purchase request' });
    }
  });

  // 견적 생성
  app.post('/api/purchase-quotes', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const quoteData = insertPurchaseQuoteSchema.parse({
        ...req.body,
        sellerId: req.user.id,
      });

      const quote = await storage.createPurchaseQuote(quoteData);
      
      console.log(`[PURCHASE-QUOTE] User ${req.user.email} created quote for request ${quoteData.requestId}`);
      res.json(quote);
    } catch (error) {
      console.error('Error creating purchase quote:', error);
      res.status(500).json({ message: 'Failed to create purchase quote' });
    }
  });

  // 견적 조회 (요청별)
  app.get('/api/purchase-requests/:id/quotes', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }
      
      const quotes = await storage.getPurchaseQuotesByRequest(requestId);
      res.json(quotes);
    } catch (error) {
      console.error('Error fetching purchase quotes:', error);
      res.status(500).json({ message: 'Failed to fetch purchase quotes' });
    }
  });

  // 주문 생성 (견적 수락)
  app.post('/api/purchase-orders', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orderData = insertPurchaseOrderSchema.parse({
        ...req.body,
        buyerId: req.user.id,
        orderNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      const order = await storage.createPurchaseOrder(orderData);
      
      console.log(`[PURCHASE-ORDER] User ${req.user.email} created order ${orderData.orderNumber}`);
      res.json(order);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({ message: 'Failed to create purchase order' });
    }
  });

  // 주문 조회 (구매자)
  app.get('/api/purchase-orders/buyer', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orders = await storage.getPurchaseOrdersByBuyer(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching buyer purchase orders:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // 주문 조회 (판매자)
  app.get('/api/purchase-orders/seller', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orders = await storage.getPurchaseOrdersBySeller(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching seller purchase orders:', error);
      res.status(500).json({ message: 'Failed to fetch purchase orders' });
    }
  });

  // 주문 상태 업데이트
  app.patch('/api/purchase-orders/:id/status', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const orderIdParam = req.params.id;
      if (!orderIdParam) {
        return res.status(400).json({ message: 'Order ID is required' });
      }
      
      const orderId = parseInt(orderIdParam);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'Valid order ID is required' });
      }
      
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const order = await storage.updatePurchaseOrderStatus(orderId, status);
      
      if (!order) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }

      console.log(`[PURCHASE-ORDER-UPDATE] Order ${orderId} status updated to ${status}`);
      res.json(order);
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      res.status(500).json({ message: 'Failed to update purchase order status' });
    }
  });

  // ==================== 여행자 도움 요청 시스템 API ====================

  // 도움 요청 생성
  app.post('/api/requests/create', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestData = insertHelpRequestSchema.parse({
        ...req.body,
        requesterId: req.user.id,
      });

      const helpRequest = await storage.createHelpRequest(requestData);
      
      console.log(`[HELP-REQUEST] User ${req.user.email} created help request: ${helpRequest.title}`);
      res.json(helpRequest);
    } catch (error) {
      console.error('Error creating help request:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid request data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create help request' });
      }
    }
  });

  // 내가 생성한 도움 요청들 조회
  app.get('/api/requests/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requests = await storage.getHelpRequestsByRequester(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching user help requests:', error);
      res.status(500).json({ message: 'Failed to fetch help requests' });
    }
  });

  // 특정 도움 요청 상세 조회
  app.get('/api/requests/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }

      const request = await storage.getHelpRequestById(requestId);
      
      if (!request) {
        return res.status(404).json({ message: 'Help request not found' });
      }

      // 요청자만 자신의 요청을 볼 수 있음 (추후 다른 사용자도 볼 수 있도록 확장 가능)
      if (request.requesterId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      console.log(`[HELP-REQUEST] User ${req.user.email} viewed help request: ${request.title}`);
      res.json(request);
    } catch (error) {
      console.error('Error fetching help request:', error);
      res.status(500).json({ message: 'Failed to fetch help request' });
    }
  });

  // 특정 도움 요청에 대한 응답들 조회
  app.get('/api/requests/:id/responses', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }

      // 요청이 존재하는지 확인하고 접근 권한 체크
      const request = await storage.getHelpRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Help request not found' });
      }

      // 요청 작성자만 응답을 조회할 수 있도록 제한 (나중에 필요시 확장)
      if (request.requesterId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const responses = await storage.getHelpResponsesByRequest(requestId);
      res.json(responses);
    } catch (error) {
      console.error('Error fetching help request responses:', error);
      res.status(500).json({ message: 'Failed to fetch responses' });
    }
  });

  // 도움 요청에 응답하기
  app.post('/api/requests/:id/respond', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const requestIdParam = req.params.id;
      if (!requestIdParam) {
        return res.status(400).json({ message: 'Request ID is required' });
      }
      
      const requestId = parseInt(requestIdParam);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: 'Valid request ID is required' });
      }

      // 요청이 존재하는지 확인
      const request = await storage.getHelpRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Help request not found' });
      }

      // 자신의 요청에는 응답할 수 없도록 제한
      if (request.requesterId === req.user.id) {
        return res.status(400).json({ message: 'Cannot respond to your own request' });
      }

      const responseData = insertRequestResponseSchema.parse({
        ...req.body,
        requestId: requestId,
        responderId: req.user.id,
      });

      const response = await storage.createHelpResponse(responseData);
      
      console.log(`[HELP-RESPONSE] User ${req.user.email} responded to request ${requestId}`);
      res.json(response);
    } catch (error) {
      console.error('Error creating help response:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid response data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create response' });
      }
    }
  });

  // ==================== 인플루언서 서비스 템플릿 API ====================

  // 서비스 템플릿 생성
  app.post('/api/templates/create', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templateData = insertServiceTemplateSchema.parse({
        ...req.body,
        creatorId: req.user.id,
      });

      const template = await storage.createServiceTemplate(templateData);
      
      console.log(`[SERVICE-TEMPLATE] User ${req.user.email} created template: ${template.title}`);
      res.json(template);
    } catch (error) {
      console.error('Error creating service template:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid template data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create service template' });
      }
    }
  });

  // 내가 생성한 서비스 템플릿들 조회
  app.get('/api/templates/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templates = await storage.getServiceTemplatesByCreator(req.user.id);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching user templates:', error);
      res.status(500).json({ message: 'Failed to fetch service templates' });
    }
  });

  // 활성 서비스 템플릿들 조회 (공개 목록)
  app.get('/api/templates', async (req, res) => {
    try {
      const templateType = req.query.type as string | undefined;
      const templates = await storage.getActiveServiceTemplates(templateType);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching active templates:', error);
      res.status(500).json({ message: 'Failed to fetch service templates' });
    }
  });

  // 특정 서비스 템플릿 상세 조회
  app.get('/api/templates/:id', async (req, res) => {
    try {
      const templateIdParam = req.params.id;
      if (!templateIdParam) {
        return res.status(400).json({ message: 'Template ID is required' });
      }
      
      const templateId = parseInt(templateIdParam);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Valid template ID is required' });
      }

      const template = await storage.getServiceTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: 'Service template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error fetching service template:', error);
      res.status(500).json({ message: 'Failed to fetch service template' });
    }
  });

  // 서비스 템플릿 업데이트
  app.put('/api/templates/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templateIdParam = req.params.id;
      if (!templateIdParam) {
        return res.status(400).json({ message: 'Template ID is required' });
      }
      
      const templateId = parseInt(templateIdParam);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Valid template ID is required' });
      }

      // 템플릿 소유자 확인
      const existingTemplate = await storage.getServiceTemplateById(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Service template not found' });
      }

      if (existingTemplate.creatorId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your template' });
      }

      const updateData = insertServiceTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateServiceTemplate(templateId, updateData as any);

      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Failed to update template' });
      }
      
      console.log(`[SERVICE-TEMPLATE] User ${req.user.email} updated template: ${updatedTemplate.title}`);
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating service template:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ message: 'Invalid template data', error: error.message });
      } else {
        res.status(500).json({ message: 'Failed to update service template' });
      }
    }
  });

  // 서비스 템플릿 삭제
  app.delete('/api/templates/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const templateIdParam = req.params.id;
      if (!templateIdParam) {
        return res.status(400).json({ message: 'Template ID is required' });
      }
      
      const templateId = parseInt(templateIdParam);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Valid template ID is required' });
      }

      // 템플릿 소유자 확인
      const existingTemplate = await storage.getServiceTemplateById(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Service template not found' });
      }

      if (existingTemplate.creatorId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your template' });
      }

      const deleted = await storage.deleteServiceTemplate(templateId);
      if (!deleted) {
        return res.status(404).json({ message: 'Failed to delete template' });
      }
      
      console.log(`[SERVICE-TEMPLATE] User ${req.user.email} deleted template: ${existingTemplate.title}`);
      res.json({ message: 'Service template deleted successfully' });
    } catch (error) {
      console.error('Error deleting service template:', error);
      res.status(500).json({ message: 'Failed to delete service template' });
    }
  });

  // ==================== 로컬 가이드 슬롯 관리 API ====================
  // 슬롯 생성
  app.post('/api/slots/create', authenticateHybrid, validateSchema(CreateSlotSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotData = {
        ...req.body,
        hostId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const slot = await storage.createSlot(slotData);
      console.log(`[SLOT] User ${req.user.email} created slot: ${slot.title} on ${slot.date}`);
      res.status(201).json(slot);
    } catch (error) {
      console.error('Error creating slot:', error);
      res.status(500).json({ message: 'Failed to create slot' });
    }
  });

  // 내 슬롯 목록 조회
  app.get('/api/slots/my', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slots = await storage.getSlotsByHost(req.user.id);
      res.json(slots);
    } catch (error) {
      console.error('Error fetching user slots:', error);
      res.status(500).json({ message: 'Failed to fetch slots' });
    }
  });

  // 슬롯 검색 (더 구체적인 라우트를 먼저 배치)
  app.get('/api/slots/search', validateSchema(SlotSearchSchema), async (req, res) => {
    try {
      const filters = req.query as any;
      const slots = await storage.searchSlots(filters);
      res.json(slots);
    } catch (error) {
      console.error('Error searching slots:', error);
      res.status(500).json({ message: 'Failed to search slots' });
    }
  });

  // 특정 슬롯 조회
  app.get('/api/slots/:id', async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      const slot = await storage.getSlotById(slotId);
      if (!slot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      res.json(slot);
    } catch (error) {
      console.error('Error fetching slot:', error);
      res.status(500).json({ message: 'Failed to fetch slot' });
    }
  });

  // 슬롯 업데이트
  app.put('/api/slots/:id', authenticateHybrid, validateSchema(UpdateSlotSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const existingSlot = await storage.getSlotById(slotId);
      if (!existingSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (existingSlot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const updated = await storage.updateSlot(slotId, req.body);
      if (updated) {
        console.log(`[SLOT] User ${req.user.email || req.user.id} updated slot: ${updated.title}`);
        res.json(updated);
      } else {
        res.status(500).json({ message: 'Failed to update slot' });
      }
    } catch (error) {
      console.error('Error updating slot:', error);
      res.status(500).json({ message: 'Failed to update slot' });
    }
  });

  // 슬롯 삭제
  app.delete('/api/slots/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const existingSlot = await storage.getSlotById(slotId);
      if (!existingSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (existingSlot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const deleted = await storage.deleteSlot(slotId);
      if (!deleted) {
        return res.status(404).json({ message: 'Failed to delete slot' });
      }
      
      console.log(`[SLOT] User ${req.user.email || req.user.id} deleted slot: ${existingSlot.title}`);
      res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
      console.error('Error deleting slot:', error);
      res.status(500).json({ message: 'Failed to delete slot' });
    }
  });


  // 벌크 슬롯 생성
  app.post('/api/slots/bulk-create', authenticateHybrid, validateSchema(BulkCreateSlotsSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { template, dates } = req.body;
      const slotTemplate = {
        ...template,
        hostId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const slots = await storage.bulkCreateSlots(slotTemplate, dates);
      console.log(`[SLOT] User ${req.user.email} created ${slots.length} slots in bulk`);
      res.status(201).json(slots);
    } catch (error) {
      console.error('Error creating bulk slots:', error);
      res.status(500).json({ message: 'Failed to create bulk slots' });
    }
  });

  // 슬롯 가용성 업데이트
  app.patch('/api/slots/:id/availability', authenticateHybrid, validateSchema(UpdateSlotAvailabilitySchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const existingSlot = await storage.getSlotById(slotId);
      if (!existingSlot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (existingSlot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const { isAvailable, reason } = req.body;
      const updated = await storage.updateSlotAvailability(slotId, isAvailable, reason);
      
      if (updated) {
        console.log(`[SLOT] User ${req.user.email || req.user.id} updated slot availability: ${updated.title} -> ${isAvailable ? 'available' : 'unavailable'}`);
        res.json(updated);
      } else {
        res.status(500).json({ message: 'Failed to update slot availability' });
      }
    } catch (error) {
      console.error('Error updating slot availability:', error);
      res.status(500).json({ message: 'Failed to update slot availability' });
    }
  });

  // 가용한 슬롯 조회
  app.get('/api/slots/available/:hostId', async (req, res) => {
    try {
      const { hostId } = req.params;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const slots = await storage.getAvailableSlots(hostId, startDate, endDate);
      res.json(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      res.status(500).json({ message: 'Failed to fetch available slots' });
    }
  });

  // ==================== 예약 관리 API ====================
  
  // 새 예약 생성
  app.post('/api/bookings', authenticateHybrid, validateSchema(CreateBookingSchema), async (req: AuthRequest, res) => {
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

      const bookingData = {
        ...req.body,
        guestId
      };

      const booking = await storage.createBooking(bookingData);
      
      // 호스트에게 알림 생성 및 WebSocket 브로드캐스트
      try {
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
    } catch (error: any) {
      console.error('Error creating booking:', error);
      if (error.message.includes('슬롯을 찾을 수 없습니다') || error.message.includes('충분한 자리가 없습니다')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  // 특정 예약 조회
  app.get('/api/bookings/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: 'Valid booking ID is required' });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // 접근 권한 확인 (예약자 또는 호스트만)
      if (booking.guestId !== req.user.id && booking.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(booking);
    } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ message: 'Failed to fetch booking' });
    }
  });

  // 사용자 예약 목록 조회 (게스트 또는 호스트 역할별)
  app.get('/api/bookings', authenticateHybrid, validateSchema(BookingSearchSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const filters = {
        ...req.query,
        userId: req.user.id
      } as any;

      const bookings = await storage.searchBookings(filters);
      res.json(bookings);
    } catch (error) {
      console.error('Error searching bookings:', error);
      res.status(500).json({ message: 'Failed to search bookings' });
    }
  });

  // 예약 상태 업데이트 (호스트 전용)
  app.patch('/api/bookings/:id/status', authenticateHybrid, validateSchema(UpdateBookingStatusSchema), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: 'Valid booking ID is required' });
      }

      // 예약 존재 및 권한 확인
      const existingBooking = await storage.getBookingById(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // 호스트만 상태 변경 가능 (게스트는 취소만 가능)
      const { status, cancelReason } = req.body;
      if (status === 'cancelled' && existingBooking.guestId === req.user.id) {
        // 게스트가 취소하는 경우
      } else if (existingBooking.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - only host can update booking status' });
      }

      const updatedBooking = await storage.updateBookingStatus(bookingId, status, cancelReason);
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  });

  // 슬롯 예약 가능성 확인
  app.get('/api/slots/:id/availability', validateSchema(CheckSlotAvailabilitySchema), async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      const { participants } = req.query as any;
      const participantCount = parseInt(participants) || 1;

      const availability = await storage.checkSlotAvailability(slotId, participantCount);
      res.json(availability);
    } catch (error) {
      console.error('Error checking slot availability:', error);
      res.status(500).json({ message: 'Failed to check slot availability' });
    }
  });

  // 특정 슬롯의 예약 목록 조회 (호스트 전용)
  app.get('/api/slots/:id/bookings', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const slotId = parseInt(req.params.id);
      if (isNaN(slotId)) {
        return res.status(400).json({ message: 'Valid slot ID is required' });
      }

      // 슬롯 소유자 확인
      const slot = await storage.getSlotById(slotId);
      if (!slot) {
        return res.status(404).json({ message: 'Slot not found' });
      }

      if (slot.hostId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not your slot' });
      }

      const bookings = await storage.getBookingsBySlot(slotId);
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching slot bookings:', error);
      res.status(500).json({ message: 'Failed to fetch slot bookings' });
    }
  });

  // Translation API endpoints
  app.get('/api/translation/status', (req, res) => {
    res.json({
      enabled: isTranslationEnabled(),
      maxLength: 500,
    });
  });

  app.post('/api/messages/:messageId/translate', authenticateHybrid, checkAiUsage('translation'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const messageId = parseInt(req.params.messageId);
      const { targetLanguage } = req.body;

      if (isNaN(messageId)) {
        return res.status(400).json({ message: 'Valid message ID is required' });
      }

      if (!targetLanguage) {
        return res.status(400).json({ message: 'Target language is required' });
      }

      if (!isTranslationEnabled()) {
        return res.status(503).json({ message: 'Translation service not available' });
      }

      // Get the message
      const message = await storage.getMessageById(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Check if translation already exists in cache
      const cachedTranslation = await storage.getTranslation(messageId, targetLanguage);
      if (cachedTranslation) {
        return res.json({
          translatedText: cachedTranslation.translatedText,
          cached: true,
        });
      }

      // Translate the message
      const result = await translateText(message.content, targetLanguage);

      // Save the detected language if not already set
      if (result.detectedSourceLanguage && !message.detectedLanguage) {
        await storage.updateMessageLanguage(messageId, result.detectedSourceLanguage);
      }

      // Cache the translation
      await storage.createTranslation({
        messageId,
        targetLanguage,
        translatedText: result.translatedText,
      });

      res.json({
        translatedText: result.translatedText,
        cached: false,
      });
    } catch (error: any) {
      console.error('Translation error:', error);
      
      if (error.message === 'QUOTA_EXCEEDED') {
        return res.status(429).json({ message: 'Translation quota exceeded. Please try again later.' });
      }
      
      res.status(500).json({ message: 'Translation failed' });
    }
  });

  app.put('/api/user/preferred-language', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { language } = req.body;

      if (!language) {
        return res.status(400).json({ message: 'Language is required' });
      }

      const validLanguages = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ message: 'Invalid language code' });
      }

      await storage.updateUserPreferredLanguage(req.user.id, language);

      res.json({ message: 'Preferred language updated successfully' });
    } catch (error) {
      console.error('Error updating preferred language:', error);
      res.status(500).json({ message: 'Failed to update preferred language' });
    }
  });

  // AI Concierge API endpoints
  app.get('/api/ai/concierge/status', (req, res) => {
    res.json({
      enabled: isConciergeEnabled(),
    });
  });

  app.post('/api/ai/concierge/message', authenticateToken, requireAiEnv, checkAiUsage('ai_message'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { message: userMessage, channelId } = req.body;

      if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }

      if (!channelId || isNaN(parseInt(channelId))) {
        return res.status(400).json({ message: 'Valid channel ID is required' });
      }

      if (!isConciergeEnabled()) {
        return res.status(503).json({ message: 'AI Concierge service not available' });
      }

      const userId = req.user.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const nearbyExperiences = await storage.getNearbyExperiences(userId);
      const recentPosts = await storage.getRecentPostsByUser(userId);
      const upcomingSlots = user.location 
        ? await storage.getUpcomingSlotsByLocation(user.location) 
        : [];

      const context: ConciergeContext = {
        userId,
        userProfile: {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          location: user.location || undefined,
          interests: user.interests || undefined,
          languages: user.languages || undefined,
          preferredLanguage: user.preferredLanguage || 'en',
          timezone: user.timezone || undefined,
        },
        nearbyExperiences: nearbyExperiences.map(exp => ({
          id: exp.id,
          title: exp.title,
          category: exp.category,
          location: exp.location,
          price: `${exp.price} ${exp.currency}`,
        })),
        recentPosts: recentPosts.map(post => ({
          id: post.id,
          title: post.title || undefined,
          location: post.location || undefined,
          theme: post.theme || undefined,
        })),
        upcomingSlots: upcomingSlots.map(slot => ({
          id: slot.id,
          title: slot.title || 'Untitled',
          date: slot.date,
          category: slot.category || 'general',
        })),
      };

      const previousMessages = await storage.getMessagesByChannel(parseInt(channelId), 10);
      const conversationHistory = previousMessages
        .filter(msg => msg.senderId === userId || msg.senderId === null)
        .map(msg => ({
          role: msg.senderId === userId ? 'user' : 'assistant',
          content: msg.content,
        }));

      const aiResponse = await generateConciergeResponse(
        userMessage.trim(),
        context,
        conversationHistory
      );

      const aiMessage = await storage.createChannelMessage({
        channelId: parseInt(channelId),
        senderId: null,
        content: aiResponse,
        messageType: 'text',
      });

      res.json({
        message: aiMessage,
        aiResponse,
      });
    } catch (error: any) {
      console.error('AI Concierge error:', error);
      
      if (error.message?.includes('OpenAI API')) {
        return res.status(503).json({ message: 'AI service temporarily unavailable' });
      }
      
      res.status(500).json({ message: 'Failed to get AI response' });
    }
  });

  // Mini Concierge API endpoints
  app.get('/api/mini-concierge/status', (req, res) => {
    res.json({
      enabled: isMiniConciergeEnabled(),
    });
  });

  app.post('/api/mini-concierge/generate', authenticateToken, requireAiEnv, checkAiUsage('concierge'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!isMiniConciergeEnabled()) {
        return res.status(503).json({ message: 'Mini Concierge service not available' });
      }

      const { location, timeMinutes, budgetLevel, mood, companions } = req.body;

      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return res.status(400).json({ message: 'Valid location is required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const context: MiniPlanContext = {
        userId: req.user.id,
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        timeMinutes: timeMinutes || 60,
        budgetLevel: budgetLevel || 'mid',
        mood: mood || 'anything',
        companions: companions || 'solo',
        userLanguage: user.preferredLanguage || 'en',
      };

      const result = await generateMiniPlans(context);

      const savedPlans = [];
      for (const plan of result.plans) {
        const newPlan = await storage.createMiniPlan({
          userId: req.user.id,
          title: plan.title,
          summary: plan.summary,
          estimatedDurationMin: plan.estimatedDurationMin,
          estimatedDistanceM: plan.estimatedDistanceM,
          tags: plan.tags,
        });

        const spotsToInsert = plan.spots.map((spot, idx) => ({
          miniPlanId: newPlan.id,
          orderIndex: idx,
          poiId: spot.poiId,
          name: spot.name,
          latitude: spot.lat.toString(),
          longitude: spot.lng.toString(),
          stayMin: spot.stayMin,
          metaJson: {
            reason: spot.reason,
            recommendedMenu: spot.recommendedMenu,
            priceRange: spot.priceRange,
            photoHint: spot.photoHint,
            expectedPrice: spot.expectedPrice,
          },
        }));

        const spots = await storage.createMiniPlanSpots(spotsToInsert);

        savedPlans.push({
          ...newPlan,
          spots,
        });
      }

      res.json({
        plans: savedPlans,
      });
    } catch (error: any) {
      console.error('Mini Concierge generate error:', error);
      
      // Handle OpenAI API errors
      if (error.message?.includes('OpenAI API')) {
        return res.status(503).json({ 
          message: 'AI service temporarily unavailable',
          error: 'SERVICE_UNAVAILABLE',
        });
      }
      
      // Handle validation errors (malformed AI response)
      if (error.message?.includes('Invalid response') || 
          error.message?.includes('Invalid plan') || 
          error.message?.includes('Invalid spot') ||
          error.message?.includes('expected 3')) {
        return res.status(502).json({ 
          message: 'Failed to generate valid plans. Please try again.',
          error: 'VALIDATION_FAILED',
          details: error.message,
        });
      }
      
      // Handle other errors
      res.status(500).json({ 
        message: 'Failed to generate mini plans',
        error: 'INTERNAL_ERROR',
      });
    }
  });

  app.get('/api/mini-concierge/plans', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const plans = await storage.getMiniPlansByUser(req.user.id, limit);

      res.json({ plans });
    } catch (error) {
      console.error('Error fetching mini plans:', error);
      res.status(500).json({ message: 'Failed to fetch mini plans' });
    }
  });

  app.get('/api/mini-concierge/plans/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const planId = parseInt(req.params.id!);
      if (isNaN(planId)) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const plan = await storage.getMiniPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const checkins = await storage.getCheckinsByPlan(planId);

      res.json({ 
        plan,
        checkins,
      });
    } catch (error) {
      console.error('Error fetching mini plan:', error);
      res.status(500).json({ message: 'Failed to fetch mini plan' });
    }
  });

  app.post('/api/mini-concierge/plans/:id/start', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const planId = parseInt(req.params.id!);
      if (isNaN(planId)) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const plan = await storage.getMiniPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updated = await storage.startMiniPlan(planId);
      
      res.json({ plan: updated });
    } catch (error) {
      console.error('Error starting mini plan:', error);
      res.status(500).json({ message: 'Failed to start mini plan' });
    }
  });

  app.post('/api/mini-concierge/plans/:id/complete', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const planId = parseInt(req.params.id!);
      if (isNaN(planId)) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const plan = await storage.getMiniPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updated = await storage.completeMiniPlan(planId);
      
      res.json({ plan: updated });
    } catch (error) {
      console.error('Error completing mini plan:', error);
      res.status(500).json({ message: 'Failed to complete mini plan' });
    }
  });

  app.post('/api/mini-concierge/spots/:spotId/checkin', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const spotId = parseInt(req.params.spotId!);
      if (isNaN(spotId)) {
        return res.status(400).json({ message: 'Invalid spot ID' });
      }

      const { planId, photos, notes } = req.body;

      if (!planId || isNaN(parseInt(planId))) {
        return res.status(400).json({ message: 'Valid plan ID is required' });
      }

      const plan = await storage.getMiniPlanById(parseInt(planId));
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const checkin = await storage.checkInSpot({
        miniPlanId: parseInt(planId),
        spotId: spotId,
        userId: req.user.id,
        photos: photos || [],
        notes: notes || null,
      });

      res.json({ checkin });
    } catch (error) {
      console.error('Error checking in spot:', error);
      res.status(500).json({ message: 'Failed to check in spot' });
    }
  });

  // CineMap API routes
  app.get('/api/timelines/:id/media', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const timelineId = parseInt(req.params.id!);
      if (isNaN(timelineId)) {
        return res.status(400).json({ message: 'Invalid timeline ID' });
      }

      const timeline = await storage.getTimelineWithPosts(timelineId);
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      const postsWithMedia = await Promise.all(
        (timeline.posts || []).map(async (post) => {
          const media = await storage.getPostMediaByPostId(post.id);
          return { ...post, media };
        })
      );

      res.json({
        timeline,
        posts: postsWithMedia,
      });
    } catch (error) {
      console.error('Error fetching timeline media:', error);
      res.status(500).json({ message: 'Failed to fetch timeline media' });
    }
  });

  app.post('/api/cinemap/jobs', authenticateToken, requireAiEnv, checkAiUsage('ai_message'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { timelineId, config } = req.body;

      if (!timelineId || isNaN(parseInt(timelineId))) {
        return res.status(400).json({ message: 'Valid timeline ID is required' });
      }

      const timeline = await storage.getTimelineById(parseInt(timelineId));
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      if (timeline.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not timeline owner' });
      }

      // Create job as 'pending'
      const job = await storage.createCinemapJob({
        userId: req.user.id,
        timelineId: parseInt(timelineId),
        status: 'pending',
      });

      // Respond immediately with pending job
      res.status(201).json({ job });

      // Process storyboard generation asynchronously
      (async () => {
        try {
          console.log(`[CineMap] Starting storyboard generation for job ${job.id}, timeline ${timelineId}`);
          
          // Update status to processing
          await storage.updateCinemapJob(job.id, { status: 'processing' });

          // Fetch timeline with all media
          const timelineWithPosts = await storage.getTimelineWithPosts(parseInt(timelineId));
          if (!timelineWithPosts || !timelineWithPosts.posts) {
            throw new Error('Timeline has no posts');
          }

          // Collect all media with EXIF data from all posts
          const allPhotos: PhotoWithExif[] = [];
          for (const post of timelineWithPosts.posts) {
            const media = await storage.getPostMediaByPostId(post.id);
            for (const m of media) {
              if (m.exifDatetime && m.exifLatitude && m.exifLongitude) {
                allPhotos.push({
                  id: m.id,
                  url: m.url,
                  datetime: new Date(m.exifDatetime),
                  latitude: parseFloat(m.exifLatitude),
                  longitude: parseFloat(m.exifLongitude),
                  metadata: m.exifMetadata,
                });
              }
            }
          }

          if (allPhotos.length === 0) {
            throw new Error('No photos with EXIF data found in timeline');
          }

          console.log(`[CineMap] Found ${allPhotos.length} photos with EXIF data`);

          // Generate storyboard using AI
          const storyboard = await generateStoryboard(
            timeline.title,
            allPhotos,
            req.user.preferredLanguage || 'en'
          );

          console.log(`[CineMap] Storyboard generated successfully for job ${job.id}`);

          // Update job with completed storyboard
          await storage.updateCinemapJob(job.id, {
            status: 'completed',
            storyboard: storyboard as any,
            // resultVideoUrl would be set by actual video rendering service
            resultVideoUrl: null, // Placeholder - actual video rendering not implemented yet
          });

          console.log(`[CineMap] Job ${job.id} completed successfully`);
        } catch (error: any) {
          console.error(`[CineMap] Error generating storyboard for job ${job.id}:`, error);
          await storage.updateCinemapJob(job.id, {
            status: 'failed',
            errorMessage: error.message || 'Failed to generate storyboard',
          });
        }
      })();

    } catch (error) {
      console.error('Error creating CineMap job:', error);
      res.status(500).json({ message: 'Failed to create CineMap job' });
    }
  });

  app.get('/api/cinemap/jobs/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const jobId = parseInt(req.params.id!);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      const job = await storage.getCinemapJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ job });
    } catch (error) {
      console.error('Error fetching CineMap job:', error);
      res.status(500).json({ message: 'Failed to fetch CineMap job' });
    }
  });

  app.get('/api/cinemap/jobs/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const userId = req.params.userId!;
      if (userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const jobs = await storage.getCinemapJobsByUser(userId);
      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching user CineMap jobs:', error);
      res.status(500).json({ message: 'Failed to fetch user CineMap jobs' });
    }
  });

  app.get('/api/cinemap/jobs/timeline/:timelineId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const timelineId = parseInt(req.params.timelineId!);
      if (isNaN(timelineId)) {
        return res.status(400).json({ message: 'Invalid timeline ID' });
      }

      const timeline = await storage.getTimelineById(timelineId);
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      if (timeline.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const jobs = await storage.getCinemapJobsByTimeline(timelineId);
      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching timeline CineMap jobs:', error);
      res.status(500).json({ message: 'Failed to fetch timeline CineMap jobs' });
    }
  });

  // 예약 시스템 자동화 작업 API (내부 시스템 전용 - 인증 필요)
  app.post('/api/admin/process-expired-bookings', authenticateToken, async (req: any, res) => {
    // 관리자 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const processedCount = await storage.processExpiredBookings();
      res.json({ 
        message: `Processed ${processedCount} expired bookings`,
        processedCount 
      });
    } catch (error) {
      console.error('Error processing expired bookings:', error);
      res.status(500).json({ message: 'Failed to process expired bookings' });
    }
  });

  app.post('/api/admin/process-completed-experiences', authenticateToken, async (req: any, res) => {
    // 관리자 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const processedCount = await storage.processCompletedExperiences();
      res.json({ 
        message: `Processed ${processedCount} completed experiences`,
        processedCount 
      });
    } catch (error) {
      console.error('Error processing completed experiences:', error);
      res.status(500).json({ message: 'Failed to process completed experiences' });
    }
  });

  app.post('/api/admin/recalculate-slot-availability', authenticateToken, async (req: any, res) => {
    // 관리자 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const { slotId } = req.body;
      await storage.recalculateSlotAvailability(slotId);
      res.json({ 
        message: slotId 
          ? `Recalculated availability for slot ${slotId}`
          : 'Recalculated availability for all slots'
      });
    } catch (error) {
      console.error('Error recalculating slot availability:', error);
      res.status(500).json({ message: 'Failed to recalculate slot availability' });
    }
  });

  // AI Model Configuration Test Endpoint
  app.get('/api/admin/ai-models', (req, res) => {
    res.json({
      cinemap: {
        CINEMAP_AI_MODEL: process.env.CINEMAP_AI_MODEL || 'not set',
        AI_MODEL: process.env.AI_MODEL || 'not set',
        effectiveModel: process.env.CINEMAP_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest'
      },
      miniConcierge: {
        MINI_CONCIERGE_AI_MODEL: process.env.MINI_CONCIERGE_AI_MODEL || 'not set',
        AI_MODEL: process.env.AI_MODEL || 'not set',
        effectiveModel: process.env.MINI_CONCIERGE_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest'
      },
      concierge: {
        CONCIERGE_AI_MODEL: process.env.CONCIERGE_AI_MODEL || 'not set',
        AI_MODEL: process.env.AI_MODEL || 'not set',
        effectiveModel: process.env.CONCIERGE_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest'
      }
    });
  });

  // ============================================
  // Serendipity Protocol API Routes
  // ============================================

  // 위치 업데이트 (serendipity 매칭을 위한)
  app.put('/api/serendipity/location', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
      }

      await storage.updateUser(req.user.id, {
        lastLatitude: latitude.toString(),
        lastLongitude: longitude.toString(),
        lastLocationUpdatedAt: new Date(),
      });

      res.json({ message: 'Location updated' });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  // Serendipity 설정 토글
  app.put('/api/serendipity/toggle', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'Enabled must be a boolean' });
      }

      await storage.updateUser(req.user.id, {
        serendipityEnabled: enabled,
      });

      res.json({ message: `Serendipity ${enabled ? 'enabled' : 'disabled'}`, enabled });
    } catch (error) {
      console.error('Error toggling serendipity:', error);
      res.status(500).json({ message: 'Failed to toggle serendipity' });
    }
  });

  // 근접 매칭 확인 (같은 플랜 or 유사 태그)
  app.post('/api/serendipity/check', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { latitude, longitude, planId, tags, radiusM = 150 } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Location is required' });
      }

      // 위치 업데이트
      await storage.updateUser(req.user.id, {
        lastLatitude: latitude.toString(),
        lastLongitude: longitude.toString(),
        lastLocationUpdatedAt: new Date(),
      });

      let nearbyUsers: any[] = [];

      // 같은 플랜을 선택한 근처 사용자 찾기
      if (planId) {
        nearbyUsers = await storage.findNearbyUsersWithSamePlan(
          planId,
          req.user.id,
          latitude,
          longitude,
          radiusM
        );
      }

      // 유사 태그를 가진 근처 사용자 찾기
      if (tags && tags.length > 0 && nearbyUsers.length === 0) {
        nearbyUsers = await storage.findNearbyUsersWithSimilarTags(
          tags,
          req.user.id,
          latitude,
          longitude,
          radiusM
        );
      }

      // 근처에 매칭 가능한 사용자가 있으면 퀘스트 제안
      if (nearbyUsers.length > 0) {
        // 이미 활성 퀘스트가 있는지 확인
        const existingQuests = await storage.getActiveQuests(latitude, longitude, radiusM);
        const userInQuest = existingQuests.some(q => 
          q.status === 'active' || q.status === 'in_progress'
        );

        if (!userInQuest) {
          // 퀘스트 템플릿 선택 (랜덤)
          const questTemplates = [
            {
              title: '야경 인생샷 3컷 미션',
              description: '근처 여행자와 함께 서로 한 장씩 사진을 찍어주세요.',
              durationMin: 5,
              rewardType: 'highlight',
              rewardDetail: '공동 하이라이트 클립 자동 생성',
              requiredActions: [{ type: 'photo_upload', count: 2, note: '각자 1장 이상 업로드' }],
            },
            {
              title: '숨은 맛집 공유 미션',
              description: '서로의 추천 메뉴를 한 개씩 추천해보세요.',
              durationMin: 3,
              rewardType: 'badge',
              rewardDetail: '로컬 푸드 탐험가 뱃지',
              requiredActions: [{ type: 'recommendation', count: 1, note: '메뉴 추천' }],
            },
            {
              title: '포토스팟 교환 미션',
              description: '서로가 발견한 좋은 사진 스팟을 공유해보세요.',
              durationMin: 5,
              rewardType: 'highlight',
              rewardDetail: '공동 포토 하이라이트',
              requiredActions: [{ type: 'location_share', count: 1, note: '포토스팟 위치 공유' }],
            },
          ];

          const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];

          // 새 퀘스트 생성
          const newQuest = await storage.createQuest({
            type: 'serendipity',
            title: template.title,
            description: template.description,
            durationMin: template.durationMin,
            rewardType: template.rewardType,
            rewardDetail: template.rewardDetail,
            requiredActions: template.requiredActions,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            radiusM,
            status: 'active',
            matchedMiniPlanId: planId || null,
            matchedTags: tags || null,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10분 후 만료
          });

          // 현재 사용자를 참가자로 추가 (초대 상태)
          await storage.addQuestParticipant({
            questId: newQuest.id,
            userId: req.user.id,
            status: 'invited',
          });

          // 근처 사용자들도 초대
          for (const nearbyUser of nearbyUsers.slice(0, 3)) { // 최대 3명
            await storage.addQuestParticipant({
              questId: newQuest.id,
              userId: nearbyUser.id,
              status: 'invited',
            });

            // 알림 생성
            await storage.createNotification({
              userId: nearbyUser.id,
              type: 'serendipity',
              title: '🍀 근처에 비슷한 여행자 발견!',
              message: `${template.title} - 참여하시겠습니까?`,
              relatedUserId: req.user.id,
            });
          }

          return res.json({
            matched: true,
            quest: newQuest,
            nearbyUsers: nearbyUsers.map(u => ({
              id: u.id,
              firstName: u.firstName,
              profileImageUrl: u.profileImageUrl,
            })),
          });
        }
      }

      res.json({ matched: false, nearbyUsers: [] });
    } catch (error) {
      console.error('Error checking serendipity:', error);
      res.status(500).json({ message: 'Failed to check serendipity' });
    }
  });

  // 퀘스트 수락
  app.post('/api/serendipity/quest/:questId/accept', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      const quest = await storage.getQuestById(questId);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }

      if (quest.status === 'expired' || quest.status === 'cancelled') {
        return res.status(400).json({ message: 'Quest is no longer available' });
      }

      // 참가자 상태 업데이트
      const participant = await storage.updateQuestParticipantStatus(
        questId,
        req.user.id,
        'accepted'
      );

      if (!participant) {
        return res.status(400).json({ message: 'You are not invited to this quest' });
      }

      // 모든 참가자가 수락했는지 확인
      const allParticipants = await storage.getQuestParticipants(questId);
      const allAccepted = allParticipants.every(p => p.status === 'accepted');

      if (allAccepted && allParticipants.length >= 2) {
        // 퀘스트 시작
        await storage.updateQuestStatus(questId, 'in_progress');
      }

      res.json({ message: 'Quest accepted', participant, quest });
    } catch (error) {
      console.error('Error accepting quest:', error);
      res.status(500).json({ message: 'Failed to accept quest' });
    }
  });

  // 퀘스트 거절
  app.post('/api/serendipity/quest/:questId/decline', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      await storage.updateQuestParticipantStatus(questId, req.user.id, 'declined');

      res.json({ message: 'Quest declined' });
    } catch (error) {
      console.error('Error declining quest:', error);
      res.status(500).json({ message: 'Failed to decline quest' });
    }
  });

  // 퀘스트 완료 (결과 제출)
  app.post('/api/serendipity/quest/:questId/complete', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      const { photos, notes } = req.body;

      const quest = await storage.getQuestById(questId);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }

      // 참가자 결과 업데이트
      const participant = await storage.updateQuestParticipantStatus(
        questId,
        req.user.id,
        'completed',
        { photos: photos || [], notes: notes || '' }
      );

      if (!participant) {
        return res.status(400).json({ message: 'You are not part of this quest' });
      }

      // 모든 참가자가 완료했는지 확인
      const allParticipants = await storage.getQuestParticipants(questId);
      const allCompleted = allParticipants.every(p => p.status === 'completed');

      if (allCompleted) {
        // 퀘스트 완료 및 하이라이트 생성
        await storage.updateQuestStatus(questId, 'completed');

        // 공동 하이라이트 생성
        const allPhotos = allParticipants.flatMap(p => {
          const result = p.resultJson as any;
          return result?.photos || [];
        });

        if (allPhotos.length > 0) {
          await storage.createQuestHighlight({
            questId,
            highlightMediaUrl: allPhotos[0], // 첫 번째 사진을 대표로
            thumbnailUrl: allPhotos[0],
            metaJson: {
              participants: allParticipants.map(p => ({
                id: p.userId,
                firstName: p.user?.firstName,
              })),
              photos: allPhotos,
              location: { lat: quest.latitude, lng: quest.longitude },
            },
          });
        }

        // 참가자들에게 알림
        for (const p of allParticipants) {
          await storage.createNotification({
            userId: p.userId,
            type: 'serendipity',
            title: '🎉 퀘스트 완료!',
            message: `${quest.title} 미션을 성공적으로 완료했습니다!`,
          });
        }
      }

      res.json({ 
        message: allCompleted ? 'Quest completed! Highlight created.' : 'Your result submitted',
        completed: allCompleted,
        participant 
      });
    } catch (error) {
      console.error('Error completing quest:', error);
      res.status(500).json({ message: 'Failed to complete quest' });
    }
  });

  // 내 퀘스트 목록
  app.get('/api/serendipity/quests', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const quests = await storage.getQuestsByUser(req.user.id);
      res.json({ quests });
    } catch (error) {
      console.error('Error fetching quests:', error);
      res.status(500).json({ message: 'Failed to fetch quests' });
    }
  });

  // 퀘스트 상세
  app.get('/api/serendipity/quest/:questId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      const quest = await storage.getQuestById(questId);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }

      const participants = await storage.getQuestParticipants(questId);
      const highlights = await storage.getQuestHighlights(questId);

      res.json({ quest, participants, highlights });
    } catch (error) {
      console.error('Error fetching quest:', error);
      res.status(500).json({ message: 'Failed to fetch quest' });
    }
  });

  // 퀘스트 하이라이트 조회
  app.get('/api/serendipity/highlights', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const quests = await storage.getQuestsByUser(req.user.id);
      const highlights: any[] = [];

      for (const quest of quests) {
        if (quest.status === 'completed') {
          const questHighlights = await storage.getQuestHighlights(quest.id);
          highlights.push(...questHighlights.map(h => ({
            ...h,
            quest: { id: quest.id, title: quest.title },
          })));
        }
      }

      res.json({ highlights });
    } catch (error) {
      console.error('Error fetching highlights:', error);
      res.status(500).json({ message: 'Failed to fetch highlights' });
    }
  });

  // ==========================================
  // POI (Point of Interest) API 엔드포인트
  // ==========================================

  // POI 카테고리 및 타입 조회 (번역 포함)
  app.get('/api/poi/categories', async (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'en';
      const categories = await storage.getPoiCategoriesWithTypes(lang);
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching POI categories:', error);
      res.status(500).json({ message: 'Failed to fetch POI categories' });
    }
  });

  // POI 초기 데이터 시딩 (한 번만 실행)
  app.post('/api/poi/seed', async (req, res) => {
    try {
      // 이미 데이터가 있는지 확인
      const existingCount = await storage.getPoiCategoryCount();
      if (existingCount > 0) {
        return res.json({ message: 'POI data already seeded', count: existingCount });
      }

      // POI 카테고리 정의 (8개 대분류 + 만남활성화/세렌디피티)
      const categoryData = [
        { code: 'food_drink', icon: '🍽️', sortOrder: 1, isActive: true, isSystem: false },
        { code: 'lodging', icon: '🏨', sortOrder: 2, isActive: true, isSystem: false },
        { code: 'culture', icon: '🎭', sortOrder: 3, isActive: true, isSystem: false },
        { code: 'shopping', icon: '🛍️', sortOrder: 4, isActive: true, isSystem: false },
        { code: 'transport', icon: '🚇', sortOrder: 5, isActive: true, isSystem: false },
        { code: 'nature', icon: '🌳', sortOrder: 6, isActive: true, isSystem: false },
        { code: 'utilities', icon: '💊', sortOrder: 7, isActive: true, isSystem: false },
        { code: 'open_to_meet', icon: '👋', sortOrder: 8, isActive: true, isSystem: true },
        { code: 'serendipity', icon: '✨', sortOrder: 9, isActive: true, isSystem: true },
      ];

      const categories = await storage.bulkInsertPoiCategories(categoryData);
      const categoryMap = Object.fromEntries(categories.map(c => [c.code, c.id]));

      // POI 타입 정의 (Google Places API 타입 매핑)
      const typeData = [
        // 음식 & 음료
        { categoryId: categoryMap['food_drink'], code: 'restaurant', googlePlaceType: 'restaurant', icon: '🍽️', sortOrder: 1 },
        { categoryId: categoryMap['food_drink'], code: 'cafe', googlePlaceType: 'cafe', icon: '☕', sortOrder: 2 },
        { categoryId: categoryMap['food_drink'], code: 'bar', googlePlaceType: 'bar', icon: '🍺', sortOrder: 3 },
        { categoryId: categoryMap['food_drink'], code: 'bakery', googlePlaceType: 'bakery', icon: '🥐', sortOrder: 4 },
        // 숙박
        { categoryId: categoryMap['lodging'], code: 'hotel', googlePlaceType: 'lodging', icon: '🏨', sortOrder: 1 },
        { categoryId: categoryMap['lodging'], code: 'guesthouse', googlePlaceType: 'lodging', icon: '🏠', sortOrder: 2 },
        // 문화 & 엔터테인먼트
        { categoryId: categoryMap['culture'], code: 'tourist_attraction', googlePlaceType: 'tourist_attraction', icon: '🏛️', sortOrder: 1 },
        { categoryId: categoryMap['culture'], code: 'museum', googlePlaceType: 'museum', icon: '🏛️', sortOrder: 2 },
        { categoryId: categoryMap['culture'], code: 'art_gallery', googlePlaceType: 'art_gallery', icon: '🎨', sortOrder: 3 },
        { categoryId: categoryMap['culture'], code: 'movie_theater', googlePlaceType: 'movie_theater', icon: '🎬', sortOrder: 4 },
        { categoryId: categoryMap['culture'], code: 'amusement_park', googlePlaceType: 'amusement_park', icon: '🎢', sortOrder: 5 },
        // 쇼핑
        { categoryId: categoryMap['shopping'], code: 'shopping_mall', googlePlaceType: 'shopping_mall', icon: '🛒', sortOrder: 1 },
        { categoryId: categoryMap['shopping'], code: 'department_store', googlePlaceType: 'department_store', icon: '🏬', sortOrder: 2 },
        { categoryId: categoryMap['shopping'], code: 'store', googlePlaceType: 'store', icon: '🏪', sortOrder: 3 },
        // 교통
        { categoryId: categoryMap['transport'], code: 'train_station', googlePlaceType: 'train_station', icon: '🚆', sortOrder: 1 },
        { categoryId: categoryMap['transport'], code: 'bus_station', googlePlaceType: 'bus_station', icon: '🚌', sortOrder: 2 },
        { categoryId: categoryMap['transport'], code: 'airport', googlePlaceType: 'airport', icon: '✈️', sortOrder: 3 },
        { categoryId: categoryMap['transport'], code: 'subway_station', googlePlaceType: 'subway_station', icon: '🚇', sortOrder: 4 },
        // 자연 & 야외
        { categoryId: categoryMap['nature'], code: 'park', googlePlaceType: 'park', icon: '🌳', sortOrder: 1 },
        { categoryId: categoryMap['nature'], code: 'natural_feature', googlePlaceType: 'natural_feature', icon: '🏔️', sortOrder: 2 },
        { categoryId: categoryMap['nature'], code: 'campground', googlePlaceType: 'campground', icon: '⛺', sortOrder: 3 },
        // 편의시설
        { categoryId: categoryMap['utilities'], code: 'pharmacy', googlePlaceType: 'pharmacy', icon: '💊', sortOrder: 1 },
        { categoryId: categoryMap['utilities'], code: 'hospital', googlePlaceType: 'hospital', icon: '🏥', sortOrder: 2 },
        { categoryId: categoryMap['utilities'], code: 'atm', googlePlaceType: 'atm', icon: '🏧', sortOrder: 3 },
        { categoryId: categoryMap['utilities'], code: 'convenience_store', googlePlaceType: 'convenience_store', icon: '🏪', sortOrder: 4 },
        // 만남활성화 (시스템)
        { categoryId: categoryMap['open_to_meet'], code: 'open_users', googlePlaceType: null, icon: '👋', sortOrder: 1 },
        // 세렌디피티 (시스템)
        { categoryId: categoryMap['serendipity'], code: 'serendipity_users', googlePlaceType: null, icon: '✨', sortOrder: 1 },
      ];

      const types = await storage.bulkInsertPoiTypes(typeData as any);
      const typeMap = Object.fromEntries(types.map(t => [t.code, t.id]));

      // 6개 언어 번역 데이터
      const languages = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
      const categoryTranslations: { [key: string]: { [lang: string]: { name: string; description?: string } } } = {
        food_drink: {
          en: { name: 'Food & Drink', description: 'Restaurants, cafes, bars, bakeries' },
          ko: { name: '음식 & 음료', description: '레스토랑, 카페, 바, 베이커리' },
          ja: { name: '飲食', description: 'レストラン、カフェ、バー、ベーカリー' },
          zh: { name: '餐饮', description: '餐厅、咖啡馆、酒吧、面包店' },
          fr: { name: 'Nourriture & Boissons', description: 'Restaurants, cafés, bars, boulangeries' },
          es: { name: 'Comida y Bebida', description: 'Restaurantes, cafés, bares, panaderías' },
        },
        lodging: {
          en: { name: 'Lodging', description: 'Hotels, guesthouses, hostels' },
          ko: { name: '숙박', description: '호텔, 게스트하우스, 호스텔' },
          ja: { name: '宿泊', description: 'ホテル、ゲストハウス、ホステル' },
          zh: { name: '住宿', description: '酒店、民宿、青年旅社' },
          fr: { name: 'Hébergement', description: 'Hôtels, maisons d\'hôtes, auberges' },
          es: { name: 'Alojamiento', description: 'Hoteles, casas de huéspedes, hostales' },
        },
        culture: {
          en: { name: 'Culture & Entertainment', description: 'Museums, galleries, theaters, theme parks' },
          ko: { name: '문화 & 엔터테인먼트', description: '박물관, 미술관, 극장, 테마파크' },
          ja: { name: '文化・エンターテイメント', description: '博物館、美術館、劇場、テーマパーク' },
          zh: { name: '文化娱乐', description: '博物馆、画廊、剧院、主题公园' },
          fr: { name: 'Culture & Divertissement', description: 'Musées, galeries, théâtres, parcs' },
          es: { name: 'Cultura y Entretenimiento', description: 'Museos, galerías, teatros, parques' },
        },
        shopping: {
          en: { name: 'Shopping', description: 'Malls, markets, department stores' },
          ko: { name: '쇼핑', description: '쇼핑몰, 시장, 백화점' },
          ja: { name: 'ショッピング', description: 'モール、市場、デパート' },
          zh: { name: '购物', description: '商场、市场、百货公司' },
          fr: { name: 'Shopping', description: 'Centres commerciaux, marchés, grands magasins' },
          es: { name: 'Compras', description: 'Centros comerciales, mercados, grandes almacenes' },
        },
        transport: {
          en: { name: 'Transport', description: 'Train stations, bus terminals, airports, subway' },
          ko: { name: '교통', description: '기차역, 버스터미널, 공항, 지하철역' },
          ja: { name: '交通', description: '駅、バスターミナル、空港、地下鉄' },
          zh: { name: '交通', description: '火车站、汽车站、机场、地铁站' },
          fr: { name: 'Transport', description: 'Gares, terminaux de bus, aéroports, métro' },
          es: { name: 'Transporte', description: 'Estaciones de tren, terminales de bus, aeropuertos, metro' },
        },
        nature: {
          en: { name: 'Nature & Outdoors', description: 'Parks, beaches, mountains, hiking trails' },
          ko: { name: '자연 & 야외', description: '공원, 해변, 산, 하이킹코스' },
          ja: { name: '自然・アウトドア', description: '公園、ビーチ、山、ハイキングコース' },
          zh: { name: '自然户外', description: '公园、海滩、山脉、徒步小径' },
          fr: { name: 'Nature & Plein air', description: 'Parcs, plages, montagnes, sentiers' },
          es: { name: 'Naturaleza y Exterior', description: 'Parques, playas, montañas, senderos' },
        },
        utilities: {
          en: { name: 'Utilities', description: 'Pharmacies, hospitals, ATMs, convenience stores' },
          ko: { name: '편의시설', description: '약국, 병원, ATM, 편의점' },
          ja: { name: '便利施設', description: '薬局、病院、ATM、コンビニ' },
          zh: { name: '便利设施', description: '药店、医院、ATM、便利店' },
          fr: { name: 'Services', description: 'Pharmacies, hôpitaux, distributeurs, épiceries' },
          es: { name: 'Servicios', description: 'Farmacias, hospitales, cajeros, tiendas' },
        },
        open_to_meet: {
          en: { name: 'Open to Meet', description: 'Users available to meet nearby' },
          ko: { name: '만남활성화', description: '근처에서 만남이 가능한 사용자' },
          ja: { name: '会いたい人', description: '近くで会える人' },
          zh: { name: '愿意见面', description: '附近愿意见面的用户' },
          fr: { name: 'Ouvert aux rencontres', description: 'Utilisateurs disponibles à proximité' },
          es: { name: 'Abierto a conocer', description: 'Usuarios disponibles cerca' },
        },
        serendipity: {
          en: { name: 'Serendipity', description: 'Discover unexpected connections' },
          ko: { name: '세렌디피티', description: '예상치 못한 만남을 발견하세요' },
          ja: { name: 'セレンディピティ', description: '予期せぬ出会いを発見' },
          zh: { name: '偶遇', description: '发现意想不到的缘分' },
          fr: { name: 'Sérendipité', description: 'Découvrez des connexions inattendues' },
          es: { name: 'Serendipia', description: 'Descubre conexiones inesperadas' },
        },
      };

      const catTransData: any[] = [];
      for (const [code, translations] of Object.entries(categoryTranslations)) {
        for (const lang of languages) {
          if (translations[lang]) {
            catTransData.push({
              categoryId: categoryMap[code],
              languageCode: lang,
              name: translations[lang].name,
              description: translations[lang].description || null,
            });
          }
        }
      }
      await storage.bulkInsertPoiCategoryTranslations(catTransData);

      // 타입 번역
      const typeTranslations: { [key: string]: { [lang: string]: string } } = {
        restaurant: { en: 'Restaurant', ko: '레스토랑', ja: 'レストラン', zh: '餐厅', fr: 'Restaurant', es: 'Restaurante' },
        cafe: { en: 'Cafe', ko: '카페', ja: 'カフェ', zh: '咖啡馆', fr: 'Café', es: 'Café' },
        bar: { en: 'Bar', ko: '바', ja: 'バー', zh: '酒吧', fr: 'Bar', es: 'Bar' },
        bakery: { en: 'Bakery', ko: '베이커리', ja: 'ベーカリー', zh: '面包店', fr: 'Boulangerie', es: 'Panadería' },
        hotel: { en: 'Hotel', ko: '호텔', ja: 'ホテル', zh: '酒店', fr: 'Hôtel', es: 'Hotel' },
        guesthouse: { en: 'Guesthouse', ko: '게스트하우스', ja: 'ゲストハウス', zh: '民宿', fr: 'Maison d\'hôtes', es: 'Casa de huéspedes' },
        tourist_attraction: { en: 'Tourist Attraction', ko: '관광명소', ja: '観光地', zh: '旅游景点', fr: 'Attraction touristique', es: 'Atracción turística' },
        museum: { en: 'Museum', ko: '박물관', ja: '博物館', zh: '博物馆', fr: 'Musée', es: 'Museo' },
        art_gallery: { en: 'Art Gallery', ko: '미술관', ja: '美術館', zh: '画廊', fr: 'Galerie d\'art', es: 'Galería de arte' },
        movie_theater: { en: 'Movie Theater', ko: '영화관', ja: '映画館', zh: '电影院', fr: 'Cinéma', es: 'Cine' },
        amusement_park: { en: 'Amusement Park', ko: '테마파크', ja: 'テーマパーク', zh: '游乐园', fr: 'Parc d\'attractions', es: 'Parque de atracciones' },
        shopping_mall: { en: 'Shopping Mall', ko: '쇼핑몰', ja: 'ショッピングモール', zh: '购物中心', fr: 'Centre commercial', es: 'Centro comercial' },
        department_store: { en: 'Department Store', ko: '백화점', ja: 'デパート', zh: '百货公司', fr: 'Grand magasin', es: 'Grandes almacenes' },
        store: { en: 'Store', ko: '상점', ja: '店舗', zh: '商店', fr: 'Magasin', es: 'Tienda' },
        train_station: { en: 'Train Station', ko: '기차역', ja: '駅', zh: '火车站', fr: 'Gare', es: 'Estación de tren' },
        bus_station: { en: 'Bus Station', ko: '버스터미널', ja: 'バスターミナル', zh: '汽车站', fr: 'Gare routière', es: 'Estación de autobuses' },
        airport: { en: 'Airport', ko: '공항', ja: '空港', zh: '机场', fr: 'Aéroport', es: 'Aeropuerto' },
        subway_station: { en: 'Subway Station', ko: '지하철역', ja: '地下鉄駅', zh: '地铁站', fr: 'Station de métro', es: 'Estación de metro' },
        park: { en: 'Park', ko: '공원', ja: '公園', zh: '公园', fr: 'Parc', es: 'Parque' },
        natural_feature: { en: 'Natural Feature', ko: '자연명소', ja: '自然', zh: '自然景观', fr: 'Site naturel', es: 'Sitio natural' },
        campground: { en: 'Campground', ko: '캠핑장', ja: 'キャンプ場', zh: '露营地', fr: 'Camping', es: 'Camping' },
        pharmacy: { en: 'Pharmacy', ko: '약국', ja: '薬局', zh: '药店', fr: 'Pharmacie', es: 'Farmacia' },
        hospital: { en: 'Hospital', ko: '병원', ja: '病院', zh: '医院', fr: 'Hôpital', es: 'Hospital' },
        atm: { en: 'ATM', ko: 'ATM', ja: 'ATM', zh: 'ATM', fr: 'Distributeur', es: 'Cajero automático' },
        convenience_store: { en: 'Convenience Store', ko: '편의점', ja: 'コンビニ', zh: '便利店', fr: 'Épicerie', es: 'Tienda de conveniencia' },
        open_users: { en: 'Open Users', ko: '만남가능', ja: '会える人', zh: '可见面', fr: 'Disponibles', es: 'Disponibles' },
        serendipity_users: { en: 'Serendipity', ko: '세렌디피티', ja: 'セレンディピティ', zh: '偶遇', fr: 'Sérendipité', es: 'Serendipia' },
      };

      const typeTransData: any[] = [];
      for (const [code, translations] of Object.entries(typeTranslations)) {
        for (const lang of languages) {
          if (translations[lang] && typeMap[code]) {
            typeTransData.push({
              typeId: typeMap[code],
              languageCode: lang,
              name: translations[lang],
            });
          }
        }
      }
      await storage.bulkInsertPoiTypeTranslations(typeTransData);

      res.json({
        message: 'POI data seeded successfully',
        categories: categories.length,
        types: types.length,
      });
    } catch (error) {
      console.error('Error seeding POI data:', error);
      res.status(500).json({ message: 'Failed to seed POI data' });
    }
  });

  // ==========================================
  // Smart Feed & Hashtag API
  // ==========================================

  // 해시태그 검색 (자동완성)
  app.get('/api/hashtags/search', async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const lang = (req.query.lang as string) || 'en';

      const hashtags = await storage.searchHashtags(query, limit);
      
      const results = await Promise.all(hashtags.map(async (h) => {
        const withTranslation = await storage.getHashtagWithTranslation(h.id, lang);
        return {
          id: h.id,
          name: h.name,
          displayName: withTranslation?.translatedName || h.name,
          postCount: h.postCount,
          followerCount: h.followerCount,
        };
      }));

      res.json(results);
    } catch (error) {
      console.error('Error searching hashtags:', error);
      res.status(500).json({ message: 'Failed to search hashtags' });
    }
  });

  // 트렌딩 해시태그
  app.get('/api/hashtags/trending', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const period = (req.query.period as 'day' | 'week') || 'day';
      const lang = (req.query.lang as string) || 'en';

      const trending = await storage.getTrendingHashtags(limit, period);
      
      const results = await Promise.all(trending.map(async (h) => {
        const withTranslation = await storage.getHashtagWithTranslation(h.id, lang);
        return {
          id: h.id,
          name: h.name,
          displayName: withTranslation?.translatedName || h.name,
          postCount: h.postCount,
          followerCount: h.followerCount,
          growthRate: h.growthRate,
        };
      }));

      res.json(results);
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      res.status(500).json({ message: 'Failed to get trending hashtags' });
    }
  });

  // 해시태그 상세 정보
  app.get('/api/hashtags/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const lang = (req.query.lang as string) || 'en';

      const hashtag = await storage.getHashtagWithTranslation(id, lang);
      if (!hashtag) {
        return res.status(404).json({ message: 'Hashtag not found' });
      }

      res.json({
        id: hashtag.id,
        name: hashtag.name,
        displayName: hashtag.translatedName || hashtag.name,
        postCount: hashtag.postCount,
        followerCount: hashtag.followerCount,
        createdAt: hashtag.createdAt,
      });
    } catch (error) {
      console.error('Error getting hashtag:', error);
      res.status(500).json({ message: 'Failed to get hashtag' });
    }
  });

  // 해시태그별 게시물 조회
  app.get('/api/hashtags/:id/posts', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const posts = await storage.getPostsByHashtag(id, limit, offset);
      res.json(posts);
    } catch (error) {
      console.error('Error getting hashtag posts:', error);
      res.status(500).json({ message: 'Failed to get hashtag posts' });
    }
  });

  // 해시태그 팔로우
  app.post('/api/hashtags/:id/follow', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const hashtagId = parseInt(req.params.id);
      const follow = await storage.followHashtag(userId, hashtagId);
      res.json({ success: true, follow });
    } catch (error) {
      console.error('Error following hashtag:', error);
      res.status(500).json({ message: 'Failed to follow hashtag' });
    }
  });

  // 해시태그 언팔로우
  app.delete('/api/hashtags/:id/follow', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const hashtagId = parseInt(req.params.id);
      await storage.unfollowHashtag(userId, hashtagId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unfollowing hashtag:', error);
      res.status(500).json({ message: 'Failed to unfollow hashtag' });
    }
  });

  // 내가 팔로우한 해시태그 목록
  app.get('/api/me/hashtags', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const lang = (req.query.lang as string) || 'en';
      const followed = await storage.getFollowedHashtags(userId);

      const results = await Promise.all(followed.map(async (f) => {
        const withTranslation = await storage.getHashtagWithTranslation(f.hashtagId, lang);
        return {
          id: f.hashtag.id,
          name: f.hashtag.name,
          displayName: withTranslation?.translatedName || f.hashtag.name,
          postCount: f.hashtag.postCount,
          followedAt: f.createdAt,
        };
      }));

      res.json(results);
    } catch (error) {
      console.error('Error getting followed hashtags:', error);
      res.status(500).json({ message: 'Failed to get followed hashtags' });
    }
  });

  // 게시물 저장 (북마크)
  app.post('/api/posts/:id/save', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const postId = parseInt(req.params.id);
      const save = await storage.savePost(userId, postId);
      res.json({ success: true, save });
    } catch (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ message: 'Failed to save post' });
    }
  });

  // 게시물 저장 취소
  app.delete('/api/posts/:id/save', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const postId = parseInt(req.params.id);
      await storage.unsavePost(userId, postId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unsaving post:', error);
      res.status(500).json({ message: 'Failed to unsave post' });
    }
  });

  // 저장한 게시물 목록
  app.get('/api/me/saved-posts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const posts = await storage.getSavedPosts(userId, limit, offset);
      res.json(posts);
    } catch (error) {
      console.error('Error getting saved posts:', error);
      res.status(500).json({ message: 'Failed to get saved posts' });
    }
  });

  // 스마트 피드 API
  app.get('/api/feed', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId || 'anonymous';
      const mode = (req.query.mode as 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag') || 'smart';
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;
      const latitude = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const longitude = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

      const posts = await storage.getSmartFeed(userId, {
        mode,
        limit,
        offset,
        latitude,
        longitude,
      });

      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const postHashtags = await storage.getPostHashtags(post.id);
        const isSaved = userId !== 'anonymous' ? await storage.isPostSaved(userId, post.id) : false;
        return {
          ...post,
          hashtags: postHashtags.map(ph => ({ id: ph.hashtag.id, name: ph.hashtag.name })),
          isSaved,
        };
      }));

      res.json(enrichedPosts);
    } catch (error) {
      console.error('Error getting smart feed:', error);
      res.status(500).json({ message: 'Failed to get feed' });
    }
  });

  // 피드 설정 조회
  app.get('/api/me/feed-preferences', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const prefs = await storage.getUserFeedPreferences(userId);
      if (!prefs) {
        return res.json({
          preferredMode: 'smart',
          engagementWeight: 0.22,
          affinityWeight: 0.20,
          interestWeight: 0.15,
          hashtagWeight: 0.12,
          locationWeight: 0.12,
          recencyWeight: 0.11,
          velocityWeight: 0.08,
        });
      }
      res.json(prefs);
    } catch (error) {
      console.error('Error getting feed preferences:', error);
      res.status(500).json({ message: 'Failed to get feed preferences' });
    }
  });

  // 피드 설정 업데이트
  app.put('/api/me/feed-preferences', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const prefs = await storage.setUserFeedPreferences({
        userId,
        ...req.body,
      });
      res.json(prefs);
    } catch (error) {
      console.error('Error updating feed preferences:', error);
      res.status(500).json({ message: 'Failed to update feed preferences' });
    }
  });

  // 해시태그 시드 데이터 생성
  app.post('/api/hashtags/seed', async (req: Request, res: Response) => {
    try {
      await storage.seedInitialHashtags();
      res.json({ message: 'Hashtags seeded successfully' });
    } catch (error) {
      console.error('Error seeding hashtags:', error);
      res.status(500).json({ message: 'Failed to seed hashtags' });
    }
  });

  // ==========================================
  // Billing Plans API (Phase 1)
  // ==========================================

  // 빌링 플랜 목록 조회
  app.get('/api/billing/plans', async (req: Request, res: Response) => {
    try {
      const target = req.query.target as 'traveler' | 'host' | undefined;
      const type = req.query.type as 'subscription' | 'one_time' | undefined;
      const lang = (req.query.lang as string) || 'en';
      
      const plans = await storage.getBillingPlans(target, type);
      
      const localizedPlans = plans.map(plan => ({
        ...plan,
        name: (plan as Record<string, unknown>)[`name${lang.charAt(0).toUpperCase()}${lang.slice(1)}` as keyof typeof plan] || plan.name,
        description: (plan as Record<string, unknown>)[`description${lang.charAt(0).toUpperCase()}${lang.slice(1)}` as keyof typeof plan] || plan.description,
      }));
      
      res.json({ plans: localizedPlans });
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      res.status(500).json({ message: 'Failed to fetch billing plans' });
    }
  });

  // 특정 빌링 플랜 조회
  app.get('/api/billing/plans/:id', async (req: Request, res: Response) => {
    try {
      const plan = await storage.getBillingPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      res.json({ plan });
    } catch (error) {
      console.error('Error fetching billing plan:', error);
      res.status(500).json({ message: 'Failed to fetch billing plan' });
    }
  });

  // 빌링 플랜 시드 데이터 생성 (관리자 전용)
  app.post('/api/billing/seed', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { seedBillingPlans } = await import('./services/billingService');
      const result = await seedBillingPlans();
      res.json({ 
        message: 'Billing plans seeded successfully',
        ...result
      });
    } catch (error) {
      console.error('Error seeding billing plans:', error);
      res.status(500).json({ message: 'Failed to seed billing plans' });
    }
  });

  // ============================================
  // 구독 관련 API
  // ============================================
  
  // 사용자 구독 상태 조회
  app.get('/api/billing/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const subscription = await storage.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.json({ subscription: null, message: 'No active subscription' });
      }
      
      res.json({ subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ message: 'Failed to fetch subscription' });
    }
  });

  // 구독 신청 (빌링키는 프론트엔드 SDK에서 발급)
  app.post('/api/billing/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { planId, billingKeyId } = req.body;
      if (!planId || !billingKeyId) {
        return res.status(400).json({ message: 'Plan ID and billing key are required' });
      }
      
      const plan = await storage.getBillingPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      
      if (plan.type !== 'subscription') {
        return res.status(400).json({ message: 'This plan is not a subscription' });
      }
      
      const { portoneClient } = await import('./services/portoneClient');
      const billingResult = await portoneClient.getBillingKey(billingKeyId);
      
      if (!billingResult.success) {
        return res.status(400).json({ 
          message: 'Invalid billing key',
          error: billingResult.error 
        });
      }
      
      const priceMonthlyUsd = parseFloat(plan.priceMonthlyUsd || '0');
      if (priceMonthlyUsd > 0) {
        const paymentId = `sub_${req.user.id}_${Date.now()}`;
        const paymentResult = await portoneClient.createPaymentWithBillingKey({
          paymentId,
          billingKey: billingKeyId,
          orderName: plan.name,
          amount: Math.round(priceMonthlyUsd * 100), // USD cents
          currency: 'USD',
          customer: { id: req.user.id },
        });
        
        if (!paymentResult.success) {
          return res.status(400).json({ 
            message: 'Initial payment failed',
            error: paymentResult.error 
          });
        }
      }
      
      const subscription = await storage.createUserSubscription({
        userId: req.user.id,
        planId: plan.id,
        target: plan.target,
        billingKeyId,
        status: 'active',
        startedAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      res.json({ 
        success: true,
        subscription,
        message: 'Subscription created successfully'
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ message: 'Failed to create subscription' });
    }
  });

  // 구독 취소
  app.delete('/api/billing/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const subscription = await storage.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.status(404).json({ message: 'No active subscription found' });
      }
      
      await storage.cancelUserSubscription(subscription.id);
      
      res.json({ 
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  });

  // AI 사용량 조회 (Trip Pass 또는 Free tier)
  app.get('/api/billing/usage', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const usageStats = await getUserAiUsageStats(req.user.id);
      res.json(usageStats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({ message: 'Failed to fetch usage stats' });
    }
  });

  // ============================================
  // 구독 스케줄러 API (관리자 전용)
  // ============================================
  
  // 스케줄러 수동 실행 (테스트/관리자용)
  app.post('/api/admin/scheduler/run', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // 관리자 권한 확인
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // 동적 import로 순환 참조 방지
      const { subscriptionScheduler } = await import('./services/subscriptionScheduler');
      const stats = await subscriptionScheduler.runDailyScheduler();
      
      res.json({
        success: true,
        message: '스케줄러 실행 완료',
        stats
      });
    } catch (error) {
      console.error('Error running scheduler:', error);
      res.status(500).json({ message: 'Failed to run scheduler' });
    }
  });

  // 단일 구독 수동 갱신 (테스트/관리자용)
  app.post('/api/admin/subscription/:id/renew', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // 관리자 권한 확인
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const subscriptionId = parseInt(req.params.id);
      if (isNaN(subscriptionId)) {
        return res.status(400).json({ message: 'Invalid subscription ID' });
      }
      
      const { subscriptionScheduler } = await import('./services/subscriptionScheduler');
      const result = await subscriptionScheduler.manualRenew(subscriptionId);
      
      res.json({
        success: result.success,
        result
      });
    } catch (error) {
      console.error('Error renewing subscription:', error);
      res.status(500).json({ message: 'Failed to renew subscription' });
    }
  });

  // 만료 예정 알림 발송 (테스트/관리자용)
  app.post('/api/admin/scheduler/send-reminders', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // 관리자 권한 확인
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { subscriptionScheduler } = await import('./services/subscriptionScheduler');
      const sentCount = await subscriptionScheduler.sendExpirationReminders();
      
      res.json({
        success: true,
        message: `만료 예정 알림 ${sentCount}개 발송 완료`,
        sentCount
      });
    } catch (error) {
      console.error('Error sending reminders:', error);
      res.status(500).json({ message: 'Failed to send reminders' });
    }
  });

  // 관리자 환경 변수 상태 조회
  app.get('/api/admin/env-status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const status = getEnvStatus();
      res.json({
        success: true,
        environment: process.env.NODE_ENV || 'development',
        status
      });
    } catch (error) {
      console.error('Error fetching env status:', error);
      res.status(500).json({ message: 'Failed to fetch environment status' });
    }
  });

  // ============================================
  // Trip Pass (AI 크레딧) 관련 API
  // ============================================
  
  // Trip Pass 잔액 조회
  app.get('/api/billing/trip-pass', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const activeTripPass = await storage.getActiveTripPass(req.user.id);
      if (!activeTripPass) {
        return res.json({ 
          tripPass: null,
          message: 'No active Trip Pass',
          usage: { ai_message: 0, translation: 0, concierge: 0 }
        });
      }
      
      res.json({ 
        tripPass: activeTripPass,
        usage: {
          ai_message: activeTripPass.aiMessageUsed || 0,
          translation: activeTripPass.translationUsed || 0,
          concierge: activeTripPass.conciergeCallsUsed || 0,
        },
        limits: {
          ai_message: activeTripPass.aiMessageLimit,
          translation: activeTripPass.translationLimit,
          concierge: activeTripPass.conciergeCallsLimit,
        }
      });
    } catch (error) {
      console.error('Error fetching Trip Pass:', error);
      res.status(500).json({ message: 'Failed to fetch Trip Pass' });
    }
  });

  // Trip Pass 구매 (일회성 결제)
  app.post('/api/billing/trip-pass/purchase', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ message: 'Plan ID is required' });
      }
      
      const plan = await storage.getBillingPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      
      if (plan.type !== 'one_time' || plan.target !== 'traveler') {
        return res.status(400).json({ message: 'This plan is not a valid Trip Pass' });
      }
      
      const features = plan.features as { 
        ai_limit?: number; 
        translation_limit?: number; 
        concierge_limit?: number;
        valid_days?: number;
      } | null;
      const validDays = features?.valid_days || 365;
      
      const tripPass = await storage.createUserTripPass({
        userId: req.user.id,
        planId: plan.id,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
        aiMessageLimit: features?.ai_limit || 0,
        translationLimit: features?.translation_limit || 0,
        conciergeCallsLimit: features?.concierge_limit || 0,
      });
      
      res.json({ 
        success: true,
        tripPass,
        message: 'Trip Pass purchased successfully'
      });
    } catch (error) {
      console.error('Error purchasing Trip Pass:', error);
      res.status(500).json({ message: 'Failed to purchase Trip Pass' });
    }
  });

  // Trip Pass 사용 내역
  app.get('/api/billing/trip-pass/history', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const tripPasses = await storage.getUserTripPasses(req.user.id);
      res.json({ tripPasses });
    } catch (error) {
      console.error('Error fetching Trip Pass history:', error);
      res.status(500).json({ message: 'Failed to fetch Trip Pass history' });
    }
  });

  // 결제 설정 정보 (프론트엔드용)
  app.get('/api/billing/config', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      res.json({
        storeId: process.env.PORTONE_STORE_ID || 'store_test',
        channelKey: process.env.PORTONE_CHANNEL_KEY || 'channel_test',
      });
    } catch (error) {
      console.error('Error fetching billing config:', error);
      res.status(500).json({ message: 'Failed to fetch billing config' });
    }
  });

  // 결제 준비 (paymentId 생성)
  app.post('/api/billing/prepare-payment', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { type, planId, tripPassId, contractId, stageId, amount, payMethod } = req.body;
      
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let channelKey = process.env.PORTONE_CHANNEL_KEY || 'channel_test';
      if (payMethod === 'KAKAO') {
        channelKey = process.env.PORTONE_KAKAOPAY_CHANNEL_KEY || channelKey;
      } else if (payMethod === 'PAYPAL') {
        channelKey = process.env.PORTONE_PAYPAL_CHANNEL_KEY || channelKey;
      }
      
      res.json({
        paymentId,
        storeId: process.env.PORTONE_STORE_ID || 'store_test',
        channelKey,
      });
    } catch (error) {
      console.error('Error preparing payment:', error);
      res.status(500).json({ message: 'Failed to prepare payment' });
    }
  });

  // 결제 확인 (PortOne 결제 완료 후)
  app.post('/api/billing/confirm-payment', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { paymentId, txId, type, contractId, stageId } = req.body;
      
      if (type === 'trip_pass') {
        res.json({ 
          success: true, 
          message: 'Trip Pass payment confirmed'
        });
      } else if (type === 'subscription') {
        res.json({ 
          success: true, 
          message: 'Subscription payment confirmed'
        });
      } else if (type === 'contract' && contractId && stageId) {
        const { escrowService } = await import('./services/escrowService');
        const result = await escrowService.handlePaymentComplete({
          contractId,
          stageId,
          portonePaymentId: paymentId,
          paidAmount: 0,
        });
        
        if (!result.success) {
          return res.status(400).json({ message: result.error });
        }
        
        res.json({ 
          success: true, 
          message: 'Contract payment confirmed'
        });
      } else {
        res.status(400).json({ message: 'Invalid payment type' });
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // 빌링키 목록 조회 (Phase 8 - DB 연동)
  app.get('/api/billing/billing-keys', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const billingKeyList = await storage.getBillingKeysByUserId(req.user.id);
      
      // 빌링키를 마스킹해서 반환 (보안)
      const maskedList = billingKeyList.map(key => ({
        ...key,
        billingKey: key.billingKey ? `${key.billingKey.slice(0, 8)}...${key.billingKey.slice(-4)}` : null,
      }));
      
      res.json(maskedList);
    } catch (error) {
      console.error('Error fetching billing keys:', error);
      res.status(500).json({ message: 'Failed to fetch billing keys' });
    }
  });

  // 빌링키 등록 (Phase 8 - DB 연동)
  app.post('/api/billing/billing-key', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { billingKey, cardName, cardNumber, cardType } = req.body;
      
      if (!billingKey) {
        return res.status(400).json({ message: 'Billing key is required' });
      }
      
      // 카드번호는 마스킹된 형태만 허용 (예: ****-****-****-1234)
      // 전체 카드번호(16자리 숫자)가 전달된 경우 거부
      if (cardNumber && /^\d{13,19}$/.test(cardNumber.replace(/[-\s]/g, ''))) {
        return res.status(400).json({ 
          message: '전체 카드번호는 저장할 수 없습니다. 마스킹된 형태로 전달해주세요.' 
        });
      }
      
      const created = await storage.createBillingKey({
        userId: req.user.id,
        billingKey,
        cardName: cardName || null,
        cardNumber: cardNumber || null,
        cardType: cardType || null,
      });
      
      // 응답에서도 빌링키 마스킹
      const maskedResponse = {
        ...created,
        billingKey: created.billingKey ? `${created.billingKey.slice(0, 8)}...${created.billingKey.slice(-4)}` : null,
      };
      
      res.json({ 
        success: true,
        billingKey: maskedResponse,
        message: '결제 수단이 등록되었습니다'
      });
    } catch (error) {
      console.error('Error registering billing key:', error);
      res.status(500).json({ message: 'Failed to register billing key' });
    }
  });

  // 빌링키 삭제 (Phase 8 - DB 연동)
  app.delete('/api/billing/billing-keys/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid billing key ID' });
      }
      
      const deleted = await storage.deleteBillingKey(id, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Billing key not found or unauthorized' });
      }
      
      res.json({ 
        success: true,
        message: '결제 수단이 삭제되었습니다'
      });
    } catch (error) {
      console.error('Error deleting billing key:', error);
      res.status(500).json({ message: 'Failed to delete billing key' });
    }
  });

  // 기본 빌링키 설정 (Phase 8 - DB 연동)
  app.put('/api/billing/billing-keys/:id/default', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid billing key ID' });
      }
      
      const updated = await storage.setDefaultBillingKey(id, req.user.id);
      
      if (!updated) {
        return res.status(404).json({ message: 'Billing key not found or unauthorized' });
      }
      
      res.json({ 
        success: true,
        message: '기본 결제 수단이 변경되었습니다'
      });
    } catch (error) {
      console.error('Error setting default billing key:', error);
      res.status(500).json({ message: 'Failed to set default billing key' });
    }
  });

  // 사용자 Trip Pass 목록
  app.get('/api/billing/trip-passes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const tripPasses = await storage.getUserTripPasses(req.user.id);
      res.json(tripPasses || []);
    } catch (error) {
      console.error('Error fetching user trip passes:', error);
      res.status(500).json({ message: 'Failed to fetch trip passes' });
    }
  });

  // 결제 내역 조회 (Phase 7 스텁 - PaymentTransactions 테이블 사용)
  app.get('/api/billing/history', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactions = await storage.getPaymentTransactions(req.user.id);
      const history = transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        status: tx.status,
        createdAt: tx.createdAt,
        description: tx.description || `${tx.type} 결제`,
      }));
      res.json(history);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({ message: 'Failed to fetch payment history' });
    }
  });

  // ============================================
  // 에스크로/계약 관련 API
  // ============================================
  
  // 계약 생성
  app.post('/api/contracts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Support both 'amount' and 'totalAmount' field names for backward compatibility
      const totalAmount = req.body.totalAmount || req.body.amount;
      if (!totalAmount) {
        return res.status(400).json({ message: 'totalAmount or amount is required' });
      }
      
      // Get guideId from booking if bookingId is provided
      let guideId = req.body.guideId;
      if (req.body.bookingId && !guideId) {
        const booking = await storage.getBookingById(req.body.bookingId);
        if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
        }
        guideId = booking.hostId;
      }
      
      if (!guideId) {
        return res.status(400).json({ message: 'guideId is required (or provide bookingId to fetch from booking)' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.createContract({
        travelerId: req.user.id,
        guideId: guideId,
        title: req.body.title || 'Contract',
        description: req.body.description || 'P2P Service Contract',
        totalAmountKrw: parseFloat(totalAmount),
        serviceDate: req.body.serviceDate,
        serviceStartTime: req.body.serviceStartTime,
        serviceEndTime: req.body.serviceEndTime,
        meetingPoint: req.body.meetingPoint,
        meetingLatitude: req.body.meetingLatitude,
        meetingLongitude: req.body.meetingLongitude,
        cancelPolicy: req.body.cancelPolicy,
        depositPercent: req.body.depositPercent,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ 
        success: true,
        contractId: result.contractId,
        message: 'Contract created successfully'
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({ message: 'Failed to create contract' });
    }
  });

  // 계약 상세 조회
  app.get('/api/contracts/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.getContract(parseInt(req.params.id));
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      
      const contract = result.contract;
      if (contract.travelerId !== req.user.id && contract.guideId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this contract' });
      }
      
      res.json({
        contract: result.contract,
        stages: result.stages,
        transactions: result.transactions,
      });
    } catch (error) {
      console.error('Error fetching contract:', error);
      res.status(500).json({ message: 'Failed to fetch contract' });
    }
  });

  // 사용자 계약 목록 조회
  app.get('/api/contracts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const role = (req.query.role as 'traveler' | 'guide') || 'traveler';
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.getUserContracts(req.user.id, role);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ contracts: result.contracts });
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ message: 'Failed to fetch contracts' });
    }
  });

  // 계약 단계 결제 시작 (프론트엔드 결제창 오픈용)
  app.post('/api/contracts/:id/initiate-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { stageId } = req.body;
      if (!stageId) {
        return res.status(400).json({ message: 'Stage ID is required' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.initiateStagePayment(
        parseInt(req.params.id),
        stageId,
        req.user.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      const { portoneClient } = await import('./services/portoneClient');
      const publicConfig = portoneClient.getPublicConfig();
      
      res.json({
        success: true,
        payment: {
          paymentId: result.paymentId,
          orderName: result.orderName,
          amount: result.amount,
          currency: result.currency,
        },
        portone: publicConfig,
        customData: {
          contractId: parseInt(req.params.id),
          stageId: stageId,
          type: 'contract_stage',
        }
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      res.status(500).json({ message: 'Failed to initiate payment' });
    }
  });

  // 계약 결제 완료 처리 (프론트엔드에서 결제 완료 후 호출)
  app.post('/api/contracts/:id/confirm-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { stageId, portonePaymentId } = req.body;
      if (!stageId || !portonePaymentId) {
        return res.status(400).json({ message: 'Stage ID and payment ID are required' });
      }
      
      const { portoneClient } = await import('./services/portoneClient');
      const paymentStatus = await portoneClient.getPayment(portonePaymentId);
      
      if (!paymentStatus.success || paymentStatus.status !== 'PAID') {
        return res.status(400).json({ 
          message: 'Payment not confirmed',
          status: paymentStatus.status 
        });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.handlePaymentComplete(
        parseInt(req.params.id),
        stageId,
        portonePaymentId,
        paymentStatus.amount || 0
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        stageId: result.stageId,
        message: 'Payment confirmed and contract updated'
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // 서비스 완료 확인 (여행자)
  app.post('/api/contracts/:id/complete', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.confirmServiceComplete(
        parseInt(req.params.id),
        req.user.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        message: 'Service completed and payout initiated'
      });
    } catch (error) {
      console.error('Error completing contract:', error);
      res.status(500).json({ message: 'Failed to complete contract' });
    }
  });

  // 계약 취소
  app.post('/api/contracts/:id/cancel', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.cancelContract(
        parseInt(req.params.id),
        req.user.id,
        req.body.reason || 'User requested cancellation'
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        message: 'Contract cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling contract:', error);
      res.status(500).json({ message: 'Failed to cancel contract' });
    }
  });

  // 분쟁 제기
  app.post('/api/contracts/:id/dispute', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { reason, description } = req.body;
      if (!reason) {
        return res.status(400).json({ message: 'Dispute reason is required' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.raiseDispute(
        parseInt(req.params.id),
        req.user.id,
        reason
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        message: 'Dispute raised successfully'
      });
    } catch (error) {
      console.error('Error raising dispute:', error);
      res.status(500).json({ message: 'Failed to raise dispute' });
    }
  });

  // 에스크로 해제 및 정산 처리 (여행자가 서비스 완료 후 승인)
  app.post('/api/contracts/:id/release', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.releaseEscrow(
        parseInt(req.params.id),
        req.user.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        payoutId: result.payoutId,
        guideAmount: result.guideAmount,
        platformFee: result.platformFee,
        message: 'Escrow released and payout created'
      });
    } catch (error) {
      console.error('Error releasing escrow:', error);
      res.status(500).json({ message: 'Failed to release escrow' });
    }
  });

  // 가이드 정산 내역 조회
  app.get('/api/payouts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.getGuidePayouts(req.user.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ payouts: result.payouts });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  // 가이드 에스크로 계좌 조회
  app.get('/api/escrow-account', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.getOrCreateEscrowAccount(req.user.id, 'host');
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ account: result.account });
    } catch (error) {
      console.error('Error fetching escrow account:', error);
      res.status(500).json({ message: 'Failed to fetch escrow account' });
    }
  });

  // ============================================
  // 분할 결제 API (Phase 13)
  // ============================================

  // 헬퍼 함수: 계약 소유자 검증
  async function verifyContractOwnership(contractId: number, userId: string): Promise<{ authorized: boolean; contract?: any; role?: 'traveler' | 'guide' }> {
    const { escrowService } = await import('./services/escrowService');
    const result = await escrowService.getContract(contractId);
    
    if (!result.success || !result.contract) {
      return { authorized: false };
    }
    
    const contract = result.contract;
    if (contract.travelerId === userId) {
      return { authorized: true, contract, role: 'traveler' };
    }
    if (contract.guideId === userId) {
      return { authorized: true, contract, role: 'guide' };
    }
    
    return { authorized: false };
  }

  // 헬퍼 함수: 에스크로 트랜잭션 소유자 검증
  async function verifyEscrowTransactionOwnership(transactionId: number, userId: string): Promise<{ authorized: boolean; transaction?: any; contract?: any; role?: 'traveler' | 'guide' }> {
    const { db } = await import('./db');
    const { escrowTransactions, contracts } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [tx] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, transactionId));
    if (!tx) return { authorized: false };
    
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, tx.contractId));
    if (!contract) return { authorized: false };
    
    if (contract.travelerId === userId) {
      return { authorized: true, transaction: tx, contract, role: 'traveler' };
    }
    if (contract.guideId === userId) {
      return { authorized: true, transaction: tx, contract, role: 'guide' };
    }
    
    return { authorized: false };
  }

  // 분할 결제 설정 적용 (가이드 또는 여행자만 가능)
  app.post('/api/contracts/:id/split-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to modify this contract' });
      }

      const { paymentPlan, depositRate, interimRate, finalRate, depositDueDate, interimDueDate, finalDueDate } = req.body;

      if (!paymentPlan || !['single', 'two_step', 'three_step'].includes(paymentPlan)) {
        return res.status(400).json({ message: 'Valid payment plan required (single, two_step, three_step)' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const defaultRates = splitPaymentService.getDefaultRates(paymentPlan);

      const config = {
        paymentPlan,
        depositRate: depositRate ?? defaultRates.deposit,
        interimRate: interimRate ?? defaultRates.interim,
        finalRate: finalRate ?? defaultRates.final,
        depositDueDate,
        interimDueDate,
        finalDueDate,
      };

      const result = await splitPaymentService.setupSplitPayment(contractId, config);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Split payment configured successfully' });
    } catch (error) {
      console.error('Error setting up split payment:', error);
      res.status(500).json({ message: 'Failed to setup split payment' });
    }
  });

  // 계약 결제 요약 조회 (계약 당사자만 가능)
  app.get('/api/contracts/:id/payment-summary', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to view this contract' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const summary = await splitPaymentService.getContractPaymentSummary(contractId);

      if (!summary) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      res.json(summary);
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      res.status(500).json({ message: 'Failed to fetch payment summary' });
    }
  });

  // 마일스톤 결제 처리 (여행자만 가능)
  app.post('/api/escrow/:transactionId/pay', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactionId = parseInt(req.params.transactionId);
      
      // 트랜잭션 소유자 검증 (여행자만 결제 가능)
      const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to pay this milestone' });
      }
      if (ownership.role !== 'traveler') {
        return res.status(403).json({ message: 'Only the traveler can make payments' });
      }

      const { paymentId, paymentMethod, paidAmount } = req.body;

      if (!paymentId || !paymentMethod) {
        return res.status(400).json({ message: 'Payment ID and method required' });
      }

      if (paidAmount === undefined || paidAmount === null || typeof paidAmount !== 'number') {
        return res.status(400).json({ message: 'Paid amount is required and must be a number' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const result = await splitPaymentService.processMilestonePayment(transactionId, paymentId, paymentMethod, paidAmount);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        success: true, 
        nextMilestone: result.nextMilestone,
        message: 'Milestone payment processed successfully' 
      });
    } catch (error) {
      console.error('Error processing milestone payment:', error);
      res.status(500).json({ message: 'Failed to process milestone payment' });
    }
  });

  // 마일스톤 릴리스 (서비스 완료 승인 - 여행자만 가능)
  app.post('/api/escrow/:transactionId/release', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactionId = parseInt(req.params.transactionId);
      
      // 트랜잭션 소유자 검증 (여행자만 릴리스 가능)
      const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to release this milestone' });
      }
      if (ownership.role !== 'traveler') {
        return res.status(403).json({ message: 'Only the traveler can release milestones' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const result = await splitPaymentService.releaseMilestone(transactionId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Milestone released successfully' });
    } catch (error) {
      console.error('Error releasing milestone:', error);
      res.status(500).json({ message: 'Failed to release milestone' });
    }
  });

  // 부분 환불 처리 (양측 모두 가능 - 협의 후)
  app.post('/api/escrow/:transactionId/partial-refund', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactionId = parseInt(req.params.transactionId);
      
      // 트랜잭션 소유자 검증 (계약 당사자만 환불 요청 가능)
      const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to process refund for this milestone' });
      }

      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid refund amount required' });
      }

      if (!reason) {
        return res.status(400).json({ message: 'Refund reason required' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const result = await splitPaymentService.processPartialRefund(transactionId, amount, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        success: true, 
        newStatus: result.newStatus,
        message: 'Partial refund processed successfully' 
      });
    } catch (error) {
      console.error('Error processing partial refund:', error);
      res.status(500).json({ message: 'Failed to process partial refund' });
    }
  });

  // 전체 환불 처리 (양측 모두 가능)
  app.post('/api/contracts/:id/full-refund', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to refund this contract' });
      }

      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: 'Refund reason required' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const result = await splitPaymentService.processFullRefund(contractId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        success: true, 
        refundedTransactions: result.refundedTransactions,
        message: 'Full refund processed successfully' 
      });
    } catch (error) {
      console.error('Error processing full refund:', error);
      res.status(500).json({ message: 'Failed to process full refund' });
    }
  });

  // 계약 완료 처리 (여행자만 가능)
  app.post('/api/contracts/:id/complete', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증 (여행자만 완료 처리 가능)
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to complete this contract' });
      }
      if (ownership.role !== 'traveler') {
        return res.status(403).json({ message: 'Only the traveler can complete contracts' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const result = await splitPaymentService.completeContract(contractId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Contract completed successfully' });
    } catch (error) {
      console.error('Error completing contract:', error);
      res.status(500).json({ message: 'Failed to complete contract' });
    }
  });

  // 납부 기한 지난 마일스톤 조회 (관리자용)
  app.get('/api/admin/overdue-milestones', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id || !req.user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { splitPaymentService } = await import('./services/splitPaymentService');
      const overdue = await splitPaymentService.getOverdueMilestones();

      res.json({ overdueCount: overdue.length, milestones: overdue });
    } catch (error) {
      console.error('Error fetching overdue milestones:', error);
      res.status(500).json({ message: 'Failed to fetch overdue milestones' });
    }
  });

  // ============================================
  // PortOne 웹훅 처리
  // ============================================
  
  // Webhook idempotency cache (10-minute TTL for replay protection)
  const processedWebhooks = new Map<string, number>();
  const WEBHOOK_TTL_MS = 10 * 60 * 1000; // 10 minutes
  
  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > WEBHOOK_TTL_MS) {
        processedWebhooks.delete(id);
      }
    }
  }, 60 * 1000); // Every minute

  // PortOne V2 웹훅 처리 (결제 완료, 취소, 빌링키 등)
  // Raw body capture middleware for proper HMAC verification
  app.post('/api/webhooks/portone', express.text({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
      const { portoneClient } = await import('./services/portoneClient');
      const { escrowService } = await import('./services/escrowService');
      
      const signature = req.headers['x-portone-signature'] as string;
      const webhookId = req.headers['x-portone-webhook-id'] as string;
      const timestamp = req.headers['x-portone-timestamp'] as string;
      
      if (!signature || !webhookId || !timestamp) {
        console.error('[Webhook] Missing required headers');
        return res.status(400).json({ message: 'Missing required webhook headers' });
      }
      
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      const verifyResult = portoneClient.verifyWebhookSignature(
        rawBody, 
        signature,
        webhookId,
        timestamp
      );
      
      if (!verifyResult.valid) {
        console.error(`[Webhook] Signature verification failed: ${verifyResult.error}`);
        return res.status(401).json({ message: verifyResult.error || 'Invalid webhook signature' });
      }
      
      if (processedWebhooks.has(webhookId)) {
        console.warn(`[Webhook] Duplicate webhook detected: ${webhookId}`);
        return res.status(200).json({ received: true, duplicate: true });
      }
      
      processedWebhooks.set(webhookId, Date.now());
      
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      const { type, data } = body;
      console.log(`[Webhook] Received event: ${type}`);
      
      // 웹훅 이벤트 로그 기록 (공통)
      const logWebhookEvent = async (
        paymentId: string, 
        eventType: string, 
        eventData: any, 
        amount?: number, 
        status?: string,
        errorMessage?: string,
        userId?: string
      ) => {
        try {
          await storage.createPaymentLog({
            paymentId,
            userId: userId || null,
            eventType,
            eventData: JSON.stringify(eventData),
            amount: amount || null,
            status: status || null,
            errorMessage: errorMessage || null,
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || null,
            userAgent: req.headers['user-agent'] || null,
          });
        } catch (logError) {
          console.error('[Webhook] Failed to save payment log:', logError);
        }
      };
      
      switch (type) {
        case 'Transaction.Paid': {
          const { paymentId, amount, customData } = data;
          console.log(`[Webhook] Payment confirmed: ${paymentId}, Amount: ${amount?.total}`);
          
          // 결제 성공 로그 기록
          await logWebhookEvent(
            paymentId,
            'WEBHOOK_PAYMENT_PAID',
            data,
            amount?.total,
            'PAID',
            null,
            customData?.userId
          );
          
          if (customData?.contractId && customData?.stageId) {
            const result = await escrowService.handlePaymentComplete(
              customData.contractId,
              customData.stageId,
              paymentId,
              amount.total
            );
            if (!result.success) {
              console.error(`[Webhook] Failed to update contract: ${result.error}`);
            }
          }
          
          if (customData?.type === 'subscription' && customData?.userId) {
            const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            console.log(`[Webhook] Subscription payment for user ${customData.userId}, next billing: ${nextBillingDate}`);
          }
          break;
        }
        
        case 'Transaction.Cancelled': {
          const { paymentId, cancelledAmount, customData } = data;
          console.log(`[Webhook] Payment cancelled: ${paymentId}, Refunded: ${cancelledAmount?.total}`);
          
          // 결제 취소 로그 기록
          await logWebhookEvent(
            paymentId,
            'WEBHOOK_PAYMENT_CANCELLED',
            data,
            cancelledAmount?.total,
            'CANCELLED',
            null,
            customData?.userId
          );
          break;
        }
        
        case 'Transaction.Failed': {
          const { paymentId, failReason, customData } = data;
          console.error(`[Webhook] Payment failed: ${paymentId}, Reason: ${failReason}`);
          
          // 결제 실패 로그 기록
          await logWebhookEvent(
            paymentId,
            'WEBHOOK_PAYMENT_FAILED',
            data,
            null,
            'FAILED',
            failReason,
            customData?.userId
          );
          break;
        }
        
        case 'BillingKey.Issued': {
          const { billingKey, customerId } = data;
          console.log(`[Webhook] Billing key issued: ${billingKey?.substring(0, 20)}... for ${customerId}`);
          
          // 빌링키 발급 로그 기록
          await logWebhookEvent(
            `billing_${customerId}_${Date.now()}`,
            'WEBHOOK_BILLINGKEY_ISSUED',
            { billingKeyPrefix: billingKey?.substring(0, 8), customerId },
            null,
            'ISSUED',
            null,
            customerId
          );
          break;
        }
        
        case 'BillingKey.Deleted': {
          const { billingKey, customerId } = data;
          console.log(`[Webhook] Billing key deleted for customer: ${customerId}`);
          
          // 빌링키 삭제 로그 기록
          await logWebhookEvent(
            `billing_${customerId}_${Date.now()}`,
            'WEBHOOK_BILLINGKEY_DELETED',
            { customerId },
            null,
            'DELETED',
            null,
            customerId
          );
          break;
        }
        
        default:
          console.log(`[Webhook] Unhandled event type: ${type}`);
          
          // 미처리 이벤트도 로그 기록
          await logWebhookEvent(
            `unknown_${Date.now()}`,
            `WEBHOOK_${type}`,
            data,
            null,
            'RECEIVED',
            null,
            null
          );
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('[Webhook] Processing error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // ============================================
  // 결제 내역 조회 (관리자)
  // ============================================
  
  app.get('/api/admin/billing/transactions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, limit = 50 } = req.query;
      const transactions = await storage.getPaymentTransactions(
        userId as string || '',
        parseInt(limit as string)
      );
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // 환불 처리 (관리자)
  app.post('/api/admin/billing/refund', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { contractId, refundAmount, reason } = req.body;
      if (!contractId || !refundAmount || !reason) {
        return res.status(400).json({ message: 'Contract ID, refund amount, and reason are required' });
      }
      
      const { escrowService } = await import('./services/escrowService');
      const result = await escrowService.processRefund(contractId, refundAmount, reason);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  });

  // ============================================
  // 호스트 정산 API (Phase 12)
  // ============================================

  // 정산 스케줄러 상태 조회 (관리자)
  app.get('/api/admin/settlements/status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getSchedulerStatus } = await import('./jobs/settlementBatch');
      const { settlementService } = await import('./services/settlementService');
      
      const schedulerStatus = getSchedulerStatus();
      const stats = await settlementService.getSettlementStats();
      
      res.json({
        scheduler: schedulerStatus,
        stats,
      });
    } catch (error) {
      console.error('Error fetching settlement status:', error);
      res.status(500).json({ message: 'Failed to fetch settlement status' });
    }
  });

  // 수동 정산 실행 (관리자)
  app.post('/api/admin/settlements/run', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { runManualSettlement } = await import('./jobs/settlementBatch');
      const result = await runManualSettlement();
      
      res.json({
        success: result.success,
        summary: result,
      });
    } catch (error) {
      console.error('Error running manual settlement:', error);
      res.status(500).json({ message: 'Failed to run settlement' });
    }
  });

  // 최근 정산 목록 조회 (관리자)
  app.get('/api/admin/settlements', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { settlementService } = await import('./services/settlementService');
      const limit = parseInt(req.query.limit as string) || 50;
      const payouts = await settlementService.getRecentPayouts(limit);
      
      res.json({ payouts });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  // 실패한 정산 재시도 (관리자)
  app.post('/api/admin/settlements/:id/retry', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const payoutId = parseInt(req.params.id);
      if (isNaN(payoutId)) {
        return res.status(400).json({ message: 'Invalid payout ID' });
      }
      
      const { settlementService } = await import('./services/settlementService');
      const result = await settlementService.retryFailedPayout(payoutId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        message: 'Payout retried successfully',
      });
    } catch (error) {
      console.error('Error retrying payout:', error);
      res.status(500).json({ message: 'Failed to retry payout' });
    }
  });

  // 호스트 정산 내역 조회 (호스트 본인)
  app.get('/api/host/payouts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { settlementService } = await import('./services/settlementService');
      const payouts = await settlementService.getHostPayouts(userId);
      
      res.json({ payouts });
    } catch (error) {
      console.error('Error fetching host payouts:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  // =====================================================
  // Dispute Management API (Phase 14)
  // =====================================================

  // 분쟁 생성
  app.post('/api/disputes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { createDispute } = await import('./services/disputeService');
      const { dispute, error } = await createDispute({
        ...req.body,
        complainantId: userId,
      }, userId);

      if (error) {
        return res.status(400).json({ message: error, dispute });
      }

      res.status(201).json({ dispute });
    } catch (error) {
      console.error('Error creating dispute:', error);
      res.status(500).json({ message: 'Failed to create dispute' });
    }
  });

  // 내 분쟁 목록 조회
  app.get('/api/disputes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { getUserDisputes } = await import('./services/disputeService');
      const result = await getUserDisputes(userId, {
        status: req.query.status as any,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      res.status(500).json({ message: 'Failed to fetch disputes' });
    }
  });

  // 분쟁 상세 조회
  app.get('/api/disputes/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { getDisputeById, getDisputeEvidence, getDisputeActivities } = await import('./services/disputeService');
      const dispute = await getDisputeById(disputeId);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      if (dispute.complainantId !== userId && dispute.respondentId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const [evidence, activities] = await Promise.all([
        getDisputeEvidence(disputeId),
        getDisputeActivities(disputeId),
      ]);

      res.json({ dispute, evidence, activities });
    } catch (error) {
      console.error('Error fetching dispute:', error);
      res.status(500).json({ message: 'Failed to fetch dispute' });
    }
  });

  // 증거 제출
  app.post('/api/disputes/:id/evidence', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { submitEvidence } = await import('./services/disputeService');
      const result = await submitEvidence(disputeId, req.body, userId);

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error submitting evidence:', error);
      res.status(400).json({ message: error.message || 'Failed to submit evidence' });
    }
  });

  // 분쟁 철회
  app.post('/api/disputes/:id/withdraw', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { withdrawDispute } = await import('./services/disputeService');
      const result = await withdrawDispute(disputeId, userId, req.body.reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute withdrawn' });
    } catch (error) {
      console.error('Error withdrawing dispute:', error);
      res.status(500).json({ message: 'Failed to withdraw dispute' });
    }
  });

  // 코멘트 추가
  app.post('/api/disputes/:id/comment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { getDisputeById, addComment } = await import('./services/disputeService');
      const dispute = await getDisputeById(disputeId);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      if (dispute.complainantId !== userId && dispute.respondentId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      await addComment(disputeId, userId, req.body.comment);
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // =====================================================
  // Admin Dispute API
  // =====================================================

  // 관리자 분쟁 목록 조회
  app.get('/api/admin/disputes', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getAdminDisputes } = await import('./services/disputeService');
      const result = await getAdminDisputes({
        status: req.query.status as any,
        priority: req.query.priority as any,
        assignedToMe: req.query.assignedToMe === 'true' ? req.user?.id : undefined,
        unassigned: req.query.unassigned === 'true',
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching admin disputes:', error);
      res.status(500).json({ message: 'Failed to fetch disputes' });
    }
  });

  // 분쟁 담당자 배정
  app.post('/api/admin/disputes/:id/assign', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const adminId = req.body.adminId || req.user?.id;
      if (!adminId) {
        return res.status(400).json({ message: 'Admin ID required' });
      }

      const { assignDispute } = await import('./services/disputeService');
      const result = await assignDispute(disputeId, adminId, req.user?.id || '');

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute assigned' });
    } catch (error) {
      console.error('Error assigning dispute:', error);
      res.status(500).json({ message: 'Failed to assign dispute' });
    }
  });

  // 분쟁 상태 변경
  app.post('/api/admin/disputes/:id/status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { updateDisputeStatus } = await import('./services/disputeService');
      const result = await updateDisputeStatus(
        disputeId,
        req.body.status,
        req.user?.id || '',
        req.body.comment
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Status updated' });
    } catch (error) {
      console.error('Error updating dispute status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // 분쟁 해결
  app.post('/api/admin/disputes/:id/resolve', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { resolutionType, resolutionSummary, refundAmount, favoredParty } = req.body;
      if (!resolutionType || !resolutionSummary || !favoredParty) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const { resolveDispute } = await import('./services/disputeService');
      const result = await resolveDispute(
        disputeId,
        { resolutionType, resolutionSummary, refundAmount, favoredParty },
        req.user?.id || ''
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute resolved' });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      res.status(500).json({ message: 'Failed to resolve dispute' });
    }
  });

  // 분쟁 상위 단계 전달
  app.post('/api/admin/disputes/:id/escalate', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { escalateDispute } = await import('./services/disputeService');
      const result = await escalateDispute(disputeId, req.user?.id || '', req.body.reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute escalated' });
    } catch (error) {
      console.error('Error escalating dispute:', error);
      res.status(500).json({ message: 'Failed to escalate dispute' });
    }
  });

  // 분쟁 통계
  app.get('/api/admin/disputes/stats', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getDisputeStats } = await import('./services/disputeService');
      const stats = await getDisputeStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dispute stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // SLA 위반 체크 (수동 실행)
  app.post('/api/admin/disputes/check-sla', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { checkSlaBreaches } = await import('./services/disputeService');
      const result = await checkSlaBreaches();
      res.json({
        success: true,
        breachedCount: result.breachedCount,
        message: `${result.breachedCount} disputes marked as SLA breached`,
      });
    } catch (error) {
      console.error('Error checking SLA breaches:', error);
      res.status(500).json({ message: 'Failed to check SLA' });
    }
  });

  // =====================================================
  // Analytics Data Warehouse API (Phase 15)
  // =====================================================

  // ETL 전체 실행 (초기화용)
  app.post('/api/admin/analytics/etl/full', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { runFullETL } = await import('./services/analyticsETLService');
      
      const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date();
      
      const result = await runFullETL(startDate, endDate);
      
      res.json({
        success: true,
        message: 'Full ETL completed',
        result,
      });
    } catch (error) {
      console.error('Error running full ETL:', error);
      res.status(500).json({ message: 'Failed to run full ETL' });
    }
  });

  // 일별 ETL 실행
  app.post('/api/admin/analytics/etl/daily', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { runDailyETL } = await import('./services/analyticsETLService');
      const result = await runDailyETL();
      
      res.json({
        success: true,
        message: 'Daily ETL completed',
        result,
      });
    } catch (error) {
      console.error('Error running daily ETL:', error);
      res.status(500).json({ message: 'Failed to run daily ETL' });
    }
  });

  // 일별 메트릭 조회
  app.get('/api/admin/analytics/daily-metrics', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factDailyMetrics } = await import('@shared/schema');
      const { db } = await import('./db');
      const { desc } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 30;
      
      const metrics = await db.select()
        .from(factDailyMetrics)
        .orderBy(desc(factDailyMetrics.dateKey))
        .limit(limit);
      
      res.json({ metrics });
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  });

  // 거래 팩트 조회
  app.get('/api/admin/analytics/transactions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factTransactions } = await import('@shared/schema');
      const { db } = await import('./db');
      const { desc, eq, gte, lte, and } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      const transactionType = req.query.type as string;
      const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : null;
      
      let query = db.select().from(factTransactions);
      
      const conditions = [];
      if (transactionType) {
        conditions.push(eq(factTransactions.transactionType, transactionType));
      }
      if (startDate) {
        conditions.push(gte(factTransactions.dateKey, startDate));
      }
      if (endDate) {
        conditions.push(lte(factTransactions.dateKey, endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const transactions = await query
        .orderBy(desc(factTransactions.createdAt))
        .limit(limit);
      
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // 예약 팩트 조회
  app.get('/api/admin/analytics/bookings', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factBookings } = await import('@shared/schema');
      const { db } = await import('./db');
      const { desc, eq, gte, lte, and } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      const status = req.query.status as string;
      const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : null;
      
      let query = db.select().from(factBookings);
      
      const conditions = [];
      if (status) {
        conditions.push(eq(factBookings.bookingStatus, status));
      }
      if (startDate) {
        conditions.push(gte(factBookings.dateKey, startDate));
      }
      if (endDate) {
        conditions.push(lte(factBookings.dateKey, endDate));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const bookings = await query
        .orderBy(desc(factBookings.createdAt))
        .limit(limit);
      
      res.json({ bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // 대시보드 요약 조회
  app.get('/api/admin/analytics/dashboard', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factDailyMetrics, dimUsers, factTransactions, factBookings } = await import('@shared/schema');
      const { db } = await import('./db');
      const { desc, sql, count, sum, eq, gte } = await import('drizzle-orm');
      
      const last7Days = await db.select()
        .from(factDailyMetrics)
        .orderBy(desc(factDailyMetrics.dateKey))
        .limit(7);
      
      const last30Days = await db.select()
        .from(factDailyMetrics)
        .orderBy(desc(factDailyMetrics.dateKey))
        .limit(30);
      
      const totalUsers = await db.select({ count: count() })
        .from(dimUsers)
        .where(eq(dimUsers.isCurrent, true));
      
      const totalGMV = last30Days.reduce((sum, m) => sum + parseFloat(m.gmv || '0'), 0);
      const totalBookings = last30Days.reduce((sum, m) => sum + (m.newBookingCount || 0), 0);
      const avgDAU = last7Days.reduce((sum, m) => sum + (m.dauCount || 0), 0) / 7;
      
      res.json({
        summary: {
          totalUsers: totalUsers[0]?.count || 0,
          avgDAU: Math.round(avgDAU),
          last30DaysGMV: totalGMV,
          last30DaysBookings: totalBookings,
        },
        last7Days,
        trends: {
          newUsers: last7Days.map(m => ({ date: m.metricDate, value: m.newUserCount })),
          bookings: last7Days.map(m => ({ date: m.metricDate, value: m.newBookingCount })),
          gmv: last7Days.map(m => ({ date: m.metricDate, value: parseFloat(m.gmv || '0') })),
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard' });
    }
  });

  // 차원 테이블 동기화
  app.post('/api/admin/analytics/sync-dimensions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { 
        generateDateDimension, 
        syncUserDimension, 
        syncLocationDimension, 
        syncServiceTypeDimension 
      } = await import('./services/analyticsETLService');
      
      const currentYear = new Date().getFullYear();
      const dateResult = await generateDateDimension(currentYear, currentYear + 1);
      const userResult = await syncUserDimension();
      const locationResult = await syncLocationDimension();
      const serviceTypeResult = await syncServiceTypeDimension();
      
      res.json({
        success: true,
        message: 'Dimensions synchronized',
        result: {
          datesGenerated: dateResult.generated,
          usersSynced: userResult.synced,
          usersUpdated: userResult.updated,
          locationsSynced: locationResult.synced,
          serviceTypesSynced: serviceTypeResult.synced,
        },
      });
    } catch (error) {
      console.error('Error syncing dimensions:', error);
      res.status(500).json({ message: 'Failed to sync dimensions' });
    }
  });

  // 분쟁 분석 조회
  app.get('/api/admin/analytics/disputes', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { factDisputes } = await import('@shared/schema');
      const { db } = await import('./db');
      const { desc, eq, sql } = await import('drizzle-orm');
      
      const limit = parseInt(req.query.limit as string) || 100;
      
      const disputes = await db.select()
        .from(factDisputes)
        .orderBy(desc(factDisputes.createdAt))
        .limit(limit);
      
      const byType = await db.select({
        disputeType: factDisputes.disputeType,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<string>`COALESCE(sum(${factDisputes.disputedAmount}), 0)`,
        avgResolutionDays: sql<number>`COALESCE(avg(${factDisputes.resolutionTimeDays}), 0)::int`,
      })
        .from(factDisputes)
        .groupBy(factDisputes.disputeType);
      
      res.json({ disputes, byType });
    } catch (error) {
      console.error('Error fetching dispute analytics:', error);
      res.status(500).json({ message: 'Failed to fetch dispute analytics' });
    }
  });

  // =====================================================
  // 검색 API (Search API)
  // =====================================================
  // 포스트 및 체험(Experience) 검색 - ILIKE 패턴 매칭

  // 포스트 검색
  // GET /api/search/posts?term=검색어&location=위치&limit=20&offset=0
  app.get('/api/search/posts', async (req: Request, res: Response) => {
    try {
      const term = req.query.term as string;
      const location = req.query.location as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      if (term.trim().length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const posts = await storage.searchPosts(term.trim(), { location, limit, offset });
      
      res.json({
        results: posts,
        term: term.trim(),
        count: posts.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error('포스트 검색 오류:', error);
      res.status(500).json({ error: 'Failed to search posts' });
    }
  });

  // 체험(Experience) 검색
  // GET /api/search/experiences?term=검색어&category=카테고리&location=위치&limit=20&offset=0
  app.get('/api/search/experiences', async (req: Request, res: Response) => {
    try {
      const term = req.query.term as string;
      const category = req.query.category as string | undefined;
      const location = req.query.location as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      if (term.trim().length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const experiences = await storage.searchExperiences(term.trim(), { category, location, limit, offset });
      
      res.json({
        results: experiences,
        term: term.trim(),
        count: experiences.length,
        limit,
        offset,
      });
    } catch (error) {
      console.error('체험 검색 오류:', error);
      res.status(500).json({ error: 'Failed to search experiences' });
    }
  });

  // 통합 검색 (포스트 + 체험)
  // GET /api/search?term=검색어&type=all|posts|experiences&limit=10&offset=0
  app.get('/api/search', async (req: Request, res: Response) => {
    try {
      const term = req.query.term as string;
      const type = (req.query.type as string) || 'all';
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!term || term.trim().length === 0) {
        return res.status(400).json({ error: 'Search term is required' });
      }

      if (term.trim().length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const results: { posts?: any[]; experiences?: any[] } = {};

      // 타입에 따라 검색 수행
      if (type === 'all' || type === 'posts') {
        results.posts = await storage.searchPosts(term.trim(), { limit, offset });
      }

      if (type === 'all' || type === 'experiences') {
        results.experiences = await storage.searchExperiences(term.trim(), { limit, offset });
      }

      res.json({
        term: term.trim(),
        type,
        ...results,
      });
    } catch (error) {
      console.error('통합 검색 오류:', error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

  return httpServer;
}
