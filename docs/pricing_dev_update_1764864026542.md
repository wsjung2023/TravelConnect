# PortOne V2 결제 연동 가이드

> 다른 Replit 프로젝트에서 결제 시스템을 구축할 때 참고하는 종합 가이드입니다.
> 이 문서는 VidDigest Hub 프로젝트에서 시행착오를 거쳐 완성된 내용입니다.

---

## 목차

1. [사전 준비 사항](#1-사전-준비-사항)
2. [환경 변수 설정](#2-환경-변수-설정)
3. [데이터베이스 스키마](#3-데이터베이스-스키마)
4. [백엔드 서비스 구현](#4-백엔드-서비스-구현)
5. [프론트엔드 구현](#5-프론트엔드-구현)
6. [결제 수단별 특이사항](#6-결제-수단별-특이사항)
7. [정기결제 스케줄 관리 (핵심!)](#7-정기결제-스케줄-관리-핵심)
8. [구독 해지 vs 환불 - 핵심 개념 분리 (CRITICAL!)](#8-구독-해지-vs-환불---핵심-개념-분리-critical)
9. [환불 정책 (한국 전자상거래법 준수)](#9-환불-정책-한국-전자상거래법-준수)
10. [업그레이드 시 자동 환불 로직](#10-업그레이드-시-자동-환불-로직)
11. [PG사 심사 필수 페이지](#11-pg사-심사-필수-페이지)
12. [테스트 환경 주의사항](#12-테스트-환경-주의사항)
13. [관리자 기능](#13-관리자-기능)
14. [일반적인 실수와 해결책](#14-일반적인-실수와-해결책)
15. [체크리스트](#15-체크리스트)
16. [개발 대원칙](#16-개발-대원칙)

---

## 1. 사전 준비 사항

### PortOne 콘솔 설정

1. [PortOne 콘솔](https://admin.portone.io) 접속
2. 스토어 생성 → `store-xxxxx` ID 확인
3. 채널 추가:
   - **KG이니시스 V2**: 정기결제용 (카드)
   - **카카오페이**: 정기결제용 (간편결제)
   - **PayPal V2**: RT(Reference Transaction) 정기결제용 (해외결제)

### PG사별 계약 필요

| PG사 | 계약 형태 | 테스트 MID |
|------|----------|-----------|
| KG이니시스 | 정기결제(빌링) 별도 계약 | `INIBillTst` |
| 카카오페이 | 정기결제 계약 | `TCSUBSCRIP` |
| PayPal | RT(Reference Transaction) 승인 필요 | Sandbox 계정 |

### 필수 NPM 패키지

```bash
npm install jsonwebtoken bcrypt
npm install @types/jsonwebtoken @types/bcrypt --save-dev
```

---

## 2. 환경 변수 설정

### Secrets (민감 정보)

```env
# PortOne 필수
PORTONE_API_SECRET=your_portone_api_secret
PORTONE_STORE_ID=store-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 결제 채널별 키
PORTONE_CHANNEL_KEY=channel-key-xxxxx  # KG이니시스 (카드)
PORTONE_KAKAOPAY_CHANNEL_KEY=channel-key-xxxxx  # 카카오페이
PORTONE_PAYPAL_CHANNEL_KEY=channel-key-xxxxx  # PayPal

# Webhook 검증 (선택)
PORTONE_WEBHOOK_SECRET=your_webhook_secret

# 이메일 알림
RESEND_API_KEY=re_xxxxx

# 관리자 계정 (테스트용 1원 결제)
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### 채널 키 확인 방법

1. PortOne 콘솔 → 결제 연동 → 채널 관리
2. 각 채널의 "채널 키" 복사
3. 채널 키는 `channel-key-`로 시작

---

## 3. 데이터베이스 스키마

### 필수 테이블

```typescript
// shared/schema.ts

// 1. 요금제 정의
export const billingPlans = pgTable('billing_plans', {
  id: text('id').primaryKey(),  // 'app_free', 'app_basic', 'app_pro'
  app: text('app').notNull().default('myapp'),
  name: text('name').notNull(),  // 'Free', 'Basic', 'Pro'
  priceMonthlyKrw: integer('price_monthly_krw').notNull().default(0),
  priceMonthlyUsd: text('price_monthly_usd'),  // PayPal용 (예: "6.60")
  features: jsonb('features').notNull(),  // JSON: { summary_limit_day, summary_limit_month, ... }
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. 사용자 구독 정보
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  app: text('app').notNull().default('myapp'),
  planId: text('plan_id').notNull(),
  status: text('status').notNull().default('active'),  // 'active' | 'cancelled' | 'past_due' | 'expired'
  portoneSubscriptionId: text('portone_subscription_id'),
  portoneScheduleId: text('portone_schedule_id'),  // 다음 결제 스케줄 ID
  billingKeyId: text('billing_key_id'),  // 정기결제용 빌링키
  paymentMethod: text('payment_method'),  // 'card' | 'kakaopay' | 'paypal'
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),  // null이면 해지 안함
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. 결제 내역
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull(),
  portonePaymentId: text('portone_payment_id'),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('KRW'),
  status: text('status').notNull(),  // 'paid' | 'refunded' | 'failed'
  paymentMethod: text('payment_method'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 4. 환불 요청
export const refundRequests = pgTable('refund_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull(),
  userId: text('user_id').notNull(),
  reason: text('reason').notNull(),
  refundAmount: integer('refund_amount'),
  status: text('status').notNull().default('pending'),  // 'pending' | 'approved' | 'rejected'
  adminNote: text('admin_note'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 5. 사용량 추적
export const userUsage = pgTable('user_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  usageKey: text('usage_key').notNull(),  // 'summary_count' | 'search_count'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  usedInPeriod: integer('used_in_period').notNull().default(0),
  limitInPeriod: integer('limit_in_period').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 초기 데이터 삽입 (요금제)

```sql
INSERT INTO billing_plans (id, app, name, price_monthly_krw, price_monthly_usd, features, sort_order, is_active) VALUES
('myapp_free', 'myapp', 'Free', 0, '0', '{"summary_limit_day": 5, "summary_limit_month": 10, "search_limit_month": 50}', 0, true),
('myapp_basic', 'myapp', 'Basic', 4900, '3.30', '{"summary_limit_day": null, "summary_limit_month": 60, "search_limit_month": 300}', 1, true),
('myapp_pro', 'myapp', 'Pro', 9900, '6.60', '{"summary_limit_day": null, "summary_limit_month": 150, "search_limit_month": 2000}', 2, true);
```

---

## 4. 백엔드 서비스 구현

### 4.1 관리자 설정 (server/config/admin.ts)

```typescript
const ADMIN_EMAILS_ENV = process.env.ADMIN_EMAILS || '';

export const ADMIN_EMAILS: string[] = ADMIN_EMAILS_ENV
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(email => email.length > 0);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
```

### 4.2 PortOne 서비스 핵심 메서드

```typescript
// server/services/portone.ts

class PortOneService {
  private apiUrl = 'https://api.portone.io';
  
  private getConfig() {
    const apiSecret = process.env.PORTONE_API_SECRET;
    const storeId = process.env.PORTONE_STORE_ID;
    const channelKey = process.env.PORTONE_CHANNEL_KEY;
    
    if (!apiSecret || !storeId) {
      throw new Error('PortOne configuration missing');
    }
    
    return { apiSecret, storeId, channelKey };
  }
  
  // 빌링키로 결제 실행
  async createPayment(params: {
    paymentId: string;
    billingKey: string;
    orderName: string;
    amount: number;
    currency?: string;  // 'KRW' | 'USD'
    customer: { id: string; email: string };
  }) {
    const config = this.getConfig();
    
    const response = await fetch(`${this.apiUrl}/payments/${params.paymentId}/billing-key`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingKey: params.billingKey,
        orderName: params.orderName,
        amount: { total: params.amount },
        currency: params.currency || 'KRW',
        customer: params.customer,
      }),
    });
    
    return response.json();
  }
  
  // 정기 결제 스케줄 등록
  async schedulePayment(params: {
    scheduleId: string;
    billingKey: string;
    orderName: string;
    amount: number;
    scheduledAt: Date;
    customer: { id: string; email: string };
  }) {
    const config = this.getConfig();
    
    const response = await fetch(`${this.apiUrl}/payments/${params.scheduleId}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment: {
          billingKey: params.billingKey,
          orderName: params.orderName,
          amount: { total: params.amount },
          currency: 'KRW',
          customer: params.customer,
        },
        timeToPay: params.scheduledAt.toISOString(),
      }),
    });
    
    return response.json();
  }
  
  // 스케줄 취소 (DELETE 메서드!)
  async cancelSchedule(scheduleId: string) {
    const config = this.getConfig();
    
    const response = await fetch(`${this.apiUrl}/payment-schedules/${scheduleId}`, {
      method: 'DELETE',  // POST가 아니라 DELETE!
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
      },
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error('스케줄 취소 실패');
    }
  }
  
  // 결제 취소 (환불)
  async cancelPayment(paymentId: string, reason: string) {
    const config = this.getConfig();
    
    const response = await fetch(`${this.apiUrl}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    
    return response.json();
  }
}
```

### 4.3 API 라우트

```typescript
// server/routes/billing.ts

// 1. PortOne 설정 상태 확인
router.get('/portone/status', async (req, res) => {
  const isConfigured = await portoneService.isConfigured();
  res.json({ configured: isConfigured });
});

// 2. 프론트엔드용 설정 정보 (인증 필요)
router.get('/portone/config', authMiddleware, async (req, res) => {
  res.json({
    storeId: process.env.PORTONE_STORE_ID,
    channelKey: process.env.PORTONE_CHANNEL_KEY,
    paypalChannelKey: process.env.PORTONE_PAYPAL_CHANNEL_KEY || null,
    kakaopayChannelKey: process.env.PORTONE_KAKAOPAY_CHANNEL_KEY || null,
  });
});

// 3. 구독 시작 (빌링키로 첫 결제)
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { planId, billingKey, paymentMethod } = req.body;
  const result = await billingService.createSubscription({
    userId: req.user.id,
    userEmail: req.user.email,
    planId,
    billingKey,
    paymentMethod,
  });
  res.json(result);
});

// 4. 구독 해지 (다음 결제 중단, 현재 플랜 유지!)
router.post('/cancel', authMiddleware, async (req, res) => {
  const subscription = await billingService.getUserSubscription(req.user.id);
  
  // ⚠️ 중요: canceledAt만 설정, 플랜은 유지!
  await portoneService.cancelSubscription(subscription.id, req.user.email);
  
  res.json({ 
    message: `구독 해지가 예약되었습니다. ${subscription.currentPeriodEnd}까지 현재 플랜을 이용하실 수 있습니다.`
  });
});

// 5. 환불 요청
router.post('/refund-request', authMiddleware, async (req, res) => {
  const { reason } = req.body;
  const result = await billingService.createRefundRequest(req.user.id, reason);
  res.json(result);
});

// 6. 관리자: 환불 승인 (이때만 Free 플랜 전환!)
router.post('/admin/refunds/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { adminNote, refundAmount } = req.body;
  
  // 1. PortOne API로 실제 결제 취소
  const refundRequest = await storage.getRefundRequest(id);
  const payment = await storage.getPaymentTransactionBySubscriptionId(refundRequest.subscriptionId);
  await portoneService.cancelPayment(payment.portonePaymentId, adminNote || 'Admin approved refund');
  
  // 2. 이때만 Free 플랜 전환!
  await billingService.cancelSubscription(refundRequest.subscriptionId);
  
  // 3. 환불 요청 상태 업데이트
  await storage.updateRefundRequest(id, { status: 'approved', adminNote, processedAt: new Date() });
  
  res.json({ success: true });
});

// 7. Webhook 수신
router.post('/webhook', async (req, res) => {
  await portoneService.handleWebhook(req.body);
  res.json({ received: true });
});
```

### 4.4 이메일 서비스 (Resend)

```typescript
// server/services/email.ts

class EmailService {
  private fromEmail = 'YourApp <noreply@resend.dev>';
  
  async send(options: { to: string; subject: string; html: string }) {
    const apiKey = process.env.RESEND_API_KEY;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });
    
    return response.json();
  }
  
  async sendPaymentConfirmation(params: {
    to: string;
    planName: string;
    amount: number;
    nextBillingDate: Date;
  }) {
    const html = `... 결제 완료 이메일 HTML ...`;
    return this.send({
      to: params.to,
      subject: `[앱이름] ${params.planName} 결제 완료`,
      html,
    });
  }
  
  async sendSubscriptionCanceled(params: {
    to: string;
    planName: string;
    expiryDate: Date;
  }) {
    const html = `... 해지 안내 이메일 HTML ...`;
    return this.send({
      to: params.to,
      subject: `[앱이름] 구독 해지 예정 안내`,
      html,
    });
  }
}

export const emailService = new EmailService();
```

---

## 5. 프론트엔드 구현

### 5.1 PortOne SDK 로드

```typescript
// HTML head에 SDK 스크립트 추가 (index.html)
<script src="https://cdn.portone.io/v2/browser-sdk.js"></script>

// TypeScript 타입 선언
declare global {
  interface Window {
    PortOne?: {
      requestIssueBillingKey: (params: any) => Promise<any>;
      loadIssueBillingKeyUI: (params: any, callbacks: any) => Promise<void>;
    };
  }
}

// SDK 로드 대기 함수
const waitForPortOne = (): Promise<typeof window.PortOne> => {
  return new Promise((resolve, reject) => {
    if (window.PortOne) {
      resolve(window.PortOne);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (window.PortOne) {
        clearInterval(interval);
        resolve(window.PortOne);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error('PortOne SDK 로드 실패'));
      }
    }, 100);
  });
};
```

### 5.2 카드 / 카카오페이 빌링키 발급

```typescript
const handlePayment = async () => {
  const PortOne = await waitForPortOne();
  
  // 결제 방법에 따라 설정
  let channelKey: string;
  let billingKeyMethod: string;
  
  if (paymentMethod === 'kakaopay') {
    channelKey = portoneConfig.kakaopayChannelKey!;
    billingKeyMethod = 'EASY_PAY';
  } else {
    channelKey = portoneConfig.channelKey;
    billingKeyMethod = 'CARD';
  }
  
  // 고유한 issueId 생성 (중요!)
  const issueId = `app_${paymentMethod}_${userId.slice(0, 8)}_${Date.now().toString(36)}`;
  
  const requestParams: any = {
    storeId: portoneConfig.storeId,
    channelKey,
    billingKeyMethod,
    issueId,
    issueName: `앱이름 ${planName} 정기구독`,
    customer: {
      customerId: user.id,
      email: user.email,
      phoneNumber: customerPhone,
      fullName: user.displayName || user.email.split('@')[0],
    },
  };
  
  // 카카오페이 전용 설정 (필수!)
  if (paymentMethod === 'kakaopay') {
    requestParams.windowType = {
      pc: 'IFRAME',      // PC는 IFRAME만 지원
      mobile: 'REDIRECTION'  // 모바일은 REDIRECTION만 지원
    };
    requestParams.redirectUrl = window.location.href;
  }
  
  const response = await PortOne.requestIssueBillingKey(requestParams);
  
  if (response.code) {
    toast.error(response.message || '결제 등록 실패');
    return;
  }
  
  // 성공: billingKey로 구독 시작 API 호출
  await subscribeMutation.mutateAsync({
    planId: selectedPlan,
    billingKey: response.billingKey,
    paymentMethod,
  });
};
```

### 5.3 PayPal 빌링키 발급 (특수 처리)

```typescript
// PayPal은 loadIssueBillingKeyUI 사용 (버튼 렌더링 방식)
// React DOM 충돌 방지를 위해 수동으로 DOM 요소 관리 필수!

const paypalContainerRef = useRef<HTMLDivElement>(null);
const paypalHostRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (paymentMethod !== 'paypal' || !showCheckoutDialog) return;
  
  let isMounted = true;
  let hostElement: HTMLDivElement | null = null;
  
  const renderPaypalButton = async () => {
    const PortOne = await waitForPortOne();
    if (!PortOne.loadIssueBillingKeyUI || !paypalContainerRef.current) return;
    
    // React 외부에서 관리할 DOM 요소 생성 (중요!)
    hostElement = document.createElement('div');
    hostElement.className = 'portone-ui-container';
    hostElement.style.minHeight = '50px';
    paypalContainerRef.current.appendChild(hostElement);
    paypalHostRef.current = hostElement;
    
    const issueId = `app_paypal_${userId.slice(0, 8)}_${Date.now().toString(36)}`;
    
    await PortOne.loadIssueBillingKeyUI(
      {
        uiType: 'PAYPAL_RT',
        storeId: portoneConfig.storeId,
        channelKey: portoneConfig.paypalChannelKey!,
        issueId,
        issueName: `앱이름 ${planName} 정기구독`,
        customer: {
          customerId: user.id,
          email: user.email,
          fullName: user.displayName,
        },
      },
      {
        onIssueBillingKeySuccess: handlePaypalSuccess,
        onIssueBillingKeyFail: handlePaypalFail,
      }
    );
  };
  
  const timeout = setTimeout(renderPaypalButton, 500);
  
  return () => {
    isMounted = false;
    clearTimeout(timeout);
    // React unmount 전에 수동으로 DOM 정리 (필수!)
    if (hostElement && hostElement.parentNode) {
      hostElement.parentNode.removeChild(hostElement);
    }
    if (paypalHostRef.current && paypalHostRef.current.parentNode) {
      paypalHostRef.current.parentNode.removeChild(paypalHostRef.current);
    }
    paypalHostRef.current = null;
  };
}, [paymentMethod, showCheckoutDialog, user, selectedPlan, portoneConfig]);
```

### 5.4 결제 UI (결제 수단 선택)

```tsx
<div className="grid grid-cols-3 gap-2">
  {/* 카드 */}
  <button
    onClick={() => setPaymentMethod('card')}
    className={paymentMethod === 'card' ? 'border-primary' : ''}
  >
    💳 카드
  </button>
  
  {/* 카카오페이 */}
  <button
    onClick={() => setPaymentMethod('kakaopay')}
    disabled={!portoneConfig?.kakaopayChannelKey}
  >
    🟡 카카오페이
  </button>
  
  {/* PayPal */}
  <button
    onClick={() => setPaymentMethod('paypal')}
    disabled={!portoneConfig?.paypalChannelKey}
  >
    💙 PayPal
  </button>
</div>

{/* PayPal 버튼 컨테이너 */}
{paymentMethod === 'paypal' && (
  <div ref={paypalContainerRef} className="min-h-[50px]">
    {!isPaypalButtonRendered && <Loader2 className="animate-spin" />}
  </div>
)}
```

---

## 6. 결제 수단별 특이사항

### 6.1 KG이니시스 (카드)

| 항목 | 내용 |
|------|------|
| billingKeyMethod | `'CARD'` |
| 인증 방식 | SMS 인증 (PASS 별도 계약 필요) |
| 테스트 MID | `INIBillTst` |
| 테스트 환경 | SMS 미발송 (실서비스 MID 필요) |

### 6.2 카카오페이

| 항목 | 내용 |
|------|------|
| billingKeyMethod | `'EASY_PAY'` |
| windowType 필수 | `{ pc: 'IFRAME', mobile: 'REDIRECTION' }` |
| redirectUrl | PC에서도 필수 설정 |
| issueName | 필수 (구독 설명) |

**주의:** windowType 미설정 시 에러 발생!

### 6.3 PayPal (RT)

| 항목 | 내용 |
|------|------|
| 발급 방식 | `loadIssueBillingKeyUI` (버튼 렌더링) |
| uiType | `'PAYPAL_RT'` |
| RT 승인 | PayPal Business 계정에서 별도 승인 필요 |
| Sandbox OTP | `123456` 또는 별도 설정된 코드 |
| 통화 | USD (환불 시 3% 수수료) |

**주의사항:**
- React DOM 충돌 방지를 위해 수동 DOM 관리 필수
- Sandbox에서는 SMS 미발송
- 한국 사업자는 RT 승인 절차 필요

---

## 7. 정기결제 스케줄 관리 (핵심!)

> ⚠️ **이 섹션은 매우 중요합니다!** 이 부분을 잘못 구현하면 2개월 후부터 자동결제가 안 됩니다.

### 7.1 PortOne V2 스케줄 동작 원리

**핵심 개념:** PortOne V2의 정기결제 스케줄은 **1회성**입니다. 즉, 한 번 스케줄을 등록하면 해당 날짜에 1회만 결제가 실행됩니다. 매월 자동결제를 위해서는 **매번 다음 달 스케줄을 새로 등록**해야 합니다.

```
1월 1일: 첫 결제 + 2월 스케줄 등록
    ↓
2월 1일: PortOne이 스케줄 실행 (자동) → Webhook 수신 → 3월 스케줄 등록 (필수!)
    ↓
3월 1일: PortOne이 스케줄 실행 (자동) → Webhook 수신 → 4월 스케줄 등록 (필수!)
    ↓
... 무한 반복
```

### 7.2 PortOne V2 스케줄 API 엔드포인트

> ⚠️ **주의:** PortOne V2 문서가 혼란스럽습니다. 아래가 **실제 동작하는** 엔드포인트입니다.

| 기능 | HTTP 메서드 | 엔드포인트 |
|------|-----------|-----------|
| 스케줄 등록 | `POST` | `/payments/{paymentId}/schedule` |
| 스케줄 조회 | `GET` | `/payments/{paymentId}/schedule` |
| 스케줄 취소 | `DELETE` | `/payment-schedules/{scheduleId}` |

```typescript
// 스케줄 등록 (올바른 방법)
async schedulePayment(params: {
  paymentId: string;      // 고유한 결제 ID (예: payment_sub123_1701234567)
  billingKey: string;
  orderName: string;
  amount: number;
  scheduledAt: Date;
  customer: { id: string; email?: string };
}) {
  const response = await fetch(
    `${this.apiUrl}/payments/${params.paymentId}/schedule`,
    {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment: {
          billingKey: params.billingKey,
          orderName: params.orderName,
          amount: { total: params.amount },
          currency: 'KRW',
          customer: params.customer,
        },
        timeToPay: params.scheduledAt.toISOString(),
      }),
    }
  );
  
  const data = await response.json();
  return {
    scheduleId: data.schedule?.id || params.paymentId,
    ...data,
  };
}

// 스케줄 취소 (올바른 방법)
async cancelSchedule(scheduleId: string) {
  // DELETE 메서드 사용!
  const response = await fetch(
    `${this.apiUrl}/payment-schedules/${scheduleId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
      },
    }
  );
  
  if (!response.ok && response.status !== 404) {
    throw new Error('스케줄 취소 실패');
  }
}
```

### 7.3 스케줄 상태 (Schedule Status)

| 상태 | 의미 | 취소 가능 |
|------|------|----------|
| `SCHEDULED` | 예약됨, 아직 실행 안 됨 | ✅ 가능 |
| `SUCCEEDED` | 결제 완료됨 | ❌ 불가능 (이미 실행) |
| `REVOKED` | 취소됨 | ❌ 불가능 (이미 취소) |
| `FAILED` | 결제 실패 | ❌ 불가능 |

### 7.4 Webhook에서 다음 스케줄 등록 (필수!)

**❌ 잘못된 구현 (2개월 후 자동결제 중단):**
```typescript
private async handlePaymentPaid(data: any): Promise<void> {
  // 구독 기간만 갱신하고 끝
  await billingService.updateSubscription(subscriptionId, {
    currentPeriodEnd: nextMonth,
    status: 'active',
  });
  // ❌ 다음 스케줄 미등록!
}
```

**✅ 올바른 구현 (영구 자동결제):**
```typescript
private async handlePaymentPaid(data: any): Promise<void> {
  const subscription = await billingService.getSubscriptionById(subscriptionId);
  
  // 1. 해지 요청된 구독인지 확인
  if (subscription.canceledAt) {
    console.log('[Webhook] Subscription is canceled, not scheduling next payment');
    return;  // 다음 스케줄 등록 안함 → 이번이 마지막 결제
  }
  
  // 2. 구독 기간 갱신
  const nextPeriodStart = new Date();
  const nextPeriodEnd = new Date(nextPeriodStart);
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
  
  // 3. 다음 달 결제 스케줄 등록 (핵심!)
  const nextScheduleId = `payment_${subscriptionId}_${Date.now()}`;
  await portoneService.schedulePayment({
    paymentId: nextScheduleId,
    billingKey: subscription.billingKeyId,
    orderName: `${planName} 정기결제`,
    amount: plan.priceMonthlyKrw,
    scheduledAt: nextPeriodEnd,
    customer: { id: subscription.userId, email: userEmail },
  });
  
  // 4. DB 업데이트 (새 스케줄 ID 저장!)
  await billingService.updateSubscription(subscriptionId, {
    currentPeriodStart: nextPeriodStart,
    currentPeriodEnd: nextPeriodEnd,
    portoneScheduleId: nextScheduleId,  // 새 스케줄 ID 저장!
    status: 'active',
  });
}
```

---

## 8. 구독 해지 vs 환불 - 핵심 개념 분리 (CRITICAL!)

> ⚠️ **이 섹션이 가장 중요합니다!** 구독 해지와 환불을 혼동하면 심각한 버그가 발생합니다.

### 8.1 개념 비교표

| 기능 | 구독 해지 (Cancel) | 환불 (Refund) |
|------|-------------------|---------------|
| **트리거** | 사용자가 "구독 해지" 버튼 클릭 | 관리자가 환불 요청 승인 |
| **결제 취소** | ❌ 안함 (이미 결제된 금액 유지) | ✅ 실제 결제 취소 |
| **현재 플랜** | ✅ 유지 (currentPeriodEnd까지) | ❌ 즉시 Free 전환 |
| **사용량 한도** | ✅ 유지 | Free 플랜 한도로 변경 |
| **다음 결제** | ❌ 중단 (스케줄 취소) | ❌ 중단 |
| **DB 변경** | `canceledAt` 설정만 | `status='cancelled'`, `planId='free'` |

### 8.2 잘못된 구현 (버그 원인)

```typescript
// ❌ 잘못된 구현 - 구독 해지에서 즉시 Free 전환
router.post('/cancel', async (req, res) => {
  await portoneService.cancelSubscription(subscriptionId);
  await billingService.cancelSubscription(subscriptionId); // ❌ 이거 하면 안됨!
});
```

### 8.3 올바른 구현

```typescript
// ✅ 올바른 구현 - 구독 해지
router.post('/cancel', async (req, res) => {
  // canceledAt 설정 + 다음 결제 스케줄 취소만
  // 현재 플랜/사용량은 그대로 유지!
  await portoneService.cancelSubscription(subscriptionId, userEmail);
  
  res.json({ 
    message: `구독 해지가 예약되었습니다. ${periodEndDate}까지 현재 플랜을 이용하실 수 있습니다.`
  });
});

// ✅ 올바른 구현 - 환불 승인 (관리자)
router.post('/admin/refunds/:id/approve', async (req, res) => {
  // 1. PortOne API로 실제 결제 취소
  await portoneService.cancelPayment(paymentId, reason);
  
  // 2. 이때만 Free 플랜 전환 + 사용량 한도 업데이트
  await billingService.cancelSubscription(subscriptionId);
});
```

### 8.4 핵심 함수 역할 분리

#### portoneService.cancelSubscription()
```typescript
// 역할: 다음 자동결제 중단 + canceledAt 설정
// 현재 플랜은 유지함!
async cancelSubscription(subscriptionId: string, userEmail?: string) {
  // 1. canceledAt만 설정 (status, planId 변경 안함!)
  await db.update(userSubscriptions)
    .set({ canceledAt: new Date() })
    .where(eq(userSubscriptions.id, subscriptionId));
  
  // 2. 예정된 다음 결제 스케줄 취소
  if (subscription.portoneScheduleId) {
    await this.cancelSchedule(subscription.portoneScheduleId);
  }
  
  // 3. 해지 예정 이메일 발송
  await emailService.sendSubscriptionCanceled({...});
}
```

#### billingService.cancelSubscription()
```typescript
// 역할: 즉시 Free 플랜 전환 + 사용량 한도 업데이트
// 환불 승인 시에만 호출!
async cancelSubscription(subscriptionId: string) {
  // 1. 구독을 Free 플랜으로 변경
  await db.update(userSubscriptions)
    .set({ 
      status: 'cancelled',
      planId: 'vidhub_free',
      canceledAt: new Date()
    })
    .where(eq(userSubscriptions.id, subscriptionId));
  
  // 2. 사용량 한도를 Free 플랜 기준으로 업데이트
  const freePlan = await this.getPlanById('vidhub_free');
  await this.updateUserUsageLimits(userId, freePlan);
}
```

### 8.5 함수 호출 시점 정리

| 상황 | portoneService.cancelSubscription | billingService.cancelSubscription |
|------|-----------------------------------|-----------------------------------|
| 구독 해지 버튼 클릭 | ✅ 호출 | ❌ 호출 안함 |
| 환불 요청 승인 | - | ✅ 호출 |
| currentPeriodEnd 도달 시 (스케줄러) | - | ✅ 호출 |

---

## 9. 환불 정책 (한국 전자상거래법 준수)

### 9.1 환불 정책 규칙

| 조건 | 환불율 | 비고 |
|------|--------|------|
| 결제 후 7일 이내 + 미사용 | 100% | 청약철회 기간 |
| 결제 후 7일 이내 + 일부 사용 | 일할 계산 | 사용일수 차감 |
| 결제 후 7일 초과 | 일할 계산 | 잔여 기간 기준 |
| PayPal 결제 | 환불액 - 3% | PayPal 수수료 |

### 9.2 환불 계산 함수

```typescript
async calculateRefundAmount(subscriptionId: string) {
  const subscription = await this.getSubscriptionById(subscriptionId);
  const payment = await storage.getPaymentTransactionBySubscriptionId(subscriptionId);
  
  const now = new Date();
  const paymentDate = new Date(payment.createdAt);
  const periodEnd = new Date(subscription.currentPeriodEnd);
  
  const daysSincePayment = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((periodEnd - paymentDate) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalDays - daysSincePayment);
  
  // 7일 이내 전액 환불 (청약철회)
  if (daysSincePayment <= 7) {
    return {
      refundAmount: payment.amount,
      refundType: 'full',
      reason: '청약철회 (7일 이내)'
    };
  }
  
  // 일할 계산
  const dailyRate = payment.amount / totalDays;
  const refundAmount = Math.floor(dailyRate * remainingDays);
  
  return {
    refundAmount,
    refundType: 'partial',
    reason: `일할 계산: ${remainingDays}일 잔여`
  };
}
```

### 9.3 악용 방지 정책

```typescript
// 환불 시 사용량은 유지 (Free 한도 적용)
// 결제 → 사용 → 환불 → 리셋 악용 방지
async cancelSubscription(subscriptionId: string) {
  // 플랜은 Free로 전환
  await db.update(userSubscriptions).set({ planId: 'vidhub_free' });
  
  // 사용량 한도만 Free로 변경 (사용량 자체는 유지!)
  await db.update(userUsage).set({ 
    limitInPeriod: freePlan.features.summary_limit_month 
  });
  // usedInPeriod는 리셋 안함!
}
```

---

## 10. 업그레이드 시 자동 환불 로직

### 10.1 문제 상황
- 사용자가 Basic(₩4,900) 결제 → 바로 Pro(₩9,900)로 업그레이드
- Basic 결제금이 플랫폼에 귀속되면 안됨 → 자동 환불 필요

### 10.2 구현

```typescript
async createSubscription(params) {
  // 1. 기존 구독 확인
  const existingSubscription = await this.getUserSubscription(params.userId);
  let upgradeRefundResult = null;
  
  // 2. 유료 → 유료 업그레이드인 경우 기존 결제 환불
  if (existingSubscription && !existingSubscription.planId.includes('free')) {
    const lastPayment = await storage.getPaymentTransactionBySubscriptionId(
      existingSubscription.id
    );
    
    if (lastPayment && lastPayment.status !== 'refunded') {
      try {
        // PortOne API로 환불
        await portoneService.cancelPayment(
          lastPayment.portonePaymentId,
          `업그레이드로 인한 자동 환불: ${existingSubscription.planId} → ${params.planId}`
        );
        
        // PayPal 수수료 로깅
        if (lastPayment.paymentMethod === 'paypal') {
          const fee = lastPayment.amount * 0.03;
          console.log(`[Billing] PayPal refund fee: ${fee} USD`);
        }
        
        upgradeRefundResult = { success: true, refundedAmount: lastPayment.amount };
      } catch (error) {
        upgradeRefundResult = { success: false, error: error.message };
        // 환불 실패해도 업그레이드는 진행 (로깅 후 수동 처리)
      }
    }
  }
  
  // 3. 새 구독 생성
  const newSubscription = await this.processNewSubscription(params);
  
  return { ...newSubscription, upgradeRefundResult };
}
```

### 10.3 결제 조회 함수 (storage.ts)

```typescript
// 환불되지 않은 마지막 결제 조회
async getPaymentTransactionBySubscriptionId(subscriptionId: string) {
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(and(
      eq(paymentTransactions.subscriptionId, subscriptionId),
      ne(paymentTransactions.status, 'refunded')  // 이미 환불된 건 제외
    ))
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(1);
  return transaction;
}
```

---

## 11. PG사 심사 필수 페이지

KG이니시스 등 PG사 심사 통과를 위해 필수로 포함해야 하는 페이지:

### 11.1 이용약관 (`/terms`)

```markdown
# 이용약관

## 제1조 (목적)
본 약관은 [회사명]이 운영하는 [서비스명]의 서비스 이용에 관한 조건과 절차를 규정합니다.

## 제2조 (정의)
1. "서비스"란 [서비스 설명]
2. "회원"이란 [회원 정의]
...
```

### 11.2 개인정보처리방침 (`/privacy`)

```markdown
# 개인정보처리방침

## 1. 수집하는 개인정보 항목
- 이메일, 비밀번호 (회원가입 시)
- 결제 정보 (결제 시)
...

## 2. 개인정보의 수집 및 이용목적
...

## 3. 개인정보의 보유 및 이용기간
...
```

### 11.3 환불정책 (`/refund`)

```markdown
# 환불정책

## 환불 가능 조건
1. 결제 후 7일 이내 청약철회 가능
2. 서비스 이용 전 100% 환불
3. 일부 이용 시 일할 계산 환불
...

## 환불 절차
1. 마이페이지에서 환불 요청
2. 관리자 검토 후 승인/거부
3. 승인 시 원결제수단으로 환불
```

### 11.4 Footer 필수 정보

```tsx
<footer className="text-sm text-gray-600">
  <p>상호명: [회사명] | 대표: [대표자명]</p>
  <p>사업자등록번호: 000-00-00000</p>
  <p>통신판매업신고: 제0000-서울XX-0000호</p>
  <p>주소: [사업장 주소]</p>
  <p>이메일: support@example.com | 전화: 02-0000-0000</p>
  <a href="/terms">이용약관</a> | <a href="/privacy">개인정보처리방침</a> | <a href="/refund">환불정책</a>
</footer>
```

### 11.5 결제 전 동의 체크박스

```tsx
<div className="space-y-2">
  <label className="flex items-center gap-2">
    <Checkbox 
      checked={agreedToTerms} 
      onCheckedChange={setAgreedToTerms}
      required
    />
    <span>[필수] 이용약관 및 결제에 동의합니다</span>
  </label>
  
  <label className="flex items-center gap-2">
    <Checkbox 
      checked={agreedToRefund} 
      onCheckedChange={setAgreedToRefund}
      required
    />
    <span>[필수] 환불정책을 확인하였습니다</span>
  </label>
</div>

<Button 
  onClick={handlePayment}
  disabled={!agreedToTerms || !agreedToRefund}
>
  결제하기
</Button>
```

---

## 12. 테스트 환경 주의사항

### 12.1 PG사별 테스트 환경 제한

| PG사 | 테스트 제한 | 해결 방법 |
|------|-----------|----------|
| KG이니시스 | SMS 미발송 | 실서비스 MID 발급 또는 PortOne 문의 |
| 카카오페이 | - | 대부분 정상 동작 |
| PayPal | Sandbox 계정 필요 | developer.paypal.com에서 테스트 계정 생성 |

### 12.2 관리자 1원 테스트 결제

```typescript
// 실제 결제 처리 전에 관리자 여부 확인
const isTestPayment = isAdminEmail(params.userEmail);
const actualAmount = isTestPayment ? 1 : plan.priceMonthlyKrw;

if (isTestPayment) {
  console.log(`[PortOne] Admin test payment: ${params.userEmail} - 1원`);
}
```

### 12.3 구독 취소 테스트

```typescript
// 구독 취소 시 즉시 해지가 아닌 "기간 종료 후 해지"
await db
  .update(userSubscriptions)
  .set({
    canceledAt: new Date(),  // 취소 요청 시간만 기록
    // status는 active 유지 → 기간 종료 후 expired로 변경
  })
  .where(eq(userSubscriptions.id, subscriptionId));

// 다음 정기결제 스케줄 취소
await portoneService.cancelSchedule(scheduleId);
```

---

## 13. 관리자 기능

### 13.1 스케줄 조회/취소 (PortOne 대시보드 없이)

```typescript
// server/routes/billing.ts

// 스케줄 조회
router.get('/admin/schedule/:scheduleId', authMiddleware, adminMiddleware, async (req, res) => {
  const { scheduleId } = req.params;
  const schedule = await portoneService.getSchedule(scheduleId);
  
  if (!schedule) {
    return res.status(404).json({ message: '스케줄을 찾을 수 없습니다.' });
  }
  
  res.json({ 
    success: true, 
    schedule: {
      id: schedule.id,
      status: schedule.status,      // SCHEDULED | SUCCEEDED | REVOKED | FAILED
      orderName: schedule.orderName,
      timeToPay: schedule.timeToPay,
      totalAmount: schedule.totalAmount,
    }
  });
});

// 스케줄 취소
router.post('/admin/cancel-schedule', authMiddleware, adminMiddleware, async (req, res) => {
  const { scheduleId } = req.body;
  
  if (!scheduleId) {
    return res.status(400).json({ message: 'scheduleId is required' });
  }
  
  await portoneService.cancelSchedule(scheduleId);
  res.json({ success: true, message: `스케줄이 취소되었습니다: ${scheduleId}` });
});
```

### 13.2 스케줄 조회 서비스 메서드

```typescript
// server/services/portone.ts

async getSchedule(scheduleId: string) {
  const config = this.getConfig();
  
  const response = await fetch(
    `${this.apiUrl}/payments/${scheduleId}/schedule`,
    {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
      },
    }
  );
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`스케줄 조회 실패: ${response.status}`);
  }
  
  const data = await response.json();
  return data.schedule;
}
```

### 13.3 주의사항

- **SCHEDULED** 상태만 취소 가능
- **SUCCEEDED** 상태는 이미 결제 완료 → 환불 처리 필요
- **REVOKED** 상태는 이미 취소됨
- 스케줄 ID는 `user_subscriptions.portoneScheduleId`에서 확인

---

## 14. 일반적인 실수와 해결책

### 14.1 portoneSubscriptionId vs 내부 DB ID 혼동

```typescript
// ❌ 잘못된 예 - 외부 ID로 DB 조회
await db.select().from(userSubscriptions)
  .where(eq(userSubscriptions.id, portoneSubscriptionId));  // 에러!

// ✅ 올바른 예 - 내부 DB ID로 조회
await db.select().from(userSubscriptions)
  .where(eq(userSubscriptions.id, internalSubscriptionId));

// 또는 외부 ID로 조회하려면
await db.select().from(userSubscriptions)
  .where(eq(userSubscriptions.portoneSubscriptionId, portoneSubscriptionId));
```

### 14.2 함수가 내부 ID를 받는지 외부 ID를 받는지 명확히

```typescript
// 함수 시그니처에 명확히 표시
async cancelSubscription(
  subscriptionId: string,  // 내부 DB ID (uuid)
  userEmail?: string
) {
  // 내부에서 lookup 후 portoneScheduleId 사용
  const [subscription] = await db.select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.id, subscriptionId));
  
  if (subscription.portoneScheduleId) {
    await this.cancelSchedule(subscription.portoneScheduleId);
  }
}
```

### 14.3 구독 해지 후 UI 미반영

```typescript
// 문제: 구독 해지 API 성공 후 프론트엔드에서 상태가 안 바뀜
// 원인: React Query 캐시 무효화 안함

// ✅ 해결: 캐시 무효화 필수
const cancelMutation = useMutation({
  mutationFn: async () => {
    await apiRequest('POST', '/api/billing/cancel');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
    queryClient.invalidateQueries({ queryKey: ['/api/billing/quota'] });
    toast.success('구독이 해지되었습니다');
  }
});
```

### 14.4 PortOne 스케줄 취소 실패

```typescript
// 문제: 스케줄 ID가 없거나 이미 취소된 경우
// 해결: 방어적 처리

if (subscription.portoneScheduleId) {
  try {
    await this.cancelSchedule(subscription.portoneScheduleId);
  } catch (e) {
    console.error('[PortOne] Failed to cancel scheduled payment:', e);
    // 스케줄 취소 실패해도 해지는 진행
  }
} else {
  console.log('[PortOne] No scheduled payment found to cancel');
}
```

### 14.5 status 문자열 불일치

```typescript
// ❌ 문제: 'canceled' vs 'cancelled' 혼용
if (subscription.status === 'canceled') { ... }  // 어떤 코드
if (subscription.status === 'cancelled') { ... } // 다른 코드

// ✅ 해결: 프로젝트 전체에서 'cancelled' 통일
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',  // 'canceled' 아님!
  PAST_DUE: 'past_due',
  PENDING: 'pending'
} as const;
```

---

## 15. 체크리스트

### 사전 준비
- [ ] PortOne 콘솔 스토어 생성
- [ ] KG이니시스 정기결제 채널 추가
- [ ] 카카오페이 정기결제 채널 추가
- [ ] PayPal RT 채널 추가 (선택)
- [ ] Resend 계정 생성 및 API 키 발급

### 환경 변수
- [ ] `PORTONE_API_SECRET` 설정
- [ ] `PORTONE_STORE_ID` 설정
- [ ] `PORTONE_CHANNEL_KEY` 설정
- [ ] `PORTONE_KAKAOPAY_CHANNEL_KEY` 설정
- [ ] `PORTONE_PAYPAL_CHANNEL_KEY` 설정 (선택)
- [ ] `RESEND_API_KEY` 설정
- [ ] `ADMIN_EMAILS` 설정

### 데이터베이스
- [ ] `billing_plans` 테이블 생성
- [ ] `user_subscriptions` 테이블 생성
- [ ] `payment_transactions` 테이블 생성
- [ ] `refund_requests` 테이블 생성
- [ ] `user_usage` 테이블 생성
- [ ] 초기 요금제 데이터 삽입

### 백엔드
- [ ] PortOne 서비스 구현
- [ ] Billing 서비스 구현 (구독 해지 vs 환불 분리!)
- [ ] Billing 라우트 구현
- [ ] Email 서비스 구현
- [ ] Admin 설정 구현
- [ ] Webhook 엔드포인트 구현
- [ ] Webhook에서 다음 스케줄 등록 로직 (섹션 7.4 필수!)
- [ ] 구독 해지 시 스케줄 취소 로직 (플랜은 유지!)
- [ ] 환불 승인 시에만 Free 플랜 전환
- [ ] 업그레이드 시 자동 환불 로직
- [ ] 관리자 스케줄 조회/취소 API

### 프론트엔드
- [ ] PortOne SDK 로드
- [ ] 결제 수단 선택 UI
- [ ] 카드 빌링키 발급 구현
- [ ] 카카오페이 빌링키 발급 구현
- [ ] PayPal 버튼 렌더링 구현
- [ ] 결제 성공/실패 처리
- [ ] 구독 해지 후 캐시 무효화

### PG사 심사
- [ ] 이용약관 페이지
- [ ] 개인정보처리방침 페이지
- [ ] 환불정책 페이지
- [ ] Footer에 사업자 정보
- [ ] 결제 전 동의 체크박스

### 테스트
- [ ] 구독 해지 시 플랜 유지 확인
- [ ] 환불 승인 시 Free 플랜 전환 확인
- [ ] 업그레이드 시 자동 환불 확인
- [ ] PayPal 환불 3% 수수료 로깅 확인
- [ ] 카드 결제 테스트
- [ ] 카카오페이 결제 테스트
- [ ] PayPal 결제 테스트 (Sandbox)
- [ ] 이메일 발송 테스트
- [ ] 관리자 1원 결제 테스트

---

## 16. 개발 대원칙

### 16.1 절대 준수 원칙

| 원칙 | 설명 | 위반 시 조치 |
|------|------|-------------|
| **🚫 하드코딩 금지** | 모든 마스터 데이터는 DB 테이블로 관리 | 코드 리뷰 거부 |
| **🛡️ 기존 기능 보존** | 정상 작동 중인 기능 절대 삭제/변경 금지 | 롤백 후 재작업 |
| **📦 추가 전용 개발** | 새 기능은 기존 코드 수정 없이 추가 방식으로 | 별도 파일/함수로 분리 |
| **🔧 관리자 UI 필수** | 설정값은 반드시 관리자 화면에서 변경 가능하게 | DB + Admin API 필수 |

### 16.2 Replit Agent 경고 사항

```
⚠️ 주의: Replit Agent는 다음 행동을 하려는 경향이 있음

1. ❌ 새 기능 추가 시 기존 소스코드를 완전히 재작성
2. ❌ "더 나은 구조"라는 명목으로 작동 중인 기능 삭제
3. ❌ 하드코딩된 배열/객체로 마스터 데이터 정의
4. ❌ 관리자 기능 없이 코드 직접 수정으로만 설정 변경 가능하게 구현

→ 이러한 행동 발생 시 즉시 롤백하고 원칙에 맞게 재구현
```

---

## 부록: 자주 발생하는 에러

### 1. "알려지지 않은 credential" 에러
- **원인:** PortOne 콘솔에서 채널 설정 불일치
- **해결:** 채널 키가 올바른 PG사와 연결되어 있는지 확인

### 2. "NotFoundError: removeChild" (React DOM 충돌)
- **원인:** PayPal SDK가 DOM을 수정하고 React가 같은 DOM을 관리
- **해결:** PayPal 컨테이너를 React 외부에서 수동 관리

### 3. SMS 인증 코드 미수신
- **원인:** 테스트 MID는 SMS 미발송
- **해결:** 실서비스 MID 발급 또는 PortOne에 테스트 환경 문의

### 4. 카카오페이 windowType 에러
- **원인:** windowType 미설정 또는 잘못된 값
- **해결:** `{ pc: 'IFRAME', mobile: 'REDIRECTION' }` 필수 설정

### 5. PayPal "카드 입력으로 이동"
- **원인:** Sandbox 계정에 결제 수단 미등록
- **해결:** developer.paypal.com에서 테스트 계정에 잔액/카드 등록

### 6. 스케줄 취소 실패 (404 또는 Method Not Allowed)
- **원인:** PortOne V2 스케줄 취소 API 엔드포인트 잘못 사용
- **해결:** 
  - ❌ 잘못: `POST /payment-schedules/{scheduleId}/revoke`
  - ✅ 올바름: `DELETE /payment-schedules/{scheduleId}`

### 7. 2개월 후 자동결제 중단
- **원인:** Webhook에서 다음 달 스케줄을 등록하지 않음
- **해결:** `handlePaymentPaid`에서 반드시 다음 스케줄 등록 (섹션 7.4 참조)

### 8. 해지 후에도 자동결제 계속 발생
- **원인:** Webhook에서 `canceledAt` 체크 누락
- **해결:** 
  ```typescript
  if (subscription.canceledAt) {
    return; // 갱신하지 않음
  }
  ```

### 9. 스케줄 취소 시 "이미 처리됨" 에러
- **원인:** SUCCEEDED 또는 REVOKED 상태의 스케줄 취소 시도
- **해결:** 취소 전 상태 확인, SCHEDULED 상태만 취소 가능

### 10. portoneSubscriptionId로 스케줄 조회 실패
- **원인:** paymentId와 scheduleId 혼동
- **해결:** 
  - `portoneSubscriptionId`: 결제 ID (즉시 결제용)
  - `portoneScheduleId`: 스케줄 ID (예약 결제용) - 별도 컬럼 필요

### 11. 구독 해지 시 즉시 Free 플랜 전환 버그
- **원인:** 구독 해지 API에서 `billingService.cancelSubscription()` 호출
- **해결:** 구독 해지 시에는 `portoneService.cancelSubscription()`만 호출, `billingService.cancelSubscription()`는 환불 승인 시에만!

### 12. PayPal 환불 시 수수료 미처리
- **원인:** PayPal 환불 시 3% 수수료 차감 미적용
- **해결:** 환불 로직에서 PayPal 결제 여부 확인 후 수수료 계산 및 로깅

---

> 이 문서는 VidDigest Hub 프로젝트 (2024년 12월) 기준으로 작성되었습니다.
> PortOne API 버전: V2
> 
> **최종 업데이트:** 2024년 12월 4일
> - 구독 해지 vs 환불 핵심 개념 분리 (섹션 8)
> - 환불 정책 (한국 전자상거래법 준수) (섹션 9)
> - 업그레이드 시 자동 환불 로직 (섹션 10)
> - 일반적인 실수와 해결책 확장 (섹션 14)
> - 시행착오 기반 에러 케이스 2개 추가 (부록)
