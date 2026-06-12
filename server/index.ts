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
import { seedPoiData } from './seeds/seedPoiData';
import { runI18nAudit } from './startup/auditI18nKeys';
import {
  startBookingScheduler,
  getSchedulerHandles,
  stopScheduler,
  stopAllSchedulers,
  schedulerHandles,
} from './scheduler';
import { subscriptionScheduler } from './services/subscriptionScheduler';

export { getSchedulerHandles, stopScheduler, stopAllSchedulers, schedulerHandles };

// M-A [해결됨]: 액세스 토큰 영속 폐기 흐름은 services/tokenService.ts(revoked_tokens 테이블)로 일원화됨.
// authenticateToken/authenticateHybrid는 매 요청마다 isAccessTokenRevoked로 차단.
// /api/logout은 Bearer 토큰을 revokeAccessToken으로 DB에 등록한다.
// 아래 글로벌 Set/timestamp는 개발 환경 자동로그인(server/auth.ts:222 분기)에서만 사용되는 보조 신호이며,
// 운영 보안 경로(JWT 검증)와는 무관하다. 서버 재시작 시 초기화되어도 운영 영향 없음.
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

// Security headers with helmet - CSP configured for Google AdSense / PortOne
// T14 검토 결과: unsafe-inline/unsafe-eval 의도적 유지 (PortOne·AdSense·Vite HMR 필요).
// nonce 기반 CSP 전환 시에만 제거 가능 — 별도 빌드 파이프라인 변경 작업으로 분리.
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
        "*.portone.io",
        "cdn.paddle.com"
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
        "api.portone.io",
        "*.iamport.co",
        "checkout-service.prod.iamport.co",
        "api.paddle.com",
        "sandbox-api.paddle.com"
      ],
      mediaSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: [
        "'self'",
        "*.googlesyndication.com",
        "*.doubleclick.net",
        "*.portone.io",
        "checkout.portone.io",
        "*.iamport.co",
        "cdn.paddle.com",
        "checkout.paddle.com"
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
// 번역 API는 앱 로드 시 6언어×5네임스페이스=30개 동시 요청 발생 → 별도 완화 처리
app.use('/api/translations/', rateLimit({ windowMs: 60_000, max: 600 })); // 번역 분당 600회 (언어×네임스페이스 버스트 허용)
app.use('/api/', rateLimit({ windowMs: 60_000, max: 200, skip: (req) => req.path.startsWith('/translations/') })); // 1분 200회 (일반 API, 번역 제외)
// 로그인/회원가입만 엄격하게, /me는 제외 (자주 호출됨)
app.use('/api/auth/login', rateLimit({ windowMs: 60_000, max: 10 })); // 로그인 분당 10회
app.use('/api/auth/register', rateLimit({ windowMs: 60_000, max: 10 })); // 회원가입 분당 10회
app.use('/api/auth/demo-login', rateLimit({ windowMs: 60_000, max: 10 })); // 데모 로그인 분당 10회

// Capture raw body for Paddle webhook signature verification
app.use('/api/webhooks/paddle', (req, _res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => { data += chunk; });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const startupSyncMode = process.env.STARTUP_SYNC_MODE || 'off';

function shouldRunStartupSync() {
  return startupSyncMode !== 'off';
}

function shouldRunSystemConfigSeed() {
  return startupSyncMode === 'full';
}


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

  // T3: 구독 자동 갱신 스케줄러 (24시간 주기). 환경변수 SUBSCRIPTION_SCHEDULER_ENABLED=true 일 때만 활성.
  // 결제 자동 갱신이므로 PortOne 테스트 모드/실서버 검증 후 ON 권장.
  const schedulerEnabled = process.env.SUBSCRIPTION_SCHEDULER_ENABLED === 'true';
  const isPaddle = (process.env.PAYMENT_PROVIDER || 'paddle') === 'paddle';
  if (schedulerEnabled && !isPaddle) {
    setInterval(() => {
      subscriptionScheduler.runDailyScheduler().catch((err) =>
        console.error('[SubscriptionScheduler] runDailyScheduler error:', err)
      );
    }, 24 * 60 * 60 * 1000);
    console.log('▶️ Subscription renewal scheduler: ON (every 24h)');
  } else {
    const reason = isPaddle ? 'Paddle manages renewals automatically' : 'SUBSCRIPTION_SCHEDULER_ENABLED is not true';
    console.log(`⏸️ Subscription renewal scheduler: OFF (${reason})`);
  }

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
    // 수정: throw err 제거 — 응답 전송 후 재throw는 unhandledRejection 발생시켜 프로세스 중단 위험.
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

      if (shouldRunStartupSync()) {
        console.log(`[Startup Sync] Enabled (mode=${startupSyncMode})`);

        syncTranslations()
          .catch((err) => console.error('Translation sync failed:', err))
          .then(() => runI18nAudit().catch((err) => console.error('i18n audit failed:', err)));

        seedPoiData().catch((err) => {
          console.error('POI seed failed:', err);
        });

        if (shouldRunSystemConfigSeed()) {
          seedSystemConfig().then((result) => {
            console.log(`[SystemConfig Seed] Result: ${result.created} created, ${result.skipped} skipped`);
          }).catch((err) => {
            console.error('SystemConfig seed failed:', err);
          });
        } else {
          console.log('[Startup Sync] SystemConfig seeding skipped (mode is not full)');
        }
      } else {
        console.log('[Startup Sync] Disabled — translation/POI/config seeds skipped');
      }
    }
  );
})();
