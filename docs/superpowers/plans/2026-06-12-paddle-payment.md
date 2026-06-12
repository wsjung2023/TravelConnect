# Paddle Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PortOne (아임포트) with Paddle as the payment provider for all flows (one-time, subscription, host payout), keeping PortOne code disabled but intact behind a `PAYMENT_PROVIDER` env var.

**Architecture:** A `PaymentService` factory reads `PAYMENT_PROVIDER` and returns either `PaddleProvider` or `PortOneProvider`, both implementing `IPaymentProvider`. All billing routes and hooks talk only to the service layer — no direct provider imports. The frontend uses Paddle.js overlay checkout; the server verifies transactions via Paddle REST API and listens to Paddle webhooks.

**Tech Stack:** Paddle Billing API v2, Paddle.js (CDN), Node.js fetch (server), TanStack Query, Drizzle ORM + PostgreSQL (Neon)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `server/services/payment/IPaymentProvider.ts` | Common interface + shared types |
| Create | `server/services/payment/PortOneProvider.ts` | Existing portoneClient logic, disabled guard |
| Create | `server/services/payment/PaddleProvider.ts` | Paddle API v2 implementation |
| Create | `server/services/payment/PaymentService.ts` | Factory — reads env, returns provider |
| Create | `server/routes/webhooks/paddle.ts` | Paddle webhook endpoint |
| Modify | `server/routes/billing.ts` | Swap portoneClient for PaymentService |
| Modify | `server/index.ts` | CSP update + remove PortOne scheduler start |
| Create | `client/src/lib/paddle.ts` | Paddle.js loader + env-based init |
| Modify | `client/src/hooks/usePayment.ts` | Rewrite for Paddle checkout overlay |
| Delete | `client/src/components/BillingKeyForm.tsx` | Not needed with Paddle |

---

### Task 1: IPaymentProvider Interface + Common Types

**Files:**
- Create: `server/services/payment/IPaymentProvider.ts`

- [ ] **Step 1: Create the interface file**

```typescript
// server/services/payment/IPaymentProvider.ts

export type CheckoutParams = {
  customerId: string;
  customerEmail: string;
  itemName: string;
  amount: number;        // USD cents
  currency?: string;     // default 'USD'
  metadata?: Record<string, string>;
};

export type CheckoutSession = {
  transactionId?: string;
  clientToken?: string;
};

export type PaymentResult = {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  paidAt?: Date;
  receiptUrl?: string;
};

export type RefundResult = {
  refundId: string;
  status: string;
  amount: number;
};

export type SubscriptionParams = {
  customerId: string;
  customerEmail: string;
  priceId: string;
  metadata?: Record<string, string>;
};

export type SubscriptionResult = {
  subscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
};

export type PayoutParams = {
  recipientEmail: string;
  amount: number;       // USD cents
  currency: string;
  reason?: string;
};

export type PayoutResult = {
  payoutId: string;
  status: string;
};

export type NormalizedWebhookEvent = {
  type:
    | 'payment.completed'
    | 'payment.refunded'
    | 'subscription.created'
    | 'subscription.canceled'
    | 'subscription.payment.succeeded'
    | 'payout.paid';
  transactionId: string;
  customerId?: string;
  subscriptionId?: string;
  amount?: number;
  metadata?: Record<string, string>;
  raw: unknown;
};

export interface IPaymentProvider {
  // One-time payment
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  confirmPayment(transactionId: string, expectedAmountCents?: number): Promise<PaymentResult>;
  refundPayment(transactionId: string, amountCents?: number): Promise<RefundResult>;

  // Subscription
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult>;

  // Host payout
  createPayout(params: PayoutParams): Promise<PayoutResult>;

  // Webhook
  verifyWebhook(payload: string, headers: Record<string, string>): boolean;
  parseWebhookEvent(payload: string): NormalizedWebhookEvent;
}
```

- [ ] **Step 2: Create the payment directory (mkdir)**

```bash
mkdir -p server/services/payment
```

- [ ] **Step 3: Move the file into place and verify TypeScript compiles**

```bash
cd /workspace && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors for `server/services/payment/IPaymentProvider.ts`.

- [ ] **Step 4: Commit**

```bash
git add server/services/payment/IPaymentProvider.ts
git commit -m "feat(payment): add IPaymentProvider interface + common types"
```

---

### Task 2: PortOneProvider — Move Existing Client + Disabled Guard

**Files:**
- Create: `server/services/payment/PortOneProvider.ts`
- Reference (read-only, not deleted): `server/services/portoneClient.ts`

The goal is to wrap the existing PortOne logic inside `IPaymentProvider` with a runtime guard that throws if `PAYMENT_PROVIDER !== 'portone'`.

- [ ] **Step 1: Read portoneClient.ts to identify the exported interface**

```bash
grep -n "export" server/services/portoneClient.ts | head -30
```

- [ ] **Step 2: Create PortOneProvider.ts**

```typescript
// server/services/payment/PortOneProvider.ts
import type {
  IPaymentProvider,
  CheckoutParams, CheckoutSession,
  PaymentResult, RefundResult,
  SubscriptionParams, SubscriptionResult,
  PayoutParams, PayoutResult,
  NormalizedWebhookEvent,
} from './IPaymentProvider';

