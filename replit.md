# Tourgether - 여행 공유경제 SNS 플랫폼

## Overview
Tourgether is a **feed-based SNS** and **sharing economy platform** centered around travel and connections. Its core identity is as an SNS, not an e-commerce platform, where everything originates from the feed. It supports a two-way sharing economy, allowing both travelers and local guides to earn money. The platform emphasizes discovery through maps for people, places, and events, and facilitates connections from online to offline via direct messages (DM). A secure contract structure ensures trust and protection for P2P transactions.

The sharing economy flow involves travelers posting requests on the feed, local guides proposing custom plans, negotiation via DM, secure contract signing (escrow), service provision (online/offline), and settlement. This enables users to earn through online services (booking, info, guiding, translation) and offline activities (transport, accommodation, adventure, shopping assistance), event hosting, or even personal shopping services.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Sharing Economy Flow**: Request posting, custom plan proposals, DM negotiation, secure escrow contracts, and settlement.
- **Service Proposal System**: Local guide plan/service registration and categorization.
- **Real-time Communication**: 3-panel chat with threaded messaging, WebSocket updates, and optimistic UI.
- **Mobile Experience**: PWA with responsive design and touch navigation.
- **Map Integration**: Custom Google Maps styling, SVG markers, interactive info windows, zoom-level clustering, POI filtering, and direct feed creation from map clicks.
- **File Upload System**: Multer-based image/video uploads with UUID naming.
- **Database Management Tool**: In-app DB admin interface (`/db-admin`) for stats, data visualization, and CRUD.
- **Dual Search Functionality**: Location (Places API) and content search.
- **Real-time Notification System**: Six types with visual indicators and location awareness.
- **AI-Powered Features**:
    - **CineMap**: AI-powered travel video storyboard generation from EXIF data using OpenAI GPT-5.1.
    - **Mini Concierge**: Location-based 1-hour activity planner with map integration using OpenAI GPT-5.1.
    - **AI Concierge**: Personalized AI travel assistant with recommendations based on user profile and recent activity using OpenAI GPT-5.1.
    - **AI Usage Limits**: Free tier and Trip Pass based usage limits for AI services and translation, managed by `checkAiUsage` middleware.
- **DM Translation**: Direct message translation with Google Translate API, caching, and language selection.
- **Unified Content Display**: Feed page and Nearby panel display posts and experiences with filter toggles.
- **Unified Map Experience**: All map functionality integrated into the home page MapComponent.
- **SEO Enhancement**: Open Graph, Twitter Card, canonical URL, and JSON-LD structured data.
- **Profile Management**: Redesigned edit modal with multi-select components for languages/interests, Google Places integration, and enhanced validation.
- **Simplified Onboarding**: Action-based role system, skippable onboarding, and optional profile setup.
- **Internationalization (i18n)**: All user-facing text is DB-driven using a `translations` table, supporting 6 languages (en, ko, ja, zh, fr, es) across 5 namespaces.
- **Dispute Management System**: P2P transaction dispute resolution with 7 types, status transitions, SLA management, and escrow integration.
- **Contract Split Payment**: Supports installment payments (deposit/milestones) for P2P contracts with payment plans (single, two-step, three-step) and partial/full refund tracking.
- **Host Settlement Batch System**: Automated daily settlement for hosts using PortOne Transfer API, with KYC verification and minimum payout conditions, managed by a cron scheduler.

### Currency System (2025-12 Update)
- **Base Currency**: USD (US Dollar) - Global platform standard
- **Pricing Tiers**: Clean USD-based pricing
  - Trip Pass: $4.99 (1-day, 3-day), $9.99 (7-day)
  - Subscriptions: Explorer $14.99/month, Voyager $29.99/month
- **Currency Support**: USD primary, KRW fallback for legacy data
- **Payment Gateway**: PortOne with KG이니시스 V2 integration
- **Price Display**: All frontend components use `Intl.NumberFormat` with `en-US` locale and `USD` currency

### PortOne Payment Integration (2025-12 Update)
- **SDK**: cdn.portone.io/v2/browser-sdk.js
- **Payment Channel**: KG이니시스 V2 (test mode)
- **CSP Configuration**: Both portone.io and iamport.co domains allowed (legacy domain support)
- **Required Fields**: Customer phone number (default: 010-0000-0000 for test)
- **API Flow**:
  1. POST /api/billing/prepare-payment → returns paymentId, storeId, channelKey
  2. PortOne.requestPayment() → opens payment popup
  3. POST /api/billing/confirm-payment → verifies payment with PortOne

### Performance Optimization (2024-12)
- **Database Indexes**: 40+ indexes added across 10 tables (posts, experiences, comments, likes, follows, notifications, timelines, trips, conversations, users) for frequently queried columns.
- **Caching Layer**: LRU cache implementation for:
    - Billing Plans: 1 hour TTL (rarely changed)
    - Trip Pass: 1 minute TTL (balance between freshness and performance)
    - AI Usage Stats: 30 seconds TTL (frequently accessed)
    - Feed Scores, Translations, Trending Hashtags: Various TTLs
- **Common Middleware**: Extracted shared validation (`validateBody`, `validateQuery`, `validateParams`) and rate limiters (`apiLimiter`, `authLimiter`, `strictLimiter`, `uploadLimiter`) for consistency and code reuse.
- **Modular Routers**: Feature-based router separation (auth, social, admin, billing, chat, contracts, experience, timeline, notification, profile, ai) from monolithic routes.ts.
- **Repository Sub-interfaces**: Domain-specific interfaces (IUserRepository, ISocialRepository, IPaymentsRepository, etc.) for focused dependency injection and easier testing.
- **Batch Processing**: Scheduled jobs with duplicate execution prevention:
    - Settlement Batch: Daily 02:00 KST, PortOne Transfer API
    - Expired Bookings: Every 5 minutes
    - Completed Experiences: Hourly
    - Slot Recalculation: Daily 03:00 KST
    - Analytics ETL: Daily sync with Star Schema (dimensions + facts)

### Security Guidelines
- Environment variables (Replit Secrets) must be used for sensitive data.
- Hardcoding of API keys, passwords, or secrets is strictly prohibited.

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication service
- **Google Maps API**: Location services and interactive maps (including Places API)
- **OpenAI API**: For AI-powered features
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