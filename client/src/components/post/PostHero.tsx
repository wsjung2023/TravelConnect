// 포스트 상세 히어로 — 전체너비 여행 사진 300px + 뒤로가기/저장/공유 오버레이 + 캐러셀
import { ChevronLeft, ChevronRight, Bookmark, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageFallback } from '@/components/ImageFallback';

interface MediaItem { type: 'image' | 'video'; src: string; }

interface Props {
  media: MediaItem[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onIndexChange: (i: number) => void;
  isSaved: boolean;
  onSave?: () => void;
  onShare?: () => void;
  onBack: () => void;
  failedMedia: Set<string>;
  onMediaError: (src: string) => void;
}

const CTRL_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.12)',
};

export default function PostHero({
  media, currentIndex, onPrev, onNext, onIndexChange,
  isSaved, onSave, onShare, onBack, failedMedia, onMediaError,
}: Props) {
  const { t } = useTranslation('ui');
  const current = media[currentIndex];

  return (
    <div className="relative flex-shrink-0" style={{ height: 300, overflow: 'hidden', background: 'var(--surface-2)' }}>
      {/* Media */}
      {current ? (
        current.type === 'image' ? (
          current.src.startsWith('dummy_') || failedMedia.has(current.src) ? (
            <ImageFallback className="w-full h-full object-cover" />
          ) : (
            <img src={current.src} alt="" className="w-full h-full object-cover" onError={() => onMediaError(current.src)} />
          )
        ) : failedMedia.has(current.src) ? (
          <ImageFallback isVideo className="w-full h-full object-cover" />
        ) : (
          <video src={current.src} className="w-full h-full object-cover" muted autoPlay loop onError={() => onMediaError(current.src)} />
        )
      ) : (
        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a2340 0%, #0d1520 100%)' }} />
      )}

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: '55%', background: 'linear-gradient(to top, rgba(10,11,16,0.9) 0%, transparent 100%)' }} />

      {/* Top controls */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-3 pt-4">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={CTRL_STYLE}
          aria-label={t('post.detail.back')}
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center justify-center w-9 h-9 rounded-full"
              style={CTRL_STYLE}
              aria-label={isSaved ? t('post.detail.saved') : t('post.detail.save')}
              data-testid="btn-save"
            >
              <Bookmark
                size={16}
                color={isSaved ? 'var(--accent-gold)' : '#fff'}
                fill={isSaved ? 'var(--accent-gold)' : 'none'}
              />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center justify-center w-9 h-9 rounded-full"
              style={CTRL_STYLE}
              aria-label={t('post.detail.share')}
              data-testid="btn-share"
            >
              <Share2 size={16} color="#fff" />
            </button>
          )}
        </div>
      </div>

      {/* Carousel navigation */}
      {media.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full"
              style={CTRL_STYLE}
            >
              <ChevronLeft size={16} color="#fff" />
            </button>
          )}
          {currentIndex < media.length - 1 && (
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full"
              style={CTRL_STYLE}
            >
              <ChevronRight size={16} color="#fff" />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => onIndexChange(i)}
                className="rounded-full transition-all"
                style={{ width: i === currentIndex ? 16 : 6, height: 6, background: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.45)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
