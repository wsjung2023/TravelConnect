import express, { type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';

const app = express();

// Security headers with helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', '*.googleapis.com', '*.gstatic.com'],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'", 
          '*.googleapis.com', 
          '*.gstatic.com',
          'cdnjs.cloudflare.com',
          'replit.com'
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          'fonts.googleapis.com', 
          'fonts.gstatic.com',
          'cdnjs.cloudflare.com'
        ],
        connectSrc: [
          "'self'", 
          'https:', 
          '*.googleapis.com', 
          'wss:'
        ],
        fontSrc: [
          "'self'", 
          'fonts.googleapis.com', 
          'fonts.gstatic.com',
          'cdnjs.cloudflare.com'
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'data:', 'https:'],
        frameSrc: ["'self'", '*.google.com'],
        // Google Maps and external services
        childSrc: ["'self'", '*.google.com'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Referrer-Policy
  })
);

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(status).json({ message });
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
