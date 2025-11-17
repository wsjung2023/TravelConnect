import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Camera, MapPin, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LocationSearchInput } from '@/components/ui/location-search-input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { InsertPost } from '@shared/schema';
import exifr from 'exifr';
import { useTranslation } from 'react-i18next';

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
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );
  const [theme, setTheme] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [exifData, setExifData] = useState<ExifData[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('ui');

  const createPostMutation = useMutation({
    mutationFn: async (post: any) => {
      return api('/api/posts', {
        method: 'POST',
        body: post,
      });
    },
    onSuccess: () => {
      toast({
        title: t('post.createSuccess'),
        description: t('post.createSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setTitle('');
      setContent('');
      setLocation('');
      setLocationCoords(null);
      setTheme('');
      setImages([]);
      setImageFiles([]);
      setExifData([]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: t('post.createError'),
        description: t('post.createErrorDesc'),
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
        title: t('post.titleRequired'),
        description: t('post.titleRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: t('post.contentRequired'),
        description: t('post.contentRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!theme) {
      toast({
        title: t('post.themeRequired'),
        description: t('post.themeRequiredDesc'),
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
    let uploadedMediaFiles: any[] = [];
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
        uploadedMediaFiles = uploadResponse.files;
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
        toast({
          title: t('post.imageUploadFailed'),
          description: t('post.imageUploadFailedDesc'),
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
      latitude: locationCoords?.lat?.toString() || bestLatitude?.toString(),
      longitude: locationCoords?.lng?.toString() || bestLongitude?.toString(),
      mediaFiles: uploadedMediaFiles.length > 0 ? uploadedMediaFiles : undefined,
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
          <h2 className="text-lg font-semibold">{t('post.newPost')}</h2>
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
              placeholder={t('post.titlePlaceholder')}
              className="border-gray-200 text-lg font-medium"
              autoFocus
            />
          </div>

          {/* Theme Selection */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <span>{t('post.selectTheme')}</span>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md"
            >
              <option value="">{t('post.selectThemePlaceholder')}</option>
              <option value="restaurant">{t('themes.restaurant')}</option>
              <option value="landmark">{t('themes.landmark')}</option>
              <option value="activity">{t('themes.activity')}</option>
              <option value="emotional">{t('themes.emotional')}</option>
              <option value="party">{t('themes.party')}</option>
              <option value="healing">{t('themes.healing')}</option>
              <option value="hotplace">{t('themes.hotplace')}</option>
            </select>
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('post.contentPlaceholder')}
            className="border-0 resize-none text-base"
            rows={4}
          />

          {/* Location */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <MapPin size={16} />
              <span>{t('post.addLocation')}</span>
            </div>
            <LocationSearchInput
              value={location}
              onChange={(value, placeData) => {
                if (placeData && placeData.geometry && placeData.geometry.location) {
                  setLocation(placeData.formatted_address || value);
                  setLocationCoords({
                    lat: placeData.geometry.location.lat(),
                    lng: placeData.geometry.location.lng(),
                  });
                } else {
                  setLocation(value);
                  setLocationCoords(null);
                }
              }}
              placeholder={t('post.locationPlaceholder')}
              className="border-gray-200"
            />
          </div>

          {/* Image Upload */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Image size={16} />
              <span>{t('post.addPhoto')}</span>
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
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !content.trim() || !theme || createPostMutation.isPending}
              className="flex-1 travel-button"
            >
              {createPostMutation.isPending ? t('post.posting') : t('post.publish')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
