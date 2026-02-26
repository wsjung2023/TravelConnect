import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { storage } from './storage';
import { validateStartupEnv, logEnvStatus } from './middleware/envCheck';
import { syncTranslations } from './syncTranslations';
import { seedSystemConfig } from './seeds/systemConfigSeed';
import { getBooleanConfig, getNumberConfig } from './services/configService';

interface SchedulerHandle {
  name: string;
  intervalId: NodeJS.Timeout | null;
  isProcessing: boolean;
  enabled: boolean;
  intervalMinutes: number;
}

const schedulerHandles: Record<string, SchedulerHandle> = {
  expired_bookings: { name: 'Expired Bookings', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 5 },
  completed_experiences: { name: 'Completed Experiences', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 60 },
  slot_recalculation: { name: 'Slot Recalculation', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 1440 },
  settlement_batch: { name: 'Settlement Batch', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 1 },
};

function stopScheduler(key: string) {
  const handle = schedulerHandles[key];
  if (handle?.intervalId) {
    clearInterval(handle.intervalId);
    handle.intervalId = null;
    handle.enabled = false;
    console.log(`⏹️ Scheduler stopped: ${handle.name}`);
  }
}

function stopAllSchedulers() {
  for (const key of Object.keys(schedulerHandles)) {
    stopScheduler(key);
  }
}

async function startBookingScheduler(storageInstance: typeof storage) {
  console.log('🔄 Checking scheduler configurations from DB...');

  const expiredEnabled = await getBooleanConfig('scheduler', 'expired_bookings_enabled', false);
  const expiredInterval = await getNumberConfig('scheduler', 'expired_bookings_interval_minutes', 5);
  const completedEnabled = await getBooleanConfig('scheduler', 'completed_experiences_enabled', false);
  const completedInterval = await getNumberConfig('scheduler', 'completed_experiences_interval_minutes', 60);
  const slotEnabled = await getBooleanConfig('scheduler', 'slot_recalculation_enabled', false);
  const slotHour = await getNumberConfig('scheduler', 'slot_recalculation_hour', 3);
  const settlementEnabled = await getBooleanConfig('scheduler', 'settlement_batch_enabled', false);

  if (expiredEnabled) {
    const handle = schedulerHandles.expired_bookings;
    handle.enabled = true;
    handle.intervalMinutes = expiredInterval;
    handle.intervalId = setInterval(async () => {
      if (handle.isProcessing) return;
      handle.isProcessing = true;
      try {
        const count = await storageInstance.processExpiredBookings();
        if (count > 0) console.log(`✅ Processed ${count} expired bookings`);
      } catch (error) {
        console.error('❌ Error processing expired bookings:', error);
      } finally {
        handle.isProcessing = false;
      }
    }, expiredInterval * 60 * 1000);
    console.log(`▶️ Expired Bookings scheduler: ON (every ${expiredInterval}min)`);
  } else {
    console.log('⏸️ Expired Bookings scheduler: OFF');
  }

  if (completedEnabled) {
    const handle = schedulerHandles.completed_experiences;
    handle.enabled = true;
    handle.intervalMinutes = completedInterval;
    handle.intervalId = setInterval(async () => {
      if (handle.isProcessing) return;
      handle.isProcessing = true;
      try {
        const count = await storageInstance.processCompletedExperiences();
        if (count > 0) console.log(`✅ Processed ${count} completed experiences`);
      } catch (error) {
        console.error('❌ Error processing completed experiences:', error);
      } finally {
        handle.isProcessing = false;
      }
    }, completedInterval * 60 * 1000);
    console.log(`▶️ Completed Experiences scheduler: ON (every ${completedInterval}min)`);
  } else {
    console.log('⏸️ Completed Experiences scheduler: OFF');
  }

  if (slotEnabled) {
    const handle = schedulerHandles.slot_recalculation;
    handle.enabled = true;
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(slotHour, 0, 0, 0);
    if (now >= nextRun) nextRun.setDate(nextRun.getDate() + 1);
    const delay = nextRun.getTime() - now.getTime();
    console.log(`▶️ Slot Recalculation scheduler: ON (daily at ${slotHour}:00, next: ${nextRun.toISOString()})`);
    setTimeout(async () => {
      const run = async () => {
        if (handle.isProcessing) return;
        handle.isProcessing = true;
        try {
          await storageInstance.recalculateSlotAvailability();
          console.log('✅ Daily slot availability recalculated');
        } catch (error) {
          console.error('❌ Error in slot recalculation:', error);
        } finally {
          handle.isProcessing = false;
        }
      };
      await run();
      handle.intervalId = setInterval(run, 24 * 60 * 60 * 1000);
    }, delay);
  } else {
    console.log('⏸️ Slot Recalculation scheduler: OFF');
  }

  if (settlementEnabled) {
    const handle = schedulerHandles.settlement_batch;
    handle.enabled = true;
    try {
      const { startSettlementScheduler } = await import('./jobs/settlementBatch');
      startSettlementScheduler();
      console.log('▶️ Settlement Batch scheduler: ON');
    } catch (error) {
      console.error('❌ Settlement scheduler failed to start:', error);
    }
  } else {
    console.log('⏸️ Settlement Batch scheduler: OFF');
  }

  console.log('✅ Scheduler initialization complete');
}

export function getSchedulerHandles() {
  return Object.entries(schedulerHandles).map(([key, h]) => ({
    key,
    name: h.name,
    enabled: h.enabled,
    intervalMinutes: h.intervalMinutes,
    isProcessing: h.isProcessing,
  }));
}

export { stopScheduler, stopAllSchedulers, schedulerHandles };

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
