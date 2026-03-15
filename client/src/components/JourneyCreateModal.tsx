// @ts-nocheck
// 여정 생성 모달 — 여행 일정 그룹(Journey)을 생성하는 모달.
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin,
  Camera,
  Video,
  Heart,
  Cloud,
  Waves,
  Image as ImageIcon,
  X,
  Calendar,
  Clock,
  Hash,
  Upload,
  Film,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface JourneyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
}

const SHAPE_OPTIONS = [
  { id: 'none', name: '기본', icon: '⬜', color: 'bg-gray-100' },
  { id: 'heart', name: '하트', icon: '💖', color: 'bg-pink-100' },
  { id: 'cloud', name: '구름', icon: '☁️', color: 'bg-blue-100' },
  { id: 'wave', name: '웨이브', icon: '🌊', color: 'bg-teal-100' },
  { id: 'polaroid', name: '폴라로이드', icon: '📸', color: 'bg-yellow-100' },
];

const THEME_OPTIONS = [
  { id: 'emotional', name: '감성', color: 'bg-pink-500', emoji: '💕' },
  { id: 'healing', name: '힐링', color: 'bg-green-500', emoji: '🌿' },
  { id: 'landmark', name: '명소', color: 'bg-purple-500', emoji: '🏛️' },
  { id: 'food', name: '맛집', color: 'bg-orange-500', emoji: '🍽️' },
  { id: 'party', name: '파티타임', color: 'bg-red-500', emoji: '🎉' },
  { id: 'hotplace', name: '핫플레이스', color: 'bg-yellow-500', emoji: '🔥' },
];

