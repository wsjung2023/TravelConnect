# Tourgether - 여행 공유경제 SNS 플랫폼

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
- **Internationalization (i18n)**: All user-facing text is DB-driven using a `translations` table, supporting 6 languages (en, ko, ja, zh, fr, es) across 5 namespaces.
- **Dispute Management System**: P2P transaction dispute resolution with 7 types, status transitions, SLA management, and escrow integration.
- **Contract Split Payment**: Supports installment payments (deposit/milestones) for P2P contracts with payment plans and partial/full refund tracking.
- **Host Settlement Batch System**: Automated daily settlement for hosts using PortOne Transfer API, with KYC verification and minimum payout conditions, managed by a cron scheduler.
- **Currency System**: Base currency USD, pricing tiers in USD, with PortOne/KG이니시스 V2 payment gateway integration. Frontend displays prices using `Intl.NumberFormat` with `en-US` locale and `USD` currency.
- **Performance Optimization**: Database indexes (40+ across 10 tables), LRU caching for billing plans, Trip Pass, AI usage stats, feed scores, translations, and trending hashtags. Modular routers and repository sub-interfaces for better code organization. Batch processing for settlements, expired bookings, completed experiences, slot recalculation, and analytics ETL.
- **DB-Driven System Configuration**: Zero hardcoded values - all configuration (106 entries across 12 categories: payment, ai, rate_limit, distance, cache, pagination, user_experience, file, i18n, comment, geo, host_plan, scheduler) stored in `system_config` table with LRU caching (5min TTL) via `configService.ts`. Admin UI for CRUD operations with search, category filtering, and validation.
- **Scheduler Management**: All 4 batch schedulers (expired bookings, completed experiences, slot recalculation, settlement batch) are DB-driven with ON/OFF toggle and configurable intervals via `system_config` table (category: `scheduler`). Default is OFF. Admin controls via SystemConfigManager UI. Scheduler state managed in `server/index.ts` with exported handles for API access.
- **AI Prompt Template Management**: `ai_prompt_templates` table for managing AI prompts (CineMap, Concierge, Mini Concierge, Translation) with version control, locale support (en/ko/ja/zh/fr/es/de), model configuration (temperature, max_tokens, top_p), and admin UI for template editing.
- **Config Audit Logging**: `config_audit_logs` table tracks all system configuration changes with before/after values for compliance and debugging.
- **User Analytics Schema**: `user_sessions`, `user_events`, `user_daily_metrics`, `platform_daily_metrics` tables for comprehensive user behavior tracking and analytics.

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