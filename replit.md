# Tourgether - Local Travel Experiences Platform

## Overview

Tourgether is a modern full-stack web application that connects travelers with local hosts and authentic travel experiences. The platform enables users to discover unique experiences, book activities with local hosts, share travel content, and communicate through real-time messaging.

## User Preferences

Preferred communication style: Simple, everyday language.

## Known Issues

### CRITICAL SECURITY ISSUE - API Keys Exposed (2025-01-31)
- ❌ Google OAuth keys were hardcoded in server/googleAuth.ts
- ❌ This triggered GitHub security scanner when attempting to push
- ✅ RESOLVED: Removed hardcoded keys, added proper .gitignore rules
- ✅ Created .env.example template for secure key management
- ✅ Added comprehensive SECURITY_GUIDE.md
- 🔄 NEXT STEPS: User needs to regenerate Google OAuth keys and set them in Replit Secrets

## Known Issues

### WebSocket Error (Development Environment)
- Error: "Failed to construct 'WebSocket': The URL 'wss://localhost:undefined/?token=...' is invalid"
- Cause: Vite development server HMR configuration issue
- Impact: No effect on actual app functionality, only affects development hot reload
- Status: Cannot be fixed due to restricted Vite configuration files

### Google Maps Integration Issue (RESOLVED)
- Root Cause: CSS layout constraints in mobile-container preventing proper map rendering
- Issue was height calculation and CSS positioning, not API access
- Solution: Fixed positioning with explicit dimensions for map container
- Previous API key diagnosis was incorrect - Google Maps API worked correctly

### Places API Permission Error (RESOLVED)
- Error: ApiTargetBlockedMapError - API key domain restriction issue  
- Root Cause: Google Cloud Console API key domain restrictions + API propagation delay
- Solution: API key settings propagated after time delay, no manual intervention required
- Resolution Date: January 26, 2025
- Impact: POI clicks now work with detailed place information and photos capability
- Status: Fully functional - Places API requests no longer showing REQUEST_DENIED errors

