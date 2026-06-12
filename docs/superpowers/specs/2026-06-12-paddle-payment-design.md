# Paddle Payment Integration Design

**Date:** 2026-06-12  
**Status:** Approved  
**Scope:** PortOne → Paddle 전체 교체 (PortOne 코드 유지, 비활성화)

---

## 목표

- PortOne(아임포트) 결제를 Paddle로 완전 대체
- PortOne 코드는 삭제하지 않고 `PAYMENT_PROVIDER` 환경변수로 비활성화 (나중에 재활성화 가능)
- Paddle이 커버하는 범위: 일회성 결제, 구독, 호스트 정산(Payout)

---

## 아키텍처

### Payment Provider 추상화

```
PaymentService (싱글턴)
  └── PAYMENT_PROVIDER env 기반으로 provider 선택
        ├── PaddleProvider  (active when PAYMENT_PROVIDER=paddle)
        └── PortOneProvider (active when PAYMENT_PROVIDER=portone, 기본 disabled)
```

모든 billing 라우트·서비스는 `PaymentService`만 참조. 구체 provider를 직접 import하지 않는다.

### 디렉터리 구조

```
server/services/payment/
  ├── IPaymentProvider.ts     # 공통 인터페이스 + 공통 타입
  ├── PaddleProvider.ts       # Paddle API 구현체
  ├── PortOneProvider.ts      # 기존 portoneClient.ts 이동 + disabled guard
  └── PaymentService.ts       # Provider 팩토리 및 라우터

server/routes/
  ├── billing.ts              # PaymentService 사용으로 수정
  └── webhooks/
      └── paddle.ts           # Paddle 웹훅 전용 엔드포인트

client/src/
  ├── lib/paddle.ts           # Paddle.js 로더 및 초기화
  └── hooks/usePayment.ts     # Paddle.js 기반으로 재작성
```

---

## IPaymentProvider 인터페이스

```typescript
interface IPaymentProvider {
  // 일회성 결제
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>
  confirmPayment(transactionId: string): Promise<PaymentResult>
  refundPayment(transactionId: string, amount?: number): Promise<RefundResult>

  // 구독
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>
  cancelSubscription(subscriptionId: string): Promise<void>
  getSubscription(subscriptionId: string): Promise<SubscriptionResult>

  // 호스트 정산
  createPayout(params: PayoutParams): Promise<PayoutResult>

  // 웹훅
  verifyWebhook(payload: string, headers: Record<string, string>): boolean
  parseWebhookEvent(payload: string): NormalizedWebhookEvent
}

// 공통 타입
type CheckoutParams = {
  customerId: string
  customerEmail: string
  itemName: string
  amount: number          // USD cents
  currency?: string       // 기본 'USD'
  metadata?: Record<string, string>
}

type CheckoutSession = {
  transactionId?: string  // 사전 생성 트랜잭션 ID (Paddle inline checkout용)
  clientToken?: string    // Paddle client-side token
}

type NormalizedWebhookEvent = {
  type: 'payment.completed' | 'payment.refunded' |
        'subscription.created' | 'subscription.canceled' |
        'subscription.payment.succeeded' | 'payout.paid'
  transactionId: string
  customerId?: string
  subscriptionId?: string
  amount?: number
  metadata?: Record<string, string>
  raw: unknown            // provider 원본 페이로드
}

type PayoutParams = {
  recipientEmail: string
  amount: number
  currency: string
  reason?: string
}
```

---

## Paddle Provider 구현 세부사항

### 인증
- API 키: `PADDLE_API_KEY` (서버 환경변수)
- 클라이언트 토큰: `PADDLE_CLIENT_TOKEN` (프론트 환경변수 `VITE_PADDLE_CLIENT_TOKEN`)
- 웹훅 시크릿: `PADDLE_WEBHOOK_SECRET`
- Sandbox/Production: `PADDLE_ENVIRONMENT=sandbox|production`

### 일회성 결제 플로우
1. 프론트: `Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customData: { metadata } })`
2. 유저가 Paddle overlay에서 결제 완료
3. `onComplete` 콜백으로 `transactionId` 수신
4. 프론트 → 서버 `POST /api/billing/confirm-payment { transactionId }`
5. 서버: Paddle API로 트랜잭션 검증 후 DB 업데이트
6. Paddle → 서버 웹훅 `payment.completed` (최종 확인)

### 구독 플로우
1. 프론트: `Paddle.Checkout.open({ items: [{ priceId }] })`
2. Paddle이 카드 등록 + 첫 결제 + 자동 갱신 모두 관리
3. 웹훅 `subscription.created` → DB 구독 레코드 생성
4. 웹훅 `subscription.payment.succeeded` → 갱신 결제 확인
5. 취소: `POST /api/billing/subscription` (DELETE) → Paddle API 호출

