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
import { ko, enUS, ja, zhCN, fr, es, type Locale } from 'date-fns/locale';
import { 
  FEATURE_DICTIONARY, 
  IMPORTANT_FEATURES, 
  formatFeatureValue, 
  getFeatureLabel, 
  getPlanLabel 
} from '@/constants/billingFeatures';

interface Plan {
  id: number;
  name: string;
  price: number;
  priceUsd?: number;
  priceMonthlyUsd?: string;
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
  const { t, i18n } = useTranslation('billing');
  const { cancelSubscription, isLoading: paymentLoading } = usePayment();
  const queryClient = useQueryClient();

  // Locale mapping for date-fns (normalize language codes)
  const getDateLocale = () => {
    const lang = (i18n.language || 'en').split('-')[0]; // Extract primary language code
    const localeMap: Record<string, Locale> = {
      ko, en: enUS, ja, zh: zhCN, fr, es
    };
    return localeMap[lang] || enUS;
  };

  // Format date with current locale
  const formatDate = (date: Date | string, formatStr?: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const locale = getDateLocale();
    const lang = (i18n.language || 'en').split('-')[0]; // Extract primary language code
    
    // Default format patterns for each language
    const defaultFormats: Record<string, string> = {
      ko: 'yyyy년 M월 d일',
      en: 'MMM d, yyyy',
      ja: 'yyyy年M月d日',
      zh: 'yyyy年M月d日',
      fr: 'd MMM yyyy',
      es: 'd MMM yyyy'
    };
    
    const pattern = formatStr || defaultFormats[lang] || defaultFormats.en;
    return format(dateObj, pattern, { locale });
  };

  // Format amount with currency (fully locale-aware, USD default)
  const formatAmount = (amount: number, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat(i18n.language, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch {
      // Fallback if locale not supported
      return `$${amount.toFixed(2)}`;
    }
  };

  // Get translated status
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': t('status_active'),
      'canceling': t('status_canceling'),
      'completed': t('status_completed'),
      'cancelled': t('status_cancelled'),
      'expired': t('status_expired'),
      'pending': t('status_pending'),
      'failed': t('payment_failed')
    };
    // Return translated label if available, otherwise return the original status
    return statusMap[status.toLowerCase()] || status;
  };

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
                        {t('validity_period')}: {formatDate(usage.validUntil)}
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
                          date: formatDate(usage.limits.ai_message.periodEnd)
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
                          {getStatusLabel(subscription.status)}
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
                            {formatDate(subscription.currentPeriodEnd)}
                          </span>
                        </div>
                        {subscription.cancelledAt && (
                          <div className="flex justify-between text-amber-600">
                            <span>{t('cancellation_requested_date')}</span>
                            <span>
                              {formatDate(subscription.cancelledAt)}
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
                                  date: formatDate(subscription.currentPeriodEnd)
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
                        {getPlanLabel(plan.name, i18n.language?.startsWith('ko') ? 'ko' : 'en')}
                      </CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatAmount(plan.priceUsd || parseFloat(plan.priceMonthlyUsd || '0') || plan.price || 0)}
                        </span>
                        <span className="text-gray-500">
                          /{plan.type === 'subscription' ? t('per_month') : (plan.period || t('per_time'))}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(() => {
                          const lang = i18n.language?.startsWith('ko') ? 'ko' : 'en';
                          
                          if (plan.features && typeof plan.features === 'object' && !Array.isArray(plan.features)) {
                            const features = plan.features as Record<string, any>;
                            return IMPORTANT_FEATURES
                              .filter(key => features[key] !== undefined && features[key] !== null)
                              .map((key) => {
                                const value = features[key];
                                const config = FEATURE_DICTIONARY[key];
                                const Icon = config?.icon || Check;
                                const isIncluded = value !== 0 && value !== false;
                                
                                return (
                                  <li key={key} className={`flex items-center gap-3 text-sm ${!isIncluded ? 'text-gray-400' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isIncluded ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                      <span className="font-medium">{getFeatureLabel(key, lang)}</span>
                                      <span className="text-gray-500 ml-2">
                                        {formatFeatureValue(key, value, lang)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              });
                          }
                          
                          if (Array.isArray(plan.features)) {
                            return plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-3 text-sm">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3.5 h-3.5 text-green-600" />
                                </div>
                                <span>{String(feature)}</span>
                              </li>
                            ));
                          }
                          
                          return null;
                        })()}
                      </ul>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                      {(() => {
                        const planPrice = plan.priceUsd || parseFloat(plan.priceMonthlyUsd || '0') || plan.price || 0;
                        const isFree = planPrice === 0;
                        
                        if (subscription?.planId === plan.id) {
                          return (
                            <Button disabled className="w-full" variant="outline">
                              {t('currently_using')}
                            </Button>
                          );
                        }
                        
                        if (isFree) {
                          return (
                            <Button className="w-full" variant="outline" disabled>
                              {i18n.language?.startsWith('ko') ? '현재 무료 플랜' : 'Current Free Plan'}
                            </Button>
                          );
                        }
                        
                        return (
                          <>
                            <PaymentButton
                              type={plan.type === 'subscription' ? 'subscription' : 'trip_pass'}
                              amount={Math.round(planPrice * 100)}
                              orderName={plan.name}
                              payMethod="CARD"
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
                            <div className="flex gap-2 w-full">
                              <PaymentButton
                                type={plan.type === 'subscription' ? 'subscription' : 'trip_pass'}
                                amount={Math.round(planPrice * 100)}
                                orderName={plan.name}
                                payMethod="KAKAO"
                                planId={plan.id}
                                billingKeyId={selectedBillingKeyId || undefined}
                                onSuccess={() => {
                                  queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/billing/trip-passes'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/billing/usage'] });
                                }}
                                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black"
                              >
                                KakaoPay
                              </PaymentButton>
                              <PaymentButton
                                type={plan.type === 'subscription' ? 'subscription' : 'trip_pass'}
                                amount={Math.round(planPrice * 100)}
                                orderName={plan.name}
                                payMethod="PAYPAL"
                                planId={plan.id}
                                billingKeyId={selectedBillingKeyId || undefined}
                                onSuccess={() => {
                                  queryClient.invalidateQueries({ queryKey: ['/api/billing/subscription'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/billing/trip-passes'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/billing/usage'] });
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                              >
                                PayPal
                              </PaymentButton>
                            </div>
                          </>
                        );
                      })()}
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
                            {(() => {
                              const lang = (i18n.language || 'en').split('-')[0];
                              const timeFormats: Record<string, string> = {
                                ko: 'yyyy년 M월 d일 HH:mm',
                                en: 'MMM d, yyyy HH:mm',
                                ja: 'yyyy年M月d日 HH:mm',
                                zh: 'yyyy年M月d日 HH:mm',
                                fr: 'd MMM yyyy HH:mm',
                                es: 'd MMM yyyy HH:mm'
                              };
                              return formatDate(payment.createdAt, timeFormats[lang] || timeFormats.en);
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatAmount(payment.amount)}
                          </p>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {getStatusLabel(payment.status)}
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
