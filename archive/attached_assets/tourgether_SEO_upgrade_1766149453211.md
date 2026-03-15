# Tourgether SEO Upgrade
**Filename:** `tourgether_SEO_upgrade.md`  
**Version:** v1.0 (Master)  
**Generated:** 2025-12-19 12:38:12 (Asia/Seoul)

---

## 0. What this document is (and how to use it in Replit)

This is a **developer-executable SEO spec** for Tourgether (map-based travel SNS).  
It is written so you can paste it into Replit AI and get **real code/markup changes** instead of vague “SEO advice.”

**Primary use cases**
1) SEO baseline setup (meta/OG/canonical/sitemap/robots/schema)  
2) Information architecture + URL strategy (routes + slugs)  
3) Content cluster strategy (landing pages + blog templates)  
4) Performance + indexing hygiene (Core Web Vitals + crawl budget)  
5) Measurement (GSC/GA4 events + KPI dashboards)

**Non-goals**
- This is not a marketing copy deck.
- This is not “keywords sprinkled everywhere.” (Keyword stuffing is explicitly forbidden.)

---

## 1. SEO goals

### 1.1 Growth goals
- Increase non-brand organic traffic for travel & local-guide discovery intents
- Establish durable rankings for “지도 기반 여행 / 여행 일정 공유 / 로컬 가이드 / 여행 타임라인” clusters
- Convert organic traffic to: signup → first map action → first post → first interaction (follow/chat/booking)

### 1.2 Quality goals
- Ensure every indexable route has: unique title + meta description + canonical + OG + schema
- Avoid duplicated content across routes (especially map views)
- Improve crawlability for PWA/SPA through SSR/Prerender strategy (or pre-rendered landing pages)

### 1.3 KPI targets (track weekly)
- Index coverage: valid indexed pages ↑, excluded (soft 404/duplicate) ↓
- Average CTR ↑ on priority queries
- “Engaged sessions” from organic ↑
- Sign-up conversion rate from organic ↑
- Median LCP/CLS/INP improvements (Core Web Vitals)

---

## 2. Keyword universe (clusters)

> Rule: **Primary keyword per page** + **2–5 supporting keywords**  
> Don’t attempt to rank every keyword from a single page.

### 2.1 Primary keywords (core)
- 여행 SNS
- 지도 기반 여행
- 여행 일정 공유
- 여행 타임라인
- 로컬 가이드
- 현지 추천
- 여행 경험 공유
- 지도 기반 여행 콘텐츠

### 2.2 Secondary keywords (support)
- 여행 동행 찾기
- 여행 매칭
- 현지인 추천 여행 일정
- 로컬 투어 추천
- 여행 컨시어지
- 여행 커뮤니티
- 여행 기록 앱
- 여행 지도 앱

### 2.3 Long-tail keywords (intent-rich)
- 현지인이 추천하는 여행 코스
- 여행 일정 자동 정리/시각화
- 여행 동선 기록하는 방법
- 지도 기반 여행 커뮤니티 추천
- 로컬 가이드와 동행하는 여행
- 여행 타임라인으로 여행 후기 남기기
- 혼자 여행 일정 공유하는 방법
- 로컬 추천 맛집/명소 지도

### 2.4 Brand + product keywords
- Tourgether
- 투어게더
- Tourgether Map
- Tourgether Timeline
- Tourgether Local Guide

---

## 3. Information Architecture (IA) & URL strategy

### 3.1 Indexing policy: what should be indexable?
**Indexable (YES)**
- Marketing / product pages: `/`, `/features`, `/pricing`, `/about`, `/safety`, `/faq`
- Content hubs: `/guides/*`, `/destinations/*`, `/blog/*`
- SEO landing pages built for intent clusters (see Section 6)

**Not indexable by default (NO)**
- Infinite/parameterized map search states: `/map?lat=...&lng=...&q=...`
- User-private pages: `/settings`, `/messages/*`, `/account/*`
- Faceted filters that create infinite combinations unless canonicalized properly

### 3.2 Canonical strategy
- Every indexable page must declare one canonical URL.
- For any filtered/sorted list:
  - Canonical should point to the base unfiltered version unless a specific filter page is intentionally built as a landing page.
- Map states should generally canonicalize to a stable landing page (e.g. `/map` or `/destinations/seoul`)

