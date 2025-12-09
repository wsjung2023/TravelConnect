import { Response, NextFunction } from 'express';
import { db } from '../db';
import { userTripPasses, userUsage, userSubscriptions, billingPlans } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { cacheService } from '../services/cache';
import { AuthRequest } from '../auth';

// ============================================
// 사용량 타입 정의
// ============================================
type UsageType = 'ai_message' | 'translation' | 'concierge';

// DB 기반 기본값 (traveler_free 플랜에서 가져옴)
// 실제로는 DB에서 조회하지만, DB 연결 실패 시 폴백용
const FALLBACK_FREE_LIMITS: Record<UsageType, number> = {
  ai_message: 30,
  translation: 50,
  concierge: 5,
};

// 사용량 키와 billing_plans.features 키 매핑
const USAGE_TO_FEATURE_KEY: Record<UsageType, string> = {
  ai_message: 'ai_messages',
  translation: 'dm_translations',
  concierge: 'mini_concierge',
};

// ============================================
// 빌링 플랜에서 limit 조회 (캐싱 적용)
// ============================================
async function getPlanLimits(planId: string): Promise<Record<UsageType, number>> {
  // 캐시 키: plan_limits_<planId>
  const cacheKey = `plan_limits_${planId}`;
  const cached = cacheService.billing.get(cacheKey);
  if (cached) {
    console.log('[Cache] 플랜 limit 캐시 히트:', planId);
    return cached as Record<UsageType, number>;
  }

  // DB에서 플랜 조회
  const [plan] = await db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.id, planId))
    .limit(1);

  if (!plan || !plan.features) {
    console.log('[AI Usage] 플랜을 찾을 수 없음, 폴백 사용:', planId);
    return FALLBACK_FREE_LIMITS;
  }

  const features = plan.features as Record<string, any>;
  const limits: Record<UsageType, number> = {
    ai_message: features.ai_messages ?? FALLBACK_FREE_LIMITS.ai_message,
    translation: features.dm_translations ?? FALLBACK_FREE_LIMITS.translation,
    concierge: features.mini_concierge ?? FALLBACK_FREE_LIMITS.concierge,
  };

  // -1은 무제한
  cacheService.billing.set(cacheKey, limits);
  console.log('[Cache] 플랜 limit 캐시 저장:', planId, limits);
  
  return limits;
}

// ============================================
// 무료 플랜 limit 조회 (DB 기반)
// ============================================
async function getFreePlanLimits(): Promise<Record<UsageType, number>> {
  return await getPlanLimits('traveler_free');
}

// ============================================
// 활성 구독 조회
// ============================================
async function getActiveSubscription(userId: string) {
  const now = new Date();
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.status, 'active'),
      lte(userSubscriptions.currentPeriodStart, now),
      gte(userSubscriptions.currentPeriodEnd, now)
    ))
    .limit(1);
  
  return subscription;
}

// ============================================
// 활성 Trip Pass 조회 (캐싱 적용)
// ============================================
async function getActiveTripPass(userId: string) {
  const cached = cacheService.tripPass.get(userId);
  if (cached !== undefined) {
    if (cached === null) {
      console.log('[Cache] Trip Pass 캐시 히트 (없음):', userId);
      return null;
    }
    console.log('[Cache] Trip Pass 캐시 히트:', userId);
    return cached;
  }

  const now = new Date();
  const [tripPass] = await db
    .select()
    .from(userTripPasses)
    .where(and(
      eq(userTripPasses.userId, userId),
      lte(userTripPasses.validFrom, now),
      gte(userTripPasses.validUntil, now)
    ))
    .orderBy(sql`${userTripPasses.validUntil} DESC`)
    .limit(1);
  
  cacheService.tripPass.set(userId, tripPass || null);
  console.log('[Cache] Trip Pass 캐시 저장:', userId, tripPass ? '있음' : '없음');
  
  return tripPass;
}

