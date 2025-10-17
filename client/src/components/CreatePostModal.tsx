import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Camera, MapPin, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { InsertPost } from '@shared/schema';
import exifr from 'exifr';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: { lat: number; lng: number; name?: string } | null;
}

interface ExifData {
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  location: initialLocation,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(
    initialLocation?.name ||
      (initialLocation
        ? `${initialLocation.lat.toFixed(4)}, ${initialLocation.lng.toFixed(4)}`
        : '')
  );
  const [theme, setTheme] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [exifData, setExifData] = useState<ExifData[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: async (post: any) => {
      return api('/api/posts', {
        method: 'POST',
        body: post,
      });
    },
    onSuccess: () => {
      toast({
        title: '게시글 작성 완료',
        description: '새로운 여행 스토리가 공유되었습니다!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setTitle('');
      setContent('');
      setLocation('');
      setTheme('');
      setImages([]);
      setImageFiles([]);
      setExifData([]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: '게시글 작성 실패',
        description: '게시글 작성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // EXIF 데이터 추출 함수
  const extractExifData = async (file: File): Promise<ExifData> => {
    try {
      const exif = await exifr.parse(file, {
        gps: true,
        pick: ['DateTimeOriginal', 'CreateDate', 'DateTime', 'GPS']
      });

      let takenAt: Date | null = null;
      let latitude: number | null = null;
      let longitude: number | null = null;

      // 촬영 시간 추출 (우선순위: DateTimeOriginal > CreateDate > DateTime)
      if (exif?.DateTimeOriginal) {
        takenAt = new Date(exif.DateTimeOriginal);
      } else if (exif?.CreateDate) {
        takenAt = new Date(exif.CreateDate);
      } else if (exif?.DateTime) {
        takenAt = new Date(exif.DateTime);
      }

      // GPS 좌표 추출
      if (exif?.latitude && exif?.longitude) {
        latitude = exif.latitude;
        longitude = exif.longitude;
      }

      console.log('EXIF 추출 결과:', { takenAt, latitude, longitude });
      return { takenAt, latitude, longitude };
    } catch (error) {
      console.log('EXIF 추출 실패:', error);
      return { takenAt: null, latitude: null, longitude: null };
    }
  };

  // 파일 선택 처리
  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newImages: string[] = [];
    const newExifData: ExifData[] = [];

    for (const file of fileArray) {
      // 이미지 미리보기 URL 생성
      const imageUrl = URL.createObjectURL(file);
      newImages.push(imageUrl);

      // EXIF 데이터 추출
      const exif = await extractExifData(file);
      newExifData.push(exif);
    }

    setImages([...images, ...newImages]);
    setImageFiles([...imageFiles, ...fileArray]);
    setExifData([...exifData, ...newExifData]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: '제목 입력',
        description: '게시글 제목을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: '내용 입력',
        description: '게시글 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!theme) {
      toast({
        title: '테마 선택',
        description: '게시글 테마를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // EXIF 데이터에서 가장 빠른 takenAt 시간과 GPS 좌표 추출
    let earliestTakenAt: Date | null = null;
    let bestLatitude: number | null = null;
    let bestLongitude: number | null = null;

    for (const exif of exifData) {
      if (exif.takenAt) {
        if (!earliestTakenAt || exif.takenAt < earliestTakenAt) {
          earliestTakenAt = exif.takenAt;
        }
      }
      if (exif.latitude && exif.longitude && !bestLatitude) {
        bestLatitude = exif.latitude;
        bestLongitude = exif.longitude;
      }
    }

    // 이미지 파일 업로드
    let uploadedImageUrls: string[] = [];
    if (imageFiles.length > 0) {
      try {
        const formData = new FormData();
        imageFiles.forEach(file => {
          formData.append('files', file);
        });

        const uploadResponse = await api('/api/upload', {
          method: 'POST',
          body: formData,
        });

        uploadedImageUrls = uploadResponse.files.map((file: any) => file.url);
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        toast({
          title: '이미지 업로드 실패',
          description: '이미지 업로드 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
        return;
      }
    }

    const post = {
      title,
      content,
      location: location || undefined,
      theme,
      images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
      takenAt: earliestTakenAt || undefined,
      latitude: bestLatitude?.toString(),
      longitude: bestLongitude?.toString(),
    };

    console.log('게시글 생성 데이터:', post);
    createPostMutation.mutate(post);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">새 게시글</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Title */}
          <div className="mb-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="여행 제목을 입력하세요"
              className="border-gray-200 text-lg font-medium"
              autoFocus
            />
          </div>

          {/* Theme Selection */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>테마 선택</span>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md"
            >
              <option value="">테마를 선택하세요</option>
              <option value="restaurant">맛집</option>
              <option value="landmark">명소</option>
              <option value="activity">액티비티</option>
              <option value="emotional">감성</option>
              <option value="party">파티</option>
              <option value="healing">힐링</option>
              <option value="hotplace">핫플레이스</option>
            </select>
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="어떤 여행 이야기를 공유하고 싶나요?"
            className="border-0 resize-none text-base"
            rows={4}
          />

          {/* Location */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <MapPin size={16} />
              <span>위치 추가</span>
            </div>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="어디에서의 이야기인가요?"
              className="border-gray-200"
            />
          </div>

          {/* Image Upload */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Image size={16} />
              <span>사진 추가</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                <Camera size={24} className="text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </label>
              {images.map((image, index) => (
                <div key={index} className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImages(images.filter((_, i) => i !== index));
                      setImageFiles(imageFiles.filter((_, i) => i !== index));
                      setExifData(exifData.filter((_, i) => i !== index));
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || !theme || createPostMutation.isPending}
              className="flex-1 travel-button"
            >
              {createPostMutation.isPending ? '게시 중...' : '게시하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
