import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
            <CardTitle className="text-2xl">접근 권한 없음</CardTitle>
            <CardDescription>
              호스트 계정만 이 페이지에 접근할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
              data-testid="button-back-home"
            >
              홈으로 돌아가기
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
        title: newStatus === 'confirmed' ? '예약이 승인되었습니다' : '예약이 거절되었습니다',
        description: `예약 #${bookingId}의 상태가 업데이트되었습니다.`,
      });

      // 예약 목록 다시 불러오기
      queryClient.invalidateQueries({ queryKey: ['/api/host/bookings'] });
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '예약 상태 변경 중 오류가 발생했습니다.',
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
              호스트 대시보드
            </h1>
            <p className="text-muted-foreground mt-2">
              안녕하세요, {user.firstName} {user.lastName}님
            </p>
          </div>
          <Button 
            className="mt-4 md:mt-0"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="button-add-experience"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            새 경험 등록
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 경험</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-experiences">
                {activeExperiences}
              </div>
              <p className="text-xs text-muted-foreground">
                총 {experiences.length}개 중
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 예약</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-bookings">
                {totalBookings}
              </div>
              <p className="text-xs text-muted-foreground">
                대기 중: {pendingBookings}개
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 수익</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-revenue">
                {totalRevenue.toLocaleString()}원
              </div>
              <p className="text-xs text-muted-foreground">
                결제 완료 기준
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
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
                총 {experiences.reduce((sum, exp) => sum + exp.reviewCount, 0)}개 리뷰
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">개요</TabsTrigger>
            <TabsTrigger value="experiences" data-testid="tab-experiences">내 경험</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">예약 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  최근 등록한 경험과 예약 현황을 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {experiences.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      아직 등록된 경험이 없습니다.
                    </p>
                    <Button data-testid="button-create-first-experience">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      첫 번째 경험 만들기
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      상세한 정보는 '내 경험'과 '예약 관리' 탭에서 확인하세요.
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
                  <CardTitle>내 경험 관리</CardTitle>
                  <CardDescription>
                    등록한 경험을 관리하고 새로운 경험을 추가하세요
                  </CardDescription>
                </div>
                <Button size="sm" data-testid="button-add-new-experience">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  새 경험 추가
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
                      등록된 경험이 없습니다.
                    </p>
                    <Button data-testid="button-create-experience">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      경험 등록하기
                    </Button>
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
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
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
                              {experience.isActive ? '활성' : '비활성'}
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
                <CardTitle>예약 관리</CardTitle>
                <CardDescription>
                  고객의 예약을 확인하고 상태를 관리하세요
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
                      아직 예약이 없습니다.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>경험</TableHead>
                        <TableHead>고객</TableHead>
                        <TableHead>날짜</TableHead>
                        <TableHead>인원</TableHead>
                        <TableHead>총액</TableHead>
                        <TableHead>예약 상태</TableHead>
                        <TableHead>결제 상태</TableHead>
                        <TableHead>관리</TableHead>
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
                          <TableCell>{booking.participants}명</TableCell>
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
                                  후기 작성
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
                                  승인
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleBookingAction(booking.id, 'cancelled')}
                                  data-testid={`button-reject-${booking.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  거절
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-manage-${booking.id}`}
                              >
                                관리
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