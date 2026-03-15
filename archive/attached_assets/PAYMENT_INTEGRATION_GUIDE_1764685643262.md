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
7. [PG사 심사 필수 페이지](#7-pg사-심사-필수-페이지)
8. [테스트 환경 주의사항](#8-테스트-환경-주의사항)
9. [체크리스트](#9-체크리스트)

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
# 설치 필요
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
  status: text('status').notNull().default('active'),  // 'active' | 'canceled' | 'past_due' | 'expired'
  portoneSubscriptionId: text('portone_subscription_id'),
  billingKeyId: text('billing_key_id'),  // 정기결제용 빌링키
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. 사용량 추적
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
INSERT INTO billing_plans (id, app, name, price_monthly_krw, features, sort_order, is_active) VALUES
('myapp_free', 'myapp', 'Free', 0, '{"summary_limit_day": 2, "summary_limit_month": 60, "search_limit_month": 100}', 0, true),
('myapp_basic', 'myapp', 'Basic', 4900, '{"summary_limit_day": null, "summary_limit_month": 150, "search_limit_month": 1000}', 1, true),
('myapp_pro', 'myapp', 'Pro', 9900, '{"summary_limit_day": null, "summary_limit_month": 500, "search_limit_month": 5000}', 2, true);
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
  
  // PortOne API 설정 가져오기
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
        currency: 'KRW',
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
  
  // 스케줄 취소
  async cancelSchedule(scheduleId: string) {
    const config = this.getConfig();
    
    await fetch(`${this.apiUrl}/payments/${scheduleId}/schedule/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${config.apiSecret}`,
      },
    });
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
  const { planId, billingKey } = req.body;
  const result = await portoneService.processSubscription({
    userId: req.user.id,
    userEmail: req.user.email,
    planId,
    billingKey,
  });
  res.json(result);
});

// 4. 구독 취소
router.post('/cancel', authMiddleware, async (req, res) => {
  const subscription = await billingService.getUserSubscription(req.user.id);
  const result = await portoneService.cancelSubscription(subscription.id, req.user.email);
  res.json(result);
});

// 5. Webhook 수신
router.post('/webhook', async (req, res) => {
  // 서명 검증 (선택)
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-portone-signature'];
    const timestamp = req.headers['x-portone-timestamp'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ message: 'Invalid signature' });
    }
  }
  
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
    // HTML 이메일 템플릿 작성
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
    // HTML 이메일 템플릿 작성
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
    // 에러 처리
    toast.error(response.message || '결제 등록 실패');
    return;
  }
  
  // 성공: billingKey로 구독 시작 API 호출
  await subscribeMutation.mutateAsync({
    planId: selectedPlan,
    billingKey: response.billingKey,
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

**주의사항:**
- React DOM 충돌 방지를 위해 수동 DOM 관리 필수
- Sandbox에서는 SMS 미발송
- 한국 사업자는 RT 승인 절차 필요

---

## 7. PG사 심사 필수 페이지

PG사 심사를 위해 **반드시** 아래 페이지들을 구현해야 합니다:

### 7.1 필수 페이지 목록

| 페이지 | URL 예시 | 내용 |
|--------|---------|------|
| 이용약관 | `/terms` | 서비스 이용 약관 |
| 개인정보처리방침 | `/privacy` | 개인정보 수집/이용 동의 |
| 환불정책 | `/refund` | 결제 취소/환불 규정 |
| 요금제 안내 | `/pricing` | 가격표, 결제 금액 명시 |
| 회사 소개 | `/about` 또는 Footer | 사업자 정보, 연락처 |

### 7.2 Footer 필수 정보

```tsx
<footer>
  <p>상호: OOO | 대표: 홍길동</p>
  <p>사업자등록번호: 123-45-67890</p>
  <p>통신판매업신고: 제2024-서울강남-0000호</p>
  <p>주소: 서울특별시 강남구 테헤란로 123</p>
  <p>이메일: support@example.com | 전화: 02-1234-5678</p>
  <a href="/terms">이용약관</a> | <a href="/privacy">개인정보처리방침</a> | <a href="/refund">환불정책</a>
</footer>
```

### 7.3 결제 전 동의 체크박스

```tsx
<label>
  <input type="checkbox" required />
  <a href="/terms">이용약관</a> 및 <a href="/privacy">개인정보처리방침</a>에 동의합니다.
</label>
```

---

## 8. 테스트 환경 주의사항

### 8.1 테스트 vs 실서비스

| 항목 | 테스트 환경 | 실서비스 환경 |
|------|-----------|-------------|
| SMS 인증 | 미발송 | 정상 발송 |
| PayPal OTP | `123456` 시도 | 실제 SMS 수신 |
| 결제 금액 | 실제 결제됨 | 실제 결제됨 |
| MID | 테스트 MID | 정식 MID |

### 8.2 관리자 테스트 결제

```typescript
// 관리자 계정은 1원 테스트 결제
const isTestPayment = isAdminEmail(params.userEmail);
const paymentAmount = isTestPayment ? 1 : plan.priceMonthlyKrw;

if (isTestPayment) {
  console.log(`[PortOne] Admin test payment: ${params.userEmail} - 1원`);
}
```

### 8.3 결제 취소 구현

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

## 9. 체크리스트

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
- [ ] `user_usage` 테이블 생성
- [ ] 초기 요금제 데이터 삽입

### 백엔드
- [ ] PortOne 서비스 구현
- [ ] Billing 라우트 구현
- [ ] Email 서비스 구현
- [ ] Admin 설정 구현
- [ ] Webhook 엔드포인트 구현

### 프론트엔드
- [ ] PortOne SDK 로드
- [ ] 결제 수단 선택 UI
- [ ] 카드 빌링키 발급 구현
- [ ] 카카오페이 빌링키 발급 구현
- [ ] PayPal 버튼 렌더링 구현
- [ ] 결제 성공/실패 처리

### PG사 심사
- [ ] 이용약관 페이지
- [ ] 개인정보처리방침 페이지
- [ ] 환불정책 페이지
- [ ] Footer에 사업자 정보
- [ ] 결제 전 동의 체크박스

### 테스트
- [ ] 카드 결제 테스트
- [ ] 카카오페이 결제 테스트
- [ ] PayPal 결제 테스트 (Sandbox)
- [ ] 구독 취소 테스트
- [ ] 이메일 발송 테스트
- [ ] 관리자 1원 결제 테스트

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

---

> 이 문서는 VidDigest Hub 프로젝트 (2024년 12월) 기준으로 작성되었습니다.
> PortOne API 버전: V2
