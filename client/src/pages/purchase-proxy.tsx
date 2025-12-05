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

// 폼 스키마 정의
const createRequestSchema = z.object({
  serviceId: z.number(),
  productName: z.string().min(1, '상품명을 입력해주세요'),
  productDescription: z.string().optional(),
  productUrl: z.string().url().optional().or(z.literal('')),
  estimatedPrice: z.string().min(1, '예상 가격을 입력해주세요'),
  currency: z.string().default('USD'),
  quantity: z.number().min(1, '수량은 1개 이상이어야 합니다'),
  urgency: z.enum(['urgent', 'normal', 'flexible']).default('normal'),
  deliveryAddress: z.string().min(1, '배송 주소를 입력해주세요'),
  specialInstructions: z.string().optional(),
});

const createQuoteSchema = z.object({
  requestId: z.number(),
  productPrice: z.string().min(1, '상품 가격을 입력해주세요'),
  commissionFee: z.string().min(1, '수수료를 입력해주세요'),
  shippingFee: z.string().min(1, '배송비를 입력해주세요'),
  totalPrice: z.string().min(1, '총 가격을 입력해주세요'),
  estimatedDelivery: z.string().min(1, '예상 배송 기간을 입력해주세요'),
  paymentMethod: z.string().min(1, '결제 방법을 입력해주세요'),
  notes: z.string().optional(),
  validUntil: z.string().min(1, '견적 유효 기간을 입력해주세요'),
});

