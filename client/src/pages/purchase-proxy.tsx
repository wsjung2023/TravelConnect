// @ts-nocheck
// 대리구매 페이지 — 여행자가 쇼핑 대행 주문을 작성하고, 가이드가 수락·처리하는 대리구매 화면.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, ShoppingCart, Clock, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// 폼 스키마 팩토리 — t()로 검증 메시지 다국어화
const buildCreateRequestSchema = (t: (k: string) => string) => z.object({
  serviceId: z.number(),
  productName: z.string().min(1, t('purchaseProxy.validationProductName')),
  productDescription: z.string().optional(),
  productUrl: z.string().url().optional().or(z.literal('')),
  estimatedPrice: z.string().min(1, t('purchaseProxy.validationEstimatedPrice')),
  currency: z.string().default('USD'),
  quantity: z.number().min(1, t('purchaseProxy.validationQuantity')),
  urgency: z.enum(['urgent', 'normal', 'flexible']).default('normal'),
  deliveryAddress: z.string().min(1, t('purchaseProxy.validationDeliveryAddress')),
  specialInstructions: z.string().optional(),
});

const buildCreateQuoteSchema = (t: (k: string) => string) => z.object({
  requestId: z.number(),
  productPrice: z.string().min(1, t('purchaseProxy.validationProductPrice')),
  commissionFee: z.string().min(1, t('purchaseProxy.validationCommission')),
  shippingFee: z.string().min(1, t('purchaseProxy.validationShipping')),
  totalPrice: z.string().min(1, t('purchaseProxy.validationTotalPrice')),
  estimatedDelivery: z.string().min(1, t('purchaseProxy.validationEstimatedDelivery')),
  paymentMethod: z.string().min(1, t('purchaseProxy.validationPaymentMethod')),
  notes: z.string().optional(),
  validUntil: z.string().min(1, t('purchaseProxy.validationValidUntil')),
});

type CreateRequestForm = z.infer<ReturnType<typeof buildCreateRequestSchema>>;
type CreateQuoteForm = z.infer<ReturnType<typeof buildCreateQuoteSchema>>;

interface ShoppingService {
  id: number;
  title: string;
  description: string;
  hostId: string;
  price: string;
  currency: string;
  location: string;
  rating: string;
  reviewCount: number;
  specialtyAreas?: string[];
  commissionRate?: string;
  shippingInfo?: string;
  processingTime?: string;
  images?: string[];
}

interface PurchaseRequest {
  id: number;
  serviceId: number;
  buyerId: string;
  sellerId: string;
  productName: string;
  productDescription?: string;
  productUrl?: string;
  estimatedPrice: string;
  currency: string;
  quantity: number;
  urgency: string;
  deliveryAddress: string;
  specialInstructions?: string;
  status: string;
  createdAt: string;
}

interface PurchaseQuote {
  id: number;
  requestId: number;
  sellerId: string;
  productPrice: string;
  commissionFee: string;
  shippingFee: string;
  totalPrice: string;
  estimatedDelivery: string;
  paymentMethod: string;
  notes?: string;
  validUntil: string;
  status: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: number;
  requestId: number;
  quoteId: number;
  buyerId: string;
  sellerId: string;
  orderNumber: string;
  totalAmount: string;
  paymentStatus: string;
  orderStatus: string;
  trackingNumber?: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  createdAt: string;
}

