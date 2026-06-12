// 결제 버튼 — Paddle Checkout overlay를 열어 결제를 처리하는 버튼 컴포넌트.
import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface PaymentButtonProps {
  type: 'trip_pass' | 'subscription' | 'contract';
  priceId?: string | undefined;
  planId?: number | undefined;
  tripPassId?: number | undefined;
  contractId?: number | undefined;
  stageId?: string | undefined;
  disabled?: boolean | undefined;
  onSuccess?: (() => void) | undefined;
  onError?: ((error: string) => void) | undefined;
  className?: string | undefined;
  children?: React.ReactNode | undefined;
}

export default function PaymentButton({
  type,
  priceId,
  planId,
  tripPassId,
  contractId,
  stageId,
  disabled = false,
  onSuccess,
  onError,
  className = '',
  children,
}: PaymentButtonProps) {
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('billing');
  const { openCheckout, openSubscriptionCheckout, confirmPayment, isLoading } = usePayment();

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: t('login_required'),
        description: t('login_required_for_payment'),
        variant: 'destructive',
      });
      return;
    }

    const resolvedPriceId = priceId || import.meta.env.VITE_PADDLE_TRIP_PASS_PRICE_ID || 'pri_placeholder';

    setProcessing(true);
    try {
      const metadata: Record<string, string> = {};
      if (planId !== undefined) metadata.planId = String(planId);
      if (tripPassId !== undefined) metadata.tripPassId = String(tripPassId);
      if (contractId !== undefined) metadata.contractId = String(contractId);
      if (stageId !== undefined) metadata.stageId = stageId;

      const onComplete = async (transactionId: string) => {
        const additionalData: Record<string, unknown> = {};
        if (contractId !== undefined) additionalData.contractId = contractId;
        if (stageId !== undefined) additionalData.stageId = stageId;
        await confirmPayment(transactionId, type, additionalData);
        toast({ title: t('payment_success_title'), description: t('payment_success_description') });
        onSuccess?.();
      };

      if (type === 'subscription') {
        await openSubscriptionCheckout(resolvedPriceId, metadata);
      } else {
        await openCheckout(resolvedPriceId, metadata, onComplete);
      }
    } catch (error: any) {
      const message = error.message || t('payment_processing_error');
      toast({ title: t('payment_error_title'), description: message, variant: 'destructive' });
      onError?.(message);
    } finally {
      setProcessing(false);
    }
  };

  const isDisabled = disabled || processing || isLoading;

  return (
    <Button
      onClick={handlePayment}
      disabled={isDisabled}
      className={className}
      data-testid="button-payment"
    >
      {processing || isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {t('processing_payment')}
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          {children || t('pay_now')}
        </>
      )}
    </Button>
  );
}
