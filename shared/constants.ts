// 공유 상수 - 온보딩 및 프로필 편집에서 사용

export const INTEREST_OPTIONS = [
  'food',
  'shopping',
  'culture',
  'nightlife',
  'nature',
  'adventure',
  'photography',
  'history',
  'art',
  'music',
  'sports',
  'wellness'
] as const;

export type InterestOption = typeof INTEREST_OPTIONS[number];

export const LANGUAGE_OPTIONS = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
] as const;

export type LanguageOption = typeof LANGUAGE_OPTIONS[number];
export type LanguageCode = typeof LANGUAGE_OPTIONS[number]['code'];
