// 이미지 폴백 — 이미지 로드 실패 시 대체 이미지나 플레이스홀더를 보여주는 컴포넌트.
import React from 'react';

interface ImageFallbackProps {
  shape?: string | undefined;
  isVideo?: boolean;
  className?: string;
}

export const ImageFallback: React.FC<ImageFallbackProps> = ({ 
  shape, 
  isVideo = false, 
  className = "w-full h-64 bg-gradient-to-br flex items-center justify-center" 
}) => {
  const getShapeIcon = (shapeType?: string) => {
    switch (shapeType) {
      case 'heart': return '💖';
      case 'cloud': return '☁️';
      case 'wave': return '🌊';
      case 'polaroid': return '📸';
      default: return isVideo ? '🎥' : '📷';
    }
  };

  const getBackgroundColors = () => {
    if (isVideo) {
      return 'from-purple-200 to-blue-200';
    }
    return 'from-teal-200 to-pink-200';
  };

  return (
    <div className={`${className} ${getBackgroundColors()}`}>
      <span className="text-white text-3xl">
        {getShapeIcon(shape)}
      </span>
    </div>
  );
};