/**
 * 에스크로 서비스 - Tourgether P2P 공유경제 결제 관리
 * 
 * 핵심 개념:
 * - 여행자 → 에스크로 계좌 → 가이드 자금 흐름
 * - 계약 단계별 분할 결제 (계약금 → 중도금 → 잔금)
 * - 플랫폼 수수료 자동 징수 (12%)
 * - 분쟁 발생 시 자금 동결 및 중재
 * 
 * 참고: docs/SHARING_ECONOMY_FLOW.md
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  contracts,
  contractStages,
  escrowAccounts,
  escrowTransactions,
  payouts,
  paymentTransactions,
  users,
} from '@shared/schema';
import { portoneClient } from './portoneClient';
import { nanoid } from 'nanoid';

// 계약 상태
export type ContractStatus = 
  | 'pending'         // 계약 제안됨
  | 'confirmed'       // 확정됨 (결제 대기)
  | 'in_progress'     // 서비스 진행 중
  | 'completed'       // 완료
  | 'cancelled'       // 취소됨
  | 'disputed';       // 분쟁 중

// 에스크로 트랜잭션 상태
export type EscrowTxStatus =
  | 'pending'         // 보류 중
  | 'completed'       // 완료
  | 'released'        // 가이드에게 지급됨
  | 'refunded'        // 환불됨
  | 'frozen';         // 분쟁으로 동결

// 결제 단계 타입
export type StageName = 'deposit' | 'middle' | 'final';

interface CreateContractParams {
  travelerId: string;
  guideId: string;
  title: string;
  description: string;
  totalAmountKrw: number;
  depositPercent?: number;    // 계약금 비율 (기본 30%)
  serviceDate?: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  meetingPoint?: string;
  meetingLatitude?: number;
  meetingLongitude?: number;
  cancelPolicy?: 'flexible' | 'moderate' | 'strict';
}

interface EscrowResult {
  success: boolean;
  contractId?: number;
  stageId?: number;
  transactionId?: number;
  paymentId?: string;
  error?: string;
}

interface PayoutResult {
  success: boolean;
  payoutId?: number;
  amount?: number;
  error?: string;
}

// 플랫폼 수수료율 (환경변수로 설정 가능)
const PLATFORM_FEE_RATE = parseFloat(process.env.PLATFORM_FEE_RATE || '0.12'); // 12%
const DEFAULT_DEPOSIT_PERCENT = 30; // 계약금 30%

class EscrowService {
  /**
   * 새 계약 생성 (DM에서 합의 후)
   */
  async createContract(params: CreateContractParams): Promise<EscrowResult> {
    try {
      const depositPercent = params.depositPercent || DEFAULT_DEPOSIT_PERCENT;
      const platformFeeAmount = Math.floor(params.totalAmountKrw * PLATFORM_FEE_RATE);
      const guidePayoutAmount = params.totalAmountKrw - platformFeeAmount;

      // 계약 생성
      const [contract] = await db.insert(contracts).values({
        travelerId: params.travelerId,
        guideId: params.guideId,
        title: params.title,
        description: params.description,
        totalAmount: params.totalAmountKrw.toString(),
        currency: 'USD',
        platformFeeRate: PLATFORM_FEE_RATE.toString(),
        platformFeeAmount: platformFeeAmount.toString(),
        guidePayoutAmount: guidePayoutAmount.toString(),
        status: 'pending',
        serviceDate: params.serviceDate,
        serviceStartTime: params.serviceStartTime,
        serviceEndTime: params.serviceEndTime,
        meetingPoint: params.meetingPoint,
        meetingLatitude: params.meetingLatitude?.toString(),
        meetingLongitude: params.meetingLongitude?.toString(),
        cancelPolicy: params.cancelPolicy || 'moderate',
      }).returning();

      // 결제 단계 생성 (계약금 / 잔금)
      const depositAmount = Math.floor(params.totalAmountKrw * (depositPercent / 100));
      const finalAmount = params.totalAmountKrw - depositAmount;

      if (!contract) {
        return { success: false, error: 'Failed to create contract' };
      }

      await db.insert(contractStages).values([
        {
          contractId: contract.id,
          name: 'deposit',
          stageOrder: 1,
          amount: depositAmount.toString(),
          currency: 'USD',
          status: 'pending',
        },
        {
          contractId: contract.id,
          name: 'final',
          stageOrder: 2,
          amount: finalAmount.toString(),
          currency: 'USD',
          status: 'pending',
        },
      ]);

      console.log(`[Escrow] Contract created: ${contract.id}, Total: ${params.totalAmountKrw} KRW`);

      return {
        success: true,
        contractId: contract.id,
      };
    } catch (error) {
      console.error('[Escrow] createContract error:', error);
      return { success: false, error: 'Failed to create contract' };
    }
  }

  /**
   * 계약 상태 조회
   */
  async getContract(contractId: number) {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      const stages = await db
        .select()
        .from(contractStages)
        .where(eq(contractStages.contractId, contractId))
        .orderBy(contractStages.stageOrder);

      const transactions = await db
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.contractId, contractId));

      return {
        success: true,
        contract,
        stages,
        transactions,
      };
    } catch (error) {
      console.error('[Escrow] getContract error:', error);
      return { success: false, error: 'Failed to get contract' };
    }
  }

  /**
   * 계약 확정 (가이드가 수락)
   */
  async confirmContract(contractId: number, guideId: string): Promise<EscrowResult> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.guideId, guideId)
        ));

      if (!contract) {
        return { success: false, error: 'Contract not found or unauthorized' };
      }

      if (contract.status !== 'pending') {
        return { success: false, error: 'Contract is not pending' };
      }

      await db
        .update(contracts)
        .set({ 
          status: 'confirmed',
          termsAcceptedByGuide: true,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      console.log(`[Escrow] Contract ${contractId} confirmed by guide ${guideId}`);

      return { success: true, contractId };
    } catch (error) {
      console.error('[Escrow] confirmContract error:', error);
      return { success: false, error: 'Failed to confirm contract' };
    }
  }

  /**
   * 여행자 약관 동의
   */
  async acceptTerms(contractId: number, travelerId: string): Promise<EscrowResult> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.travelerId, travelerId)
        ));

      if (!contract) {
        return { success: false, error: 'Contract not found or unauthorized' };
      }

      await db
        .update(contracts)
        .set({ 
          termsAcceptedByTraveler: true,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      console.log(`[Escrow] Terms accepted by traveler ${travelerId} for contract ${contractId}`);

      return { success: true, contractId };
    } catch (error) {
      console.error('[Escrow] acceptTerms error:', error);
      return { success: false, error: 'Failed to accept terms' };
    }
  }

  /**
   * 결제 단계 시작 (결제창 오픈 준비)
   */
  async initiateStagePayment(
    contractId: number,
    stageId: number,
    travelerId: string
  ): Promise<{
    success: boolean;
    paymentId?: string;
    orderName?: string;
    amount?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      // 계약 확인
      const [contract] = await db
        .select()
        .from(contracts)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.travelerId, travelerId)
        ));

      if (!contract) {
        return { success: false, error: 'Contract not found or unauthorized' };
      }

      if (contract.status !== 'confirmed' && contract.status !== 'in_progress') {
        return { success: false, error: 'Contract is not ready for payment' };
      }

      const [stage] = await db
        .select()
        .from(contractStages)
        .where(and(
          eq(contractStages.id, stageId),
          eq(contractStages.contractId, contractId)
        ));

      if (!stage) {
        return { success: false, error: 'Payment stage not found' };
      }

      if (stage.status !== 'pending') {
        return { success: false, error: 'Payment stage is not pending' };
      }

      // 결제 ID 생성
      const paymentId = `tg_${contract.id}_${stage.name}_${nanoid(8)}`;
      const stageLabel = stage.name === 'deposit' ? '계약금' : stage.name === 'middle' ? '중도금' : '잔금';
      const orderName = `${contract.title} - ${stageLabel}`;

      console.log(`[Escrow] Payment initiated: ${paymentId} for ${orderName}`);

      return {
        success: true,
        paymentId,
        orderName,
        amount: parseInt(stage.amount),
        currency: stage.currency || 'USD',
      };
    } catch (error) {
      console.error('[Escrow] initiateStagePayment error:', error);
      return { success: false, error: 'Failed to initiate payment' };
    }
  }

  /**
   * 결제 완료 처리 (Webhook에서 호출)
   */
  async handlePaymentComplete(
    contractId: number,
    stageId: number,
    portonePaymentId: string,
    paidAmount: number
  ): Promise<EscrowResult> {
    try {
      const [stage] = await db
        .select()
        .from(contractStages)
        .where(and(
          eq(contractStages.id, stageId),
          eq(contractStages.contractId, contractId)
        ));

      if (!stage) {
        console.error(`[Escrow] Stage not found: ${stageId}`);
        return { success: false, error: 'Stage not found' };
      }

      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      // 금액 검증
      const expectedAmount = parseInt(stage.amount);
      if (paidAmount !== expectedAmount) {
        console.error(`[Escrow] Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`);
        return { success: false, error: 'Amount mismatch' };
      }

      // 에스크로 트랜잭션 생성
      const [escrowTx] = await db.insert(escrowTransactions).values({
        contractId: contract.id,
        milestoneType: stage.name as 'deposit' | 'midterm' | 'final',
        amount: paidAmount.toString(),
        currency: 'USD',
        status: 'funded',
        paymentId: portonePaymentId,
        fundedAt: new Date(),
      }).returning();

      if (!escrowTx) {
        return { success: false, error: 'Failed to create escrow transaction' };
      }

      // 단계 상태 업데이트
      await db
        .update(contractStages)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contractStages.id, stageId));

      // 계약 상태 업데이트
      if (stage.name === 'deposit') {
        await db
          .update(contracts)
          .set({
            status: 'in_progress',
            startedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contracts.id, contractId));
      }

      console.log(`[Escrow] Payment complete: Contract ${contractId}, Stage ${stage.name}, Amount ${paidAmount}`);

      return {
        success: true,
        contractId: contract.id,
        stageId: stage.id,
        transactionId: escrowTx.id,
      };
    } catch (error) {
      console.error('[Escrow] handlePaymentComplete error:', error);
      return { success: false, error: 'Failed to process payment' };
    }
  }

  /**
   * 서비스 완료 확인 및 정산 요청 (여행자가 확인)
   */
  async confirmServiceComplete(
    contractId: number,
    travelerId: string
  ): Promise<EscrowResult> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(and(
          eq(contracts.id, contractId),
          eq(contracts.travelerId, travelerId)
        ));

      if (!contract) {
        return { success: false, error: 'Contract not found or unauthorized' };
      }

      if (contract.status !== 'in_progress') {
        return { success: false, error: 'Contract is not in progress' };
      }

      // 계약 완료 상태로 변경
      await db
        .update(contracts)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      // 에스크로 트랜잭션 릴리즈
      await db
        .update(escrowTransactions)
        .set({
          status: 'released',
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrowTransactions.contractId, contractId),
          eq(escrowTransactions.status, 'completed')
        ));

      console.log(`[Escrow] Service complete: Contract ${contractId}`);

      return {
        success: true,
        contractId,
      };
    } catch (error) {
      console.error('[Escrow] confirmServiceComplete error:', error);
      return { success: false, error: 'Failed to confirm service' };
    }
  }

  /**
   * 분쟁 제기
   */
  async raiseDispute(
    contractId: number,
    raisedBy: string,
    reason: string
  ): Promise<EscrowResult> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      // 분쟁 당사자 확인
      if (raisedBy !== contract.travelerId && raisedBy !== contract.guideId) {
        return { success: false, error: 'Unauthorized to raise dispute' };
      }

      // 에스크로 동결
      await db
        .update(escrowTransactions)
        .set({
          status: 'frozen',
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrowTransactions.contractId, contractId),
          eq(escrowTransactions.status, 'completed')
        ));

      // 계약 상태 변경
      await db
        .update(contracts)
        .set({
          status: 'disputed',
          cancelReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      console.log(`[Escrow] Dispute raised: Contract ${contractId} by ${raisedBy}`);

      return { success: true, contractId };
    } catch (error) {
      console.error('[Escrow] raiseDispute error:', error);
      return { success: false, error: 'Failed to raise dispute' };
    }
  }

  /**
   * 계약 취소
   */
  async cancelContract(
    contractId: number,
    cancelledBy: string,
    reason: string
  ): Promise<EscrowResult> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      if (cancelledBy !== contract.travelerId && cancelledBy !== contract.guideId) {
        return { success: false, error: 'Unauthorized to cancel contract' };
      }

      if (contract.status === 'completed' || contract.status === 'cancelled') {
        return { success: false, error: 'Contract cannot be cancelled' };
      }

      // 계약 취소
      await db
        .update(contracts)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      // 미완료 결제 단계 취소
      await db
        .update(contractStages)
        .set({
          status: 'canceled',
          updatedAt: new Date(),
        })
        .where(and(
          eq(contractStages.contractId, contractId),
          eq(contractStages.status, 'pending')
        ));

      console.log(`[Escrow] Contract ${contractId} cancelled by ${cancelledBy}`);

      return { success: true, contractId };
    } catch (error) {
      console.error('[Escrow] cancelContract error:', error);
      return { success: false, error: 'Failed to cancel contract' };
    }
  }

  /**
   * 환불 처리
   */
  async processRefund(
    contractId: number,
    refundAmount: number,
    reason: string
  ): Promise<EscrowResult> {
    try {
      const transactions = await db
        .select()
        .from(escrowTransactions)
        .where(and(
          eq(escrowTransactions.contractId, contractId),
          sql`${escrowTransactions.status} IN ('completed', 'frozen')`
        ));

      if (transactions.length === 0) {
        return { success: false, error: 'No refundable transactions found' };
      }

      let remainingRefund = refundAmount;

      for (const tx of transactions) {
        if (remainingRefund <= 0) break;

        const txAmount = parseInt(tx.amount);
        const refundFromThis = Math.min(txAmount, remainingRefund);

        // PortOne 환불 요청
        if (tx.paymentId) {
          const refundResult = await portoneClient.cancelPayment(
            tx.paymentId,
            reason,
            refundFromThis
          );

          if (!refundResult.success) {
            console.error(`[Escrow] Refund failed for tx ${tx.id}:`, refundResult.error);
            continue;
          }
        }

        // 트랜잭션 상태 업데이트
        await db
          .update(escrowTransactions)
          .set({
            status: 'refunded',
            refundReason: `Refund: ${refundFromThis} KRW - ${reason}`,
            refundedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(escrowTransactions.id, tx.id));

        remainingRefund -= refundFromThis;
      }

      // 계약 상태 업데이트
      await db
        .update(contracts)
        .set({
          status: 'cancelled',
          cancelReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      console.log(`[Escrow] Refund processed: Contract ${contractId}, Amount ${refundAmount - remainingRefund}`);

      return {
        success: true,
        contractId,
      };
    } catch (error) {
      console.error('[Escrow] processRefund error:', error);
      return { success: false, error: 'Failed to process refund' };
    }
  }

  /**
   * 사용자의 계약 목록 조회
   */
  async getUserContracts(userId: string, role: 'traveler' | 'guide') {
    try {
      const whereClause = role === 'traveler'
        ? eq(contracts.travelerId, userId)
        : eq(contracts.guideId, userId);

      const userContracts = await db
        .select()
        .from(contracts)
        .where(whereClause)
        .orderBy(sql`${contracts.createdAt} DESC`);

      return { success: true, contracts: userContracts };
    } catch (error) {
      console.error('[Escrow] getUserContracts error:', error);
      return { success: false, error: 'Failed to get contracts' };
    }
  }

  /**
   * 가이드의 정산 내역 조회
   */
  async getGuidePayouts(guideId: string) {
    try {
      const guidePayouts = await db
        .select()
        .from(payouts)
        .where(eq(payouts.hostId, guideId))
        .orderBy(sql`${payouts.createdAt} DESC`);

      return { success: true, payouts: guidePayouts };
    } catch (error) {
      console.error('[Escrow] getGuidePayouts error:', error);
      return { success: false, error: 'Failed to get payouts' };
    }
  }

  /**
   * 에스크로 계좌 조회/생성
   */
  async getOrCreateEscrowAccount(userId: string, accountType: 'traveler' | 'host') {
    try {
      // 기존 계좌 조회
      const [existing] = await db
        .select()
        .from(escrowAccounts)
        .where(and(
          eq(escrowAccounts.userId, userId),
          eq(escrowAccounts.accountType, accountType)
        ));

      if (existing) {
        return { success: true, account: existing };
      }

      // 새 계좌 생성
      const [account] = await db.insert(escrowAccounts).values({
        userId,
        accountType,
        availableBalance: '0',
        pendingBalance: '0',
        withdrawableBalance: '0',
        currency: 'USD',
        status: 'active',
        kycStatus: 'pending',
      }).returning();

      return { success: true, account };
    } catch (error) {
      console.error('[Escrow] getOrCreateEscrowAccount error:', error);
      return { success: false, error: 'Failed to get/create account' };
    }
  }

  /**
   * 에스크로 해제 및 정산 처리
   * 서비스 완료 확인 후 가이드에게 정산금 지급
   */
  async releaseEscrow(
    contractId: number,
    approvedBy: string
  ): Promise<EscrowResult & { payoutId?: number; guideAmount?: number; platformFee?: number }> {
    try {
      const contract = await db.query.contracts.findFirst({
        where: eq(contracts.id, contractId),
      });

      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      if (contract.status !== 'completed') {
        return { success: false, error: 'Contract must be completed before release' };
      }

      if (contract.travelerId !== approvedBy) {
        return { success: false, error: 'Only the traveler can approve escrow release' };
      }

      const frozenTransactions = await db
        .select()
        .from(escrowTransactions)
        .where(and(
          eq(escrowTransactions.contractId, contractId),
          eq(escrowTransactions.status, 'frozen')
        ));

      if (frozenTransactions.length === 0) {
        return { success: false, error: 'No frozen funds to release' };
      }

      const totalFrozen = frozenTransactions.reduce(
        (sum, tx) => sum + parseInt(tx.amount),
        0
      );

      const platformFee = Math.floor(totalFrozen * this.PLATFORM_FEE_RATE);
      const guideAmount = totalFrozen - platformFee;

      await db
        .update(escrowTransactions)
        .set({
          status: 'released',
          platformFee: platformFee.toString(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrowTransactions.contractId, contractId),
          eq(escrowTransactions.status, 'frozen')
        ));

      const [payout] = await db.insert(payouts).values({
        hostId: contract.guideId,
        contractId: contractId,
        amount: guideAmount.toString(),
        currency: 'USD',
        platformFee: platformFee.toString(),
        status: 'pending',
        payoutMethod: 'bank_transfer',
      }).returning();

      const guideAccount = await this.getOrCreateEscrowAccount(contract.guideId, 'host');
      if (guideAccount.success && guideAccount.account) {
        const currentPending = parseInt(guideAccount.account.pendingBalance || '0');
        await db
          .update(escrowAccounts)
          .set({
            pendingBalance: (currentPending + guideAmount).toString(),
            updatedAt: new Date(),
          })
          .where(eq(escrowAccounts.id, guideAccount.account.id));
      }

      console.log(`[Escrow] Released: Contract ${contractId}, Total ${totalFrozen}, Guide ${guideAmount}, Fee ${platformFee}`);

      return {
        success: true,
        contractId,
        payoutId: payout.id,
        guideAmount,
        platformFee,
      };
    } catch (error) {
      console.error('[Escrow] releaseEscrow error:', error);
      return { success: false, error: 'Failed to release escrow' };
    }
  }

  /**
   * 정산금 출금 처리 (가이드 → 은행계좌)
   */
  async processPayoutWithdrawal(
    payoutId: number,
    guideId: string
  ): Promise<EscrowResult & { withdrawnAmount?: number }> {
    try {
      const [payout] = await db
        .select()
        .from(payouts)
        .where(and(
          eq(payouts.id, payoutId),
          eq(payouts.hostId, guideId)
        ));

      if (!payout) {
        return { success: false, error: 'Payout not found or unauthorized' };
      }

      if (payout.status !== 'pending') {
        return { success: false, error: `Payout already ${payout.status}` };
      }

      await db
        .update(payouts)
        .set({
          status: 'processing',
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payouts.id, payoutId));

      const guideAccount = await this.getOrCreateEscrowAccount(guideId, 'host');
      const payoutAmount = parseInt(payout.amount);
      
      if (guideAccount.success && guideAccount.account) {
        const currentPending = parseInt(guideAccount.account.pendingBalance || '0');
        const currentWithdrawable = parseInt(guideAccount.account.withdrawableBalance || '0');
        
        await db
          .update(escrowAccounts)
          .set({
            pendingBalance: Math.max(0, currentPending - payoutAmount).toString(),
            withdrawableBalance: (currentWithdrawable + payoutAmount).toString(),
            updatedAt: new Date(),
          })
          .where(eq(escrowAccounts.id, guideAccount.account.id));
      }

      console.log(`[Escrow] Payout processing: ${payoutId}, Amount ${payoutAmount}`);

      return {
        success: true,
        payoutId,
        withdrawnAmount: payoutAmount,
      };
    } catch (error) {
      console.error('[Escrow] processPayoutWithdrawal error:', error);
      return { success: false, error: 'Failed to process payout' };
    }
  }

  /**
   * 정산 완료 확인 (은행 송금 완료 후)
   */
  async confirmPayoutCompleted(payoutId: number): Promise<EscrowResult> {
    try {
      await db
        .update(payouts)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payouts.id, payoutId));

      const [payout] = await db
        .select()
        .from(payouts)
        .where(eq(payouts.id, payoutId));

      if (payout) {
        const guideAccount = await this.getOrCreateEscrowAccount(payout.hostId, 'host');
        const payoutAmount = parseInt(payout.amount);
        
        if (guideAccount.success && guideAccount.account) {
          const currentWithdrawable = parseInt(guideAccount.account.withdrawableBalance || '0');
          
          await db
            .update(escrowAccounts)
            .set({
              withdrawableBalance: Math.max(0, currentWithdrawable - payoutAmount).toString(),
              updatedAt: new Date(),
            })
            .where(eq(escrowAccounts.id, guideAccount.account.id));
        }
      }

      console.log(`[Escrow] Payout completed: ${payoutId}`);

      return { success: true, payoutId };
    } catch (error) {
      console.error('[Escrow] confirmPayoutCompleted error:', error);
      return { success: false, error: 'Failed to confirm payout' };
    }
  }
}

export const escrowService = new EscrowService();
