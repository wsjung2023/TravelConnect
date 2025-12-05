import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { userTripPasses, userUsage } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { cacheService } from '../services/cache';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

type UsageType = 'ai_message' | 'translation' | 'concierge';

const FREE_TIER_LIMITS: Record<UsageType, number> = {
  ai_message: 5,
  translation: 10,
  concierge: 3,
};

// ============================================
// 활성 Trip Pass 조회 (캐싱 적용)
// ============================================
// Trip Pass 조회는 AI 요청마다 발생하므로 1분 TTL로 캐싱
async function getActiveTripPass(userId: string) {
  // 캐시 확인
  const cached = cacheService.tripPass.get(userId);
  if (cached !== undefined) {
    // 캐시에 null이 저장된 경우도 유효 (Trip Pass 없음)
    if (cached === null) {
      console.log('[Cache] Trip Pass 캐시 히트 (없음):', userId);
      return null;
    }
    console.log('[Cache] Trip Pass 캐시 히트:', userId);
    return cached;
  }

  // 캐시 미스 - DB에서 조회
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
  
  // 캐시에 저장 (Trip Pass 없는 경우 null 저장)
  cacheService.tripPass.set(userId, tripPass || null);
  console.log('[Cache] Trip Pass 캐시 저장:', userId, tripPass ? '있음' : '없음');
  
  return tripPass;
}

async function getOrCreateUserUsage(userId: string, usageKey: UsageType) {
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
    return existing;
  }
  
  const [created] = await db.insert(userUsage).values({
    userId,
    usageKey,
    usedInPeriod: 0,
    limitInPeriod: FREE_TIER_LIMITS[usageKey],
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
  
  // 사용량 변경 후 캐시 무효화
  cacheService.tripPass.invalidate(userId);
  cacheService.aiUsage.invalidate(userId);
}

// ============================================
// 무료 사용량 증가 (캐시 무효화 포함)
// ============================================
async function incrementUserUsage(usageId: number, userId: string) {
  await db
    .update(userUsage)
    .set({
      usedInPeriod: sql`${userUsage.usedInPeriod} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userUsage.id, usageId));
  
  // 사용량 변경 후 캐시 무효화
  cacheService.aiUsage.invalidate(userId);
}

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
      
      if (req.user.role === 'admin') {
        console.log(`[AI Usage] Admin user ${userId} bypassing limit check for ${usageType}`);
        return next();
      }

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

      const usage = await getOrCreateUserUsage(userId, usageType);
      const currentUsed = usage.usedInPeriod || 0;
      
      console.log(`[AI Usage] Free tier check - user: ${userId}, type: ${usageType}, used: ${currentUsed}/${usage.limitInPeriod}`);
      
      if (currentUsed >= usage.limitInPeriod) {
        return res.status(402).json({
          message: 'Free tier limit exceeded',
          code: 'FREE_LIMIT_EXCEEDED',
          usageType,
          limit: usage.limitInPeriod,
          used: currentUsed,
          suggestion: 'Purchase a Trip Pass to unlock more AI features',
          periodEnd: usage.periodEnd,
        });
      }
      
      await incrementUserUsage(usage.id, userId);
      
      (req as any).usageInfo = {
        source: 'free_tier',
        remaining: usage.limitInPeriod - currentUsed - 1,
      };
      
      console.log(`[AI Usage] Free tier usage incremented - remaining: ${usage.limitInPeriod - currentUsed - 1}`);
      return next();
    } catch (error) {
      console.error('[AI Usage] Error checking usage:', error);
      return next();
    }
  };
}

// ============================================
// AI 사용량 통계 조회 (캐싱 적용)
// ============================================
// 사용량 통계는 30초 TTL로 캐싱 (빈번한 요청 최적화)
// skipCache: true 설정 시 캐시를 무시하고 DB에서 직접 조회 (사용량 변경 직후 정확한 데이터 필요 시)
export async function getUserAiUsageStats(userId: string, options?: { skipCache?: boolean }) {
  // skipCache 옵션이 없고 캐시가 있으면 캐시 사용
  if (!options?.skipCache) {
    const cached = cacheService.aiUsage.get(userId);
    if (cached) {
      console.log('[Cache] AI 사용량 통계 캐시 히트:', userId);
      return cached;
    }
  }

  const now = new Date();
  
  const tripPass = await getActiveTripPass(userId);
  
  if (tripPass) {
    const stats = {
      source: 'trip_pass' as const,
      tripPassId: tripPass.id,
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
    
    // 캐시에 저장
    cacheService.aiUsage.set(userId, stats);
    console.log('[Cache] AI 사용량 통계 캐시 저장 (Trip Pass):', userId);
    
    return stats;
  }
  
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
    if (record) {
      usageMap[key] = {
        limit: record.limitInPeriod,
        used: record.usedInPeriod || 0,
        remaining: record.limitInPeriod - (record.usedInPeriod || 0),
        periodEnd: record.periodEnd,
      };
    } else {
      usageMap[key] = {
        limit: FREE_TIER_LIMITS[key],
        used: 0,
        remaining: FREE_TIER_LIMITS[key],
      };
    }
  }
  
  const stats = {
    source: 'free_tier' as const,
    limits: usageMap,
  };
  
  // 캐시에 저장
  cacheService.aiUsage.set(userId, stats);
  console.log('[Cache] AI 사용량 통계 캐시 저장 (Free tier):', userId);
  
  return stats;
}
