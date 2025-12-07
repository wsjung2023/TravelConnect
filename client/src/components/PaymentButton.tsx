import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type PayMethodType = 'CARD' | 'KAKAO' | 'PAYPAL';

interface PaymentButtonProps {
  type: 'trip_pass' | 'subscription' | 'contract';
  amount: number;
  orderName: string;
  payMethod?: PayMethodType | undefined;
  planId?: number | undefined;
  tripPassId?: number | undefined;
  contractId?: number | undefined;
  stageId?: string | undefined;
  billingKeyId?: number | undefined;
  disabled?: boolean | undefined;
  onSuccess?: (() => void) | undefined;
  onError?: ((error: string) => void) | undefined;
  className?: string | undefined;
  children?: React.ReactNode | undefined;
}

export default function PaymentButton({
  type,
  amount,
  orderName,
  payMethod = 'CARD',
  planId,
  tripPassId,
  contractId,
  stageId,
  billingKeyId,
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
  const { 
    preparePayment, 
    requestPayment, 
    confirmPayment,
    createSubscription,
    isLoading,
    getErrorMessage,
  } = usePayment();

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: t('login_required'),
        description: t('login_required_for_payment'),
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      if (type === 'subscription' && billingKeyId && planId) {
        const result = await createSubscription(planId, billingKeyId);
        if (result.success) {
          onSuccess?.();
        } else {
          onError?.(result.error || t('subscription_processing_failed'));
        }
        return;
      }

      const prepareData: any = { amount, payMethod };
      if (planId) prepareData.planId = planId;
      if (tripPassId) prepareData.tripPassId = tripPassId;
      if (contractId) prepareData.contractId = contractId;
      if (stageId) prepareData.stageId = stageId;

      const prepareResult = await preparePayment(type, prepareData);

      const paymentResponse = await requestPayment(
        {
          paymentId: prepareResult.paymentId,
          orderName,
          totalAmount: amount,
          customerName: user.displayName || user.email || 'Guest',
          customerEmail: user.email || '',
          payMethod,
        },
        prepareResult.storeId,
        prepareResult.channelKey
      );

      if (paymentResponse.code) {
        const errorMsg = getErrorMessage(paymentResponse.code);
        toast({
          title: t('payment_failed'),
          description: errorMsg,
          variant: 'destructive',
        });
        onError?.(errorMsg);
        return;
      }

      if (paymentResponse.txId) {
        const additionalData: { contractId?: number; stageId?: string } = {};
        if (contractId !== undefined) additionalData.contractId = contractId;
        if (stageId !== undefined) additionalData.stageId = stageId;
        
        await confirmPayment(
          paymentResponse.paymentId,
          paymentResponse.txId,
          type,
          additionalData
        );

        toast({
          title: t('payment_success_title'),
          description: t('payment_success_description'),
        });
        onSuccess?.();
      }
    } catch (error: any) {
      const message = error.message || t('payment_processing_error');
      toast({
        title: t('payment_error_title'),
        description: message,
        variant: 'destructive',
      });
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
          {children || t('pay_amount', { amount: amount.toLocaleString() })}
        </>
      )}
    </Button>
  );
}
