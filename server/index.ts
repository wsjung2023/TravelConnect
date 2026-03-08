// 서버 진입점 — Express 앱 초기화, 미들웨어·라우터 등록, WebSocket·스케줄러 설정, HTTP 서버 시작을 담당한다.
import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { storage } from './storage';
import { validateStartupEnv, logEnvStatus } from './middleware/envCheck';
import { syncTranslations } from './seeds/syncTranslations';
import { seedSystemConfig } from './seeds/systemConfigSeed';
import {
  startBookingScheduler,
  getSchedulerHandles,
  stopScheduler,
  stopAllSchedulers,
  schedulerHandles,
} from './scheduler';

export { getSchedulerHandles, stopScheduler, stopAllSchedulers, schedulerHandles };

// 글로벌 변수 초기화 (로그아웃 추적용)
global.loggedOutSessions = new Set<string>();
global.lastLogoutTime = 0;

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Don't send development errors to production Sentry
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_SEND_DEV_ERRORS) {
        console.log('[Sentry] Development error (not sent):', event.exception?.values?.[0]?.value);
        return null;
      }
      return event;
    },
  });
  console.log('[Sentry] Initialized for', process.env.NODE_ENV || 'development');
}

// 환경 변수 검증 및 로그 출력
logEnvStatus();
const envValidation = validateStartupEnv();
if (!envValidation.valid) {
  console.error('❌ 환경 변수 검증 실패!');
  if (process.env.NODE_ENV === 'production') {
    console.error('프로덕션 환경에서 필수 환경 변수가 누락되었습니다. 서버를 시작하기 전에 설정해주세요.');
    process.exit(1);
  }
}

const app = express();

// Security headers with helmet - CSP configured for Google AdSense
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "*.googleapis.com",
        "*.gstatic.com",
        "*.googlesyndication.com",
        "pagead2.googlesyndication.com",
        "*.google.com",
        "*.doubleclick.net",
        "cdn.portone.io",
        "*.portone.io"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "fonts.googleapis.com",
        "cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "fonts.gstatic.com",
        "cdnjs.cloudflare.com",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "*.unsplash.com",
        "*.googleusercontent.com",
        "*.googlesyndication.com",
        "*.doubleclick.net"
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "ws:",
        "*.googleapis.com",
        "*.replit.app",
        "*.replit.dev",
        "*.googlesyndication.com",
        "*.google.com",
        "*.portone.io",
        "api.portone.io"
      ],
      mediaSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: [
        "'self'",
        "*.googlesyndication.com",
        "*.doubleclick.net",
        "*.portone.io",
        "checkout.portone.io"
      ]
    }
  }
}));

// Trust proxy for Replit environment (only trust first proxy for security)
app.set('trust proxy', 1);

// SEO 301 리다이렉트 - 이전 sitemap에 있던 경로들을 홈으로 리다이렉트
// 구글 인덱스에 남아있는 잘못된 URL들에 대한 처리
app.get('/map', (req, res) => res.redirect(301, '/'));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 60_000, max: 200 })); // 1분 200회 (일반 API)
// 로그인/회원가입만 엄격하게, /me는 제외 (자주 호출됨)
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: 10 })); // 로그인 분당 10회
app.use('/api/auth/register', rateLimit({ windowMs: 60_000, max: 10 })); // 회원가입 분당 10회
app.use('/api/auth/demo-login', rateLimit({ windowMs: 60_000, max: 10 })); // 데모 로그인 분당 10회

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

// Production security middleware - block admin routes
if (process.env.NODE_ENV === 'production') {
  const blockedRoutes = ['/db-admin', '/api/sql', '/download_backup', '/simple_download'];
  app.use((req, res, next) => {
    // Check if request path starts with any blocked route
    const isBlocked = blockedRoutes.some(route => req.path.startsWith(route));
    
    if (isBlocked) {
      return res.status(403).json({
        error: 'Access forbidden',
        code: 'ADMIN_ACCESS_DENIED',
        message: 'Admin interface is not available in production mode'
      });
    }
    
    next();
  });
}

(async () => {
  const server = await registerRoutes(app);

  // 스케줄러 시작 (DB system_config 기반으로 ON/OFF 판단)
  startBookingScheduler(storage);

  // Global error handler with Sentry integration
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    // Log error for debugging
    console.error('[Server Error]', {
      status,
      message,
      stack: err.stack,
      url: _req.url,
      method: _req.method
    });
    
    // Capture error with Sentry (if not already captured)
    if (status >= 500) {
      Sentry.captureException(err);
    }

    res.status(status).json({ 
      message: status >= 500 ? 'Internal Server Error' : message,
      ...(process.env.NODE_ENV === 'development' && { debug: err.stack })
    });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    // Block admin HTML files in production
    const adminFiles = ['db-admin.html', 'download_backup.html', 'simple_download.html'];
    app.use((req, res, next) => {
      const requestedFile = req.path.split('/').pop();
      if (adminFiles.includes(requestedFile || '')) {
        return res.status(403).json({
          error: 'Access forbidden',
          code: 'ADMIN_ACCESS_DENIED',
          message: 'Admin interface is not available in production mode'
        });
      }
      next();
    });
    
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(
    {
      port,
      host: '0.0.0.0',
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // 번역 데이터 동기화 (서버 시작 후 백그라운드에서 실행)
      syncTranslations().catch((err) => {
        console.error('Translation sync failed:', err);
      });
      
      // 시스템 설정 시드 (DB 기반 설정값 초기화)
      seedSystemConfig().then((result) => {
        console.log(`[SystemConfig Seed] Result: ${result.created} created, ${result.skipped} skipped`);
      }).catch((err) => {
        console.error('SystemConfig seed failed:', err);
      });
    }
  );
})();
