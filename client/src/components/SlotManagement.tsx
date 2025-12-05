import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  DollarSign,
  Globe,
  Package,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';

// Slot type from backend
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
  currentParticipants: number;
  basePrice: number;
  currency: string;
  isAvailable: boolean;
  cancellationPolicy: string | null;
  requiresApproval: boolean;
  autoConfirm: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Form schema for creating/editing slots
const SlotFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  description: z.string().max(500, '설명은 500자 이하여야 합니다').optional(),
  date: z.date({ required_error: '날짜를 선택해주세요' }),
  startTime: z.string().min(1, '시작 시간을 입력해주세요'),
  endTime: z.string().min(1, '종료 시간을 입력해주세요'),
  timezone: z.string().min(1, '시간대를 선택해주세요'),
  location: z.string().max(200, '위치는 200자 이하여야 합니다').optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  serviceType: z.string().min(1, '서비스 타입을 선택해주세요'),
  maxParticipants: z.number().min(1, '최대 참가자는 1명 이상이어야 합니다').max(100, '최대 참가자는 100명 이하여야 합니다'),
  basePrice: z.number().min(0, '가격은 0 이상이어야 합니다'),
  currency: z.string().default('USD'),
  requiresApproval: z.boolean().default(false),
  autoConfirm: z.boolean().default(true),
  cancellationPolicy: z.string().max(300, '취소 정책은 300자 이하여야 합니다').optional(),
});

type SlotFormData = z.infer<typeof SlotFormSchema>;

const CATEGORIES = [
  { value: 'tour', label: '투어' },
  { value: 'food', label: '음식' },
  { value: 'activity', label: '액티비티' },
  { value: 'consultation', label: '상담' },
  { value: 'custom', label: '커스텀' },
];

const SERVICE_TYPES = [
  { value: 'group', label: '그룹 활동' },
  { value: 'private', label: '개인 맞춤' },
  { value: 'consultation', label: '상담' },
];

