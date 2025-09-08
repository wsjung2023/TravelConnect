import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Upload, X, Calendar, Camera, MapPin } from 'lucide-react';
import { TimelineCard } from '@/components/TimelineCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface ProcessedFile {
  originalName: string;
  filename: string;
  size: number;
  mimetype: string;
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DayGroup {
  dayId: number;
  date: string;
  files: Array<{
    filename: string;
    takenAt: Date | null;
    latitude: number | null;
    longitude: number | null;
  }>;
}

interface ImportResponse {
  message: string;
  totalFiles: number;
  processedFiles: ProcessedFile[];
  dayGroups: DayGroup[];
  uploadPath: string;
}

export default function TimelineCreate() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
      const isValidSize = file.size <= 15 * 1024 * 1024; // 15MB
      
      if (!isValidType) {
        toast({
          title: '파일 형식 오류',
          description: `${file.name}은(는) 지원되지 않는 형식입니다.`,
          variant: 'destructive',
        });
      }
      
      if (!isValidSize) {
        toast({
          title: '파일 크기 초과',
          description: `${file.name}이(가) 15MB를 초과합니다.`,
          variant: 'destructive',
        });
      }
      
      return isValidType && isValidSize;
    });

    if (validFiles.length > 100) {
      toast({
        title: '파일 개수 제한',
        description: '최대 100개의 파일만 선택할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles(validFiles);
  };

  // 파일 제거 핸들러
  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // 미디어 업로드 뮤테이션
  const importMediaMutation = useMutation({
    mutationFn: async (files: File[]): Promise<ImportResponse> => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // 업로드 진행률 시뮬레이션 (실제 진행률은 구현이 복잡함)
      setUploadProgress(30);
      
      const response = await fetch('/api/trips/import-media', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      setUploadProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '업로드 실패');
      }

      setUploadProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      setDayGroups(data.dayGroups);
      setIsUploading(false);
      setUploadProgress(0);
      
      toast({
        title: '업로드 완료',
        description: `${data.totalFiles}개 파일이 ${data.dayGroups.length}개 Day로 그룹화되었습니다.`,
      });
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      
      toast({
        title: '업로드 실패',
        description: error.message || '파일 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 업로드 시작
  const startUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: '파일 없음',
        description: '업로드할 파일을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    importMediaMutation.mutate(selectedFiles);
  };

  // 파일 크기 포맷터
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 날짜 포맷터
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className="mobile-content bg-white custom-scrollbar">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/timeline')}
            data-testid="back-button"
          >
            ← 뒤로
          </Button>
          <div>
            <h1 className="font-bold text-lg">타임라인 만들기</h1>
            <p className="text-sm text-gray-500">사진으로 여행 기록 생성</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 파일 선택 영역 */}
        {dayGroups.length === 0 && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              data-testid="file-drop-zone"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">사진을 선택하세요</p>
              <p className="text-sm text-gray-500 mb-4">
                JPEG, PNG, WebP 파일 (최대 15MB, 100개까지)
              </p>
              <Button data-testid="select-files-button">
                <Camera size={16} className="mr-2" />
                사진 선택
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />

            {/* 선택된 파일 목록 */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">선택된 파일 ({selectedFiles.length}개)</h3>
                  <Button
                    onClick={() => setSelectedFiles([])}
                    variant="ghost"
                    size="sm"
                  >
                    모두 제거
                  </Button>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                        {file.type.startsWith('image/') && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        className="p-1"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={startUpload}
                  disabled={isUploading}
                  className="w-full travel-button"
                  data-testid="upload-button"
                >
                  {isUploading ? '업로드 중...' : '업로드 시작'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 업로드 진행률 */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>업로드 진행률</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Day 그룹 결과 */}
        {dayGroups.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">생성된 여행 일정</h2>
              <Button
                onClick={() => {
                  setDayGroups([]);
                  setSelectedFiles([]);
                }}
                variant="outline"
                size="sm"
              >
                다시 선택
              </Button>
            </div>
            
            {dayGroups.map((day) => (
              <TimelineCard
                key={day.dayId}
                dayId={day.dayId}
                date={day.date}
                filesCount={day.files.length}
                onUpdateCard={(dayId, updates) => {
                  // Day 카드 업데이트 로직 (향후 구현)
                  console.log('Day', dayId, '업데이트:', updates);
                }}
              />
            ))}
            
            <Button
              onClick={() => setLocation('/timeline')}
              className="w-full travel-button"
              data-testid="complete-button"
            >
              타임라인 완성하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}