**PortOne과의 핵심 차이:** 수동 스케줄링 불필요. `subscriptionScheduler.ts`의 `scheduleNextPayment` 로직 제거.

### 호스트 정산 (Payout)
- Paddle Payouts API 사용
- 수취인(호스트)은 Paddle 대시보드에서 vendor로 수동 등록 필요 (이메일 초대 방식)
- 지원 통화: USD, EUR, GBP 등 주요 통화 (KRW 직접 지원 없음 → USD로 정산)
- Payout 최소 금액: $10 USD (Paddle 정책)

### 웹훅 검증
Paddle V2 웹훅: `Paddle-Signature` 헤더의 HMAC-SHA256 서명 검증.

```
signature = HMAC-SHA256(ts + ":" + payload, PADDLE_WEBHOOK_SECRET)
```

타임스탬프 5분 이내만 유효 (replay attack 방지).

---

## PortOneProvider 비활성화 처리

```typescript
// PortOneProvider.ts
class PortOneProvider implements IPaymentProvider {
  private isEnabled = process.env.PAYMENT_PROVIDER === 'portone';

  private disabled<T>(result: T): T {
    if (!this.isEnabled) throw new Error('PortOne is disabled. Set PAYMENT_PROVIDER=portone to enable.');
    return result;
  }

  async createCheckout(params: CheckoutParams) {
    this.disabled(null);
    // ... 기존 로직
  }
  // 모든 메서드에 this.disabled(null) 가드 추가
}
```

---

## 프론트엔드 변경사항

### Paddle.js 초기화 (`client/src/lib/paddle.ts`)
```typescript
// Paddle.js CDN 로드 + 환경별 초기화
// sandbox: VITE_PADDLE_ENVIRONMENT=sandbox
// production: VITE_PADDLE_ENVIRONMENT=production
```

### usePayment.ts 새 API
```typescript
export function usePayment() {
  openCheckout(priceId: string, metadata?: Record<string, string>): void
  openSubscriptionCheckout(priceId: string): void
  openCustomerPortal(): void   // 구독 관리 (카드 변경, 취소)
  confirmPayment(transactionId: string, type: PaymentType): Promise<void>
  isLoading: boolean
}
```

### 제거되는 컴포넌트
- `BillingKeyForm.tsx` — Paddle은 카드 등록을 체크아웃 플로우에서 통합 처리하므로 불필요

### CSP 업데이트 (`server/index.ts`)
```
script-src: cdn.paddle.com
frame-src:  cdn.paddle.com checkout.paddle.com
connect-src: api.paddle.com sandbox-api.paddle.com
```

---

## DB 변경사항

```sql
-- payments 테이블: provider 구분 컬럼 추가
ALTER TABLE payments
  ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'paddle';
-- 기존 데이터: UPDATE payments SET provider = 'portone'
```

스키마 파일(`shared/schema.ts`)에 `provider` 필드 추가.

---

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `PAYMENT_PROVIDER` | `paddle` (기본) 또는 `portone` | 예 |
| `PADDLE_API_KEY` | Paddle 서버 API 키 | 예 |
| `PADDLE_WEBHOOK_SECRET` | 웹훅 서명 검증 시크릿 | 예 |
| `PADDLE_ENVIRONMENT` | `sandbox` 또는 `production` | 예 |
| `VITE_PADDLE_CLIENT_TOKEN` | 프론트 Paddle.js 초기화 토큰 | 예 |

---

## 제거·비활성화 범위

| 항목 | 처리 |
|------|------|
| `server/services/portoneClient.ts` | `PortOneProvider.ts`로 이동, disabled guard 추가 |
| `subscriptionScheduler.ts` 수동 스케줄링 | 제거 (Paddle이 자동 처리) |
| `client/src/components/BillingKeyForm.tsx` | 제거 |
| `client/src/hooks/usePayment.ts` (PortOne SDK 부분) | 전체 재작성 |
| CSP의 PortOne/iamport 도메인 | 제거 또는 주석 처리 |

---

## 구현 순서

1. `IPaymentProvider.ts` + 공통 타입 정의
2. `PortOneProvider.ts` (기존 코드 이동 + disabled guard)
3. `PaddleProvider.ts` (Paddle API 구현)
4. `PaymentService.ts` (팩토리)
5. DB migration (`payments.provider` 컬럼)
6. `server/routes/webhooks/paddle.ts`
7. `server/routes/billing.ts` 수정
8. `client/src/lib/paddle.ts`
9. `client/src/hooks/usePayment.ts` 재작성
10. CSP 업데이트
11. `BillingKeyForm.tsx` 제거
12. `subscriptionScheduler.ts` 수동 스케줄링 제거
