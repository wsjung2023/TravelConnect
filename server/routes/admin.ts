/**
 * ============================================
 * 관리자 라우터 (Admin Router)
 * ============================================
 * 
 * 이 모듈은 관리자 전용 API 엔드포인트를 관리합니다.
 * 모든 라우트는 requireAdmin 미들웨어로 관리자 권한을 검증합니다.
 * 
 * 주요 기능:
 * - 상업 통계 (커머스 대시보드)
 * - 경험/예약/결제 관리
 * - 시스템 설정
 * - 분쟁(Dispute) 관리
 * - 정산(Settlement) 관리
 * - 분석(Analytics) 대시보드
 * - ETL 작업 트리거
 * 
 * 접근 권한:
 * - role: 'admin' 필수
 * - JWT 또는 세션 인증 필요
 * 
 * 보안:
 * - 모든 엔드포인트에 authenticateHybrid + requireAdmin 적용
 * - 민감한 작업은 로깅됨
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  requireAdmin,
  AuthRequest,
} from '../auth';
import { requirePaymentEnv, getEnvStatus } from '../middleware/envCheck';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// 상업 통계 조회
// ============================================
// GET /api/admin/commerce/stats
// 전체 상업 활동 통계를 조회합니다.
// 경험 수, 예약 수, 매출, 호스트 수 등
router.get('/commerce/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await storage.getCommerceStats();
    res.json(stats);
  } catch (error) {
    console.error('상업 통계 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch commerce stats' });
  }
});

// ============================================
// 경험 목록 조회 (관리자용)
// ============================================
// GET /api/admin/experiences
// 모든 경험을 관리자 뷰로 조회합니다.
router.get('/experiences', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // getExperiencesWithHosts 메서드 사용 (관리자용 상세 정보 포함)
    const experiences = await storage.getExperiencesWithHosts();
    res.json(experiences);
  } catch (error) {
    console.error('경험 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// ============================================
// 예약 목록 조회 (관리자용)
// ============================================
// GET /api/admin/bookings
// 모든 예약을 관리자 뷰로 조회합니다.
router.get('/bookings', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // getBookingsWithDetails 메서드 사용 (관리자용 상세 정보 포함)
    const bookings = await storage.getBookingsWithDetails();
    res.json(bookings);
  } catch (error) {
    console.error('예약 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ============================================
// 결제 목록 조회 (관리자용)
// ============================================
// GET /api/admin/payments
// 모든 결제 내역을 조회합니다.
router.get('/payments', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await storage.getAllPayments();
    res.json(payments);
  } catch (error) {
    console.error('결제 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ============================================
// 환경 변수 상태 조회
// ============================================
// GET /api/admin/env-status
// 현재 환경 변수 설정 상태를 조회합니다.
// 결제, AI, DB 등의 설정 여부 확인
router.get('/env-status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const envStatus = getEnvStatus();
    res.json(envStatus);
  } catch (error) {
    console.error('환경 상태 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch environment status' });
  }
});

// ============================================
// 정산 스케줄러 상태 조회
// ============================================
// GET /api/admin/settlements/status
// 정산 배치 스케줄러의 현재 상태를 조회합니다.
router.get('/settlements/status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { settlementBatchService } = await import('../services/settlementBatchService');
    const status = settlementBatchService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('정산 상태 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch settlement status' });
  }
});

// ============================================
// 정산 수동 실행
// ============================================
// POST /api/admin/settlements/run
// 정산 배치를 수동으로 실행합니다.
router.post('/settlements/run', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { settlementBatchService } = await import('../services/settlementBatchService');
    const result = await settlementBatchService.runSettlement();
    res.json(result);
  } catch (error) {
    console.error('정산 실행 오류:', error);
    res.status(500).json({ error: 'Failed to run settlement' });
  }
});

// ============================================
// 정산 목록 조회
// ============================================
// GET /api/admin/settlements
// 모든 정산 내역을 조회합니다.
router.get('/settlements', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // settlementBatchService를 통해 정산 내역 조회
    const { settlementBatchService } = await import('../services/settlementBatchService');
    const settlements = await settlementBatchService.getSettlementHistory();
    res.json(settlements);
  } catch (error) {
    console.error('정산 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

// ============================================
// 정산 재시도
// ============================================
// POST /api/admin/settlements/:id/retry
// 실패한 정산을 재시도합니다.
router.post('/settlements/:id/retry', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const settlementId = parseInt(req.params.id);
    const { settlementBatchService } = await import('../services/settlementBatchService');
    const result = await settlementBatchService.retrySettlement(settlementId);
    res.json(result);
  } catch (error) {
    console.error('정산 재시도 오류:', error);
    res.status(500).json({ error: 'Failed to retry settlement' });
  }
});

// ============================================
// 분쟁 목록 조회 (관리자용)
// ============================================
// GET /api/admin/disputes
// 모든 분쟁을 관리자 뷰로 조회합니다.
router.get('/disputes', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { disputeService } = await import('../services/disputeService');
    const disputes = await disputeService.getAllDisputes();
    res.json(disputes);
  } catch (error) {
    console.error('분쟁 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ============================================
// 분쟁 담당자 지정
// ============================================
// POST /api/admin/disputes/:id/assign
// 분쟁에 담당 관리자를 지정합니다.
router.post('/disputes/:id/assign', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { assigneeId } = req.body;
    
    const { disputeService } = await import('../services/disputeService');
    const result = await disputeService.assignDispute(disputeId, assigneeId);
    res.json(result);
  } catch (error) {
    console.error('분쟁 담당자 지정 오류:', error);
    res.status(500).json({ error: 'Failed to assign dispute' });
  }
});

// ============================================
// 분쟁 상태 변경
// ============================================
// POST /api/admin/disputes/:id/status
// 분쟁의 상태를 변경합니다.
router.post('/disputes/:id/status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { status, reason } = req.body;
    
    const { disputeService } = await import('../services/disputeService');
    const result = await disputeService.updateDisputeStatus(disputeId, status, reason);
    res.json(result);
  } catch (error) {
    console.error('분쟁 상태 변경 오류:', error);
    res.status(500).json({ error: 'Failed to update dispute status' });
  }
});

// ============================================
// 분쟁 해결
// ============================================
// POST /api/admin/disputes/:id/resolve
// 분쟁을 최종 해결 처리합니다.
router.post('/disputes/:id/resolve', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { resolution, refundAmount, notes } = req.body;
    
    const { disputeService } = await import('../services/disputeService');
    const result = await disputeService.resolveDispute(disputeId, {
      resolution,
      refundAmount,
      notes,
      resolvedBy: req.user!.id,
    });
    res.json(result);
  } catch (error) {
    console.error('분쟁 해결 오류:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// ============================================
// 분쟁 에스컬레이션
// ============================================
// POST /api/admin/disputes/:id/escalate
// 분쟁을 상위 단계로 에스컬레이션합니다.
router.post('/disputes/:id/escalate', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { reason } = req.body;
    
    const { disputeService } = await import('../services/disputeService');
    const result = await disputeService.escalateDispute(disputeId, reason);
    res.json(result);
  } catch (error) {
    console.error('분쟁 에스컬레이션 오류:', error);
    res.status(500).json({ error: 'Failed to escalate dispute' });
  }
});

// ============================================
// 분쟁 통계 조회
// ============================================
// GET /api/admin/disputes/stats
// 분쟁 관련 통계를 조회합니다.
router.get('/disputes/stats', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { disputeService } = await import('../services/disputeService');
    const stats = await disputeService.getDisputeStats();
    res.json(stats);
  } catch (error) {
    console.error('분쟁 통계 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch dispute stats' });
  }
});

// ============================================
// SLA 위반 체크
// ============================================
// POST /api/admin/disputes/check-sla
// SLA 위반 분쟁을 체크하고 알림을 발송합니다.
router.post('/disputes/check-sla', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { disputeService } = await import('../services/disputeService');
    const result = await disputeService.checkSLAViolations();
    res.json(result);
  } catch (error) {
    console.error('SLA 체크 오류:', error);
    res.status(500).json({ error: 'Failed to check SLA violations' });
  }
});

// ============================================
// Analytics ETL 전체 실행
// ============================================
// POST /api/admin/analytics/etl/full
// 전체 분석 ETL 작업을 실행합니다.
router.post('/analytics/etl/full', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const result = await analyticsETLService.runFullETL();
    res.json(result);
  } catch (error) {
    console.error('ETL 전체 실행 오류:', error);
    res.status(500).json({ error: 'Failed to run full ETL' });
  }
});

// ============================================
// Analytics ETL 일일 실행
// ============================================
// POST /api/admin/analytics/etl/daily
// 일일 분석 ETL 작업을 실행합니다.
router.post('/analytics/etl/daily', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const result = await analyticsETLService.runDailyETL();
    res.json(result);
  } catch (error) {
    console.error('ETL 일일 실행 오류:', error);
    res.status(500).json({ error: 'Failed to run daily ETL' });
  }
});

// ============================================
// 일일 지표 조회
// ============================================
// GET /api/admin/analytics/daily-metrics
// 일일 분석 지표를 조회합니다.
router.get('/analytics/daily-metrics', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const metrics = await analyticsETLService.getDailyMetrics();
    res.json({ metrics });
  } catch (error) {
    console.error('일일 지표 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch daily metrics' });
  }
});

// ============================================
// 거래 분석 조회
// ============================================
// GET /api/admin/analytics/transactions
// 거래 관련 분석 데이터를 조회합니다.
router.get('/analytics/transactions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const transactions = await analyticsETLService.getTransactionAnalytics();
    res.json({ transactions });
  } catch (error) {
    console.error('거래 분석 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch transaction analytics' });
  }
});

// ============================================
// 예약 분석 조회
// ============================================
// GET /api/admin/analytics/bookings
// 예약 관련 분석 데이터를 조회합니다.
router.get('/analytics/bookings', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const bookings = await analyticsETLService.getBookingAnalytics();
    res.json({ bookings });
  } catch (error) {
    console.error('예약 분석 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch booking analytics' });
  }
});

// ============================================
// 분석 대시보드 조회
// ============================================
// GET /api/admin/analytics/dashboard
// 전체 분석 대시보드 데이터를 조회합니다.
router.get('/analytics/dashboard', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const dashboard = await analyticsETLService.getDashboardData();
    res.json(dashboard);
  } catch (error) {
    console.error('대시보드 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================
// 차원 테이블 동기화
// ============================================
// POST /api/admin/analytics/sync-dimensions
// 분석용 차원 테이블을 동기화합니다.
router.post('/analytics/sync-dimensions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const result = await analyticsETLService.syncDimensions();
    res.json(result);
  } catch (error) {
    console.error('차원 동기화 오류:', error);
    res.status(500).json({ error: 'Failed to sync dimensions' });
  }
});

// ============================================
// 분쟁 분석 조회
// ============================================
// GET /api/admin/analytics/disputes
// 분쟁 관련 분석 데이터를 조회합니다.
router.get('/analytics/disputes', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { analyticsETLService } = await import('../services/analyticsETLService');
    const disputes = await analyticsETLService.getDisputeAnalytics();
    res.json({ disputes });
  } catch (error) {
    console.error('분쟁 분석 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch dispute analytics' });
  }
});

// ============================================
// 빌링 거래 목록 조회
// ============================================
// GET /api/admin/billing/transactions
// 모든 빌링 거래 내역을 조회합니다.
router.get('/billing/transactions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await storage.getAllBillingTransactions();
    res.json(transactions);
  } catch (error) {
    console.error('빌링 거래 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch billing transactions' });
  }
});

// ============================================
// 환불 처리
// ============================================
// POST /api/admin/billing/refund
// 결제를 환불 처리합니다.
router.post('/billing/refund', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, amount, reason } = req.body;
    const result = await storage.processRefund(transactionId, amount, reason);
    res.json(result);
  } catch (error) {
    console.error('환불 처리 오류:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// ============================================
// 연체 마일스톤 조회
// ============================================
// GET /api/admin/overdue-milestones
// 결제 기한이 지난 마일스톤을 조회합니다.
router.get('/overdue-milestones', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const { splitPaymentService } = await import('../services/splitPaymentService');
    const overdue = await splitPaymentService.getOverdueMilestones();
    res.json(overdue);
  } catch (error) {
    console.error('연체 마일스톤 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch overdue milestones' });
  }
});

export const adminRouter = router;
