// @ts-nocheck
// 빌링 및 결제 관련 데이터 처리를 담당하는 레포지토리
import { db } from '../db';
import {
  billingPlans,
  userSubscriptions,
  userUsage,
  userTripPasses,
  contractStages,
  escrowAccounts,
  payouts,
  paymentTransactions,
  billingKeys,
  paymentLogs,
  type BillingPlan,
  type InsertBillingPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type UserUsage,
  type InsertUserUsage,
  type UserTripPass,
  type InsertUserTripPass,
  type ContractStage,
  type InsertContractStage,
  type EscrowAccount,
  type InsertEscrowAccount,
  type Payout,
  type InsertPayout,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type BillingKey,
  type InsertBillingKey,
  type PaymentLog,
  type InsertPaymentLog,
} from '@shared/schema';
import { eq, and, lte, gte, desc, asc } from 'drizzle-orm';
import { cacheService } from '../services/cache';

// ============================================
// Billing Plans (요금제) - 캐싱 적용
// ============================================
export async function getBillingPlans(target?: 'traveler' | 'host', type?: 'subscription' | 'one_time'): Promise<BillingPlan[]> {
  const cached = cacheService.billingPlan.get(target, type);
  if (cached) {
    console.log('[Cache] 빌링 플랜 캐시 히트:', target || 'all', type || 'all');
    return cached;
  }

  let query = db.select().from(billingPlans).where(eq(billingPlans.isActive, true));
  
  if (target) {
    query = query.where(eq(billingPlans.target, target)) as typeof query;
  }
  if (type) {
    query = query.where(eq(billingPlans.type, type)) as typeof query;
  }
  
  const plans = await query.orderBy(asc(billingPlans.sortOrder));
  
  cacheService.billingPlan.set(target, type, plans);
  console.log('[Cache] 빌링 플랜 캐시 저장:', target || 'all', type || 'all', plans.length, '개');
  
  return plans;
}

export async function getBillingPlanById(id: string): Promise<BillingPlan | undefined> {
  const [plan] = await db.select().from(billingPlans).where(eq(billingPlans.id, id));
  return plan;
}

export async function createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan> {
  const [created] = await db.insert(billingPlans).values(plan).returning();
  return created;
}

export async function updateBillingPlan(id: string, updates: Partial<InsertBillingPlan>): Promise<BillingPlan | undefined> {
  const [updated] = await db
    .update(billingPlans)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(billingPlans.id, id))
    .returning();
  
  if (updated) {
    cacheService.billingPlan.invalidate();
  }
  
  return updated;
}

// User Subscriptions (사용자 구독)
export async function getUserSubscription(userId: string, target?: 'traveler' | 'host'): Promise<UserSubscription | undefined> {
  let conditions = [eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, 'active')];
  if (target) {
    conditions.push(eq(userSubscriptions.target, target));
  }
  const [sub] = await db.select().from(userSubscriptions).where(and(...conditions));
  return sub;
}

export async function createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
  const [created] = await db.insert(userSubscriptions).values(subscription).returning();
  return created;
}

