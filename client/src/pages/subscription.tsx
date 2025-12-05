import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  ArrowLeft, 
  Crown, 
  Sparkles, 
  Check, 
  Calendar, 
  CreditCard,
  AlertCircle,
  Loader2,
  Ticket,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePayment } from '@/hooks/usePayment';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import BillingKeyForm from '@/components/BillingKeyForm';
import PaymentButton from '@/components/PaymentButton';
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
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Plan {
  id: number;
  name: string;
  price: number;
  priceKrw?: number;
  type?: string;
  period: string;
  features: string[] | { [key: string]: string | number | boolean } | null;
  popular?: boolean;
}

interface Subscription {
  id: number;
  planId: number;
  planName: string;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodEnd: string;
  cancelledAt?: string;
}

interface TripPass {
  id: number;
  name: string;
  validUntil: string;
  aiMessageLimit: number;
  aiMessageUsed: number;
  translationLimit: number;
  translationUsed: number;
  conciergeCallsLimit: number;
  conciergeCallsUsed: number;
}

interface UsageData {
  source: 'trip_pass' | 'free_tier';
  tripPassId?: number;
  validUntil?: string;
  limits: {
    ai_message: { limit: number; used: number; remaining: number; periodEnd?: string };
    translation: { limit: number; used: number; remaining: number; periodEnd?: string };
    concierge: { limit: number; used: number; remaining: number; periodEnd?: string };
  };
}

interface PaymentHistory {
  id: number;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  description: string;
}