### 3.3 Slug rules (must be consistent)
- Use lowercase English slugs for stability in tooling:
  - `/destinations/seoul`
  - `/guides/local-guide-seoul`
- If Korean slugs are used, be strict and consistent; avoid mixed scripts.
- No spaces; use hyphens `-`
- Keep slugs stable once indexed. If changed, use 301 redirects.

---

## 4. Page-by-page SEO specs (Title/Meta/H1/H2 + requirements)

> **Do not copy/paste the same title/meta across pages.**  
> Each page must be unique, intent-aligned, and readable.

### 4.1 Home — `/`

**Primary intent:** brand + value proposition + orientation  
**Primary keyword:** 지도 기반 여행 SNS / 여행 SNS

**Title (preferred)**
- Tourgether - 지도 기반 여행 SNS | 로컬과 함께 만드는 여행 지도

**Title (alt)**
- Tourgether | 여행 일정 공유 · 여행 타임라인 · 로컬 가이드

**Meta description (preferred)**
- Tourgether는 여행자와 로컬을 연결하는 지도 기반 여행 SNS입니다. 여행 일정 공유, 여행 타임라인 기록, 현지 추천과 매칭까지 한 번에 경험하세요.

**H1**
- 지도 위에서 연결되는 여행 경험

**Recommended H2s**
- 여행 일정 공유로 여행을 “설명”하다
- 여행 타임라인으로 여행을 “증명”하다
- 로컬 가이드와 함께 “깊이” 있는 여행을 만들다
- 지도 기반 피드로 여행 정보를 “발견”하다

**Internal links**
- CTA to `/features`, `/destinations`, `/guides`, `/pricing`, `/faq`

**Schema**
- Organization + WebSite + (optional) MobileApplication

---

### 4.2 Features — `/features`

**Primary intent:** feature discovery + comparison  
**Primary keyword:** 여행 타임라인 / 지도 기반 여행

**Title**
- Tourgether 기능 소개 - 여행 타임라인 · 로컬 매칭 · 지도 기반 탐색

**Meta description**
- Tourgether는 여행 타임라인 기록, 지도 기반 탐색, 로컬 매칭, 여행 일정 공유 기능으로 여행 경험을 연결합니다. 핵심 기능을 한눈에 확인하세요.

**H1**
- 여행의 모든 순간을 기록하고 연결하는 기능

**Recommended sections**
- 지도 기반 탐색 (Map-first Discovery)
- 여행 타임라인 (Trip Timeline)
- 로컬 매칭/가이드 (Local Matching)
- 안전/신뢰 (Trust & Safety)
- 수익/마이크로서비스 (Monetization, if applicable)

**Schema**
- WebPage + FAQPage (if FAQ section exists)

---

### 4.3 Timeline — `/timeline` (public marketing page)

**Primary intent:** explain timeline concept + drive usage  
**Primary keyword:** 여행 타임라인

**Title**
- 여행 타임라인 기록 - 지도 기반 여행 콘텐츠 SNS | Tourgether

**Meta description**
- 지도 기반 여행 타임라인으로 여행 일정을 시각화하고 공유하세요. 여행 동선과 순간이 하나의 이야기로 이어집니다.

**H1**
- 여행 타임라인, 진짜 여행 기록

**H2 ideas**
- 하루 단위로 이어지는 여행의 흐름
- 지도 위에 남는 이동과 머무름
- 여행 경험을 한 번에 보여주는 “타임라인 카드”

**Schema**
- WebPage + (optional) HowTo (if you add a “how to use” section)

---

### 4.4 Map — `/map` (indexable only if stable)

**Primary intent:** map-based discovery  
**Primary keyword:** 지도 기반 여행

**Title**
- 지도 기반 여행 탐색 - 여행 장소와 로컬을 한 번에 | Tourgether Map

**Meta description**
- Tourgether Map에서 여행지와 로컬 추천을 지도에서 바로 탐색하세요. 저장, 공유, 타임라인 연결까지 자연스럽게 이어집니다.

**H1**
- 지도에서 시작하는 여행 발견

**Indexing note**
- If `/map` is highly dynamic, either:
  1) keep `/map` indexable but prevent indexing of parameterized states, OR
  2) noindex `/map` and build destination landings under `/destinations/*` for SEO

---

