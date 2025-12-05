# Tourgether - 여행 공유경제 SNS 플랫폼

## Overview
Tourgether는 여행과 만남을 주제로 한 **피드 기반 SNS**이자 **공유경제 플랫폼**입니다. 

**핵심 정체성:**
- 🎯 **SNS가 핵심** - 이커머스가 아님, 모든 것은 피드에서 시작
- 🔄 **양방향 공유경제** - 여행자도, 로컬가이드도 누구나 돈을 벌 수 있음
- 🗺️ **지도 중심 발견** - 사람, 장소, 이벤트를 지도에서 탐색
- 💬 **DM으로 만남 연결** - 온라인에서 오프라인으로 자연스럽게 이어짐
- 🔒 **안전한 계약 구조** - P2P 거래의 신뢰와 보호

**공유경제 플로우:**
1. 여행자가 "이런 여행 하고싶어요" 요구사항을 피드에 등록
2. 로컬가이드가 맞춤 플랜을 제안
3. DM에서 협의 → 안전한 계약 체결 (에스크로)
4. 온라인/오프라인 서비스 제공 → 정산

**누구나 돈을 벌 수 있는 서비스:**
- 온라인: 예약대행, 정보제공, 가이드, 통역
- 오프라인: 차량, 숙박, 어드벤처, 쇼핑대행
- 이벤트 주최/참여
- 셀프 보따리상 (구매대행)

## User Preferences
Preferred communication style: Simple, everyday language.

---

## 🚨 개발 핵심 원칙 (모든 개발자 필독!)

### 원칙 1: SNS 정체성 유지 (절대 이커머스 아님!)

> **현재 앱의 "놀이터 같은 SNS" 분위기를 절대 잃지 마세요!**

| ✅ DO | ❌ DON'T |
|-------|----------|
| 피드에서 여행 스토리 공유 | 상품 리스팅 페이지 |
| DM으로 자연스러운 협의 | 장바구니, 결제 버튼 |
| 지도에서 사람/장소 발견 | 카테고리별 상품 목록 |
| 프로필로 연결되는 관계 | 판매자-구매자 분리 |

**체크리스트 (모든 기능 개발 시):**
- [ ] 이 기능이 피드/DM/지도에서 시작되는가?
- [ ] 사용자가 "쇼핑몰에 온 것 같다"고 느낄 수 있는가?
- [ ] 용어가 "상품/구매/주문"이 아닌 "제안/계약/서비스"인가?
- [ ] UI가 놀이터처럼 가볍고 재미있는가?

### 원칙 2: 글로벌 10억+ 사용자 확장성 (DB 기반 i18n)

> **모든 사용자 대면 텍스트는 DB 기반으로!**

| ✅ DO | ❌ DON'T |
|-------|----------|
| DB translations 테이블 사용 | 코드에 한글/영어 하드코딩 |
| translation key 사용 | 직접 문자열 입력 |
| 새 언어 추가 = DB insert만 | 새 언어 = 코드 수정 필요 |

**체크리스트 (모든 UI 개발 시):**
- [ ] 사용자에게 보이는 모든 텍스트가 t('key') 형태인가?
- [ ] 새로운 텍스트 추가 시 translations 테이블에 등록했는가?
- [ ] 6개 언어 (en, ko, ja, zh, fr, es) 번역을 모두 추가했는가?

**현재 i18n 구조:**
- 6개 언어: en, ko, ja, zh, fr, es
- 5개 네임스페이스: common, ui, validation, toast, server
- 파일 위치: `client/public/locales/{lang}/{namespace}.json`
- DB 확장: `translations` 테이블 (하이브리드 - 파일 fallback)

---

## Recent Changes

### Phase 13: Contract Split Payment System (December 5, 2025)
- **분할 결제**: P2P 계약에서 계약금/중도금/잔금 분할 결제 지원
- **결제 플랜**: single (일시불), two_step (30/70%), three_step (30/30/40%)
- **마일스톤 관리**: 각 단계별 납부 기한, 결제 상태, 자동 진행
- **부분/전체 환불**: refundedAmount, outstandingAmount 추적
- **API 엔드포인트**:
  - `POST /api/contracts/:id/split-payment`: 분할 결제 설정
  - `GET /api/contracts/:id/payment-summary`: 결제 요약 조회
  - `POST /api/escrow/:transactionId/pay`: 마일스톤 결제
  - `POST /api/escrow/:transactionId/release`: 마일스톤 릴리스
  - `POST /api/escrow/:transactionId/partial-refund`: 부분 환불
  - `POST /api/contracts/:id/full-refund`: 전체 환불
- **구현 파일**: `server/services/splitPaymentService.ts`

### Phase 12: Host Settlement Batch System (December 5, 2025)
- **호스트 정산 자동화**: 릴리스된 에스크로 트랜잭션을 매일 자동 정산
- **정산 조건**: KYC verified + 최소 10,000원 이상
- **Cron 스케줄러**: 매일 02:00 KST 자동 실행 (SETTLEMENT_ENABLED=true 필요)
- **PortOne Transfer API**: 실제 은행 이체 통합
- **Idempotency 보장**: payoutId=null인 트랜잭션만 처리, 롤백 메커니즘 포함
- **관리자 API**:
  - `GET /api/admin/settlements/status`: 스케줄러 상태 및 통계
  - `POST /api/admin/settlements/run`: 수동 정산 실행
  - `GET /api/admin/settlements`: 최근 정산 목록
  - `POST /api/admin/settlements/:id/retry`: 실패 정산 재시도
- **호스트 API**: `GET /api/host/payouts` - 본인 정산 내역 조회
- **구현 파일**: `server/services/settlementService.ts`, `server/jobs/settlementBatch.ts`

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

### Phase 5: AI Usage Limits (December 5, 2025)
- **미들웨어 구현**: `checkAiUsage` 미들웨어로 Trip Pass 및 Free tier 제한 적용
- **Free Tier 한도 (월별)**:
  - AI Messages: 5회 (AI Concierge, CineMap)
  - Translation: 10회 (DM 번역)
  - Concierge: 3회 (Mini Concierge)
- **Trip Pass 지원**: 유효기간 내 Pass 보유 시 더 높은 한도 적용
- **Admin 바이패스**: 관리자는 사용량 제한 없이 서비스 이용 가능
- **사용량 조회**: `/api/billing/usage` 엔드포인트로 현재 사용량 확인
- **402 응답**: 한도 초과 시 적절한 오류 코드와 업그레이드 제안 반환
- **Drizzle ORM 사용**: 올바른 camelCase 컬럼 참조로 사용량 증가 추적
- **상세 문서**: `docs/integrationtest.md` Phase 5 섹션 참고

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
- **SNS Core (피드 기반)**: 여행 포스트 공유, 좋아요/댓글, 위치 태깅, 타임라인, 트립 플래닝.
- **공유경제 플로우**: 여행자 요구사항 등록 → 로컬가이드 맞춤 제안 → DM 협의 → 안전 계약(에스크로) → 정산.
- **서비스 제안 시스템**: 로컬가이드의 플랜/서비스 등록, 카테고리별 분류 (투어, 음식, 액티비티, 쇼핑대행 등).
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