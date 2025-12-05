/**
 * 분할 결제 서비스 - Tourgether P2P 공유경제 플랫폼 (Phase 13)
 * 
 * 핵심 기능:
 * - 계약금/중도금/잔금 분할 결제 관리
 * - 마일스톤 생성 및 납부 기한 설정
 * - 마일스톤별 결제 처리
 * - 자동 마일스톤 진행 관리
 * - 부분 환불 처리
 * 
 * 결제 플랜:
 * - single: 일시불 (100%)
 * - two_step: 계약금(30%) + 잔금(70%)
 * - three_step: 계약금(30%) + 중도금(30%) + 잔금(40%)
 */

import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  contracts,
  contractStages,
  escrowTransactions,
  escrowAccounts,
  type Contract,
  type EscrowTransaction,
} from '@shared/schema';

export type PaymentPlan = 'single' | 'two_step' | 'three_step';
export type MilestoneType = 'deposit' | 'interim' | 'final';

export interface SplitPaymentConfig {
  paymentPlan: PaymentPlan;
  depositRate: number;
  interimRate: number;
  finalRate: number;
  depositDueDate?: string;
  interimDueDate?: string;
  finalDueDate?: string;
}

export interface MilestoneInfo {
  type: MilestoneType;
  amount: number;
  rate: number;
  dueDate: string | null;
  status: string;
  isPaid: boolean;
  escrowTransactionId?: number;
}

export interface ContractPaymentSummary {
  contractId: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currentMilestone: string;
  milestones: MilestoneInfo[];
  nextPaymentDue?: {
    type: MilestoneType;
    amount: number;
    dueDate: string | null;
  };
}

const DEFAULT_RATES = {
  single: { deposit: 100, interim: 0, final: 0 },
  two_step: { deposit: 30, interim: 0, final: 70 },
  three_step: { deposit: 30, interim: 30, final: 40 },
};

class SplitPaymentService {
  /**
   * 분할 결제 설정 검증
   */
  validateConfig(config: SplitPaymentConfig): { valid: boolean; error?: string } {
    const { paymentPlan, depositRate, interimRate, finalRate } = config;
    
    const totalRate = depositRate + interimRate + finalRate;
    
    if (Math.abs(totalRate - 100) > 0.01) {
      return { valid: false, error: `Rate sum must be 100%, got ${totalRate}%` };
    }

    if (paymentPlan === 'single' && (depositRate !== 100 || interimRate !== 0 || finalRate !== 0)) {
      return { valid: false, error: 'Single payment must be 100% deposit' };
    }

    if (paymentPlan === 'two_step' && interimRate !== 0) {
      return { valid: false, error: 'Two-step payment cannot have interim rate' };
    }

    if (paymentPlan === 'three_step' && interimRate === 0) {
      return { valid: false, error: 'Three-step payment must have interim rate > 0' };
    }

    if (depositRate < 0 || interimRate < 0 || finalRate < 0) {
      return { valid: false, error: 'Rates cannot be negative' };
    }

    return { valid: true };
  }

  /**
   * 기본 비율 가져오기
   */
  getDefaultRates(paymentPlan: PaymentPlan): { deposit: number; interim: number; final: number } {
    return DEFAULT_RATES[paymentPlan] || DEFAULT_RATES.single;
  }

  /**
   * 마일스톤 금액 계산
   */
  calculateMilestoneAmounts(totalAmount: number, config: SplitPaymentConfig): {
    depositAmount: number;
    interimAmount: number;
    finalAmount: number;
  } {
    const depositAmount = Math.round(totalAmount * config.depositRate / 100);
    const interimAmount = Math.round(totalAmount * config.interimRate / 100);
    const finalAmount = totalAmount - depositAmount - interimAmount;

    return { depositAmount, interimAmount, finalAmount };
  }

  /**
   * 계약 생성 시 분할 결제 설정 적용
   */
  async setupSplitPayment(
    contractId: number,
    config: SplitPaymentConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract) {
        return { success: false, error: 'Contract not found' };
      }

      const totalAmount = parseFloat(contract.totalAmount);
      const { depositAmount, interimAmount, finalAmount } = this.calculateMilestoneAmounts(totalAmount, config);