export function JourneyCreateModal({
  isOpen,
  onClose,
  prefilledLocation,
}: JourneyCreateModalProps) {
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('1');
  const [content, setContent] = useState('');
  const [selectedShape, setSelectedShape] = useState('none');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(
    null
  );
  const [showTimelineCreate, setShowTimelineCreate] = useState(false);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDestination, setNewTimelineDestination] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 현재 사용자 정보 가져오기
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    staleTime: 5 * 60 * 1000,
  });

  // 사용자의 타임라인 목록 가져오기
  const { data: timelines } = useQuery({
    queryKey: ['/api/timelines'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // prefilledLocation 변경 시 위치 정보 업데이트
  useEffect(() => {
    if (prefilledLocation) {
      setSelectedLocation({
        lat: prefilledLocation.latitude,
        lng: prefilledLocation.longitude,
        name: prefilledLocation.name,
      });
    }
  }, [prefilledLocation]);

  // 모달이 열릴 때 임시저장된 피드 내용 복원
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem('feedDraft');
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          // 30분 이내의 임시저장 데이터만 복원
          if (Date.now() - draftData.timestamp < 30 * 60 * 1000) {
            setTitle(draftData.title || '');
            setDay(draftData.day || '1');
            setContent(draftData.content || '');
            setSelectedShape(draftData.selectedShape || 'none');
            setSelectedTheme(draftData.selectedTheme || '');
            setSelectedDate(
              draftData.selectedDate || new Date().toISOString().split('T')[0]
            );
            setSelectedTime(
              draftData.selectedTime || new Date().toTimeString().slice(0, 5)
            );
            setTags(draftData.tags || '');
            if (draftData.selectedLocation) {
              setSelectedLocation(draftData.selectedLocation);
            }

            toast({
              title: '임시저장된 내용을 복원했습니다',
              description: '타임라인 생성 전 작성하던 내용입니다.',
            });
          }
          // 복원 후 임시저장 데이터 삭제
          localStorage.removeItem('feedDraft');
        } catch (error) {
          console.error('임시저장 데이터 복원 오류:', error);
        }
      }
    }
  }, [isOpen]);

  // 위치가 선택되었을 때 제목 자동 설정
  useEffect(() => {
    if (selectedLocation?.name && !title) {
      const locationName = selectedLocation.name.split(' - ')[0];
      setTitle(locationName);
    }
  }, [selectedLocation, title]);

  // 위치 검색 함수
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setLocationSearchResults([]);
      return;
    }

    try {
      // Places API Text Search 사용
      const service = new (window as any).google.maps.places.PlacesService(
        document.createElement('div')
      );
      const request = {
        query: query,
        fields: ['place_id', 'name', 'geometry', 'formatted_address', 'types'],
      };

      service.textSearch(request, (results: any, status: any) => {
        if (
          status ===
            (window as any).google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          setLocationSearchResults(results.slice(0, 5)); // 최대 5개 결과
        } else {
          setLocationSearchResults([]);
        }
      });
    } catch (error) {
      console.error('위치 검색 오류:', error);
      setLocationSearchResults([]);
    }
  };

  // 위치 선택 함수
  const selectLocation = (place: any) => {
    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      name: place.name || place.formatted_address,
    };
    setSelectedLocation(location);
    setLocationSearch('');
    setShowLocationSearch(false);
    setLocationSearchResults([]);
  };

  // 파일 업로드 처리 함수들
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('이미지 업로드 시작:', event.target.files);
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    console.log('선택된 이미지 파일들:', imageFiles);

    if (uploadedImages.length + imageFiles.length > 10) {
      toast({
        title: '업로드 제한',
        description: '이미지는 최대 10개까지 업로드할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    setUploadedImages((prev) => {
      const newImages = [...prev, ...imageFiles];
      console.log('업데이트된 이미지 목록:', newImages);
      return newImages;
    });

    // 성공 메시지
    if (imageFiles.length > 0) {
      toast({
        title: '이미지 업로드 완료',
        description: `${imageFiles.length}개의 이미지가 추가되었습니다.`,
      });
    }

    // input 값 리셋
    event.target.value = '';
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('동영상 업로드 시작:', event.target.files);
    const files = Array.from(event.target.files || []);
    const videoFiles = files.filter((file) => file.type.startsWith('video/'));
    console.log('선택된 동영상 파일들:', videoFiles);

    if (videoFiles.length === 0) return;

    // 100MB 제한 확인
    let validVideos: File[] = [];
    videoFiles.forEach((video) => {
      if (video.size > 100 * 1024 * 1024) {
        // 100MB 제한
        toast({
          title: '업로드 제한',
          description: '동영상 파일 크기는 100MB를 초과할 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }
      validVideos.push(video);
    });

    if (validVideos.length > 0) {
      setUploadedVideos((prev) => {
        const newVideos = [...prev, ...validVideos];
        console.log('업데이트된 동영상 목록:', newVideos);
        return newVideos;
      });
      toast({
        title: '동영상 업로드 완료',
        description: `${validVideos.length}개의 동영상이 추가되었습니다.`,
      });
    }

    // input 값 리셋
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setUploadedVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // 필수 필드 검증
    if (!title.trim()) {
      toast({
        title: '제목 입력 필요',
        description: '제목을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedLocation) {
      toast({
        title: '위치 선택 필요',
        description: '위치를 먼저 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!day || day.trim() === '') {
      toast({
        title: 'Day 입력 필요',
        description: '여행 일차를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !content.trim() &&
      uploadedImages.length === 0 &&
      uploadedVideos.length === 0
    ) {
      toast({
        title: '콘텐츠 입력 필요',
        description: '사진, 영상 또는 설명 중 하나는 반드시 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTheme) {
      toast({
        title: '테마 선택 필요',
        description: '여행 테마를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || typeof user !== 'object' || !('id' in user)) {
      toast({
        title: '인증 오류',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageFilenames: string[] = [];
      let uploadedVideoFilenames: string[] = [];

      // 1. 파일 업로드 처리
      if (uploadedImages.length > 0 || uploadedVideos.length > 0) {
        console.log('파일 업로드 시작...');
        const formData = new FormData();

        // 이미지 파일 추가
        uploadedImages.forEach((file) => {
          formData.append('files', file);
        });

        // 동영상 파일 추가
        uploadedVideos.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('파일 업로드 실패');
        }

        const uploadResult = await uploadResponse.json();
        console.log('파일 업로드 성공:', uploadResult);

        // 업로드된 파일들을 이미지/동영상으로 분류
        uploadResult.files.forEach((file: any) => {
          if (file.mimetype.startsWith('image/')) {
            uploadedImageFilenames.push(file.filename);
          } else if (file.mimetype.startsWith('video/')) {
            uploadedVideoFilenames.push(file.filename);
          }
        });
      }

      // 2. 게시물 생성
      const tagsArray = tags
        .split(' ')
        .filter((tag) => tag.trim().startsWith('#'));

      console.log('게시물 데이터:', {
        content: content,
        location: selectedLocation?.name || '',
        latitude: selectedLocation?.lat || null,
        longitude: selectedLocation?.lng || null,
        title,
        day: day && day.trim() !== '' ? parseInt(day) : 1,
        shape: selectedShape,
        theme: selectedTheme,
        postDate: selectedDate,
        postTime: selectedTime,
        tags: tagsArray,
        images: uploadedImageFilenames,
        videos: uploadedVideoFilenames,
      });

      const response = await api('/api/posts', {
        method: 'POST',
        body: {
          content: content,
          location: selectedLocation?.name || '',
          latitude: selectedLocation?.lat
            ? selectedLocation.lat.toString()
            : null,
          longitude: selectedLocation?.lng
            ? selectedLocation.lng.toString()
            : null,
          title,
          day: day && day.trim() !== '' ? parseInt(day) : 1,
          shape: selectedShape,
          theme: selectedTheme,
          postDate: selectedDate,
          postTime: selectedTime,
          tags: tagsArray,
          images: uploadedImageFilenames,
          videos: uploadedVideoFilenames,
          timelineId: selectedTimelineId,
        }
      });

      console.log('게시물 생성 성공:', response);

      toast({
        title: '여정 기록 완료',
        description: '새로운 추억이 성공적으로 등록되었습니다.',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });

      // 폼 리셋
      setTitle('');
      setDay('1');
      setContent('');
      setSelectedShape('none');
      setSelectedTheme('');
      setTags('');
      setUploadedImages([]);
      setUploadedVideos([]);
      setSelectedLocation(null);
      setSelectedTimelineId(null);
      setShowTimelineCreate(false);
      setNewTimelineTitle('');
      setNewTimelineDestination('');
      onClose();
    } catch (error) {
      console.error('게시물 생성 오류:', error);
      toast({
        title: '오류 발생',
        description:
          error instanceof Error
            ? error.message
            : '여정 기록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedShapeData = SHAPE_OPTIONS.find((s) => s.id === selectedShape);
  const selectedThemeData = THEME_OPTIONS.find((t) => t.id === selectedTheme);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95%] max-w-lg mx-auto bg-white dark:bg-gray-900 max-h-[95vh] overflow-y-auto z-50 p-0">
          <DialogTitle className="sr-only">여정 기록하기</DialogTitle>
          <DialogDescription className="sr-only">
            새로운 여행 추억을 기록하고 공유하세요
          </DialogDescription>

          {/* 커스텀 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              ✨ 여정 기록하기
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4 p-4 pb-6">
            {/* 헤더 영역 */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    제목{' '}
                    <span className="text-xs text-gray-500">(최대 50글자)</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Day
                  </label>
                  <Input
                    value={day}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 3);
                      setDay(value);
                    }}
                    placeholder="1"
                    className="w-full text-center"
                    maxLength={3}
                  />
                </div>
              </div>
            </div>

            {/* 콘텐츠 업로드 영역 */}
            <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                📸 콘텐츠 업로드
              </h3>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                업로드된 이미지: {uploadedImages.length}개 | 동영상:{' '}
                {uploadedVideos.length}개
              </div>

              {/* Shape 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  콘텐츠 모양 선택
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SHAPE_OPTIONS.map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() => setSelectedShape(shape.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedShape === shape.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="text-xl mb-1">{shape.icon}</div>
                      <div className="text-xs font-medium">{shape.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 미디어 업로드 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                  selectedShape !== 'none'
                    ? selectedShapeData?.color
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex justify-center gap-4 mb-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="camera-input"
                        />
                        <Button
                          variant="outline"
                          className="w-full flex items-center gap-2 bg-white hover:bg-gray-50"
                          type="button"
                          onClick={() => {
                            console.log('카메라 버튼 클릭됨');
                            document.getElementById('camera-input')?.click();
                          }}
                        >
                          <Camera className="w-4 h-4" />
                          카메라
                        </Button>
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="gallery-input"
                        />
                        <Button
                          variant="outline"
                          className="w-full flex items-center gap-2 bg-white hover:bg-gray-50"
                          type="button"
                          onClick={() => {
                            console.log('갤러리 버튼 클릭됨');
                            document.getElementById('gallery-input')?.click();
                          }}
                        >
                          <ImageIcon className="w-4 h-4" />
                          갤러리
                        </Button>
                      </div>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-input"
                      />
                      <Button
                        variant="outline"
                        className="w-full flex items-center gap-2 bg-white hover:bg-gray-50"
                        type="button"
                        onClick={() => {
                          console.log('동영상 버튼 클릭됨');
                          document.getElementById('video-input')?.click();
                        }}
                      >
                        <Video className="w-4 h-4" />
                        동영상 추가
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  이미지 최대 10개 • 동영상 최대 100MB
                </p>
                {selectedShape !== 'none' && (
                  <div className="mt-3 text-xs text-teal-600 dark:text-teal-400">
                    {selectedShapeData?.name} 모양으로 표시됩니다{' '}
                    {selectedShapeData?.icon}
                  </div>
                )}
              </div>

              {/* 업로드된 미디어 미리보기 */}
              {(uploadedImages.length > 0 || uploadedVideos.length > 0) && (
                <div className="space-y-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-2 border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200">
                    ✅ 업로드된 파일들
                  </h4>

                  {/* 이미지 미리보기 */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        📸 이미지 ({uploadedImages.length}/10)
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedImages.map((image, index) => {
                          console.log('렌더링 이미지:', image);
                          // 빈 객체인 경우 대체 처리
                          if (!image || !image.name || image.name === '') {
                            return (
                              <div
                                key={index}
                                className="relative bg-gray-100 rounded-lg p-4 text-center"
                              >
                                <div className="text-xs text-gray-500">
                                  이미지 #{index + 1}
                                </div>
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                                  type="button"
                                >
                                  <X className="w-3 h-3 mx-auto" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div key={index} className="relative">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Image ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                                onError={(e) => {
                                  console.error('이미지 로드 오류:', e);
                                  (e.target as HTMLImageElement).style.display =
                                    'none';
                                }}
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                                type="button"
                              >
                                <X className="w-3 h-3 mx-auto" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                                {image.name || `이미지 ${index + 1}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 동영상 미리보기 */}
                  {uploadedVideos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        🎬 동영상 ({uploadedVideos.length})
                      </h4>
                      <div className="space-y-2">
                        {uploadedVideos.map((video, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <Film className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-40">
                                  {video.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(video.size / (1024 * 1024)).toFixed(1)} MB
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeVideo(index)}
                              className="w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                              type="button"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 파일 없을 때 안내 메시지 */}
              {uploadedImages.length === 0 && uploadedVideos.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    📁 아직 업로드된 파일이 없습니다
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    위 버튼을 눌러 이미지나 동영상을 추가해보세요
                  </p>
                </div>
              )}

              {/* 설명 텍스트 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  설명{' '}
                  <span className="text-xs text-gray-500">(최대 700글자)</span>
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="이 순간의 특별한 이야기를 들려주세요..."
                  className="min-h-[100px] resize-none"
                  maxLength={700}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {content.length}/700
                </div>
              </div>
            </div>

            {/* 타임라인 선택 영역 */}
            <div className="space-y-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                📅 여행 타임라인
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    타임라인 선택 (선택사항)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="no-timeline"
                        name="timeline"
                        checked={selectedTimelineId === null}
                        onChange={() => setSelectedTimelineId(null)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <label
                        htmlFor="no-timeline"
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        타임라인 없이 단독 포스팅
                      </label>
                    </div>

                    {timelines && timelines.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {timelines.map((timeline: any) => (
                          <div
                            key={timeline.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="radio"
                              id={`timeline-${timeline.id}`}
                              name="timeline"
                              checked={selectedTimelineId === timeline.id}
                              onChange={() =>
                                setSelectedTimelineId(timeline.id)
                              }
                              className="w-4 h-4 text-purple-600"
                            />
                            <label
                              htmlFor={`timeline-${timeline.id}`}
                              className="text-sm text-gray-700 dark:text-gray-300 flex-1"
                            >
                              {timeline.title}
                              {timeline.destination && (
                                <span className="text-xs text-gray-500 ml-1">
                                  - {timeline.destination}
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          '피드 작성 내용 임시저장하고 타임라인 페이지로 이동'
                        );

                        // 현재 작성 내용을 localStorage에 임시 저장
                        const draftData = {
                          title,
                          day,
                          content,
                          selectedShape,
                          selectedTheme,
                          selectedDate,
                          selectedTime,
                          tags,
                          selectedLocation,
                          uploadedImages: uploadedImages.map((file) => ({
                            name: file.name,
                            size: file.size,
                          })),
                          uploadedVideos: uploadedVideos.map((file) => ({
                            name: file.name,
                            size: file.size,
                          })),
                          timestamp: Date.now(),
                        };
                        localStorage.setItem(
                          'feedDraft',
                          JSON.stringify(draftData)
                        );

                        onClose(); // 현재 모달 닫기
                        window.postMessage(
                          { type: 'open-timeline-modal' },
                          '*'
                        ); // 기존 타임라인 모달 열기
                      }}
                      className="w-full text-purple-600 border-2 border-dashed border-purple-300 hover:bg-purple-50 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                    >
                      + 새 타임라인 만들기
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 여정 기본정보 입력 영역 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                📝 여정 기본정보
              </h3>

              {/* 위치 검색 및 선택 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  위치 설정
                </label>

                {/* 위치 검색 버튼 */}
                {!selectedLocation && (
                  <Button
                    variant="outline"
                    onClick={() => setShowLocationSearch(true)}
                    className="w-full flex items-center gap-2"
                    type="button"
                  >
                    <Search className="w-4 h-4" />
                    위치 검색하기
                  </Button>
                )}

                {/* 위치 검색 입력창 */}
                {showLocationSearch && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          searchLocation(e.target.value);
                        }}
                        placeholder="음식점, 카페, 관광지 등을 검색하세요"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowLocationSearch(false);
                          setLocationSearch('');
                          setLocationSearchResults([]);
                        }}
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 검색 결과 */}
                    {locationSearchResults.length > 0 && (
                      <div className="border rounded-lg p-2 bg-white dark:bg-gray-800 max-h-40 overflow-y-auto">
                        {locationSearchResults.map((place, index) => (
                          <button
                            key={index}
                            onClick={() => selectLocation(place)}
                            className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                            type="button"
                          >
                            <div className="font-medium">{place.name}</div>
                            <div className="text-xs text-gray-500">
                              {place.formatted_address}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 선택된 위치 표시 */}
                {selectedLocation && (
                  <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <span className="text-sm text-teal-700 dark:text-teal-300">
                        {selectedLocation.name ||
                          `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLocation(null);
                        setShowLocationSearch(true);
                      }}
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 날짜와 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    날짜
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    시간
                  </label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
              </div>

              {/* 테마 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  테마 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedTheme === theme.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="text-lg mb-1">{theme.emoji}</div>
                      <div className="text-xs font-medium">{theme.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 태그 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Hash className="w-4 h-4 inline mr-1" />
                  태그
                </label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="#Paris #Cafe #혼행 (공백으로 구분)"
                  className="w-full"
                />
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                임시저장
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? '업로드 중...' : '게시하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
