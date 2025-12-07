import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Camera, MapPin, Image, Video, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LocationSearchInput } from '@/components/ui/location-search-input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { InsertPost, Post } from '@shared/schema';
import exifr from 'exifr';
import { useTranslation } from 'react-i18next';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: { lat: number; lng: number; name?: string } | null;
  editPost?: Post | null;
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
  editPost,
}: CreatePostModalProps) {
  const isEditMode = !!editPost;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [theme, setTheme] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [exifData, setExifData] = useState<Map<string, ExifData>>(new Map());
  
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
  const queryClient = useQueryClient();
  const { t } = useTranslation('ui');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Track new files by their blob URL (key = blob URL, value = File)
  const imageFilesMapRef = useRef<Map<string, File>>(new Map());
  const videoFilesMapRef = useRef<Map<string, File>>(new Map());

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title || '');
      setContent(editPost.content || '');
      setLocation(editPost.location || '');
      setTheme(editPost.theme || '');
      setImages(editPost.images || []);
      setVideos(editPost.videos || []);
      setYoutubeUrl(editPost.youtubeUrl || '');
      if (editPost.latitude && editPost.longitude) {
        setLocationCoords({
          lat: parseFloat(editPost.latitude),
          lng: parseFloat(editPost.longitude),
        });
      }
      // Clear file maps when editing existing post
      imageFilesMapRef.current.clear();
      videoFilesMapRef.current.clear();
      setExifData(new Map());
    } else {
      setTitle('');
      setContent('');
      setLocation(
        initialLocation?.name ||
          (initialLocation
            ? `${initialLocation.lat.toFixed(4)}, ${initialLocation.lng.toFixed(4)}`
            : '')
      );
      setLocationCoords(
        initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
      );
      setTheme('');
      setImages([]);
      setVideos([]);
      setYoutubeUrl('');
      setExifData(new Map());
      imageFilesMapRef.current.clear();
      videoFilesMapRef.current.clear();
    }
  }, [editPost, initialLocation, isOpen]);

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
      resetForm();
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

  const updatePostMutation = useMutation({
    mutationFn: async (post: any) => {
      return api(`/api/posts/${editPost?.id}`, {
        method: 'PATCH',
        body: post,
      });
    },
    onSuccess: () => {
      toast({
        title: t('post.updateSuccess') || 'Post updated',
        description: t('post.updateSuccessDesc') || 'Your post has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast({
        title: t('post.updateError') || 'Update failed',
        description: t('post.updateErrorDesc') || 'Failed to update post. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setLocation('');
    setLocationCoords(null);
    setTheme('');
    setImages([]);
    setVideos([]);
    setYoutubeUrl('');
    setExifData(new Map());
    imageFilesMapRef.current.clear();
    videoFilesMapRef.current.clear();
  };

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

  // 이미지 파일 선택 처리
  const handleFileSelect = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newImages: string[] = [];
    const newExifEntries: [string, ExifData][] = [];

    for (const file of fileArray) {
      // 이미지 미리보기 URL 생성
      const imageUrl = URL.createObjectURL(file);
      newImages.push(imageUrl);
      
      // Store file in map with blob URL as key
      imageFilesMapRef.current.set(imageUrl, file);

      // EXIF 데이터 추출
      const exif = await extractExifData(file);
      newExifEntries.push([imageUrl, exif]);
    }

    setImages([...images, ...newImages]);
    setExifData(prev => {
      const next = new Map(prev);
      newExifEntries.forEach(([url, data]) => next.set(url, data));
      return next;
    });
  };

  // 비디오 파일 선택 처리
  const handleVideoSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    const newVideos: string[] = [];

    for (const file of fileArray) {
      // 비디오 크기 체크 (15MB 제한)
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
      
      // Store file in map with blob URL as key
      videoFilesMapRef.current.set(videoUrl, file);
    }

    setVideos([...videos, ...newVideos]);
  };

  // 이미지 삭제 처리 (uses blob URL to identify new vs existing)
  const handleRemoveImage = (url: string) => {
    setImages(images.filter(img => img !== url));
    
    // If it's a blob URL (new file), remove from file map and revoke URL
    if (url.startsWith('blob:')) {
      imageFilesMapRef.current.delete(url);
      setExifData(prev => {
        const next = new Map(prev);
        next.delete(url);
        return next;
      });
      URL.revokeObjectURL(url);
    }
  };

  // 비디오 삭제 처리 (uses blob URL to identify new vs existing)
  const handleRemoveVideo = (url: string) => {
    setVideos(videos.filter(vid => vid !== url));
    
    // If it's a blob URL (new file), remove from file map and revoke URL
    if (url.startsWith('blob:')) {
      videoFilesMapRef.current.delete(url);
      URL.revokeObjectURL(url);
    }
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

    exifData.forEach((exif) => {
      if (exif.takenAt) {
        if (!earliestTakenAt || exif.takenAt < earliestTakenAt) {
          earliestTakenAt = exif.takenAt;
        }
      }
      if (exif.latitude && exif.longitude && !bestLatitude) {
        bestLatitude = exif.latitude;
        bestLongitude = exif.longitude;
      }
    });

    // Get files to upload from Maps
    const imageFilesToUpload = Array.from(imageFilesMapRef.current.values());
    const videoFilesToUpload = Array.from(videoFilesMapRef.current.values());

    // 이미지/비디오 파일 업로드
    let uploadedImageUrls: string[] = [];
    let uploadedVideoUrls: string[] = [];
    
    // 새 이미지 파일 업로드
    if (imageFilesToUpload.length > 0) {
      try {
        const formData = new FormData();
        imageFilesToUpload.forEach(file => {
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
          title: t('post.imageUploadFailed'),
          description: t('post.imageUploadFailedDesc'),
          variant: 'destructive',
        });
        return;
      }
    }

    // 새 비디오 파일 업로드
    if (videoFilesToUpload.length > 0) {
      try {
        const formData = new FormData();
        videoFilesToUpload.forEach(file => {
          formData.append('files', file);
        });

        const uploadResponse = await api('/api/upload', {
          method: 'POST',
          body: formData,
        });

        uploadedVideoUrls = uploadResponse.files.map((file: any) => file.url);
      } catch (error) {
        console.error('비디오 업로드 실패:', error);
        toast({
          title: t('post.videoUploadFailed') || 'Video upload failed',
          description: t('post.videoUploadFailedDesc') || 'Failed to upload video. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    // 수정 모드: 기존 서버 URL (blob:// 아닌 것들) + 새로 업로드된 URL
    // 새 게시글 모드: 업로드된 URL만
    const existingServerImages = isEditMode 
      ? images.filter(url => !url.startsWith('blob:'))
      : [];
    const existingServerVideos = isEditMode 
      ? videos.filter(url => !url.startsWith('blob:'))
      : [];
    
    const finalImages = [...existingServerImages, ...uploadedImageUrls];
    const finalVideos = [...existingServerVideos, ...uploadedVideoUrls];

    const post = {
      title,
      content,
      location: location || undefined,
      theme,
      images: finalImages.length > 0 ? finalImages : undefined,
      videos: finalVideos.length > 0 ? finalVideos : undefined,
      youtubeUrl: youtubeUrl.trim() || undefined,
      takenAt: earliestTakenAt || undefined,
      latitude: locationCoords?.lat?.toString() || bestLatitude?.toString(),
      longitude: locationCoords?.lng?.toString() || bestLongitude?.toString(),
    };

    if (isEditMode) {
      console.log('게시글 수정 데이터:', post);
      updatePostMutation.mutate(post);
    } else {
      console.log('게시글 생성 데이터:', post);
      createPostMutation.mutate(post);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditMode ? (t('post.editPost') || 'Edit Post') : t('post.newPost')}
          </h2>
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

          {/* Media Upload Section */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Image size={16} />
              <span>{t('post.addMedia') || 'Add Photos & Videos'}</span>
            </div>
            
            {/* Upload Buttons */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {/* Gallery Button - 갤러리에서 이미지/비디오 선택 */}
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-sm">
                <Image size={18} className="text-gray-500" />
                <span className="text-gray-600">{t('post.gallery') || 'Gallery'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      const imageFilesToAdd: File[] = [];
                      const videoFilesToAdd: File[] = [];
                      
                      files.forEach(file => {
                        if (file.type.startsWith('image/')) {
                          imageFilesToAdd.push(file);
                        } else if (file.type.startsWith('video/')) {
                          videoFilesToAdd.push(file);
                        }
                      });
                      
                      if (imageFilesToAdd.length > 0) {
                        const fileList = new DataTransfer();
                        imageFilesToAdd.forEach(f => fileList.items.add(f));
                        handleFileSelect(fileList.files);
                      }
                      if (videoFilesToAdd.length > 0) {
                        const fileList = new DataTransfer();
                        videoFilesToAdd.forEach(f => fileList.items.add(f));
                        handleVideoSelect(fileList.files);
                      }
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  data-testid="input-gallery"
                />
              </label>
              
              {/* Camera Button - 모바일에서 즉시 사진 촬영 */}
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-sm">
                <Camera size={18} className="text-gray-500" />
                <span className="text-gray-600">{t('post.takePhoto') || 'Take Photo'}</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  data-testid="input-camera"
                />
              </label>
              
              {/* Video Button - 모바일에서 즉시 동영상 촬영 */}
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-sm">
                <Video size={18} className="text-gray-500" />
                <span className="text-gray-600">{t('post.recordVideo') || 'Record Video'}</span>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleVideoSelect(e.target.files);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  data-testid="input-video-capture"
                />
              </label>
            </div>
            
            {/* Images Preview */}
            {images.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">{t('post.photos') || 'Photos'} ({images.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <div key={`img-${image}`} className="relative w-20 h-20 flex-shrink-0">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        data-testid={`button-remove-image-${index}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Videos Preview */}
            {videos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">{t('post.videos') || 'Videos'} ({videos.length})</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {videos.map((video, index) => (
                    <div key={`vid-${video}`} className="relative w-20 h-20 flex-shrink-0">
                      <video
                        src={video}
                        className="w-full h-full object-cover rounded-lg"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <Video size={20} className="text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(video)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        data-testid={`button-remove-video-${index}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* YouTube URL Input */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                {t('post.youtubeUrl') || 'YouTube Video URL'}
              </p>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="border-gray-200 text-sm"
                data-testid="input-youtube-url"
              />
              
              {/* YouTube Preview */}
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
                <p className="text-xs text-red-500 mt-1">
                  {t('post.invalidYoutubeUrl') || 'Invalid YouTube URL'}
                </p>
              )}
            </div>
            
            {/* Empty state */}
            {images.length === 0 && videos.length === 0 && !youtubeUrl && (
              <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg mt-3">
                {t('post.noMediaSelected') || 'No photos or videos selected'}
              </div>
            )}
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
              disabled={!title.trim() || !content.trim() || !theme || createPostMutation.isPending || updatePostMutation.isPending}
              className="flex-1 travel-button"
              data-testid="button-submit-post"
            >
              {isEditMode
                ? (updatePostMutation.isPending ? (t('post.updating') || 'Updating...') : (t('post.update') || 'Update'))
                : (createPostMutation.isPending ? t('post.posting') : t('post.publish'))
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
