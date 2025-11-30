# Tourgether Billing System 개발 계획서 v1.1

**작성일**: 2025년 11월 26일  
**수정일**: 2025년 11월 30일  
**목표**: 실제 돈이 오가는 플랫폼으로 전환 + 빅데이터 분석 기반 구축

---

## ⚠️ 0. 개발 대원칙 (CRITICAL)

### 0.1 절대 준수 원칙

| 원칙 | 설명 | 위반 시 조치 |
|------|------|-------------|
| **🚫 하드코딩 금지** | 모든 마스터 데이터는 DB 테이블로 관리 | 코드 리뷰 거부 |
| **🛡️ 기존 기능 보존** | 정상 작동 중인 기능 절대 삭제/변경 금지 | 롤백 후 재작업 |
| **📦 추가 전용 개발** | 새 기능은 기존 코드 수정 없이 추가 방식으로 | 별도 파일/함수로 분리 |
| **🔧 관리자 UI 필수** | 설정값은 반드시 관리자 화면에서 변경 가능하게 | DB + Admin API 필수 |

### 0.2 Replit Agent 경고 사항

```
⚠️ 주의: Replit Agent는 다음 행동을 하려는 경향이 있음

1. ❌ 새 기능 추가 시 기존 소스코드를 완전히 재작성
2. ❌ "더 나은 구조"라는 명목으로 작동 중인 기능 삭제
3. ❌ 하드코딩된 배열/객체로 마스터 데이터 정의
4. ❌ 관리자 기능 없이 코드 직접 수정으로만 설정 변경 가능하게 구현

→ 이러한 행동 발생 시 즉시 롤백하고 원칙에 맞게 재구현
```

### 0.3 올바른 개발 패턴

**❌ 잘못된 예시 (하드코딩):**
```typescript
// 절대 이렇게 하지 말 것!
const PLANS = [
  { id: 'free', price: 0, limit: 5 },
  { id: 'basic', price: 9900, limit: 100 },
];
```

**✅ 올바른 예시 (DB 기반):**
```typescript
// 이렇게 해야 함!
const plans = await db.select().from(billingPlans).where(eq(billingPlans.isActive, true));

// + 관리자 API
app.post('/api/admin/billing-plans', requireAdmin, async (req, res) => {
  const plan = await storage.createBillingPlan(req.body);
  res.json(plan);
});
```

### 0.4 기존 기능 보존 체크리스트

개발 전/후 반드시 다음 기능이 정상 작동하는지 확인:

- [ ] 지도 표시 및 POI 필터링
- [ ] 피드 (Smart/Popular/Latest)
- [ ] 게시물 생성/수정/삭제
- [ ] 채팅 및 번역
- [ ] 예약 시스템
- [ ] 인증 (이메일/Google/Replit)
- [ ] Mini Concierge / AI Concierge / CineMap
- [ ] 알림 시스템
- [ ] 프로필 관리

---

## 1. 현재 코드베이스 분석

### 1.1 기존 스키마 (shared/schema.ts)

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|----------|
| `users` | 사용자 정보 | `userType` (traveler/influencer/host), `isHost` |
| `experiences` | 호스트 경험 상품 | `price`, `currency`, `commissionRate` |
| `bookings` | 예약 정보 | `totalPrice`, `paymentStatus` (pending/paid/failed/refunded) |
| `payments` | 결제 정보 | `provider` (paypal/toss/mock), `amount`, `status`, `metadata` |
| `refunds` | 환불 기록 | `paymentId`, `amount`, `status` |
| `trips` | 여행 계획 | `userId`, `destination`, `startDate`, `endDate` |
| `slots` | 시간 슬롯 | `hostId`, `date`, `startTime`, `price` |

### 1.2 기존 AI 서비스 (사용량 제한 없음)

| 서비스 | 파일 | 모델 | 현재 제한 |
|--------|------|------|----------|
| Mini Concierge | `server/ai/miniConcierge.ts` | GPT-5.1 | 없음 |
| AI Concierge | `server/ai/concierge.ts` | GPT-5.1 | 없음 |
| CineMap | `server/ai/cinemap.ts` | GPT-5.1 | 없음 |
| Translation | `server/translate.ts` | Google | MAX_LENGTH=500 |

### 1.3 기존 서비스 디렉토리

```
server/services/
├── cache.ts           # LRU 캐시 서비스
└── feedScoringService.ts  # 피드 점수 서비스
```

---

## 2. 신규 스키마 설계 - Part A: 빌링 시스템

### 2.1 billing_plans (요금제 정의)

