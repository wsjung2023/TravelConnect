/**
 * ============================================
 * 프로필 라우터 (Profile Router)
 * ============================================
 * 
 * 이 모듈은 사용자 프로필 관련 API를 관리합니다.
 * 
 * 주요 기능:
 * - 프로필 조회 및 수정
 * - 프로필 공개 설정 (Open to Meet)
 * - 포트폴리오 모드 관리
 * - 공개 프로필 (publicProfileUrl)
 * - 사용자 검색
 * 
 * 프로필 설정:
 * - openToMeet: 현재 위치에서 만남 가능 표시
 * - openUntil: 만남 가능 시간 (시간 제한)
 * - regionCode: 현재 위치 지역 코드
 * - portfolioMode: 인플루언서용 포트폴리오 모드
 * 
 * 비즈니스 규칙:
 * - 포트폴리오 모드는 인플루언서(userType='influencer')만 활성화 가능
 * - publicProfileUrl은 포트폴리오 모드 활성화 시 자동 생성
 * - Open to Meet은 설정된 시간 후 자동 비활성화
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  AuthRequest,
} from '../auth';
import { UpdateProfileOpenSchema, PortfolioModeSchema } from '@shared/api/schema';

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
// 프로필 공개 상태 조회
// ============================================
// GET /api/profile/open
// 현재 사용자의 Open to Meet 상태를 조회합니다.
router.get('/open', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      openToMeet: user.openToMeet || false,
      openUntil: user.openUntil,
      regionCode: user.regionCode,
    });
  } catch (error) {
    console.error('프로필 공개 상태 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch profile open status' });
  }
});

// ============================================
// 프로필 공개 상태 설정
// ============================================
// PATCH /api/profile/open
// Open to Meet 상태를 설정합니다.
// 활성화 시 지정된 시간(기본 12시간) 후 자동 비활성화
router.patch('/open', authenticateHybrid, apiLimiter, validateSchema(UpdateProfileOpenSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { open, region, hours } = req.validatedData as { open: boolean; region?: string; hours?: number };

    console.log(`[PATCH /api/profile/open] 사용자 ${userId}: open=${open}, region=${region}, hours=${hours}`);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // openUntil 계산 (활성화 시에만)
    let openUntil = null;
    if (open) {
      const activeHours = hours || 12; // 기본값 12시간
      openUntil = new Date(Date.now() + activeHours * 60 * 60 * 1000);
    }

    // 프로필 업데이트
    const updateData: any = {
      openToMeet: open,
      openUntil: openUntil,
    };
    
    if (region) {
      updateData.regionCode = region;
    }

    const updatedUser = await storage.updateUserProfile(userId, updateData);

    res.json({
      message: open ? '만남 가능 상태로 설정되었습니다' : '만남 불가능 상태로 설정되었습니다',
      openToMeet: updatedUser?.openToMeet,
      openUntil: updatedUser?.openUntil,
      regionCode: updatedUser?.regionCode,
    });
  } catch (error) {
    console.error('프로필 공개 상태 설정 오류:', error);
    res.status(500).json({ error: 'Failed to update profile open status' });
  }
});

// ============================================
// 포트폴리오 모드 설정
// ============================================
// PUT /api/profile/portfolio-mode
// 포트폴리오 모드를 활성화/비활성화합니다.
// 비즈니스 규칙: 인플루언서(userType='influencer')만 활성화 가능
router.put('/portfolio-mode', authenticateHybrid, apiLimiter, validateSchema(PortfolioModeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { enabled, publicProfileUrl } = req.validatedData as { enabled: boolean; publicProfileUrl?: string };

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 인플루언서만 포트폴리오 모드 활성화 가능
    if (enabled && user.userType !== 'influencer') {
      return res.status(403).json({ 
        message: '포트폴리오 모드는 인플루언서만 사용할 수 있습니다',
        code: 'PORTFOLIO_MODE_INFLUENCER_ONLY'
      });
    }

    // 공개 프로필 URL 중복 확인
    if (enabled && publicProfileUrl) {
      const existingUser = await storage.getUserByPublicProfileUrl(publicProfileUrl);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ 
          message: '이미 사용 중인 프로필 URL입니다',
          code: 'PUBLIC_PROFILE_URL_TAKEN'
        });
      }
    }

    // 프로필 업데이트
    const updatedUser = await storage.updateUserProfile(userId, {
      portfolioMode: enabled,
      publicProfileUrl: enabled ? (publicProfileUrl || userId) : null,
    });

    res.json({
      message: enabled ? '포트폴리오 모드가 활성화되었습니다' : '포트폴리오 모드가 비활성화되었습니다',
      portfolioMode: updatedUser?.portfolioMode,
      publicProfileUrl: updatedUser?.publicProfileUrl,
    });
  } catch (error) {
    console.error('포트폴리오 모드 설정 오류:', error);
    res.status(500).json({ error: 'Failed to update portfolio mode' });
  }
});

// ============================================
// 프로필 수정
// ============================================
// PATCH /api/user/profile
// 사용자 프로필 정보를 수정합니다.
router.patch('/user/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { firstName, lastName, bio, location, languages, interests, profileImageUrl, timezone } = req.body;

    const updatedUser = await storage.updateUserProfile(req.user.id, {
      firstName,
      lastName,
      bio,
      location,
      languages,
      interests,
      profileImageUrl,
      timezone,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      bio: updatedUser.bio,
      location: updatedUser.location,
      languages: updatedUser.languages,
      interests: updatedUser.interests,
      profileImageUrl: updatedUser.profileImageUrl,
      timezone: updatedUser.timezone,
    });
  } catch (error) {
    console.error('프로필 수정 오류:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// 공개 프로필 조회
// ============================================
// GET /api/portfolio/:publicProfileUrl
// 공개 프로필 URL로 사용자 정보를 조회합니다.
router.get('/portfolio/:publicProfileUrl', async (req: Request, res: Response) => {
  try {
    const { publicProfileUrl } = req.params;
    
    const user = await storage.getUserByPublicProfileUrl(publicProfileUrl);
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 포트폴리오 모드가 비활성화되어 있으면 조회 불가
    if (!user.portfolioMode) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // 공개 정보만 반환 (민감한 정보 제외)
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      location: user.location,
      languages: user.languages,
      interests: user.interests,
      publicProfileUrl: user.publicProfileUrl,
    });
  } catch (error) {
    console.error('공개 프로필 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio profile' });
  }
});

// ============================================
// 사용자 프로필 조회
// ============================================
// GET /api/users/:id/profile
// 특정 사용자의 프로필을 조회합니다.
router.get('/users/:id/profile', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 공개 정보만 반환
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
      location: user.location,
      languages: user.languages,
      interests: user.interests,
      userType: user.userType,
      isHost: user.isHost,
      openToMeet: user.openToMeet,
    });
  } catch (error) {
    console.error('사용자 프로필 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ============================================
// 공개 사용자 목록 조회
// ============================================
// GET /api/users/open
// 현재 Open to Meet 상태인 사용자 목록을 조회합니다.
router.get('/users/open', async (req: Request, res: Response) => {
  try {
    const { region, limit, offset } = req.query;

    const users = await storage.getOpenUsers({
      region: region as string,
      limit: parseInt(limit as string) || 20,
      offset: parseInt(offset as string) || 0,
    });

    res.json(users);
  } catch (error) {
    console.error('공개 사용자 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch open users' });
  }
});

// ============================================
// 호스트 신청
// ============================================
// POST /api/user/apply-host
// 일반 사용자가 호스트로 신청합니다.
router.post('/user/apply-host', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 이미 호스트인 경우
    if (user.isHost) {
      return res.status(400).json({ error: 'Already a host' });
    }

    // 호스트로 업데이트
    const updatedUser = await storage.updateUserProfile(req.user.id, {
      isHost: true,
      userType: 'host',
    });

    res.json({
      message: '호스트 신청이 완료되었습니다',
      isHost: updatedUser?.isHost,
      userType: updatedUser?.userType,
    });
  } catch (error) {
    console.error('호스트 신청 오류:', error);
    res.status(500).json({ error: 'Failed to apply for host' });
  }
});

export const profileRouter = router;
