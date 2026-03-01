// 호스트·리뷰 라우터 — 호스트 프로필 조회, 호스트 등록·수정, 리뷰 작성·조회·수정·삭제, 리뷰 집계 통계 엔드포인트를 담당한다.
import type { Express } from 'express';

export function registerLegacyHostReviewsRoutes(
  app: Express,
  deps: { storage: any; authenticateHybrid: any; requireAdmin: any }
) {
  const { storage, authenticateHybrid, requireAdmin } = deps;

  // 호스트 신청 API (심사 대기 상태로 설정)
  app.post('/api/user/apply-host', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const userId = req.user.id;
      
      // 이미 호스트인 경우
      const currentUser = await storage.getUser(userId);
      if (currentUser?.isHost) {
        return res.status(400).json({ message: 'Already a host' });
      }
      
      // 이미 신청 대기중인 경우
      if (currentUser?.hostStatus === 'pending') {
        return res.status(400).json({ message: 'Application already pending' });
      }

      // 심사 대기 상태로 설정 (isHost는 false 유지)
      const updates = { hostStatus: 'pending' };
      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`[HOST-APPLY] User ${req.user.email} applied for host (pending review)`);
      res.json({ 
        message: '호스트 신청이 완료되었습니다! 관리자 심사 후 승인됩니다.',
        user: updatedUser,
        hostStatus: 'pending'
      });
    } catch (error) {
      console.error('Error applying for host:', error);
      res.status(500).json({ message: 'Failed to apply for host' });
    }
  });

  // 호스트 신청 상태 조회 API
  app.get('/api/user/host-status', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        isHost: user.isHost,
        hostStatus: user.hostStatus || null
      });
    } catch (error) {
      console.error('Error fetching host status:', error);
      res.status(500).json({ message: 'Failed to fetch host status' });
    }
  });

  // 관리자: 호스트 신청 목록 조회
  app.get('/api/admin/host-applications', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { status } = req.query;
      const filterStatus = status === 'all' ? undefined : (status as string) || 'pending';
      
      const applications = await storage.getHostApplications(filterStatus);
      
      res.json(applications);
    } catch (error) {
      console.error('Error fetching host applications:', error);
      res.status(500).json({ message: 'Failed to fetch host applications' });
    }
  });

  // 관리자: 호스트 신청 승인
  app.patch('/api/admin/host-applications/:userId/approve', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.hostStatus !== 'pending') {
        return res.status(400).json({ message: 'Application is not pending' });
      }

      const updatedUser = await storage.updateUser(userId, {
        hostStatus: 'approved',
        isHost: true,
        userType: 'host'
      });

      console.log(`[HOST-APPROVE] Admin ${req.user?.email} approved host application for user ${userId}`);
      res.json({ 
        message: '호스트 신청이 승인되었습니다.',
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error approving host application:', error);
      res.status(500).json({ message: 'Failed to approve host application' });
    }
  });

  // 관리자: 호스트 신청 거절
  app.patch('/api/admin/host-applications/:userId/reject', authenticateHybrid, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.hostStatus !== 'pending') {
        return res.status(400).json({ message: 'Application is not pending' });
      }

      const updatedUser = await storage.updateUser(userId, {
        hostStatus: 'rejected'
      });

      console.log(`[HOST-REJECT] Admin ${req.user?.email} rejected host application for user ${userId}. Reason: ${reason || 'No reason provided'}`);
      res.json({ 
        message: '호스트 신청이 거절되었습니다.',
        user: updatedUser 
      });
    } catch (error) {
      console.error('Error rejecting host application:', error);
      res.status(500).json({ message: 'Failed to reject host application' });
    }
  });

  // 후기 작성 API
  app.post('/api/reviews', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: req.user.id,
      });

      const review = await storage.createReview(reviewData);
      
      console.log(`[REVIEW] User ${req.user.email} created review for experience ${(reviewData as any).experienceId}`);
      res.json(review);
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Failed to create review' });
    }
  });

  // 후기 조회 API (경험별)
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
}