```typescript
export const billingPlans = pgTable('billing_plans', {
  id: varchar('id').primaryKey(),           // 'tg_traveler_free', 'tg_trip_pass_basic'
  app: varchar('app').default('tourgether'),
  name: varchar('name').notNull(),
  nameKo: varchar('name_ko'),               // 다국어 지원
  nameJa: varchar('name_ja'),
  nameZh: varchar('name_zh'),
  type: varchar('type').notNull(),          // 'subscription' | 'one_time'
  target: varchar('target').notNull(),      // 'traveler' | 'host'
  priceMonthlyKrw: integer('price_monthly_krw'),
  priceKrw: integer('price_krw'),
  features: jsonb('features'),              // 한도/수수료/옵션
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2.2 user_subscriptions (사용자 구독)

```typescript
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  planId: varchar('plan_id').notNull().references(() => billingPlans.id),
  app: varchar('app').default('tourgether'),
  target: varchar('target').notNull(),      // 'traveler' | 'host'
  status: varchar('status').default('pending'), // 'pending' | 'active' | 'canceled'
  portoneCustomerUid: varchar('portone_customer_uid'),
  portoneMerchantUid: varchar('portone_merchant_uid'),
  startedAt: timestamp('started_at'),
  renewsAt: timestamp('renews_at'),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2.3 user_usage (사용량 추적)

