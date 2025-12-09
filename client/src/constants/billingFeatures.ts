import { Sparkles, MessageCircle, Film, Compass, Globe, Percent, Star, Zap, Crown, CheckCircle } from 'lucide-react';

export interface FeatureConfig {
  labelKo: string;
  labelEn: string;
  icon: any;
  format: 'number' | 'boolean' | 'period' | 'percent';
  unit?: string;
}

export const FEATURE_DICTIONARY: Record<string, FeatureConfig> = {
  ai_messages: {
    labelKo: 'AI 메시지',
    labelEn: 'AI Messages',
    icon: Sparkles,
    format: 'number',
    unit: '회',
  },
  cinemap_export: {
    labelKo: 'CineMap 내보내기',
    labelEn: 'CineMap Export',
    icon: Film,
    format: 'number',
    unit: '회',
  },
  full_concierge: {
    labelKo: 'AI 컨시어지',
    labelEn: 'AI Concierge',
    icon: Compass,
    format: 'number',
    unit: '회',
  },
  mini_concierge: {
    labelKo: '미니 컨시어지',
    labelEn: 'Mini Concierge',
    icon: Zap,
    format: 'number',
    unit: '회',
  },
  dm_translations: {
    labelKo: 'DM 번역',
    labelEn: 'DM Translations',
    icon: Globe,
    format: 'number',
    unit: '회',
  },
  priority_matching: {
    labelKo: '우선 매칭',
    labelEn: 'Priority Matching',
    icon: Star,
    format: 'boolean',
  },
  discount_percent: {
    labelKo: '할인율',
    labelEn: 'Discount',
    icon: Percent,
    format: 'percent',
  },
  billing_period: {
    labelKo: '결제 주기',
    labelEn: 'Billing Period',
    icon: Crown,
    format: 'period',
  },
  ai_messages_period: {
    labelKo: 'AI 메시지 갱신',
    labelEn: 'AI Messages Reset',
    icon: Sparkles,
    format: 'period',
  },
  cinemap_export_period: {
    labelKo: 'CineMap 갱신',
    labelEn: 'CineMap Reset',
    icon: Film,
    format: 'period',
  },
  full_concierge_period: {
    labelKo: '컨시어지 갱신',
    labelEn: 'Concierge Reset',
    icon: Compass,
    format: 'period',
  },
  mini_concierge_period: {
    labelKo: '미니 컨시어지 갱신',
    labelEn: 'Mini Concierge Reset',
    icon: Zap,
    format: 'period',
  },
  dm_translations_period: {
    labelKo: 'DM 번역 갱신',
    labelEn: 'DM Translations Reset',
    icon: Globe,
    format: 'period',
  },
};

export const PLAN_LABELS: Record<string, { ko: string; en: string }> = {
  free: { ko: '무료', en: 'Free' },
  explorer: { ko: '탐험가', en: 'Explorer' },
  voyager: { ko: '여행자', en: 'Voyager' },
  explorer_yearly: { ko: '탐험가 (연간)', en: 'Explorer (Yearly)' },
  voyager_yearly: { ko: '여행자 (연간)', en: 'Voyager (Yearly)' },
  trip_pass: { ko: '트립 패스', en: 'Trip Pass' },
  'trip pass': { ko: '트립 패스', en: 'Trip Pass' },
  trippass: { ko: '트립 패스', en: 'Trip Pass' },
  '1_day': { ko: '1일권', en: '1 Day' },
  '3_day': { ko: '3일권', en: '3 Days' },
  '7_day': { ko: '7일권', en: '7 Days' },
};

export const PERIOD_LABELS: Record<string, { ko: string; en: string }> = {
  monthly: { ko: '매월', en: 'Monthly' },
  yearly: { ko: '매년', en: 'Yearly' },
  daily: { ko: '매일', en: 'Daily' },
};

export function formatFeatureValue(
  key: string,
  value: any,
  lang: 'ko' | 'en' = 'ko'
): string {
  const config = FEATURE_DICTIONARY[key];
  if (!config) return String(value);

  switch (config.format) {
    case 'number':
      if (value === 0) return lang === 'ko' ? '미제공' : 'Not included';
      if (value === -1 || value === 'unlimited') return lang === 'ko' ? '무제한' : 'Unlimited';
      return `${value}${lang === 'ko' && config.unit ? config.unit : ''}`;
    case 'boolean':
      return value ? (lang === 'ko' ? '포함' : 'Included') : (lang === 'ko' ? '미포함' : 'Not included');
    case 'period':
      const periodLabel = PERIOD_LABELS[value];
      return periodLabel ? periodLabel[lang] : String(value);
    case 'percent':
      return `${value}%`;
    default:
      return String(value);
  }
}

export function getFeatureLabel(key: string, lang: 'ko' | 'en' = 'ko'): string {
  const config = FEATURE_DICTIONARY[key];
  if (!config) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return lang === 'ko' ? config.labelKo : config.labelEn;
}

export function getPlanLabel(planId: string, lang: 'ko' | 'en' = 'ko'): string {
  const planKey = planId.toLowerCase().replace(/[-\s]/g, '_');
  const label = PLAN_LABELS[planKey];
  if (label) return label[lang];
  return planId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const IMPORTANT_FEATURES = [
  'ai_messages',
  'dm_translations',
  'cinemap_export',
  'full_concierge',
  'mini_concierge',
  'priority_matching',
  'discount_percent',
];
