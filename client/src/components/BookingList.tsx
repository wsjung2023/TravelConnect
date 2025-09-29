import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, Users, CreditCard, AlertCircle, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Booking type (matching backend)
interface Booking {
  id: number;
  experienceId: number | null;
  slotId: number | null;
  guestId: string;
  hostId: string;
  date: Date;
  participants: number;
  totalPrice: string;
  status: string; // 'pending', 'confirmed', 'completed', 'cancelled', 'declined'
  specialRequests: string | null;
  paymentStatus: string;
  expiresAt: Date | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  declinedAt: Date | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  // 관련 정보 (joined data)
  slot?: {
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    location: string | null;
    category: string;
    serviceType: string;
    maxParticipants: number;
    currency: string;
  };
  host?: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface BookingListProps {
  role: 'guest' | 'host';
}

export default function BookingList({ role }: BookingListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 예약 목록 조회
  const { data: bookings = [], isLoading, error } = useQuery<Booking[]>({
    queryKey: ['/api/bookings', role, selectedStatus],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          role,
          ...(selectedStatus !== 'all' && { status: selectedStatus }),
          limit: '50',
        });
        const response = await apiRequest(`/api/bookings?${params.toString()}`);
        // 응답이 배열인지 확인하고, 아니면 빈 배열 반환
        return Array.isArray(response) ? response : [];
      } catch (err) {
        console.error('Booking list fetch error:', err);
        return [];
      }
    },
    enabled: !!user,
  });

  // 예약 상태 업데이트 mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, cancelReason }: { bookingId: number; status: string; cancelReason?: string }) => {
      return apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: { status, cancelReason },
      });
    },
    onSuccess: () => {
      toast({
        title: '상태 변경 완료',
        description: '예약 상태가 성공적으로 변경되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setCancellingBooking(null);
      setCancelReason('');
    },
    onError: (error: any) => {
      toast({
        title: '상태 변경 실패',
        description: error?.message || '상태 변경 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-700',
      declined: 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '대기중',
      confirmed: '확정',
      completed: '완료',
      cancelled: '취소됨',
      declined: '거절됨',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="w-4 h-4" />,
      confirmed: <CheckCircle className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
      declined: <XCircle className="w-4 h-4" />,
    };
    return icons[status as keyof typeof icons] || <AlertCircle className="w-4 h-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      tour: 'bg-blue-100 text-blue-700',
      food: 'bg-orange-100 text-orange-700',
      activity: 'bg-green-100 text-green-700',
      consultation: 'bg-purple-100 text-purple-700',
      custom: 'bg-gray-100 text-gray-700',
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      tour: '투어',
      food: '음식',
      activity: '액티비티',
      consultation: '상담',
      custom: '커스텀',
    };
    return labels[category as keyof typeof labels] || '기타';
  };

  const handleStatusUpdate = (booking: Booking, newStatus: string) => {
    if (newStatus === 'cancelled') {
      setCancellingBooking(booking);
    } else {
      updateStatusMutation.mutate({ bookingId: booking.id, status: newStatus });
    }
  };

  const handleCancelConfirm = () => {
    if (cancellingBooking) {
      updateStatusMutation.mutate({
        bookingId: cancellingBooking.id,
        status: 'cancelled',
        cancelReason: cancelReason || undefined,
      });
    }
  };

  const canUpdateStatus = (booking: Booking, newStatus: string) => {
    if (role === 'guest') {
      // 게스트는 pending 상태일 때만 취소 가능
      return booking.status === 'pending' && newStatus === 'cancelled';
    } else {
      // 호스트는 pending 상태일 때 승인/거절 가능
      return booking.status === 'pending' && (newStatus === 'confirmed' || newStatus === 'declined');
    }
  };

  const filteredBookings = selectedStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === selectedStatus);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="booking-list">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {role === 'guest' ? '내 예약' : '받은 예약'}
        </h2>
        {isLoading && (
          <div className="text-sm text-muted-foreground">불러오는 중...</div>
        )}
      </div>

      {/* 상태 필터 탭 */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">전체</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">대기중</TabsTrigger>
          <TabsTrigger value="confirmed" data-testid="tab-confirmed">확정</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">완료</TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">취소</TabsTrigger>
          <TabsTrigger value="declined" data-testid="tab-declined">거절</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          {error ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-600">예약 목록을 불러오는데 실패했습니다.</p>
              </CardContent>
            </Card>
          ) : filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {isLoading ? '불러오는 중...' : '예약이 없습니다.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" data-testid="bookings-list">
              {filteredBookings.map((booking) => {
                // 안전한 날짜 처리
                const bookingDate = booking.date ? new Date(booking.date) : new Date();
                const totalPrice = booking.totalPrice ? parseFloat(booking.totalPrice.toString()) : 0;

                return (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* 예약 정보 */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-2">
                              <Badge className={getStatusColor(booking.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(booking.status)}
                                  {getStatusLabel(booking.status)}
                                </div>
                              </Badge>
                              {booking.slot?.category && (
                                <Badge className={getCategoryColor(booking.slot.category)}>
                                  {getCategoryLabel(booking.slot.category)}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              #{booking.id}
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold text-lg" data-testid={`booking-title-${booking.id}`}>
                              {booking.slot?.title || `예약 #${booking.id}`}
                            </h3>
                            {booking.slot?.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {booking.slot.description}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{format(bookingDate, 'PPP', { locale: ko })}</span>
                            </div>
                            {booking.slot?.startTime && booking.slot?.endTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{booking.slot.startTime} - {booking.slot.endTime}</span>
                              </div>
                            )}
                            {booking.slot?.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{booking.slot.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span>{booking.participants || 0}명</span>
                            </div>
                          </div>

                          {booking.specialRequests && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-start gap-2">
                                <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">특별 요청사항</p>
                                  <p className="text-sm text-muted-foreground">{booking.specialRequests}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {booking.cancelReason && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm font-medium text-red-700">취소 사유</p>
                              <p className="text-sm text-red-600">{booking.cancelReason}</p>
                            </div>
                          )}
                        </div>

                        {/* 가격 및 액션 */}
                        <div className="flex flex-col items-end gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-lg font-semibold">
                              <CreditCard className="w-4 h-4" />
                              <span data-testid={`booking-price-${booking.id}`}>
                                {booking.slot?.currency || 'KRW'} {totalPrice.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              결제 상태: {booking.paymentStatus}
                            </div>
                          </div>

                          {/* 액션 버튼 */}
                          <div className="flex gap-2">
                            {role === 'host' && canUpdateStatus(booking, 'confirmed') && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(booking, 'confirmed')}
                                  disabled={updateStatusMutation.isPending}
                                  data-testid={`button-confirm-${booking.id}`}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(booking, 'declined')}
                                  disabled={updateStatusMutation.isPending}
                                  data-testid={`button-decline-${booking.id}`}
                                >
                                  거절
                                </Button>
                              </>
                            )}
                            {role === 'guest' && canUpdateStatus(booking, 'cancelled') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(booking, 'cancelled')}
                                disabled={updateStatusMutation.isPending}
                                data-testid={`button-cancel-${booking.id}`}
                              >
                                취소
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 취소 사유 입력 다이얼로그 */}
      <Dialog open={!!cancellingBooking} onOpenChange={() => setCancellingBooking(null)}>
        <DialogContent data-testid="dialog-cancel-booking">
          <DialogHeader>
            <DialogTitle>예약 취소</DialogTitle>
            <DialogDescription>
              예약을 취소하는 사유를 입력해주세요. (선택사항)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="취소 사유를 입력해주세요..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              data-testid="textarea-cancel-reason"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setCancellingBooking(null)}
                data-testid="button-cancel-dialog"
              >
                취소
              </Button>
              <Button
                onClick={handleCancelConfirm}
                disabled={updateStatusMutation.isPending}
                data-testid="button-confirm-cancel"
              >
                {updateStatusMutation.isPending ? '처리 중...' : '예약 취소'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}