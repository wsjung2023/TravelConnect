# Tourgether Billing System 개발 계획서 v1.0

**작성일**: 2025년 11월 26일  
**목표**: 실제 돈이 오가는 플랫폼으로 전환

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

## 2. 신규 스키마 설계

### 2.1 billing_plans (요금제 정의)

```typescript
export const billingPlans = pgTable('billing_plans', {
  id: varchar('id').primaryKey(),           // 'tg_traveler_free', 'tg_trip_pass_basic'
  app: varchar('app').default('tourgether'),
  name: varchar('name').notNull(),
  type: varchar('type').notNull(),          // 'subscription' | 'one_time'
  target: varchar('target').notNull(),      // 'traveler' | 'host'
  priceMonthlyKrw: integer('price_monthly_krw'),
  priceKrw: integer('price_krw'),
  features: jsonb('features'),              // 한도/수수료/옵션
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
  order: integer('order').notNull(),
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

## 3. 요금제 Seed 데이터

### 3.1 여행자용 플랜

| ID | 이름 | 타입 | 가격 | 기능 |
|----|------|------|------|------|
| `tg_traveler_free` | Free | subscription | 0원/월 | AI 5회/일, 60회/월, 번역 100회/월 |
| `tg_trip_pass_basic` | Trip Pass | one_time | 4,900원 | 7일, AI 300회, 번역 500회, 컨시어지 100회 |

### 3.2 호스트용 플랜

| ID | 이름 | 가격 | 경험 수 | 수수료 | 기능 |
|----|------|------|---------|--------|------|
| `tg_host_free` | Host Free | 0원 | 3개 | 15% | 번역 1언어 |
| `tg_host_basic` | Host Basic | 9,900원/월 | 10개 | 13% | 번역 2언어, 기본 인사이트 |
| `tg_host_pro` | Host Pro | 29,900원/월 | 무제한 | 10% | 번역 4언어, 고급 인사이트, AI 리스팅 최적화 |

---

## 4. 개발 단계 (4 Phases)

### Phase 1: DB 기반 구축 (1-2일)

**목표**: 스키마 추가 및 Seed 데이터 구축

| 작업 | 파일 | 우선순위 |
|------|------|----------|
| 신규 테이블 6개 정의 | `shared/schema.ts` | 🔴 필수 |
| Insert/Select 타입 생성 | `shared/schema.ts` | 🔴 필수 |
| bookings 확장 컬럼 추가 | `shared/schema.ts` | 🔴 필수 |
| 스키마 푸시 | `npm run db:push` | 🔴 필수 |
| Seed 함수 작성 | `server/db/seed.ts` | 🔴 필수 |
| Storage 인터페이스 확장 | `server/storage.ts` | 🔴 필수 |

**의존성**: 없음 (첫 번째 단계)

### Phase 2: 서비스 레이어 (2-3일)

**목표**: 비즈니스 로직 서비스 구축

| 작업 | 파일 | 설명 |
|------|------|------|
| PortOne 클라이언트 | `server/services/portoneClient.ts` | V2 REST API 래퍼 |
| 빌링 헬퍼 | `server/services/billingHelpers.ts` | 플랜 조회, 수수료 계산, 사용량 관리 |
| 사용량 미들웨어 | `server/middleware/checkTravelerAiUsage.ts` | AI 사용량 체크 |

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
```

**의존성**: Phase 1 완료

### Phase 3: API 엔드포인트 (2-3일)

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

**웹훅 처리 흐름:**

```
PortOne Webhook → Signature 검증 → metadata.type 분기
├─ host_subscription → user_subscriptions 활성화
├─ trip_pass → user_trip_passes 생성
├─ booking → bookings/payments 업데이트, 수수료 계산
└─ contract_stage → contract_stages 업데이트
```

**의존성**: Phase 2 완료

### Phase 4: 사용량 제한 적용 (1-2일)

**목표**: AI 서비스에 사용량 제한 연동

| 서비스 | 미들웨어 적용 | 제한 항목 |
|--------|---------------|----------|
| Mini Concierge | `checkTravelerAiUsage('concierge')` | conciergeCallsUsed |
| AI Concierge | `checkTravelerAiUsage('ai_message')` | aiMessageUsed |
| Translation | `checkTravelerAiUsage('translation')` | translationUsed |
| CineMap | `checkTravelerAiUsage('ai_message')` | aiMessageUsed |

**미들웨어 로직:**

```
1. 활성 Trip Pass 조회 (validFrom ≤ now ≤ validUntil)
2. Pass 있음 → 해당 limit 체크 → 초과 시 402 반환
3. Pass 없음 → Free 플랜 한도 체크 (user_usage)
4. 한도 내 → 사용량 +1 → 요청 허용
5. 한도 초과 → 402 + "Trip Pass 필요" 에러
```

