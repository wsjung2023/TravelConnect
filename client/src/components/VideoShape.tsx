import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VideoShapeProps {
  src: string;
  shape?: 'heart' | 'cloud' | 'default';
  progress?: number;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onProgressUpdate?: (progress: number) => void;
}

export default function VideoShape({
  src,
  shape = 'default',
  progress: externalProgress,
  className = '',
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
  onProgressUpdate,
}: VideoShapeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalProgress, setInternalProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // 진행률 계산 (외부에서 제공된 값이 있으면 우선 사용)
  const currentProgress = externalProgress !== undefined ? externalProgress : internalProgress;

  // Throttled progress update (50ms)
  const throttledProgressUpdate = useCallback((progress: number) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= 50) {
      setInternalProgress(progress);
      onProgressUpdate?.(progress);
      lastUpdateRef.current = now;
    }
  }, [onProgressUpdate]);

  // 비디오 이벤트 핸들러
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        const progress = video.currentTime / video.duration;
        throttledProgressUpdate(progress);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setInternalProgress(0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [throttledProgressUpdate]);

  // 클릭 시 재생/일시정지 토글
  const handleClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  // SVG 원의 둘레 계산 (반지름 42%일 때)
  const radius = 42; // 42% of 100
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - currentProgress);

  return (
    <div 
      className={`video-shape ${shape} ${className}`}
      onClick={handleClick}
      data-testid={`video-shape-${shape}`}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        className="video-content"
      />
      
      {/* 재생 진행률 링 */}
      <svg className="progress-ring" viewBox="0 0 100 100">
        {/* 배경 원 */}
        <circle
          className="progress-ring-bg"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="3"
        />
        
        {/* 진행률 원 */}
        <circle
          className="progress-ring-fg"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#ff5a7a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          style={{
            transition: externalProgress !== undefined ? 'none' : 'stroke-dashoffset 0.1s ease-out'
          }}
        />
      </svg>

      {/* 재생/일시정지 오버레이 (호버 시 표시) */}
      <div className="play-overlay">
        <div className="play-icon">
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="9,4 20,12 9,20" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// ImageShape 컴포넌트 (이미지용)
interface ImageShapeProps {
  src: string;
  alt?: string;
  shape?: 'heart' | 'cloud' | 'default';
  className?: string;
}

export function ImageShape({
  src,
  alt = '',
  shape = 'default',
  className = ''
}: ImageShapeProps) {
  return (
    <div className={`video-shape ${shape} ${className}`} data-testid={`image-shape-${shape}`}>
      <img
        src={src}
        alt={alt}
        className="video-content"
      />
    </div>
  );
}