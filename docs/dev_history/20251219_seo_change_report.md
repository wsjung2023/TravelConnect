# SEO 구현 변경 리포트

**작성일**: 2025-12-19  
**기준 문서**: `docs/tourgether_SEO_upgrade.md`  
**작업 목적**: SEO 마스터 문서 기반 검색엔진 최적화 구현

---

## 변경 파일 목록

| # | 파일 경로 | 변경 유형 | 변경 내용 |
|---|----------|----------|----------|
| 1 | `client/src/lib/seoConfig.ts` | 신규 생성 | 페이지별 SEO 메타데이터 중앙 설정 파일 |
| 2 | `client/src/pages/landing.tsx` | 수정 | SEO 메타태그 + JSON-LD 스키마 추가 |
| 3 | `client/index.html` | 수정 | 기본 메타태그 업데이트 |
| 4 | `client/public/sitemap.xml` | 수정 | Indexable 페이지만 유지 |
| 5 | `client/public/robots.txt` | 수정 | Private 경로 차단 규칙 추가 |
| 6 | `replit.md` | 수정 | SEO 구현 아키텍처 문서화 |

---

## 변경 상세 내용

### 1. `client/src/lib/seoConfig.ts` (신규 생성)

**변경 이유**: SEO 문서 Section 4 기준, 라우트별 title/meta/OG/canonical을 중앙에서 관리하기 위함

**주요 내용**:
- `SITE_URL`, `SITE_NAME`, `DEFAULT_OG_IMAGE` 상수 정의
- `organizationSchema`: Organization JSON-LD 스키마 (사이트 전역)
- `websiteSchema`: WebSite + SearchAction JSON-LD 스키마 (사이트 전역)
- `pageSeoConfigs`: 페이지별 SEO 설정 객체
  - home, features, timeline, destinations, guides, pricing, about, safety, faq, legal, portfolio, marketplace, feed, chat, profile
- `getDestinationSeo()`: 도시별 동적 SEO 생성 함수
- `getGuideSeo()`: 가이드별 동적 SEO 생성 함수
- `createFaqSchema()`: FAQ 페이지 JSON-LD 생성 함수

---

### 2. `client/src/pages/landing.tsx` (수정)

**변경 이유**: SEO 문서 Section 4.1 기준, Home 페이지 한국어 중심 키워드 전략 적용

**Before**:
```html
<title>Tourgether – Connect with Local Guides & Discover Authentic Travel Experiences</title>
<meta name="description" content="Tourgether is a travel sharing platform connecting travelers with local guides worldwide..." />
<meta name="keywords" content="travel, local guide, travel experiences..." />
```

**After**:
```html
<title>Tourgether - 지도 기반 여행 SNS | 로컬과 함께 만드는 여행 지도</title>
<meta name="description" content="Tourgether는 여행자와 로컬을 연결하는 지도 기반 여행 SNS입니다. 여행 일정 공유, 여행 타임라인 기록, 현지 추천과 매칭까지 한 번에 경험하세요." />
<meta name="keywords" content="여행 SNS, 지도 기반 여행, 여행 타임라인, 로컬 가이드, 여행 일정 공유, 현지 추천, 여행 경험 공유, travel, local guide" />
```

**추가된 JSON-LD 스키마**:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "name": "Tourgether", ... },
    { "@type": "WebSite", "name": "Tourgether", "potentialAction": { "@type": "SearchAction", ... } }
  ]
}
```

---

### 3. `client/index.html` (수정)

**변경 이유**: SEO 문서 기준 기본 메타태그 통일, 한국어 키워드 적용

**변경 항목**:
- `<title>`: 한국어 중심으로 변경
- `<meta name="description">`: 한국어 설명문으로 변경
- `<meta name="keywords">`: 한국어 키워드 추가 (여행 SNS, 지도 기반 여행, 여행 타임라인, 로컬 가이드, 여행 일정 공유)
- `<meta name="author">`: Tourgether 추가
- `<meta name="robots">`: index, follow 추가
- Open Graph 태그: 한국어 title/description 적용
- Twitter Card 태그: 한국어 title/description 적용
- `<link rel="canonical">`: https://tourgether.io/ 추가

---

### 4. `client/public/sitemap.xml` (수정)

**변경 이유**: SEO 문서 Section 5.1 기준, 로그인 필요 페이지는 sitemap에서 제외

**Before** (제거된 URL):
- `/feed` - 로그인 필요
- `/map` - 로그인 필요
- `/chat` - 로그인 필요
- `/profile` - 로그인 필요
- `/timeline` - 로그인 필요

**After** (유지된 URL):
- `/` - 메인 페이지 (priority 1.0)
- `/legal/terms` - 이용약관 (priority 0.3)
- `/legal/privacy` - 개인정보처리방침 (priority 0.3)

**향후 추가 예정**:
- `/features`, `/pricing`, `/about`, `/safety`, `/faq`
- `/destinations/*`, `/guides/*`, `/blog/*`

---

### 5. `client/public/robots.txt` (수정)

**변경 이유**: SEO 문서 Section 5.3 기준, 비공개 경로 크롤러 차단

**Before**:
```
User-agent: *
Allow: /
Sitemap: https://tourgether.io/sitemap.xml
```

**After**:
```
User-agent: *
Allow: /

# 비공개 경로 차단 (로그인 필요 페이지)
Disallow: /feed
Disallow: /timeline
Disallow: /chat
Disallow: /profile
Disallow: /marketplace
Disallow: /map-test
Disallow: /admin
Disallow: /host
Disallow: /config
Disallow: /experience/
Disallow: /guide/
Disallow: /purchase-proxy
Disallow: /slots
Disallow: /subscription
Disallow: /video-test
Disallow: /error-test
Disallow: /conversations

# 파라미터화된 맵 상태 차단 (크롤 트랩 방지)
Disallow: /*?lat=
Disallow: /*?lng=
Disallow: /*?zoom=
Disallow: /*?q=

# API 경로 차단
Disallow: /api/

Sitemap: https://tourgether.io/sitemap.xml
```

---

### 6. `replit.md` (수정)

**변경 이유**: 프로젝트 아키텍처 문서에 SEO 구현 내용 기록

**변경 위치**: Core Features > SEO Enhancement

**추가된 내용**:
- Korean-focused keywords 목록
- SEO Config 파일 위치 (`client/src/lib/seoConfig.ts`)
- Meta Tags 규칙 (title ≤60자, description 80-160자)
- Open Graph & Twitter Cards 적용 항목
- JSON-LD Schemas 종류 (Organization, WebSite)
- Sitemap 정책 (indexable 페이지만)
- Robots.txt 차단 경로 목록
- Indexable Routes 목록

---

## SEO 키워드 전략 요약

**Primary Keywords (한국어)**:
- 여행 SNS
- 지도 기반 여행
- 여행 타임라인
- 로컬 가이드
- 여행 일정 공유

**Secondary Keywords**:
- 현지 추천
- 여행 경험 공유
- 여행 동행 찾기
- travel, local guide

---

## 향후 작업 필요 사항

1. **미구현 Indexable 페이지 생성**: `/features`, `/pricing`, `/about`, `/safety`, `/faq`
2. **동적 페이지 SEO 적용**: `/destinations/*`, `/guides/*`, `/blog/*`
3. **OG 이미지 준비**: `https://tourgether.io/og-image.jpg` 실제 이미지 필요
4. **hreflang 태그**: 다국어 지원 시 언어별 canonical 설정

---

**작성자**: AI Agent  
**검토 필요**: 예
