import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

declare global {
  interface Window {
    PortOne?: any;
  }
}

interface PaymentRequest {
  paymentId: string;
  orderName: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

interface PaymentResponse {
  txId?: string;
  paymentId: string;
  code?: string;
  message?: string;
}

interface BillingKeyRequest {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

interface BillingKeyResponse {
  billingKey?: string;
  code?: string;
  message?: string;
}

interface PreparePaymentResponse {
  paymentId: string;
  storeId: string;
  channelKey: string;
}

const PORTONE_SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const { toast } = useToast();

  const loadPortOneSDK = useCallback(async (): Promise<any> => {
    if (window.PortOne) {
      return window.PortOne;
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${PORTONE_SDK_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.PortOne));
        return;
      }

      const script = document.createElement('script');
      script.src = PORTONE_SDK_URL;
      script.async = true;
      script.onload = () => {
        setSdkLoaded(true);
        resolve(window.PortOne);
      };
      script.onerror = () => reject(new Error('PortOne SDK 로드 실패'));
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    loadPortOneSDK().catch(console.error);
  }, [loadPortOneSDK]);

  const preparePayment = useCallback(async (
    type: 'trip_pass' | 'subscription' | 'contract',
    data: { planId?: number; tripPassId?: number; contractId?: number; stageId?: string; amount?: number }
  ): Promise<PreparePaymentResponse> => {
    const response = await api('/api/billing/prepare-payment', {
      method: 'POST',
      body: { type, ...data },
    });
    return response;
  }, []);

  const requestPayment = useCallback(async (
    paymentData: PaymentRequest,
    storeId: string,
    channelKey: string
  ): Promise<PaymentResponse> => {
    setIsLoading(true);
    try {
      const PortOne = await loadPortOneSDK();
      
      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId: paymentData.paymentId,
        orderName: paymentData.orderName,
        totalAmount: paymentData.totalAmount,
        currency: 'KRW',
        payMethod: 'CARD',
        customer: {
          fullName: paymentData.customerName,
          email: paymentData.customerEmail,
          phoneNumber: paymentData.customerPhone,
        },
      });

      if (response.code) {
        throw new Error(response.message || '결제 처리 중 오류가 발생했습니다.');
      }

      return response;
    } finally {
      setIsLoading(false);
    }
  }, [loadPortOneSDK]);

  const confirmPayment = useCallback(async (
    paymentId: string,
    txId: string,
    type: 'trip_pass' | 'subscription' | 'contract',
    additionalData?: { contractId?: number; stageId?: string }
  ) => {
    const response = await api('/api/billing/confirm-payment', {
      method: 'POST',
      body: { paymentId, txId, type, ...additionalData },
    });
    return response;
  }, []);

  const purchaseTripPass = useCallback(async (
    tripPassId: number,
    customer: { name: string; email: string; phone?: string }
  ) => {
    setIsLoading(true);
    try {
      const prepareResult = await preparePayment('trip_pass', { tripPassId });
      
      const paymentRequest: PaymentRequest = {
        paymentId: prepareResult.paymentId,
        orderName: 'Trip Pass 구매',
        totalAmount: 0,
        customerName: customer.name,
        customerEmail: customer.email,
      };
      if (customer.phone) {
        paymentRequest.customerPhone = customer.phone;
      }
      
      const paymentResponse = await requestPayment(
        paymentRequest,
        prepareResult.storeId,
        prepareResult.channelKey
      );

      if (paymentResponse.txId) {
        await confirmPayment(paymentResponse.paymentId, paymentResponse.txId, 'trip_pass');
        toast({
          title: '구매 완료',
          description: 'Trip Pass가 성공적으로 구매되었습니다.',
        });
        return { success: true };
      }
      
      return { success: false, error: paymentResponse.message };
    } catch (error: any) {
      const message = error.message || '결제 처리 중 오류가 발생했습니다.';
      toast({
        title: '결제 실패',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [preparePayment, requestPayment, confirmPayment, toast]);

  const requestBillingKey = useCallback(async (
    data: BillingKeyRequest,
    storeId: string,
    channelKey: string
  ): Promise<BillingKeyResponse> => {
    setIsLoading(true);
    try {
      const PortOne = await loadPortOneSDK();
      
      const response = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        customer: {
          id: data.customerId,
          fullName: data.customerName,
          email: data.customerEmail,
          phoneNumber: data.customerPhone,
        },
      });

      if (response.code) {
        throw new Error(response.message || '빌링키 발급 중 오류가 발생했습니다.');
      }

      return response;
    } finally {
      setIsLoading(false);
    }
  }, [loadPortOneSDK]);

  const registerBillingKey = useCallback(async (
    billingKey: string,
    cardInfo?: { cardName?: string; cardNumber?: string }
  ) => {
    const response = await api('/api/billing/billing-key', {
      method: 'POST',
      body: { billingKey, ...cardInfo },
    });
    return response;
  }, []);

  const createSubscription = useCallback(async (
    planId: number,
    billingKeyId: number
  ) => {
    setIsLoading(true);
    try {
      const response = await api('/api/billing/subscription', {
        method: 'POST',
        body: { planId, billingKeyId },
      });
      toast({
        title: '구독 완료',
        description: '구독이 성공적으로 시작되었습니다.',
      });
      return { success: true, data: response };
    } catch (error: any) {
      const message = error.message || '구독 처리 중 오류가 발생했습니다.';
      toast({
        title: '구독 실패',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const cancelSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api('/api/billing/subscription', {
        method: 'DELETE',
      });
      toast({
        title: '구독 해지 완료',
        description: '구독이 해지되었습니다. 현재 결제 기간까지 서비스를 이용할 수 있습니다.',
      });
      return { success: true, data: response };
    } catch (error: any) {
      const message = error.message || '구독 해지 중 오류가 발생했습니다.';
      toast({
        title: '구독 해지 실패',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getErrorMessage = useCallback((code: string): string => {
    const errorMessages: Record<string, string> = {
      CARD_DECLINED: '카드가 거절되었습니다. 다른 카드로 시도해주세요.',
      INSUFFICIENT_BALANCE: '잔액이 부족합니다. 잔액을 확인해주세요.',
      NETWORK_ERROR: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
      USER_CANCEL: '결제가 취소되었습니다.',
      TIMEOUT: '결제 시간이 초과되었습니다. 다시 시도해주세요.',
      INVALID_CARD: '유효하지 않은 카드입니다.',
    };
    return errorMessages[code] || '결제 처리 중 오류가 발생했습니다.';
  }, []);

  return {
    isLoading,
    sdkLoaded,
    loadPortOneSDK,
    preparePayment,
    requestPayment,
    confirmPayment,
    purchaseTripPass,
    requestBillingKey,
    registerBillingKey,
    createSubscription,
    cancelSubscription,
    getErrorMessage,
  };
}
