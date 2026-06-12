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
  } as RequestInit);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Paddle API ${method} ${path} → ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

export class PaddleProvider implements IPaymentProvider {
  async createCheckout(_params: CheckoutParams): Promise<CheckoutSession> {
    const clientToken = process.env.VITE_PADDLE_CLIENT_TOKEN;
    return { clientToken } as CheckoutSession;
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

    const result: PaymentResult = {
      transactionId: tx.id,
      status: tx.status,
      amount: paidAmountCents,
      currency: tx.currency_code || 'USD',
      ...(tx.billed_at && { paidAt: new Date(tx.billed_at) }),
      ...(tx.invoice_url && { receiptUrl: tx.invoice_url }),
    };
    return result;
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

    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(h1, 'hex'));
    } catch {
      return false;
    }
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

    const result: NormalizedWebhookEvent = {
      type: normalizedType,
      transactionId: data.id || data.transaction_id || '',
      ...(data.customer_id && { customerId: data.customer_id }),
      ...(data.subscription_id && { subscriptionId: data.subscription_id }),
      ...(data.details?.totals?.total && {
        amount: Math.round(parseFloat(data.details.totals.total) * 100),
      }),
      ...(data.custom_data && { metadata: data.custom_data }),
      raw: event,
    };
    return result;
  }
}
