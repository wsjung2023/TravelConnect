/**
 * ============================================
 * AI 라우터 (AI Router)
 * ============================================
 * 
 * 이 모듈은 AI 기반 기능 관련 API를 관리합니다.
 * 
 * 주요 기능:
 * - Mini Concierge: 1시간 액티비티 플래너
 * - CineMap: 여행 영상 스토리보드 생성
 * - AI Concierge: 개인화된 AI 여행 어시스턴트
 * 
 * AI 모델:
 * - OpenAI GPT-5.1 사용
 * - 환경 변수: OPENAI_API_KEY
 * 
 * 사용량 제한:
 * - Free 플랜: AI 메시지 30회/월, 번역 50회/월
 * - 유료 플랜: 무제한 또는 증가된 제한
 * - Trip Pass: 7일간 무제한
 * 
 * 비즈니스 규칙:
 * - 모든 AI 요청은 checkAiUsage 미들웨어로 사용량 검증
 * - 위치 기반 컨텍스트 활용
 * - 사용자 프로필 및 관심사 기반 개인화
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  AuthRequest,
} from '../auth';
import { checkAiUsage } from '../middleware/checkAiUsage';
import { requireAiEnv } from '../middleware/envCheck';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// Mini Concierge 상태 확인
// ============================================
// GET /api/mini-concierge/status
// Mini Concierge 서비스의 활성화 상태를 확인합니다.
router.get('/mini-concierge/status', (req: Request, res: Response) => {
  res.json({ enabled: true });
});

// ============================================
// Mini Concierge 플랜 생성
// ============================================
// POST /api/mini-concierge/generate
// 현재 위치 기반으로 1시간 액티비티 플랜을 생성합니다.
// AI 사용량 제한 적용
router.post('/mini-concierge/generate', authenticateToken, requireAiEnv, checkAiUsage('concierge'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { latitude, longitude, preferences, language } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Mini Concierge AI 호출
    const { generateMiniPlans, isMiniConciergeEnabled } = await import('../ai/miniConcierge');

    if (!isMiniConciergeEnabled()) {
      return res.status(503).json({ error: 'Mini Concierge service is not available' });
    }

    const context = {
      userId: req.user.id,
      latitude,
      longitude,
      preferences: preferences || [],
      language: language || 'ko',
    };

    const plans = await generateMiniPlans(context);

    // 플랜 저장
    const savedPlan = await storage.createMiniPlan({
      userId: req.user.id,
      latitude,
      longitude,
      plans,
      status: 'created',
    });

    res.json({
      planId: savedPlan.id,
      plans,
    });
  } catch (error) {
    console.error('Mini Concierge 플랜 생성 오류:', error);
    res.status(500).json({ error: 'Failed to generate mini plans' });
  }
});

// ============================================
// Mini Concierge 플랜 목록 조회
// ============================================
// GET /api/mini-concierge/plans
// 현재 사용자의 Mini Concierge 플랜 목록을 조회합니다.
router.get('/mini-concierge/plans', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plans = await storage.getMiniPlans(req.user.id);
    res.json({ plans });
  } catch (error) {
    console.error('Mini Concierge 플랜 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch mini plans' });
  }
});

// ============================================
// Mini Concierge 플랜 상세 조회
// ============================================
// GET /api/mini-concierge/plans/:id
// 특정 플랜의 상세 정보를 조회합니다.
router.get('/mini-concierge/plans/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const planId = parseInt(req.params.id);
    const plan = await storage.getMiniPlan(planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // 소유권 확인
    if (plan.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this plan' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Mini Concierge 플랜 상세 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch mini plan' });
  }
});

// ============================================
// Mini Concierge 플랜 시작
// ============================================
// POST /api/mini-concierge/plans/:id/start
// 플랜 실행을 시작합니다.
router.post('/mini-concierge/plans/:id/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const planId = parseInt(req.params.id);
    const plan = await storage.getMiniPlan(planId);

    if (!plan || plan.userId !== req.user.id) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const updatedPlan = await storage.updateMiniPlanStatus(planId, 'in_progress');
    res.json(updatedPlan);
  } catch (error) {
    console.error('Mini Concierge 플랜 시작 오류:', error);
    res.status(500).json({ error: 'Failed to start mini plan' });
  }
});

// ============================================
// Mini Concierge 플랜 완료
// ============================================
// POST /api/mini-concierge/plans/:id/complete
// 플랜 실행을 완료합니다.
router.post('/mini-concierge/plans/:id/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const planId = parseInt(req.params.id);
    const plan = await storage.getMiniPlan(planId);

    if (!plan || plan.userId !== req.user.id) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const updatedPlan = await storage.updateMiniPlanStatus(planId, 'completed');
    res.json(updatedPlan);
  } catch (error) {
    console.error('Mini Concierge 플랜 완료 오류:', error);
    res.status(500).json({ error: 'Failed to complete mini plan' });
  }
});

// ============================================
// Mini Concierge 스팟 체크인
// ============================================
// POST /api/mini-concierge/spots/:spotId/checkin
// 플랜의 특정 스팟에 체크인합니다.
router.post('/mini-concierge/spots/:spotId/checkin', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const spotId = parseInt(req.params.spotId);
    const { latitude, longitude } = req.body;

    const checkin = await storage.createMiniPlanCheckin({
      spotId,
      userId: req.user.id,
      latitude,
      longitude,
    });

    res.json(checkin);
  } catch (error) {
    console.error('Mini Concierge 스팟 체크인 오류:', error);
    res.status(500).json({ error: 'Failed to check in to spot' });
  }
});

// ============================================
// CineMap 작업 생성
// ============================================
// POST /api/cinemap/jobs
// 타임라인 사진으로 영상 스토리보드를 생성합니다.
// AI 사용량 제한 적용
router.post('/cinemap/jobs', authenticateToken, requireAiEnv, checkAiUsage('ai_message'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { timelineId, photos, style, music } = req.body;

    if (!timelineId || !photos || photos.length === 0) {
      return res.status(400).json({ error: 'Timeline ID and photos are required' });
    }

    // CineMap AI 호출
    const { generateStoryboard } = await import('../ai/cinemap');

    const storyboard = await generateStoryboard(photos, {
      style: style || 'cinematic',
      music: music || 'ambient',
    });

    // 작업 저장
    const job = await storage.createCinemapJob({
      userId: req.user.id,
      timelineId,
      photos,
      storyboard,
      status: 'completed',
    });

    res.json({
      jobId: job.id,
      storyboard,
    });
  } catch (error) {
    console.error('CineMap 작업 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create CineMap job' });
  }
});

// ============================================
// CineMap 작업 조회
// ============================================
// GET /api/cinemap/jobs/:id
// 특정 CineMap 작업의 결과를 조회합니다.
router.get('/cinemap/jobs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const jobId = parseInt(req.params.id);
    const job = await storage.getCinemapJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this job' });
    }

    res.json(job);
  } catch (error) {
    console.error('CineMap 작업 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch CineMap job' });
  }
});

// ============================================
// 사용자별 CineMap 작업 목록 조회
// ============================================
// GET /api/cinemap/jobs/user/:userId
// 특정 사용자의 CineMap 작업 목록을 조회합니다.
router.get('/cinemap/jobs/user/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 본인 작업만 조회 가능
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view these jobs' });
    }

    const jobs = await storage.getCinemapJobsByUser(req.user.id);
    res.json(jobs);
  } catch (error) {
    console.error('CineMap 작업 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch CineMap jobs' });
  }
});

// ============================================
// 타임라인별 CineMap 작업 조회
// ============================================
// GET /api/cinemap/jobs/timeline/:timelineId
// 특정 타임라인의 CineMap 작업을 조회합니다.
router.get('/cinemap/jobs/timeline/:timelineId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timelineId = parseInt(req.params.timelineId);
    const jobs = await storage.getCinemapJobsByTimeline(timelineId);

    res.json(jobs);
  } catch (error) {
    console.error('타임라인별 CineMap 작업 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch CineMap jobs for timeline' });
  }
});

// ============================================
// AI 모델 정보 조회
// ============================================
// GET /api/admin/ai-models
// 현재 사용 중인 AI 모델 정보를 반환합니다.
router.get('/admin/ai-models', (req: Request, res: Response) => {
  res.json({
    concierge: process.env.CONCIERGE_AI_MODEL || 'gpt-5.1-chat-latest',
    miniConcierge: process.env.MINI_CONCIERGE_AI_MODEL || 'gpt-5.1-chat-latest',
    cinemap: process.env.CINEMAP_AI_MODEL || 'gpt-5.1-chat-latest',
  });
});

export const aiRouter = router;
