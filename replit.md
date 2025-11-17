# Tourgether - Local Travel Experiences Platform

## Overview
Tourgether is a full-stack web application designed to connect travelers with local hosts and authentic travel experiences. The platform facilitates discovery of unique activities, booking with local hosts, sharing travel content, and real-time communication. Its vision is to provide a seamless and secure environment for immersive local travel, offering features like location-based experience discovery, social interaction, and robust authentication.

## User Preferences
Preferred communication style: Simple, everyday language.

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