// ============================================
// 사용량 레코드 조회/생성
// ============================================
async function getOrCreateUserUsage(userId: string, usageKey: UsageType, limit: number) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const [existing] = await db
    .select()
    .from(userUsage)
    .where(and(
      eq(userUsage.userId, userId),
      eq(userUsage.usageKey, usageKey),
      lte(userUsage.periodStart, now),
      gte(userUsage.periodEnd, now)
    ))
    .limit(1);
  
  if (existing) {
    // limit이 변경되었으면 업데이트
    if (existing.limitInPeriod !== limit) {
      const [updated] = await db
        .update(userUsage)
        .set({ limitInPeriod: limit, updatedAt: new Date() })
        .where(eq(userUsage.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }
  
  const [created] = await db.insert(userUsage).values({
    userId,
    usageKey,
    usedInPeriod: 0,
    limitInPeriod: limit,
    periodStart,
    periodEnd,
  }).returning();
  
  return created;
}

// ============================================
// Trip Pass 사용량 증가 (캐시 무효화 포함)
// ============================================
async function incrementTripPassUsage(tripPassId: number, usageType: UsageType, userId: string) {
  switch (usageType) {
    case 'ai_message':
      await db
        .update(userTripPasses)
        .set({
          aiMessageUsed: sql`${userTripPasses.aiMessageUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userTripPasses.id, tripPassId));
      break;
    case 'translation':
      await db
        .update(userTripPasses)
        .set({
          translationUsed: sql`${userTripPasses.translationUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userTripPasses.id, tripPassId));
      break;
    case 'concierge':
      await db
        .update(userTripPasses)
        .set({
          conciergeCallsUsed: sql`${userTripPasses.conciergeCallsUsed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userTripPasses.id, tripPassId));
      break;
  }
  
  cacheService.tripPass.invalidate(userId);
  cacheService.aiUsage.invalidate(userId);
}

// ============================================
// 무료/구독 사용량 증가 (캐시 무효화 포함)
// ============================================
async function incrementUserUsage(usageId: number, userId: string) {
  await db
    .update(userUsage)
    .set({
      usedInPeriod: sql`${userUsage.usedInPeriod} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userUsage.id, usageId));
  
  cacheService.aiUsage.invalidate(userId);
}

// ============================================
// Trip Pass limit 조회
// ============================================
function getTripPassLimit(tripPass: typeof userTripPasses.$inferSelect, usageType: UsageType): number {
  switch (usageType) {
    case 'ai_message':
      return tripPass.aiMessageLimit;
    case 'translation':
      return tripPass.translationLimit;
    case 'concierge':
      return tripPass.conciergeCallsLimit;
    default:
      return 0;
  }
}

function getTripPassUsed(tripPass: typeof userTripPasses.$inferSelect, usageType: UsageType): number {
  switch (usageType) {
    case 'ai_message':
      return tripPass.aiMessageUsed || 0;
    case 'translation':
      return tripPass.translationUsed || 0;
    case 'concierge':
      return tripPass.conciergeCallsUsed || 0;
    default:
      return 0;
  }
}

// ============================================
// AI 사용량 체크 미들웨어 (DB 기반 limit)
// ============================================
export function checkAiUsage(usageType: UsageType) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.id;
      
      // 관리자는 limit 체크 스킵
      if (req.user.role === 'admin') {
        console.log(`[AI Usage] Admin user ${userId} bypassing limit check for ${usageType}`);
        return next();
      }

      // 1. Trip Pass 우선 체크
      const tripPass = await getActiveTripPass(userId);
      
      if (tripPass) {
        const limit = getTripPassLimit(tripPass, usageType);
        const used = getTripPassUsed(tripPass, usageType);
        
        console.log(`[AI Usage] Trip Pass check - user: ${userId}, type: ${usageType}, used: ${used}/${limit}`);
        
        if (used >= limit) {
          return res.status(402).json({
            message: 'Trip Pass limit exceeded',
            code: 'TRIP_PASS_LIMIT_EXCEEDED',
            usageType,
            limit,
            used,
            suggestion: 'Please purchase a new Trip Pass to continue using this feature'
          });
        }
        
        await incrementTripPassUsage(tripPass.id, usageType, userId);
        
        (req as any).usageInfo = {
          source: 'trip_pass',
          tripPassId: tripPass.id,
          remaining: limit - used - 1,
        };
        
        console.log(`[AI Usage] Trip Pass usage incremented - remaining: ${limit - used - 1}`);
        return next();
      }

      // 2. 구독 체크 (구독이 있으면 해당 플랜의 limit 사용)
      const subscription = await getActiveSubscription(userId);
      let planLimits: Record<UsageType, number>;
      let planId = 'traveler_free';
      
      if (subscription) {
        planId = subscription.planId;
        planLimits = await getPlanLimits(planId);
        console.log(`[AI Usage] Subscription found - plan: ${planId}`);
      } else {
        planLimits = await getFreePlanLimits();
        console.log(`[AI Usage] No subscription - using free plan limits`);
      }
      
      const limit = planLimits[usageType];
      
      // -1은 무제한
      if (limit === -1) {
        console.log(`[AI Usage] Unlimited usage for ${usageType} on plan ${planId}`);
        // 무제한이어도 사용량 기록은 함
        const usage = await getOrCreateUserUsage(userId, usageType, limit);
        if (usage) {
          await incrementUserUsage(usage.id, userId);
        }
        (req as any).usageInfo = {
          source: 'subscription',
          planId,
          remaining: -1, // 무제한
        };
        return next();
      }
      
      const usage = await getOrCreateUserUsage(userId, usageType, limit);
      
      if (!usage) {
        console.error('[AI Usage] Failed to get or create usage record');
        return next(); // 실패 시 통과 (graceful degradation)
      }
      
      const currentUsed = usage.usedInPeriod || 0;
      
      console.log(`[AI Usage] Plan check - user: ${userId}, plan: ${planId}, type: ${usageType}, used: ${currentUsed}/${limit}`);
      
      if (currentUsed >= limit) {
        return res.status(402).json({
          message: subscription ? 'Subscription limit exceeded' : 'Free tier limit exceeded',
          code: subscription ? 'SUBSCRIPTION_LIMIT_EXCEEDED' : 'FREE_LIMIT_EXCEEDED',
          usageType,
          limit,
          used: currentUsed,
          suggestion: subscription 
            ? 'Upgrade your plan or wait until next billing cycle' 
            : 'Purchase a subscription or Trip Pass to unlock more features',
          periodEnd: usage.periodEnd,
        });
      }
      
      await incrementUserUsage(usage.id, userId);
      
      (req as any).usageInfo = {
        source: subscription ? 'subscription' : 'free_tier',
        planId,
        remaining: limit - currentUsed - 1,
      };
      
      console.log(`[AI Usage] Usage incremented - remaining: ${limit - currentUsed - 1}`);
      return next();
    } catch (error) {
      console.error('[AI Usage] Error checking usage:', error);
      return next(); // 에러 발생 시 통과 (graceful degradation)
    }
  };
}

// ============================================
// AI 사용량 통계 조회 (캐싱 적용)
// ============================================
export async function getUserAiUsageStats(userId: string, options?: { skipCache?: boolean }) {
  if (!options?.skipCache) {
    const cached = cacheService.aiUsage.get(userId);
    if (cached) {
      console.log('[Cache] AI 사용량 통계 캐시 히트:', userId);
      return cached;
    }
  }

  const now = new Date();
  
  // Trip Pass 우선 확인
  const tripPass = await getActiveTripPass(userId);
  
  if (tripPass) {
    const stats = {
      source: 'trip_pass' as const,
      tripPassId: tripPass.id,
      planId: tripPass.planId,
      validUntil: tripPass.validUntil,
      limits: {
        ai_message: {
          limit: tripPass.aiMessageLimit,
          used: tripPass.aiMessageUsed || 0,
          remaining: tripPass.aiMessageLimit - (tripPass.aiMessageUsed || 0),
        },
        translation: {
          limit: tripPass.translationLimit,
          used: tripPass.translationUsed || 0,
          remaining: tripPass.translationLimit - (tripPass.translationUsed || 0),
        },
        concierge: {
          limit: tripPass.conciergeCallsLimit,
          used: tripPass.conciergeCallsUsed || 0,
          remaining: tripPass.conciergeCallsLimit - (tripPass.conciergeCallsUsed || 0),
        },
      },
    };
    
    cacheService.aiUsage.set(userId, stats);
    console.log('[Cache] AI 사용량 통계 캐시 저장 (Trip Pass):', userId);
    
    return stats;
  }
  
  // 구독 확인
  const subscription = await getActiveSubscription(userId);
  const planId = subscription?.planId || 'traveler_free';
  const planLimits = await getPlanLimits(planId);
  
  // 사용량 레코드 조회
  const usageRecords = await db
    .select()
    .from(userUsage)
    .where(and(
      eq(userUsage.userId, userId),
      lte(userUsage.periodStart, now),
      gte(userUsage.periodEnd, now)
    ));
  
  const usageMap: Record<string, { limit: number; used: number; remaining: number; periodEnd?: Date }> = {};
  
  for (const key of ['ai_message', 'translation', 'concierge'] as UsageType[]) {
    const record = usageRecords.find(r => r.usageKey === key);
    const limit = planLimits[key];
    
    if (record) {
      usageMap[key] = {
        limit,
        used: record.usedInPeriod || 0,
        remaining: limit === -1 ? -1 : limit - (record.usedInPeriod || 0),
        periodEnd: record.periodEnd,
      };
    } else {
      usageMap[key] = {
        limit,
        used: 0,
        remaining: limit === -1 ? -1 : limit,
      };
    }
  }
  
  const stats = {
    source: subscription ? 'subscription' as const : 'free_tier' as const,
    planId,
    limits: usageMap,
  };
  
  cacheService.aiUsage.set(userId, stats);
  console.log('[Cache] AI 사용량 통계 캐시 저장:', userId, planId);
  
  return stats;
}

// ============================================
// 우선 매칭 가중치 조회
// ============================================
export async function getUserPriorityWeight(userId: string): Promise<number> {
  // 캐시 확인
  const cacheKey = `priority_${userId}`;
  const cached = cacheService.billing.get(cacheKey);
  if (cached !== undefined) {
    return cached as number;
  }
  
  // 구독 확인
  const subscription = await getActiveSubscription(userId);
  
  if (!subscription) {
    cacheService.billing.set(cacheKey, 1.0); // 무료 = 기본 가중치 1.0
    return 1.0;
  }
  
  // 플랜에서 priority_matching 확인
  const [plan] = await db
    .select()
    .from(billingPlans)
    .where(eq(billingPlans.id, subscription.planId))
    .limit(1);
  
  if (!plan || !plan.features) {
    cacheService.billing.set(cacheKey, 1.0);
    return 1.0;
  }
  
  const features = plan.features as Record<string, any>;
  
  // priority_matching이 true면 가중치 1.5 (50% 부스트)
  // 플랜별로 다른 가중치를 주고 싶으면 features에 priority_weight 추가 가능
  const hasPriority = features.priority_matching === true;
  const weight = hasPriority ? (features.priority_weight || 1.5) : 1.0;
  
  cacheService.billing.set(cacheKey, weight);
  console.log(`[Priority] User ${userId} weight: ${weight} (plan: ${subscription.planId})`);
  
  return weight;
}
