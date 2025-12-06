/**
 * ============================================
 * 타임라인 라우터 (Timeline Router)
 * ============================================
 * 
 * 이 모듈은 여행 타임라인 관련 API를 관리합니다.
 * 타임라인은 여러 포스트를 시간순으로 묶은 여행 기록입니다.
 * 
 * 주요 기능:
 * - 타임라인 CRUD (생성, 조회, 수정, 삭제)
 * - 타임라인 포스트 관리
 * - 여행 계획 (Trip) 관리
 * - 타임라인 복제
 * 
 * 타임라인 구조:
 * - Timeline: 여행 전체 기록
 *   └── Posts: 타임라인에 속한 개별 포스트들
 *       - 위치, 시간, 미디어, 감정 태그 포함
 * 
 * 비즈니스 규칙:
 * - 본인 타임라인만 수정/삭제 가능
 * - 공개 타임라인은 누구나 조회 가능
 * - 타임라인 복제 시 포스트는 복사되지 않음 (구조만 복제)
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import {
  authenticateToken,
  AuthRequest,
} from '../auth';
import { CreateTimelineSchema } from '@shared/api/schema';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
});

// 스키마 검증 미들웨어
function validateSchema(schema: any) {
  return (req: any, res: Response, next: Function) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.errors,
        });
      }
      req.validatedData = result.data;
      next();
    } catch (error) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  };
}

// ============================================
// 타임라인 생성
// ============================================
// POST /api/timelines
// 새 타임라인을 생성합니다.
router.post('/', authenticateToken, apiLimiter, validateSchema(CreateTimelineSchema), async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, startDate, endDate, visibility, coverImageUrl } = req.validatedData;

    const timeline = await storage.createTimeline({
      userId: req.user.id,
      title,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      visibility: visibility || 'public',
      coverImageUrl: coverImageUrl || null,
    });

    res.status(201).json(timeline);
  } catch (error) {
    console.error('타임라인 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create timeline' });
  }
});

// ============================================
// 타임라인 목록 조회
// ============================================
// GET /api/timelines
// 현재 사용자의 모든 타임라인을 조회합니다.
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timelines = await storage.getTimelines(req.user.id);
    res.json(timelines);
  } catch (error) {
    console.error('타임라인 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch timelines' });
  }
});

// ============================================
// 타임라인 상세 조회
// ============================================
// GET /api/timelines/:id
// 특정 타임라인의 상세 정보를 조회합니다.
// 포함 정보: 타임라인 메타데이터, 포스트 목록
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const timelineId = parseInt(req.params.id);
    const timeline = await storage.getTimeline(timelineId);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    // 비공개 타임라인은 소유자만 조회 가능
    // TODO: 인증 상태 확인 후 처리

    res.json(timeline);
  } catch (error) {
    console.error('타임라인 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// ============================================
// 타임라인 수정
// ============================================
// PATCH /api/timelines/:id
// 본인의 타임라인을 수정합니다.
router.patch('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timelineId = parseInt(req.params.id);
    const timeline = await storage.getTimeline(timelineId);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    // 소유권 확인
    if (timeline.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this timeline' });
    }

    const updatedTimeline = await storage.updateTimeline(timelineId, req.body);
    res.json(updatedTimeline);
  } catch (error) {
    console.error('타임라인 수정 오류:', error);
    res.status(500).json({ error: 'Failed to update timeline' });
  }
});

// ============================================
// 타임라인 삭제
// ============================================
// DELETE /api/timelines/:id
// 본인의 타임라인을 삭제합니다.
// 포함된 포스트는 타임라인에서 연결만 해제됨
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timelineId = parseInt(req.params.id);
    const timeline = await storage.getTimeline(timelineId);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    // 소유권 확인
    if (timeline.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this timeline' });
    }

    await storage.deleteTimeline(timelineId);
    res.json({ message: 'Timeline deleted successfully' });
  } catch (error) {
    console.error('타임라인 삭제 오류:', error);
    res.status(500).json({ error: 'Failed to delete timeline' });
  }
});

// ============================================
// 여행 계획 목록 조회
// ============================================
// GET /api/trips
// 현재 사용자의 모든 여행 계획을 조회합니다.
router.get('/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trips = await storage.getTrips(req.user.id);
    res.json(trips);
  } catch (error) {
    console.error('여행 계획 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// ============================================
// 여행 계획 생성
// ============================================
// POST /api/trips
// 새 여행 계획을 생성합니다.
router.post('/trips', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trip = await storage.createTrip({
      userId: req.user.id,
      ...req.body,
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('여행 계획 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// ============================================
// 여행 계획 복제
// ============================================
// POST /api/trips/:id/clone
// 다른 사용자의 여행 계획을 복제합니다.
// 구조만 복사되고 포스트는 포함되지 않음
router.post('/trips/:id/clone', authenticateToken, apiLimiter, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tripId = parseInt(req.params.id);
    const originalTrip = await storage.getTrip(tripId);

    if (!originalTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // 여행 계획 복제
    const clonedTrip = await storage.cloneTrip(tripId, req.user.id);

    // 원작자에게 알림 보내기 (자신의 여행을 복제한 경우 제외)
    if (originalTrip.userId !== req.user.id) {
      const cloner = await storage.getUser(req.user.id);

      await storage.createNotification({
        userId: originalTrip.userId,
        type: 'timeline_followed',
        title: 'Someone followed your trip!',
        message: `${cloner?.firstName || 'A traveler'} saved your trip plan: "${originalTrip.title}"`,
        relatedUserId: req.user.id,
        relatedTimelineId: tripId,
      });
    }

    res.status(201).json(clonedTrip);
  } catch (error) {
    console.error('여행 계획 복제 오류:', error);
    res.status(500).json({ error: 'Failed to clone trip' });
  }
});

export const timelineRouter = router;