### 4.5 Destinations hub — `/destinations`

**Primary intent:** browse by destination  
**Primary keyword:** 여행지 추천 / 지도 기반 여행

**Title**
- 여행지 탐색 - 지역별 여행 지도 & 추천 | Tourgether

**Meta description**
- 지역별 여행 지도와 추천을 한 번에 확인하세요. 인기 여행지부터 숨은 명소까지 Tourgether에서 발견하고 저장할 수 있습니다.

**H1**
- 지역별 여행 지도를 탐색하세요

**Schema**
- CollectionPage

---

### 4.6 Destination landing (template) — `/destinations/{city}`

**Example:** `/destinations/seoul`

**Primary intent:** destination SEO landing + map integration  
**Primary keyword:** {CITY} 여행 지도 / {CITY} 여행 추천 (city keyword changes per page)

**Title template**
- {CITY} 여행 지도 - 추천 코스 · 로컬 추천 · 일정 공유 | Tourgether

**Meta description template**
- {CITY} 여행을 지도에서 탐색하세요. 추천 코스, 로컬의 실제 추천, 여행 일정 공유와 타임라인 기록까지 Tourgether에서 한 번에.

**H1 template**
- {CITY} 여행을 지도에서 시작하세요

**H2 ideas**
- {CITY} 추천 코스
- 로컬이 추천하는 {CITY} 명소
- {CITY} 여행 일정 공유

**Schema**
- Place + (optional) FAQPage

---

### 4.7 Guides hub — `/guides`

**Primary intent:** local-guide marketplace / matching entry  
**Primary keyword:** 로컬 가이드

**Title**
- 로컬 가이드 찾기 - 현지 추천과 매칭 | Tourgether

**Meta description**
- 여행자와 로컬 가이드를 연결합니다. 현지 추천, 동행, 맞춤 여행 도움을 Tourgether에서 찾아보세요.

**H1**
- 로컬 가이드와 함께 더 깊은 여행

**Schema**
- CollectionPage

---

### 4.8 Guide profile (public) — `/guides/{slug}`

**Indexing policy**
- Index only if the profile has enough public content (avoid thin pages).

**Title template**
- {GUIDE_NAME} 로컬 가이드 | {CITY} 추천 · 여행 도움 | Tourgether

**Meta description template**
- {CITY} 로컬 가이드 {GUIDE_NAME}의 추천과 여행 도움을 확인하세요. 일정 제안, 동행, 현지 팁까지 Tourgether에서 연결됩니다.

**Schema**
- Person + (optional) Service

---

### 4.9 Pricing — `/pricing`

**Primary intent:** convert users  
**Primary keyword:** 여행 SNS 프리미엄

**Title**
- Tourgether 요금제 - 여행 SNS 프리미엄 기능 이용하기

**Meta description**
- Tourgether의 무료/프리미엄 요금제를 확인하세요. 여행 일정 공유, 로컬 매칭, 여행 타임라인 고급 기능을 제공합니다.

**H1**
- Tourgether 요금제

**Schema**
- WebPage

---

### 4.10 About — `/about`

**Title**
- Tourgether 소개 - 지도 기반 여행 SNS의 철학과 팀

**Meta description**
- Tourgether가 만드는 여행의 새로운 표준을 소개합니다. 지도 기반 탐색과 여행 경험 공유, 로컬 연결의 가치를 담았습니다.

---

### 4.11 Safety & Trust — `/safety`

**Title**
- Tourgether 안전 가이드 - 신뢰와 여행 커뮤니티 보호

**Meta description**
- Tourgether는 여행자와 로컬이 안전하게 연결되도록 신뢰/안전 정책을 운영합니다. 신고, 검증, 안전 가이드를 확인하세요.

**Schema**
- FAQPage (if Q/A included)

---

### 4.12 FAQ — `/faq`

**Title**
- Tourgether FAQ - 여행 타임라인 · 로컬 매칭 · 지도 기반 탐색

**Meta description**
- Tourgether 사용법과 자주 묻는 질문을 정리했습니다. 여행 타임라인, 로컬 매칭, 지도 기반 탐색 관련 내용을 빠르게 확인하세요.

**Schema**
- FAQPage (must be valid JSON-LD Q/A format)

---

## 5. Technical SEO implementation checklist (must-do)

