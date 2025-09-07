import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { storage } from './storage';
import { tripsRouter } from './routes/trips';
import { setupAuth, isAuthenticated } from './replitAuth';
// import { setupGoogleAuth } from './googleAuth'; // 모듈 없음으로 주석 처리
import passport from 'passport';
import {
  authenticateToken,
  requireAdmin,
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isValidPassword,
  generateUserId,
  AuthRequest,
} from './auth';
import {
  insertExperienceSchema,
  insertPostSchema,
  insertBookingSchema,
  insertTripSchema,
  insertTimelineSchema,
} from '@shared/schema';
import {
  LoginSchema,
  RegisterSchema,
  CreatePostSchema,
  CreateTimelineSchema,
  CreateEventSchema,
  CreateBookingSchema,
  SendMessageSchema,
  FollowUserSchema,
  UpdateBookingStatusSchema,
  CreateConversationSchema,
  UpdateProfileOpenSchema,
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

  // DB Admin interface
  app.get('/db-admin', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'db-admin.html'));
  });

  // SQL execution endpoint for DB admin
  app.post('/api/sql', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // 기본적인 보안 검사
      const dangerousPatterns = [
        /drop\s+database/i,
        /drop\s+schema/i,
        /truncate\s+table/i,
        /alter\s+table.*drop/i,
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

  // Passport 초기화
  app.use(passport.initialize());

  // Google OAuth 설정
  // setupGoogleAuth(app); // googleAuth 모듈 없음으로 주석 처리

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
  app.patch('/api/profile/open', isAuthenticated, apiLimiter, validateSchema(UpdateProfileOpenSchema), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { open, region } = req.validatedData;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
      }

      // 프로필 업데이트
      const updatedUser = await storage.updateUser(userId, {
        openToMeet: open,
        regionCode: region,
        updatedAt: new Date(),
      });

      res.json({
        message: '프로필이 업데이트되었습니다',
        openToMeet: updatedUser.openToMeet,
        regionCode: updatedUser.regionCode,
      });
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      res.status(500).json({ message: '프로필 업데이트 중 오류가 발생했습니다' });
    }
  });

  // JWT 기반 사용자 정보 조회
  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
      }
      res.json(user);
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      res
        .status(500)
        .json({ message: '사용자 정보 조회 중 오류가 발생했습니다' });
    }
  });

  // Replit Auth 사용자 조회 (호환성 유지)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
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

  app.post('/api/experiences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const experienceData = insertExperienceSchema.parse({
        ...req.body,
        hostId: userId,
      });
      const experience = await storage.createExperience(experienceData);
      res.status(201).json(experience);
    } catch (error) {
      console.error('Error creating experience:', error);
      res.status(500).json({ message: 'Failed to create experience' });
    }
  });

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

  // Timeline routes
  app.post('/api/timelines', isAuthenticated, apiLimiter, validateSchema(CreateTimelineSchema), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/timelines', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const limit = parseInt(req.query.limit as string) || 50; // 모든 피드를 가져오도록 증가
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getPosts(limit, offset);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Delete post (Admin only)
  app.delete('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const postId = parseInt(req.params.id);
      const success = await storage.deletePost(postId);

      if (success) {
        res.json({ message: 'Post deleted successfully' });
      } else {
        res.status(404).json({ message: 'Post not found' });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // 파일 업로드 엔드포인트
  app.post(
    '/api/upload',
    isAuthenticated,
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

        const uploadedFiles = req.files.map((file: any) => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/api/files/${file.filename}`, // 보안 프록시 URL로 변경
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

  // Like/Unlike post
  app.post('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.id);

      console.log('좋아요 요청:', { userId, postId });

      const isLiked = await storage.toggleLike(userId, postId);

      console.log('좋아요 결과:', isLiked);

      res.json({ isLiked, message: isLiked ? '좋아요!' : '좋아요 취소' });
    } catch (error) {
      console.error('좋아요 오류:', error);
      res.status(500).json({ message: '좋아요 처리 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postData = insertPostSchema.parse({
        ...req.body,
        userId,
      });
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  app.post('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const postId = parseInt(req.params.id);
      const isLiked = await storage.toggleLike(userId, postId);
      res.json({ isLiked });
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ message: 'Failed to toggle like' });
    }
  });

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // System Settings API - 관리자 전용
  app.get(
    '/api/system-settings',
    requireAdmin as any,
    async (req: any, res) => {
      try {
        const settings = await storage.getAllSystemSettings();
        res.json(settings);
      } catch (error) {
        console.error('Error fetching system settings:', error);
        res.status(500).json({ message: 'Failed to fetch system settings' });
      }
    }
  );

  app.put(
    '/api/system-settings/:id',
    requireAdmin as any,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        const setting = await storage.updateSystemSetting(id, updates);
        if (!setting) {
          return res.status(404).json({ message: 'Setting not found' });
        }
        res.json(setting);
      } catch (error) {
        console.error('Error updating system setting:', error);
        res.status(500).json({ message: 'Failed to update system setting' });
      }
    }
  );

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const guestId = req.user.claims.sub;
      const bookingData = insertBookingSchema.parse({
        ...req.body,
        guestId,
      });
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
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
  app.get('/api/conversations', isAuthenticated, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get(
    '/api/conversations/:id/messages',
    isAuthenticated,
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

  app.post('/api/conversations', isAuthenticated, apiLimiter, validateSchema(CreateConversationSchema), async (req: any, res) => {
    try {
      const participant1Id = req.user.claims.sub;
      const { participant2Id } = req.validatedData;
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
  app.get('/api/trips', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trips = await storage.getTripsByUser(userId);
      res.json(trips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      res.status(500).json({ message: 'Failed to fetch trips' });
    }
  });

  app.post('/api/trips', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tripData = insertTripSchema.parse({
        ...req.body,
        userId,
      });
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      console.error('Error creating trip:', error);
      res.status(500).json({ message: 'Failed to create trip' });
    }
  });

  // User profile routes
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bio, location, isHost } = req.body;

      const existingUser = await storage.getUser(userId);
      if (existingUser) {
        const user = await storage.upsertUser({
          id: userId,
          email: existingUser.email || 'unknown@example.com',
          bio,
          location,
          isHost,
        });
        res.json(user);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Trips 라우터 추가
  app.use('/api/trips', tripsRouter);
  
  // 업로드된 파일 정적 서빙 (개발 환경에서만 직접 접근 허용)
  if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  }
  // 프로덕션에서는 향후 토큰 검증 미들웨어 구현 예정

  const httpServer = createServer(app);

  // WebSocket setup for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    let userId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          userId = message.userId;
          if (userId) {
            clients.set(userId, ws);
            ws.send(JSON.stringify({ type: 'auth_success' }));
          }
          return;
        }

        if (message.type === 'chat_message' && userId) {
          const { conversationId, content, recipientId } = message;

          // Save message to database
          const newMessage = await storage.createMessage({
            conversationId,
            senderId: userId,
            content,
          });

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
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });

  return httpServer;
}
