/**
 * PortOne V2 결제 클라이언트 서비스
 * 
 * Tourgether 공유경제 플랫폼을 위한 결제 연동 서비스
 * - 1회성 결제: P2P 계약 에스크로, Trip Pass 구매
 * - 정기결제: 호스트 프리미엄 구독 (향후)
 * 
 * 참고: docs/pricing_dev_update.md 섹션 0.5
 */

const PORTONE_API_URL = 'https://api.portone.io';

export interface PortOneConfig {
  apiSecret: string;
  storeId: string;
  channelKey?: string;          // KG이니시스 (카드)
  kakaopayChannelKey?: string;  // 카카오페이
  paypalChannelKey?: string;    // PayPal
  webhookSecret?: string;
}

export interface PaymentCustomer {
  id: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
}

export interface CreatePaymentParams {
  paymentId: string;           // 고유 결제 ID (merchant UID)
  orderName: string;           // 주문명 (예: "Trip Pass 3일권")
  amount: number;              // 결제 금액
  currency?: 'KRW' | 'USD';    // 기본값: KRW
  customer: PaymentCustomer;
  billingKey?: string;         // 정기결제용 빌링키
  channelKey?: string;         // 채널 키 (결제 수단별)
}

export interface SchedulePaymentParams {
  paymentId: string;           // 스케줄 결제 ID
  billingKey: string;          // 빌링키 필수
  orderName: string;
  amount: number;
  currency?: 'KRW' | 'USD';
  scheduledAt: Date;           // 결제 예정 시간
  customer: PaymentCustomer;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  status?: string;
  paidAt?: string;
  amount?: number;
  error?: string;
  errorCode?: string;
}

export interface ScheduleResult {
  success: boolean;
  scheduleId?: string;
  paymentId?: string;
  scheduledAt?: string;
  error?: string;
}

export interface BillingKeyResult {
  success: boolean;
  billingKey?: string;
  cardInfo?: {
    issuer?: string;
    number?: string;      // 마스킹된 카드번호
    brand?: string;       // VISA, MASTERCARD 등
  };
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundedAmount?: number;
  error?: string;
}

export interface TransferParams {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  reason?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  status?: string;
  error?: string;
}

class PortOneClient {
  private config: PortOneConfig | null = null;

  /**
   * PortOne 설정 초기화
   */
  initialize(): boolean {
    const apiSecret = process.env.PORTONE_API_SECRET;
    const storeId = process.env.PORTONE_STORE_ID;

    if (!apiSecret || !storeId) {
      console.log('[PortOne] Configuration missing - payments disabled');
      return false;
    }

    const channelKey = process.env.PORTONE_CHANNEL_KEY;
    const kakaopayChannelKey = process.env.PORTONE_KAKAOPAY_CHANNEL_KEY;
    const paypalChannelKey = process.env.PORTONE_PAYPAL_CHANNEL_KEY;
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

    this.config = {
      apiSecret,
      storeId,
      ...(channelKey && { channelKey }),
      ...(kakaopayChannelKey && { kakaopayChannelKey }),
      ...(paypalChannelKey && { paypalChannelKey }),
      ...(webhookSecret && { webhookSecret }),
    };

    console.log('[PortOne] Initialized successfully');
    console.log(`[PortOne] Store ID: ${storeId.substring(0, 20)}...`);
    return true;
  }

  /**
   * 설정 상태 확인
   */
  isConfigured(): boolean {
    if (!this.config) {
      return this.initialize();
    }
    return true;
  }

