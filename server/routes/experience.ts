/**
 * ============================================
 * 경험 라우터 (Experience Router)
 * ============================================
 * 
 * 이 모듈은 호스트가 제공하는 경험(Experience) 관련 API를 관리합니다.
 * 
 * 주요 기능:
 * - 경험 CRUD (생성, 조회, 수정, 삭제)
 * - 경험 검색 및 필터링
 * - 리뷰 조회
 * - 가이드 정보 조회
 * - 호스트 대시보드
 * 
 * 경험 유형:
 * - tour: 투어
 * - food: 음식 체험
 * - activity: 액티비티
 * - culture: 문화 체험
 * - adventure: 어드벤처
 * 
 * 비즈니스 규칙:
 * - 호스트(isHost=true)만 경험 생성 가능
 * - 본인 경험만 수정/삭제 가능
 * - 활성 예약이 있으면 삭제 불가
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  AuthRequest,
} from '../auth';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// 경험 목록 조회
// ============================================
// GET /api/experiences
// 공개된 모든 경험을 조회합니다.
// 쿼리 파라미터: category, location, minPrice, maxPrice, limit, offset
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      location,
      minPrice,
      maxPrice,
      limit = '20',
      offset = '0',
    } = req.query;

    const experiences = await storage.getExperiences({
      category: category as string,
      location: location as string,
      minPrice: minPrice ? parseInt(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json(experiences);
  } catch (error) {
    console.error('경험 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// ============================================
// 경험 상세 조회
// ============================================
// GET /api/experiences/:id
// 특정 경험의 상세 정보를 조회합니다.
// 호스트 정보, 리뷰, 가용 슬롯 등 포함
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const experience = await storage.getExperienceById(parseInt(req.params.id));
    
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    res.json(experience);
  } catch (error) {
    console.error('경험 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch experience' });
  }
});

// ============================================
// 경험 생성
// ============================================
// POST /api/experiences
// 새 경험을 생성합니다.
// 호스트(isHost=true)만 생성 가능
router.post('/', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 호스트 권한 확인
    const user = await storage.getUser(req.user.id);
    if (!user?.isHost && user?.userType !== 'host') {
      return res.status(403).json({ error: 'Only hosts can create experiences' });
    }

    const experience = await storage.createExperience({
      hostId: req.user.id,
      ...req.body,
    });

    res.status(201).json(experience);
  } catch (error) {
    console.error('경험 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create experience' });
  }
});

// ============================================
// 경험 수정
// ============================================
// PATCH /api/experiences/:id
// 본인의 경험을 수정합니다.
router.patch('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const experienceId = parseInt(req.params.id);
    const experience = await storage.getExperienceById(experienceId);

    // 존재 여부 확인
    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // 소유권 확인 (본인만 수정 가능)
    if (experience.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this experience' });
    }

    const updatedExperience = await storage.updateExperience(experienceId, req.body);
    res.json(updatedExperience);
  } catch (error) {
    console.error('경험 수정 오류:', error);
    res.status(500).json({ error: 'Failed to update experience' });
  }
});

// ============================================
// 경험 삭제
// ============================================
// DELETE /api/experiences/:id
// 본인의 경험을 삭제합니다.
// 활성 예약이 있으면 삭제 불가
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const experienceId = parseInt(req.params.id);
    const experience = await storage.getExperienceById(experienceId);

    if (!experience) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    // 소유권 확인
    if (experience.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this experience' });
    }

    // 활성 예약 확인
    const activeBookings = await storage.getActiveBookingsForExperience(experienceId);
    if (activeBookings && activeBookings.length > 0) {
      return res.status(400).json({ error: 'Cannot delete experience with active bookings' });
    }

    await storage.deleteExperience(experienceId);
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('경험 삭제 오류:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
});

// ============================================
// 경험 리뷰 조회
// ============================================
// GET /api/experiences/:id/reviews
// 경험에 대한 모든 리뷰를 조회합니다.
router.get('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const experienceId = parseInt(req.params.id);
    const reviews = await storage.getExperienceReviews(experienceId);
    res.json(reviews);
  } catch (error) {
    console.error('리뷰 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ============================================
// 가이드 정보 조회
// ============================================
// GET /api/guide/:id
// 특정 가이드(호스트)의 프로필 정보를 조회합니다.
router.get('/guide/:id', async (req: Request, res: Response) => {
  try {
    const guide = await storage.getUser(req.params.id);
    
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }

    // 민감한 정보 제외
    res.json({
      id: guide.id,
      firstName: guide.firstName,
      lastName: guide.lastName,
      bio: guide.bio,
      profileImageUrl: guide.profileImageUrl,
      location: guide.location,
      languages: guide.languages,
      isHost: guide.isHost,
      createdAt: guide.createdAt,
    });
  } catch (error) {
    console.error('가이드 정보 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch guide' });
  }
});

// ============================================
// 가이드 경험 목록 조회
// ============================================
// GET /api/guide/:id/experiences
// 특정 가이드의 모든 경험을 조회합니다.
router.get('/guide/:id/experiences', async (req: Request, res: Response) => {
  try {
    const experiences = await storage.getExperiencesByHost(req.params.id);
    res.json(experiences);
  } catch (error) {
    console.error('가이드 경험 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch guide experiences' });
  }
});

// ============================================
// 가이드 포스트 조회
// ============================================
// GET /api/guide/:id/posts
// 특정 가이드의 모든 포스트를 조회합니다.
router.get('/guide/:id/posts', async (req: Request, res: Response) => {
  try {
    const posts = await storage.getPosts({ userId: req.params.id });
    res.json(posts);
  } catch (error) {
    console.error('가이드 포스트 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch guide posts' });
  }
});

// ============================================
// 가이드 리뷰 조회
// ============================================
// GET /api/guide/:id/reviews
// 특정 가이드의 모든 리뷰를 조회합니다.
router.get('/guide/:id/reviews', async (req: Request, res: Response) => {
  try {
    const reviews = await storage.getGuideReviews(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error('가이드 리뷰 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch guide reviews' });
  }
});

// ============================================
// 호스트 경험 목록 조회 (대시보드용)
// ============================================
// GET /api/host/experiences
// 현재 호스트의 경험 목록을 조회합니다.
router.get('/host/experiences', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const experiences = await storage.getExperiencesByHost(req.user.id);
    res.json(experiences);
  } catch (error) {
    console.error('호스트 경험 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch host experiences' });
  }
});

// ============================================
// 호스트 예약 목록 조회 (대시보드용)
// ============================================
// GET /api/host/bookings
// 현재 호스트의 예약 목록을 조회합니다.
router.get('/host/bookings', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookings = await storage.getHostBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    console.error('호스트 예약 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch host bookings' });
  }
});

// ============================================
// 호스트 예약 상태 변경
// ============================================
// PATCH /api/host/bookings/:id/status
// 예약 상태를 변경합니다. (확정, 거절, 완료 등)
router.patch('/host/bookings/:id/status', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookingId = parseInt(req.params.id);
    const { status } = req.body;

    // 유효한 상태값 확인
    const validStatuses = ['confirmed', 'rejected', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // 예약 조회
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // 호스트 권한 확인
    const experience = await storage.getExperienceById(booking.experienceId);
    if (!experience || experience.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    const updatedBooking = await storage.updateBookingStatus(bookingId, status);
    res.json(updatedBooking);
  } catch (error) {
    console.error('예약 상태 변경 오류:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// ============================================
// 호스트 정산 내역 조회
// ============================================
// GET /api/host/payouts
// 현재 호스트의 정산 내역을 조회합니다.
router.get('/host/payouts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payouts = await storage.getHostPayouts(req.user.id);
    res.json(payouts);
  } catch (error) {
    console.error('호스트 정산 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch host payouts' });
  }
});

export const experienceRouter = router;
