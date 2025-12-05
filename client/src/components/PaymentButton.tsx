import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PaymentButtonProps {
  type: 'trip_pass' | 'subscription' | 'contract';
  amount: number;
  orderName: string;
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
        title: '로그인 필요',
        description: '결제를 위해서는 로그인이 필요합니다.',
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
          onError?.(result.error || '구독 처리 실패');
        }
        return;
      }

      const prepareData: any = { amount };
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
        },
        prepareResult.storeId,
        prepareResult.channelKey
      );

      if (paymentResponse.code) {
        const errorMsg = getErrorMessage(paymentResponse.code);
        toast({
          title: '결제 실패',
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
          title: '결제 완료',
          description: '결제가 성공적으로 완료되었습니다.',
        });
        onSuccess?.();
      }
    } catch (error: any) {
      const message = error.message || '결제 처리 중 오류가 발생했습니다.';
      toast({
        title: '결제 오류',
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
          결제 처리 중...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          {children || `${amount.toLocaleString()}원 결제하기`}
        </>
      )}
    </Button>
  );
}