const TIMEZONES = [
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

interface SlotFormProps {
  slot?: Slot | undefined;
  isOpen: boolean;
  onClose: () => void;
}

function SlotForm({ slot, isOpen, onClose }: SlotFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SlotFormData>({
    resolver: zodResolver(SlotFormSchema),
    defaultValues: {
      title: slot?.title || '',
      description: slot?.description || '',
      date: slot ? new Date(slot.date) : new Date(),
      startTime: slot?.startTime || '',
      endTime: slot?.endTime || '',
      timezone: slot?.timezone || 'Asia/Seoul',
      location: slot?.location || '',
      category: slot?.category || '',
      serviceType: slot?.serviceType || '',
      maxParticipants: slot?.maxParticipants || 1,
      basePrice: slot ? (typeof slot.basePrice === 'string' ? parseFloat(slot.basePrice) : slot.basePrice) : 0,
      currency: slot?.currency || 'USD',
      requiresApproval: slot?.requiresApproval || false,
      autoConfirm: slot?.autoConfirm || true,
      cancellationPolicy: slot?.cancellationPolicy || '',
    },
  });

  const createSlotMutation = useMutation({
    mutationFn: async (data: SlotFormData) => {
      const payload = {
        title: data.title,
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        basePrice: data.basePrice,
        currency: data.currency,
        maxParticipants: data.maxParticipants,
        location: data.location,
        category: data.category, // Should be enum value
        serviceType: data.serviceType, // Should be enum value
        cancellationPolicy: data.cancellationPolicy || 'flexible',
        requiresApproval: data.requiresApproval,
        autoConfirm: data.autoConfirm,
      };
      return apiRequest('/api/slots/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slots/my'] });
      toast({
        title: '슬롯 생성 완료',
        description: '새로운 슬롯이 성공적으로 생성되었습니다.',
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: '슬롯 생성 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: async (data: SlotFormData) => {
      const payload = {
        title: data.title,
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        basePrice: data.basePrice,
        currency: data.currency,
        maxParticipants: data.maxParticipants,
        location: data.location,
        category: data.category, // Should be enum value
        serviceType: data.serviceType, // Should be enum value
        cancellationPolicy: data.cancellationPolicy || 'flexible',
        requiresApproval: data.requiresApproval,
        autoConfirm: data.autoConfirm,
      };
      return apiRequest(`/api/slots/${slot!.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slots/my'] });
      toast({
        title: '슬롯 수정 완료',
        description: '슬롯이 성공적으로 수정되었습니다.',
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: '슬롯 수정 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SlotFormData) => {
    if (slot) {
      updateSlotMutation.mutate(data);
    } else {
      createSlotMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {slot ? '슬롯 수정' : '새 슬롯 생성'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>제목 *</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 홍대 맛집 투어" {...field} data-testid="input-slot-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="슬롯에 대한 자세한 설명을 입력하세요..." 
                        {...field} 
                        data-testid="textarea-slot-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>날짜 *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                            data-testid="button-select-date"
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ko })
                            ) : (
                              <span>날짜 선택</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시간대 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timezone">
                          <SelectValue placeholder="시간대 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작 시간 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                        data-testid="input-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>종료 시간 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                        data-testid="input-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="카테고리 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>서비스 타입 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service-type">
                          <SelectValue placeholder="서비스 타입 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>위치</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="예: 서울특별시 마포구 홍대입구역" 
                        {...field} 
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>최대 참가자 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-max-participants"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가격 (KRW) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="1000"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>승인 필요</FormLabel>
                      <div className="text-sm text-gray-500">
                        예약 시 수동 승인이 필요합니다
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-requires-approval"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoConfirm"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>자동 확정</FormLabel>
                      <div className="text-sm text-gray-500">
                        예약 시 자동으로 확정됩니다
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-auto-confirm"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cancellationPolicy"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>취소 정책</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="취소 정책을 입력하세요..." 
                        {...field} 
                        data-testid="textarea-cancellation-policy"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
                data-testid="button-save-slot"
              >
                {createSlotMutation.isPending || updateSlotMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function SlotManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch slots
  const { data: slots, isLoading, error } = useQuery<Slot[]>({
    queryKey: ['/api/slots/my'],
  });

  // Delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: number) => {
      return apiRequest(`/api/slots/${slotId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slots/my'] });
      toast({
        title: '슬롯 삭제 완료',
        description: '슬롯이 성공적으로 삭제되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '슬롯 삭제 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ slotId, isAvailable }: { slotId: number; isAvailable: boolean }) => {
      return apiRequest(`/api/slots/${slotId}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ slotId, isAvailable }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slots/my'] });
      toast({
        title: '가용성 변경 완료',
        description: '슬롯 가용성이 성공적으로 변경되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '가용성 변경 실패',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeleteSlot = (slotId: number) => {
    if (confirm('정말로 이 슬롯을 삭제하시겠습니까?')) {
      deleteSlotMutation.mutate(slotId);
    }
  };

  const handleToggleAvailability = (slot: Slot) => {
    toggleAvailabilityMutation.mutate({
      slotId: slot.id,
      isAvailable: !slot.isAvailable,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">슬롯을 불러오는 중 오류가 발생했습니다</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">슬롯 관리</h3>
        <Button 
          size="sm" 
          onClick={() => setIsCreateModalOpen(true)}
          data-testid="button-create-slot"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 슬롯 생성
        </Button>
      </div>

      {/* Slots List */}
      {!slots || slots.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>아직 생성된 슬롯이 없습니다.</p>
          <p className="text-sm mt-2">첫 번째 슬롯을 생성해보세요!</p>
        </div>
      ) : (
        <div className="grid gap-4" data-testid="slots-list">
          {slots.map((slot) => (
            <Card key={slot.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{slot.title}</CardTitle>
                    {slot.description && (
                      <p className="text-sm text-gray-600 mt-1">{slot.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge variant={slot.isAvailable ? 'default' : 'secondary'}>
                      {slot.isAvailable ? '예약 가능' : '예약 불가'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleAvailability(slot)}
                      disabled={toggleAvailabilityMutation.isPending}
                      data-testid={`button-toggle-availability-${slot.id}`}
                    >
                      {slot.isAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{format(new Date(slot.date), 'MM월 dd일', { locale: ko })}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{slot.startTime} - {slot.endTime}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{slot.currentParticipants}/{slot.maxParticipants}명</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    <span>₩{Number(slot.basePrice).toLocaleString()}</span>
                  </div>
                </div>

                {slot.location && (
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{slot.location}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{CATEGORIES.find(c => c.value === slot.category)?.label}</Badge>
                    <Badge variant="outline">{SERVICE_TYPES.find(s => s.value === slot.serviceType)?.label}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSlot(slot)}
                      data-testid={`button-edit-slot-${slot.id}`}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSlot(slot.id)}
                      disabled={deleteSlotMutation.isPending}
                      data-testid={`button-delete-slot-${slot.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <SlotForm
        slot={editingSlot || undefined}
        isOpen={isCreateModalOpen || !!editingSlot}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSlot(null);
        }}
      />
    </div>
  );
}