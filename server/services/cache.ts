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

const feedScoreCache = new LRUCache<number>(5000);
const translationCache = new LRUCache<Record<string, string>>(1000);
const hashtagTrendingCache = new LRUCache<any[]>(100);
const userAffinityCache = new LRUCache<Map<number, number>>(500);
const feedResultCache = new LRUCache<any[]>(200);

const CACHE_TTL = {
  FEED_SCORE: 5 * 60 * 1000,
  TRANSLATION: 30 * 60 * 1000,
  TRENDING_HASHTAGS: 5 * 60 * 1000,
  USER_AFFINITY: 10 * 60 * 1000,
  FEED_RESULT: 2 * 60 * 1000,
  POI_CATEGORIES: 60 * 60 * 1000,
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

  invalidateAll: (): void => {
    feedScoreCache.clear();
    translationCache.clear();
    hashtagTrendingCache.clear();
    userAffinityCache.clear();
    feedResultCache.clear();
  },

  stats: () => ({
    feedScore: feedScoreCache.size(),
    translation: translationCache.size(),
    trendingHashtags: hashtagTrendingCache.size(),
    userAffinity: userAffinityCache.size(),
    feedResult: feedResultCache.size(),
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
