import { useState } from 'react';
import { CreditCard, Loader2, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BillingKey {
  id: number;
  cardName: string;
  cardNumber: string;
  isDefault: boolean;
  createdAt: string;
}

interface BillingKeyFormProps {
  onSelect?: ((billingKeyId: number) => void) | undefined;
  selectedId?: number | undefined;
  showSelection?: boolean | undefined;
}

export default function BillingKeyForm({
  onSelect,
  selectedId,
  showSelection = false,
}: BillingKeyFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { requestBillingKey, registerBillingKey, isLoading } = usePayment();

  const { data: billingKeys = [], isLoading: loadingKeys } = useQuery<BillingKey[]>({
    queryKey: ['/api/billing/billing-keys'],
    enabled: !!user,
  });

  const { data: config } = useQuery<{ storeId: string; channelKey: string }>({
    queryKey: ['/api/billing/config'],
    enabled: !!user,
  });

  const handleAddCard = async () => {
    if (!user || !config) {
      toast({
        title: '오류',
        description: '카드 등록을 위한 설정을 불러올 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);

    try {
      const response = await requestBillingKey(
        {
          customerId: user.id.toString(),
          customerName: user.displayName || user.email || 'Guest',
          customerEmail: user.email || '',
        },
        config.storeId,
        config.channelKey
      );

      if (response.code) {
        throw new Error(response.message || '카드 등록에 실패했습니다.');
      }

      if (response.billingKey) {
        await registerBillingKey(response.billingKey);
        queryClient.invalidateQueries({ queryKey: ['/api/billing/billing-keys'] });
        toast({
          title: '카드 등록 완료',
          description: '결제 카드가 성공적으로 등록되었습니다.',
        });
      }
    } catch (error: any) {
      toast({
        title: '카드 등록 실패',
        description: error.message || '카드 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCard = async (billingKeyId: number) => {
    setDeletingId(billingKeyId);

    try {
      await api(`/api/billing/billing-keys/${billingKeyId}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/billing-keys'] });
      toast({
        title: '카드 삭제 완료',
        description: '결제 카드가 삭제되었습니다.',
      });
    } catch (error: any) {
      toast({
        title: '카드 삭제 실패',
        description: error.message || '카드 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (billingKeyId: number) => {
    try {
      await api(`/api/billing/billing-keys/${billingKeyId}/default`, {
        method: 'PUT',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/billing-keys'] });
      toast({
        title: '기본 카드 설정',
        description: '기본 결제 카드가 변경되었습니다.',
      });
    } catch (error: any) {
      toast({
        title: '설정 실패',
        description: error.message || '기본 카드 설정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  if (loadingKeys) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          결제 수단 관리
        </CardTitle>
        <CardDescription>
          정기결제에 사용할 카드를 등록하고 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 결제 카드가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {billingKeys.map((card) => (
              <div
                key={card.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  showSelection && selectedId === card.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                } ${showSelection ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
                onClick={() => showSelection && onSelect?.(card.id)}
                data-testid={`card-billing-key-${card.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {card.cardName}
                      </span>
                      {card.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                          기본
                        </span>
                      )}
                      {showSelection && selectedId === card.id && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      **** **** **** {card.cardNumber.slice(-4)}
                    </span>
                  </div>
                </div>

                {!showSelection && (
                  <div className="flex items-center gap-2">
                    {!card.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(card.id);
                        }}
                        data-testid={`button-set-default-${card.id}`}
                      >
                        기본으로
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deletingId === card.id}
                          data-testid={`button-delete-card-${card.id}`}
                        >
                          {deletingId === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>카드 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            이 결제 카드를 삭제하시겠습니까? 이 카드로 진행 중인 정기결제가 있다면 먼저 해지해주세요.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCard(card.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleAddCard}
          disabled={isAdding || isLoading}
          variant="outline"
          className="w-full"
          data-testid="button-add-card"
        >
          {isAdding || isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              카드 등록 중...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              새 카드 등록
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
