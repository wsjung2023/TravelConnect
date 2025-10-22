import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Users, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Experience, InsertBooking } from '@shared/schema';

interface BookingModalProps {
  experience: Experience;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({
  experience,
  isOpen,
  onClose,
}: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [participants, setParticipants] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('ui');

  const bookingMutation = useMutation({
    mutationFn: async (booking: InsertBooking) => {
      return api('/api/bookings', {
        method: 'POST',
        body: booking,
      });
    },
    onSuccess: () => {
      toast({
        title: t('booking.success'),
        description: t('booking.successDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: t('booking.failed'),
        description: t('booking.failedDesc'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: t('common.loginRequired'),
        description: t('booking.loginRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: t('booking.selectDate'),
        description: t('booking.selectDateDesc'),
        variant: 'destructive',
      });
      return;
    }

    const totalPrice = Number(experience.price) * participants;

    const booking: InsertBooking = {
      experienceId: experience.id,
      guestId: user.id,
      hostId: experience.hostId,
      date: new Date(selectedDate),
      participants,
      totalPrice: totalPrice.toString(),
      specialRequests: specialRequests || undefined,
    };

    bookingMutation.mutate(booking);
  };

  const totalPrice = Number(experience.price) * participants;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">예약하기</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Experience Info */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium mb-1">{experience.title}</h3>
          <p className="text-sm text-gray-600">{experience.location}</p>
          <div className="mt-2">
            <span className="text-lg font-bold text-primary">
              ₩{Number(experience.price).toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 ml-1">/ 인</span>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Date Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Calendar size={16} />
              예약 날짜
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
              required
            />
          </div>

          {/* Participants */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Users size={16} />
              참가자 수
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setParticipants(Math.max(1, participants - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                -
              </button>
              <span className="text-lg font-medium w-8 text-center">
                {participants}
              </span>
              <button
                type="button"
                onClick={() =>
                  setParticipants(
                    Math.min(experience.maxParticipants || 10, participants + 1)
                  )
                }
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                +
              </button>
            </div>
            {experience.maxParticipants && (
              <p className="text-xs text-gray-500 mt-1">
                최대 {experience.maxParticipants}명까지 가능
              </p>
            )}
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-medium mb-2">
              특별 요청사항
            </label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="호스트에게 전달할 특별한 요청사항이 있다면 작성해주세요..."
              rows={3}
            />
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span>
                ₩{Number(experience.price).toLocaleString()} × {participants}명
              </span>
              <span>₩{totalPrice.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center font-semibold">
              <span>총 금액</span>
              <span className="text-lg text-primary">
                ₩{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={bookingMutation.isPending}
            className="w-full travel-button h-12"
          >
            {bookingMutation.isPending ? (
              '예약 중...'
            ) : (
              <>
                <CreditCard size={16} className="mr-2" />₩
                {totalPrice.toLocaleString()} 결제하고 예약하기
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