export default function SubscriptionPage() {
  const [selectedBillingKeyId, setSelectedBillingKeyId] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('billing');
  const { cancelSubscription, isLoading: paymentLoading } = usePayment();
  const queryClient = useQueryClient();

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ['/api/billing/plans'],
    enabled: !!user,
  });
  const plans = plansData?.plans || [];

  const { data: subscriptionData, isLoading: subLoading } = useQuery<{ subscription?: Subscription | null }>({
    queryKey: ['/api/billing/subscription'],
    enabled: !!user,
  });
  const subscription = subscriptionData?.subscription || null;

  const { data: tripPassesData, isLoading: passLoading } = useQuery<TripPass[] | { tripPasses: TripPass[] }>({
    queryKey: ['/api/billing/trip-passes'],
    enabled: !!user,
  });
  const tripPasses = Array.isArray(tripPassesData) ? tripPassesData : (tripPassesData?.tripPasses || []);

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ['/api/billing/usage'],
    enabled: !!user,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<PaymentHistory[] | { history: PaymentHistory[] }>({
    queryKey: ['/api/billing/history'],
    enabled: !!user,
  });
  const paymentHistory = Array.isArray(historyData) ? historyData : (historyData as any)?.history || [];

  const handleCancelSubscription = async () => {
    const result = await cancelSubscription();
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold mb-2">{t('login_required')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('login_required_message')}
            </p>
            <Link href="/auth">
              <Button data-testid="button-login-subscription">{t('login_button')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTripPass = tripPasses.find(
    (p) => new Date(p.validUntil) > new Date()
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-subscription">
              <ArrowLeft className="w-4 h-4" />
              {t('back_to_home')}
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('subscription_billing_management')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('page_description')}
          </p>
        </div>

        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="usage" data-testid="tab-usage">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('tab_usage')}
            </TabsTrigger>
            <TabsTrigger value="plans" data-testid="tab-plans">
              <Crown className="w-4 h-4 mr-2" />
              {t('tab_plans')}
            </TabsTrigger>
            <TabsTrigger value="payment" data-testid="tab-payment">
              <CreditCard className="w-4 h-4 mr-2" />
              {t('tab_payment_methods')}
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <Calendar className="w-4 h-4 mr-2" />
              {t('tab_payment_history')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="space-y-6">
            {usageLoading ? (
              <Card>
                <CardContent className="p-6 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
              </Card>
            ) : usage ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {usage.source === 'trip_pass' ? (
                        <>
                          <Ticket className="w-5 h-5 text-blue-500" />
                          {t('trip_pass_usage')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-purple-500" />
                          {t('free_tier_usage')}
                        </>
                      )}
                    </CardTitle>
                    {usage.validUntil && (
                      <CardDescription>
                        {t('validity_period')}: {format(new Date(usage.validUntil), 'yyyy년 M월 d일', { locale: ko })}까지
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('ai_message_label')}</span>
                        <span className="font-medium">
                          {usage.limits.ai_message.used} / {usage.limits.ai_message.limit}
                        </span>
                      </div>
                      <Progress 
                        value={(usage.limits.ai_message.used / usage.limits.ai_message.limit) * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('translation_label')}</span>
                        <span className="font-medium">
                          {usage.limits.translation.used} / {usage.limits.translation.limit}
                        </span>
                      </div>
                      <Progress 
                        value={(usage.limits.translation.used / usage.limits.translation.limit) * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('concierge_label')}</span>
                        <span className="font-medium">
                          {usage.limits.concierge.used} / {usage.limits.concierge.limit}
                        </span>
                      </div>
                      <Progress 
                        value={(usage.limits.concierge.used / usage.limits.concierge.limit) * 100} 
                        className="h-2"
                      />
                    </div>

                    {usage.source === 'free_tier' && usage.limits.ai_message.periodEnd && (
                      <p className="text-xs text-gray-500 text-center">
                        {t('free_tier_reset_info', { 
                          date: format(new Date(usage.limits.ai_message.periodEnd), 'yyyy년 M월 d일', { locale: ko })
                        })}
                      </p>
                    )}
                  </CardContent>
                  {usage.source === 'free_tier' && (
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant="outline" 
                        onClick={() => (document.querySelector('[data-testid="tab-plans"]') as HTMLElement)?.click()}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        {t('purchase_trip_pass_cta')}
                      </Button>
                    </CardFooter>
                  )}
                </Card>

                {subscription && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-amber-500" />
                          {t('current_subscription')}
                        </span>
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status === 'active' ? t('status_active') : t('status_canceling')}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('plan_label')}</span>
                          <span className="font-medium">{subscription.planName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{t('next_billing_date')}</span>
                          <span className="font-medium">
                            {format(new Date(subscription.currentPeriodEnd), 'yyyy년 M월 d일', { locale: ko })}
                          </span>
                        </div>
                        {subscription.cancelledAt && (
                          <div className="flex justify-between text-amber-600">
                            <span>{t('cancellation_requested_date')}</span>
                            <span>
                              {format(new Date(subscription.cancelledAt), 'yyyy년 M월 d일', { locale: ko })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    {subscription.status === 'active' && !subscription.cancelledAt && (
                      <CardFooter>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full text-red-500 hover:text-red-600" data-testid="button-cancel-subscription">
                              {t('cancel_subscription_button')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('cancel_subscription_confirm_title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('cancel_subscription_confirm_description', {
                                  date: format(new Date(subscription.currentPeriodEnd), 'yyyy년 M월 d일', { locale: ko })
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel_button')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelSubscription}
                                className="bg-red-500 hover:bg-red-600"
                                disabled={paymentLoading}
                              >
                                {paymentLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  t('confirm_cancel_button')
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    )}
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  {t('usage_load_error')}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`relative ${plan.popular ? 'border-blue-500 border-2' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-blue-500">{t('popular_badge')}</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {plan.name === 'Trip Pass' ? (
                          <Ticket className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Crown className="w-5 h-5 text-amber-500" />
                        )}
                        {plan.name}
                      </CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          ₩{(plan.priceKrw || plan.price || 0).toLocaleString()}
                        </span>
                        <span className="text-gray-500">
                          /{plan.type === 'subscription' ? t('per_month') : (plan.period || t('per_time'))}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {(() => {
                          const featureList = Array.isArray(plan.features) 
                            ? plan.features 
                            : plan.features && typeof plan.features === 'object'
                              ? Object.entries(plan.features)
                                  .filter(([_, v]) => v !== null && v !== undefined && v !== false)
                                  .map(([k, v]) => typeof v === 'boolean' ? k : `${k}: ${v}`)
                              : [];
                          return featureList.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{String(feature)}</span>
                            </li>
                          ));
                        })()}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {subscription?.planId === plan.id ? (
                        <Button disabled className="w-full" variant="outline">
                          {t('currently_using')}
                        </Button>
                      ) : (
                        <PaymentButton
                          type={plan.type === 'subscription' ? 'subscription' : 'trip_pass'}
                          amount={plan.priceKrw || plan.price || 0}
                          orderName={plan.name}
                          planId={plan.id}
                          billingKeyId={selectedBillingKeyId || undefined}
                          onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/billing/trip-passes'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/billing/usage'] });
                          }}
                          className="w-full"
                        >
                          {plan.type === 'subscription' ? t('subscribe_button') : t('purchase_button')}
                        </PaymentButton>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment">
            <BillingKeyForm
              onSelect={setSelectedBillingKeyId}
              selectedId={selectedBillingKeyId || undefined}
              showSelection={false}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  {t('no_payment_history')}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t('payment_history_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentHistory.map((payment: PaymentHistory) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-3 border-b last:border-0"
                        data-testid={`payment-history-${payment.id}`}
                      >
                        <div>
                          <p className="font-medium">{payment.description}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(payment.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ₩{payment.amount.toLocaleString()}
                          </p>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status === 'completed' ? t('status_completed') : payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