### 5.1 Head tags (all indexable pages)
- `<title>` unique, ≤ 55–60 chars (Korean can be slightly longer but keep readable)
- `<meta name="description">` unique, 80–160 chars target
- `<link rel="canonical" href="...">`
- Open Graph:
  - `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- Twitter cards:
  - `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `meta robots` default should be index,follow for indexable pages

### 5.2 Sitemap
- `/sitemap.xml` generated at build or server runtime
- Include only canonical, indexable URLs
- Include `lastmod` for content pages
- Optional: split sitemaps if > 50k URLs (future)

### 5.3 robots.txt
- Must include:
  - `Sitemap: https://YOUR_DOMAIN/sitemap.xml`
- Disallow private paths:
  - `/settings`
  - `/account`
  - `/messages`
  - parameterized map states if they create crawl traps

### 5.4 Core Web Vitals (PWA/SPA critical)
- LCP: reduce hero image weight, preload key resources
- CLS: reserve space for images and dynamic components
- INP: avoid heavy synchronous JS on route load

### 5.5 Indexation hygiene
- Noindex thin pages (empty profiles, empty tag pages)
- Avoid duplicate content via canonical + redirects
- Add 301 redirects for old slugs when changed

---

## 6. Content cluster strategy (SEO that scales)

### 6.1 Why clusters
Tourgether’s product is naturally a “map of experiences.” SEO should mirror that:
- **Destination pages** (where)  
- **Guide pages** (who)  
- **Itinerary pages** (how)  
- **Experience pages** (what happened)

### 6.2 Core clusters & recommended landing types

#### Cluster A: Destination discovery
- `/destinations/{city}`
- `/destinations/{city}/itineraries`
- `/destinations/{city}/spots`
- Blog support:
  - `/blog/{city}-travel-map-guide`
  - `/blog/{city}-local-recommendations`

#### Cluster B: Itinerary & timeline
- `/timeline` (marketing)
- `/guides/how-to-share-travel-itinerary`
- `/guides/how-to-build-travel-timeline`
- Blog support:
  - `/blog/travel-timeline-examples`
  - `/blog/best-way-to-share-itinerary`

#### Cluster C: Local guides & matching
- `/guides`
- `/guides/{city}` (collection)
- `/guides/{slug}` (profile, if rich content)
- Blog support:
  - `/blog/how-to-find-local-guides`
  - `/blog/local-guide-safety-checklist`

#### Cluster D: Map-based travel SNS (category leadership)
- `/features/map-based-discovery`
- `/features/travel-social-network`
- Blog support:
  - `/blog/what-is-map-based-travel-sns`
  - `/blog/why-map-first-travel-apps-win`

### 6.3 Content templates (must be consistent)

#### Destination page template (minimum content)
- Intro: 120–180 words (city intent)
- “Best for” bullets (traveler types)
- 3–6 recommended routes (H2/H3)
- Map embed or screenshots (with alt text)
- FAQ section (3–6 Q/A) + FAQ schema
- Internal links to:
  - guides in that city
  - itinerary articles
  - related destinations

#### Blog template (minimum)
- H1 includes main query
- Lead paragraph answers query directly
- H2 includes sub-questions and semantic terms
- 1–2 original images (or product screenshots) with descriptive alt
- CTA linking into product flow (map, signup, timeline creation)

---

## 7. On-page writing rules (Korean-friendly SEO)

- Use a clear H1 once per page.
- H2 sections should match “search intent sub-questions.”
- Put primary keyword in:
  - Title, description, H1, first paragraph (naturally)
- Use synonyms/related phrases to avoid repetitive stuffing:
  - “지도에서 탐색”, “여행 지도를 훑다”, “동선 시각화”
- Avoid blocks of repeated keyword lists.
- Use short paragraphs and scannable bullets.
- Provide concrete “how to” steps where relevant (HowTo schema candidate).

---

## 8. Internal linking strategy (rules + examples)

### 8.1 Rules
- Every indexable page should link to:
  - at least 1 hub page (destinations/guides/features)
  - at least 1 deep page (city landing, article)
- Anchor text must describe destination page intent, not “click here.”
- Avoid repeating the same anchor text across many pages if not necessary.