export default function PurchaseProxyPage() {
  const { t } = useTranslation('ui');
  const createRequestSchema = buildCreateRequestSchema(t);
  const createQuoteSchema = buildCreateQuoteSchema(t);
  const [activeTab, setActiveTab] = useState('services');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ShoppingService | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 데이터 조회 쿼리들
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/shopping-services'],
  });

  const { data: buyerRequests = [] } = useQuery({
    queryKey: ['/api/purchase-requests/buyer'],
  });

  const { data: sellerRequests = [] } = useQuery({
    queryKey: ['/api/purchase-requests/seller'],
  });

  const { data: buyerOrders = [] } = useQuery({
    queryKey: ['/api/purchase-orders/buyer'],
  });

  const { data: sellerOrders = [] } = useQuery({
    queryKey: ['/api/purchase-orders/seller'],
  });

  // 폼 설정
  const requestForm = useForm<CreateRequestForm>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      currency: 'USD',
      quantity: 1,
      urgency: 'normal',
    },
  });

  const quoteForm = useForm<CreateQuoteForm>({
    resolver: zodResolver(createQuoteSchema),
  });

  // 뮤테이션들
  const createRequestMutation = useMutation({
    mutationFn: (data: CreateRequestForm) => apiRequest('/api/purchase-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: t('purchaseProxy.toastRequestSuccess') });
      setIsRequestDialogOpen(false);
      requestForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/buyer'] });
    },
    onError: () => {
      toast({ title: t('purchaseProxy.toastRequestFail'), variant: 'destructive' });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: CreateQuoteForm) => apiRequest('/api/purchase-quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: t('purchaseProxy.toastQuoteSuccess') });
      setIsQuoteDialogOpen(false);
      quoteForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/seller'] });
    },
    onError: () => {
      toast({ title: t('purchaseProxy.toastQuoteFail'), variant: 'destructive' });
    },
  });

  const handleCreateRequest = (data: CreateRequestForm) => {
    createRequestMutation.mutate(data);
  };

  const handleCreateQuote = (data: CreateQuoteForm) => {
    createQuoteMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'quoted': return 'outline';
      case 'accepted': return 'default';
      case 'completed': return 'success';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('purchaseProxy.statusPending');
      case 'quoted': return t('purchaseProxy.statusQuoted');
      case 'accepted': return t('purchaseProxy.statusAccepted');
      case 'completed': return t('purchaseProxy.statusCompleted');
      case 'cancelled': return t('purchaseProxy.statusCancelled');
      default: return status;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="purchase-proxy-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="title-main">{t('purchaseProxy.pageTitle')}</h1>
        <p className="text-muted-foreground" data-testid="description-main">
          {t('purchaseProxy.pageDescription')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services" data-testid="tab-services">{t('purchaseProxy.tabServices')}</TabsTrigger>
          <TabsTrigger value="my-requests" data-testid="tab-my-requests">{t('purchaseProxy.tabMyRequests')}</TabsTrigger>
          <TabsTrigger value="received-requests" data-testid="tab-received-requests">{t('purchaseProxy.tabReceivedRequests')}</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">{t('purchaseProxy.tabOrders')}</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold" data-testid="title-services">{t('purchaseProxy.sectionServices')}</h2>
          </div>

          {servicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service: ShoppingService) => (
                <Card key={service.id} data-testid={`service-card-${service.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {service.title}
                    </CardTitle>
                    <CardDescription>
                      {service.location} • {service.currency} {service.price}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {service.description}
                    </p>
                    
                    {service.specialtyAreas && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">{t('purchaseProxy.specialtyAreas')}</p>
                        <div className="flex flex-wrap gap-1">
                          {service.specialtyAreas.map((area, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{service.rating}</span>
                      <span className="text-muted-foreground">
                        {t('purchaseProxy.reviewCount', { count: service.reviewCount })}
                      </span>
                    </div>

                    {service.commissionRate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('purchaseProxy.commission', { rate: service.commissionRate })}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            setSelectedService(service);
                            requestForm.setValue('serviceId', service.id);
                          }}
                          data-testid={`button-request-${service.id}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {t('purchaseProxy.requestButton')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{t('purchaseProxy.requestTitle')}</DialogTitle>
                          <DialogDescription>
                            {t('purchaseProxy.requestDialogDesc', { name: selectedService?.title ?? '' })}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...requestForm}>
                          <form onSubmit={requestForm.handleSubmit(handleCreateRequest)} className="space-y-4">
                            <FormField
                              control={requestForm.control}
                              name="productName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.productNameLabel')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('purchaseProxy.productNamePlaceholder')} {...field} data-testid="input-product-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={requestForm.control}
                              name="productDescription"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.productDescLabel')}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder={t('purchaseProxy.productDescPlaceholder')} {...field} data-testid="textarea-product-description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={requestForm.control}
                              name="productUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.productUrlLabel')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('purchaseProxy.productUrlPlaceholder')} {...field} data-testid="input-product-url" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={requestForm.control}
                                name="estimatedPrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('purchaseProxy.estimatedPriceLabel')}</FormLabel>
                                    <FormControl>
                                      <Input placeholder="100000" {...field} data-testid="input-estimated-price" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={requestForm.control}
                                name="quantity"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('purchaseProxy.quantityLabel')}</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        {...field} 
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                        data-testid="input-quantity"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={requestForm.control}
                              name="urgency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.urgencyLabel')}</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-urgency">
                                        <SelectValue placeholder={t('purchaseProxy.urgencyPlaceholder')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="urgent">{t('purchaseProxy.urgencyUrgent')}</SelectItem>
                                      <SelectItem value="normal">{t('purchaseProxy.urgencyNormal')}</SelectItem>
                                      <SelectItem value="flexible">{t('purchaseProxy.urgencyFlexible')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={requestForm.control}
                              name="deliveryAddress"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.deliveryAddressLabel')}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder={t('purchaseProxy.deliveryAddressPlaceholder')} {...field} data-testid="textarea-delivery-address" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={requestForm.control}
                              name="specialInstructions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.specialLabel')}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder={t('purchaseProxy.specialPlaceholder')} {...field} data-testid="textarea-special-instructions" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="submit" disabled={createRequestMutation.isPending} data-testid="button-submit-request">
                                {createRequestMutation.isPending ? t('purchaseProxy.submittingRequest') : t('purchaseProxy.submitRequest')}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-6">
          <h2 className="text-2xl font-semibold" data-testid="title-my-requests">{t('purchaseProxy.sectionMyRequests')}</h2>
          
          <div className="grid gap-4">
            {buyerRequests.map((request: PurchaseRequest) => (
              <Card key={request.id} data-testid={`request-card-${request.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {request.productName}
                      </CardTitle>
                      <CardDescription>
                        {t('purchaseProxy.qtyAndEstimate', { quantity: request.quantity, currency: request.currency, price: request.estimatedPrice })}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {getStatusText(request.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {request.productDescription && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {request.productDescription}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {t('purchaseProxy.requestDate', { date: new Date(request.createdAt).toLocaleDateString() })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {buyerRequests.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('purchaseProxy.emptyMyRequests')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="received-requests" className="space-y-6">
          <h2 className="text-2xl font-semibold" data-testid="title-received-requests">{t('purchaseProxy.sectionReceivedRequests')}</h2>
          
          <div className="grid gap-4">
            {sellerRequests.map((request: PurchaseRequest) => (
              <Card key={request.id} data-testid={`received-request-card-${request.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {request.productName}
                      </CardTitle>
                      <CardDescription>
                        {t('purchaseProxy.qtyAndEstimate', { quantity: request.quantity, currency: request.currency, price: request.estimatedPrice })}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {getStatusText(request.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {request.productDescription && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {request.productDescription}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mb-4">
                    {t('purchaseProxy.requestDate', { date: new Date(request.createdAt).toLocaleDateString() })}
                  </div>
                  
                  {request.status === 'pending' && (
                    <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedRequest(request);
                            quoteForm.setValue('requestId', request.id);
                          }}
                          data-testid={`button-quote-${request.id}`}
                        >
                          {t('purchaseProxy.sendQuote')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{t('purchaseProxy.quoteTitle')}</DialogTitle>
                          <DialogDescription>
                            {t('purchaseProxy.quoteDialogDesc', { name: selectedRequest?.productName ?? '' })}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...quoteForm}>
                          <form onSubmit={quoteForm.handleSubmit(handleCreateQuote)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={quoteForm.control}
                                name="productPrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('purchaseProxy.productPriceLabel')}</FormLabel>
                                    <FormControl>
                                      <Input placeholder={t('purchaseProxy.productPricePlaceholder')} {...field} data-testid="input-product-price" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={quoteForm.control}
                                name="commissionFee"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('purchaseProxy.commissionLabel')}</FormLabel>
                                    <FormControl>
                                      <Input placeholder={t('purchaseProxy.commissionPlaceholder')} {...field} data-testid="input-commission-fee" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={quoteForm.control}
                                name="shippingFee"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('purchaseProxy.shippingLabel')}</FormLabel>
                                    <FormControl>
                                      <Input placeholder={t('purchaseProxy.shippingPlaceholder')} {...field} data-testid="input-shipping-fee" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={quoteForm.control}
                                name="totalPrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{t('purchaseProxy.totalLabel')}</FormLabel>
                                    <FormControl>
                                      <Input placeholder={t('purchaseProxy.totalPlaceholder')} {...field} data-testid="input-total-price" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={quoteForm.control}
                              name="estimatedDelivery"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.estimatedDeliveryLabel')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('purchaseProxy.estimatedDeliveryPlaceholder')} {...field} data-testid="input-estimated-delivery" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={quoteForm.control}
                              name="paymentMethod"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.paymentMethodLabel')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('purchaseProxy.paymentMethodPlaceholder')} {...field} data-testid="input-payment-method" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={quoteForm.control}
                              name="validUntil"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.validUntilLabel')}</FormLabel>
                                  <FormControl>
                                    <Input type="datetime-local" {...field} data-testid="input-valid-until" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={quoteForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('purchaseProxy.notesLabel')}</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder={t('purchaseProxy.notesPlaceholder')} {...field} data-testid="textarea-notes" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="submit" disabled={createQuoteMutation.isPending} data-testid="button-submit-quote">
                                {createQuoteMutation.isPending ? t('purchaseProxy.submittingQuote') : t('purchaseProxy.submitQuote')}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {sellerRequests.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('purchaseProxy.emptyReceivedRequests')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <h2 className="text-2xl font-semibold" data-testid="title-orders">{t('purchaseProxy.sectionOrders')}</h2>
          
          <Tabs defaultValue="buyer-orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="buyer-orders" data-testid="tab-buyer-orders">{t('purchaseProxy.subTabBuyerOrders')}</TabsTrigger>
              <TabsTrigger value="seller-orders" data-testid="tab-seller-orders">{t('purchaseProxy.subTabSellerOrders')}</TabsTrigger>
            </TabsList>

            <TabsContent value="buyer-orders">
              <div className="grid gap-4">
                {buyerOrders.map((order: PurchaseOrder) => (
                  <Card key={order.id} data-testid={`buyer-order-card-${order.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {t('purchaseProxy.orderNumber', { number: order.orderNumber })}
                          </CardTitle>
                          <CardDescription>
                            {t('purchaseProxy.totalAmount', { amount: order.totalAmount })}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadgeVariant(order.orderStatus)}>
                            {getStatusText(order.orderStatus)}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('purchaseProxy.paymentLabel', { status: getStatusText(order.paymentStatus) })}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {order.trackingNumber && (
                        <p className="text-sm mb-2">
                          <strong>{t('purchaseProxy.trackingNumber')}:</strong> {order.trackingNumber}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {t('purchaseProxy.orderDate', { date: new Date(order.createdAt).toLocaleDateString() })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {buyerOrders.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('purchaseProxy.emptyBuyerOrders')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="seller-orders">
              <div className="grid gap-4">
                {sellerOrders.map((order: PurchaseOrder) => (
                  <Card key={order.id} data-testid={`seller-order-card-${order.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {t('purchaseProxy.orderNumber', { number: order.orderNumber })}
                          </CardTitle>
                          <CardDescription>
                            {t('purchaseProxy.totalAmount', { amount: order.totalAmount })}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadgeVariant(order.orderStatus)}>
                            {getStatusText(order.orderStatus)}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('purchaseProxy.paymentLabel', { status: getStatusText(order.paymentStatus) })}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {order.trackingNumber && (
                        <p className="text-sm mb-2">
                          <strong>{t('purchaseProxy.trackingNumber')}:</strong> {order.trackingNumber}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {t('purchaseProxy.orderDate', { date: new Date(order.createdAt).toLocaleDateString() })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {sellerOrders.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('purchaseProxy.emptySellerOrders')}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}