import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShoppingCart,
  DollarSign,
  Users,
  Star,
  MapPin,
  Calendar,
  TrendingUp,
  Activity,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { useState } from 'react';

interface CommerceStats {
  totalExperiences: number;
  totalBookings: number;
  totalRevenue: number;
  totalHosts: number;
  averageRating: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
}

interface Experience {
  id: number;
  title: string;
  location: string;
  category: string;
  price: string;
  currency: string;
  rating: string;
  reviewCount: number;
  isActive: boolean;
  createdAt: string;
  host?: {
    firstName?: string;
    lastName?: string;
  };
}

interface Booking {
  id: number;
  experienceTitle: string;
  guestName: string;
  hostName: string;
  date: string;
  participants: number;
  totalPrice: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface Payment {
  id: number;
  bookingId: number;
  provider: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export default function CommerceDashboard() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'experiences' | 'bookings' | 'payments'>('overview');

  // 통계 데이터 조회
  const { data: stats, isLoading: statsLoading } = useQuery<CommerceStats>({
    queryKey: ['/api/admin/commerce/stats'],
  });

  // 경험 데이터 조회
  const { data: experiences = [], isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ['/api/admin/experiences'],
    enabled: selectedTab === 'experiences',
  });

  // 예약 데이터 조회
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['/api/admin/bookings'],
    enabled: selectedTab === 'bookings',
  });

  // 결제 데이터 조회
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['/api/admin/payments'],
    enabled: selectedTab === 'payments',
  });

  const formatPrice = (price: string, currency: string) => {
    const numPrice = parseInt(price);
    return `${numPrice.toLocaleString()}${currency === 'KRW' ? '원' : ' ' + currency}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'paid':
      case 'captured':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
      case 'authorized':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tour': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'food': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'activity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'tip': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">💼 커머스 대시보드</h2>
          <p className="text-muted-foreground">여행 경험 및 예약 관리</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'overview', label: '개요', icon: TrendingUp },
          { id: 'experiences', label: '경험 관리', icon: MapPin },
          { id: 'bookings', label: '예약 관리', icon: Calendar },
          { id: 'payments', label: '결제 관리', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              variant={selectedTab === tab.id ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setSelectedTab(tab.id as any)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-total-experiences">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 경험</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-experiences">
                    {stats.totalExperiences}
                  </div>
                  <p className="text-xs text-muted-foreground">등록된 여행 경험</p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-bookings">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 예약</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-bookings">
                    {stats.totalBookings}
                  </div>
                  <p className="text-xs text-muted-foreground">전체 예약 건수</p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-revenue">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    {formatPrice(stats.totalRevenue.toString(), 'KRW')}
                  </div>
                  <p className="text-xs text-muted-foreground">누적 매출액</p>
                </CardContent>
              </Card>

              <Card data-testid="card-total-hosts">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">활성 호스트</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-hosts">
                    {stats.totalHosts}
                  </div>
                  <p className="text-xs text-muted-foreground">등록된 호스트</p>
                </CardContent>
              </Card>

              <Card data-testid="card-average-rating">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-average-rating">
                    {stats.averageRating.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">5점 만점</p>
                </CardContent>
              </Card>

              <Card data-testid="card-pending-bookings">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">대기 예약</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-pending-bookings">
                    {stats.pendingBookings}
                  </div>
                  <p className="text-xs text-muted-foreground">승인 대기 중</p>
                </CardContent>
              </Card>

              <Card data-testid="card-successful-payments">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">성공 결제</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-successful-payments">
                    {stats.successfulPayments}
                  </div>
                  <p className="text-xs text-muted-foreground">결제 완료 건</p>
                </CardContent>
              </Card>

              <Card data-testid="card-failed-payments">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">실패 결제</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-failed-payments">
                    {stats.failedPayments}
                  </div>
                  <p className="text-xs text-muted-foreground">결제 실패 건</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">통계 데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Experiences Tab */}
      {selectedTab === 'experiences' && (
        <Card>
          <CardHeader>
            <CardTitle>여행 경험 관리</CardTitle>
          </CardHeader>
          <CardContent>
            {experiencesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead>가격</TableHead>
                    <TableHead>평점</TableHead>
                    <TableHead>호스트</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiences.map((experience) => (
                    <TableRow key={experience.id} data-testid={`row-experience-${experience.id}`}>
                      <TableCell className="font-medium" data-testid={`text-experience-title-${experience.id}`}>
                        {experience.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(experience.category)}>
                          {experience.category}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-experience-location-${experience.id}`}>
                        {experience.location}
                      </TableCell>
                      <TableCell data-testid={`text-experience-price-${experience.id}`}>
                        {formatPrice(experience.price, experience.currency)}
                      </TableCell>
                      <TableCell data-testid={`text-experience-rating-${experience.id}`}>
                        ⭐ {experience.rating} ({experience.reviewCount})
                      </TableCell>
                      <TableCell data-testid={`text-experience-host-${experience.id}`}>
                        {experience.host ? `${experience.host.firstName} ${experience.host.lastName}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={experience.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {experience.isActive ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bookings Tab */}
      {selectedTab === 'bookings' && (
        <Card>
          <CardHeader>
            <CardTitle>예약 관리</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>예약번호</TableHead>
                    <TableHead>경험</TableHead>
                    <TableHead>게스트</TableHead>
                    <TableHead>호스트</TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead>인원</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>예약상태</TableHead>
                    <TableHead>결제상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell className="font-medium" data-testid={`text-booking-id-${booking.id}`}>
                        #{booking.id}
                      </TableCell>
                      <TableCell data-testid={`text-booking-experience-${booking.id}`}>
                        {booking.experienceTitle}
                      </TableCell>
                      <TableCell data-testid={`text-booking-guest-${booking.id}`}>
                        {booking.guestName}
                      </TableCell>
                      <TableCell data-testid={`text-booking-host-${booking.id}`}>
                        {booking.hostName}
                      </TableCell>
                      <TableCell data-testid={`text-booking-date-${booking.id}`}>
                        {new Date(booking.date).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell data-testid={`text-booking-participants-${booking.id}`}>
                        {booking.participants}명
                      </TableCell>
                      <TableCell data-testid={`text-booking-price-${booking.id}`}>
                        {formatPrice(booking.totalPrice, 'KRW')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments Tab */}
      {selectedTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle>결제 관리</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>결제번호</TableHead>
                    <TableHead>예약번호</TableHead>
                    <TableHead>결제사</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>결제일시</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium" data-testid={`text-payment-id-${payment.id}`}>
                        #{payment.id}
                      </TableCell>
                      <TableCell data-testid={`text-payment-booking-${payment.id}`}>
                        #{payment.bookingId}
                      </TableCell>
                      <TableCell data-testid={`text-payment-provider-${payment.id}`}>
                        {payment.provider.toUpperCase()}
                      </TableCell>
                      <TableCell data-testid={`text-payment-amount-${payment.id}`}>
                        {formatPrice(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-payment-date-${payment.id}`}>
                        {new Date(payment.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}