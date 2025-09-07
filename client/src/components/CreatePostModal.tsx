import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Camera, MapPin, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(
    initialLocation?.name ||
      (initialLocation
        ? `${initialLocation.lat.toFixed(4)}, ${initialLocation.lng.toFixed(4)}`
        : '')
  );
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [exifData, setExifData] = useState<ExifData[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: async (post: InsertPost) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      });
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '게시글 작성 완료',
        description: '새로운 여행 스토리가 공유되었습니다!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      onClose();
      setContent('');
      setLocation('');
      setImages([]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: '내용 입력',
        description: '게시글 내용을 입력해주세요.',
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

    const post: InsertPost = {
      userId: 'current-user', // This should come from auth
      content,
      location: location || undefined,
      images: images.length > 0 ? images : undefined,
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
          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="어떤 여행 이야기를 공유하고 싶나요?"
            className="border-0 resize-none text-base"
            rows={6}
            autoFocus
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
                    onClick={() =>
                      setImages(images.filter((_, i) => i !== index))
                    }
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
              disabled={!content.trim() || createPostMutation.isPending}
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