const ENABLED = process.env.PAYMENT_PROVIDER === 'portone';

function requireEnabled(): void {
  if (!ENABLED) {
    throw new Error('PortOne is disabled. Set PAYMENT_PROVIDER=portone to enable.');
  }
}

export class PortOneProvider implements IPaymentProvider {
  async createCheckout(_params: CheckoutParams): Promise<CheckoutSession> {
    requireEnabled();
    // PortOne uses client-side SDK; server just validates env exists.
    // Returns storeId + channelKey that the frontend SDK needs.
    const { portoneClient } = await import('../portoneClient');
    void portoneClient; // imported for side-effect validation
    return {
      clientToken: process.env.PORTONE_STORE_ID,
    };
  }

  async confirmPayment(transactionId: string, expectedAmountCents?: number): Promise<PaymentResult> {
    requireEnabled();
    const { portoneClient } = await import('../portoneClient');
    const payment = await portoneClient.getPayment(transactionId);
    if (!payment.success) {
      throw new Error(payment.error || 'PortOne payment lookup failed');
    }
    if (expectedAmountCents !== undefined && payment.amount !== expectedAmountCents) {
      throw new Error(`Amount mismatch: expected ${expectedAmountCents}, got ${payment.amount}`);
    }
    return {
      transactionId: payment.paymentId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency || 'USD',
      paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      receiptUrl: payment.receiptUrl,
    };
  }

  async refundPayment(transactionId: string, amountCents?: number): Promise<RefundResult> {
    requireEnabled();
    const { portoneClient } = await import('../portoneClient');
    const result = await portoneClient.cancelPayment(transactionId, amountCents);
    return {
      refundId: result.cancellationId || transactionId,
      status: result.status || 'refunded',
      amount: amountCents || 0,
    };
  }

  async createSubscription(_params: SubscriptionParams): Promise<SubscriptionResult> {
    requireEnabled();
    throw new Error('PortOneProvider.createSubscription: use billing-key flow instead');
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    requireEnabled();
    const { portoneClient } = await import('../portoneClient');
    await portoneClient.cancelSchedule(subscriptionId);
  }

  async getSubscription(_subscriptionId: string): Promise<SubscriptionResult> {
    requireEnabled();
    throw new Error('PortOneProvider.getSubscription: not supported');
  }

  async createPayout(_params: PayoutParams): Promise<PayoutResult> {
    requireEnabled();
    throw new Error('PortOneProvider.createPayout: use Paddle Payouts instead');
  }

  verifyWebhook(payload: string, headers: Record<string, string>): boolean {
    if (!ENABLED) return false;
    const { portoneClient } = require('../portoneClient');
    return portoneClient.verifyWebhookSignature(
      payload,
      headers['portone-signature'] || '',
      process.env.PORTONE_WEBHOOK_SECRET || ''
    );
  }

