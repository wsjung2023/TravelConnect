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
