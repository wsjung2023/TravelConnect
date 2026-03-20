// 탐색 탭 개별 카드 — 200px 이미지 오버레이 + 카테고리 칩 + 좋아요 + 제목/부제/거리
import type { MouseEvent } from 'react';
import { Heart, Bookmark, MapPin } from 'lucide-react';

export interface ExploreCardProps {
  id: number;
  type?: 'post' | 'experience';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  location?: string;
  category?: string;
  isLiked?: boolean;
  likesCount?: number;
  isSaved?: boolean;
  onLike?: (e: MouseEvent) => void;
  onSave?: (e: MouseEvent) => void;
  onClick?: () => void;
}

export default function ExploreCard({
  title,
  subtitle,
  imageUrl,
  location,
  category,
  isLiked,
  likesCount,
  isSaved,
  onLike,
  onSave,
  onClick,
}: ExploreCardProps) {
  return (
    <div
      className="tg-surface mx-4 mb-3 overflow-hidden cursor-pointer"
      style={{ borderRadius: 'var(--radius-card)' }}
      onClick={onClick}
    >
      {/* Image area */}
      <div className="relative" style={{ height: 200 }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}
          >
            <MapPin size={32} style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}

        {/* Bottom overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)',
          }}
        />

        {/* Category chip — top-left */}
        {category && (
          <span
            className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'rgba(17,19,26,0.82)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {category}
          </span>
        )}

        {/* Like button — top-right */}
        <button
          className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full"
          style={{
            background: 'rgba(17,19,26,0.72)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={onLike}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={15}
            style={{ color: isLiked ? '#FF8A70' : 'var(--text-primary)' }}
            fill={isLiked ? '#FF8A70' : 'none'}
          />
        </button>
      </div>

      {/* Below-image content */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold truncate"
              style={{ fontSize: 16, color: 'var(--text-primary)' }}
            >
              {title}
            </p>
            {subtitle && (
              <p
                className="mt-0.5 line-clamp-2"
                style={{ fontSize: 13, color: 'var(--text-secondary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Save button */}
          {onSave && (
            <button
              onClick={onSave}
              className="shrink-0 mt-0.5"
              aria-label={isSaved ? 'Unsave' : 'Save'}
            >
              <Bookmark
                size={18}
                style={{ color: isSaved ? 'var(--accent-mint)' : 'var(--text-secondary)' }}
                fill={isSaved ? 'var(--accent-mint)' : 'none'}
              />
            </button>
          )}
        </div>

        {/* Distance / location pill */}
        {location && (
          <div className="flex items-center gap-1 mt-2">
            <MapPin size={12} style={{ color: 'var(--accent-mint)' }} />
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                background: 'rgba(124,231,214,0.08)',
                color: 'var(--accent-mint)',
              }}
            >
              {location}
            </span>
          </div>
        )}

        {/* Likes row */}
        {typeof likesCount === 'number' && (
          <div className="flex items-center gap-1 mt-1.5">
            <Heart size={12} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{likesCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