  /**
   * 설정 정보 반환 (프론트엔드용, 민감정보 제외)
   */
  getPublicConfig(): { storeId: string; channelKey?: string } | null {
    if (!this.isConfigured() || !this.config) return null;
    const result: { storeId: string; channelKey?: string } = {
      storeId: this.config.storeId,
    };
    if (this.config.channelKey) {
      result.channelKey = this.config.channelKey;
    }
    return result;
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): HeadersInit {
    if (!this.config) throw new Error('PortOne not configured');
    return {
      'Authorization': `PortOne ${this.config.apiSecret}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 결제 상태 조회
   */
  async getPayment(paymentId: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/payments/${encodeURIComponent(paymentId)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to get payment',
          errorCode: data.code,
        };
      }

      return {
        success: true,
        paymentId: data.id,
        transactionId: data.transactionId,
        status: data.status,
        paidAt: data.paidAt,
        amount: data.amount?.total,
      };
    } catch (error) {
      console.error('[PortOne] getPayment error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 빌링키로 즉시 결제 실행 (정기결제/구독용)
   */
  async createPaymentWithBillingKey(params: CreatePaymentParams): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    if (!params.billingKey) {
      return { success: false, error: 'Billing key required' };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            billingKey: params.billingKey,
            orderName: params.orderName,
            amount: { total: params.amount },
            currency: params.currency || 'KRW',
            customer: {
              id: params.customer.id,
              email: params.customer.email,
              name: params.customer.name,
              phoneNumber: params.customer.phoneNumber,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[PortOne] createPayment failed:', data);
        return {
          success: false,
          error: data.message || 'Payment failed',
          errorCode: data.code,
        };
      }

      return {
        success: true,
        paymentId: data.paymentId || params.paymentId,
        transactionId: data.transactionId,
        status: data.status || 'PAID',
        paidAt: data.paidAt,
        amount: params.amount,
      };
    } catch (error) {
      console.error('[PortOne] createPayment error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 정기결제 스케줄 등록 (호스트 구독용)
   * 
   * 중요: PortOne 스케줄은 1회성! Webhook에서 매번 다음 스케줄 등록 필요
   * 참고: docs/pricing_dev_update.md 섹션 0.5.1
   */
  async schedulePayment(params: SchedulePaymentParams): Promise<ScheduleResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/payments/${encodeURIComponent(params.paymentId)}/schedule`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            payment: {
              billingKey: params.billingKey,
              orderName: params.orderName,
              amount: { total: params.amount },
              currency: params.currency || 'KRW',
              customer: {
                id: params.customer.id,
                email: params.customer.email,
                name: params.customer.name,
              },
            },
            timeToPay: params.scheduledAt.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[PortOne] schedulePayment failed:', data);
        return {
          success: false,
          error: data.message || 'Schedule failed',
        };
      }

      return {
        success: true,
        scheduleId: data.schedule?.id || data.scheduleId,
        paymentId: params.paymentId,
        scheduledAt: params.scheduledAt.toISOString(),
      };
    } catch (error) {
      console.error('[PortOne] schedulePayment error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 정기결제 스케줄 취소
   * 
   * 주의: DELETE 메서드 사용! (POST가 아님)
   * 참고: docs/pricing_dev_update.md 섹션 0.5.2
   */
  async cancelSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/payment-schedules/${encodeURIComponent(scheduleId)}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}));
        console.error('[PortOne] cancelSchedule failed:', data);
        return {
          success: false,
          error: data.message || 'Schedule cancel failed',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[PortOne] cancelSchedule error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 결제 취소 (환불)
   */
  async cancelPayment(
    paymentId: string,
    reason: string,
    amount?: number
  ): Promise<RefundResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    try {
      const body: Record<string, unknown> = { reason };
      if (amount) {
        body.amount = amount;
      }

      const response = await fetch(
        `${PORTONE_API_URL}/payments/${encodeURIComponent(paymentId)}/cancel`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[PortOne] cancelPayment failed:', data);
        return {
          success: false,
          error: data.message || 'Refund failed',
        };
      }

      return {
        success: true,
        refundId: data.cancellation?.id,
        refundedAmount: data.cancellation?.totalAmount || amount,
      };
    } catch (error) {
      console.error('[PortOne] cancelPayment error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 빌링키 발급 상태 조회
   */
  async getBillingKey(billingKeyId: string): Promise<BillingKeyResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/billing-keys/${encodeURIComponent(billingKeyId)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to get billing key',
        };
      }

      const result: BillingKeyResult = {
        success: true,
        billingKey: data.billingKey,
      };
      
      if (data.methods?.[0]?.card) {
        result.cardInfo = {
          issuer: data.methods[0].card.issuer,
          number: data.methods[0].card.number,
          brand: data.methods[0].card.brand,
        };
      }
      
      return result;
    } catch (error) {
      console.error('[PortOne] getBillingKey error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 빌링키 삭제 (정기결제 해지 시)
   */
  async deleteBillingKey(billingKeyId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/billing-keys/${encodeURIComponent(billingKeyId)}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}));
        return {
          success: false,
          error: data.message || 'Failed to delete billing key',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[PortOne] deleteBillingKey error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 호스트 정산용 계좌 이체 (Transfer API)
   * 
   * 참고: PortOne V2 Transfer API
   * - 실제 프로덕션에서는 PortOne의 정산 API 사용 필요
   * - 현재 구현은 개발/테스트용 Mock 포함
   */
  async transferToBank(params: TransferParams): Promise<TransferResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'PortOne not configured' };
    }

    const transferEnabled = process.env.TRANSFER_ENABLED === 'true';
    
    if (!transferEnabled) {
      console.log('[PortOne] Transfer API disabled - returning mock success');
      console.log(`[PortOne] Mock transfer: ${params.amount} KRW to ${params.bankCode} ${params.accountNumber.slice(-4)}`);
      
      return {
        success: true,
        transferId: `MOCK_TRF_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        status: 'completed',
      };
    }

    try {
      const response = await fetch(
        `${PORTONE_API_URL}/transfers`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            storeId: this.config!.storeId,
            amount: {
              total: params.amount,
            },
            bankCode: params.bankCode,
            accountNumber: params.accountNumber,
            accountHolderName: params.accountHolderName,
            reason: params.reason || 'Tourgether Settlement',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[PortOne] transferToBank failed:', data);
        return {
          success: false,
          error: data.message || 'Transfer failed',
        };
      }

      console.log(`[PortOne] Transfer successful: ${params.amount} KRW, ID: ${data.transferId}`);
      
      return {
        success: true,
        transferId: data.transferId,
        status: data.status || 'completed',
      };
    } catch (error) {
      console.error('[PortOne] transferToBank error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Webhook 서명 검증 (PortOne V2 HMAC)
   * PortOne V2 uses: HMAC-SHA256(webhook_id.timestamp.payload, secret)
   * All headers are mandatory for replay protection
   */
  verifyWebhookSignature(
    payload: string, 
    signature: string,
    webhookId: string,
    timestamp: string
  ): { valid: boolean; error?: string } {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!this.config?.webhookSecret) {
      if (isProduction) {
        console.error('[PortOne] CRITICAL: Webhook secret not configured in production');
        return { valid: false, error: 'Webhook secret required in production' };
      }
      console.warn('[PortOne] Webhook secret not configured - skipping verification in development');
      return { valid: true };
    }

    if (!signature) {
      return { valid: false, error: 'Missing x-portone-signature header' };
    }
    
    if (!webhookId) {
      return { valid: false, error: 'Missing x-portone-webhook-id header' };
    }
    
    if (!timestamp) {
      return { valid: false, error: 'Missing x-portone-timestamp header' };
    }

    try {
      const timestampMs = parseInt(timestamp) * 1000;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
        console.error('[PortOne] Webhook timestamp invalid or expired');
        return { valid: false, error: 'Timestamp expired or invalid' };
      }

      const crypto = require('crypto');
      const signedPayload = `${webhookId}.${timestamp}.${payload}`;
      
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(signedPayload)
        .digest('hex');
      
      const signatureMatch = signature === expectedSignature || 
                             signature === `sha256=${expectedSignature}`;
      
      if (!signatureMatch) {
        console.error('[PortOne] Signature mismatch');
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (error) {
      console.error('[PortOne] Webhook signature verification error:', error);
      return { valid: false, error: 'Verification error' };
    }
  }
}

export const portoneClient = new PortOneClient();
