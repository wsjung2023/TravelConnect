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
