import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Users, Clock, MapPin, AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Slot type (matching backend)
interface Slot {
  id: number;
  hostId: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string;
  serviceType: string;
  maxParticipants: number;
  currentBookings: number;
  basePrice: string;
  currency: string;
  isAvailable: boolean;
  cancellationPolicy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface SlotAvailability {
  available: boolean;
  remainingCapacity: number;
  conflicts?: string[];
}

interface SlotBookingModalProps {
  slot: Slot;
  isOpen: boolean;
  onClose: () => void;
}

export default function SlotBookingModal({
  slot,
  isOpen,
  onClose,
}: SlotBookingModalProps) {
  const [participants, setParticipants] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 슬롯 가용성 확인
  const { data: availability, isLoading: availabilityLoading } = useQuery<SlotAvailability>({
    queryKey: [`/api/slots/${slot.id}/availability`, participants],
    queryFn: () => apiRequest(`/api/slots/${slot.id}/availability?participants=${participants}`),
    enabled: isOpen && participants > 0,
  });

  // 예약 생성 mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return apiRequest('/api/bookings', {
        method: 'POST',
        body: bookingData,
      });
    },
    onSuccess: () => {
      toast({
        title: '예약 요청 완료',
        description: '예약 요청이 전송되었습니다. 호스트의 승인을 기다려주세요.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: [`/api/slots/${slot.id}/availability`] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: '예약 실패',
        description: error?.message || '예약 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setParticipants(1);
    setSpecialRequests('');
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 가용성 확인
    if (!availability?.available) {
      toast({
        title: '예약 불가',
        description: availability?.conflicts?.[0] || '선택한 인원수로는 예약할 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    // 로그인 확인
    if (!user) {
      toast({
        title: '로그인 필요',
        description: '예약을 위해서는 로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    const bookingData = {
      slotId: slot.id,
      participants,
      specialRequests: specialRequests || undefined,
    };

    bookingMutation.mutate(bookingData);
  };

  const totalPrice = parseFloat(slot.basePrice) * participants;
  const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);

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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-slot-booking">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            슬롯 예약
          </DialogTitle>
        </DialogHeader>

        {!user ? (
          /* 로그인 필요 안내 */
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">로그인이 필요합니다</h3>
            <p className="text-muted-foreground mb-6">
              슬롯을 예약하시려면 먼저 로그인해주세요.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
              <Button onClick={() => {
                onClose();
                // 로그인 페이지로 이동하거나 로그인 모달 열기
                window.location.href = '/auth';
              }}>
                로그인하기
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* 슬롯 정보 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(slot.category)}>
                      {getCategoryLabel(slot.category)}
                    </Badge>
                    <Badge variant="outline">
                      {slot.serviceType === 'group' ? '그룹' : 
                       slot.serviceType === 'private' ? '프라이빗' : '상담'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg mb-2" data-testid="text-slot-title">
                    {slot.title}
                  </h3>
                  {slot.description && (
                    <p className="text-muted-foreground text-sm mb-3">
                      {slot.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{format(slotDateTime, 'PPP', { locale: ko })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{slot.startTime} - {slot.endTime}</span>
                </div>
                {slot.location && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{slot.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>최대 {slot.maxParticipants}명</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>{slot.currency} {parseFloat(slot.basePrice).toLocaleString()}/인</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 예약 옵션 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                참가자 수 *
              </label>
              <Input
                type="number"
                min={1}
                max={slot.maxParticipants}
                value={participants}
                onChange={(e) => setParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                data-testid="input-participants"
              />
              
              {/* 가용성 표시 */}
              {availabilityLoading ? (
                <p className="text-sm text-muted-foreground mt-1">가용성 확인 중...</p>
              ) : availability ? (
                <div className="mt-2">
                  {availability.available ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      예약 가능 ({availability.remainingCapacity}자리 남음)
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {availability.conflicts?.[0] || '예약 불가'}
                    </div>
                  )}
                </div>
              ) : null}
            </div>


            <div>
              <label className="block text-sm font-medium mb-2">
                특별 요청사항
              </label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="특별한 요청사항이나 문의사항을 입력해주세요 (선택사항)"
                rows={3}
                data-testid="textarea-special-requests"
              />
            </div>
          </div>

          {/* 가격 정보 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span>기본 가격 ({participants}명)</span>
                <span>{slot.currency} {totalPrice.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center font-semibold">
                <span>총 금액</span>
                <span className="text-lg" data-testid="text-total-price">
                  {slot.currency} {totalPrice.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 취소 정책 */}
          {slot.cancellationPolicy && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-1">취소 정책</p>
              <p className="text-muted-foreground">{slot.cancellationPolicy}</p>
            </div>
          )}


          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={bookingMutation.isPending || !availability?.available || availabilityLoading}
              className="flex-1"
              data-testid="button-book"
            >
              {bookingMutation.isPending ? '예약 중...' : '예약 요청'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}