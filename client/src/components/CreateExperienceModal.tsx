// 체험 생성 모달 — 로컬 가이드가 체험 상품을 등록하는 폼 모달.
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, Users, Camera, Phone, Info, Image, Video } from 'lucide-react';
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
  
  // 미디어 관련 state
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageFilesMapRef = useRef<Map<string, File>>(new Map());
  const videoFilesMapRef = useRef<Map<string, File>>(new Map());
  
  // YouTube URL에서 video ID 추출
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };
  
  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

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
      setImages(editExperience.images || []);
      setVideos((editExperience as any).videos || []);
      setYoutubeUrl((editExperience as any).youtubeUrl || '');
      if (editExperience.latitude && editExperience.longitude) {
        setLocationCoords({
          lat: parseFloat(editExperience.latitude),
          lng: parseFloat(editExperience.longitude),
        });
      }
      imageFilesMapRef.current.clear();
      videoFilesMapRef.current.clear();
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
    setImages([]);
    setVideos([]);
    setYoutubeUrl('');
    imageFilesMapRef.current.clear();
    videoFilesMapRef.current.clear();
  };
  
  // 이미지 파일 선택 처리
  const handleImageSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    const newImages: string[] = [];
    
    for (const file of fileArray) {
      const imageUrl = URL.createObjectURL(file);
      newImages.push(imageUrl);
      imageFilesMapRef.current.set(imageUrl, file);
    }
    
    setImages([...images, ...newImages]);
  };
  
  // 비디오 파일 선택 처리
  const handleVideoSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    const newVideos: string[] = [];
    
    for (const file of fileArray) {
      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: t('post.videoTooLarge') || 'Video too large',
          description: t('post.videoTooLargeDesc') || 'Maximum video size is 15MB',
          variant: 'destructive',
        });
        continue;
      }
      const videoUrl = URL.createObjectURL(file);
      newVideos.push(videoUrl);
      videoFilesMapRef.current.set(videoUrl, file);
    }
    
    setVideos([...videos, ...newVideos]);
  };
  
  // 이미지 삭제
  const handleRemoveImage = (url: string) => {
    setImages(images.filter(img => img !== url));
    if (url.startsWith('blob:')) {
      imageFilesMapRef.current.delete(url);
      URL.revokeObjectURL(url);
    }
  };
  
  // 비디오 삭제
  const handleRemoveVideo = (url: string) => {
    setVideos(videos.filter(vid => vid !== url));
    if (url.startsWith('blob:')) {
      videoFilesMapRef.current.delete(url);
      URL.revokeObjectURL(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // 미디어 파일 업로드
    const imageFilesToUpload = Array.from(imageFilesMapRef.current.values());
    const videoFilesToUpload = Array.from(videoFilesMapRef.current.values());
    let uploadedImageUrls: string[] = [];
    let uploadedVideoUrls: string[] = [];

    if (imageFilesToUpload.length > 0) {
      try {
        const formData = new FormData();
        imageFilesToUpload.forEach(file => formData.append('files', file));
        const uploadResponse = await api('/api/upload', { method: 'POST', body: formData });
        uploadedImageUrls = uploadResponse.files.map((file: any) => file.url);
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        toast({
          title: t('post.imageUploadFailed') || 'Image upload failed',
          description: t('post.imageUploadFailedDesc') || 'Failed to upload image.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (videoFilesToUpload.length > 0) {
      try {
        const formData = new FormData();
        videoFilesToUpload.forEach(file => formData.append('files', file));
        const uploadResponse = await api('/api/upload', { method: 'POST', body: formData });
        uploadedVideoUrls = uploadResponse.files.map((file: any) => file.url);
      } catch (error) {
        console.error('비디오 업로드 실패:', error);
        toast({
          title: t('post.videoUploadFailed') || 'Video upload failed',
          description: t('post.videoUploadFailedDesc') || 'Failed to upload video.',
          variant: 'destructive',
        });
        return;
      }
    }

    const existingServerImages = isEditMode ? images.filter(url => !url.startsWith('blob:')) : [];
    const existingServerVideos = isEditMode ? videos.filter(url => !url.startsWith('blob:')) : [];
    const finalImages = [...existingServerImages, ...uploadedImageUrls];
    const finalVideos = [...existingServerVideos, ...uploadedVideoUrls];

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
      images: finalImages.length > 0 ? finalImages : undefined,
      videos: finalVideos.length > 0 ? finalVideos : undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
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

          {/* 미디어 업로드 섹션 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Image className="w-5 h-5" />
              사진 및 동영상
            </h3>
            
            {/* 업로드 버튼들 */}
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-sm">
                <Image size={18} className="text-gray-500" />
                <span className="text-gray-600">사진 추가</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) handleImageSelect(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  data-testid="input-experience-images"
                />
              </label>
              
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-sm">
                <Video size={18} className="text-gray-500" />
                <span className="text-gray-600">동영상 추가</span>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files) handleVideoSelect(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  data-testid="input-experience-videos"
                />
              </label>
            </div>
            
            {/* 이미지 미리보기 */}
            {images.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">사진 ({images.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <div key={`img-${image}`} className="relative w-20 h-20 flex-shrink-0">
                      <img src={image} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 비디오 미리보기 */}
            {videos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">동영상 ({videos.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {videos.map((video, index) => (
                    <div key={`vid-${video}`} className="relative w-20 h-20 flex-shrink-0">
                      <video src={video} className="w-full h-full object-cover rounded-lg" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <Video size={20} className="text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(video)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* YouTube URL 입력 */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube 동영상 URL
              </p>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="text-sm"
                data-testid="input-experience-youtube-url"
              />
              
              {youtubeVideoId && (
                <div className="mt-2 rounded-lg overflow-hidden">
                  <div className="relative w-full pt-[56.25%]">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title="YouTube video preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              
              {youtubeUrl && !youtubeVideoId && (
                <p className="text-xs text-red-500 mt-1">잘못된 YouTube URL입니다</p>
              )}
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