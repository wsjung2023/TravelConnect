/**
 * ============================================
 * 계약/에스크로 라우터 (Contracts Router)
 * ============================================
 * 
 * 이 모듈은 P2P 거래의 계약 및 에스크로 결제 API를 관리합니다.
 * 
 * 주요 기능:
 * - 계약(Contract) CRUD
 * - 에스크로 결제 처리
 * - 분할 결제(Split Payment) 관리
 * - 마일스톤 결제
 * - 환불 처리
 * - 분쟁(Dispute) 제기
 * 
 * 계약 상태 흐름:
 * pending → confirmed → in_progress → completed
 *                    ↘ cancelled / disputed
 * 
 * 분할 결제 플랜:
 * - single: 일시불
 * - two_step: 계약금 + 잔금
 * - three_step: 계약금 + 중도금 + 잔금
 * 
 * 비즈니스 규칙:
 * - 플랫폼 수수료: 12%
 * - 계약금 기본 비율: 30%
 * - 환불은 마일스톤 상태에 따라 차등 적용
 * 
 * 보안:
 * - 계약 당사자만 조회/수정 가능
 * - 결제 금액 검증
 * - 트랜잭션 무결성 보장
 */

import { Router, Response } from 'express';
import { storage } from '../storage';
import {
  authenticateHybrid,
  AuthRequest,
} from '../auth';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// 헬퍼 함수: 계약 소유권 검증
// ============================================
// 현재 사용자가 계약의 여행자 또는 가이드인지 확인
async function verifyContractOwnership(contractId: number, userId: string): Promise<{ authorized: boolean; contract?: any; role?: 'traveler' | 'guide' }> {
  const { db } = await import('../db');
  const { contracts } = await import('@shared/schema');
  const { eq } = await import('drizzle-orm');
  
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) return { authorized: false };
  
  if (contract.travelerId === userId) {
    return { authorized: true, contract, role: 'traveler' };
  }
  if (contract.guideId === userId) {
    return { authorized: true, contract, role: 'guide' };
  }
  
  return { authorized: false };
}

// ============================================
// 헬퍼 함수: 에스크로 트랜잭션 소유권 검증
// ============================================
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

// ============================================
// 계약 생성
// ============================================
// POST /api/contracts
// 새 P2P 서비스 계약을 생성합니다.
router.post('/', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.createContract({
      travelerId: req.user.id,  // 요청자가 여행자
      guideId: req.body.guideId,
      title: req.body.title,
      description: req.body.description,
      totalAmountKrw: req.body.totalAmount,
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
    console.error('계약 생성 오류:', error);
    res.status(500).json({ message: 'Failed to create contract' });
  }
});

// ============================================
// 계약 상세 조회
// ============================================
// GET /api/contracts/:id
// 계약의 상세 정보, 단계, 트랜잭션을 조회합니다.
router.get('/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.getContract(parseInt(req.params.id));
    
    if (!result.success) {
      return res.status(404).json({ message: result.error });
    }
    
    // 계약 당사자만 조회 가능
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
    console.error('계약 조회 오류:', error);
    res.status(500).json({ message: 'Failed to fetch contract' });
  }
});

// ============================================
// 계약 목록 조회
// ============================================
// GET /api/contracts
// 현재 사용자의 모든 계약을 조회합니다.
router.get('/', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const contracts = await storage.getUserContracts(req.user.id);
    res.json({ contracts });
  } catch (error) {
    console.error('계약 목록 조회 오류:', error);
    res.status(500).json({ message: 'Failed to fetch contracts' });
  }
});

// ============================================
// 결제 시작
// ============================================
// POST /api/contracts/:id/initiate-payment
// 계약에 대한 결제를 시작합니다.
router.post('/:id/initiate-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);
    
    // 계약 소유자 검증 (여행자만 결제 가능)
    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'traveler') {
      return res.status(403).json({ message: 'Only traveler can initiate payment' });
    }

    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.initiatePayment(contractId, req.body.milestoneType || 'deposit');
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('결제 시작 오류:', error);
    res.status(500).json({ message: 'Failed to initiate payment' });
  }
});

// ============================================
// 결제 확인
// ============================================
// POST /api/contracts/:id/confirm-payment
// 결제 완료를 확인하고 에스크로에 자금을 예치합니다.
router.post('/:id/confirm-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);
    const { paymentId, milestoneType } = req.body;

    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'traveler') {
      return res.status(403).json({ message: 'Only traveler can confirm payment' });
    }

    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.confirmPayment(contractId, paymentId, milestoneType || 'deposit');
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('결제 확인 오류:', error);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
});

// ============================================
// 계약 완료
// ============================================
// POST /api/contracts/:id/complete
// 서비스 완료 후 계약을 완료 처리합니다.
router.post('/:id/complete', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);
    
    // 여행자만 완료 가능 (서비스 수령 확인)
    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'traveler') {
      return res.status(403).json({ message: 'Only traveler can complete contract' });
    }

    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.completeContract(contractId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('계약 완료 오류:', error);
    res.status(500).json({ message: 'Failed to complete contract' });
  }
});

// ============================================
// 계약 취소
// ============================================
// POST /api/contracts/:id/cancel
// 계약을 취소합니다. 취소 정책에 따라 환불이 진행됩니다.
router.post('/:id/cancel', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);
    const { reason } = req.body;

    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized) {
      return res.status(403).json({ message: 'Not authorized to cancel this contract' });
    }

    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.cancelContract(contractId, req.user.id, reason);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('계약 취소 오류:', error);
    res.status(500).json({ message: 'Failed to cancel contract' });
  }
});