export async function updateUserSubscription(id: number, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined> {
  const [updated] = await db
    .update(userSubscriptions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(userSubscriptions.id, id))
    .returning();
  return updated;
}

export async function cancelUserSubscription(id: number): Promise<UserSubscription | undefined> {
  const [updated] = await db
    .update(userSubscriptions)
    .set({ canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(userSubscriptions.id, id))
    .returning();
  return updated;
}

// User Usage (사용량 추적)
export async function getUserUsage(userId: string, usageKey: string): Promise<UserUsage | undefined> {
  const now = new Date();
  const [usage] = await db
    .select()
    .from(userUsage)
    .where(
      and(
        eq(userUsage.userId, userId),
        eq(userUsage.usageKey, usageKey),
        lte(userUsage.periodStart, now),
        gte(userUsage.periodEnd, now)
      )
    );
  return usage;
}

export async function createUserUsage(usage: InsertUserUsage): Promise<UserUsage> {
  const [created] = await db.insert(userUsage).values(usage).returning();
  return created;
}

export async function incrementUserUsage(userId: string, usageKey: string): Promise<UserUsage | undefined> {
  const current = await getUserUsage(userId, usageKey);
  if (!current) return undefined;
  
  const [updated] = await db
    .update(userUsage)
    .set({ 
      usedInPeriod: (current.usedInPeriod || 0) + 1,
      updatedAt: new Date() 
    })
    .where(eq(userUsage.id, current.id))
    .returning();
  return updated;
}

export async function resetUserUsagePeriod(userId: string, usageKey: string, newPeriodEnd: Date): Promise<UserUsage | undefined> {
  const current = await getUserUsage(userId, usageKey);
  if (!current) return undefined;
  
  const [updated] = await db
    .update(userUsage)
    .set({ 
      usedInPeriod: 0,
      periodStart: new Date(),
      periodEnd: newPeriodEnd,
      updatedAt: new Date() 
    })
    .where(eq(userUsage.id, current.id))
    .returning();
  return updated;
}

// User Trip Passes (Trip Pass)
export async function getActiveTripPass(userId: string): Promise<UserTripPass | undefined> {
  const now = new Date();
  const [pass] = await db
    .select()
    .from(userTripPasses)
    .where(
      and(
        eq(userTripPasses.userId, userId),
        lte(userTripPasses.validFrom, now),
        gte(userTripPasses.validUntil, now)
      )
    )
    .orderBy(desc(userTripPasses.validUntil))
    .limit(1);
  return pass;
}

export async function getUserTripPasses(userId: string): Promise<UserTripPass[]> {
  return db
    .select()
    .from(userTripPasses)
    .where(eq(userTripPasses.userId, userId))
    .orderBy(desc(userTripPasses.createdAt));
}

export async function createUserTripPass(tripPass: InsertUserTripPass): Promise<UserTripPass> {
  const [created] = await db.insert(userTripPasses).values(tripPass).returning();
  
  cacheService.tripPass.invalidate(tripPass.userId);
  cacheService.aiUsage.invalidate(tripPass.userId);
  console.log('[Cache] Trip Pass 생성으로 캐시 무효화:', tripPass.userId);
  
  return created;
}

export async function incrementTripPassUsage(id: number, usageKey: 'ai_message' | 'translation' | 'concierge'): Promise<UserTripPass | undefined> {
  const [pass] = await db.select().from(userTripPasses).where(eq(userTripPasses.id, id));
  if (!pass) return undefined;

  const fieldMap = {
    'ai_message': 'aiMessageUsed',
    'translation': 'translationUsed',
    'concierge': 'conciergeCallsUsed'
  } as const;

  const field = fieldMap[usageKey];
  const currentValue = pass[field] || 0;

  const [updated] = await db
    .update(userTripPasses)
    .set({ 
      [field]: currentValue + 1,
      updatedAt: new Date() 
    })
    .where(eq(userTripPasses.id, id))
    .returning();
  return updated;
}

// Contract Stages (계약 단계)
export async function getContractStages(contractId: number): Promise<ContractStage[]> {
  return db
    .select()
    .from(contractStages)
    .where(eq(contractStages.contractId, contractId))
    .orderBy(asc(contractStages.stageOrder));
}

export async function createContractStage(stage: InsertContractStage): Promise<ContractStage> {
  const [created] = await db.insert(contractStages).values(stage).returning();
  return created;
}

export async function updateContractStageStatus(id: number, status: string, paymentId?: number): Promise<ContractStage | undefined> {
  const updates: Partial<ContractStage> = { 
    status, 
    updatedAt: new Date() 
  };
  if (paymentId) {
    updates.paymentId = paymentId;
    updates.paidAt = new Date();
  }
  
  const [updated] = await db
    .update(contractStages)
    .set(updates)
    .where(eq(contractStages.id, id))
    .returning();
  return updated;
}

// Escrow Accounts (에스크로 계좌)
export async function getEscrowAccount(userId: string): Promise<EscrowAccount | undefined> {
  const [account] = await db.select().from(escrowAccounts).where(eq(escrowAccounts.userId, userId));
  return account;
}

export async function createEscrowAccount(account: InsertEscrowAccount): Promise<EscrowAccount> {
  const [created] = await db.insert(escrowAccounts).values(account).returning();
  return created;
}

export async function updateEscrowBalance(userId: string, balanceUpdates: { pending?: string; available?: string; withdrawable?: string }): Promise<EscrowAccount | undefined> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (balanceUpdates.pending !== undefined) updates.pendingBalance = balanceUpdates.pending;
  if (balanceUpdates.available !== undefined) updates.availableBalance = balanceUpdates.available;
  if (balanceUpdates.withdrawable !== undefined) updates.withdrawableBalance = balanceUpdates.withdrawable;
  
  const [updated] = await db
    .update(escrowAccounts)
    .set(updates)
    .where(eq(escrowAccounts.userId, userId))
    .returning();
  return updated;
}

// Payouts (호스트 정산)
export async function getPayouts(hostId: string, limit: number = 50): Promise<Payout[]> {
  return db
    .select()
    .from(payouts)
    .where(eq(payouts.hostId, hostId))
    .orderBy(desc(payouts.createdAt))
    .limit(limit);
}

export async function createPayout(payout: InsertPayout): Promise<Payout> {
  const [created] = await db.insert(payouts).values(payout).returning();
  return created;
}

export async function updatePayoutStatus(id: number, status: string, transferId?: string): Promise<Payout | undefined> {
  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (transferId) updates.portoneTransferId = transferId;
  if (status === 'completed') updates.completedAt = new Date();
  if (status === 'failed') updates.failedAt = new Date();
  
  const [updated] = await db
    .update(payouts)
    .set(updates)
    .where(eq(payouts.id, id))
    .returning();
  return updated;
}

// Payment Transactions (결제 거래)
export async function getPaymentTransactions(userId: string, limit: number = 50): Promise<PaymentTransaction[]> {
  return db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.userId, userId))
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(limit);
}

