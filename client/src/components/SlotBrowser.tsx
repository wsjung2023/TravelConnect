import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Slot } from '@shared/schema';
import SlotBookingModal from './SlotBookingModal';

export default function SlotBrowser() {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // 슬롯 검색 API 호출 (기본 fetcher 사용)
  const { data: slots = [], isLoading, error } = useQuery<Slot[]>({
    queryKey: ['/api/slots/search?availableOnly=true&limit=20']
  });

  // 안전한 가격 포맷팅 (화폐 코드 예외 처리 포함)
  const formatPrice = (priceStr: string | null, currency: string | null = 'KRW') => {
    if (!priceStr) return '가격 정보 없음';
    const price = parseFloat(priceStr);
    if (isNaN(price)) return '가격 정보 없음';
    
    try {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency || 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    } catch (error) {
      // 유효하지 않은 화폐 코드인 경우 KRW로 fallback
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    }
  };

  // 안전한 남은 자리 계산
  const getRemainingSeats = (maxParticipants: number | null, currentBookings: number | null) => {
    const max = maxParticipants || 0;
    const current = currentBookings || 0;
    return Math.max(0, max - current);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6" data-testid="slot-browser">
      <h1 className="text-2xl font-bold">예약 가능한 슬롯</h1>
      
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-8">
          <p>슬롯을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">슬롯을 불러오는데 실패했습니다.</p>
        </div>
      )}

      {/* 슬롯 목록 */}
      {!isLoading && !error && (
        <div data-testid="slots-grid">
          <p className="text-sm text-gray-600 mb-4">총 {slots.length}개의 슬롯</p>
          
          {slots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">현재 예약 가능한 슬롯이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const remainingSeats = getRemainingSeats(slot.maxParticipants, slot.currentBookings);
                const maxParticipants = slot.maxParticipants || 0;
                const currentBookings = slot.currentBookings || 0;
                
                return (
                  <div key={slot.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-lg mb-2" data-testid={`slot-title-${slot.id}`}>
                      {slot.title}
                    </h3>
                    
                    {slot.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {slot.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">날짜:</span> {slot.date}
                      </div>
                      <div>
                        <span className="font-medium">시간:</span> {slot.startTime} - {slot.endTime}
                      </div>
                      {slot.location && (
                        <div>
                          <span className="font-medium">위치:</span> {slot.location}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">정원:</span> {maxParticipants}명 
                        <span className="text-green-600 ml-1">
                          ({remainingSeats}자리 남음)
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">가격:</span> {formatPrice(slot.basePrice, slot.currency)}/인
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {slot.category}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        {slot.serviceType}
                      </span>
                    </div>
                    
                    <button 
                      className="w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                      disabled={!slot.isAvailable || remainingSeats <= 0}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setIsBookingModalOpen(true);
                      }}
                      data-testid={`button-book-${slot.id}`}
                    >
                      {!slot.isAvailable ? '예약불가' : 
                       remainingSeats <= 0 ? '마감' : '예약하기'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 예약 모달 */}
      {selectedSlot && (
        <SlotBookingModal
          slot={selectedSlot}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}