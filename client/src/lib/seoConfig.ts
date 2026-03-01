// SEO 설정 — 각 SEO 랜딩 페이지의 메타 태그, OG, JSON-LD 스키마 기본값을 정의한다.
/**
 * SEO 설정 파일 - tourgether_SEO_upgrade.md 문서 기반
 * Single Source of Truth for SEO meta data
 */

// 기본 도메인
export const SITE_URL = 'https://tourgether.io';
export const SITE_NAME = '투어게더 Tourgether';
export const SITE_NAME_KO = '투어게더';
export const SITE_NAME_EN = 'Tourgether';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

// Organization 스키마 (사이트 전역) - 한글/영어 병기
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '투어게더 (Tourgether)',
  alternateName: ['Tourgether', '투어게더'],
  url: SITE_URL,
  logo: `${SITE_URL}/travel-icon.svg`,
  sameAs: [],
  description: '투어게더는 여행자와 로컬을 연결하는 지도 기반 여행 SNS입니다. Tourgether is a map-based travel SNS connecting travelers with locals.',
};

// WebSite 스키마 (사이트 전역) - 한글/영어 병기
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '투어게더 (Tourgether)',
  alternateName: 'Tourgether',
  url: SITE_URL,
  inLanguage: ['ko', 'en'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// 페이지별 SEO 설정 (문서 Section 4 기준)
export interface PageSeoConfig {
  title: string;
  description: string;
  h1?: string;
  canonical: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any>;
}

export const pageSeoConfigs: Record<string, PageSeoConfig> = {
  // 4.1 Home — `/` - 한글/영어 브랜드명 병기
  home: {
    title: '투어게더(Tourgether) - 지도 기반 여행 SNS | 로컬과 함께하는 여행',
    description: '투어게더(Tourgether)는 여행자와 로컬을 연결하는 지도 기반 여행 SNS입니다. 여행 일정 공유, 여행 타임라인 기록, 현지 추천과 매칭까지 한 번에 경험하세요. Travel SNS connecting travelers with locals.',
    h1: '지도 위에서 연결되는 여행 경험',
    canonical: `${SITE_URL}/`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [organizationSchema, websiteSchema],
    },
  },

  // 4.2 Features — `/features`
  features: {
    title: '투어게더 기능 소개 - 여행 타임라인 · 로컬 매칭 · 지도 기반 탐색 | Tourgether',
    description: '투어게더(Tourgether)는 여행 타임라인 기록, 지도 기반 탐색, 로컬 매칭, 여행 일정 공유 기능으로 여행 경험을 연결합니다. 핵심 기능을 한눈에 확인하세요.',
    h1: '여행의 모든 순간을 기록하고 연결하는 기능',
    canonical: `${SITE_URL}/features`,
    ogType: 'website',
  },

  // 4.3 Timeline — `/timeline` (public marketing page)
  timeline: {
    title: '여행 타임라인 기록 - 지도 기반 여행 콘텐츠 SNS | 투어게더 Tourgether',
    description: '투어게더의 지도 기반 여행 타임라인으로 여행 일정을 시각화하고 공유하세요. 여행 동선과 순간이 하나의 이야기로 이어집니다.',
    h1: '여행 타임라인, 진짜 여행 기록',
    canonical: `${SITE_URL}/timeline`,
    ogType: 'website',
  },

  // 4.5 Destinations hub — `/destinations`
  destinations: {
    title: '여행지 탐색 - 지역별 여행 지도 & 추천 | 투어게더 Tourgether',
    description: '투어게더에서 지역별 여행 지도와 추천을 한 번에 확인하세요. 인기 여행지부터 숨은 명소까지 발견하고 저장할 수 있습니다.',
    h1: '지역별 여행 지도를 탐색하세요',
    canonical: `${SITE_URL}/destinations`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '여행지 탐색 - 투어게더',
      description: '투어게더의 지역별 여행 지도와 추천',
      url: `${SITE_URL}/destinations`,
    },
  },

  // 4.7 Guides hub — `/guides`
  guides: {
    title: '로컬 가이드 찾기 - 현지 추천과 매칭 | 투어게더 Tourgether',
    description: '투어게더에서 여행자와 로컬 가이드를 연결합니다. 현지 추천, 동행, 맞춤 여행 도움을 찾아보세요.',
    h1: '로컬 가이드와 함께 더 깊은 여행',
    canonical: `${SITE_URL}/guides`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '로컬 가이드 찾기 - 투어게더',
      description: '투어게더의 여행자와 로컬 가이드 매칭',
      url: `${SITE_URL}/guides`,
    },
  },

  // 4.9 Pricing — `/pricing`
  pricing: {
    title: '투어게더 요금제 - 여행 SNS 프리미엄 기능 | Tourgether',
    description: '투어게더(Tourgether)의 무료/프리미엄 요금제를 확인하세요. 여행 일정 공유, 로컬 매칭, 여행 타임라인 고급 기능을 제공합니다.',
    h1: '투어게더 요금제',
    canonical: `${SITE_URL}/pricing`,
    ogType: 'website',
  },

  // 4.10 About — `/about`
  about: {
    title: '투어게더 소개 - 지도 기반 여행 SNS | Tourgether',
    description: '투어게더(Tourgether)가 만드는 여행의 새로운 표준을 소개합니다. 지도 기반 탐색과 여행 경험 공유, 로컬 연결의 가치를 담았습니다.',
    h1: '투어게더 소개',
    canonical: `${SITE_URL}/about`,
    ogType: 'website',
  },

  // 4.11 Safety & Trust — `/safety`
  safety: {
    title: '투어게더 안전 가이드 - 신뢰와 여행 커뮤니티 보호 | Tourgether',
    description: '투어게더(Tourgether)는 여행자와 로컬이 안전하게 연결되도록 신뢰/안전 정책을 운영합니다. 신고, 검증, 안전 가이드를 확인하세요.',
    h1: '안전한 여행 커뮤니티',
    canonical: `${SITE_URL}/safety`,
    ogType: 'website',
  },

  // 4.12 FAQ — `/faq`
  faq: {
    title: '투어게더 FAQ - 여행 타임라인 · 로컬 매칭 · 지도 기반 탐색 | Tourgether',
    description: '투어게더(Tourgether) 사용법과 자주 묻는 질문을 정리했습니다. 여행 타임라인, 로컬 매칭, 지도 기반 탐색 관련 내용을 빠르게 확인하세요.',
    h1: '자주 묻는 질문',
    canonical: `${SITE_URL}/faq`,
    ogType: 'website',
  },

  // Legal pages
  legal: {
    title: '이용약관 및 개인정보처리방침 | 투어게더 Tourgether',
    description: '투어게더(Tourgether) 이용약관, 개인정보처리방침, 서비스 정책을 확인하세요.',
    canonical: `${SITE_URL}/legal`,
    ogType: 'website',
  },

  // Public portfolio
  portfolio: {
    title: '포트폴리오 | 투어게더 Tourgether',
    description: '로컬 가이드의 여행 경험과 서비스를 확인하세요.',
    canonical: `${SITE_URL}/portfolio`,
    ogType: 'profile',
  },

  // Marketplace
  marketplace: {
    title: '여행 마켓플레이스 - 현지 체험 예약 | 투어게더 Tourgether',
    description: '전 세계 로컬이 제공하는 특별한 여행 체험을 예약하세요. 맞춤형 투어, 현지 음식, 문화 체험까지.',
    h1: '현지 체험 마켓플레이스',
    canonical: `${SITE_URL}/marketplace`,
    ogType: 'website',
    noindex: true, // 로그인 필요
  },

  // Feed
  feed: {
    title: '여행 피드 - 지도 기반 여행 콘텐츠 | 투어게더 Tourgether',
    description: '지도 기반으로 여행 콘텐츠를 탐색하고 공유하세요.',
    canonical: `${SITE_URL}/feed`,
    ogType: 'website',
    noindex: true, // 로그인 필요
  },

  // Chat
  chat: {
    title: '메시지 | 투어게더 Tourgether',
    description: '여행자와 로컬 가이드와 직접 소통하세요.',
    canonical: `${SITE_URL}/chat`,
    ogType: 'website',
    noindex: true, // 로그인 필요
  },

  // Profile
  profile: {
    title: '프로필 | 투어게더 Tourgether',
    description: '나의 여행 프로필과 활동을 관리하세요.',
    canonical: `${SITE_URL}/profile`,
    ogType: 'profile',
    noindex: true, // 로그인 필요
  },
};

