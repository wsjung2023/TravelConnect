import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Camera, Video, Heart, Cloud, Waves, Image as ImageIcon, X, Calendar, Clock, Hash, Upload, Film } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface JourneyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetLocation?: {
    lat: number;
    lng: number;
    name?: string;
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

export function JourneyCreateModal({ isOpen, onClose, presetLocation }: JourneyCreateModalProps) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [content, setContent] = useState("");
  const [selectedShape, setSelectedShape] = useState('none');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(new Date().toTimeString().slice(0, 5));
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // presetLocation 변경 시 위치 정보 업데이트
  useEffect(() => {
    if (presetLocation) {
      setSelectedLocation(presetLocation);
    }
  }, [presetLocation]);

  // 위치가 선택되었을 때 제목 자동 설정
  useEffect(() => {
    if (selectedLocation?.name && !title) {
      const locationName = selectedLocation.name.split(' - ')[0];
      setTitle(locationName);
    }
  }, [selectedLocation, title]);

  // 파일 업로드 처리 함수들
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (uploadedImages.length + imageFiles.length > 10) {
      toast({
        title: "업로드 제한",
        description: "이미지는 최대 10개까지 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadedImages(prev => [...prev, ...imageFiles]);
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const videoFiles = files.filter(file => file.type.startsWith('video/'));
    
    // 10분 = 600초 제한 확인 (개략적)
    for (const video of videoFiles) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        if (videoElement.duration > 600) {
          toast({
            title: "업로드 제한",
            description: "동영상은 최대 10분까지 업로드할 수 있습니다.",
            variant: "destructive",
          });
          return;
        }
      };
      videoElement.src = URL.createObjectURL(video);
    }
    
    setUploadedVideos(prev => [...prev, ...videoFiles]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setUploadedVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "입력 오류",
        description: "제목과 설명을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/api/posts", "POST", {
        userId: "current-user",
        content: `[${title}] ${content}`,
        location: selectedLocation?.name || "",
        latitude: selectedLocation?.lat || null,
        longitude: selectedLocation?.lng || null,
        title,
        day: day ? parseInt(day) : null,
        shape: selectedShape,
        theme: selectedTheme,
        postDate: selectedDate,
        postTime: selectedTime,
        tags: tags.split(' ').filter(tag => tag.startsWith('#')),
        images: uploadedImages.map(img => img.name),
        videos: uploadedVideos.map(vid => vid.name)
      });

      toast({
        title: "여정 기록 완료",
        description: "새로운 추억이 성공적으로 등록되었습니다.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      // 폼 리셋
      setTitle("");
      setDay("");
      setContent("");
      setSelectedShape('none');
      setSelectedTheme('');
      setTags("");
      onClose();
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "여정 기록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedShapeData = SHAPE_OPTIONS.find(s => s.id === selectedShape);
  const selectedThemeData = THEME_OPTIONS.find(t => t.id === selectedTheme);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-auto bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">여정 기록하기</DialogTitle>
        <DialogDescription className="sr-only">새로운 여행 추억을 기록하고 공유하세요</DialogDescription>
        
        {/* 커스텀 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">✨ 여정 기록하기</h2>
        </div>
        
        <div className="space-y-6 p-4">
          {/* 헤더 영역 */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  제목 <span className="text-xs text-gray-500">(최대 50글자)</span>
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
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">📸 콘텐츠 업로드</h3>
            
            {/* Shape 선택 - 컴팩트 버전 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                모양 선택
              </label>
              <div className="flex gap-1">
                {SHAPE_OPTIONS.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedShape(shape.id)}
                    className={`p-1 rounded border transition-all ${
                      selectedShape === shape.id 
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    title={shape.name}
                  >
                    <div className="text-sm">{shape.icon}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 미디어 업로드 영역 */}
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              selectedShape !== 'none' ? selectedShapeData?.color : 'border-gray-300 dark:border-gray-600'
            }`}>
              <div className="flex justify-center gap-4 mb-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="flex items-center gap-2" type="button">
                    <Camera className="w-4 h-4" />
                    카메라
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="flex items-center gap-2" type="button">
                    <ImageIcon className="w-4 h-4" />
                    갤러리
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="flex items-center gap-2" type="button">
                    <Video className="w-4 h-4" />
                    동영상
                  </Button>
                </label>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                이미지 최대 10개 • 동영상 최대 10분
              </p>
              {selectedShape !== 'none' && (
                <div className="mt-3 text-xs text-teal-600 dark:text-teal-400">
                  {selectedShapeData?.name} 모양으로 표시됩니다 {selectedShapeData?.icon}
                </div>
              )}
            </div>

            {/* 업로드된 이미지 미리보기 */}
            {uploadedImages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  업로드된 이미지 ({uploadedImages.length}/10)
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 업로드된 동영상 미리보기 */}
            {uploadedVideos.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  업로드된 동영상 ({uploadedVideos.length})
                </h4>
                <div className="space-y-2">
                  {uploadedVideos.map((video, index) => (
                    <div key={index} className="relative border-2 border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Film className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {video.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(video.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeVideo(index)}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                      {/* 동영상 진행률 바 - 2-3px 두께 */}
                      <div className="mt-3">
                        <div className="w-full h-1 bg-gray-200 rounded-full">
                          <div className="h-1 bg-teal-500 rounded-full" style={{ width: '0%' }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>00:00</span>
                          <span>재생 준비됨</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 설명 텍스트 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                설명 <span className="text-xs text-gray-500">(최대 700글자)</span>
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

          {/* 여정 기본정보 입력 영역 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">📝 여정 기본정보</h3>
            
            {/* 위치 정보 */}
            {selectedLocation && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-teal-700 dark:text-teal-300">
                  {selectedLocation.name || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                </span>
              </div>
            )}

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
              {isSubmitting ? "업로드 중..." : "게시하기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}