import { useState } from 'react';
import { CreditCard, Loader2, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('billing');
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
        title: t('error_title'),
        description: t('card_config_load_error'),
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
        throw new Error(response.message || t('card_registration_failed'));
      }

      if (response.billingKey) {
        await registerBillingKey(response.billingKey);
        queryClient.invalidateQueries({ queryKey: ['/api/billing/billing-keys'] });
        toast({
          title: t('card_registration_success_title'),
          description: t('card_registration_success_description'),
        });
      }
    } catch (error: any) {
      toast({
        title: t('card_registration_error_title'),
        description: error.message || t('card_registration_error_description'),
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
        title: t('card_deletion_success_title'),
        description: t('card_deletion_success_description'),
      });
    } catch (error: any) {
      toast({
        title: t('card_deletion_error_title'),
        description: error.message || t('card_deletion_error_description'),
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
        title: t('default_card_set_title'),
        description: t('default_card_set_description'),
      });
    } catch (error: any) {
      toast({
        title: t('setting_failed_title'),
        description: error.message || t('default_card_set_error'),
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
          {t('payment_method_management')}
        </CardTitle>
        <CardDescription>
          {t('payment_method_management_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('no_registered_cards')}
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
                          {t('default_badge')}
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
                        {t('set_as_default')}
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
                          <AlertDialogTitle>{t('delete_card_title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('delete_card_description')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel_button')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCard(card.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {t('delete_button')}
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
              {t('registering_card')}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              {t('register_new_card')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
