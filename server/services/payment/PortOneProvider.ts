import type {
  IPaymentProvider,
  CheckoutParams,
  CheckoutSession,
  PaymentResult,
  RefundResult,
  SubscriptionParams,
  SubscriptionResult,
  PayoutParams,
  PayoutResult,
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
    const result: CheckoutSession = {};
    if (process.env.PORTONE_STORE_ID) {
      result.clientToken = process.env.PORTONE_STORE_ID;
    }
    return result;
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

    const result: PaymentResult = {
      transactionId: payment.paymentId || transactionId,
      status: payment.status || 'UNKNOWN',
      amount: payment.amount || 0,
      currency: 'USD',
    };
    if (payment.paidAt) {
      result.paidAt = new Date(payment.paidAt);
    }
    if (payment.receiptUrl) {
      result.receiptUrl = payment.receiptUrl;
    }
    return result;
  }

  async refundPayment(transactionId: string, amountCents?: number): Promise<RefundResult> {
    requireEnabled();
    const { portoneClient } = await import('../portoneClient');
    const result = await portoneClient.cancelPayment(transactionId, 'Refund requested', amountCents);

    if (!result.success) {
      throw new Error(result.error || 'PortOne refund failed');
    }

    return {
      refundId: result.refundId || transactionId,
      status: 'refunded',
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
    const result = await portoneClient.cancelSchedule(subscriptionId);

    if (!result.success) {
      throw new Error(result.error || 'PortOne schedule cancel failed');
    }
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
    const result = portoneClient.verifyWebhookSignature(
      payload,
      headers['x-portone-signature'] || '',
      headers['x-portone-webhook-id'] || '',
      headers['x-portone-timestamp'] || ''
    );
    return result.valid === true;
  }

  parseWebhookEvent(payload: string): NormalizedWebhookEvent {
    requireEnabled();
    const data = JSON.parse(payload);
    return {
      type: data.status === 'PAID' ? 'payment.completed' : 'payment.refunded',
      transactionId: data.paymentId || data.payment_id || '',
      raw: data,
    };
  }
}