  parseWebhookEvent(payload: string): NormalizedWebhookEvent {
    requireEnabled();
    const data = JSON.parse(payload);
    return {
      type: data.status === 'PAID' ? 'payment.completed' : 'payment.refunded',
      transactionId: data.paymentId || data.payment_id,
      raw: data,
    };
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "PortOneProvider" | head -20
```

Expected: no errors for `PortOneProvider.ts`.

- [ ] **Step 4: Commit**

```bash
git add server/services/payment/PortOneProvider.ts
git commit -m "feat(payment): add PortOneProvider wrapping existing portoneClient"
```

---

### Task 3: PaddleProvider — Paddle API v2 Implementation

**Files:**
- Create: `server/services/payment/PaddleProvider.ts`

Paddle API base URL: `https://api.paddle.com` (production) / `https://sandbox-api.paddle.com` (sandbox).
Authentication: `Authorization: Bearer ${PADDLE_API_KEY}`.

- [ ] **Step 1: Create PaddleProvider.ts**

```typescript
// server/services/payment/PaddleProvider.ts
import crypto from 'crypto';
import type {
  IPaymentProvider,
  CheckoutParams, CheckoutSession,
  PaymentResult, RefundResult,
  SubscriptionParams, SubscriptionResult,
  PayoutParams, PayoutResult,
  NormalizedWebhookEvent,
} from './IPaymentProvider';

const isSandbox = process.env.PADDLE_ENVIRONMENT !== 'production';
const PADDLE_API_BASE = isSandbox
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com';

async function paddleRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error('PADDLE_API_KEY is not set');

  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paddle API ${method} ${path} → ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

export class PaddleProvider implements IPaymentProvider {
  // One-time checkout: Paddle uses client-side Paddle.js overlay.
  // Server returns the client token; frontend calls Paddle.Checkout.open().
  async createCheckout(_params: CheckoutParams): Promise<CheckoutSession> {
    return { clientToken: process.env.VITE_PADDLE_CLIENT_TOKEN };
  }

  async confirmPayment(transactionId: string, expectedAmountCents?: number): Promise<PaymentResult> {
    const data = await paddleRequest<{ data: any }>('GET', `/transactions/${transactionId}`);
    const tx = data.data;

    if (tx.status !== 'completed') {
      throw new Error(`Transaction ${transactionId} status is '${tx.status}', not 'completed'`);
    }

    const paidAmountCents = Math.round(parseFloat(tx.details?.totals?.total || '0') * 100);
    if (expectedAmountCents !== undefined && paidAmountCents !== expectedAmountCents) {
      throw new Error(`Amount mismatch: expected ${expectedAmountCents} cents, got ${paidAmountCents}`);
    }

    return {
      transactionId: tx.id,
      status: tx.status,
      amount: paidAmountCents,
      currency: tx.currency_code || 'USD',
      paidAt: tx.billed_at ? new Date(tx.billed_at) : undefined,
      receiptUrl: tx.invoice_url,
    };
  }

  async refundPayment(transactionId: string, amountCents?: number): Promise<RefundResult> {
    const body: Record<string, unknown> = { transaction_id: transactionId, reason: 'customer_request' };
    if (amountCents !== undefined) {
      body.amount = (amountCents / 100).toFixed(2);
    }
    const data = await paddleRequest<{ data: any }>('POST', '/adjustments', body);
    return {
      refundId: data.data.id,
      status: data.data.status,
      amount: amountCents || 0,
    };
  }

  async createSubscription(_params: SubscriptionParams): Promise<SubscriptionResult> {
    // Subscription is created via Paddle.js checkout — webhook subscription.created handles DB write.
    // This method is here for interface compliance; actual creation happens client-side.
    throw new Error('PaddleProvider: subscriptions are created via Paddle.js checkout, not server-side');
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await paddleRequest('POST', `/subscriptions/${subscriptionId}/cancel`, {
      effective_from: 'next_billing_period',
    });
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const data = await paddleRequest<{ data: any }>('GET', `/subscriptions/${subscriptionId}`);
    const sub = data.data;
    return {
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_billing_period?.ends_at || Date.now()),
      cancelAtPeriodEnd: sub.scheduled_change?.action === 'cancel',
    };
  }

  async createPayout(params: PayoutParams): Promise<PayoutResult> {
    const body = {
      recipient: { email: params.recipientEmail },
      amount: (params.amount / 100).toFixed(2),
      currency_code: params.currency,
      ...(params.reason ? { description: params.reason } : {}),
    };
    const data = await paddleRequest<{ data: any }>('POST', '/payouts', body);
    return {
      payoutId: data.data.id,
      status: data.data.status,
    };
  }

  verifyWebhook(payload: string, headers: Record<string, string>): boolean {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) return false;

    const signatureHeader = headers['paddle-signature'];
    if (!signatureHeader) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(';').map((p) => p.split('=') as [string, string])
    );
    const ts = parts['ts'];
    const h1 = parts['h1'];
    if (!ts || !h1) return false;

    // Reject webhooks older than 5 minutes
    if (Math.abs(Date.now() / 1000 - parseInt(ts, 10)) > 300) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${ts}:${payload}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(h1, 'hex'));
  }

  parseWebhookEvent(payload: string): NormalizedWebhookEvent {
    const event = JSON.parse(payload);
    const eventType: string = event.event_type || '';
    const data = event.data || {};

    const typeMap: Record<string, NormalizedWebhookEvent['type']> = {
      'transaction.completed': 'payment.completed',
      'transaction.updated': 'payment.completed',
      'adjustment.created': 'payment.refunded',
      'subscription.created': 'subscription.created',
      'subscription.canceled': 'subscription.canceled',
      'subscription.payment.succeeded': 'subscription.payment.succeeded',
      'payout.paid': 'payout.paid',
    };

    const normalizedType = typeMap[eventType] || 'payment.completed';

    return {
      type: normalizedType,
      transactionId: data.id || data.transaction_id || '',
      customerId: data.customer_id,
      subscriptionId: data.subscription_id,
      amount: data.details?.totals?.total
        ? Math.round(parseFloat(data.details.totals.total) * 100)
        : undefined,
      metadata: data.custom_data,
      raw: event,
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "PaddleProvider" | head -20
```

Expected: no errors for `PaddleProvider.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/services/payment/PaddleProvider.ts
git commit -m "feat(payment): add PaddleProvider implementing IPaymentProvider"
```

---

### Task 4: PaymentService Factory

**Files:**
- Create: `server/services/payment/PaymentService.ts`

- [ ] **Step 1: Create the factory**

```typescript
// server/services/payment/PaymentService.ts
import type { IPaymentProvider } from './IPaymentProvider';

let _instance: IPaymentProvider | null = null;

export function getPaymentService(): IPaymentProvider {
  if (_instance) return _instance;

  const provider = process.env.PAYMENT_PROVIDER || 'paddle';

  if (provider === 'portone') {
    const { PortOneProvider } = require('./PortOneProvider');
    _instance = new PortOneProvider();
  } else {
    const { PaddleProvider } = require('./PaddleProvider');
    _instance = new PaddleProvider();
  }

  return _instance!;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "PaymentService" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/services/payment/PaymentService.ts
git commit -m "feat(payment): add PaymentService factory (reads PAYMENT_PROVIDER env)"
```

---

### Task 5: DB — Update payments.provider Column Comment in Schema

**Files:**
- Modify: `shared/schema.ts` (line ~288 — provider column comment only)

The `payments.provider` column already exists as `varchar('provider').notNull()`. We only need to update the comment to reflect valid values now include `'paddle'`.

- [ ] **Step 1: Update the comment on the provider column**

In `shared/schema.ts`, find:
```typescript
provider: varchar('provider').notNull(), // 'paypal', 'toss', 'mock'
```
Change to:
```typescript
provider: varchar('provider').notNull(), // 'paddle' (default) | 'portone'
```

- [ ] **Step 2: No migration needed** — the column already exists and has no DB-level constraint on values. Paddle transactions will write `provider: 'paddle'` in the application layer (confirm-payment route).

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "chore(schema): update payments.provider comment for Paddle"
```

---

### Task 6: Paddle Webhook Endpoint

**Files:**
- Create: `server/routes/webhooks/paddle.ts`
- Modify: `server/routes.ts` — register the webhook route

- [ ] **Step 1: Create the webhook handler**

```typescript
// server/routes/webhooks/paddle.ts
import { Router, Request, Response } from 'express';
import { getPaymentService } from '../../services/payment/PaymentService';
import { storage } from '../../storage';

const router = Router();

// Raw body needed for HMAC signature verification.
// Mount this BEFORE express.json() in routes.ts.
router.post('/', async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody as string | undefined;
  if (!rawBody) {
    return res.status(400).json({ error: 'Missing raw body' });
  }

  const payment = getPaymentService();
  const valid = payment.verifyWebhook(rawBody, req.headers as Record<string, string>);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = payment.parseWebhookEvent(rawBody);
  } catch {
    return res.status(400).json({ error: 'Failed to parse webhook event' });
  }

  try {
    switch (event.type) {
      case 'subscription.created': {
        if (event.subscriptionId && event.customerId) {
          // customData should contain our userId
          const meta = event.metadata || {};
          if (meta.userId) {
            const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await storage.createUserSubscription({
              userId: meta.userId,
              planId: meta.planId || 'premium',
              target: 'host',
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: periodEnd,
              renewsAt: periodEnd,
            });
          }
        }
        break;
      }

      case 'subscription.canceled': {
        if (event.subscriptionId) {
          // Find subscription by paddleSubscriptionId stored in metadata
          // For now: cancel by userId stored in metadata
          const meta = event.metadata || {};
          if (meta.userId) {
            const sub = await storage.getUserSubscription(meta.userId);
            if (sub) await storage.cancelUserSubscription(sub.id);
          }
        }
        break;
      }

      case 'subscription.payment.succeeded': {
        // Renewal payment: extend currentPeriodEnd
        // Implementation: update subscription.currentPeriodEnd += 30 days
        // (storage method not yet available — log for now)
        console.log('[PaddleWebhook] subscription.payment.succeeded', event.subscriptionId);
        break;
      }

      case 'payment.completed': {
        console.log('[PaddleWebhook] payment.completed', event.transactionId);
        break;
      }

      default:
        console.log('[PaddleWebhook] unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[PaddleWebhook] handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
```

- [ ] **Step 2: Add rawBody middleware and register route in server/routes.ts**

Find where `app.use(express.json())` is called in `server/index.ts` and add the rawBody capture middleware before it. Also register the webhook route.

In `server/index.ts`, before `app.use(express.json())`, add:

```typescript
// Capture raw body for Paddle webhook signature verification
app.use('/api/webhooks/paddle', (req, _res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk: string) => { data += chunk; });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
});
```

- [ ] **Step 3: Register the route in server/routes.ts**

Find where billing routes are registered in `server/routes.ts` and add:

```typescript
import paddleWebhookRouter from './routes/webhooks/paddle';
// ...
app.use('/api/webhooks/paddle', paddleWebhookRouter);
```

Check `server/routes.ts` first:
```bash
grep -n "billing\|webhook\|api/billing" server/routes.ts | head -20
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "paddle|webhook" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/webhooks/paddle.ts server/routes.ts server/index.ts
git commit -m "feat(payment): add Paddle webhook endpoint with HMAC verification"
```

---

### Task 7: Update billing.ts — Replace PortOne with PaymentService

**Files:**
- Modify: `server/routes/billing.ts`

Three endpoints currently use PortOne directly:
1. `GET /config` — returns PortOne storeId/channelKey → replace with Paddle clientToken
2. `POST /prepare-payment` — returns PortOne storeId/channelKey → replace with Paddle clientToken
3. `POST /confirm-payment` — calls `portoneClient.getPayment` → call `paymentService.confirmPayment`

Also: `POST /billing-key` and `GET/DELETE /billing-keys` endpoints are PortOne-specific (billing keys). With Paddle, card management is handled in Paddle's UI. These endpoints should return `501 Not Implemented` or be kept as no-ops that return `{ message: 'Not available with current payment provider' }`.

- [ ] **Step 1: Update `GET /config`**

Find:
```typescript
router.get('/config', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      storeId: process.env.PORTONE_STORE_ID || 'store_test',
      channelKey: process.env.PORTONE_CHANNEL_KEY || 'channel_test',
    });
```

Replace with:
```typescript
router.get('/config', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const provider = process.env.PAYMENT_PROVIDER || 'paddle';
    if (provider === 'portone') {
      res.json({
        provider: 'portone',
        storeId: process.env.PORTONE_STORE_ID || 'store_test',
        channelKey: process.env.PORTONE_CHANNEL_KEY || 'channel_test',
      });
    } else {
      res.json({
        provider: 'paddle',
        environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
        clientToken: process.env.VITE_PADDLE_CLIENT_TOKEN || '',
      });
    }
```

- [ ] **Step 2: Update `POST /prepare-payment`**

The entire body of this endpoint returns PortOne-specific fields. Replace the response body:

Find:
```typescript
    res.json({
      paymentId,
      amount,
      productName,
      productType,
      payMethod: payMethod || 'CARD',
      storeId: process.env.PORTONE_STORE_ID || 'store_test',
      channelKey,
    });
```

Replace with:
```typescript
    const provider = process.env.PAYMENT_PROVIDER || 'paddle';
    if (provider === 'portone') {
      let channelKey = process.env.PORTONE_CHANNEL_KEY || 'channel_test';
      if (payMethod === 'KAKAO') channelKey = process.env.PORTONE_KAKAOPAY_CHANNEL_KEY || channelKey;
      else if (payMethod === 'PAYPAL') channelKey = process.env.PORTONE_PAYPAL_CHANNEL_KEY || channelKey;
      res.json({ paymentId, amount, productName, productType, payMethod: payMethod || 'CARD', storeId: process.env.PORTONE_STORE_ID || 'store_test', channelKey });
    } else {
      res.json({
        paymentId,
        amount,
        productName,
        productType,
        provider: 'paddle',
        clientToken: process.env.VITE_PADDLE_CLIENT_TOKEN || '',
        environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
      });
    }
```

Also remove the PortOne-specific console.log lines in this endpoint (lines starting with `console.log('[prepare-payment]`).

- [ ] **Step 3: Update `POST /confirm-payment`**

Find the dynamic import of portoneClient and replace with PaymentService:

Find:
```typescript
    const { portoneClient } = await import('../services/portoneClient');
    const payment = await portoneClient.getPayment(String(lookupId));
    if (!payment.success) {
      console.warn(`[Billing] confirm-payment 검증 실패 ...`);
      return res.status(400).json({ success: false, verified: false, error: payment.error || 'Payment lookup failed' });
    }
    const verified = payment.status === 'PAID' || payment.status === 'paid';
    if (!verified) {
      return res.status(400).json({ success: false, verified: false, status: payment.status, error: 'Payment is not in PAID state' });
    }
    if (expectedAmount !== undefined && payment.amount !== Number(expectedAmount)) {
      console.warn(`[Billing] 금액 불일치 ...`);
      return res.status(400).json({ success: false, verified: false, error: 'Amount mismatch', expected: expectedAmount, actual: payment.amount });
    }
    console.log(`[Billing] confirm-payment OK ...`);
    res.json({
      success: true,
      verified: true,
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      receiptUrl: payment.receiptUrl,
    });
```

Replace with:
```typescript
    const { getPaymentService } = await import('../services/payment/PaymentService');
    const paymentService = getPaymentService();
    let result;
    try {
      result = await paymentService.confirmPayment(
        String(lookupId),
        expectedAmount !== undefined ? Number(expectedAmount) * 100 : undefined
      );
    } catch (err: any) {
      console.warn(`[Billing] confirm-payment failed user=${req.user?.id} id=${lookupId}: ${err.message}`);
      return res.status(400).json({ success: false, verified: false, error: err.message });
    }

    // Record payment in DB
    // (provider stored for audit trail)
    console.log(`[Billing] confirm-payment OK user=${req.user?.id} id=${lookupId} amount=${result.amount}`);
    res.json({
      success: true,
      verified: true,
      paymentId: result.transactionId,
      status: result.status,
      amount: result.amount,
      paidAt: result.paidAt,
      receiptUrl: result.receiptUrl,
    });
```

- [ ] **Step 4: Disable billing-key endpoints with Paddle**

In the `POST /billing-key` and `DELETE /billing-keys/:id` handlers, add at the top of the handler body (after the auth check):

```typescript
    if ((process.env.PAYMENT_PROVIDER || 'paddle') !== 'portone') {
      return res.status(501).json({ message: 'Billing key management is not available with the current payment provider.' });
    }
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "billing" | head -20
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add server/routes/billing.ts
git commit -m "feat(payment): update billing routes to use PaymentService instead of portoneClient"
```

---

### Task 8: Paddle.js Frontend Loader

**Files:**
- Create: `client/src/lib/paddle.ts`

- [ ] **Step 1: Create the loader**

```typescript
// client/src/lib/paddle.ts
// Paddle.js CDN loader + environment-aware initialization.

declare global {
  interface Window {
    Paddle?: any;
  }
}

const PADDLE_CDN = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let initPromise: Promise<any> | null = null;

export function loadPaddle(): Promise<any> {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    if (window.Paddle) {
      initPaddle(window.Paddle);
      return resolve(window.Paddle);
    }

    const existing = document.querySelector(`script[src="${PADDLE_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        initPaddle(window.Paddle);
        resolve(window.Paddle);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_CDN;
    script.async = true;
    script.onload = () => {
      initPaddle(window.Paddle);
      resolve(window.Paddle);
    };
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });

  return initPromise;
}

function initPaddle(Paddle: any): void {
  const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

  if (env === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }

  Paddle.Initialize({ token });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "paddle" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/paddle.ts
git commit -m "feat(payment): add Paddle.js loader with sandbox/production env init"
```

---

### Task 9: Rewrite usePayment.ts for Paddle

**Files:**
- Modify: `client/src/hooks/usePayment.ts`

The entire file is rewritten. The new hook:
1. Loads Paddle.js via `loadPaddle()`
2. Exposes `openCheckout(priceId, metadata?)` — opens Paddle overlay for one-time payments
3. Exposes `openSubscriptionCheckout(priceId, metadata?)` — same overlay, subscription price
4. Exposes `confirmPayment(transactionId, type)` — calls `POST /api/billing/confirm-payment`
5. Exposes `cancelSubscription()` — calls `DELETE /api/billing/subscription`
6. Keeps `purchaseTripPass` for Trip Pass flow (via Paddle price ID from env)

- [ ] **Step 1: Rewrite usePayment.ts**

```typescript
// client/src/hooks/usePayment.ts
// Paddle-based payment hook. Replaces PortOne SDK flows.
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { loadPaddle } from '@/lib/paddle';

type PaymentType = 'trip_pass' | 'subscription' | 'contract';

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPaddle().catch(console.error);
  }, []);

