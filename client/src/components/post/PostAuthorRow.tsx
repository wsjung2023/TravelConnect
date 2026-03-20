// 포스트 작성자 행 — 아바타 40px + 이름 + 위치핀 + 시간 + 팔로우 버튼
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  userId: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  location?: string | null;
  timeAgo: string;
  isOwnPost?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
}

export default function PostAuthorRow({
  userId, authorName, authorAvatar, location, timeAgo, isOwnPost, isFollowing, onFollow,
}: Props) {
  const { t } = useTranslation('ui');
  const displayName = authorName || userId.slice(0, 14);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar 40px */}
      <div
        className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-sm"
        style={{ width: 40, height: 40, background: 'var(--surface-2)', color: 'var(--accent-mint)', border: '2px solid var(--stroke)' }}
      >
        {authorAvatar ? (
          <img src={authorAvatar} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Name + location + time */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }} className="truncate">
          {displayName}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {location && (
            <>
              <MapPin size={11} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }} className="truncate">{location}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>·</span>
            </>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{timeAgo}</span>
        </div>
      </div>

      {/* Follow / own profile: nothing */}
      {!isOwnPost && (
        <button
          onClick={onFollow}
          className="flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
          style={
            isFollowing
              ? { border: '1px solid var(--stroke)', color: 'var(--text-secondary)', background: 'transparent' }
              : { border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', background: 'transparent' }
          }
        >
          {isFollowing ? t('post.detail.following') : t('post.detail.follow')}
        </button>
      )}
    </div>
  );
}
