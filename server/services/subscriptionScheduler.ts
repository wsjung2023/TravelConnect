/**
 * 구독 스케줄러 서비스
 * 
 * 정기 결제 자동화:
 * - 만료 예정 구독 조회 및 자동 갱신
 * - 결제 실패 시 재시도 로직 (최대 3회)
 * - 알림 발송 (만료 예정, 결제 실패, 구독 정지)
 * 
 * 참고: IntegrationTest.md Phase 10
 */

import { db } from '../db';
import { userSubscriptions, billingKeys, billingPlans, notifications, paymentLogs, users } from '@shared/schema';
import { eq, and, lte, gte, isNull, not, sql } from 'drizzle-orm';
import { portoneClient } from './portoneClient';
import { storage } from '../storage';

const MAX_RETRY_COUNT = 3;
const RETRY_INTERVALS_DAYS = [1, 2, 3]; // 1일, 2일, 3일 후 재시도

interface RenewalResult {
  subscriptionId: number;
  userId: string;
  success: boolean;
  paymentId?: string;
  error?: string;
  retryScheduled?: boolean;
}

interface SchedulerStats {
  processed: number;
  renewed: number;
  failed: number;
  suspended: number;
  skipped: number;
}

class SubscriptionScheduler {
  /**
   * 오늘 갱신 예정인 구독 조회
   * (재시도 예정이 아닌 구독만 - 중복 방지)
   */
  async getSubscriptionsDueForRenewal(): Promise<typeof userSubscriptions.$inferSelect[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const now = new Date();

    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.status, 'active'),
          lte(userSubscriptions.renewsAt, today),
          isNull(userSubscriptions.canceledAt),
          // 재시도 예정이 없거나, 재시도 예정 시간이 지난 경우만
          sql`(${userSubscriptions.nextRetryAt} IS NULL OR ${userSubscriptions.nextRetryAt} <= ${now})`,
          // 재시도 횟수가 최대에 도달하지 않은 경우만
          sql`COALESCE(${userSubscriptions.retryCount}, 0) < ${MAX_RETRY_COUNT}`
        )
      );

    return subscriptions;
  }

  /**
   * 재시도 예정인 구독 조회
   */
  async getSubscriptionsDueForRetry(): Promise<typeof userSubscriptions.$inferSelect[]> {
    const now = new Date();

    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.status, 'active'),
          not(isNull(userSubscriptions.nextRetryAt)),
          lte(userSubscriptions.nextRetryAt, now),
          sql`${userSubscriptions.retryCount} < ${MAX_RETRY_COUNT}`
        )
      );

    return subscriptions;
  }

  /**
   * 사용자의 기본 빌링키 조회
   */
  async getDefaultBillingKey(userId: string): Promise<typeof billingKeys.$inferSelect | null> {
    const keys = await db
      .select()
      .from(billingKeys)
      .where(
        and(
          eq(billingKeys.userId, userId),
          eq(billingKeys.isDefault, true)
        )
      )
      .limit(1);

    return keys[0] || null;
  }

  /**
   * 플랜 정보 조회
   */
  async getPlan(planId: string): Promise<typeof billingPlans.$inferSelect | null> {
    const plans = await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.id, planId))
      .limit(1);

    return plans[0] || null;
  }

  /**
   * 사용자 정보 조회
   */
  async getUser(userId: string): Promise<typeof users.$inferSelect | null> {
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userList[0] || null;
  }

  /**
   * 단일 구독 갱신 시도
   */
  async renewSubscription(subscription: typeof userSubscriptions.$inferSelect): Promise<RenewalResult> {
    const { id, userId, planId, billingKeyId } = subscription;

    // 빌링키 확인 (billingKeyId는 실제 PortOne 빌링키 값을 저장)
    let billingKey: typeof billingKeys.$inferSelect | null = null;
    
    if (billingKeyId) {
      // 구독에 지정된 빌링키로 조회 (billingKey 컬럼 값으로 조회)
      const result = await db
        .select()
        .from(billingKeys)
        .where(
          and(
            eq(billingKeys.userId, userId),
            eq(billingKeys.billingKey, billingKeyId)
          )
        )
        .limit(1);
      billingKey = result[0] || null;
    }
    
    // 지정된 빌링키가 없으면 기본 결제수단 사용
    if (!billingKey) {
      billingKey = await this.getDefaultBillingKey(userId);
    }

    if (!billingKey) {
      console.log(`[Scheduler] 구독 ${id}: 빌링키 없음 - 건너뜀`);
      return { subscriptionId: id, userId, success: false, error: '등록된 결제수단이 없습니다' };
    }

    // 플랜 정보 조회
    const plan = await this.getPlan(planId);
    if (!plan || !plan.priceMonthlyKrw) {
      console.log(`[Scheduler] 구독 ${id}: 플랜 정보 없음`);
      return { subscriptionId: id, userId, success: false, error: '구독 플랜 정보를 찾을 수 없습니다' };
    }

    // 사용자 정보 조회
    const user = await this.getUser(userId);
    if (!user) {
      console.log(`[Scheduler] 구독 ${id}: 사용자 정보 없음`);
      return { subscriptionId: id, userId, success: false, error: '사용자 정보를 찾을 수 없습니다' };
    }

    // 고유 결제 ID 생성
    const paymentId = `sub_${id}_${Date.now()}`;

    console.log(`[Scheduler] 구독 ${id} 갱신 시도: ${plan.priceMonthlyKrw}원`);

    // PortOne 빌링키 결제 실행
    const customerName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const result = await portoneClient.createPaymentWithBillingKey({
      paymentId,
      orderName: `${plan.nameKo || plan.name} 구독 갱신`,
      amount: plan.priceMonthlyKrw,
      currency: 'KRW',
      billingKey: billingKey.billingKey,
      customer: {
        id: userId,
        email: user.email,
        name: customerName,
      },
    });

    if (result.success) {
      // 결제 성공: 구독 기간 연장
      await this.extendSubscription(subscription);
      
      // 결제 로그 기록
      await storage.createPaymentLog({
        paymentId,
        userId,
        eventType: 'SUBSCRIPTION_RENEWED',
        eventData: JSON.stringify({
          subscriptionId: id,
          planId,
          amount: plan.priceMonthlyKrw,
        }),
        amount: plan.priceMonthlyKrw,
        status: 'success',
      });

      // 갱신 완료 알림
      await this.sendNotification(userId, 'subscription_renewed', {
        planName: plan.nameKo || plan.name,
        amount: plan.priceMonthlyKrw,
      });

      console.log(`[Scheduler] 구독 ${id} 갱신 성공`);
      return { subscriptionId: id, userId, success: true, paymentId };
    } else {
      // 결제 실패: 재시도 스케줄링
      const retryScheduled = await this.handlePaymentFailure(subscription, result.error || '결제 실패');
      
      // 결제 로그 기록
      await storage.createPaymentLog({
        paymentId,
        userId,
        eventType: 'SUBSCRIPTION_RENEWAL_FAILED',
        eventData: JSON.stringify({
          subscriptionId: id,
          planId,
          error: result.error,
          errorCode: result.errorCode,
        }),
        amount: plan.priceMonthlyKrw,
        status: 'failed',
        errorMessage: result.error,
      });

      console.log(`[Scheduler] 구독 ${id} 갱신 실패: ${result.error}`);
      return { subscriptionId: id, userId, success: false, error: result.error || '알 수 없는 오류', retryScheduled };
    }
  }

  /**
   * 구독 기간 연장 (30일)
   */
  async extendSubscription(subscription: typeof userSubscriptions.$inferSelect): Promise<void> {
    const currentEnd = subscription.currentPeriodEnd || new Date();
    const newStart = new Date(currentEnd);
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + 30);

    const renewsAt = new Date(newEnd);
    renewsAt.setDate(renewsAt.getDate() - 1); // 종료 1일 전에 다음 갱신

    await db
      .update(userSubscriptions)
      .set({
        currentPeriodStart: newStart,
        currentPeriodEnd: newEnd,
        renewsAt,
        retryCount: 0,
        lastRetryAt: null,
        nextRetryAt: null,
        lastPaymentError: null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscription.id));
  }

  /**
   * 결제 실패 처리 및 재시도 스케줄링
   */
  async handlePaymentFailure(subscription: typeof userSubscriptions.$inferSelect, error: string): Promise<boolean> {
    const currentRetryCount = subscription.retryCount || 0;
    const newRetryCount = currentRetryCount + 1;

    if (newRetryCount >= MAX_RETRY_COUNT) {
      // 3회 실패: 구독 일시 정지
      await this.suspendSubscription(subscription.id, error);
      
      // 구독 정지 알림
      await this.sendNotification(subscription.userId, 'subscription_suspended', {
        reason: error,
      });

      return false;
    }

    // 다음 재시도 시간 계산
    const nextRetryAt = new Date();
    const intervalDays = RETRY_INTERVALS_DAYS[currentRetryCount] ?? 1;
    nextRetryAt.setDate(nextRetryAt.getDate() + intervalDays);

    await db
      .update(userSubscriptions)
      .set({
        retryCount: newRetryCount,
        lastRetryAt: new Date(),
        nextRetryAt,
        lastPaymentError: error,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscription.id));

    // 결제 실패 알림
    await this.sendNotification(subscription.userId, 'payment_failed', {
      retryCount: newRetryCount,
      maxRetries: MAX_RETRY_COUNT,
      nextRetryAt: nextRetryAt.toISOString(),
      error,
    });

    console.log(`[Scheduler] 구독 ${subscription.id}: ${newRetryCount}/${MAX_RETRY_COUNT}회 실패, 다음 재시도: ${nextRetryAt.toISOString()}`);
    return true;
  }

  /**
   * 구독 일시 정지
   */
  async suspendSubscription(subscriptionId: number, reason: string): Promise<void> {
    await db
      .update(userSubscriptions)
      .set({
        status: 'suspended',
        lastPaymentError: reason,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscriptionId));

    console.log(`[Scheduler] 구독 ${subscriptionId} 일시 정지: ${reason}`);
  }

  /**
   * 만료 예정 알림 발송 (D-7, D-3, D-1)
   */
  async sendExpirationReminders(): Promise<number> {
    const reminderDays = [7, 3, 1];
    let sentCount = 0;

    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const subscriptions = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.status, 'active'),
            gte(userSubscriptions.renewsAt, targetDate),
            lte(userSubscriptions.renewsAt, endOfDay),
            isNull(userSubscriptions.canceledAt)
          )
        );

      for (const subscription of subscriptions) {
        const plan = await this.getPlan(subscription.planId);
        await this.sendNotification(subscription.userId, 'subscription_expiring', {
          daysUntilRenewal: days,
          planName: plan?.nameKo || plan?.name || '구독',
          amount: plan?.priceMonthlyKrw || 0,
        });
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * 알림 발송
   */
  async sendNotification(
    userId: string,
    notificationType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      let title = '';
      let message = '';
      
      switch (notificationType) {
        case 'subscription_renewed':
          title = '구독 갱신 완료';
          message = `구독이 갱신되었습니다. (${data.planName}, ${(data.amount as number).toLocaleString()}원)`;
          break;
        case 'subscription_expiring':
          title = '구독 갱신 예정';
          message = `구독이 ${data.daysUntilRenewal}일 후 갱신됩니다. (${data.planName})`;
          break;
        case 'payment_failed':
          title = '결제 실패';
          message = `결제에 실패했습니다. (${data.retryCount}/${data.maxRetries}회 시도) 결제수단을 확인해주세요.`;
          break;
        case 'subscription_suspended':
          title = '구독 일시 정지';
          message = `구독이 일시 정지되었습니다. 결제수단을 변경해주세요.`;
          break;
        default:
          title = '구독 알림';
          message = '구독 관련 알림이 있습니다.';
      }

      await db.insert(notifications).values({
        userId,
        type: 'promotion', // billing 타입 대신 promotion 사용 (기존 enum 호환)
        title,
        message,
        isRead: false,
      });

      console.log(`[Scheduler] 알림 발송: ${userId} - ${notificationType}`);
    } catch (error) {
      console.error(`[Scheduler] 알림 발송 실패:`, error);
    }
  }

  /**
   * 스케줄러 메인 실행 (매일 실행)
   */
  async runDailyScheduler(): Promise<SchedulerStats> {
    console.log('[Scheduler] 일일 스케줄러 시작:', new Date().toISOString());

    const stats: SchedulerStats = {
      processed: 0,
      renewed: 0,
      failed: 0,
      suspended: 0,
      skipped: 0,
    };

    try {
      // 1. 갱신 예정 구독 처리
      const dueSubscriptions = await this.getSubscriptionsDueForRenewal();
      console.log(`[Scheduler] 갱신 예정 구독: ${dueSubscriptions.length}개`);

      for (const subscription of dueSubscriptions) {
        stats.processed++;
        const result = await this.renewSubscription(subscription);
        
        if (result.success) {
          stats.renewed++;
        } else if (result.retryScheduled) {
          stats.failed++;
        } else if (result.error?.includes('빌링키') || result.error?.includes('결제수단')) {
          stats.skipped++;
        } else {
          stats.suspended++;
        }
      }

      // 2. 재시도 예정 구독 처리
      const retrySubscriptions = await this.getSubscriptionsDueForRetry();
      console.log(`[Scheduler] 재시도 예정 구독: ${retrySubscriptions.length}개`);

      for (const subscription of retrySubscriptions) {
        stats.processed++;
        const result = await this.renewSubscription(subscription);
        
        if (result.success) {
          stats.renewed++;
        } else if (result.retryScheduled) {
          stats.failed++;
        } else {
          stats.suspended++;
        }
      }

      // 3. 만료 예정 알림 발송
      const remindersSent = await this.sendExpirationReminders();
      console.log(`[Scheduler] 만료 예정 알림: ${remindersSent}개 발송`);

    } catch (error) {
      console.error('[Scheduler] 스케줄러 오류:', error);
    }

    console.log('[Scheduler] 일일 스케줄러 완료:', stats);
    return stats;
  }

  /**
   * 단일 구독 수동 갱신 (테스트/관리자용)
   */
  async manualRenew(subscriptionId: number): Promise<RenewalResult> {
    const subscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.id, subscriptionId))
      .limit(1);

    if (!subscriptions[0]) {
      return { subscriptionId, userId: '', success: false, error: '구독을 찾을 수 없습니다' };
    }

    return this.renewSubscription(subscriptions[0]);
  }
}

export const subscriptionScheduler = new SubscriptionScheduler();
