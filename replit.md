# Tourgether - ì¬í ê³µì ê²½ì  SNS íë«í¼

## Overview
Tourgether is a feed-based social networking service (SNS) and sharing economy platform focused on travel. It enables a two-way sharing economy where both travelers and local guides can earn through online and offline services. The platform emphasizes discovery via interactive maps for people, places, and events, facilitating connections from online interactions to offline experiences. A secure contract structure with escrow ensures trust and protection for P2P transactions.

The sharing economy flow involves travelers posting requests, local guides proposing custom plans, negotiation via direct messages, secure contract signing, service provision, and settlement. This allows users to earn by offering services such as online bookings, information, guiding, translation, or offline activities like transport, accommodation, adventure, shopping assistance, event hosting, or personal shopping.

## User Preferences
Preferred communication style: Simple, everyday language.
New features must be explained and approved before implementation.
When adding, changing, or fixing features, existing successful functionalities must not be broken.
New screens must be accessible via buttons, not direct URL input.
All text (buttons, labels, messages) must be implemented using i18n from the `translations` database table.
Master data must be stored in the database, not hardcoded.
Translation data must be managed in the database (`translations` table), not hardcoded in the frontend.

## Guardrails (AI Agent ê°ì  ê·ì¹ â ë§¤ ì¸ì ë°ëì ì¤ì)
- **íì¼ í¬ê¸°**: íì¼ì´ 250ì¤ ì´ê³¼ ì ë¶ë¦¬ ê²í , 400ì¤ ì´ê³¼ ì ë°ëì ë¶ë¦¬. `server/routes.ts`ë íì¬ ë ê±°ì ê±°ë íì¼ì´ë¯ë¡ ì ìëí¬ì¸í¸ë ì ë ì¶ê°íì§ ë§ê³  `server/routes/` íì ëª¨ëë¡ ë§ë ë¤.
- **ì ê· íì¼**: ëª¨ë  ì íì¼ ìë¨ì 1ì¤ ì¤ëª ì£¼ì íì (`// ì´ íì¼ì ì­í `).
- **ê²ì¦ íì**: ì½ë ë³ê²½ í ë°ëì ìë² ì¤í íì¸. ì¤ííì§ ìì ì½ëë¥¼ "ìë£"ë¼ê³  ë³´ê³  ê¸ì§.
- **ë²ì ìµìí**: íì©ë íì¼ ì¸ ìì  ê¸ì§. í¬ë§·í/ë¦¬í©í ë§ ë± ìì²­ ì¸ ìì ê¸ì§.
- **ì¶ì¸¡ ê¸ì§**: ë¡ê·¸ íì¸ ìì´ ìì¸ ë¨ì  ê¸ì§. ë¶íì¤íë©´ ìì íì§ ë§ê³  ì§ë¬¸íë¤.
- **ëê·ëª¨ ë³ê²½ ê¸ì§**: ì¬ì©ì íì¸ ìì´ íì¼ ëë ìì±/ì­ì  ê¸ì§. ê¸°ì¡´ êµ¬ì¡° ë¬´ìí ë¦¬í©í ë§ ê¸ì§.
- **ë©ëª¨ ì ì§**: ì¤ìí ê²°ì /ë°ê²¬ì `docs/AI_MEMO.md`ì ì¦ì ê¸°ë¡.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS (custom design tokens, mobile-first responsive design)
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth (OpenID Connect) and JWT-based email/password
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket implementation for chat
- **API Design**: RESTful

### Data Storage
- **Primary Database**: PostgreSQL (Neon serverless hosting)
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **File Storage**: Replit Object Storage (GCS) via `server/services/objectStorageService.ts`. All user file uploads go to `public/uploads/{uuid}.ext` in the Object Storage bucket. The `POST /api/upload` endpoint uses multer memoryStorage + Object Storage PUT. The `GET /api/files/:filename` endpoint generates a signed URL and redirects (302) to GCS. The `uploads/` local folder is empty and gitignored. Migration script: `scripts/migrate-uploads.mjs`.
- **Connection Pooling**: Neon serverless connection pooling

### Core Features
- **SNS Core**: Feed-based travel post sharing, likes/comments, location tagging, timeline, trip planning.
- **Nested Comments & Offer System**: Threaded reply comments with `parentId` for conversation flow. Offer comments allow verified guides to propose services (price, description, duration) directly on posts, with visual card distinction and DM/contract integration upon acceptance.
- **Sharing Economy Flow**: Request posting, custom plan proposals, DM negotiation, secure escrow contracts, and settlement.
- **Real-time Communication**: 3-panel chat with threaded messaging, WebSocket updates, and optimistic UI.
- **Mobile Experience**: PWA with responsive design and touch navigation.
- **Map Integration**: Custom Google Maps styling, SVG markers, interactive info windows, zoom-level clustering, POI filtering, and direct feed creation from map clicks.
- **AI-Powered Features**: CineMap (travel video storyboard), Mini Concierge (1-hour activity planner), AI Concierge (personalized travel assistant) using OpenAI GPT-5.1, with usage limits.
- **DM Translation**: Direct message translation with Google Translate API, caching, and language selection.
- **Unified Content Display**: Feed page and Nearby panel displaying posts and experiences with filter toggles.
- **Unified Map Experience**: All map functionality integrated into the home page MapComponent.
- **SEO Enhancement**: Ten public SEO landing pages targeting specific user segments:
  - Original 6: `/travel-itinerary`, `/map-travel`, `/travel-timeline`, `/local-tips`, `/travel-mate`, `/safety`
  - Monetization 4: `/become-guide` (local guide signup), `/earn-travel` (travel income), `/travel-creator` (content creator), `/travel-friends` (travel connections)
  - All pages include `SeoHead` (react-helmet-async), `SeoFooter`, JSON-LD schemas (FAQPage), meta tags, Open Graph & Twitter Cards, AI-generated hero images, i18n support, sitemap, and robots.txt.
