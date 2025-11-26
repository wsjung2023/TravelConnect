# Tourgether - Local Travel Experiences Platform

## Overview
Tourgether is a full-stack web application designed to connect travelers with local hosts and authentic travel experiences. The platform facilitates discovery of unique activities, booking with local hosts, sharing travel content, and real-time communication. Its vision is to provide a seamless and secure environment for immersive local travel, offering features like location-based experience discovery, social interaction, and robust authentication.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Performance Optimization (November 26, 2025)
- **N+1 쿼리 문제 해결**: Smart/Popular 피드의 200+ 쿼리를 3개 배치 쿼리로 최적화
- **성능 향상**: Smart Feed 4.7초 → 0.28초 (94% 향상, 목표 40% 초과 달성)
- **새 서비스 모듈**:
  - `server/services/cache.ts`: LRU 캐시 서비스
  - `server/services/feedScoringService.ts`: 7-factor 점수 계산 서비스
  - `client/src/hooks/useFeedController.ts`: 피드 상태 관리 훅
- **프론트엔드 최적화**: 가상화 기본 활성화, 임계값 50→20 조정
- **상세 문서**: `docs/PERFORMANCE_TEST_PLAN.md` 참고

### DB-Based POI Filter System (November 26, 2025)
- **하드코딩 제거**: 기존 하드코딩된 POI 필터를 완전한 DB 기반 아키텍처로 마이그레이션
- **새 DB 스키마**: poi_categories, poi_types, poi_category_translations, poi_type_translations 테이블 추가
- **다국어 지원**: 6개 언어 (en, ko, ja, zh, fr, es) POI 카테고리/타입 번역 지원
- **9개 POI 카테고리**: food_drink, lodging, culture, shopping, transport, nature, utilities, open_to_meet, serendipity
- **27개 POI 타입**: 각 카테고리별 세부 타입 (restaurant, cafe, museum, park 등)
- **그룹핑 UI**: 2-level 확장/축소 가능한 필터 인터페이스
- **API 엔드포인트**: GET /api/poi/categories?lang={lang}, POST /api/poi/seed

### AI Model Configuration Enhancement (November 17, 2025)
- **환경 변수 기반 AI 모델 선택**: 관리자가 비용 절감을 위해 AI 모델을 동적으로 변경할 수 있도록 개선
- **서비스별 개별 설정 지원**: CineMap, Mini Concierge, AI Concierge 각각 다른 모델 사용 가능
- **우선순위 시스템**:
  1. 서비스별 환경 변수 (예: `CINEMAP_AI_MODEL`)
  2. 공통 환경 변수 (`AI_MODEL`)
  3. 기본값 (`gpt-5.1-chat-latest`)
- **비용 최적화 옵션**:
  - `AI_MODEL=gpt-5-mini` 설정 시 모든 AI 서비스가 저렴한 모델 사용
  - 서비스별 차등 적용 가능 (CineMap은 프리미엄, 나머지는 미니 모델)
- **상세 문서**: `docs/AI_MODEL_CONFIGURATION.md` 참고

### GPT-5.1 Upgrade (November 17, 2025)
- **모델 업그레이드**: 모든 AI 서비스를 `gpt-4o-mini`에서 `gpt-5.1-chat-latest`로 업그레이드
- **성능 향상**: 더 자연스러운 대화, 향상된 추론 능력, 2-3배 빠른 속도
- **비용 효율**: GPT-5 대비 토큰 사용량 50% 절감

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom design tokens and mobile-first responsive design
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect integration, JWT-based email/password authentication
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket implementation for chat
- **API Design**: RESTful endpoints

### Data Storage
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe operations
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless connection pooling

### Core Features
- **Authentication System**: Replit Auth and JWT-based email/password, secure session management, automatic user profile creation.
- **Experience Management**: Categorized experiences (tours, food, activities, tips), booking system, host management, geographic discovery.
- **Social Features**: Content sharing with location tagging, like system, trip planning.
- **Real-time Communication**: Enhanced 3-panel chat system with threaded messaging, real-time WebSocket updates, heartbeat mechanism, and optimistic UI updates.
- **Mobile Experience**: Progressive Web App (PWA) with responsive design, touch navigation, and real-time responsive behavior.
- **Map Integration**: Custom Google Maps styling, SVG markers, theme-based color coding, interactive info windows, zoom-level responsive clustering, POI filtering, and direct feed creation from map clicks.
- **File Upload System**: Multer-based file uploads (images/videos) with UUID-based naming, static file serving, and database integration.
- **Database Management Tool**: In-app DB admin interface (`/db-admin`) for real-time statistics, grid view data visualization, safe SQL query execution, and CRUD operations.
- **Dual Search Functionality**: Location search using Places API and content search for user-generated posts.
- **Real-time Notification System**: Six notification types with visual indicators and location-aware delivery.
- **AI-Powered Features**:
    - **CineMap**: AI-powered travel video storyboard generation from EXIF-tagged photos, creating cinematic journey narratives using OpenAI GPT-5.1 (gpt-5.1-chat-latest).
    - **Mini Concierge**: Location-based 1-hour activity planner generating 3 structured plan cards with map integration and check-in functionality using OpenAI GPT-5.1 (gpt-5.1-chat-latest).
    - **AI Concierge**: Fully functional AI travel assistant with personalized recommendations based on user profile, nearby experiences, recent posts, and upcoming slots, using OpenAI GPT-5.1 (gpt-5.1-chat-latest).
- **DM Translation**: Direct message translation with Google Translate API integration, caching, and user-selectable preferred languages.
- **Unified Content Display**: Feed page and Nearby panel display both posts and experiences with filter toggles (All/Posts/Experiences).
- **Unified Map Experience**: All map functionality integrated into the home page MapComponent with a collapsible Nearby Experiences panel.
- **SEO Enhancement**: Comprehensive SEO implementation with Open Graph, Twitter Card, canonical URL, and JSON-LD structured data on key pages.
- **Profile Management**: Redesigned profile edit modal with multi-select components for languages and interests, Google Places integration for location, and enhanced server validation.
- **Simplified Onboarding**: Removed userType selection, action-based role system, skippable onboarding, and optional profile setup.

### Security Guidelines
- Environment variables must be used for sensitive data (e.g., `process.env.API_KEY`).
- Replit Secrets should store sensitive data.
- Hardcoding of API keys, passwords, or secrets is strictly prohibited. User approval is required for any hardcoded value.

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication service
- **Google Maps API**: Location services and interactive maps (including Places API)
- **OpenAI API**: For AI-powered features (CineMap, Mini Concierge, AI Concierge)
- **Google Translate API**: For DM translation

### Development Tools
- **Replit Vite Plugin**: Development environment integration
- **Font Awesome**: Icon library
- **Google Fonts**: Typography (Inter font family)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Class Variance Authority**: Component variant management