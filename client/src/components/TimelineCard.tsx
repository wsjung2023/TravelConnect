import { useState } from 'react';
import { Calendar, Camera, MapPin, Heart, Cloud, Edit3, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TimelineCardProps {
  dayId: number;
  date: string;
  filesCount: number;
  comment?: string;
  shape?: 'heart' | 'cloud';
  onUpdateCard?: (dayId: number, updates: { comment?: string; shape?: 'heart' | 'cloud' }) => void;
  isEditable?: boolean;
}

export function TimelineCard({ 
  dayId, 
  date, 
  filesCount,
  comment = '',
  shape = 'heart',
  onUpdateCard,
  isEditable = true
}: TimelineCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempComment, setTempComment] = useState(comment);
  const [tempShape, setTempShape] = useState<'heart' | 'cloud'>(shape);

  // 날짜 포맷터
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  // 편집 시작
  const startEdit = () => {
    setIsEditing(true);
    setTempComment(comment);
    setTempShape(shape);
  };

  // 편집 취소
  const cancelEdit = () => {
    setIsEditing(false);
    setTempComment(comment);
    setTempShape(shape);
  };

  // 편집 저장
  const saveEdit = () => {
    onUpdateCard?.(dayId, {
      comment: tempComment,
      shape: tempShape
    });
    setIsEditing(false);
  };

  // 도형 선택 핸들러
  const selectShape = (selectedShape: 'heart' | 'cloud') => {
    if (isEditing) {
      setTempShape(selectedShape);
    } else {
      onUpdateCard?.(dayId, { shape: selectedShape });
    }
  };

  const currentShape = isEditing ? tempShape : shape;
  const currentComment = isEditing ? tempComment : comment;

  return (
    <div 
      className="travel-card p-4 space-y-4" 
      data-testid={`timeline-card-${dayId}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Day 번호 */}
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
              {dayId}
            </div>
            
            {/* 도형 장식 */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border">
              {currentShape === 'heart' ? (
                <Heart size={12} className="text-red-400 fill-current" />
              ) : (
                <Cloud size={12} className="text-blue-400" />
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold">Day {dayId}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar size={14} />
              <span>{formatDate(date)}</span>
            </div>
          </div>
        </div>

        {/* 편집 버튼 */}
        {isEditable && !isEditing && (
          <Button
            onClick={startEdit}
            variant="ghost"
            size="sm"
            className="p-1"
            data-testid={`edit-card-${dayId}`}
          >
            <Edit3 size={16} />
          </Button>
        )}

        {/* 편집 모드 버튼들 */}
        {isEditing && (
          <div className="flex items-center gap-1">
            <Button
              onClick={saveEdit}
              variant="ghost"
              size="sm"
              className="p-1 text-green-600"
              data-testid={`save-card-${dayId}`}
            >
              <Check size={16} />
            </Button>
            <Button
              onClick={cancelEdit}
              variant="ghost"
              size="sm"
              className="p-1 text-red-600"
              data-testid={`cancel-card-${dayId}`}
            >
              <X size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* 도형 선택 */}
      {isEditable && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">여행 스타일</p>
          <div className="flex gap-3">
            <button
              onClick={() => selectShape('heart')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                currentShape === 'heart' 
                  ? 'border-red-400 bg-red-50 text-red-600' 
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-red-300'
              }`}
              data-testid={`shape-heart-${dayId}`}
            >
              <Heart size={16} className={currentShape === 'heart' ? 'fill-current' : ''} />
              <span className="text-sm">로맨틱</span>
            </button>
            
            <button
              onClick={() => selectShape('cloud')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                currentShape === 'cloud' 
                  ? 'border-blue-400 bg-blue-50 text-blue-600' 
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300'
              }`}
              data-testid={`shape-cloud-${dayId}`}
            >
              <Cloud size={16} />
              <span className="text-sm">자유로운</span>
            </button>
          </div>
        </div>
      )}

      {/* 코멘트 입력/표시 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">한 줄 기록</p>
        {isEditing ? (
          <Input
            value={tempComment}
            onChange={(e) => setTempComment(e.target.value)}
            placeholder="오늘 하루를 한 줄로 표현해보세요..."
            className="text-sm"
            maxLength={100}
            data-testid={`comment-input-${dayId}`}
          />
        ) : (
          <div className="min-h-[40px] px-3 py-2 bg-gray-50 rounded-md border">
            {currentComment ? (
              <p className="text-sm text-gray-800">{currentComment}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">아직 기록이 없습니다</p>
            )}
          </div>
        )}
      </div>

      {/* 사진 정보 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Camera size={14} />
          <span>{filesCount}개 사진</span>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          Day {dayId}
        </Badge>
      </div>

      {/* 미리보기 영역 (placeholder) */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: Math.min(4, filesCount) }).map((_, index) => (
          <div
            key={index}
            className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
          >
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
              <Camera size={16} className="text-gray-400" />
            </div>
          </div>
        ))}
        {filesCount > 4 && (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">
            +{filesCount - 4}
          </div>
        )}
      </div>
    </div>
  );
}