type CreateRequestForm = z.infer<typeof createRequestSchema>;
type CreateQuoteForm = z.infer<typeof createQuoteSchema>;

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
      toast({ title: '구매 요청이 생성되었습니다' });
      setIsRequestDialogOpen(false);
      requestForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/buyer'] });
    },
    onError: () => {
      toast({ title: '구매 요청 생성 실패', variant: 'destructive' });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: CreateQuoteForm) => apiRequest('/api/purchase-quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: '견적이 생성되었습니다' });
      setIsQuoteDialogOpen(false);
      quoteForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/seller'] });
    },
    onError: () => {
      toast({ title: '견적 생성 실패', variant: 'destructive' });
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
      case 'pending': return '대기중';
      case 'quoted': return '견적됨';
      case 'accepted': return '승인됨';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="purchase-proxy-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="title-main">구매대행 서비스</h1>
        <p className="text-muted-foreground" data-testid="description-main">
          현지 쇼핑 전문가들과 함께하는 안전한 구매대행 서비스
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services" data-testid="tab-services">서비스 찾기</TabsTrigger>
          <TabsTrigger value="my-requests" data-testid="tab-my-requests">내 요청</TabsTrigger>
          <TabsTrigger value="received-requests" data-testid="tab-received-requests">받은 요청</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">주문 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold" data-testid="title-services">구매대행 서비스</h2>
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
                        <p className="text-sm font-medium mb-1">전문 분야:</p>
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
                        ({service.reviewCount}개 리뷰)
                      </span>
                    </div>

                    {service.commissionRate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        수수료: {service.commissionRate}
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
                          구매 요청하기
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>구매 요청 생성</DialogTitle>
                          <DialogDescription>
                            {selectedService?.title}에게 구매 요청을 보냅니다
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...requestForm}>
                          <form onSubmit={requestForm.handleSubmit(handleCreateRequest)} className="space-y-4">
                            <FormField
                              control={requestForm.control}
                              name="productName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>상품명 *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="구매하고 싶은 상품명을 입력하세요" {...field} data-testid="input-product-name" />
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
                                  <FormLabel>상품 설명</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="상품에 대한 자세한 설명을 입력하세요" {...field} data-testid="textarea-product-description" />
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
                                  <FormLabel>상품 링크</FormLabel>
                                  <FormControl>
                                    <Input placeholder="상품 구매 링크 (선택사항)" {...field} data-testid="input-product-url" />
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
                                    <FormLabel>예상 가격 *</FormLabel>
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
                                    <FormLabel>수량 *</FormLabel>
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
                                  <FormLabel>긴급도</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-urgency">
                                        <SelectValue placeholder="긴급도를 선택하세요" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="urgent">긴급</SelectItem>
                                      <SelectItem value="normal">보통</SelectItem>
                                      <SelectItem value="flexible">여유있음</SelectItem>
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
                                  <FormLabel>배송 주소 *</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="배송받을 주소를 입력하세요" {...field} data-testid="textarea-delivery-address" />
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
                                  <FormLabel>특별 요청사항</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="특별한 요청사항이 있으면 입력하세요" {...field} data-testid="textarea-special-instructions" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="submit" disabled={createRequestMutation.isPending} data-testid="button-submit-request">
                                {createRequestMutation.isPending ? '생성 중...' : '구매 요청 보내기'}
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
          <h2 className="text-2xl font-semibold" data-testid="title-my-requests">내가 보낸 구매 요청</h2>
          
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
                        수량: {request.quantity}개 • 예상가격: {request.currency} {request.estimatedPrice}
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
                    요청일: {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {buyerRequests.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">아직 보낸 구매 요청이 없습니다</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="received-requests" className="space-y-6">
          <h2 className="text-2xl font-semibold" data-testid="title-received-requests">받은 구매 요청</h2>
          
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
                        수량: {request.quantity}개 • 예상가격: {request.currency} {request.estimatedPrice}
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
                    요청일: {new Date(request.createdAt).toLocaleDateString()}
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
                          견적 보내기
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>견적서 작성</DialogTitle>
                          <DialogDescription>
                            {selectedRequest?.productName}에 대한 견적을 작성합니다
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
                                    <FormLabel>상품 가격 *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="실제 상품 가격" {...field} data-testid="input-product-price" />
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
                                    <FormLabel>수수료 *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="구매대행 수수료" {...field} data-testid="input-commission-fee" />
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
                                    <FormLabel>배송비 *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="국제배송비" {...field} data-testid="input-shipping-fee" />
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
                                    <FormLabel>총 가격 *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="총 결제 금액" {...field} data-testid="input-total-price" />
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
                                  <FormLabel>예상 배송 기간 *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="3-5일" {...field} data-testid="input-estimated-delivery" />
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
                                  <FormLabel>결제 방법 *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="PayPal, 은행송금 등" {...field} data-testid="input-payment-method" />
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
                                  <FormLabel>견적 유효 기간 *</FormLabel>
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
                                  <FormLabel>추가 메모</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="견적에 대한 추가 설명" {...field} data-testid="textarea-notes" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="submit" disabled={createQuoteMutation.isPending} data-testid="button-submit-quote">
                                {createQuoteMutation.isPending ? '생성 중...' : '견적서 보내기'}
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
              <p className="text-muted-foreground">아직 받은 구매 요청이 없습니다</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <h2 className="text-2xl font-semibold" data-testid="title-orders">주문 관리</h2>
          
          <Tabs defaultValue="buyer-orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="buyer-orders" data-testid="tab-buyer-orders">구매 주문</TabsTrigger>
              <TabsTrigger value="seller-orders" data-testid="tab-seller-orders">판매 주문</TabsTrigger>
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
                            주문번호: {order.orderNumber}
                          </CardTitle>
                          <CardDescription>
                            총 금액: {order.totalAmount}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadgeVariant(order.orderStatus)}>
                            {getStatusText(order.orderStatus)}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            결제: {getStatusText(order.paymentStatus)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {order.trackingNumber && (
                        <p className="text-sm mb-2">
                          <strong>배송 추적번호:</strong> {order.trackingNumber}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        주문일: {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {buyerOrders.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">아직 구매 주문이 없습니다</p>
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
                            주문번호: {order.orderNumber}
                          </CardTitle>
                          <CardDescription>
                            총 금액: {order.totalAmount}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadgeVariant(order.orderStatus)}>
                            {getStatusText(order.orderStatus)}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            결제: {getStatusText(order.paymentStatus)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {order.trackingNumber && (
                        <p className="text-sm mb-2">
                          <strong>배송 추적번호:</strong> {order.trackingNumber}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        주문일: {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {sellerOrders.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">아직 판매 주문이 없습니다</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}