```typescript
export const userUsage = pgTable('user_usage', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  app: varchar('app').default('tourgether'),
  usageKey: varchar('usage_key').notNull(), // 'ai_message', 'translation', 'concierge'
  usedInPeriod: integer('used_in_period').default(0),
  limitInPeriod: integer('limit_in_period').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2.4 user_trip_passes (여행자 Trip Pass)

```typescript
export const userTripPasses = pgTable('user_trip_passes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  tripId: integer('trip_id').references(() => trips.id),
  planId: varchar('plan_id').notNull().references(() => billingPlans.id),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  aiMessageLimit: integer('ai_message_limit').notNull(),
  aiMessageUsed: integer('ai_message_used').default(0),
  translationLimit: integer('translation_limit').notNull(),
  translationUsed: integer('translation_used').default(0),
  conciergeCallsLimit: integer('concierge_calls_limit').notNull(),
  conciergeCallsUsed: integer('concierge_calls_used').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2.5 contracts (계약)

```typescript
export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id),
  requesterId: varchar('requester_id').notNull().references(() => users.id),
  providerId: varchar('provider_id').notNull().references(() => users.id),
  title: varchar('title').notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency').default('KRW'),
  status: varchar('status').default('draft'), // 'draft' | 'active' | 'completed' | 'canceled'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2.6 contract_stages (계약 단계/분할 결제)

```typescript
export const contractStages = pgTable('contract_stages', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').notNull().references(() => contracts.id),
  name: varchar('name').notNull(),          // 'deposit', 'middle', 'final'
  stageOrder: integer('stage_order').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date'),
  paymentId: integer('payment_id').references(() => payments.id),
  status: varchar('status').default('pending'), // 'pending' | 'paid' | 'canceled' | 'refunded'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2.7 기존 테이블 확장

**bookings 테이블 추가 컬럼:**
```typescript
platformFeeAmount: decimal('platform_fee_amount', { precision: 10, scale: 2 }),
hostPayoutAmount: decimal('host_payout_amount', { precision: 10, scale: 2 }),
```

**payments 테이블 metadata 활용:**
```json
{
  "type": "booking" | "trip_pass" | "host_subscription" | "contract_stage",
  "storeId": "portone_store_id",
  "merchantUid": "unique_merchant_id",
  "paymentId": "portone_payment_id",
  "contractId": 123,
  "stageId": 456
}
```

---

## 3. 신규 스키마 설계 - Part B: 분석용 데이터 웨어하우스

### 3.1 설계 원칙

| 원칙 | 설명 |
|------|------|
| **익명화** | 개인 식별 정보(PII) 절대 저장 금지 |
| **집계 데이터** | 개별 행위가 아닌 통계적 집계만 저장 |
| **비가역 해싱** | 필요 시 user_id는 해시 처리 |
| **GDPR 준수** | 삭제 요청 시 관련 데이터 제거 가능 |

### 3.2 차원 테이블 (Dimension Tables)

#### dim_time (시간 차원)
```typescript
export const dimTime = pgTable('dim_time', {
  id: serial('id').primaryKey(),
  dateKey: date('date_key').notNull().unique(),  // 2025-01-15
  year: integer('year').notNull(),
  quarter: integer('quarter').notNull(),
  month: integer('month').notNull(),
  week: integer('week').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),   // 0=Sun, 6=Sat
  isWeekend: boolean('is_weekend').notNull(),
  isHoliday: boolean('is_holiday').default(false),
  holidayName: varchar('holiday_name'),
  season: varchar('season'),                      // spring, summer, fall, winter
});
```

#### dim_region (지역 차원)
```typescript
export const dimRegion = pgTable('dim_region', {
  id: serial('id').primaryKey(),
  regionCode: varchar('region_code').notNull().unique(), // KR-11, JP-13
  countryCode: varchar('country_code').notNull(),        // KR, JP, US
  countryName: varchar('country_name').notNull(),
  regionName: varchar('region_name').notNull(),
  cityName: varchar('city_name'),
  latitude: decimal('latitude', { precision: 10, scale: 6 }),
  longitude: decimal('longitude', { precision: 11, scale: 6 }),
  timezone: varchar('timezone'),
  population: integer('population'),                      // 인구 (선택)
  touristRank: integer('tourist_rank'),                   // 관광지 순위 (선택)
});
```

#### dim_language (언어 차원)
```typescript
export const dimLanguage = pgTable('dim_language', {
  id: serial('id').primaryKey(),
  langCode: varchar('lang_code', { length: 10 }).notNull().unique(),
  langName: varchar('lang_name').notNull(),
  nativeName: varchar('native_name'),
  isSupported: boolean('is_supported').default(true),
});
```

#### dim_price_band (가격대 차원)
```typescript
export const dimPriceBand = pgTable('dim_price_band', {
  id: serial('id').primaryKey(),
  bandCode: varchar('band_code').notNull().unique(),  // 'free', 'budget', 'mid', 'premium', 'luxury'
  bandName: varchar('band_name').notNull(),
  minPriceKrw: integer('min_price_krw'),
  maxPriceKrw: integer('max_price_krw'),
  sortOrder: integer('sort_order').default(0),
});
```

#### dim_category (카테고리 차원)
```typescript
export const dimCategory = pgTable('dim_category', {
  id: serial('id').primaryKey(),
  categoryCode: varchar('category_code').notNull().unique(),
  categoryName: varchar('category_name').notNull(),
  parentCode: varchar('parent_code'),
  iconName: varchar('icon_name'),
  sortOrder: integer('sort_order').default(0),
});
```

### 3.3 팩트 테이블 (Fact Tables)

#### daily_destination_metrics (일별 목적지 지표)
```typescript
export const dailyDestinationMetrics = pgTable('daily_destination_metrics', {
  id: serial('id').primaryKey(),
  dateKey: date('date_key').notNull(),
  regionId: integer('region_id').notNull().references(() => dimRegion.id),
  
  // 검색/조회 지표
  searchCount: integer('search_count').default(0),
  viewCount: integer('view_count').default(0),
  uniqueViewerCount: integer('unique_viewer_count').default(0),  // 익명 카운트
  
  // 콘텐츠 지표
  newPostCount: integer('new_post_count').default(0),
  newExperienceCount: integer('new_experience_count').default(0),
  totalEngagementCount: integer('total_engagement_count').default(0), // likes + comments
  
  // 예약 지표
  bookingAttemptCount: integer('booking_attempt_count').default(0),
  bookingSuccessCount: integer('booking_success_count').default(0),
  bookingTotalValueKrw: decimal('booking_total_value_krw', { precision: 15, scale: 2 }),
  
  // 인기도 점수 (0-100)
  popularityScore: decimal('popularity_score', { precision: 5, scale: 2 }),
  trendingScore: decimal('trending_score', { precision: 5, scale: 2 }),  // 상승/하락 트렌드
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_daily_dest_date_region').on(table.dateKey, table.regionId),
]);
```

#### weekly_experience_performance (주별 경험 성과)
```typescript
export const weeklyExperiencePerformance = pgTable('weekly_experience_performance', {
  id: serial('id').primaryKey(),
  weekStartDate: date('week_start_date').notNull(),
  regionId: integer('region_id').notNull().references(() => dimRegion.id),
  categoryId: integer('category_id').notNull().references(() => dimCategory.id),
  priceBandId: integer('price_band_id').notNull().references(() => dimPriceBand.id),
  
  // 공급 지표 (익명화)
  activeExperienceCount: integer('active_experience_count').default(0),
  activeHostCount: integer('active_host_count').default(0),
  avgPriceKrw: decimal('avg_price_krw', { precision: 10, scale: 2 }),
  
  // 수요 지표
  totalViewCount: integer('total_view_count').default(0),
  totalBookingCount: integer('total_booking_count').default(0),
  totalRevenueKrw: decimal('total_revenue_krw', { precision: 15, scale: 2 }),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }),
  
  // 전환율
  viewToBookingRate: decimal('view_to_booking_rate', { precision: 5, scale: 4 }),  // 0.0000 ~ 1.0000
  cancellationRate: decimal('cancellation_rate', { precision: 5, scale: 4 }),
  
  // 가격 탄력성 (선택)
  priceElasticityScore: decimal('price_elasticity_score', { precision: 5, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_weekly_exp_week_region').on(table.weekStartDate, table.regionId),
]);
```

#### hourly_feature_usage (시간별 기능 사용)
```typescript
export const hourlyFeatureUsage = pgTable('hourly_feature_usage', {
  id: serial('id').primaryKey(),
  hourTimestamp: timestamp('hour_timestamp').notNull(),  // 2025-01-15 14:00:00
  featureCode: varchar('feature_code').notNull(),         // 'map_view', 'feed_scroll', 'ai_concierge', 'translate'
  regionId: integer('region_id').references(() => dimRegion.id),
  
  // 사용량 지표
  usageCount: integer('usage_count').default(0),
  uniqueUserCount: integer('unique_user_count').default(0),  // 익명 카운트
  avgDurationSec: decimal('avg_duration_sec', { precision: 8, scale: 2 }),
  
  // 성능 지표
  avgResponseTimeMs: decimal('avg_response_time_ms', { precision: 10, scale: 2 }),
  errorCount: integer('error_count').default(0),
  successRate: decimal('success_rate', { precision: 5, scale: 4 }),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_hourly_feature_hour').on(table.hourTimestamp),
  index('IDX_hourly_feature_code').on(table.featureCode),
]);
```

#### ai_service_analytics (AI 서비스 분석)
```typescript
export const aiServiceAnalytics = pgTable('ai_service_analytics', {
  id: serial('id').primaryKey(),
  dateKey: date('date_key').notNull(),
  serviceType: varchar('service_type').notNull(),        // 'mini_concierge', 'ai_concierge', 'cinemap', 'translate'
  modelVersion: varchar('model_version'),                 // 'gpt-5.1', 'gpt-5-mini'
  regionId: integer('region_id').references(() => dimRegion.id),
  sourceLangId: integer('source_lang_id').references(() => dimLanguage.id),
  targetLangId: integer('target_lang_id').references(() => dimLanguage.id),
  
  // 사용량 지표
  requestCount: integer('request_count').default(0),
  successCount: integer('success_count').default(0),
  errorCount: integer('error_count').default(0),
  
  // 품질 지표
  avgTokensUsed: decimal('avg_tokens_used', { precision: 10, scale: 2 }),
  avgResponseLengthChars: decimal('avg_response_length_chars', { precision: 10, scale: 2 }),
  avgLatencyMs: decimal('avg_latency_ms', { precision: 10, scale: 2 }),
  
  // 비용 지표 (추정)
  estimatedCostUsd: decimal('estimated_cost_usd', { precision: 10, scale: 4 }),
  
  // 사용자 만족도 (선택: 명시적 피드백 시)
  positiveFeedbackCount: integer('positive_feedback_count').default(0),
  negativeFeedbackCount: integer('negative_feedback_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_ai_analytics_date_service').on(table.dateKey, table.serviceType),
]);
```

#### translation_pair_metrics (번역 언어쌍 지표)
```typescript
export const translationPairMetrics = pgTable('translation_pair_metrics', {
  id: serial('id').primaryKey(),
  dateKey: date('date_key').notNull(),
  sourceLangId: integer('source_lang_id').notNull().references(() => dimLanguage.id),
  targetLangId: integer('target_lang_id').notNull().references(() => dimLanguage.id),
  
  // 사용량
  translationCount: integer('translation_count').default(0),
  totalCharsTranslated: integer('total_chars_translated').default(0),
  avgCharsPerRequest: decimal('avg_chars_per_request', { precision: 8, scale: 2 }),
  
  // 컨텍스트별 분포
  chatTranslationCount: integer('chat_translation_count').default(0),
  postTranslationCount: integer('post_translation_count').default(0),
  experienceTranslationCount: integer('experience_translation_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_trans_pair_date').on(table.dateKey),
]);
```

#### booking_funnel_metrics (예약 퍼널 지표)
```typescript
export const bookingFunnelMetrics = pgTable('booking_funnel_metrics', {
  id: serial('id').primaryKey(),
  dateKey: date('date_key').notNull(),
  regionId: integer('region_id').references(() => dimRegion.id),
  categoryId: integer('category_id').references(() => dimCategory.id),
  priceBandId: integer('price_band_id').references(() => dimPriceBand.id),
  
  // 퍼널 단계별 카운트
  experienceViewCount: integer('experience_view_count').default(0),      // Step 1
  slotViewCount: integer('slot_view_count').default(0),                  // Step 2
  bookingStartCount: integer('booking_start_count').default(0),          // Step 3
  paymentInitCount: integer('payment_init_count').default(0),            // Step 4
  paymentSuccessCount: integer('payment_success_count').default(0),      // Step 5
  bookingCompletedCount: integer('booking_completed_count').default(0),  // Step 6
  
  // 전환율 (자동 계산 가능하지만 편의상 저장)
  viewToSlotRate: decimal('view_to_slot_rate', { precision: 5, scale: 4 }),
  slotToBookingRate: decimal('slot_to_booking_rate', { precision: 5, scale: 4 }),
  bookingToPaymentRate: decimal('booking_to_payment_rate', { precision: 5, scale: 4 }),
  paymentSuccessRate: decimal('payment_success_rate', { precision: 5, scale: 4 }),
  overallConversionRate: decimal('overall_conversion_rate', { precision: 5, scale: 4 }),
  
  // 이탈 분석
  avgTimeToBookingSec: decimal('avg_time_to_booking_sec', { precision: 10, scale: 2 }),
  dropoffStep: varchar('top_dropoff_step'),  // 가장 많이 이탈한 단계
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_booking_funnel_date').on(table.dateKey),
]);
```

#### content_engagement_metrics (콘텐츠 참여 지표)
```typescript
export const contentEngagementMetrics = pgTable('content_engagement_metrics', {
  id: serial('id').primaryKey(),
  dateKey: date('date_key').notNull(),
  contentType: varchar('content_type').notNull(),  // 'post', 'experience', 'review'
  regionId: integer('region_id').references(() => dimRegion.id),
  categoryId: integer('category_id').references(() => dimCategory.id),
  
  // 콘텐츠 생성
  newContentCount: integer('new_content_count').default(0),
  avgContentLengthChars: decimal('avg_content_length_chars', { precision: 10, scale: 2 }),
  contentWithMediaCount: integer('content_with_media_count').default(0),
  avgMediaPerContent: decimal('avg_media_per_content', { precision: 5, scale: 2 }),
  
  // 참여도
  totalViewCount: integer('total_view_count').default(0),
  totalLikeCount: integer('total_like_count').default(0),
  totalCommentCount: integer('total_comment_count').default(0),
  totalShareCount: integer('total_share_count').default(0),
  
  // 참여율
  avgLikesPerContent: decimal('avg_likes_per_content', { precision: 8, scale: 2 }),
  avgCommentsPerContent: decimal('avg_comments_per_content', { precision: 8, scale: 2 }),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }),  // (likes+comments)/views
  
  // 인기 태그 (상위 5개, JSON 배열)
  topTags: jsonb('top_tags'),  // [{"tag": "food", "count": 150}, ...]
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_content_engagement_date').on(table.dateKey),
]);
```

### 3.4 데이터 수집 및 보존 정책

| 집계 수준 | 보존 기간 | 용도 |
|-----------|----------|------|
| 시간별 (hourly) | 30일 | 실시간 모니터링, 이상 탐지 |
| 일별 (daily) | 12개월 | 트렌드 분석, 시즌 패턴 |
| 주별 (weekly) | 36개월 | 장기 트렌드, 성장 분석 |
| 월별 (monthly) | 무기한 | 연간 비교, 전략 수립 |

### 3.5 ETL 스케줄

```
┌─────────────────────────────────────────────────────────────┐
│                     ETL 파이프라인                           │
├─────────────────────────────────────────────────────────────┤
│  매시 정각 (00분)                                            │
│  └─ hourly_feature_usage 집계                               │
│                                                             │
│  매일 02:00 KST                                             │
│  ├─ daily_destination_metrics 집계                          │
│  ├─ ai_service_analytics 집계                               │
│  ├─ translation_pair_metrics 집계                           │
│  ├─ booking_funnel_metrics 집계                             │
│  └─ content_engagement_metrics 집계                         │
│                                                             │
│  매주 월요일 03:00 KST                                       │
│  └─ weekly_experience_performance 집계                      │
│                                                             │
│  매월 1일 04:00 KST                                          │
│  └─ 월간 롤업 + 오래된 시간별 데이터 삭제                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.6 분석 활용 예시

| 분석 목적 | 사용 테이블 | 인사이트 |
|-----------|------------|----------|
| 인기 여행지 트렌드 | daily_destination_metrics | 계절별 인기 목적지 변화 |
| 가격 최적화 | weekly_experience_performance | 가격대별 전환율, 탄력성 |
| AI 비용 관리 | ai_service_analytics | 모델별 비용/품질 비교 |
| UX 개선 | hourly_feature_usage | 기능별 사용 패턴, 병목 |
| 마케팅 타겟팅 | translation_pair_metrics | 언어권별 사용자 분포 |
| 전환율 개선 | booking_funnel_metrics | 이탈 구간 식별 |

---

## 4. 요금제 Seed 데이터

### 4.1 여행자용 플랜

| ID | 이름 | 타입 | 가격 | 기능 |
|----|------|------|------|------|
| `tg_traveler_free` | Free | subscription | 0원/월 | AI 5회/일, 60회/월, 번역 100회/월 |
| `tg_trip_pass_basic` | Trip Pass | one_time | 4,900원 | 7일, AI 300회, 번역 500회, 컨시어지 100회 |

### 4.2 호스트용 플랜

| ID | 이름 | 가격 | 경험 수 | 수수료 | 기능 |
|----|------|------|---------|--------|------|
| `tg_host_free` | Host Free | 0원 | 3개 | 15% | 번역 1언어 |
| `tg_host_basic` | Host Basic | 9,900원/월 | 10개 | 13% | 번역 2언어, 기본 인사이트 |
| `tg_host_pro` | Host Pro | 29,900원/월 | 무제한 | 10% | 번역 4언어, 고급 인사이트, AI 리스팅 최적화 |

---

## 5. 개발 단계 (5 Phases)

### Phase 1: 빌링 DB 기반 구축 (1-2일)

**목표**: 빌링 스키마 추가 및 Seed 데이터 구축

| 작업 | 파일 | 우선순위 |
|------|------|----------|
| 빌링 테이블 6개 정의 | `shared/schema.ts` | 🔴 필수 |
| Insert/Select 타입 생성 | `shared/schema.ts` | 🔴 필수 |
| bookings 확장 컬럼 추가 | `shared/schema.ts` | 🔴 필수 |
| 스키마 푸시 | `npm run db:push` | 🔴 필수 |
| Seed 함수 작성 | `server/db/seed.ts` | 🔴 필수 |
| Storage 인터페이스 확장 | `server/storage.ts` | 🔴 필수 |

**의존성**: 없음 (첫 번째 단계)

### Phase 2: 분석 DB 기반 구축 (1-2일)

**목표**: 분석용 차원/팩트 테이블 생성

| 작업 | 파일 | 우선순위 |
|------|------|----------|
| 차원 테이블 5개 정의 | `shared/schema.ts` | 🔴 필수 |
| 팩트 테이블 7개 정의 | `shared/schema.ts` | 🔴 필수 |
| 스키마 푸시 | `npm run db:push` | 🔴 필수 |
| 차원 Seed 데이터 | `server/db/seedAnalytics.ts` | 🟡 권장 |

**의존성**: Phase 1 완료

### Phase 3: 서비스 레이어 (2-3일)

**목표**: 비즈니스 로직 서비스 구축

| 작업 | 파일 | 설명 |
|------|------|------|
| PortOne 클라이언트 | `server/services/portoneClient.ts` | V2 REST API 래퍼 |
| 빌링 헬퍼 | `server/services/billingHelpers.ts` | 플랜 조회, 수수료 계산, 사용량 관리 |
| 사용량 미들웨어 | `server/middleware/checkTravelerAiUsage.ts` | AI 사용량 체크 |
| 분석 수집기 | `server/services/analyticsCollector.ts` | 이벤트 수집 및 집계 |

**핵심 함수:**

```typescript
// portoneClient.ts
createSubscriptionCheckout(plan, user): Promise<{ redirectUrl: string }>
createOneTimeCheckout(item, user): Promise<{ redirectUrl: string }>
getPayment(paymentId): Promise<PaymentInfo>
verifyWebhookSignature(payload, signature): boolean

// billingHelpers.ts
getHostEffectivePlan(hostId): Promise<BillingPlan>
calculatePlatformFee(totalPrice, plan): { feeAmount, payoutAmount }
checkAndIncrementUsage(userId, usageKey): Promise<boolean>
getActiveTripPass(userId): Promise<TripPass | null>

// analyticsCollector.ts
trackFeatureUsage(featureCode, regionId, metadata): void
trackBookingFunnelStep(step, metadata): void
aggregateHourlyMetrics(): Promise<void>
aggregateDailyMetrics(): Promise<void>
```

**의존성**: Phase 1, 2 완료

### Phase 4: API 엔드포인트 (2-3일)

**목표**: REST API 구축

| 엔드포인트 | 메소드 | 설명 |
|-----------|--------|------|
| `/api/billing/plans` | GET | 요금제 목록 조회 |
| `/api/billing/host/create-checkout-session` | POST | 호스트 구독 결제창 생성 |
| `/api/billing/trip-pass/create-session` | POST | Trip Pass 결제창 생성 |
| `/api/billing/usage` | GET | 사용량 조회 |
| `/api/billing/portone-webhook` | POST | PortOne 웹훅 수신 |
| `/api/contracts` | POST/GET | 계약 생성/조회 |
| `/api/contracts/:id` | GET | 계약 상세 조회 |
| `/api/contracts/:id/pay-stage` | POST | 분할 결제 실행 |
| `/api/bookings/:id/pay` | POST | 예약 결제 실행 |
| `/api/admin/billing-plans` | CRUD | 관리자: 요금제 관리 |
| `/api/admin/analytics/destinations` | GET | 관리자: 목적지 분석 |
| `/api/admin/analytics/ai-usage` | GET | 관리자: AI 사용량 분석 |

**웹훅 처리 흐름:**

```
PortOne Webhook → Signature 검증 → metadata.type 분기
├─ host_subscription → user_subscriptions 활성화
├─ trip_pass → user_trip_passes 생성
├─ booking → bookings/payments 업데이트, 수수료 계산
└─ contract_stage → contract_stages 업데이트
```

**의존성**: Phase 3 완료

### Phase 5: 사용량 제한 및 분석 연동 (1-2일)

**목표**: AI 서비스에 사용량 제한 연동 + 분석 데이터 수집

| 서비스 | 미들웨어 적용 | 분석 트래킹 |
|--------|---------------|------------|
| Mini Concierge | `checkTravelerAiUsage('concierge')` | `trackAiUsage('mini_concierge')` |
| AI Concierge | `checkTravelerAiUsage('ai_message')` | `trackAiUsage('ai_concierge')` |
| Translation | `checkTravelerAiUsage('translation')` | `trackTranslation(src, tgt)` |
| CineMap | `checkTravelerAiUsage('ai_message')` | `trackAiUsage('cinemap')` |

**미들웨어 로직:**

```
1. 활성 Trip Pass 조회 (validFrom ≤ now ≤ validUntil)
2. Pass 있음 → 해당 limit 체크 → 초과 시 402 반환
3. Pass 없음 → Free 플랜 한도 체크 (user_usage)
4. 한도 내 → 사용량 +1 → 분석 이벤트 트래킹 → 요청 허용
5. 한도 초과 → 402 + "Trip Pass 필요" 에러
```

**의존성**: Phase 4 완료

---

## 6. 환경 변수 설정

```bash
# PortOne V2 API
PORTONE_API_SECRET=your_api_secret
PORTONE_MERCHANT_ID=your_merchant_id
PORTONE_STORE_ID=your_store_id
PORTONE_WEBHOOK_SECRET=your_webhook_secret

# 기능 플래그 (점진적 롤아웃용)
BILLING_ENABLED=false
USAGE_LIMITS_ENABLED=false
ANALYTICS_ENABLED=false
```

---

## 7. 파일 구조 변경

```
server/
├── services/
│   ├── cache.ts                    # 기존
│   ├── feedScoringService.ts       # 기존
│   ├── portoneClient.ts            # 🆕 PortOne V2 클라이언트
│   ├── billingHelpers.ts           # 🆕 빌링 헬퍼 함수
│   └── analyticsCollector.ts       # 🆕 분석 데이터 수집기
├── middleware/
│   └── checkTravelerAiUsage.ts     # 🆕 AI 사용량 체크
├── db/
│   ├── seed.ts                     # 🆕 빌링 Seed 데이터
│   └── seedAnalytics.ts            # 🆕 분석 차원 Seed 데이터
├── jobs/
│   └── analyticsAggregator.ts      # 🆕 분석 집계 배치 작업
├── routes/
│   ├── trips.ts                    # 기존
│   ├── billing.ts                  # 🆕 빌링 라우트
│   └── analytics.ts                # 🆕 분석 라우트 (관리자용)
├── routes.ts                       # 기존 (라우터 마운트 추가)
└── storage.ts                      # 기존 (빌링/분석 메소드 추가)

shared/
└── schema.ts                       # 빌링 + 분석 테이블 추가
```

---

## 8. 테스트 전략

### 8.1 단위 테스트

| 대상 | 테스트 항목 |
|------|------------|
| billingHelpers | 수수료 계산, 플랜 조회, 사용량 증가 |
| portoneClient | API 호출 mock, 서명 검증 |
| checkTravelerAiUsage | 한도 체크, Pass 우선순위 |
| analyticsCollector | 이벤트 수집, 집계 정확성 |

### 8.2 통합 테스트

| 시나리오 | 검증 항목 |
|---------|----------|
| 호스트 구독 플로우 | 결제창 생성 → 웹훅 → 구독 활성화 |
| Trip Pass 구매 | 결제 → Pass 생성 → AI 사용 가능 |
| 분할 결제 | 계약금 → 중도금 → 잔금 순차 결제 |
| 예약 결제 | 결제 → 수수료 계산 → 정산 금액 저장 |
| 분석 집계 | 이벤트 발생 → 시간별 집계 → 일별 롤업 |

### 8.3 E2E 테스트

```
1. 무료 사용자 → AI 사용 5회 → 6회째 402 에러 확인
2. Trip Pass 구매 → AI 300회 사용 가능 확인
3. 호스트 Basic 구독 → 경험 10개 등록 가능 확인
4. 호스트 Free → 11번째 경험 등록 시 403 에러 확인
```

### 8.4 기존 기능 회귀 테스트

```
✅ 필수 체크 (개발 전/후):
- [ ] 지도 로딩 및 마커 표시
- [ ] 피드 무한 스크롤
- [ ] 게시물 CRUD
- [ ] 채팅 송수신
- [ ] 예약 생성/확인
- [ ] 로그인/로그아웃
```

---

## 9. 롤백 전략

### 9.1 기능 플래그

```typescript
const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true';
const USAGE_LIMITS_ENABLED = process.env.USAGE_LIMITS_ENABLED === 'true';
const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED === 'true';

// 미들웨어에서
if (!USAGE_LIMITS_ENABLED) {
  return next(); // 제한 없이 통과
}
```

### 9.2 DB 롤백

- 신규 테이블은 독립적 → 삭제 시 기존 기능 영향 없음
- bookings 확장 컬럼은 nullable → 기존 로직 영향 없음
- 분석 테이블은 완전 독립 → 운영에 무관

### 9.3 결제 프로바이더 폴백

```typescript
const provider = PORTONE_API_SECRET ? 'portone' : 'mock';
```

---

## 10. 보안 고려사항

| 항목 | 대응 |
|------|------|
| PortOne 시크릿 | Replit Secrets에 저장 |
| 웹훅 검증 | HMAC 서명 필수 검증 |
| 결제 금액 조작 | 서버에서 plan 기준 금액 재계산 |
| Rate Limiting | 결제 API는 분당 10회 제한 |
| 분석 데이터 익명화 | 개인 ID는 해시 처리 또는 집계만 저장 |
| GDPR 준수 | 삭제 요청 시 관련 분석 데이터 제거 가능 |

---

## 11. 예상 일정

| Phase | 기간 | 담당 |
|-------|------|------|
| Phase 1: 빌링 DB 기반 | 1-2일 | 백엔드 |
| Phase 2: 분석 DB 기반 | 1-2일 | 백엔드 |
| Phase 3: 서비스 레이어 | 2-3일 | 백엔드 |
| Phase 4: API 엔드포인트 | 2-3일 | 백엔드 |
| Phase 5: 사용량 제한 + 분석 | 1-2일 | 백엔드 |
| 테스트 및 QA | 2-3일 | 전체 |
| **총 예상** | **9-15일** | - |

---

## 12. 다음 단계

1. ✅ 이 문서 검토 및 승인
2. ⬜ PortOne 계정 생성 및 API 키 발급
3. ⬜ Phase 1 개발 시작
4. ⬜ 테스트 결제 환경 구축 (Sandbox)

---

## 승인

- [ ] 기획 검토 완료
- [ ] 대원칙 숙지 확인
- [ ] 스키마 설계 승인
- [ ] 요금제 가격 확정
- [ ] 분석 스키마 승인
- [ ] PortOne 계약 완료

**작성자**: Replit Agent  
**검토자**: _______________  
**승인일**: _______________
