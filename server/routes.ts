import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { storage } from './storage';
import { tripsRouter } from './routes/trips';
//import { setupAuth, authenticateToken } from './replitAuth';
//import { authenticateToken } from "./auth";
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
  insertCommentSchema,
  insertBookingSchema,
  insertTripSchema,
  insertTimelineSchema,
  insertNotificationSchema,
  insertMiniMeetSchema,
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
  CreateMiniMeetSchema,
  JoinMiniMeetSchema,
  GetMiniMeetsSchema,
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
  // Test error endpoint for Sentry testing (development only)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/test-error', (req, res) => {
      throw new Error('Test server error for Sentry integration!');
    });
  }

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
  app.patch('/api/profile/open', authenticateToken, apiLimiter, validateSchema(UpdateProfileOpenSchema), async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { open, region } = req.validatedData;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
      }

      // 프로필 업데이트
      const updatedUser = await storage.updateUser(userId, {
        openToMeet: open,
        regionCode: region,
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
      res.status(201).json(experience);
    } catch (error) {
      console.error('Error creating experience:', error);
      res.status(500).json({ message: 'Failed to create experience' });
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
  app.delete('/api/posts/:id', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
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
  app.post('/api/posts/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;  // JWT에서는 .id로 접근
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
          const timeline = await storage.getTimeline(postData.timelineId);
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
          
          const uniqueDates = [...new Set(allDates)].sort((a, b) => 
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
      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  // Comments API
  app.post('/api/posts/:id/comments', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;  // JWT에서는 .id로 접근
      const postId = parseInt(req.params.id);
      const commentData = insertCommentSchema.parse({
        postId,
        userId,
        content: req.body.content,
      });

      const newComment = await storage.createComment(commentData);
      console.log('댓글 생성 성공:', newComment);
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
  app.get('/api/profile/open', authenticateToken, async (req: AuthRequest, res) => {
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
        profileImageUrl: user.profileImageUrl
      })));
    } catch (error) {
      console.error('Error fetching open users:', error);
      res.status(500).json({ message: 'Failed to fetch open users' });
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

  app.post('/api/bookings', authenticateToken, async (req: any, res) => {
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

  app.patch('/api/bookings/:id', authenticateToken, async (req: any, res) => {
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

  app.post('/api/conversations', authenticateToken, apiLimiter, validateSchema(CreateConversationSchema), async (req: any, res) => {
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
  app.patch('/api/user/profile', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
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
      const notificationId = parseInt(req.params.id);
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
      const notificationId = parseInt(req.params.id);
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
          message: `${follower.username}님이 회원님을 팔로우하기 시작했습니다.`,
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
  // 모임 생성
  app.post('/api/mini-meets', authenticateToken, apiLimiter, validateSchema(CreateMiniMeetSchema), async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      const meetData = {
        ...req.validatedData,
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
  });

  // 근처 모임 조회
  app.get('/api/mini-meets', async (req, res) => {
    try {
      const { lat, lng, radius = 5 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          message: '위도와 경도는 필수 입니다' 
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = parseFloat(radius as string);

      if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
        return res.status(400).json({ 
          message: '올바른 숫자 값을 입력해주세요' 
        });
      }

      const miniMeets = await storage.getMiniMeetsNearby(latitude, longitude, searchRadius);
      res.json(miniMeets);
    } catch (error) {
      console.error('근처 모임 조회 오류:', error);
      res.status(500).json({ message: '근처 모임 조회에 실패했습니다' });
    }
  });

  // 모임 상세 조회
  app.get('/api/mini-meets/:id', async (req, res) => {
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
  });

  // 모임 참여
  app.post('/api/mini-meets/:id/join', authenticateToken, apiLimiter, async (req: any, res) => {
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
          message: `${participant.username}님이 "${meet.title}" 모임에 참가했습니다.`,
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
  });

  // 모임 나가기
  app.delete('/api/mini-meets/:id/leave', authenticateToken, apiLimiter, async (req: any, res) => {
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
  });

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

  return httpServer;
}