### Custom Travel Map Styling
- Implemented custom Google Maps styling with travel-focused color scheme
- Created custom SVG markers for different experience types (tour, food, activity, tip)
- Removed unnecessary POI elements and enhanced visual appeal
- Colors: Teal water (#4ECDC4), cream land (#FDF6E3), pink roads (#FFB6B9)

### Dual Search Functionality (COMPLETED - 2025-01-27)
- ✅ Location search: Places API Text Search for accurate global location searching
- ✅ Content search: User-generated posts with keyword matching in title/content/location/theme
- ✅ Toggle between search modes with visual indicators (청록색/분홍색)
- ✅ Search results with automatic map navigation to matched locations
- ✅ Fixed Geocoding API permission issues by switching to Places API

### Real-time Notification System (NEW)
- Six notification types: nearby feeds, help requests, chat messages, follows, reactions, promotions
- Visual notification bell with animated count badges
- Pulsing and bouncing animations for new notifications
- Detailed notification panel with type-based categorization
- Location-aware notifications for enhanced user experience

### Database-Map Integration (COMPLETED - 2025-01-27)
- ✅ Successfully connected posts database to Google Maps markers
- ✅ Real-time post data fetching with React Query integration
- ✅ Theme-based color coding for travel categories (맛집, 명소, 파티타임, 핫플레이스, 힐링)
- ✅ Interactive info windows showing post details on marker click
- ✅ Confirmed working with 20+ posts displayed as map markers
- ✅ User verification: "씨발 새꺄 이게 맞어 엉? 이거야?" - SUCCESS!

### Advanced Map Features (ENHANCED - 2025-01-27)
- ✅ Theme-based icon markers instead of numeric markers (🍽️ 맛집, 🎉 파티타임, 🏛️ 명소 등)
- ✅ Participation-based color intensity (more popular locations have deeper colors)
- ✅ Zoom-level responsive clustering (continent/country/city/district levels)
- ✅ POI landmark markers (경복궁, 남산타워, 홍대 등) displayed at zoom 13+
- ✅ Beautiful modal windows for both POI and user posts
- ✅ Action buttons: "추억 만들기" and "흔적 남기기"
- ✅ Smart clustering prevents infinite rendering loops
- ✅ Proper cluster size calculation based on zoom levels
- ✅ Places API integration fully functional with real POI data
- ✅ Custom map styling with natural green areas and water features
- ✅ Debugging system for marker count verification
- ✅ Feed marker sizing increased to 1.5x (36x48px) for better visibility
- ✅ Pin-shaped cluster markers for multi-feed locations (not circular)
- ✅ POI type filtering system with real-time toggle controls
- ✅ Map click functionality for direct feed creation with reverse geocoding
- ✅ Multi-feed modal with search/filter capabilities (title/content/user/date)

### File Upload/Storage System Implementation (2025-01-27 Latest)
- ✅ Complete file upload system using Multer with 50MB file size limit
- ✅ Support for images (png, jpg, jpeg, gif, webp) and videos (mp4, mov, avi, webm)
- ✅ Secure file storage in uploads/ directory with UUID-based filenames
- ✅ Static file serving from /uploads/ endpoint with proper MIME types
- ✅ Database integration storing filenames in posts table (images/videos arrays)
- ✅ Real file display in feed pages instead of placeholder images
- ✅ Error handling with fallback to placeholders when files are missing
- ✅ Frontend integration with file preview and removal capabilities
- ✅ User tested and confirmed working: "응 잘나와" - SUCCESS!

### Professional Database Management Tool (2025-01-27 Latest)
- ✅ Complete TOAD/SQLDeveloper-style DB Admin interface at `/db-admin`
- ✅ Real-time database statistics dashboard (feed count, users, timelines, themes)
- ✅ Professional grid view for data visualization
- ✅ Safe SQL query execution with security filters
- ✅ Quick query templates for common operations
- ✅ Direct access button in main interface header (opens in new tab)
- ✅ Support for all CRUD operations with error handling
- ✅ User tested and working: "완벽한 DB 관리 도구"

### Authentication System Implementation (2025-01-27 Latest)
- ✅ JWT-based email/password authentication system fully working
- ✅ User registration and login with encrypted password storage
- ✅ Real-time token validation and session management
- ✅ Professional login modal with form validation
- ✅ Logout functionality in header for authenticated users
- ✅ Landing page with clear login options for unauthenticated users
- ✅ Automatic user profile creation and management
- ✅ Zero impact on existing app functionality - all features preserved
- ✅ User tested and confirmed working: "이메일 로그인은 잘돼"
- ✅ Google OAuth implementation complete and working from the start
- ✅ Both email/password and Google OAuth authentication methods fully operational
- ✅ User successfully authenticated: mainstop6@gmail.com

### Production Deployment Ready (2025-01-27 Latest)
- ✅ Frontend build optimized: 466KB (gzip: 144KB)
- ✅ Backend bundle created: 51KB
- ✅ Environment variables configured for production
- ✅ All features tested and working in development
- ✅ Deployment documentation created (README_DEPLOYMENT.md)
- ✅ Ready for Replit Deploy button activation
- ✅ Deployed to: https://prototype-tourgether.replit.app/
- ✅ Google Console OAuth URI configured for production domain
- ✅ Production site loading correctly with login interface

### Previous Enhancements (2025-01-27 Evening)
- ✅ Fixed feed cluster markers to use proper pin shape instead of circular POI shape
- ✅ Implemented POI filtering with 6 categories: 관광명소, 맛집, 호텔, 병원, 은행, 주유소
- ✅ Added real-time POI filter updates when toggles are changed
- ✅ Enhanced multi-feed modal with comprehensive search functionality
- ✅ Resolved updatePOIs function definition error
- ✅ Confirmed backup system working (backup folder exists)
- ✅ All features tested and verified working correctly

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens and mobile-first responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket implementation for chat functionality
- **API Design**: RESTful endpoints with consistent error handling

### Data Storage
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### Authentication System
- **Provider**: Replit Auth integration for seamless user authentication
- **Session Storage**: PostgreSQL-backed session store with 7-day TTL
- **User Management**: Automatic user creation and profile management

### Experience Management
- **Categories**: Tours, food experiences, activities, and local tips
- **Booking System**: Date/time selection with participant count and pricing
- **Host Management**: User role-based hosting capabilities
- **Geographic Integration**: Location-based experience discovery

### Social Features
- **Content Sharing**: Travel posts with images and location tagging
- **Social Interactions**: Like system for community engagement
- **Trip Planning**: Personal trip organization and tracking

### Real-time Communication
- **WebSocket Server**: Integrated chat system for host-guest communication
- **Message Persistence**: Database-backed message history
- **Connection Management**: User authentication and presence tracking

### Mobile Experience
- **Progressive Web App**: Mobile-optimized interface with app-like experience
- **Touch Navigation**: Bottom navigation with gesture-friendly interactions
- **Responsive Design**: Adaptive layouts for various screen sizes

## Data Flow

### User Authentication Flow
1. User initiates login through Replit Auth
2. OpenID Connect validation and user profile creation/update
3. Session establishment with secure cookie storage
4. Client-side authentication state management via React Query

### Experience Discovery Flow
1. Frontend requests experiences with optional location/category filters
2. Backend queries database with geographic and category constraints
3. Results cached on client with automatic invalidation
4. Interactive map integration with experience markers

### Booking Process
1. User selects experience and booking parameters
2. Client validates data and submits booking request
3. Backend processes booking with host notification
4. Real-time updates through WebSocket connections

### Content Sharing Flow
1. User creates post with optional location and images
2. Content validation and storage in database
3. Social feed updates with real-time like interactions
4. Community engagement tracking and analytics

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication service integration
- **Google Maps API**: Location services and interactive maps

### Development Tools
- **Replit Vite Plugin**: Development environment integration
- **Font Awesome**: Icon library for consistent UI elements
- **Google Fonts**: Typography (Inter font family)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Class Variance Authority**: Component variant management

## Deployment Strategy

### Development Environment
- **Hot Module Replacement**: Vite dev server with instant updates
- **TypeScript Compilation**: Real-time type checking and error reporting
- **Database Migrations**: Automatic schema synchronization

### Production Build
- **Frontend**: Vite production build with code splitting and optimization
- **Backend**: esbuild compilation for Node.js deployment
- **Asset Optimization**: Static asset compression and caching
- **Environment Configuration**: Secure credential management

### Database Management
- **Schema Versioning**: Drizzle migrations for consistent deployments
- **Connection Pooling**: Automatic scaling with Neon serverless
- **Session Persistence**: Reliable user session management

The application follows modern full-stack development patterns with emphasis on type safety, real-time features, and mobile-first user experience. The architecture supports scalable growth while maintaining development simplicity through well-integrated tooling and clear separation of concerns.