// 동적 페이지 SEO 생성 함수
export function getDestinationSeo(city: string): PageSeoConfig {
  return {
    title: `${city} 여행 지도 - 추천 코스 · 로컬 추천 · 일정 공유 | Tourgether`,
    description: `${city} 여행을 지도에서 탐색하세요. 추천 코스, 로컬의 실제 추천, 여행 일정 공유와 타임라인 기록까지 Tourgether에서 한 번에.`,
    h1: `${city} 여행을 지도에서 시작하세요`,
    canonical: `${SITE_URL}/destinations/${city.toLowerCase()}`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: city,
      description: `${city} 여행 지도와 추천 코스`,
      url: `${SITE_URL}/destinations/${city.toLowerCase()}`,
    },
  };
}

export function getGuideSeo(guideName: string, city: string): PageSeoConfig {
  return {
    title: `${guideName} 로컬 가이드 | ${city} 추천 · 여행 도움 | Tourgether`,
    description: `${city} 로컬 가이드 ${guideName}의 추천과 여행 도움을 확인하세요. 일정 제안, 동행, 현지 팁까지 Tourgether에서 연결됩니다.`,
    canonical: `${SITE_URL}/guides/${guideName.toLowerCase().replace(/\s+/g, '-')}`,
    ogType: 'profile',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: guideName,
      jobTitle: 'Local Guide',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city,
      },
    },
  };
}

// FAQ 스키마 생성 함수
export function createFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