      await db.update(contracts).set({
        paymentType: config.paymentPlan === 'single' ? 'full' : 'split',
        paymentPlan: config.paymentPlan,
        depositRate: config.depositRate.toString(),
        interimRate: config.interimRate.toString(),
        finalRate: config.finalRate.toString(),
        depositAmount: depositAmount.toString(),
        interimAmount: interimAmount > 0 ? interimAmount.toString() : null,
        finalAmount: finalAmount > 0 ? finalAmount.toString() : null,
        depositDueDate: config.depositDueDate || null,
        interimDueDate: config.interimDueDate || null,
        finalDueDate: config.finalDueDate || null,
        currentMilestone: 'deposit',
        updatedAt: new Date(),
      }).where(eq(contracts.id, contractId));

      await this.createMilestoneTransactions(contractId, config, {
        depositAmount,
        interimAmount,
        finalAmount,
      });

      console.log(`[SplitPayment] Setup complete for contract ${contractId}: ${config.paymentPlan}`);
      return { success: true };
    } catch (error) {
      console.error('[SplitPayment] setupSplitPayment error:', error);
      return { success: false, error: 'Failed to setup split payment' };
    }
  }

  /**
   * 마일스톤 에스크로 트랜잭션 생성
   */
  private async createMilestoneTransactions(
    contractId: number,
    config: SplitPaymentConfig,
    amounts: { depositAmount: number; interimAmount: number; finalAmount: number }
  ): Promise<void> {
    const milestones: Array<{
      type: MilestoneType;
      amount: number;
      dueDate: string | null;
    }> = [];

    if (amounts.depositAmount > 0) {
      milestones.push({
        type: 'deposit',
        amount: amounts.depositAmount,
        dueDate: config.depositDueDate || null,
      });
    }

    if (amounts.interimAmount > 0) {
      milestones.push({
        type: 'interim',
        amount: amounts.interimAmount,
        dueDate: config.interimDueDate || null,
      });
    }

    if (amounts.finalAmount > 0) {
      milestones.push({
        type: 'final',
        amount: amounts.finalAmount,
        dueDate: config.finalDueDate || null,
      });
    }

    for (const milestone of milestones) {
      const platformFee = Math.round(milestone.amount * 0.12);
      
      await db.insert(escrowTransactions).values({
        contractId,
        milestoneType: milestone.type,
        amount: milestone.amount.toString(),
        refundedAmount: '0',
        outstandingAmount: milestone.amount.toString(),
        currency: 'USD',
        status: 'pending',
        platformFee: platformFee.toString(),
        dueDate: milestone.dueDate,
      });
    }
  }

  /**
   * 계약의 결제 요약 조회
   */
  async getContractPaymentSummary(contractId: number): Promise<ContractPaymentSummary | null> {
    try {
      const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId));

      if (!contract) {
        return null;
      }

      const transactions = await db
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.contractId, contractId));

      const totalAmount = parseFloat(contract.totalAmount);
      let paidAmount = 0;
      const milestones: MilestoneInfo[] = [];

      if (transactions.length > 0) {
        for (const tx of transactions) {
          const amount = parseFloat(tx.amount);
          const refunded = parseFloat(tx.refundedAmount || '0');
          const isPaid = ['funded', 'released'].includes(tx.status || '');
          
          if (isPaid) {
            paidAmount += amount - refunded;
          }

          milestones.push({
            type: tx.milestoneType as MilestoneType,
            amount,
            rate: this.calculateRate(amount, totalAmount),
            dueDate: tx.dueDate,
            status: tx.status || 'pending',
            isPaid,
            escrowTransactionId: tx.id,
          });
        }
      } else {
        const stages = await db
          .select()
          .from(contractStages)
          .where(eq(contractStages.contractId, contractId))
          .orderBy(contractStages.stageOrder);

        for (const stage of stages) {
          const amount = parseFloat(stage.amount);
          const stageType = stage.name === 'deposit' ? 'deposit' : 
                           stage.name === 'interim' ? 'interim' : 'final';
          
          milestones.push({
            type: stageType as MilestoneType,
            amount,
            rate: this.calculateRate(amount, totalAmount),
            dueDate: null,
            status: stage.status || 'pending',
            isPaid: stage.status === 'paid',
          });
        }
      }

      const pendingMilestone = milestones.find(m => !m.isPaid);
      
      return {
        contractId,
        totalAmount,
        paidAmount,
        remainingAmount: totalAmount - paidAmount,
        currentMilestone: contract.currentMilestone || 'deposit',
        milestones,
        nextPaymentDue: pendingMilestone ? {
          type: pendingMilestone.type,
          amount: pendingMilestone.amount,
          dueDate: pendingMilestone.dueDate,
        } : undefined,
      };
    } catch (error) {
      console.error('[SplitPayment] getContractPaymentSummary error:', error);
      return null;
    }
  }

  private calculateRate(amount: number, total: number): number {
    return Math.round((amount / total) * 100 * 100) / 100;
  }

  /**
   * 마일스톤 결제 처리
   * - Idempotency: 동일 paymentId 중복 처리 방지
   * - 금액 검증: 예상 금액과 일치 여부 확인 (필수)
   */
  async processMilestonePayment(
    escrowTransactionId: number,
    paymentId: string,
    paymentMethod: string,
    paidAmount: number
  ): Promise<{ success: boolean; error?: string; nextMilestone?: string }> {
    try {
      const [tx] = await db
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.id, escrowTransactionId));

      if (!tx) {
        return { success: false, error: 'Transaction not found' };
      }

      if (tx.status !== 'pending') {
        return { success: false, error: `Invalid status: ${tx.status}` };
      }

      if (tx.paymentId === paymentId) {
        return { success: false, error: 'Duplicate payment: already processed with this paymentId' };
      }

      const [existingPayment] = await db
        .select({ id: escrowTransactions.id })
        .from(escrowTransactions)
        .where(eq(escrowTransactions.paymentId, paymentId));
        
      if (existingPayment) {
        return { success: false, error: 'Payment ID already used for another transaction' };
      }

      const expectedAmount = parseFloat(tx.amount);
      if (Math.abs(paidAmount - expectedAmount) > 0.01) {
        return { 
          success: false, 
          error: `Amount mismatch: expected ${expectedAmount}, got ${paidAmount}` 
        };
      }

      await db.update(escrowTransactions).set({
        status: 'funded',
        paymentId,
        paymentMethod,
        fundedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(escrowTransactions.id, escrowTransactionId));

      await this.updateHostEscrowBalance(tx.contractId, parseFloat(tx.amount));

      const nextMilestone = await this.advanceMilestone(tx.contractId, tx.milestoneType as MilestoneType);

      console.log(`[SplitPayment] Milestone ${tx.milestoneType} paid for contract ${tx.contractId}`);
      
      return { success: true, nextMilestone };
    } catch (error) {
      console.error('[SplitPayment] processMilestonePayment error:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * 호스트 에스크로 계정 잔액 업데이트
   */
  private async updateHostEscrowBalance(contractId: number, amount: number): Promise<void> {
    const [contract] = await db
      .select({ guideId: contracts.guideId })
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) return;

    const [account] = await db
      .select()
      .from(escrowAccounts)
      .where(and(
        eq(escrowAccounts.userId, contract.guideId),
        eq(escrowAccounts.accountType, 'host')
      ));

    if (account) {
      const currentPending = parseFloat(account.pendingBalance || '0');
      await db.update(escrowAccounts).set({
        pendingBalance: (currentPending + amount).toString(),
        updatedAt: new Date(),
      }).where(eq(escrowAccounts.id, account.id));
    } else {
      await db.insert(escrowAccounts).values({
        userId: contract.guideId,
        accountType: 'host',
        currency: 'USD',
        pendingBalance: amount.toString(),
        withdrawableBalance: '0',
        kycStatus: 'pending',
      });
    }
  }

  /**
   * 마일스톤 진행
   */
  private async advanceMilestone(contractId: number, completedMilestone: MilestoneType): Promise<string> {
    const nextMilestoneMap: Record<MilestoneType, string> = {
      deposit: 'interim',
      interim: 'final',
      final: 'completed',
    };

    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) return 'deposit';

    let nextMilestone = nextMilestoneMap[completedMilestone];

    if (contract.paymentPlan === 'two_step' && completedMilestone === 'deposit') {
      nextMilestone = 'final';
    }

    if (contract.paymentPlan === 'single') {
      nextMilestone = 'completed';
    }

    await db.update(contracts).set({
      currentMilestone: nextMilestone,
      updatedAt: new Date(),
    }).where(eq(contracts.id, contractId));

    return nextMilestone;
  }

  /**
   * 마일스톤 릴리스 (서비스 완료 후)
   * - Idempotency: 이미 릴리스된 마일스톤 중복 처리 방지
   * - 호스트 잔액 pending → withdrawable 이동
   */
  async releaseMilestone(
    escrowTransactionId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [tx] = await db
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.id, escrowTransactionId));

      if (!tx) {
        return { success: false, error: 'Transaction not found' };
      }

      if (tx.status === 'released') {
        return { success: false, error: 'Already released: duplicate request' };
      }

      if (tx.status !== 'funded') {
        return { success: false, error: `Cannot release: status is ${tx.status}` };
      }

      await db.update(escrowTransactions).set({
        status: 'released',
        releasedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(escrowTransactions.id, escrowTransactionId));

      await this.moveToWithdrawableBalance(tx.contractId, parseFloat(tx.amount));

      console.log(`[SplitPayment] Milestone ${tx.milestoneType} released for contract ${tx.contractId}`);
      
      return { success: true };
    } catch (error) {
      console.error('[SplitPayment] releaseMilestone error:', error);
      return { success: false, error: 'Release failed' };
    }
  }

  /**
   * 호스트 잔액: pending → withdrawable 이동 (릴리스 시)
   */
  private async moveToWithdrawableBalance(contractId: number, amount: number): Promise<void> {
    const [contract] = await db
      .select({ guideId: contracts.guideId })
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) return;

    const [account] = await db
      .select()
      .from(escrowAccounts)
      .where(and(
        eq(escrowAccounts.userId, contract.guideId),
        eq(escrowAccounts.accountType, 'host')
      ));

    if (account) {
      const currentPending = parseFloat(account.pendingBalance || '0');
      const currentWithdrawable = parseFloat(account.withdrawableBalance || '0');
      
      await db.update(escrowAccounts).set({
        pendingBalance: Math.max(0, currentPending - amount).toString(),
        withdrawableBalance: (currentWithdrawable + amount).toString(),
        updatedAt: new Date(),
      }).where(eq(escrowAccounts.id, account.id));
      
      console.log(`[SplitPayment] Balance moved to withdrawable: ${amount}`);
    }
  }

  /**
   * 호스트 에스크로 계정 잔액 차감 (환불 시)
   */
  private async deductHostEscrowBalance(contractId: number, amount: number, wasReleased: boolean): Promise<void> {
    const [contract] = await db
      .select({ guideId: contracts.guideId })
      .from(contracts)
      .where(eq(contracts.id, contractId));

    if (!contract) return;

    const [account] = await db
      .select()
      .from(escrowAccounts)
      .where(and(
        eq(escrowAccounts.userId, contract.guideId),
        eq(escrowAccounts.accountType, 'host')
      ));

    if (account) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      
      if (wasReleased) {
        const currentWithdrawable = parseFloat(account.withdrawableBalance || '0');
        updates.withdrawableBalance = Math.max(0, currentWithdrawable - amount).toString();
      } else {
        const currentPending = parseFloat(account.pendingBalance || '0');
        updates.pendingBalance = Math.max(0, currentPending - amount).toString();
      }
      
      await db.update(escrowAccounts).set(updates).where(eq(escrowAccounts.id, account.id));
      console.log(`[SplitPayment] Host balance deducted: ${amount}, wasReleased: ${wasReleased}`);
    }
  }

  /**
   * 부분 환불 처리
   * - 호스트 잔액에서 환불 금액 차감
   */
  async processPartialRefund(
    escrowTransactionId: number,
    refundAmount: number,
    reason: string
  ): Promise<{ success: boolean; error?: string; newStatus?: string }> {
    try {
      const [tx] = await db
        .select()
        .from(escrowTransactions)
        .where(eq(escrowTransactions.id, escrowTransactionId));

      if (!tx) {
        return { success: false, error: 'Transaction not found' };
      }

      if (!['funded', 'released'].includes(tx.status || '')) {
        return { success: false, error: `Cannot refund: status is ${tx.status}` };
      }

      const amount = parseFloat(tx.amount);
      const currentRefunded = parseFloat(tx.refundedAmount || '0');
      const totalRefunded = currentRefunded + refundAmount;

      if (totalRefunded > amount) {
        return { success: false, error: `Refund exceeds available amount (${amount - currentRefunded})` };
      }

      const outstanding = amount - totalRefunded;
      const newStatus = outstanding === 0 ? 'refunded' : 'partial_refund';

      await db.update(escrowTransactions).set({
        refundedAmount: totalRefunded.toString(),
        outstandingAmount: outstanding.toString(),
        status: newStatus,
        refundReason: reason,
        refundedAt: outstanding === 0 ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(escrowTransactions.id, escrowTransactionId));

      await this.deductHostEscrowBalance(tx.contractId, refundAmount, tx.status === 'released');

      console.log(`[SplitPayment] Partial refund ${refundAmount} for transaction ${escrowTransactionId}`);
      
      return { success: true, newStatus };
    } catch (error) {
      console.error('[SplitPayment] processPartialRefund error:', error);
      return { success: false, error: 'Refund processing failed' };
    }
  }

  /**
   * 전체 환불 처리
   * - 호스트 잔액에서 환불 금액 차감
   */
  async processFullRefund(
    contractId: number,
    reason: string
  ): Promise<{ success: boolean; error?: string; refundedTransactions: number[] }> {
    try {
      const transactions = await db
        .select()
        .from(escrowTransactions)
        .where(and(
          eq(escrowTransactions.contractId, contractId),
          inArray(escrowTransactions.status, ['funded', 'partial_refund', 'released'])
        ));

      const refundedIds: number[] = [];
      let totalRefundAmount = 0;
      let releasedRefundAmount = 0;

      for (const tx of transactions) {
        const amount = parseFloat(tx.amount);
        const refunded = parseFloat(tx.refundedAmount || '0');
        const remaining = amount - refunded;

        if (remaining > 0) {
          await db.update(escrowTransactions).set({
            refundedAmount: amount.toString(),
            outstandingAmount: '0',
            status: 'refunded',
            refundReason: reason,
            refundedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(escrowTransactions.id, tx.id));

          refundedIds.push(tx.id);
          totalRefundAmount += remaining;
          
          if (tx.status === 'released') {
            releasedRefundAmount += remaining;
          }
        }
      }

      if (totalRefundAmount > 0) {
        const pendingRefund = totalRefundAmount - releasedRefundAmount;
        if (pendingRefund > 0) {
          await this.deductHostEscrowBalance(contractId, pendingRefund, false);
        }
        if (releasedRefundAmount > 0) {
          await this.deductHostEscrowBalance(contractId, releasedRefundAmount, true);
        }
      }

      await db.update(contracts).set({
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(contracts.id, contractId));

      console.log(`[SplitPayment] Full refund for contract ${contractId}, ${refundedIds.length} transactions, total: ${totalRefundAmount}`);
      
      return { success: true, refundedTransactions: refundedIds };
    } catch (error) {
      console.error('[SplitPayment] processFullRefund error:', error);
      return { success: false, error: 'Refund processing failed', refundedTransactions: [] };
    }
  }

  /**
   * 납부 기한 지난 마일스톤 조회
   */
  async getOverdueMilestones(): Promise<EscrowTransaction[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const overdue = await db
        .select()
        .from(escrowTransactions)
        .where(and(
          eq(escrowTransactions.status, 'pending'),
          sql`${escrowTransactions.dueDate} < ${today}`
        ));

      return overdue;
    } catch (error) {
      console.error('[SplitPayment] getOverdueMilestones error:', error);
      return [];
    }
  }

  /**
   * 모든 마일스톤 완료 확인
   */
  async checkAllMilestonesComplete(contractId: number): Promise<boolean> {
    const transactions = await db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.contractId, contractId));

    return transactions.every(tx => tx.status === 'released');
  }

  /**
   * 계약 완료 처리 (모든 마일스톤 릴리스 후)
   */
  async completeContract(contractId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const allComplete = await this.checkAllMilestonesComplete(contractId);
      
      if (!allComplete) {
        return { success: false, error: 'Not all milestones are released' };
      }

      await db.update(contracts).set({
        status: 'completed',
        currentMilestone: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(contracts.id, contractId));

      console.log(`[SplitPayment] Contract ${contractId} completed`);
      
      return { success: true };
    } catch (error) {
      console.error('[SplitPayment] completeContract error:', error);
      return { success: false, error: 'Failed to complete contract' };
    }
  }
}

export const splitPaymentService = new SplitPaymentService();
