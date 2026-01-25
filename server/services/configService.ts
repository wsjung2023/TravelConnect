import { storage } from '../storage';
import type { SystemConfig } from '@shared/schema';
import LRUCache from 'lru-cache';

// 설정값 캐시 (TTL: 5분)
const configCache = new LRUCache<string, SystemConfig>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5분
});

// 카테고리 전체 캐시
const categoryCache = new LRUCache<string, SystemConfig[]>({
  max: 20,
  ttl: 1000 * 60 * 5,
});

// 캐시 키 생성
function getCacheKey(category: string, key: string): string {
  return `${category}:${key}`;
}

// 캐시 무효화
export function invalidateConfigCache(category?: string, key?: string): void {
  if (category && key) {
    configCache.delete(getCacheKey(category, key));
  } else if (category) {
    categoryCache.delete(category);
    // 해당 카테고리의 모든 키 캐시 무효화
    for (const cacheKey of configCache.keys()) {
      if (cacheKey.startsWith(`${category}:`)) {
        configCache.delete(cacheKey);
      }
    }
  } else {
    // 전체 캐시 무효화
    configCache.clear();
    categoryCache.clear();
  }
}

// 기본값 맵 (하드코딩 대체용 폴백)
const DEFAULT_VALUES: Record<string, Record<string, any>> = {
  // Payment
  'payment.default_platform_fee_percent': 12,
  'payment.default_deposit_percent': 30,
  'payment.host_free_commission_percent': 15,
  'payment.host_pro_commission_percent': 10,
  'payment.host_business_commission_percent': 7,
  
  // AI
  'ai.concierge_max_tokens': 500,
  'ai.mini_concierge_max_tokens': 1500,
  'ai.cinemap_max_tokens': 2000,
  'ai.default_ai_model': 'gpt-5.1-chat-latest',
  'ai.ai_temperature': 0.7,
  
  // Rate Limits
  'rate_limit.general_api_requests_per_minute': 200,
  'rate_limit.login_requests_per_minute': 10,
  'rate_limit.ai_api_requests_per_minute': 20,
  
  // Distance
  'distance.nearby_users_radius_km': 5,
  'distance.nearby_experiences_radius_km': 20,
  'distance.nearby_poi_radius_m': 2000,
  
  // Cache
  'cache.feed_score_cache_size': 5000,
  'cache.feed_score_cache_ttl_seconds': 300,
  'cache.translation_cache_size': 1000,
  
  // Pagination
  'pagination.default_page_size': 20,
  'pagination.posts_page_size': 50,
  'pagination.messages_page_size': 50,
  
  // User Experience
  'user_experience.open_to_meet_default_hours': 12,
  'user_experience.trip_pass_validity_days': 365,
  
  // File
  'file.max_upload_files': 100,
  'file.translation_max_length': 500,
  
  // I18n
  'i18n.supported_languages': ['en', 'ko', 'ja', 'zh', 'fr', 'es', 'de'],
  'i18n.default_language': 'en',
  
  // Comment
  'comment.max_reply_depth': 1,
  
  // Geo
  'geo.earth_radius_meters': 6371000,
  'geo.earth_radius_km': 6371,
};

// 설정값 추출 헬퍼
function extractValue(config: SystemConfig): any {
  switch (config.valueType) {
    case 'string':
      return config.valueString;
    case 'number':
      return config.valueNumber ? parseFloat(config.valueNumber) : 0;
    case 'boolean':
      return config.valueBoolean;
    case 'json':
    case 'array':
      return config.valueJson;
    default:
      return config.valueString;
  }
}

// 단일 설정 조회
export async function getConfig<T = any>(category: string, key: string, defaultValue?: T): Promise<T> {
  const cacheKey = getCacheKey(category, key);
  
  // 캐시 확인
  let config = configCache.get(cacheKey);
  
  if (!config) {
    config = await storage.getSystemConfigByKey(category, key);
    if (config) {
      configCache.set(cacheKey, config);
    }
  }
  
  if (config) {
    return extractValue(config) as T;
  }
  
  // 기본값 폴백
  const fallbackKey = `${category}.${key}`;
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  return (DEFAULT_VALUES[fallbackKey] ?? null) as T;
}