### 8.2 Recommended anchor examples
- “여행 타임라인 만들기” → `/timeline`
- “서울 여행 지도에서 코스 보기” → `/destinations/seoul`
- “로컬 가이드 매칭 확인하기” → `/guides`
- “여행 일정 공유 팁” → `/guides/how-to-share-travel-itinerary`

---

## 9. Structured data (Schema / JSON-LD)

### 9.1 Must-implement schemas
- Organization (site-wide)
- WebSite (site-wide)
- FAQPage (only on pages with actual Q/A on-page)
- MobileApplication (optional)
- Article (for blog posts)

### 9.2 JSON-LD validation rules
- Schema must match visible content.
- FAQPage requires each Q/A to appear on the page.
- Do not generate fake Q/A for schema only.

---

## 10. Image SEO & Open Graph assets

### 10.1 Image naming rules
- Use kebab-case: `seoul-travel-map-tourgether.webp`
- Include destination/feature terms when relevant

### 10.2 Alt text rules
- Describe what the image shows (not just keywords)
- Prefer: “지도 기반 여행 추천 화면”
- Avoid: keyword stuffing

### 10.3 OG images
- Provide stable OG image per major page type:
  - Home OG: brand + map
  - Destination OG: city name + map silhouette
  - Blog OG: article title style
- If no dynamic OG generation, at least maintain consistent static defaults.

---

## 11. SPA/PWA SEO strategy (important)

### Option A: SSR (recommended if using Next.js)
- Use SSR for marketing pages and content hubs
- Use SSG/ISR for destinations and blog

### Option B: Prerender (if using Vite/React SPA)
- Prerender: `/`, `/features`, `/pricing`, `/about`, `/faq`, top destinations
- Keep app-only routes noindexed

### Option C: Hybrid
- Host marketing pages as static/SSR
- App map features behind login / noindex

---

## 12. Measurement setup (GSC + GA4)

### 12.1 Google Search Console
- Verify domain property (DNS)
- Submit sitemap
- Monitor: Coverage, Performance, CWV

### 12.2 GA4
Recommended events:
- `sign_up`, `login`, `map_search`, `save_place`, `create_timeline`, `publish_post`, `start_chat`, `follow_user`

---

## 13. Replit AI execution prompt (copy/paste)

```text
You are working on the Tourgether web app (map-based travel SNS).
Use the document "tourgether_SEO_upgrade.md" as the single source of truth.

Perform these tasks end-to-end:

A) Identify the routing/pages in the project.
   - List all routes/pages that are public.
   - Classify each route as INDEXABLE or NOINDEX based on the document.

B) For all INDEXABLE pages, implement:
   1) Unique <title> and <meta name="description"> following the page specs.
   2) Canonical URL tags.
   3) Open Graph tags (og:title, og:description, og:image, og:url, og:type).
   4) Twitter card tags.
   5) Correct H1/H2/H3 structure and ensure exactly one H1 per page.
   6) Internal links to hubs and related pages per the internal linking rules.

C) Technical SEO:
   1) Generate /public/sitemap.xml (or dynamic endpoint) including all canonical indexable URLs.
   2) Generate /public/robots.txt with Sitemap line and disallow private routes.
   3) Ensure parameterized map states are not indexed (robots/noindex/canonical strategy).
   4) Add JSON-LD schema (Organization + WebSite site-wide; FAQPage/Article where applicable).
   5) Ensure all images have meaningful alt text.

D) Performance:
   - Improve LCP/CLS/INP for landing pages:
     - compress hero images (prefer webp)
     - add width/height to images
     - lazy-load non-critical images
     - avoid heavy blocking JS on landing routes

E) Output:
   - Provide a report listing:
     1) Files changed
     2) What was changed and why
     3) Any remaining risks or TODOs
```

---

## 14. QA checklist before ship

### SEO correctness
- [ ] Title unique per page
- [ ] Meta description unique per page
- [ ] Canonical present & correct
- [ ] OG tags correct
- [ ] H1 exactly one per page
- [ ] Noindex applied to private/thin routes
- [ ] Sitemap valid and includes only canonical URLs
- [ ] Robots includes sitemap and blocks crawl traps
- [ ] Schema validates

### Performance
- [ ] LCP/CLS/INP improved on landing routes
- [ ] Images compressed and sized
- [ ] JS bundles reasonable

### Measurement
- [ ] GSC sitemap submitted
- [ ] GA4 events firing