// ============================================
// 분쟁 제기
// ============================================
// POST /api/contracts/:id/dispute
// 계약에 대한 분쟁을 제기합니다.
router.post('/:id/dispute', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);
    const { reason, description } = req.body;

    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized) {
      return res.status(403).json({ message: 'Not authorized to dispute this contract' });
    }

    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.raiseDispute(contractId, req.user.id, reason, description);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('분쟁 제기 오류:', error);
    res.status(500).json({ message: 'Failed to raise dispute' });
  }
});

// ============================================
// 자금 릴리즈
// ============================================
// POST /api/contracts/:id/release
// 에스크로 자금을 가이드에게 릴리즈합니다.
router.post('/:id/release', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);

    // 여행자만 릴리즈 가능
    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'traveler') {
      return res.status(403).json({ message: 'Only traveler can release funds' });
    }

    const { escrowService } = await import('../services/escrowService');
    const result = await escrowService.releaseFunds(contractId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('자금 릴리즈 오류:', error);
    res.status(500).json({ message: 'Failed to release funds' });
  }
});

// ============================================
// 분할 결제 설정
// ============================================
// POST /api/contracts/:id/split-payment
// 계약의 분할 결제 설정을 변경합니다.
// 비즈니스 규칙: 모든 비율의 합은 100%이어야 함
router.post('/:id/split-payment', authenticateHybrid, async (req: AuthRequest, res: Response) => {
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

    // 결제 플랜 유효성 검사
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
    console.error('분할 결제 설정 오류:', error);
    res.status(500).json({ message: 'Failed to setup split payment' });
  }
});

// ============================================
// 계약 결제 요약 조회
// ============================================
// GET /api/contracts/:id/payment-summary
// 계약의 결제 현황 요약을 조회합니다.
router.get('/:id/payment-summary', authenticateHybrid, async (req: AuthRequest, res: Response) => {
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
    console.error('결제 요약 조회 오류:', error);
    res.status(500).json({ message: 'Failed to fetch payment summary' });
  }
});

// ============================================
// 마일스톤 결제 처리
// ============================================
// POST /api/escrow/:transactionId/pay
// 특정 마일스톤의 결제를 처리합니다.
router.post('/escrow/:transactionId/pay', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const transactionId = parseInt(req.params.transactionId);
    
    // 트랜잭션 소유자 검증 (여행자만 결제 가능)
    const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'traveler') {
      return res.status(403).json({ message: 'Only traveler can pay this milestone' });
    }

    const { splitPaymentService } = await import('../services/splitPaymentService');
    const result = await splitPaymentService.payMilestone(transactionId, req.body.paymentId);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('마일스톤 결제 오류:', error);
    res.status(500).json({ message: 'Failed to pay milestone' });
  }
});

// ============================================
// 마일스톤 릴리즈
// ============================================
// POST /api/escrow/:transactionId/release
// 마일스톤 자금을 가이드에게 릴리즈합니다.
router.post('/escrow/:transactionId/release', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const transactionId = parseInt(req.params.transactionId);
    
    // 여행자만 릴리즈 가능
    const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'traveler') {
      return res.status(403).json({ message: 'Only traveler can release funds' });
    }

    const { splitPaymentService } = await import('../services/splitPaymentService');
    const result = await splitPaymentService.releaseMilestone(transactionId);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('마일스톤 릴리즈 오류:', error);
    res.status(500).json({ message: 'Failed to release milestone' });
  }
});

// ============================================
// 부분 환불
// ============================================
// POST /api/escrow/:transactionId/partial-refund
// 마일스톤의 일부 금액을 환불합니다.
router.post('/escrow/:transactionId/partial-refund', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const transactionId = parseInt(req.params.transactionId);
    const { amount, reason } = req.body;

    // 가이드만 환불 가능 (자발적 환불)
    const ownership = await verifyEscrowTransactionOwnership(transactionId, req.user.id);
    if (!ownership.authorized || ownership.role !== 'guide') {
      return res.status(403).json({ message: 'Only guide can initiate partial refund' });
    }

    const { splitPaymentService } = await import('../services/splitPaymentService');
    const result = await splitPaymentService.partialRefund(transactionId, amount, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('부분 환불 오류:', error);
    res.status(500).json({ message: 'Failed to process partial refund' });
  }
});

// ============================================
// 전체 환불
// ============================================
// POST /api/contracts/:id/full-refund
// 계약의 전체 금액을 환불합니다.
router.post('/:id/full-refund', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const contractId = parseInt(req.params.id);
    const { reason } = req.body;

    // 계약 당사자만 환불 가능
    const ownership = await verifyContractOwnership(contractId, req.user.id);
    if (!ownership.authorized) {
      return res.status(403).json({ message: 'Not authorized to refund this contract' });
    }

    const { splitPaymentService } = await import('../services/splitPaymentService');
    const result = await splitPaymentService.fullRefund(contractId, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    res.json(result);
  } catch (error) {
    console.error('전체 환불 오류:', error);
    res.status(500).json({ message: 'Failed to process full refund' });
  }
});

// ============================================
// 에스크로 계정 조회
// ============================================
// GET /api/escrow-account
// 현재 사용자의 에스크로 계정 정보를 조회합니다.
router.get('/escrow-account', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let account = await storage.getEscrowAccount(req.user.id);
    
    // 계정이 없으면 생성
    if (!account) {
      account = await storage.createEscrowAccount({
        userId: req.user.id,
        accountType: 'host',
        status: 'active',
      });
    }

    res.json({ account });
  } catch (error) {
    console.error('에스크로 계정 조회 오류:', error);
    res.status(500).json({ message: 'Failed to fetch escrow account' });
  }
});

export const contractsRouter = router;