// 숫자 설정 조회
export async function getNumberConfig(category: string, key: string, defaultValue: number = 0): Promise<number> {
  const value = await getConfig<number>(category, key, defaultValue);
  return typeof value === 'number' ? value : parseFloat(String(value)) || defaultValue;
}

// 문자열 설정 조회
export async function getStringConfig(category: string, key: string, defaultValue: string = ''): Promise<string> {
  const value = await getConfig<string>(category, key, defaultValue);
  return typeof value === 'string' ? value : String(value);
}

// 불린 설정 조회
export async function getBooleanConfig(category: string, key: string, defaultValue: boolean = false): Promise<boolean> {
  const value = await getConfig<boolean>(category, key, defaultValue);
  return typeof value === 'boolean' ? value : Boolean(value);
}

// JSON/배열 설정 조회
export async function getJsonConfig<T = any>(category: string, key: string, defaultValue: T): Promise<T> {
  const value = await getConfig<T>(category, key, defaultValue);
  return value ?? defaultValue;
}

// 카테고리별 모든 설정 조회
export async function getConfigsByCategory(category: string): Promise<Record<string, any>> {
  // 카테고리 캐시 확인
  let configs = categoryCache.get(category);
  
  if (!configs) {
    configs = await storage.getSystemConfigsByCategory(category);
    categoryCache.set(category, configs);
  }
  
  const result: Record<string, any> = {};
  for (const config of configs) {
    result[config.key] = extractValue(config);
  }
  
  return result;
}

// =====================================================
// 편의 함수들 (자주 사용되는 설정값)
// =====================================================

// 결제 관련
export async function getPlatformFeePercent(): Promise<number> {
  return getNumberConfig('payment', 'default_platform_fee_percent', 12);
}

export async function getDefaultDepositPercent(): Promise<number> {
  return getNumberConfig('payment', 'default_deposit_percent', 30);
}

export async function getHostCommissionPercent(planType: 'free' | 'pro' | 'business'): Promise<number> {
  const key = `host_${planType}_commission_percent`;
  const defaults = { free: 15, pro: 10, business: 7 };
  return getNumberConfig('payment', key, defaults[planType]);
}

// AI 관련
export async function getAiMaxTokens(service: 'concierge' | 'mini_concierge' | 'cinemap'): Promise<number> {
  const key = `${service}_max_tokens`;
  const defaults = { concierge: 500, mini_concierge: 1500, cinemap: 2000 };
  return getNumberConfig('ai', key, defaults[service]);
}

export async function getAiModel(): Promise<string> {
  return getStringConfig('ai', 'default_ai_model', 'gpt-5.1-chat-latest');
}

export async function getAiTemperature(): Promise<number> {
  return getNumberConfig('ai', 'ai_temperature', 0.7);
}

// Rate Limit 관련
export async function getRateLimitConfig(type: 'general' | 'login' | 'ai' | 'chat' | 'payment'): Promise<number> {
  const keyMap: Record<string, string> = {
    general: 'general_api_requests_per_minute',
    login: 'login_requests_per_minute',
    ai: 'ai_api_requests_per_minute',
    chat: 'chat_api_requests_per_minute',
    payment: 'payment_api_requests_per_minute',
  };
  const defaults: Record<string, number> = {
    general: 200,
    login: 10,
    ai: 20,
    chat: 100,
    payment: 5,
  };
  return getNumberConfig('rate_limit', keyMap[type], defaults[type]);
}

// 거리/반경 관련
export async function getSearchRadius(type: 'users' | 'experiences' | 'poi' | 'posts'): Promise<number> {
  const keyMap: Record<string, string> = {
    users: 'nearby_users_radius_km',
    experiences: 'nearby_experiences_radius_km',
    poi: 'nearby_poi_radius_m',
    posts: 'post_search_radius_km',
  };
  const defaults: Record<string, number> = {
    users: 5,
    experiences: 20,
    poi: 2000,
    posts: 50,
  };
  return getNumberConfig('distance', keyMap[type], defaults[type]);
}

