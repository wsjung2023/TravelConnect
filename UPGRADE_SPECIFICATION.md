# Tourgether Platform Upgrade Specification

## 🎯 Overview
This document outlines the comprehensive upgrade plan for Tourgether platform to support three distinct user types with specialized features while maintaining existing functionality.

## 📊 Target User Groups

### A. Travelers (Timeline & Request Focused)
- **Goal**: Quick trip planning and instant local help
- **Key Features**: 1-minute onboarding, help requests, safety badges

### B. Influencers (Monetization & Service Templates)
- **Goal**: Structured service offerings and revenue streams
- **Key Features**: Service templates, package deals, portfolio profiles

### C. Local Guides/Hosts (Slot Management & Trust)
- **Goal**: Professional service management and trust building
- **Key Features**: Slot scheduling, integrated booking management, trust levels

## 🗄️ Database Schema Extensions

### New Tables

#### 1. Purchase Requests (여행자 도움 요청)
```sql
CREATE TABLE purchase_requests (
  id SERIAL PRIMARY KEY,
  requester_id VARCHAR NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'local_tip', 'custom_planning', 'urgent_help', 'product_purchase'
  location VARCHAR(200),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'KRW',
  deadline TIMESTAMP,
  urgency_level VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'normal', 'flexible'
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'assigned', 'completed', 'cancelled'
  response_count INTEGER DEFAULT 0,
  preferred_language VARCHAR(10) DEFAULT 'ko',
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Request Responses (요청 답변/오퍼)
```sql
CREATE TABLE request_responses (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES purchase_requests(id),
  responder_id VARCHAR NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  offered_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'KRW',
  estimated_completion_time VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'withdrawn'
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Service Templates (인플루언서 템플릿)
```sql
CREATE TABLE service_templates (
  id SERIAL PRIMARY KEY,
  creator_id VARCHAR NOT NULL REFERENCES users(id),
  template_type VARCHAR(50) NOT NULL, -- 'custom_planning', 'food_list', 'photo_companion', 'translation', 'shopping_guide'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  duration_hours INTEGER,
  max_participants INTEGER DEFAULT 1,
  includes TEXT[],
  requirements TEXT[],
  sample_deliverables TEXT[],
  is_active BOOLEAN DEFAULT true,
  order_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Service Packages (번들 상품)
```sql
CREATE TABLE service_packages (
  id SERIAL PRIMARY KEY,
  creator_id VARCHAR NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  discount_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Package Items (번들 구성 요소)
```sql
CREATE TABLE package_items (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES service_packages(id),
  item_type VARCHAR(20) NOT NULL, -- 'experience', 'template'
  item_id INTEGER NOT NULL, -- references experiences.id or service_templates.id
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. User Trust Levels (신뢰도 시스템)
```sql
CREATE TABLE user_trust_levels (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  trust_level INTEGER DEFAULT 1, -- 1-5 신뢰 단계
  total_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0, -- 완료율 %
  average_rating DECIMAL(3,2) DEFAULT 0,
  kyc_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  id_verified BOOLEAN DEFAULT false,
  last_active_at TIMESTAMP DEFAULT NOW(),
  trust_score INTEGER DEFAULT 0, -- 종합 신뢰 점수
  badges TEXT[], -- ['verified_host', 'quick_responder', 'top_rated']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. Dispute Cases (분쟁 관리)
```sql
CREATE TABLE dispute_cases (
  id SERIAL PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE NOT NULL,
  complainant_id VARCHAR NOT NULL REFERENCES users(id),
  respondent_id VARCHAR NOT NULL REFERENCES users(id),
  related_booking_id INTEGER REFERENCES bookings(id),
  related_request_id INTEGER REFERENCES purchase_requests(id),
  dispute_type VARCHAR(50) NOT NULL, -- 'payment', 'service_quality', 'no_show', 'refund', 'communication'
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  evidence_files TEXT[],
  status VARCHAR(30) DEFAULT 'open', -- 'open', 'under_review', 'resolved', 'escalated', 'closed'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_admin_id VARCHAR REFERENCES users(id),
  resolution_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### 8. Onboarding Progress (온보딩 진행상황)
```sql
CREATE TABLE onboarding_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  completed_steps TEXT[] DEFAULT '{}',
  current_step VARCHAR(50) DEFAULT 'welcome',
  user_type VARCHAR(20), -- 'traveler', 'influencer', 'host'
  interests TEXT[],
  preferred_destinations TEXT[],
  travel_style VARCHAR(50),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Existing Table Extensions

#### Users Table Extensions
```sql
-- Add new columns to existing users table
ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'traveler'; -- 'traveler', 'influencer', 'host'
ALTER TABLE users ADD COLUMN interests TEXT[];
ALTER TABLE users ADD COLUMN languages TEXT[] DEFAULT '{"ko"}';
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Seoul';
ALTER TABLE users ADD COLUMN public_profile_url VARCHAR(200); -- link-in-bio URL
ALTER TABLE users ADD COLUMN portfolio_mode BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
```

#### Experiences Table Extensions
```sql
-- Add template support to experiences
ALTER TABLE experiences ADD COLUMN template_type VARCHAR(50); -- 'custom_planning', 'food_guide', 'photo_companion'
ALTER TABLE experiences ADD COLUMN is_template BOOLEAN DEFAULT false;
ALTER TABLE experiences ADD COLUMN delivery_method VARCHAR(30) DEFAULT 'in_person'; -- 'in_person', 'digital', 'hybrid'
ALTER TABLE experiences ADD COLUMN quick_book_enabled BOOLEAN DEFAULT true;
```

#### Reviews Table Extensions
```sql
-- Add weighted review system
ALTER TABLE reviews ADD COLUMN verified_booking BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN weight_factor DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE reviews ADD COLUMN helpfulness_score INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN response_from_host TEXT;
```

## 🎨 User Interface & Experience Design

### A. Traveler Features

#### 1. 1-Minute Onboarding
- **Step 1**: Travel destination selector with autocomplete
- **Step 2**: Trip duration with preset options (Weekend/Week/Extended)
- **Step 3**: Interest tags with visual selection (Food/Culture/Adventure/Shopping/etc.)
- **Result**: Personalized feed and recommendations

#### 2. Quick Help Request System
- **Map Integration**: "Need Help" floating button on map
- **Categories**: Local tips, Emergency help, Custom planning, Product purchase
- **Quick Templates**: Pre-filled forms for common requests
- **Safety Features**: Emergency contact integration, location sharing

#### 3. Enhanced Timeline Creation
- **Simplified Mode**: Duration presets + interest tags
- **Smart Suggestions**: Auto-populate based on destination and interests
- **Collaborative Planning**: Share and co-edit with travel companions

### B. Influencer Features

#### 1. Service Template System
- **Template Builder**: Drag-and-drop service creation
- **Preset Categories**: 
  - "맞춤 코스 짜드려요" (Custom Itinerary Planning)
  - "먹킷리스트" (Food Bucket List)
  - "촬영 동행" (Photo Companion)
- **Pricing Calculator**: Dynamic pricing based on complexity
- **Portfolio Integration**: Showcase past work and testimonials

#### 2. Package & Bundle System
- **Bundle Creator**: Combine 3+ individual services
- **Discount Engine**: Automatic percentage calculations
- **Shopping Cart**: Multi-item booking with single checkout
- **Upselling**: Suggest complementary services

#### 3. Public Portfolio Mode
- **Link-in-Bio**: Shareable profile URL
- **Portfolio View**: Timeline as public showcase
- **External Traffic**: Track referrals and conversions
- **Brand Customization**: Custom colors and layouts

### C. Host/Guide Features

#### 1. Advanced Slot Management
- **Quick Slot Creator**: Drag-to-create time blocks
- **Recurring Rules**: Weekly/monthly patterns
- **Dynamic Pricing**: Peak/off-peak pricing
- **Bulk Operations**: Multi-select slot management

#### 2. Integrated Booking Dashboard
- **Unified View**: Bookings + Messages in single interface
- **Auto-Channel Creation**: Booking confirmation → dedicated chat thread
- **Checklist Builder**: Custom pre-arrival instructions
- **Smart Notifications**: Context-aware alerts

#### 3. Trust Level System
- **Progressive Badges**: 5-tier trust system with visual indicators
- **KYC Integration**: Identity verification flow
- **Performance Metrics**: Real-time stats dashboard
- **Listing Boost**: Higher trust = better visibility

## 🔧 API Endpoints Design

### Traveler Endpoints
```
POST   /api/onboarding/complete
GET    /api/requests/my
POST   /api/requests/create
GET    /api/requests/:id/responses
POST   /api/requests/:id/accept-response
```

### Influencer Endpoints
```
POST   /api/templates/create
GET    /api/templates/my
POST   /api/packages/create
GET    /api/packages/my
PUT    /api/profile/portfolio-mode
```

### Host/Guide Endpoints
```
POST   /api/slots/bulk-create
GET    /api/slots/my
PUT    /api/slots/:id
POST   /api/trust/verify-kyc
GET    /api/trust/my-level
```

### Admin Endpoints
```
GET    /api/admin/disputes
POST   /api/admin/disputes/:id/resolve
GET    /api/admin/trust-levels
GET    /api/admin/system-health
```

## 🚀 Implementation Phases

### Phase 1: Foundation (Current)
- [ ] Create upgrade specification document
- [ ] Extend database schema
- [ ] Update existing API endpoints for compatibility

### Phase 2: Traveler Features
- [ ] 1-minute onboarding flow
- [ ] Help request system
- [ ] Enhanced timeline creation
- [ ] Safety features integration

### Phase 3: Influencer Features
- [ ] Service template builder
- [ ] Package creation system
- [ ] Portfolio mode
- [ ] Revenue analytics

### Phase 4: Host/Guide Features
- [ ] Advanced slot management
- [ ] Trust level system
- [ ] Integrated dashboard
- [ ] KYC verification

### Phase 5: Common Systems
- [ ] Dispute resolution system
- [ ] Weighted review system
- [ ] Advanced notification system
- [ ] Performance analytics

### Phase 6: Admin Enhancement
- [ ] Comprehensive data management
- [ ] Real-time monitoring
- [ ] User management tools
- [ ] System configuration panel

## 🔒 Security & Safety

### Data Protection
- All new endpoints require authentication
- Rate limiting on request creation
- Input sanitization and validation
- Encrypted storage for sensitive data

### Trust & Safety
- Automated fraud detection
- Manual review triggers for high-value transactions
- Emergency contact system
- Dispute resolution workflow

### Performance
- Database indexing for new queries
- Caching strategy for frequently accessed data
- Background job processing for heavy operations
- API response time monitoring

## 📊 Success Metrics

### User Engagement
- Onboarding completion rate > 80%
- Request-to-response ratio
- Template usage frequency
- Booking confirmation rate

### Revenue Growth
- Host revenue increase
- Influencer earnings
- Platform commission growth
- Package sale conversion

### Trust & Safety
- Dispute resolution time
- User satisfaction scores
- Trust level progression
- Safety incident reports

## 🚧 Migration Strategy

### Database Migration
1. **Schema Extension**: Add new columns to existing tables
2. **New Table Creation**: Create all new tables with proper indexes
3. **Data Migration**: Migrate existing data to new structure
4. **Constraint Addition**: Add foreign keys and constraints

### API Compatibility
1. **Backward Compatibility**: Maintain existing API contracts
2. **Gradual Rollout**: Feature flags for new functionality
3. **Version Management**: API versioning for major changes
4. **Client Updates**: Frontend updates with fallback handling

### User Migration
1. **Progressive Onboarding**: Guide existing users through new features
2. **Optional Upgrades**: Users can opt into new user types
3. **Data Preservation**: Maintain all existing user data and preferences
4. **Graceful Degradation**: Fallback to basic features if needed

---
*This specification ensures systematic development while preserving existing functionality and providing clear upgrade paths for all user types.*