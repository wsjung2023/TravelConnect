import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { userTripPasses, userUsage } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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

async function getActiveTripPass(userId: string) {
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

async function incrementTripPassUsage(tripPassId: number, usageType: UsageType) {
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
}

async function incrementUserUsage(usageId: number) {
  await db
    .update(userUsage)
    .set({
      usedInPeriod: sql`${userUsage.usedInPeriod} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userUsage.id, usageId));
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
        
        await incrementTripPassUsage(tripPass.id, usageType);
        
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
      
      await incrementUserUsage(usage.id);
      
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

export async function getUserAiUsageStats(userId: string) {
  const now = new Date();
  
  const tripPass = await getActiveTripPass(userId);
  
  if (tripPass) {
    return {
      source: 'trip_pass',
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
  
  return {
    source: 'free_tier',
    limits: usageMap,
  };
}
