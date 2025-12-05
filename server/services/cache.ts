import memoizee from 'memoizee';

interface CacheOptions {
  maxAge?: number;
  max?: number;
}

class LRUCache<T> {
  private cache: Map<string, { value: T; expiry: number }>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T, ttlMs: number = 60000): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// ============================================
// 캐시 인스턴스 초기화
// ============================================
// 각 캐시는 용도에 맞는 최대 크기로 생성됨
const feedScoreCache = new LRUCache<number>(5000);
const translationCache = new LRUCache<Record<string, string>>(1000);
const hashtagTrendingCache = new LRUCache<any[]>(100);
const userAffinityCache = new LRUCache<Map<number, number>>(500);
const feedResultCache = new LRUCache<any[]>(200);

// 빌링 관련 캐시 - 자주 변경되지 않으므로 긴 TTL 사용
const billingPlanCache = new LRUCache<any[]>(10);
// Trip Pass 캐시 - 사용자별 활성 패스 정보
const tripPassCache = new LRUCache<any>(1000);
// AI 사용량 통계 캐시 - 짧은 TTL로 최신 데이터 유지
const aiUsageStatsCache = new LRUCache<any>(2000);

// ============================================
// 캐시 TTL (Time To Live) 설정
// ============================================
// 각 데이터 유형에 맞는 캐시 유효 시간 (밀리초)
const CACHE_TTL = {
  FEED_SCORE: 5 * 60 * 1000,       // 피드 점수: 5분
  TRANSLATION: 30 * 60 * 1000,     // 번역: 30분
  TRENDING_HASHTAGS: 5 * 60 * 1000, // 트렌딩 해시태그: 5분
  USER_AFFINITY: 10 * 60 * 1000,   // 사용자 친화도: 10분
  FEED_RESULT: 2 * 60 * 1000,      // 피드 결과: 2분
  POI_CATEGORIES: 60 * 60 * 1000,  // POI 카테고리: 1시간
  
  // 빌링 관련 캐시 TTL
  BILLING_PLAN: 60 * 60 * 1000,    // 빌링 플랜: 1시간 (자주 변경되지 않음)
  TRIP_PASS: 60 * 1000,            // Trip Pass: 1분 (사용량 업데이트 고려)
  AI_USAGE_STATS: 30 * 1000,       // AI 사용량: 30초 (빈번한 변경)
};

