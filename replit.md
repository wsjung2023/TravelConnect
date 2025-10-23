# Tourgether - Local Travel Experiences Platform

## Overview
Tourgether is a full-stack web application designed to connect travelers with local hosts and authentic travel experiences. The platform facilitates discovery of unique activities, booking with local hosts, sharing travel content, and real-time communication. Its vision is to provide a seamless and secure environment for immersive local travel, offering features like location-based experience discovery, social interaction, and robust authentication.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Map Bounds-Based Nearby Experiences Filtering (October 23, 2025)
- **Distance Calculation Utility**: Implemented Haversine formula in shared/utils.ts for accurate km-based distance calculation between coordinates
- **Bounds-Based Filtering**: Added viewport bounds-based filtering with 5km radius fallback for nearby experiences in both map.tsx and MapComponent.tsx
- **Nearby Experiences Panel**: Enhanced MapComponent.tsx bottom panel to display filtered list of nearby experiences with thumbnails, titles, and distance
- **Google Maps Loading Fix**: Improved loadGoogleMaps.ts to prevent duplicate script loading while supporting language-specific map reloads
- **i18n Expansion**: Added mapPage.noNearbyExperiences, mapPage.untitled, and mapPage.unknownLocation keys to all 6 languages
- **E2E Test Verification**: Confirmed map rendering, nearby experiences filtering, and user interactions work correctly via playwright testing

### Code Quality & SEO Enhancement (October 12, 2025)
- **SmartImage Component Fix**: Resolved onError prop destructuring bug to support exactOptionalPropertyTypes TypeScript setting
- **Rate Limiting Security**: Fixed express-rate-limit trust proxy configuration (set to 1) to prevent IP spoofing in Replit environment
- **Production Console Suppression**: Implemented Object.defineProperty-based console.log silencing for production builds
- **Comprehensive SEO Implementation**: Created Seo component with Open Graph, Twitter Card, canonical URL, and JSON-LD structured data
- **SEO Page Coverage**: Applied SEO meta tags to Map, Feed, and Profile pages in both loading and loaded states
- **TypeScript Configuration**: Fixed tsconfig.json duplicate "types" key issue, consolidated all type definitions into single array
- **E2E Test Coverage**: Verified all changes with comprehensive playwright-based end-to-end testing

### Profile Edit Enhancement (October 3, 2025)
- **Complete ProfileEditModal Redesign**: Rebuilt with proper UI controls and comprehensive i18n support
- **Multi-Select Components**: Implemented reusable MultiSelect for languages (en, ko, ja, zh, fr, es) and interests (12 predefined options)
- **Google Places Integration**: Added LocationSearchInput with autocomplete and current location detection
- **Enhanced Server Validation**: Improved /api/user/profile endpoint with detailed logging and array field validation
- **Shared Constants**: Extracted INTEREST_OPTIONS and LANGUAGE_OPTIONS to shared/constants.ts for reusability
- **Full Internationalization**: All profile edit labels, placeholders, and buttons translated to 6 languages

### Onboarding Simplification (October 1, 2025)
- **Simplified Onboarding Flow**: Removed userType selection step - all users start as 'traveler' by default
- **Action-based Role System**: Users automatically become providers when creating services/slots
- **Skippable Onboarding**: Added skip button for quick access - onboarding can be completed later
- **Optional Profile Setup**: Interest and language selection made optional with sensible defaults
- **API Enhancement**: /api/auth/me now returns onboardingCompleted, userType, interests, languages, and timezone fields

### Phase B - Code Quality Improvements (September 21, 2025)
- **Thread Real-time Updates**: Implemented WebSocket-based real-time synchronization for threaded comments with optimistic UI updates
- **Responsive Enhancement**: Added useMediaQuery hook for real-time window resize detection and responsive behavior
- **UX Improvements**: Added comprehensive loading/error states across all major components (ChannelList, EnhancedChatWindow, ThreadPanel)
- **WebSocket Stability**: Enhanced connection reliability with heartbeat mechanism, exponential backoff reconnection, and improved error handling
- **Cache Synchronization**: Improved DM message handling to properly sync conversation list with last message updates and unread status

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
- **Real-time Communication**: Enhanced 3-panel chat system (Slack/Discord style) with threaded messaging, real-time WebSocket updates, heartbeat mechanism for stable connections, and optimistic UI updates.
- **Mobile Experience**: Progressive Web App (PWA) with responsive design, touch navigation, and real-time responsive behavior using useMediaQuery hook for window resize detection.
- **Map Integration**: Custom Google Maps styling, SVG markers, theme-based color coding, interactive info windows, zoom-level responsive clustering, POI filtering, and direct feed creation from map clicks.
- **File Upload System**: Multer-based file uploads (images/videos) with UUID-based naming, static file serving, and database integration.
- **Database Management Tool**: In-app DB admin interface (`/db-admin`) for real-time statistics, grid view data visualization, safe SQL query execution, and CRUD operations.
- **Dual Search Functionality**: Location search using Places API and content search for user-generated posts.
- **Real-time Notification System**: Six notification types with visual indicators and location-aware delivery.

### Security Guidelines
- Environment variables must be used for sensitive data (e.g., `process.env.API_KEY`).
- Replit Secrets should store sensitive data.
- Hardcoding of API keys, passwords, or secrets is strictly prohibited. User approval is required for any hardcoded value.

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication service
- **Google Maps API**: Location services and interactive maps (including Places API)

### Development Tools
- **Replit Vite Plugin**: Development environment integration
- **Font Awesome**: Icon library
- **Google Fonts**: Typography (Inter font family)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Class Variance Authority**: Component variant management