---

## Appendix A. Original notes (verbatim, no omissions)

```text
1. 지금 Tourgether 코드 구조/SEO 현황 정리
프론트 구조

Vite + React SPA

client/src/main.tsx → HelmetProvider 사용

client/src/components/Seo.tsx 존재
→ <Helmet>으로 <title>, <meta>, OG, JSON-LD까지 세팅하는 공용 SEO 컴포넌트

랜딩 페이지: client/src/pages/landing.tsx

다국어: i18next + react-i18next + i18next-http-backend

번역 리소스: client/public/locales/{en,ko,ja,zh}/ui.json 등

문제 포인트

index.html 메타가 옛날 이름(TravelConnect)

meta description, og:title/description 전부 TravelConnect 기준 + 키워드도 약함.

랜딩 페이지가 Seo 컴포넌트를 안 씀

feed.tsx, profile.tsx는 <Seo> 쓰는데
정작 가장 중요한 / 랜딩은 <Seo> 없음 → 페이지별 <title>/description 없음.

다국어는 화면 텍스트만 다국어

<html lang="en">만 고정, 언어 바꿔도 lang 안 바뀜.

번역 텍스트 안에 키워드가 얕음

ko/ja/zh 에 “여행 SNS / 공유경제 / 맞춤 여행 / 현지인 / 동행 찾기” 같은 단어가 충분히 안 박혀 있음.

→ 정리하면:
인프라는 아주 잘 깔려 있는데, 마지막 10% SEO 세팅이 안 되어 있는 상태.
지금부터 그 10%를 채우는 작업만 하면 됨.

2. 언어별로 노려야 할 핵심 키워드
한국어 (ko)

투어게더, 투게더

여행 SNS, 여행 소셜, 지도 기반 여행

맞춤 여행, 커스텀 여행, 나만의 여행코스

현지인/로컬 호스트, 로컬 체험

여행 공유경제, 여행 플랫폼, 여행 동행/만남

영어 (en)

travel social network

map-based / map-based travel

local hosts, local experiences

custom trips, personalized travel

travel sharing economy / peer-to-peer travel

일본어 (ja)

旅SNS, 旅行SNS

地図ベースの旅行 / 地図で探す旅行

地元ローカル / ローカルガイド

オーダーメイド旅行 / カスタム旅行

旅シェア / シェアリングエコノミー

중국어 간체 (zh)

旅行社交平台

地图式旅行 / 地图式行程

当地向导 / 当地人

定制旅行 / 私人定制旅行

旅行共享经济 / P2P 旅行平台

이 키워드들을 **“자연스러운 문장 안에 박는 것”**이 목표야.

3. 코드 레벨 수정안 (Replit에서 바로 손대는 부분)
3-1. index.html 메타 태그 정리

파일: index.html

<head> 안을 아래처럼 정리해줘 (기존 TravelConnect 관련 메타는 다 교체):

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no"
    />

    <title>Tourgether – Map-based travel with locals | Travel sharing platform</title>

    <!-- 기본 메타 설명 (영문) -->
    <meta
      name="description"
      content="Tourgether is a map-based travel social network that connects travelers with trusted local hosts. Discover custom trips, local experiences, and safe meetups powered by the travel sharing economy."
    />

    <meta name="theme-color" content="#0f172a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />

    <!-- Open Graph -->
    <meta property="og:title" content="Tourgether – Travel with trusted locals" />
    <meta
      property="og:description"
      content="Plan custom trips, meet locals, and share your travel timeline on an interactive map. Available in Korean, English, Japanese and Chinese."
    />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/travel-og-image.jpg" />
    <meta property="og:url" content="https://tourgether.io/" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:locale:alternate" content="ko_KR" />
    <meta property="og:locale:alternate" content="ja_JP" />
    <meta property="og:locale:alternate" content="zh_CN" />

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/travel-icon.svg" />
  ...


역할:

JS 안 읽는 애들도 최소한 영어 버전 설명은 먹음.

브랜드 이름 + “travel social network / local hosts / custom trips” 키워드 박제.

3-2. 다국어에 맞춰 <html lang="…"> 자동 변경

파일: client/src/lib/i18n.ts

맨 아래 export default i18n; 바로 위에 이 코드 추가:

  });

  // ---- 여기부터 추가 ----
  if (typeof document !== 'undefined') {
    // 초기 언어 반영
    document.documentElement.lang = i18n.language || 'en';

    // 언어 변경 시 <html lang> 업데이트
    i18n.on('languageChanged', (lng) => {
      document.documentElement.lang = lng;
    });
  }
  // ---- 여기까지 추가 ----

export default i18n;


효과:

크롤러/브라우저가 페이지 언어를 정확히 인식 →
한국어 모드일 때 lang="ko", 일본어면 lang="ja"

접근성 + SEO 둘 다 플러스.

3-3. 랜딩 페이지에 <Seo> 적용 + JSON-LD

파일: client/src/pages/landing.tsx

상단 import에 Seo 추가:

import { Seo } from '@/components/Seo';


useTranslation 부분 수정:

기존:

const { t } = useTranslation(['ui']);


→ 수정:

const { t, i18n } = useTranslation(['ui']);


컴포넌트 안에서 return 위쪽에 SEO용 변수 추가:

  const seoTitle = `${t('ui:landingPage.appName')} – ${t('ui:landingPage.subtitleSeo')}`;
  const seoDesc = t('ui:landingPage.seoDescription');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Tourgether',
    alternateName: ['투어게더', 'Tourgether travel', '투게더 여행앱'],
    applicationCategory: 'TravelApplication',
    inLanguage: i18n.language,
    url: 'https://tourgether.io/',
    description: seoDesc,
  };


JSX 최상단에 <Seo> 삽입
(보통 <div className="min-h-screen ..."> 바로 안쪽 첫 줄):

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Seo
        title={seoTitle}
        desc={seoDesc}
        image={heroImage}
        url="https://tourgether.io/"
        jsonLd={jsonLd}
      />

      {/* 기존 헤더/섹션 JSX 그대로 유지 */}
      ...


효과:

/ 랜딩 페이지에 언어별 <title>/<meta>/OG/JSON-LD가 동적으로 들어감.

구글이 JS 실행할 때 “아, 이건 travel SNS + sharing economy 앱이네”라고 확실히 인지.

3-4. 랜딩 하단에 “SEO용 소개 섹션” 하나 추가

Landing JSX 맨 아래, <LoginModal /> 바로 위나 아래에
텍스트 섹션 하나만 더 넣어주면 좋아.

      {/* SEO-friendly text section */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-sm leading-relaxed text-slate-200">
        <h2 className="mb-4 text-xl font-semibold">
          {t('ui:landingPage.seoHeading')}
        </h2>
        <p className="mb-3">
          {t('ui:landingPage.seoParagraph1')}
        </p>
        <p>
          {t('ui:landingPage.seoParagraph2')}
        </p>
      </section>

      <LoginModal
        isOpen={showLoginModal}
        ...


이 섹션은 실제 랜딩 카피랑 겹치지 않고,
키워드를 쭉 풀어 쓸 수 있는 “텍스트 덩어리” 역할.

4. 번역 JSON에 넣을 실제 문장들 (ko/en/ja/zh)

파일들:

client/public/locales/en/ui.json

client/public/locales/ko/ui.json

client/public/locales/ja/ui.json

client/public/locales/zh/ui.json

각 파일의 "landingPage": { ... } 안에
아래 키 4개를 추가해줘:

"subtitleSeo": "...",
"seoDescription": "...",
"seoHeading": "...",
"seoParagraph1": "...",
"seoParagraph2": "..."

4-1. 영어(en)
"subtitleSeo": "Map-based travel social network with local hosts",
"seoDescription": "Tourgether is a map-based travel social network that connects travelers with trusted local hosts. Discover custom trips, local experiences and safe meetups powered by the travel sharing economy.",
"seoHeading": "About Tourgether",
"seoParagraph1": "Tourgether is a map-based travel platform where travelers and local hosts meet. Instead of cookie-cutter package tours, you can build your own custom trip, discover unique local experiences and share your travel timeline on an interactive map.",
"seoParagraph2": "Through a peer-to-peer travel sharing economy, solo travelers can safely meet people, book verified local guides and enjoy authentic experiences in each city. Tourgether supports English, Korean, Japanese and Chinese so global travelers can use one travel SNS anywhere in the world."

4-2. 한국어(ko)
"subtitleSeo": "여행자와 로컬을 잇는 지도 기반 여행 SNS",
"seoDescription": "투어게더는 여행자와 현지 로컬 호스트를 연결하는 지도 기반 여행 SNS이자 여행 공유경제 플랫폼입니다. 맞춤 여행, 로컬 체험, 안전한 여행 동행과 만남을 한 곳에서 해결해 보세요.",
"seoHeading": "투어게더란?",
"seoParagraph1": "투어게더는 여행자와 로컬 호스트가 지도 위에서 만나는 여행 플랫폼입니다. 정형화된 패키지 여행이 아니라, 나만의 맞춤 여행 코스를 만들고, 현지인이 추천하는 로컬 맛집과 숨은 명소를 발견하며, 여행 타임라인을 하나의 지도에 기록할 수 있습니다.",
"seoParagraph2": "여행 공유경제 모델을 통해 혼자 여행하는 사람도 안전하게 동행을 찾고, 검증된 로컬 호스트의 경험을 예약할 수 있습니다. 투어게더는 한국어·영어·일본어·중국어를 지원하는 글로벌 여행 SNS로, 어디서든 같은 계정으로 여행을 즐길 수 있습니다."

4-3. 일본어(ja)
"subtitleSeo": "旅行者とローカルをつなぐ地図ベースの旅SNS",
"seoDescription": "Tourgether（ツアゲザー）は、旅行者と地元ローカルをつなぐ地図ベースの旅行SNSです。オーダーメイド旅行やローカル体験、旅仲間とのマッチングを、旅行シェアリングエコノミーの仕組みで提供します。",
"seoHeading": "Tourgether について",
"seoParagraph1": "Tourgether は、地図上で旅を記録しながら、世界中のローカルガイドや旅行者とつながることができるプラットフォームです。画一的なパッケージツアーではなく、自分だけのカスタム旅行プランを作り、地元の人しか知らないスポットやグルメを見つけることができます。",
"seoParagraph2": "一人旅の不安を減らし、信頼できるローカルホストとの安全な出会いをサポートします。英語・韓国語・日本語・中国語に対応しているため、海外旅行でも同じ旅SNSとして Tourgether を利用できます。"

4-4. 중국어(간체, zh)
"subtitleSeo": "连接旅行者与当地人的地图式旅行社交平台",
"seoDescription": "Tourgether 是一款将旅行者与当地向导连接起来的地图式旅行社交平台。通过旅行共享经济模式，你可以找到定制旅行、当地体验、安全的结伴出行和线下见面。",
"seoHeading": "关于 Tourgether",
"seoParagraph1": "在 Tourgether 上，旅行者可以在地图上记录自己的旅程，并与全球当地向导和其他旅行者建立联系。你不再需要千篇一律的跟团游，而是可以根据自己的兴趣定制路线，发掘只有当地人才知道的美食和景点。",
"seoParagraph2": "依托点对点的旅行共享经济模式，独自旅行的人也能安全结伴，与经过验证的当地向导一起体验真实的城市生活。Tourgether 支持英语、韩语、日语和中文，是面向全球用户的旅行 SNS 平台。"

5. 한 번에 정리

Replit에서 해야 할 실제 작업을 딱 네 줄로 요약하면:

index.html 메타 태그를 Tourgether + travel SNS 키워드로 업데이트

client/src/lib/i18n.ts 에서 document.documentElement.lang 자동 변경 처리

client/src/pages/landing.tsx 에 <Seo> + JSON-LD + SEO용 text section 추가

client/public/locales/{en,ko,ja,zh}/ui.json 의 landingPage에 위 SEO 문구 키들 추가

이렇게만 해두면:

tourgether, 투어게더, 여행 SNS, 旅行SNS, 旅行社交平台, custom trip, travel sharing economy
이런 키워드들이 전부 자연스럽게 페이지 안에 녹아들고,

구글/네이버/야후 재팬/바이두 쪽에 “아, 이건 여행 공유경제 + 여행 SNS 서비스구나”라는 시그널이 들어간다.

코드 넣다가 애매한 부분(특히 landing.tsx 위치)이 헷갈리면,
그 부분만 복붙해서 보여주면 거기에 맞춰 정확히 끼워넣는 버전도 다시 짜줄게 🙌
```

---

# END OF FILE
