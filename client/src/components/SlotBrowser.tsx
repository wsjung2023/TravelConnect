import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Calendar, Clock, MapPin, Users, CreditCard, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import SlotBookingModal from './SlotBookingModal';

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

interface SlotSearchFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  minParticipants?: number;
  limit?: number;
  offset?: number;
}

export default function SlotBrowser() {
  const [filters, setFilters] = useState<SlotSearchFilters>({
    availableOnly: true,
    limit: 20,
    offset: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // 슬롯 검색
  const { data: slots = [], isLoading, error } = useQuery<Slot[]>({
    queryKey: ['/api/slots/search', filters, searchKeyword],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      
      // 필터 파라미터 추가
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      // 키워드 검색 (임시로 location 필터로 사용)
      if (searchKeyword) {
        searchParams.append('location', searchKeyword);
      }

      return apiRequest(`/api/slots/search?${searchParams.toString()}`);
    },
  });

  const handleFilterChange = (key: keyof SlotSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // 필터 변경 시 첫 페이지로 리셋
    }));
  };

  const handleBookSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
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

  const getServiceTypeLabel = (serviceType: string) => {
    const labels = {
      group: '그룹',
      private: '프라이빗',
      consultation: '상담',
    };
    return labels[serviceType as keyof typeof labels] || serviceType;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6" data-testid="slot-browser">
      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* 키워드 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="위치나 활동명으로 검색해보세요..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            {/* 필터 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 카테고리 */}
              <Select 
                value={filters.category || ''} 
                onValueChange={(value) => handleFilterChange('category', value || undefined)}
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="tour">투어</SelectItem>
                  <SelectItem value="food">음식</SelectItem>
                  <SelectItem value="activity">액티비티</SelectItem>
                  <SelectItem value="consultation">상담</SelectItem>
                  <SelectItem value="custom">커스텀</SelectItem>
                </SelectContent>
              </Select>

              {/* 서비스 타입 */}
              <Select 
                value={filters.serviceType || ''} 
                onValueChange={(value) => handleFilterChange('serviceType', value || undefined)}
              >
                <SelectTrigger data-testid="select-service-type">
                  <SelectValue placeholder="서비스 타입" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="group">그룹</SelectItem>
                  <SelectItem value="private">프라이빗</SelectItem>
                  <SelectItem value="consultation">상담</SelectItem>
                </SelectContent>
              </Select>

              {/* 최소 가격 */}
              <Input
                type="number"
                placeholder="최소 가격"
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                data-testid="input-min-price"
              />

              {/* 최대 가격 */}
              <Input
                type="number"
                placeholder="최대 가격"
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                data-testid="input-max-price"
              />
            </div>

            {/* 날짜 필터 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">시작 날짜</label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  min={new Date().toISOString().split('T')[0]}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">종료 날짜</label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  min={filters.startDate || new Date().toISOString().split('T')[0]}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 검색 결과 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            예약 가능한 슬롯 ({slots.length}개)
          </h2>
          {isLoading && (
            <div className="text-sm text-muted-foreground">검색 중...</div>
          )}
        </div>

        {error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600">슬롯을 불러오는데 실패했습니다.</p>
            </CardContent>
          </Card>
        ) : slots.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {isLoading ? '검색 중...' : '조건에 맞는 슬롯이 없습니다.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="slots-grid">
            {slots.map((slot) => {
              const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
              const price = parseFloat(slot.basePrice);
              const remainingSpots = slot.maxParticipants - (slot.currentBookings || 0);

              return (
                <Card key={slot.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* 헤더 */}
                      <div className="flex items-start justify-between">
                        <div className="flex gap-2">
                          <Badge className={getCategoryColor(slot.category)}>
                            {getCategoryLabel(slot.category)}
                          </Badge>
                          <Badge variant="outline">
                            {getServiceTypeLabel(slot.serviceType)}
                          </Badge>
                        </div>
                        {slot.requiresApproval && (
                          <Badge variant="secondary" className="text-xs">
                            승인필요
                          </Badge>
                        )}
                      </div>

                      {/* 제목 */}
                      <h3 className="font-semibold text-lg leading-tight" data-testid={`slot-title-${slot.id}`}>
                        {slot.title}
                      </h3>

                      {/* 설명 */}
                      {slot.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {slot.description}
                        </p>
                      )}

                      {/* 정보 */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(slotDateTime, 'PPP', { locale: ko })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{slot.startTime} - {slot.endTime}</span>
                        </div>
                        {slot.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{slot.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>
                            최대 {slot.maxParticipants}명 
                            {remainingSpots > 0 && (
                              <span className="text-green-600 ml-1">
                                ({remainingSpots}자리 남음)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* 가격 및 예약 버튼 */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-lg" data-testid={`slot-price-${slot.id}`}>
                            {slot.currency} {price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">/인</span>
                        </div>
                        <Button
                          onClick={() => handleBookSlot(slot)}
                          disabled={!slot.isAvailable || remainingSpots <= 0}
                          size="sm"
                          data-testid={`button-book-${slot.id}`}
                        >
                          {!slot.isAvailable ? '예약불가' : 
                           remainingSpots <= 0 ? '마감' : '예약하기'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 예약 모달 */}
      {selectedSlot && (
        <SlotBookingModal
          slot={selectedSlot}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}