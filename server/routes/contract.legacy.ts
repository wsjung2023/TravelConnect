// 계약·에스크로 라우터 — P2P 서비스 계약 생성/조회, PortOne 기반 결제 시작·확인, 계약 완료/취소, 분할결제(할부·마일스톤) 플랜 관리 엔드포인트를 담당한다.
import type { Express } from 'express';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyContractRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any; requirePaymentEnv: any }
) {
  const { storage, authenticateToken, authenticateHybrid, requirePaymentEnv } = deps;

  // 에스크로/계약 관련 API
  // ============================================
  
  // 계약 생성
  app.post('/api/contracts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Support both 'amount' and 'totalAmount' field names for backward compatibility
      const totalAmount = req.body.totalAmount || req.body.amount;
      if (!totalAmount) {
        return res.status(400).json({ message: 'totalAmount or amount is required' });
      }
      
      // Get guideId from booking if bookingId is provided
      let guideId = req.body.guideId;
      if (req.body.bookingId && !guideId) {
        const booking = await storage.getBookingById(req.body.bookingId);
        if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
        }
        guideId = booking.hostId;
      }
      
      if (!guideId) {
        return res.status(400).json({ message: 'guideId is required (or provide bookingId to fetch from booking)' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.createContract({
        travelerId: req.user.id,
        guideId: guideId,
        title: req.body.title || 'Contract',
        description: req.body.description || 'P2P Service Contract',
        totalAmountKrw: parseFloat(totalAmount),
        serviceDate: req.body.serviceDate,
        serviceStartTime: req.body.serviceStartTime,
        serviceEndTime: req.body.serviceEndTime,
        meetingPoint: req.body.meetingPoint,
        meetingLatitude: req.body.meetingLatitude,
        meetingLongitude: req.body.meetingLongitude,
        cancelPolicy: req.body.cancelPolicy,
        depositPercent: req.body.depositPercent,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ 
        success: true,
        contractId: result.contractId,
        message: 'Contract created successfully'
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      res.status(500).json({ message: 'Failed to create contract' });
    }
  });

  // 계약 상세 조회
  app.get('/api/contracts/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.getContract(parseInt(req.params.id));
      
      if (!result.success) {
        return res.status(404).json({ message: result.error });
      }
      
      const contract = result.contract;
      if (contract.travelerId !== req.user.id && contract.guideId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this contract' });
      }
      
      res.json({
        contract: result.contract,
        stages: result.stages,
        transactions: result.transactions,
      });
    } catch (error) {
      console.error('Error fetching contract:', error);
      res.status(500).json({ message: 'Failed to fetch contract' });
    }
  });

  // 사용자 계약 목록 조회
  app.get('/api/contracts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const role = (req.query.role as 'traveler' | 'guide') || 'traveler';
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.getUserContracts(req.user.id, role);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ contracts: result.contracts });
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ message: 'Failed to fetch contracts' });
    }
  });

  // 계약 단계 결제 시작 (프론트엔드 결제창 오픈용)
  app.post('/api/contracts/:id/initiate-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { stageId } = req.body;
      if (!stageId) {
        return res.status(400).json({ message: 'Stage ID is required' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.initiateStagePayment(
        parseInt(req.params.id),
        stageId,
        req.user.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      const { portoneClient } = await import('../services/portoneClient');
      const publicConfig = portoneClient.getPublicConfig();
      
      res.json({
        success: true,
        payment: {
          paymentId: result.paymentId,
          orderName: result.orderName,
          amount: result.amount,
          currency: result.currency,
        },
        portone: publicConfig,
        customData: {
          contractId: parseInt(req.params.id),
          stageId: stageId,
          type: 'contract_stage',
        }
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      res.status(500).json({ message: 'Failed to initiate payment' });
    }
  });

  // 계약 결제 완료 처리 (프론트엔드에서 결제 완료 후 호출)
  app.post('/api/contracts/:id/confirm-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { stageId, portonePaymentId } = req.body;
      if (!stageId || !portonePaymentId) {
        return res.status(400).json({ message: 'Stage ID and payment ID are required' });
      }
      
      const { portoneClient } = await import('../services/portoneClient');
      const paymentStatus = await portoneClient.getPayment(portonePaymentId);
      
      if (!paymentStatus.success || paymentStatus.status !== 'PAID') {
        return res.status(400).json({ 
          message: 'Payment not confirmed',
          status: paymentStatus.status 
        });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.handlePaymentComplete(
        parseInt(req.params.id),
        stageId,
        portonePaymentId,
        paymentStatus.amount || 0
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        stageId: result.stageId,
        message: 'Payment confirmed and contract updated'
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // 서비스 완료 확인 (여행자)
  app.post('/api/contracts/:id/complete', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.confirmServiceComplete(
        parseInt(req.params.id),
        req.user.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        message: 'Service completed and payout initiated'
      });
    } catch (error) {
      console.error('Error completing contract:', error);
      res.status(500).json({ message: 'Failed to complete contract' });
    }
  });

  // 계약 취소
  app.post('/api/contracts/:id/cancel', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.cancelContract(
        parseInt(req.params.id),
        req.user.id,
        req.body.reason || 'User requested cancellation'
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        message: 'Contract cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling contract:', error);
      res.status(500).json({ message: 'Failed to cancel contract' });
    }
  });

  // 분쟁 제기
  app.post('/api/contracts/:id/dispute', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { reason, description } = req.body;
      if (!reason) {
        return res.status(400).json({ message: 'Dispute reason is required' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.raiseDispute(
        parseInt(req.params.id),
        req.user.id,
        reason
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        message: 'Dispute raised successfully'
      });
    } catch (error) {
      console.error('Error raising dispute:', error);
      res.status(500).json({ message: 'Failed to raise dispute' });
    }
  });

  // 에스크로 해제 및 정산 처리 (여행자가 서비스 완료 후 승인)
  app.post('/api/contracts/:id/release', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.releaseEscrow(
        parseInt(req.params.id),
        req.user.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        payoutId: result.payoutId,
        guideAmount: result.guideAmount,
        platformFee: result.platformFee,
        message: 'Escrow released and payout created'
      });
    } catch (error) {
      console.error('Error releasing escrow:', error);
      res.status(500).json({ message: 'Failed to release escrow' });
    }
  });

  // 가이드 정산 내역 조회
  app.get('/api/payouts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.getGuidePayouts(req.user.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ payouts: result.payouts });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  // 가이드 에스크로 계좌 조회
  app.get('/api/escrow-account', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.getOrCreateEscrowAccount(req.user.id, 'host');
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ account: result.account });
    } catch (error) {
      console.error('Error fetching escrow account:', error);
      res.status(500).json({ message: 'Failed to fetch escrow account' });
    }
  });

  // ============================================
  // 분할 결제 API (Phase 13)
  // ============================================

  // 헬퍼 함수: 계약 소유자 검증
  async function verifyContractOwnership(contractId: number, userId: string): Promise<{ authorized: boolean; contract?: any; role?: 'traveler' | 'guide' }> {
    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.getContract(contractId);
    
    if (!result.success || !result.contract) {
      return { authorized: false };
    }
    
    const contract = result.contract;
    if (contract.travelerId === userId) {
      return { authorized: true, contract, role: 'traveler' };
    }
    if (contract.guideId === userId) {
      return { authorized: true, contract, role: 'guide' };
    }
    
    return { authorized: false };
  }

  // 헬퍼 함수: 에스크로 트랜잭션 소유자 검증
  async function verifyEscrowTransactionOwnership(transactionId: number, userId: string): Promise<{ authorized: boolean; transaction?: any; contract?: any; role?: 'traveler' | 'guide' }> {
    const { db } = await import('../db');
    const { escrowTransactions, contracts } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [tx] = await db.select().from(escrowTransactions).where(eq(escrowTransactions.id, transactionId));
    if (!tx) return { authorized: false };
    
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, tx.contractId));
    if (!contract) return { authorized: false };
    
    if (contract.travelerId === userId) {
      return { authorized: true, transaction: tx, contract, role: 'traveler' };
    }
    if (contract.guideId === userId) {
      return { authorized: true, transaction: tx, contract, role: 'guide' };
    }
    
    return { authorized: false };
  }

  // 분할 결제 설정 적용 (가이드 또는 여행자만 가능)
  app.post('/api/contracts/:id/split-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to modify this contract' });
      }

      const { paymentPlan, depositRate, interimRate, finalRate, depositDueDate, interimDueDate, finalDueDate } = req.body;

      if (!paymentPlan || !['single', 'two_step', 'three_step'].includes(paymentPlan)) {
        return res.status(400).json({ message: 'Valid payment plan required (single, two_step, three_step)' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const defaultRates = splitPaymentService.getDefaultRates(paymentPlan);

      const config = {
        paymentPlan,
        depositRate: depositRate ?? defaultRates.deposit,
        interimRate: interimRate ?? defaultRates.interim,
        finalRate: finalRate ?? defaultRates.final,
        depositDueDate,
        interimDueDate,
        finalDueDate,
      };

      const result = await splitPaymentService.setupSplitPayment(contractId, config);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Split payment configured successfully' });
    } catch (error) {
      console.error('Error setting up split payment:', error);
      res.status(500).json({ message: 'Failed to setup split payment' });
    }
  });

  // 계약 결제 요약 조회 (계약 당사자만 가능)
  app.get('/api/contracts/:id/payment-summary', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to view this contract' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const summary = await splitPaymentService.getContractPaymentSummary(contractId);

      if (!summary) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      res.json(summary);
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      res.status(500).json({ message: 'Failed to fetch payment summary' });
    }
  });

  // 마일스톤 결제 처리 (여행자만 가능)
  app.post('/api/escrow/:transactionId/pay', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactionId = parseInt(req.params.transactionId);
      
      // 트랜잭션 소유자 검증 (여행자만 결제 가능)
      const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to pay this milestone' });
      }
      if (ownership.role !== 'traveler') {
        return res.status(403).json({ message: 'Only the traveler can make payments' });
      }

      const { paymentId, paymentMethod, paidAmount } = req.body;

      if (!paymentId || !paymentMethod) {
        return res.status(400).json({ message: 'Payment ID and method required' });
      }

      if (paidAmount === undefined || paidAmount === null || typeof paidAmount !== 'number') {
        return res.status(400).json({ message: 'Paid amount is required and must be a number' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const result = await splitPaymentService.processMilestonePayment(transactionId, paymentId, paymentMethod, paidAmount);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        success: true, 
        nextMilestone: result.nextMilestone,
        message: 'Milestone payment processed successfully' 
      });
    } catch (error) {
      console.error('Error processing milestone payment:', error);
      res.status(500).json({ message: 'Failed to process milestone payment' });
    }
  });

  // 마일스톤 릴리스 (서비스 완료 승인 - 여행자만 가능)
  app.post('/api/escrow/:transactionId/release', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactionId = parseInt(req.params.transactionId);
      
      // 트랜잭션 소유자 검증 (여행자만 릴리스 가능)
      const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to release this milestone' });
      }
      if (ownership.role !== 'traveler') {
        return res.status(403).json({ message: 'Only the traveler can release milestones' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const result = await splitPaymentService.releaseMilestone(transactionId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Milestone released successfully' });
    } catch (error) {
      console.error('Error releasing milestone:', error);
      res.status(500).json({ message: 'Failed to release milestone' });
    }
  });

  // 부분 환불 처리 (양측 모두 가능 - 협의 후)
  app.post('/api/escrow/:transactionId/partial-refund', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactionId = parseInt(req.params.transactionId);
      
      // 트랜잭션 소유자 검증 (계약 당사자만 환불 요청 가능)
      const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to process refund for this milestone' });
      }

      const { amount, reason } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid refund amount required' });
      }

      if (!reason) {
        return res.status(400).json({ message: 'Refund reason required' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const result = await splitPaymentService.processPartialRefund(transactionId, amount, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        success: true, 
        newStatus: result.newStatus,
        message: 'Partial refund processed successfully' 
      });
    } catch (error) {
      console.error('Error processing partial refund:', error);
      res.status(500).json({ message: 'Failed to process partial refund' });
    }
  });

  // 전체 환불 처리 (양측 모두 가능)
  app.post('/api/contracts/:id/full-refund', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to refund this contract' });
      }

      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: 'Refund reason required' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const result = await splitPaymentService.processFullRefund(contractId, reason);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ 
        success: true, 
        refundedTransactions: result.refundedTransactions,
        message: 'Full refund processed successfully' 
      });
    } catch (error) {
      console.error('Error processing full refund:', error);
      res.status(500).json({ message: 'Failed to process full refund' });
    }
  });

  // 계약 완료 처리 (여행자만 가능)
  app.post('/api/contracts/:id/complete', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contractId = parseInt(req.params.id);
      
      // 계약 소유자 검증 (여행자만 완료 처리 가능)
      const ownership = await verifyContractOwnership(contractId, req.user.id);
      if (!ownership.authorized) {
        return res.status(403).json({ message: 'Not authorized to complete this contract' });
      }
      if (ownership.role !== 'traveler') {
        return res.status(403).json({ message: 'Only the traveler can complete contracts' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const result = await splitPaymentService.completeContract(contractId);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      res.json({ success: true, message: 'Contract completed successfully' });
    } catch (error) {
      console.error('Error completing contract:', error);
      res.status(500).json({ message: 'Failed to complete contract' });
    }
  });

  // 납부 기한 지난 마일스톤 조회 (관리자용)
  app.get('/api/admin/overdue-milestones', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id || !req.user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { splitPaymentService } = await import('../services/splitPaymentService');
      const overdue = await splitPaymentService.getOverdueMilestones();

      res.json({ overdueCount: overdue.length, milestones: overdue });
    } catch (error) {
      console.error('Error fetching overdue milestones:', error);
      res.status(500).json({ message: 'Failed to fetch overdue milestones' });
    }
  });

}
