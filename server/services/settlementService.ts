/**
 * 호스트 정산 서비스 - Tourgether P2P 공유경제 플랫폼
 * 
 * 핵심 기능:
 * - 릴리스된 에스크로 트랜잭션 수집
 * - 호스트별 그룹화 및 KYC 검증
 * - 최소 정산 금액(10,000원) 필터링
 * - PortOne Transfer API를 통한 실제 계좌 이체
 * - 정산 완료 기록 및 상태 관리
 * 
 * 정산 주기: 매일 02:00 KST
 * 
 * 참고: docs/pricing_dev_update.md 섹션 2.9.3
 */

import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  escrowTransactions,
  escrowAccounts,
  payouts,
  contracts,
  users,
  type Payout,
  type EscrowTransaction,
} from '@shared/schema';
import { portoneClient } from './portoneClient';

const MINIMUM_PAYOUT_AMOUNT = 10000; // 최소 정산 금액 (10,000원)
const SETTLEMENT_ENABLED = process.env.SETTLEMENT_ENABLED === 'true';

export interface SettlementSummary {
  success: boolean;
  processedCount: number;
  totalAmount: number;
  skippedKycCount: number;
  belowMinCount: number;
  failedCount: number;
  payoutIds: number[];
  errors: string[];
}

export interface HostSettlementGroup {
  hostId: string;
  hostName: string;
  hostEmail: string | null;
  kycStatus: string;
  totalAmount: number;
  transactionIds: number[];
  transactionCount: number;
  bankCode: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
}

class SettlementService {
  /**
   * 릴리스되었지만 아직 정산되지 않은 에스크로 트랜잭션 조회
   */
  async listReleasedTransactionsWithoutPayout(): Promise<EscrowTransaction[]> {
    try {
      const transactions = await db
        .select()
        .from(escrowTransactions)
        .where(and(
          eq(escrowTransactions.status, 'released'),
          isNull(escrowTransactions.payoutId)
        ));
      
      return transactions;
    } catch (error) {
      console.error('[Settlement] listReleasedTransactionsWithoutPayout error:', error);
      return [];
    }
  }