- **Profile Management**: Redesigned edit modal with multi-select for languages/interests, Google Places integration, and enhanced validation.
- **Simplified Onboarding**: Action-based role system, skippable onboarding, and optional profile setup.
- **Internationalization (i18n)**: All user-facing text is DB-driven using a `translations` table, supporting 6 languages (en, ko, ja, zh, fr, es) across 5 namespaces (ui, toast, validation, billing, seo). ~10,075 entries total. Dev DB and production DB are fully synchronized as of 2026-03-21.
- **Dispute Management System**: P2P transaction dispute resolution with 7 types, status transitions, SLA management, and escrow integration.
- **Contract Split Payment**: Supports installment payments (deposit/milestones) for P2P contracts with payment plans and partial/full refund tracking.
- **Host Settlement Batch System**: Automated daily settlement for hosts using PortOne Transfer API, with KYC verification and minimum payout conditions, managed by a cron scheduler.
- **Currency System**: Base currency USD, pricing tiers in USD, with PortOne/KGì´ëìì¤ V2 payment gateway integration. Frontend displays prices using `Intl.NumberFormat` with `en-US` locale and `USD` currency.
- **Performance Optimization**: Database indexes (40+ across 10 tables), LRU caching for billing plans, Trip Pass, AI usage stats, feed scores, translations, and trending hashtags. Modular routers and repository sub-interfaces for better code organization. Batch processing for settlements, expired bookings, completed experiences, slot recalculation, and analytics ETL.
- **DB-Driven System Configuration**: Zero hardcoded values - all configuration (106 entries across 12 categories: payment, ai, rate_limit, distance, cache, pagination, user_experience, file, i18n, comment, geo, host_plan, scheduler) stored in `system_config` table with LRU caching (5min TTL) via `configService.ts`. Admin UI for CRUD operations with search, category filtering, and validation.
- **Scheduler Management**: All 4 batch schedulers (expired bookings, completed experiences, slot recalculation, settlement batch) are DB-driven with ON/OFF toggle and configurable intervals via `system_config` table (category: `scheduler`). Default is OFF. Admin controls via SystemConfigManager UI. Scheduler state managed in `server/index.ts` with exported handles for API access.
- **AI Prompt Template Management**: `ai_prompt_templates` table for managing AI prompts (CineMap, Concierge, Mini Concierge, Translation) with version control, locale support (en/ko/ja/zh/fr/es/de), model configuration (temperature, max_tokens, top_p), and admin UI for template editing.
- **Config Audit Logging**: `config_audit_logs` table tracks all system configuration changes with before/after values for compliance and debugging.
- **User Analytics Schema**: `user_sessions`, `user_events`, `user_daily_metrics`, `platform_daily_metrics` tables for comprehensive user behavior tracking and analytics.

## i18n 번역 운영 절차 (AI 에이전트 필독)

### 구조 개요
- 번역 소스: `server/seeds/seed-translations.json` (10,075개 항목)
- DB 테이블: `translations` (locale, namespace, key, value)
- 동기화 로직: `server/seeds/syncTranslations.ts` (SHA256 해시 체크)
- 운영 환경 기본값: `STARTUP_SYNC_MODE` 없으면 `'off'` → 서버 시작해도 시드 실행 안 함
- 개발 환경 기본값: `STARTUP_SYNC_MODE` 없으면 `'safe'` → 서버 시작 시 해시 체크 후 필요 시 upsert

### 번역 추가/수정 절차

**소규모 (키 몇 개 추가):**
1. `seed-translations.json` 수정 또는 `node scripts/i18n-sync.mjs` 실행
2. 서버 재시작 → 개발 DB 자동 반영
3. 운영 반영: `POST /api/admin/i18n/sync` 호출 (관리자 계정 필요, 배포 불필요)

**대규모 (seed 파일 대폭 변경):**
1. `seed-translations.json` 수정
2. Replit 운영 환경변수에 `STARTUP_SYNC_MODE=safe` 설정
3. 배포 → 서버 기동 시 자동 upsert 실행
4. 완료 후 `STARTUP_SYNC_MODE` 환경변수 삭제 (중요: 방치하면 매 배포마다 DB 쿼리 발생)

### 환경변수 설정 방법
```javascript
// Replit 운영 환경에 설정
await setEnvVars({ values: { "STARTUP_SYNC_MODE": "safe" }, environment: "production" });
// 완료 후 삭제
await deleteEnvVars({ keys: ["STARTUP_SYNC_MODE"], environment: "production" });
```

### SHA256 해시 체크 메커니즘
- seed 파일 SHA256 → `system_config` 테이블 (`i18n.seed_hash` 키)에 저장
- 해시 일치 시: DB 쿼리 1건으로 즉시 종료 (비용 없음)
- 해시 불일치 시: 전체 upsert 실행 (신규 키만 추가, 기존 번역 덮어쓰기 안 함)

### 누락 키 감지
- 개발 서버 시작 시 `server/startup/auditI18nKeys.ts`가 자동 스캔
- `[i18n Audit] ⚠️ N개 번역 누락 키 발견` 경고 → `node scripts/i18n-sync.mjs` 실행

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication service
- **Google Maps API**: Location services and interactive maps (including Places API)
- **OpenAI API**: For AI-powered features (CineMap, Mini Concierge, AI Concierge)
- **Google Translate API**: For DM translation
- **PortOne Transfer API**: For host settlements

### Development Tools
- **Replit Vite Plugin**: Development environment integration
- **Font Awesome**: Icon library
- **Google Fonts**: Typography (Inter font family)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Class Variance Authority**: Component variant management