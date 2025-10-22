import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, Edit, Calendar, Users, MapPin, Star, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import CreateExperienceModal from '@/components/CreateExperienceModal';
import CreateReviewModal from '@/components/CreateReviewModal';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Experience {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  price: string;
  currency: string;
  duration: number;
  maxParticipants: number;
  rating: string;
  reviewCount: number;
  isActive: boolean;
  images: string[];
  createdAt: string;
}

interface Booking {
  id: number;
  experienceId: number;
  experienceTitle: string;
  guestName: string;
  date: string;
  participants: number;
  totalPrice: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export default function HostDashboard() {
  const { t } = useTranslation('ui');
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'experiences' | 'bookings'>('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  // 로딩 중이면 스피너 표시
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 로그인하지 않은 사용자는 홈으로 리다이렉트
  if (!user) {
    setLocation('/');
    return null;
  }

  // 호스트가 아니면 접근 거부 메시지
  if (!user.isHost) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('host.accessDenied')}</CardTitle>
            <CardDescription>
              {t('host.accessDeniedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-back-home"
            >
              {t('host.backHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 내 경험 조회
  const { data: experiences = [], isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ['/api/host/experiences'],
    enabled: !!user && user.isHost,
  });

  // 내 예약 조회
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['/api/host/bookings'],
    enabled: !!user && user.isHost,
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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
      case 'failed':
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

  // 예약 승인/거절 처리
  const handleBookingAction = async (bookingId: number, newStatus: 'confirmed' | 'cancelled') => {
    try {
      await apiRequest(`/api/host/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 성공 메시지
      toast({
        title: newStatus === 'confirmed' ? t('toast:success.bookingApproved') : t('toast:success.bookingRejected'),
        description: t('toast:success.bookingStatusUpdated', { id: bookingId }),
      });

      // 예약 목록 다시 불러오기
      queryClient.invalidateQueries({ queryKey: ['/api/host/bookings'] });
    } catch (error) {
      toast({
        title: t('toast:error.title'),
        description: t('toast:error.bookingStatusFailed'),
        variant: 'destructive',
      });
      console.error('예약 상태 변경 오류:', error);
    }
  };

  // 통계 계산
  const activeExperiences = experiences.filter(exp => exp.isActive).length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(booking => booking.status === 'pending').length;
  const totalRevenue = bookings
    .filter(booking => booking.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + parseInt(booking.totalPrice), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-host-dashboard-title">
              {t('host.dashboard')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('host.welcome', { name: `${user.firstName} ${user.lastName}` })}
            </p>
          </div>
          <Button 
            className="mt-4 md:mt-0"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="button-add-experience"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {t('host.createExperience')}
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('host.activeExperiences')}</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-experiences">
                {activeExperiences}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('host.total')} {experiences.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('host.totalBookings')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-bookings">
                {totalBookings}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('host.pendingBookings')}: {pendingBookings}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('host.totalRevenue')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {totalRevenue.toLocaleString()}원
              </div>
              <p className="text-xs text-muted-foreground">
                {t('host.paidOnly')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('host.averageRating')}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-average-rating">
                {experiences.length > 0 
                  ? (experiences.reduce((sum, exp) => sum + parseFloat(exp.rating), 0) / experiences.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {t('host.totalReviews', { count: experiences.reduce((sum, exp) => sum + exp.reviewCount, 0) })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">{t('host.overview')}</TabsTrigger>
            <TabsTrigger value="experiences" data-testid="tab-experiences">{t('host.myExperiences')}</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">{t('host.bookingManagement')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('host.recentActivity')}</CardTitle>
                <CardDescription>
                  {t('host.checkDetails')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {experiences.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {t('host.noExperiences')}
                    </p>
                    <Button data-testid="button-create-first-experience">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {t('host.createFirstExperience')}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {t('host.viewDetails')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experiences" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('host.manageExperiences')}</CardTitle>
                  <CardDescription>
                    {t('host.addExperienceDesc')}
                  </CardDescription>
                </div>
                <Button size="sm" data-testid="button-add-new-experience">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t('host.addExperience')}
                </Button>
              </CardHeader>
              <CardContent>
                {experiencesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : experiences.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {t('host.noExperiences')}
                    </p>
                    <Button data-testid="button-create-experience">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {t('host.createExperience')}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('host.title')}</TableHead>
                        <TableHead>{t('host.category')}</TableHead>
                        <TableHead>{t('host.location')}</TableHead>
                        <TableHead>{t('host.price')}</TableHead>
                        <TableHead>{t('host.rating')}</TableHead>
                        <TableHead>{t('host.status')}</TableHead>
                        <TableHead>{t('host.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {experiences.map((experience) => (
                        <TableRow key={experience.id} data-testid={`row-experience-${experience.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{experience.title}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {experience.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getCategoryColor(experience.category)}>
                              {experience.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <MapPin className="w-4 h-4 mr-1" />
                              {experience.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatPrice(experience.price, experience.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 mr-1" />
                              <span>{experience.rating}</span>
                              <span className="text-sm text-muted-foreground ml-1">
                                ({experience.reviewCount})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={experience.isActive ? "default" : "secondary"}
                              data-testid={`status-experience-${experience.id}`}
                            >
                              {experience.isActive ? t('host.active') : t('host.inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-edit-${experience.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('host.bookingManagement')}</CardTitle>
                <CardDescription>
                  {t('host.checkDetails')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {t('host.noBookings')}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('host.experience')}</TableHead>
                        <TableHead>{t('host.guest')}</TableHead>
                        <TableHead>{t('host.date')}</TableHead>
                        <TableHead>{t('host.participants')}</TableHead>
                        <TableHead>{t('host.total')}</TableHead>
                        <TableHead>{t('host.bookingStatus')}</TableHead>
                        <TableHead>{t('host.paymentStatus')}</TableHead>
                        <TableHead>{t('host.manage')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                          <TableCell>
                            <div className="font-medium">{booking.experienceTitle}</div>
                          </TableCell>
                          <TableCell>{booking.guestName}</TableCell>
                          <TableCell>
                            {new Date(booking.date).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>{booking.participants}{t('experiencePage.people')}</TableCell>
                          <TableCell>
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
                          <TableCell>
                            {booking.status === 'completed' ? (
                              <CreateReviewModal booking={booking}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-review-${booking.id}`}
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  {t('host.writeReview')}
                                </Button>
                              </CreateReviewModal>
                            ) : booking.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                  data-testid={`button-approve-${booking.id}`}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {t('host.approve')}
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleBookingAction(booking.id, 'cancelled')}
                                  data-testid={`button-reject-${booking.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  {t('host.reject')}
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-manage-${booking.id}`}
                              >
                                {t('host.manage')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 경험 등록 모달 */}
      <CreateExperienceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}