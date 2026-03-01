// Legacy Dispute routes extracted from server/routes.ts to reduce file size.
import type { Express } from 'express';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyDisputeRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any; requireAdmin: any }
) {
  const { storage, authenticateToken, authenticateHybrid, requireAdmin } = deps;

  // Dispute Management API (Phase 14)
  // =====================================================

  // 분쟁 생성
  app.post('/api/disputes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { createDispute } = await import('../services/disputeService');
      const { dispute, error } = await createDispute({
        ...req.body,
        complainantId: userId,
      }, userId);

      if (error) {
        return res.status(400).json({ message: error, dispute });
      }

      res.status(201).json({ dispute });
    } catch (error) {
      console.error('Error creating dispute:', error);
      res.status(500).json({ message: 'Failed to create dispute' });
    }
  });

  // 내 분쟁 목록 조회
  app.get('/api/disputes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { getUserDisputes } = await import('../services/disputeService');
      const result = await getUserDisputes(userId, {
        status: req.query.status as any,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      res.status(500).json({ message: 'Failed to fetch disputes' });
    }
  });

  // 분쟁 상세 조회
  app.get('/api/disputes/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { getDisputeById, getDisputeEvidence, getDisputeActivities } = await import('../services/disputeService');
      const dispute = await getDisputeById(disputeId);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      if (dispute.complainantId !== userId && dispute.respondentId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const [evidence, activities] = await Promise.all([
        getDisputeEvidence(disputeId),
        getDisputeActivities(disputeId),
      ]);

      res.json({ dispute, evidence, activities });
    } catch (error) {
      console.error('Error fetching dispute:', error);
      res.status(500).json({ message: 'Failed to fetch dispute' });
    }
  });

  // 증거 제출
  app.post('/api/disputes/:id/evidence', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { submitEvidence } = await import('../services/disputeService');
      const result = await submitEvidence(disputeId, req.body, userId);

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error submitting evidence:', error);
      res.status(400).json({ message: error.message || 'Failed to submit evidence' });
    }
  });

  // 분쟁 철회
  app.post('/api/disputes/:id/withdraw', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { withdrawDispute } = await import('../services/disputeService');
      const result = await withdrawDispute(disputeId, userId, req.body.reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute withdrawn' });
    } catch (error) {
      console.error('Error withdrawing dispute:', error);
      res.status(500).json({ message: 'Failed to withdraw dispute' });
    }
  });

  // 코멘트 추가
  app.post('/api/disputes/:id/comment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { getDisputeById, addComment } = await import('../services/disputeService');
      const dispute = await getDisputeById(disputeId);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      if (dispute.complainantId !== userId && dispute.respondentId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      await addComment(disputeId, userId, req.body.comment);
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // =====================================================
  // Admin Dispute API
  // =====================================================

  // 관리자 분쟁 목록 조회
  app.get('/api/admin/disputes', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getAdminDisputes } = await import('../services/disputeService');
      const result = await getAdminDisputes({
        status: req.query.status as any,
        priority: req.query.priority as any,
        assignedToMe: req.query.assignedToMe === 'true' ? req.user?.id : undefined,
        unassigned: req.query.unassigned === 'true',
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching admin disputes:', error);
      res.status(500).json({ message: 'Failed to fetch disputes' });
    }
  });

  // 분쟁 담당자 배정
  app.post('/api/admin/disputes/:id/assign', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const adminId = req.body.adminId || req.user?.id;
      if (!adminId) {
        return res.status(400).json({ message: 'Admin ID required' });
      }

      const { assignDispute } = await import('../services/disputeService');
      const result = await assignDispute(disputeId, adminId, req.user?.id || '');

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute assigned' });
    } catch (error) {
      console.error('Error assigning dispute:', error);
      res.status(500).json({ message: 'Failed to assign dispute' });
    }
  });

  // 분쟁 상태 변경
  app.post('/api/admin/disputes/:id/status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { updateDisputeStatus } = await import('../services/disputeService');
      const result = await updateDisputeStatus(
        disputeId,
        req.body.status,
        req.user?.id || '',
        req.body.comment
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Status updated' });
    } catch (error) {
      console.error('Error updating dispute status:', error);
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  // 분쟁 해결
  app.post('/api/admin/disputes/:id/resolve', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { resolutionType, resolutionSummary, refundAmount, favoredParty } = req.body;
      if (!resolutionType || !resolutionSummary || !favoredParty) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const { resolveDispute } = await import('../services/disputeService');
      const result = await resolveDispute(
        disputeId,
        { resolutionType, resolutionSummary, refundAmount, favoredParty },
        req.user?.id || ''
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute resolved' });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      res.status(500).json({ message: 'Failed to resolve dispute' });
    }
  });

  // 분쟁 상위 단계 전달
  app.post('/api/admin/disputes/:id/escalate', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      if (isNaN(disputeId)) {
        return res.status(400).json({ message: 'Invalid dispute ID' });
      }

      const { escalateDispute } = await import('../services/disputeService');
      const result = await escalateDispute(disputeId, req.user?.id || '', req.body.reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Dispute escalated' });
    } catch (error) {
      console.error('Error escalating dispute:', error);
      res.status(500).json({ message: 'Failed to escalate dispute' });
    }
  });

  // 분쟁 통계
  app.get('/api/admin/disputes/stats', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getDisputeStats } = await import('../services/disputeService');
      const stats = await getDisputeStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dispute stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // SLA 위반 체크 (수동 실행)
  app.post('/api/admin/disputes/check-sla', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { checkSlaBreaches } = await import('../services/disputeService');
      const result = await checkSlaBreaches();
      res.json({
        success: true,
        breachedCount: result.breachedCount,
        message: `${result.breachedCount} disputes marked as SLA breached`,
      });
    } catch (error) {
      console.error('Error checking SLA breaches:', error);
      res.status(500).json({ message: 'Failed to check SLA' });
    }
  });

}