**의존성**: Phase 3 완료

---

## 5. 환경 변수 설정

```bash
# PortOne V2 API
PORTONE_API_SECRET=your_api_secret
PORTONE_MERCHANT_ID=your_merchant_id
PORTONE_STORE_ID=your_store_id
PORTONE_WEBHOOK_SECRET=your_webhook_secret

# 기능 플래그 (점진적 롤아웃용)
BILLING_ENABLED=false
USAGE_LIMITS_ENABLED=false
```

---

## 6. 파일 구조 변경

```
server/
├── services/
│   ├── cache.ts                    # 기존
│   ├── feedScoringService.ts       # 기존
│   ├── portoneClient.ts            # 🆕 PortOne V2 클라이언트
│   └── billingHelpers.ts           # 🆕 빌링 헬퍼 함수
├── middleware/
│   └── checkTravelerAiUsage.ts     # 🆕 AI 사용량 체크
├── db/
│   └── seed.ts                     # 🆕 Seed 데이터
├── routes/
│   ├── trips.ts                    # 기존
│   └── billing.ts                  # 🆕 빌링 라우트 (선택)
├── routes.ts                       # 기존 (빌링 엔드포인트 추가)
└── storage.ts                      # 기존 (빌링 메소드 추가)

shared/
└── schema.ts                       # 신규 테이블 추가
```

---

## 7. 테스트 전략

### 7.1 단위 테스트

| 대상 | 테스트 항목 |
|------|------------|
| billingHelpers | 수수료 계산, 플랜 조회, 사용량 증가 |
| portoneClient | API 호출 mock, 서명 검증 |
| checkTravelerAiUsage | 한도 체크, Pass 우선순위 |

### 7.2 통합 테스트

| 시나리오 | 검증 항목 |
|---------|----------|
| 호스트 구독 플로우 | 결제창 생성 → 웹훅 → 구독 활성화 |
| Trip Pass 구매 | 결제 → Pass 생성 → AI 사용 가능 |
| 분할 결제 | 계약금 → 중도금 → 잔금 순차 결제 |
| 예약 결제 | 결제 → 수수료 계산 → 정산 금액 저장 |

### 7.3 E2E 테스트

```
1. 무료 사용자 → AI 사용 5회 → 6회째 402 에러 확인
2. Trip Pass 구매 → AI 300회 사용 가능 확인
3. 호스트 Basic 구독 → 경험 10개 등록 가능 확인
4. 호스트 Free → 11번째 경험 등록 시 403 에러 확인
```

---

## 8. 롤백 전략

### 8.1 기능 플래그

```typescript
const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true';
const USAGE_LIMITS_ENABLED = process.env.USAGE_LIMITS_ENABLED === 'true';

// 미들웨어에서
if (!USAGE_LIMITS_ENABLED) {
  return next(); // 제한 없이 통과
}
```

### 8.2 DB 롤백

- 신규 테이블은 독립적 → 삭제 시 기존 기능 영향 없음
- bookings 확장 컬럼은 nullable → 기존 로직 영향 없음

### 8.3 결제 프로바이더 폴백

```typescript
const provider = PORTONE_API_SECRET ? 'portone' : 'mock';
```

---

## 9. 보안 고려사항

| 항목 | 대응 |
|------|------|
| PortOne 시크릿 | Replit Secrets에 저장 |
| 웹훅 검증 | HMAC 서명 필수 검증 |
| 결제 금액 조작 | 서버에서 plan 기준 금액 재계산 |
| Rate Limiting | 결제 API는 분당 10회 제한 |

---

## 10. 예상 일정

| Phase | 기간 | 담당 |
|-------|------|------|
| Phase 1: DB 기반 | 1-2일 | 백엔드 |
| Phase 2: 서비스 레이어 | 2-3일 | 백엔드 |
| Phase 3: API 엔드포인트 | 2-3일 | 백엔드 |
| Phase 4: 사용량 제한 | 1-2일 | 백엔드 |
| 테스트 및 QA | 2-3일 | 전체 |
| **총 예상** | **8-13일** | - |

---

## 11. 다음 단계

1. ✅ 이 문서 검토 및 승인
2. ⬜ PortOne 계정 생성 및 API 키 발급
3. ⬜ Phase 1 개발 시작
4. ⬜ 테스트 결제 환경 구축 (Sandbox)

---

## 승인

- [ ] 기획 검토 완료
- [ ] 스키마 설계 승인
- [ ] 요금제 가격 확정
- [ ] PortOne 계약 완료

**작성자**: Replit Agent  
**검토자**: _______________  
**승인일**: _______________
