import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, Users, Camera, Phone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSearchInput } from '@/components/ui/location-search-input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { InsertExperience, Experience } from '@shared/schema';

interface CreateExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editExperience?: Experience | null;
}

export default function CreateExperienceModal({
  isOpen,
  onClose,
  editExperience,
}: CreateExperienceModalProps) {
  const isEditMode = !!editExperience;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [included, setIncluded] = useState('');
  const [requirements, setRequirements] = useState('');
  const [cancelPolicy, setCancelPolicy] = useState('flexible');
  const [minLeadHours, setMinLeadHours] = useState('24');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('ui');

  useEffect(() => {
    if (editExperience) {
      setTitle(editExperience.title || '');
      setDescription(editExperience.description || '');
      setPrice(editExperience.price?.toString() || '');
      setLocation(editExperience.location || '');
      setCategory(editExperience.category || '');
      setDuration(editExperience.duration?.toString() || '');
      setMaxParticipants(editExperience.maxParticipants?.toString() || '');
      setMeetingPoint((editExperience as any).meetingPoint || '');
      setContactPhone((editExperience as any).contactPhone || '');
      setIncluded(editExperience.included?.join('\n') || '');
      setRequirements(editExperience.requirements?.join('\n') || '');
      setCancelPolicy((editExperience as any).cancelPolicy || 'flexible');
      setMinLeadHours((editExperience as any).minLeadHours?.toString() || '24');
      setAutoConfirm((editExperience as any).autoConfirm ?? true);
      if (editExperience.latitude && editExperience.longitude) {
        setLocationCoords({
          lat: parseFloat(editExperience.latitude),
          lng: parseFloat(editExperience.longitude),
        });
      }
    } else {
      resetForm();
    }
  }, [editExperience, isOpen]);

  const experienceMutation = useMutation({
    mutationFn: async (experience: InsertExperience) => {
      return api('/api/experiences', {
        method: 'POST',
        body: experience,
      });
    },
    onSuccess: () => {
      toast({
        title: t('experience.createSuccess'),
        description: t('experience.createSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/host/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
      console.error('Experience creation error:', error);
      toast({
        title: t('experience.createError'),
        description: t('experience.createErrorDesc'),
        variant: 'destructive',
      });
    },
  });

  const updateExperienceMutation = useMutation({
    mutationFn: async (experience: Partial<InsertExperience>) => {
      return api(`/api/experiences/${editExperience?.id}`, {
        method: 'PATCH',
        body: experience,
      });
    },
    onSuccess: () => {
      toast({
        title: t('experience.updateSuccess') || 'Experience updated',
        description: t('experience.updateSuccessDesc') || 'Your experience has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/host/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/experiences', editExperience?.id] });
      resetForm();
      onClose();
    },
    onError: (error) => {
      console.error('Experience update error:', error);
      toast({
        title: t('experience.updateError') || 'Update failed',
        description: t('experience.updateErrorDesc') || 'Failed to update experience. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setLocation('');
    setLocationCoords(null);
    setCategory('');
    setDuration('');
    setMaxParticipants('');
    setMeetingPoint('');
    setContactPhone('');
    setIncluded('');
    setRequirements('');
    setCancelPolicy('flexible');
    setMinLeadHours('24');
    setAutoConfirm(true);
    setFieldErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: t('common.loginRequired'),
        description: t('experience.loginRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = t('experience.validation.titleRequired', '제목을 입력해주세요');
    }
    if (!description.trim()) {
      errors.description = t('experience.validation.descriptionRequired', '설명을 입력해주세요');
    }
    if (!price || parseFloat(price) <= 0) {
      errors.price = t('experience.validation.priceRequired', '유효한 가격을 입력해주세요');
    }
    if (!location.trim()) {
      errors.location = t('experience.validation.locationRequired', '위치를 선택해주세요');
    }
    if (!category) {
      errors.category = t('experience.validation.categoryRequired', '카테고리를 선택해주세요');
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({
        title: t('experience.requiredFieldsMissing'),
        description: t('experience.requiredFieldsDesc'),
        variant: 'destructive',
      });
      return;
    }

    const experienceData: Partial<InsertExperience> = {
      hostId: isEditMode ? editExperience.hostId : user.id,
      title: title.trim(),
      description: description.trim(),
      price: price,
      currency: 'USD',
      location: location.trim(),
      latitude: locationCoords?.lat?.toString(),
      longitude: locationCoords?.lng?.toString(),
      category,
      duration: duration ? parseInt(duration) : undefined,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      meetingPoint: meetingPoint.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      included: included ? included.split('\n').filter(item => item.trim()) : [],
      requirements: requirements ? requirements.split('\n').filter(item => item.trim()) : [],
      cancelPolicy,
      minLeadHours: parseInt(minLeadHours),
      autoConfirm,
      images: isEditMode ? editExperience.images : [],
    };

    if (isEditMode) {
      updateExperienceMutation.mutate(experienceData);
    } else {
      experienceMutation.mutate(experienceData as InsertExperience);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">
              {isEditMode ? (t('experience.editExperience') || '경험 수정') : '새 경험 등록'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
            data-testid="button-close-experience-modal"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Info className="w-5 h-5" />
              기본 정보
            </h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors(prev => ({ ...prev, title: '' })); }}
                placeholder="경험의 제목을 입력하세요"
                className={fieldErrors.title ? 'border-red-500' : ''}
                data-testid="input-experience-title"
              />
              {fieldErrors.title && (
                <p className="text-red-500 text-sm mt-1" data-testid="error-experience-title">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                설명 <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors(prev => ({ ...prev, description: '' })); }}
                placeholder="경험에 대한 자세한 설명을 입력하세요"
                rows={4}
                className={fieldErrors.description ? 'border-red-500' : ''}
                data-testid="textarea-experience-description"
              />
              {fieldErrors.description && (
                <p className="text-red-500 text-sm mt-1" data-testid="error-experience-description">{fieldErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  가격 (원) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); setFieldErrors(prev => ({ ...prev, price: '' })); }}
                  placeholder="10000"
                  min="0"
                  className={fieldErrors.price ? 'border-red-500' : ''}
                  data-testid="input-experience-price"
                />
                {fieldErrors.price && (
                  <p className="text-red-500 text-sm mt-1" data-testid="error-experience-price">{fieldErrors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setFieldErrors(prev => ({ ...prev, category: '' })); }}>
                  <SelectTrigger data-testid="select-experience-category" className={fieldErrors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tour">🗺️ 투어</SelectItem>
                    <SelectItem value="food">🍜 음식</SelectItem>
                    <SelectItem value="activity">🎯 액티비티</SelectItem>
                    <SelectItem value="tip">💡 팁</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.category && (
                  <p className="text-red-500 text-sm mt-1" data-testid="error-experience-category">{fieldErrors.category}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                위치 <span className="text-red-500">*</span>
              </label>
              <LocationSearchInput
                value={location}
                onChange={(value, placeData) => {
                  if (placeData && placeData.geometry && placeData.geometry.location) {
                    setLocation(placeData.formatted_address || value);
                    setLocationCoords({
                      lat: typeof placeData.geometry.location.lat === 'function' 
                        ? placeData.geometry.location.lat() 
                        : placeData.geometry.location.lat,
                      lng: typeof placeData.geometry.location.lng === 'function'
                        ? placeData.geometry.location.lng()
                        : placeData.geometry.location.lng,
                    });
                  } else {
                    setLocation(value);
                    setLocationCoords(null);
                  }
                  setFieldErrors(prev => ({ ...prev, location: '' }));
                }}
                placeholder="장소, 음식점, 카페, 랜드마크, 주소 검색..."
                useCurrentLocationText="현재 위치 사용"
                className={fieldErrors.location ? 'border-red-500' : ''}
              />
              {fieldErrors.location && (
                <p className="text-red-500 text-sm mt-1" data-testid="error-experience-location">{fieldErrors.location}</p>
              )}
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              상세 정보
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  소요시간 (분)
                </label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="120"
                  min="1"
                  data-testid="input-experience-duration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  최대 참가자
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    placeholder="8"
                    min="1"
                    className="pl-10"
                    data-testid="input-experience-max-participants"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                만날 장소
              </label>
              <Input
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="강남역 2번 출구"
                data-testid="input-experience-meeting-point"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                연락처
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="pl-10"
                  data-testid="input-experience-contact-phone"
                />
              </div>
            </div>
          </div>

          {/* 포함사항 및 요구사항 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                포함사항 (각 줄에 하나씩 입력)
              </label>
              <Textarea
                value={included}
                onChange={(e) => setIncluded(e.target.value)}
                placeholder="가이드 설명&#10;입장료&#10;간식 제공"
                rows={3}
                data-testid="textarea-experience-included"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                요구사항 (각 줄에 하나씩 입력)
              </label>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="편한 신발 착용&#10;카메라 지참&#10;기본적인 한국어 소통 가능"
                rows={3}
                data-testid="textarea-experience-requirements"
              />
            </div>
          </div>

          {/* 예약 설정 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">예약 설정</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  취소 정책
                </label>
                <Select value={cancelPolicy} onValueChange={setCancelPolicy}>
                  <SelectTrigger data-testid="select-cancel-policy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">유연한 취소</SelectItem>
                    <SelectItem value="moderate">보통 취소</SelectItem>
                    <SelectItem value="strict">엄격한 취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  최소 예약 시간 (시간 전)
                </label>
                <Input
                  type="number"
                  value={minLeadHours}
                  onChange={(e) => setMinLeadHours(e.target.value)}
                  placeholder="24"
                  min="1"
                  data-testid="input-min-lead-hours"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoConfirm"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="rounded"
                data-testid="checkbox-auto-confirm"
              />
              <label htmlFor="autoConfirm" className="text-sm">
                예약 자동 승인
              </label>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-experience"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={experienceMutation.isPending || updateExperienceMutation.isPending}
              data-testid="button-submit-experience"
            >
              {isEditMode
                ? (updateExperienceMutation.isPending ? '수정 중...' : '경험 수정')
                : (experienceMutation.isPending ? '등록 중...' : '경험 등록')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}