export async function getPaymentTransactionByPortoneId(portonePaymentId: string): Promise<PaymentTransaction | undefined> {
  const [tx] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.portonePaymentId, portonePaymentId));
  return tx;
}

export async function createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
  const [created] = await db.insert(paymentTransactions).values(transaction).returning();
  return created;
}

export async function updatePaymentTransactionStatus(id: number, status: string, portonePaymentId?: string): Promise<PaymentTransaction | undefined> {
  const updates: Record<string, unknown> = { status, updatedAt: new Date() };
  if (portonePaymentId) updates.portonePaymentId = portonePaymentId;
  
  const [updated] = await db
    .update(paymentTransactions)
    .set(updates)
    .where(eq(paymentTransactions.id, id))
    .returning();
  return updated;
}

// Billing Keys (빌링키 - 정기결제용)
export async function getBillingKeysByUserId(userId: string): Promise<BillingKey[]> {
  return db
    .select()
    .from(billingKeys)
    .where(eq(billingKeys.userId, userId))
    .orderBy(desc(billingKeys.createdAt));
}

export async function getBillingKeyById(id: number): Promise<BillingKey | undefined> {
  const [billingKey] = await db
    .select()
    .from(billingKeys)
    .where(eq(billingKeys.id, id));
  return billingKey;
}

export async function createBillingKey(data: InsertBillingKey): Promise<BillingKey> {
  const existingKeys = await getBillingKeysByUserId(data.userId);
  const isFirstKey = existingKeys.length === 0;
  
  const [created] = await db
    .insert(billingKeys)
    .values({ ...data, isDefault: isFirstKey })
    .returning();
  return created;
}

export async function deleteBillingKey(id: number, userId: string): Promise<boolean> {
  const billingKey = await getBillingKeyById(id);
  if (!billingKey || billingKey.userId !== userId) {
    return false;
  }
  
  await db.delete(billingKeys).where(eq(billingKeys.id, id));
  
  if (billingKey.isDefault) {
    const remainingKeys = await getBillingKeysByUserId(userId);
    if (remainingKeys.length > 0) {
      await setDefaultBillingKey(remainingKeys[0].id, userId);
    }
  }
  
  return true;
}

export async function setDefaultBillingKey(id: number, userId: string): Promise<boolean> {
  const billingKey = await getBillingKeyById(id);
  if (!billingKey || billingKey.userId !== userId) {
    return false;
  }
  
  await db
    .update(billingKeys)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(billingKeys.userId, userId));
  
  await db
    .update(billingKeys)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(billingKeys.id, id));
  
  return true;
}

// Payment Logs (결제 로그)
export async function createPaymentLog(data: InsertPaymentLog): Promise<PaymentLog> {
  const [log] = await db.insert(paymentLogs).values(data).returning();
  return log;
}

export async function getPaymentLogsByPaymentId(paymentId: string): Promise<PaymentLog[]> {
  return await db
    .select()
    .from(paymentLogs)
    .where(eq(paymentLogs.paymentId, paymentId))
    .orderBy(desc(paymentLogs.createdAt));
}

export async function getPaymentLogsByUserId(userId: string, limit: number = 50): Promise<PaymentLog[]> {
  return await db
    .select()
    .from(paymentLogs)
    .where(eq(paymentLogs.userId, userId))
    .orderBy(desc(paymentLogs.createdAt))
    .limit(limit);
}