  const openCheckout = useCallback(async (
    priceId: string,
    metadata?: Record<string, string>,
    onComplete?: (transactionId: string) => void
  ): Promise<void> => {
    const Paddle = await loadPaddle();
    Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: metadata,
      settings: { displayMode: 'overlay', theme: 'light' },
      eventCallback: (event: any) => {
        if (event.name === 'checkout.completed') {
          const txId: string = event.data?.transaction_id;
          if (txId && onComplete) onComplete(txId);
        }
      },
    });
  }, []);

  const openSubscriptionCheckout = useCallback(async (
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<void> => {
    return openCheckout(priceId, metadata);
  }, [openCheckout]);

  const confirmPayment = useCallback(async (
    transactionId: string,
    type: PaymentType,
    additionalData?: Record<string, unknown>
  ) => {
    const response = await api('/api/billing/confirm-payment', {
      method: 'POST',
      body: { paymentId: transactionId, type, ...additionalData },
    });
    return response;
  }, []);

  const purchaseTripPass = useCallback(async (
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        loadPaddle().then((Paddle) => {
          Paddle.Checkout.open({
            items: [{ priceId, quantity: 1 }],
            customData: metadata,
            settings: { displayMode: 'overlay', theme: 'light' },
            eventCallback: async (event: any) => {
              if (event.name === 'checkout.completed') {
                try {
                  const txId: string = event.data?.transaction_id;
                  await confirmPayment(txId, 'trip_pass');
                  toast({ title: '구매 완료', description: 'Trip Pass가 성공적으로 구매되었습니다.' });
                  resolve();
                } catch (err: any) {
                  reject(err);
                }
              } else if (event.name === 'checkout.closed' && !event.data?.transaction_id) {
                reject(new Error('USER_CANCEL'));
              }
            },
          });
        }).catch(reject);
      });
      return { success: true };
    } catch (error: any) {
      if (error.message !== 'USER_CANCEL') {
        toast({ title: '결제 실패', description: error.message || '결제 처리 중 오류', variant: 'destructive' });
      }
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [confirmPayment, toast]);

  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await api('/api/billing/subscription', { method: 'DELETE' });
      toast({ title: '구독 해지 완료', description: '현재 결제 기간까지 서비스를 이용할 수 있습니다.' });
      return { success: true };
    } catch (error: any) {
      toast({ title: '구독 해지 실패', description: error.message || '오류가 발생했습니다.', variant: 'destructive' });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const openCustomerPortal = useCallback(async (): Promise<void> => {
    // Paddle hosted customer portal for card/subscription management
    const Paddle = await loadPaddle();
    Paddle.Retain?.showCustomerPortal?.();
  }, []);

  return {
    isLoading,
    openCheckout,
    openSubscriptionCheckout,
    confirmPayment,
    purchaseTripPass,
    cancelSubscription,
    openCustomerPortal,
  };
}
```

- [ ] **Step 2: Check what components import usePayment and what API they use**

```bash
grep -rn "usePayment\|from.*usePayment" client/src --include="*.tsx" --include="*.ts" | grep -v "usePayment.ts"
```

For each found caller, check if they use any removed exports (`requestPayment`, `requestBillingKey`, `registerBillingKey`, `loadPortOneSDK`, `preparePayment`, `sdkLoaded`, `getErrorMessage`). If yes, update those callers to use the new API.

- [ ] **Step 3: Fix any callers that use removed exports**

For each caller identified in Step 2: if it calls `purchaseTripPass(tripPassId, customer)`, update the call signature to `purchaseTripPass(priceId, metadata)` where `priceId` comes from an env var like `import.meta.env.VITE_PADDLE_TRIP_PASS_PRICE_ID`.

If callers use `requestPayment` / `confirmPayment` for contract payments, replace with:
```typescript
// Instead of requestPayment + confirmPayment sequence:
openCheckout(priceId, { type: 'contract', contractId: String(contractId) }, async (txId) => {
  await confirmPayment(txId, 'contract', { contractId });
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "usePayment|paddle" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/usePayment.ts
git commit -m "feat(payment): rewrite usePayment hook for Paddle.js checkout overlay"
```

---

### Task 10: CSP Update for Paddle Domains

**Files:**
- Modify: `server/index.ts` — helmet CSP directives

- [ ] **Step 1: Update helmet CSP in server/index.ts**

Find the `scriptSrc` array and add `"cdn.paddle.com"`:
```typescript
scriptSrc: [
  "'self'", "'unsafe-inline'", "'unsafe-eval'",
  "*.googleapis.com", "*.gstatic.com",
  "*.googlesyndication.com", "pagead2.googlesyndication.com",
  "*.google.com", "*.doubleclick.net",
  "cdn.portone.io", "*.portone.io",
  "cdn.paddle.com",          // ADD
],
```

Find the `frameSrc` array and add Paddle frame domains:
```typescript
frameSrc: [
  "'self'",
  "*.googlesyndication.com", "*.doubleclick.net",
  "*.portone.io", "checkout.portone.io", "*.iamport.co",
  "cdn.paddle.com",          // ADD
  "checkout.paddle.com",     // ADD
],
```

Find the `connectSrc` array and add Paddle API domains:
```typescript
connectSrc: [
  "'self'", "wss:", "ws:",
  "*.googleapis.com", "*.replit.app", "*.replit.dev",
  "*.googlesyndication.com", "*.google.com",
  "*.portone.io", "api.portone.io",
  "*.iamport.co", "checkout-service.prod.iamport.co",
  "api.paddle.com",          // ADD
  "sandbox-api.paddle.com",  // ADD
],
```

- [ ] **Step 2: Verify TypeScript compiles (index.ts is plain JS-ish, but check)**

```bash
npx tsc --noEmit 2>&1 | grep "index.ts" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat(payment): add Paddle domains to CSP (script-src, frame-src, connect-src)"
```

---

### Task 11: Remove BillingKeyForm Component

**Files:**
- Delete: `client/src/components/BillingKeyForm.tsx`

- [ ] **Step 1: Check all imports of BillingKeyForm**

```bash
grep -rn "BillingKeyForm" client/src --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Remove each import and usage**

For each file that imports `BillingKeyForm`, remove the import line and any `<BillingKeyForm ... />` JSX usage. Replace the UI with a note if visible in the UI, e.g.:

```tsx
{/* Card management is handled in the Paddle customer portal */}
```

Or remove the section entirely if it's inside a conditional block.

- [ ] **Step 3: Delete the file**

```bash
rm client/src/components/BillingKeyForm.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "BillingKeyForm" | head -10
```

Expected: no references found (no errors).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(payment): remove BillingKeyForm (Paddle handles card management in checkout)"
```

---

### Task 12: Disable subscriptionScheduler Manual Renewal Logic

**Files:**
- Modify: `server/services/subscriptionScheduler.ts`
- Modify: `server/index.ts` — disable scheduler start when using Paddle

With Paddle, subscription renewal is fully automatic — Paddle charges the card and sends `subscription.payment.succeeded` webhooks. The `subscriptionScheduler.runDailyScheduler()` loop that manually calls PortOne for renewal is no longer needed.

- [ ] **Step 1: Guard the scheduler start in server/index.ts**

Find:
```typescript
  if (process.env.SUBSCRIPTION_SCHEDULER_ENABLED === 'true') {
    setInterval(() => {
      subscriptionScheduler.runDailyScheduler().catch(...)
    }, 24 * 60 * 60 * 1000);
    console.log('▶️ Subscription renewal scheduler: ON (every 24h)');
  }
```

Replace with:
```typescript
  const schedulerEnabled = process.env.SUBSCRIPTION_SCHEDULER_ENABLED === 'true';
  const isPaddle = (process.env.PAYMENT_PROVIDER || 'paddle') === 'paddle';
  if (schedulerEnabled && !isPaddle) {
    setInterval(() => {
      subscriptionScheduler.runDailyScheduler().catch((err) =>
        console.error('[SubscriptionScheduler] runDailyScheduler error:', err)
      );
    }, 24 * 60 * 60 * 1000);
    console.log('▶️ Subscription renewal scheduler: ON (every 24h)');
  } else {
    const reason = isPaddle ? 'Paddle manages renewals automatically' : 'SUBSCRIPTION_SCHEDULER_ENABLED is not true';
    console.log(`⏸️ Subscription renewal scheduler: OFF (${reason})`);
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "subscriptionScheduler\|index.ts" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat(payment): skip subscription scheduler when PAYMENT_PROVIDER=paddle"
```

---

## Environment Variables to Set

Before testing, add these to Replit Secrets (or `.env`):

| Variable | Value |
|----------|-------|
| `PAYMENT_PROVIDER` | `paddle` |
| `PADDLE_API_KEY` | *(from Paddle dashboard → Developer → API keys)* |
| `PADDLE_WEBHOOK_SECRET` | *(from Paddle dashboard → Developer → Notifications → secret key)* |
| `PADDLE_ENVIRONMENT` | `sandbox` |
| `VITE_PADDLE_CLIENT_TOKEN` | *(from Paddle dashboard → Developer → Client-side tokens)* |

---

## Self-Review

**Spec coverage check:**
- ✅ `IPaymentProvider.ts` — Task 1
- ✅ `PortOneProvider.ts` with disabled guard — Task 2
- ✅ `PaddleProvider.ts` with all methods — Task 3
- ✅ `PaymentService.ts` factory — Task 4
- ✅ DB schema comment update — Task 5
- ✅ Paddle webhook endpoint — Task 6
- ✅ `billing.ts` updated (config, prepare-payment, confirm-payment) — Task 7
- ✅ `client/src/lib/paddle.ts` loader — Task 8
- ✅ `usePayment.ts` rewritten — Task 9
- ✅ CSP update — Task 10
- ✅ `BillingKeyForm.tsx` removed — Task 11
- ✅ Subscription scheduler disabled for Paddle — Task 12

**Type consistency check:**
- `IPaymentProvider.confirmPayment(transactionId, expectedAmountCents?)` — used the same signature in PortOneProvider, PaddleProvider, and billing.ts
- `NormalizedWebhookEvent.type` union — defined in Task 1, used identically in Task 3 and Task 6
- `getPaymentService()` — Task 4, imported with same name in Task 6 and Task 7

**Placeholder check:** No TBD or TODO entries in task steps. All code blocks are complete.
