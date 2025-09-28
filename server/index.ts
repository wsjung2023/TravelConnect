import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';

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

const app = express();

// Security headers with helmet
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 })); // 1분 120회
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 20 })); // 로그인/회원가입엔 더 촘촘히

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
    }
  );
})();