export const cacheService = {
  feedScore: {
    get: (postId: number, userId?: string): number | undefined => {
      const key = `${postId}:${userId || 'anon'}`;
      return feedScoreCache.get(key);
    },
    set: (postId: number, userId: string | undefined, score: number): void => {
      const key = `${postId}:${userId || 'anon'}`;
      feedScoreCache.set(key, score, CACHE_TTL.FEED_SCORE);
    },
    invalidateForPost: (postId: number): void => {
      feedScoreCache.clear();
    }
  },

  translation: {
    get: (type: string, lang: string): Record<string, string> | undefined => {
      const key = `${type}:${lang}`;
      return translationCache.get(key);
    },
    set: (type: string, lang: string, translations: Record<string, string>): void => {
      const key = `${type}:${lang}`;
      translationCache.set(key, translations, CACHE_TTL.TRANSLATION);
    },
    invalidate: (type: string): void => {
      translationCache.clear();
    }
  },

  trendingHashtags: {
    get: (lang: string, limit: number): any[] | undefined => {
      const key = `${lang}:${limit}`;
      return hashtagTrendingCache.get(key);
    },
    set: (lang: string, limit: number, hashtags: any[]): void => {
      const key = `${lang}:${limit}`;
      hashtagTrendingCache.set(key, hashtags, CACHE_TTL.TRENDING_HASHTAGS);
    },
    invalidate: (): void => {
      hashtagTrendingCache.clear();
    }
  },

  userAffinity: {
    get: (userId: string): Map<number, number> | undefined => {
      return userAffinityCache.get(userId);
    },
    set: (userId: string, affinity: Map<number, number>): void => {
      userAffinityCache.set(userId, affinity, CACHE_TTL.USER_AFFINITY);
    },
    invalidate: (userId: string): void => {
      userAffinityCache.delete(userId);
    }
  },

  feedResult: {
    get: (mode: string, userId?: string, page?: number): any[] | undefined => {
      const key = `${mode}:${userId || 'anon'}:${page || 0}`;
      return feedResultCache.get(key);
    },
    set: (mode: string, userId: string | undefined, page: number | undefined, results: any[]): void => {
      const key = `${mode}:${userId || 'anon'}:${page || 0}`;
      feedResultCache.set(key, results, CACHE_TTL.FEED_RESULT);
    },
    invalidate: (): void => {
      feedResultCache.clear();
    }
  },

  // ============================================
  // 빌링 플랜 캐시
  // ============================================
  // 빌링 플랜은 자주 변경되지 않으므로 1시간 동안 캐싱
  billingPlan: {
    // 캐시에서 빌링 플랜 조회
    get: (target?: string, type?: string): any[] | undefined => {
      const key = `${target || 'all'}:${type || 'all'}`;
      return billingPlanCache.get(key);
    },
    // 빌링 플랜 캐시에 저장
    set: (target: string | undefined, type: string | undefined, plans: any[]): void => {
      const key = `${target || 'all'}:${type || 'all'}`;
      billingPlanCache.set(key, plans, CACHE_TTL.BILLING_PLAN);
    },
    // 빌링 플랜 캐시 무효화 (플랜 변경 시 호출)
    invalidate: (): void => {
      billingPlanCache.clear();
      console.log('[Cache] 빌링 플랜 캐시 무효화');
    }
  },

  // ============================================
  // Trip Pass 캐시
  // ============================================
  // 활성 Trip Pass 정보 캐싱 (사용량 포함)
  tripPass: {
    // 사용자의 활성 Trip Pass 조회
    get: (userId: string): any | undefined => {
      return tripPassCache.get(userId);
    },
    // Trip Pass 캐시에 저장
    set: (userId: string, tripPass: any): void => {
      tripPassCache.set(userId, tripPass, CACHE_TTL.TRIP_PASS);
    },
    // 특정 사용자의 Trip Pass 캐시 무효화 (사용량 업데이트 후 호출)
    invalidate: (userId: string): void => {
      tripPassCache.delete(userId);
    },
    // 전체 Trip Pass 캐시 클리어
    invalidateAll: (): void => {
      tripPassCache.clear();
      console.log('[Cache] Trip Pass 캐시 전체 무효화');
    }
  },

  // ============================================
  // AI 사용량 통계 캐시
  // ============================================
  // AI 사용량 통계는 30초 동안만 캐싱 (빈번한 업데이트)
  aiUsage: {
    // 사용자의 AI 사용량 통계 조회
    get: (userId: string): any | undefined => {
      return aiUsageStatsCache.get(userId);
    },
    // AI 사용량 통계 캐시에 저장
    set: (userId: string, stats: any): void => {
      aiUsageStatsCache.set(userId, stats, CACHE_TTL.AI_USAGE_STATS);
    },
    // 특정 사용자의 AI 사용량 캐시 무효화 (사용량 변경 후 호출)
    invalidate: (userId: string): void => {
      aiUsageStatsCache.delete(userId);
    },
    // 전체 AI 사용량 캐시 클리어
    invalidateAll: (): void => {
      aiUsageStatsCache.clear();
    }
  },

  // ============================================
  // 전체 캐시 관리
  // ============================================
  invalidateAll: (): void => {
    feedScoreCache.clear();
    translationCache.clear();
    hashtagTrendingCache.clear();
    userAffinityCache.clear();
    feedResultCache.clear();
    billingPlanCache.clear();
    tripPassCache.clear();
    aiUsageStatsCache.clear();
    console.log('[Cache] 전체 캐시 무효화 완료');
  },

  // 캐시 통계 조회 (모니터링/디버깅용)
  stats: () => ({
    feedScore: feedScoreCache.size(),
    translation: translationCache.size(),
    trendingHashtags: hashtagTrendingCache.size(),
    userAffinity: userAffinityCache.size(),
    feedResult: feedResultCache.size(),
    billingPlan: billingPlanCache.size(),
    tripPass: tripPassCache.size(),
    aiUsage: aiUsageStatsCache.size(),
  })
};

export const createMemoizedFunction = <T extends (...args: any[]) => any>(
  fn: T,
  options: { maxAge?: number; max?: number } = {}
): T => {
  return memoizee(fn, {
    maxAge: options.maxAge || 60000,
    max: options.max || 100,
    promise: true,
  }) as T;
};

export { CACHE_TTL };
export default cacheService;
