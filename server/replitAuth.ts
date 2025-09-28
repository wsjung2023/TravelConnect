import * as client from 'openid-client';
import { Strategy, type VerifyFunction } from 'openid-client/passport';

import passport from 'passport';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import memoize from 'memoizee';

// 로그아웃된 세션 ID를 추적하는 메모리 저장소
const loggedOutSessions = new Set<string>();
// 로그아웃 시간을 추적 (개발 모드에서 짧은 시간 동안 모든 세션을 로그아웃으로 간주)
let lastLogoutTime = 0;
// 전역 접근을 위해 global에 저장
(global as any).loggedOutSessions = loggedOutSessions;
(global as any).lastLogoutTime = () => lastLogoutTime;
import connectPg from 'connect-pg-simple';
import { storage } from './storage';

// 환경 의존적 설정 - REPLIT_DOMAINS가 없으면 no-op으로 동작
const isReplitEnvironment = !!process.env.REPLIT_DOMAINS;

const getOidcConfig = memoize(
  async () => {
    if (!isReplitEnvironment) {
      throw new Error('OIDC config not available in non-Replit environment');
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? 'https://replit.com/oidc'),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  if (!isReplitEnvironment) {
    // no-op 세션 (JWT 인증 사용 시)
    return (req: any, res: any, next: any) => next();
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims['sub'],
    email: claims['email'],
    firstName: claims['first_name'],
    lastName: claims['last_name'],
    profileImageUrl: claims['profile_image_url'],
  });
}

export async function setupAuth(app: Express) {
  if (!isReplitEnvironment) {
    console.log('💡 Replit OIDC 인증을 건너뜀 - JWT 인증 사용 중');
    return; // Replit 환경이 아니면 OIDC 설정 건너뛰기
  }

  console.log('🔐 Replit OIDC 인증 설정 시작');
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const user = { id: claims['sub'] }; // 사용자 ID 포함
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(',')) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: 'openid email profile offline_access',
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get('/api/login', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: 'login consent',
      scope: ['openid', 'email', 'profile', 'offline_access'],
    })(req, res, next);
  });

  app.get('/api/callback', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: '/',
      failureRedirect: '/api/login',
    })(req, res, next);
  });

  app.get('/api/logout', (req, res) => {
    console.log(`[LOGOUT] Starting logout process`);
    console.log(`[LOGOUT] Session before logout:`, req.session ? 'EXISTS' : 'NOT EXISTS');
    
    // 세션 ID를 로그아웃 세션 목록에 추가 (개발 모드에서 자동 재로그인 방지)
    if (req.sessionID) {
      loggedOutSessions.add(req.sessionID);
      lastLogoutTime = Date.now();
      console.log(`[LOGOUT] Added session ${req.sessionID} to logged out sessions`);
      console.log(`[LOGOUT] Set logout time to ${lastLogoutTime}`);
    }
    
    req.logout(() => {
      console.log(`[LOGOUT] req.logout() completed, session after:`, req.session ? 'EXISTS' : 'NOT EXISTS');
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
  
  console.log('✅ Replit OIDC 인증 설정 완료');
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!isReplitEnvironment) {
    // Replit 환경이 아니면 JWT 인증을 사용하므로 여기서는 패스
    return res.status(401).json({ message: 'Use JWT authentication instead' });
  }
  
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
};