// 페이징 관련
export async function getPageSize(type: 'default' | 'posts' | 'messages' | 'search'): Promise<number> {
  const keyMap: Record<string, string> = {
    default: 'default_page_size',
    posts: 'posts_page_size',
    messages: 'messages_page_size',
    search: 'search_results_max',
  };
  const defaults: Record<string, number> = {
    default: 20,
    posts: 50,
    messages: 50,
    search: 50,
  };
  return getNumberConfig('pagination', keyMap[type], defaults[type]);
}

// 캐시 관련
export async function getCacheConfig(type: 'feed_score' | 'translation' | 'hashtag'): Promise<{ size: number; ttl: number }> {
  const sizeKey = `${type}_cache_size`;
  const ttlKey = `${type}_cache_ttl_seconds`;
  const defaults: Record<string, { size: number; ttl: number }> = {
    feed_score: { size: 5000, ttl: 300 },
    translation: { size: 1000, ttl: 0 },
    hashtag: { size: 100, ttl: 0 },
  };
  
  const [size, ttl] = await Promise.all([
    getNumberConfig('cache', sizeKey, defaults[type].size),
    getNumberConfig('cache', ttlKey, defaults[type].ttl),
  ]);
  
  return { size, ttl };
}

// 국제화 관련
export async function getSupportedLanguages(): Promise<string[]> {
  return getJsonConfig('i18n', 'supported_languages', ['en', 'ko', 'ja', 'zh', 'fr', 'es', 'de']);
}

export async function getDefaultLanguage(): Promise<string> {
  return getStringConfig('i18n', 'default_language', 'en');
}

// 댓글 관련
export async function getMaxReplyDepth(): Promise<number> {
  return getNumberConfig('comment', 'max_reply_depth', 1);
}

// 플랜별 AI 사용량 제한
export async function getPlanAiLimits(planType: 'free' | 'explorer' | 'voyager'): Promise<{
  aiMessages: number;
  translations: number;
  miniConcierge: number;
  fullConcierge: number;
  cinemap: number;
}> {
  const subcategory = `plan_limits_${planType}`;
  
  const [aiMessages, translations, miniConcierge, fullConcierge, cinemap] = await Promise.all([
    getNumberConfig('ai', `${planType}_ai_messages_monthly`, planType === 'free' ? 30 : planType === 'explorer' ? 100 : -1),
    getNumberConfig('ai', `${planType}_translations_monthly`, planType === 'free' ? 50 : planType === 'explorer' ? 200 : -1),
    getNumberConfig('ai', `${planType}_mini_concierge_monthly`, planType === 'free' ? 5 : planType === 'explorer' ? 30 : -1),
    getNumberConfig('ai', `${planType}_full_concierge_monthly`, planType === 'free' ? 0 : planType === 'explorer' ? 5 : 20),
    getNumberConfig('ai', `${planType}_cinemap_monthly`, planType === 'free' ? 1 : planType === 'explorer' ? 5 : -1),
  ]);
  
  return { aiMessages, translations, miniConcierge, fullConcierge, cinemap };
}

// Trip Pass AI 사용량
export async function getTripPassLimits(days: 1 | 3 | 7): Promise<{
  aiMessages: number;
  translations: number;
  concierge: number;
}> {
  const prefix = `trip_pass_${days}day`;
  
  const defaults: Record<number, { aiMessages: number; translations: number; concierge: number }> = {
    1: { aiMessages: 50, translations: 100, concierge: 3 },
    3: { aiMessages: 150, translations: 300, concierge: 10 },
    7: { aiMessages: 400, translations: 700, concierge: 25 },
  };
  
  const [aiMessages, translations, concierge] = await Promise.all([
    getNumberConfig('ai', `${prefix}_ai_messages`, defaults[days].aiMessages),
    getNumberConfig('ai', `${prefix}_translations`, defaults[days].translations),
    getNumberConfig('ai', `${prefix}_concierge`, defaults[days].concierge),
  ]);
  
  return { aiMessages, translations, concierge };
}

// 지구 반경 (거리 계산용)
export async function getEarthRadius(unit: 'meters' | 'km' = 'meters'): Promise<number> {
  const key = unit === 'meters' ? 'earth_radius_meters' : 'earth_radius_km';
  const defaultValue = unit === 'meters' ? 6371000 : 6371;
  return getNumberConfig('geo', key, defaultValue);
}

console.log('[ConfigService] System configuration service initialized');