  /**
   * 호스트별로 그룹화하고 KYC/최소금액 필터링
   */
  async groupByHostAndFilter(
    transactions: EscrowTransaction[]
  ): Promise<{
    eligible: HostSettlementGroup[];
    skippedKyc: HostSettlementGroup[];
    belowMin: HostSettlementGroup[];
  }> {
    const eligible: HostSettlementGroup[] = [];
    const skippedKyc: HostSettlementGroup[] = [];
    const belowMin: HostSettlementGroup[] = [];

    if (transactions.length === 0) {
      return { eligible, skippedKyc, belowMin };
    }

    const contractIds = Array.from(new Set(transactions.map(tx => tx.contractId)));
    
    const contractsData = await db
      .select({
        id: contracts.id,
        guideId: contracts.guideId,
      })
      .from(contracts)
      .where(inArray(contracts.id, contractIds));

    const contractGuideMap = new Map(contractsData.map(c => [c.id, c.guideId]));

    const hostGroups = new Map<string, {
      totalAmount: number;
      transactionIds: number[];
    }>();

    for (const tx of transactions) {
      const hostId = contractGuideMap.get(tx.contractId);
      if (!hostId) continue;

      const txAmount = parseFloat(tx.amount);
      const platformFee = parseFloat(tx.platformFee || '0');
      const amount = txAmount - platformFee;
      
      if (!hostGroups.has(hostId)) {
        hostGroups.set(hostId, { totalAmount: 0, transactionIds: [] });
      }
      
      const group = hostGroups.get(hostId)!;
      group.totalAmount += amount;
      group.transactionIds.push(tx.id);
    }

    const hostIds = Array.from(hostGroups.keys());
    
    const [hostUsers, hostAccounts] = await Promise.all([
      db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }).from(users).where(inArray(users.id, hostIds)),
      db.select().from(escrowAccounts).where(and(
        inArray(escrowAccounts.userId, hostIds),
        eq(escrowAccounts.accountType, 'host')
      )),
    ]);

    const userMap = new Map(hostUsers.map(u => [u.id, u]));
    const accountMap = new Map(hostAccounts.map(a => [a.userId, a]));

    for (const [hostId, groupData] of Array.from(hostGroups.entries())) {
      const user = userMap.get(hostId);
      const account = accountMap.get(hostId);
      const hostName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown' : 'Unknown';

      const settlementGroup: HostSettlementGroup = {
        hostId,
        hostName,
        hostEmail: user?.email || null,
        kycStatus: account?.kycStatus || 'pending',
        totalAmount: groupData.totalAmount,
        transactionIds: groupData.transactionIds,
        transactionCount: groupData.transactionIds.length,
        bankCode: account?.bankCode || null,
        accountNumber: account?.accountNumber || null,
        accountHolderName: account?.accountHolderName || null,
      };

      if (account?.kycStatus !== 'verified') {
        skippedKyc.push(settlementGroup);
      } else if (groupData.totalAmount < MINIMUM_PAYOUT_AMOUNT) {
        belowMin.push(settlementGroup);
      } else {
        eligible.push(settlementGroup);
      }
    }

    return { eligible, skippedKyc, belowMin };
  }

  /**
   * 새 정산 레코드 생성
   */
  async createPayout(
    group: HostSettlementGroup,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Payout | null> {
    try {
      const platformFees = Math.floor(group.totalAmount * 0.12 / 0.88);
      const grossAmount = group.totalAmount + platformFees;

      const [payout] = await db.insert(payouts).values({
        hostId: group.hostId,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        grossAmount: grossAmount.toString(),
        totalFees: platformFees.toString(),
        netAmount: group.totalAmount.toString(),
        currency: 'KRW',
        transactionCount: group.transactionCount,
        status: 'pending',
        bankCode: group.bankCode,
        accountNumber: group.accountNumber,
        accountHolderName: group.accountHolderName,
        scheduledAt: new Date(),
        metadata: { transactionIds: group.transactionIds },
      }).returning();

      return payout || null;
    } catch (error) {
      console.error('[Settlement] createPayout error:', error);
      return null;
    }
  }

  /**
   * 에스크로 트랜잭션에 정산 ID 연결
   */
  async attachTransactionsToPayout(
    transactionIds: number[],
    payoutId: number
  ): Promise<boolean> {
    try {
      await db
        .update(escrowTransactions)
        .set({
          payoutId,
          updatedAt: new Date(),
        })
        .where(inArray(escrowTransactions.id, transactionIds));

      return true;
    } catch (error) {
      console.error('[Settlement] attachTransactionsToPayout error:', error);
      return false;
    }
  }

  /**
   * 에스크로 계좌 잔액 이동 (pending → withdrawable)
   */
  async moveToWithdrawable(
    hostId: string,
    amount: number
  ): Promise<boolean> {
    try {
      const [account] = await db
        .select()
        .from(escrowAccounts)
        .where(and(
          eq(escrowAccounts.userId, hostId),
          eq(escrowAccounts.accountType, 'host')
        ));

      if (!account) {
        console.warn(`[Settlement] No escrow account for host ${hostId}`);
        return false;
      }

      const currentPending = parseFloat(account.pendingBalance || '0');
      const currentWithdrawable = parseFloat(account.withdrawableBalance || '0');

      await db
        .update(escrowAccounts)
        .set({
          pendingBalance: Math.max(0, currentPending - amount).toString(),
          withdrawableBalance: (currentWithdrawable + amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, account.id));

      return true;
    } catch (error) {
      console.error('[Settlement] moveToWithdrawable error:', error);
      return false;
    }
  }

  /**
   * 정산 처리 (PortOne Transfer API 호출)
   */
  async processPayout(payoutId: number): Promise<{
    success: boolean;
    error?: string;
    transferId?: string;
  }> {
    try {
      const [payout] = await db
        .select()
        .from(payouts)
        .where(eq(payouts.id, payoutId));

      if (!payout) {
        return { success: false, error: 'Payout not found' };
      }

      if (!['pending', 'processing'].includes(payout.status || '')) {
        return { success: false, error: `Invalid payout status: ${payout.status}` };
      }

      if (!payout.bankCode || !payout.accountNumber || !payout.accountHolderName) {
        await db.update(payouts).set({
          status: 'on_hold',
          failureReason: 'Bank account information incomplete',
          updatedAt: new Date(),
        }).where(eq(payouts.id, payoutId));
        
        return { success: false, error: 'Bank account information incomplete' };
      }

      await db.update(payouts).set({
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(payouts.id, payoutId));

      const transferResult = await portoneClient.transferToBank({
        amount: parseInt(payout.netAmount),
        bankCode: payout.bankCode,
        accountNumber: payout.accountNumber,
        accountHolderName: payout.accountHolderName,
        reason: `Tourgether 정산 #${payoutId}`,
      });

      if (transferResult.success) {
        await db.update(payouts).set({
          status: 'completed',
          portoneTransferId: transferResult.transferId,
          portoneTransferStatus: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(payouts.id, payoutId));

        console.log(`[Settlement] Payout ${payoutId} completed: ${payout.netAmount} KRW`);
        
        return { 
          success: true, 
          transferId: transferResult.transferId || undefined 
        };
      } else {
        await db.update(payouts).set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: transferResult.error || 'Transfer failed',
          updatedAt: new Date(),
        }).where(eq(payouts.id, payoutId));

        console.error(`[Settlement] Payout ${payoutId} failed: ${transferResult.error}`);
        
        return { success: false, error: transferResult.error || 'Transfer failed' };
      }
    } catch (error) {
      console.error('[Settlement] processPayout error:', error);
      
      await db.update(payouts).set({
        status: 'failed',
        failedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      }).where(eq(payouts.id, payoutId));

      return { success: false, error: 'Processing error' };
    }
  }

  /**
   * 출금 완료 후 withdrawable 잔액 차감
   */
  async deductFromWithdrawable(
    hostId: string,
    amount: number
  ): Promise<boolean> {
    try {
      const [account] = await db
        .select()
        .from(escrowAccounts)
        .where(and(
          eq(escrowAccounts.userId, hostId),
          eq(escrowAccounts.accountType, 'host')
        ));

      if (!account) return false;

      const currentWithdrawable = parseFloat(account.withdrawableBalance || '0');

      await db
        .update(escrowAccounts)
        .set({
          withdrawableBalance: Math.max(0, currentWithdrawable - amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, account.id));

      return true;
    } catch (error) {
      console.error('[Settlement] deductFromWithdrawable error:', error);
      return false;
    }
  }

  /**
   * 일일 정산 배치 실행
   * @param cutoffDate 정산 기준일 (기본: 어제)
   */
  async runDailySettlement(cutoffDate?: Date): Promise<SettlementSummary> {
    const summary: SettlementSummary = {
      success: true,
      processedCount: 0,
      totalAmount: 0,
      skippedKycCount: 0,
      belowMinCount: 0,
      failedCount: 0,
      payoutIds: [],
      errors: [],
    };

    if (!SETTLEMENT_ENABLED) {
      console.log('[Settlement] Settlement is disabled (SETTLEMENT_ENABLED=false)');
      summary.success = false;
      summary.errors.push('Settlement is disabled');
      return summary;
    }

    const now = cutoffDate || new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(0, 0, 0, 0);
    
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 1);

    console.log(`[Settlement] Starting daily settlement for ${periodStart.toISOString()} ~ ${periodEnd.toISOString()}`);

    try {
      const releasedTx = await this.listReleasedTransactionsWithoutPayout();
      
      if (releasedTx.length === 0) {
        console.log('[Settlement] No released transactions to process');
        return summary;
      }

      console.log(`[Settlement] Found ${releasedTx.length} released transactions`);

      const { eligible, skippedKyc, belowMin } = await this.groupByHostAndFilter(releasedTx);

      summary.skippedKycCount = skippedKyc.length;
      summary.belowMinCount = belowMin.length;

      if (skippedKyc.length > 0) {
        console.log(`[Settlement] Skipped ${skippedKyc.length} hosts (KYC not verified)`);
        skippedKyc.forEach(g => {
          console.log(`  - Host ${g.hostId}: ${g.totalAmount} KRW (KYC: ${g.kycStatus})`);
        });
      }

      if (belowMin.length > 0) {
        console.log(`[Settlement] Skipped ${belowMin.length} hosts (below minimum ${MINIMUM_PAYOUT_AMOUNT} KRW)`);
        belowMin.forEach(g => {
          console.log(`  - Host ${g.hostId}: ${g.totalAmount} KRW`);
        });
      }

      for (const group of eligible) {
        console.log(`[Settlement] Processing host ${group.hostId}: ${group.totalAmount} KRW (${group.transactionCount} transactions)`);

        const payout = await this.createPayout(group, periodStart, periodEnd);
        if (!payout) {
          summary.errors.push(`Failed to create payout for host ${group.hostId}`);
          summary.failedCount++;
          continue;
        }

        const attached = await this.attachTransactionsToPayout(group.transactionIds, payout.id);
        if (!attached) {
          await this.cancelPayout(payout.id, 'Failed to attach transactions');
          summary.errors.push(`Failed to attach transactions for payout ${payout.id}`);
          summary.failedCount++;
          continue;
        }

        const processResult = await this.processPayout(payout.id);
        
        if (processResult.success) {
          await this.deductPendingBalance(group.hostId, group.totalAmount);
          summary.processedCount++;
          summary.totalAmount += group.totalAmount;
          summary.payoutIds.push(payout.id);
        } else {
          await this.detachTransactionsFromPayout(group.transactionIds);
          summary.failedCount++;
          summary.errors.push(`Payout ${payout.id} failed: ${processResult.error}`);
        }
      }

      console.log(`[Settlement] Daily settlement completed:`);
      console.log(`  - Processed: ${summary.processedCount} hosts, ${summary.totalAmount} KRW`);
      console.log(`  - Skipped (KYC): ${summary.skippedKycCount}`);
      console.log(`  - Skipped (min amount): ${summary.belowMinCount}`);
      console.log(`  - Failed: ${summary.failedCount}`);

      return summary;
    } catch (error) {
      console.error('[Settlement] runDailySettlement error:', error);
      summary.success = false;
      summary.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return summary;
    }
  }

  /**
   * 특정 호스트의 정산 내역 조회
   */
  async getHostPayouts(hostId: string): Promise<Payout[]> {
    try {
      const hostPayouts = await db
        .select()
        .from(payouts)
        .where(eq(payouts.hostId, hostId))
        .orderBy(sql`${payouts.createdAt} DESC`);

      return hostPayouts;
    } catch (error) {
      console.error('[Settlement] getHostPayouts error:', error);
      return [];
    }
  }

  /**
   * 정산 상태별 통계 조회
   */
  async getSettlementStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    onHold: number;
    totalPaidAmount: number;
  }> {
    try {
      const stats = await db
        .select({
          status: payouts.status,
          count: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(${payouts.netAmount}::numeric), 0)`,
        })
        .from(payouts)
        .groupBy(payouts.status);

      const result = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        onHold: 0,
        totalPaidAmount: 0,
      };

      for (const row of stats) {
        switch (row.status) {
          case 'pending':
            result.pending = Number(row.count);
            break;
          case 'processing':
            result.processing = Number(row.count);
            break;
          case 'completed':
            result.completed = Number(row.count);
            result.totalPaidAmount = Number(row.total);
            break;
          case 'failed':
            result.failed = Number(row.count);
            break;
          case 'on_hold':
            result.onHold = Number(row.count);
            break;
        }
      }

      return result;
    } catch (error) {
      console.error('[Settlement] getSettlementStats error:', error);
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        onHold: 0,
        totalPaidAmount: 0,
      };
    }
  }

  /**
   * 실패한 정산 재시도
   */
  async retryFailedPayout(payoutId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const [payout] = await db
        .select()
        .from(payouts)
        .where(eq(payouts.id, payoutId));

      if (!payout) {
        return { success: false, error: 'Payout not found' };
      }

      if (payout.status !== 'failed') {
        return { success: false, error: `Cannot retry payout with status: ${payout.status}` };
      }

      await db.update(payouts).set({
        status: 'pending',
        failedAt: null,
        failureReason: null,
        updatedAt: new Date(),
      }).where(eq(payouts.id, payoutId));

      return await this.processPayout(payoutId);
    } catch (error) {
      console.error('[Settlement] retryFailedPayout error:', error);
      return { success: false, error: 'Retry failed' };
    }
  }

  /**
   * 관리자: 최근 정산 목록 조회
   */
  async getRecentPayouts(limit: number = 50): Promise<Payout[]> {
    try {
      const recentPayouts = await db
        .select()
        .from(payouts)
        .orderBy(sql`${payouts.createdAt} DESC`)
        .limit(limit);

      return recentPayouts;
    } catch (error) {
      console.error('[Settlement] getRecentPayouts error:', error);
      return [];
    }
  }

  /**
   * 이체 완료 후 pending 잔액에서 직접 차감
   * (withdrawable을 거치지 않고 바로 출금 처리)
   */
  async deductPendingBalance(hostId: string, amount: number): Promise<boolean> {
    try {
      const [account] = await db
        .select()
        .from(escrowAccounts)
        .where(and(
          eq(escrowAccounts.userId, hostId),
          eq(escrowAccounts.accountType, 'host')
        ));

      if (!account) {
        console.warn(`[Settlement] No escrow account for host ${hostId}`);
        return false;
      }

      const currentPending = parseFloat(account.pendingBalance || '0');

      await db
        .update(escrowAccounts)
        .set({
          pendingBalance: Math.max(0, currentPending - amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(escrowAccounts.id, account.id));

      console.log(`[Settlement] Deducted ${amount} KRW from pending balance for host ${hostId}`);
      return true;
    } catch (error) {
      console.error('[Settlement] deductPendingBalance error:', error);
      return false;
    }
  }

  /**
   * 정산 취소 (attach 실패 시 롤백)
   */
  async cancelPayout(payoutId: number, reason: string): Promise<boolean> {
    try {
      await db.update(payouts).set({
        status: 'cancelled',
        failureReason: reason,
        failedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(payouts.id, payoutId));

      console.log(`[Settlement] Payout ${payoutId} cancelled: ${reason}`);
      return true;
    } catch (error) {
      console.error('[Settlement] cancelPayout error:', error);
      return false;
    }
  }

  /**
   * 트랜잭션에서 payoutId 제거 (이체 실패 시 롤백)
   */
  async detachTransactionsFromPayout(transactionIds: number[]): Promise<boolean> {
    try {
      await db
        .update(escrowTransactions)
        .set({
          payoutId: null,
          updatedAt: new Date(),
        })
        .where(inArray(escrowTransactions.id, transactionIds));

      console.log(`[Settlement] Detached ${transactionIds.length} transactions from payout`);
      return true;
    } catch (error) {
      console.error('[Settlement] detachTransactionsFromPayout error:', error);
      return false;
    }
  }
}

export const settlementService = new SettlementService();
