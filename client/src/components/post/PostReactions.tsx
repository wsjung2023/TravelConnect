// 포스트 반응 행 — ♥ 좋아요 / 💬 댓글 / 🔖 저장 / 공유 / DM 아이콘 행
import { Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onDm?: () => void;
}

export default function PostReactions({ likesCount, commentsCount, isLiked, isSaved, onLike, onSave, onShare, onDm }: Props) {
  const { t } = useTranslation('ui');

  return (
    <div
      className="flex items-center gap-5 px-4 py-3"
      style={{ borderBottom: '1px solid var(--stroke)' }}
    >
      {/* Like */}
      <button
        onClick={onLike}
        className="flex items-center gap-1.5"
        style={{ color: isLiked ? 'var(--accent-coral)' : 'var(--text-secondary)' }}
        aria-label={t('post.detail.like')}
        data-testid="btn-like"
      >
        <Heart size={20} fill={isLiked ? 'var(--accent-coral)' : 'none'} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{likesCount.toLocaleString()}</span>
      </button>

      {/* Comment count */}
      <button
        className="flex items-center gap-1.5"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={t('post.detail.comment')}
        data-testid="btn-comment"
      >
        <MessageCircle size={20} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{commentsCount.toLocaleString()}</span>
      </button>

      {/* Save */}
      {onSave && (
        <button
          onClick={onSave}
          style={{ color: isSaved ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
          aria-label={isSaved ? t('post.detail.saved') : t('post.detail.save')}
        >
          <Bookmark size={20} fill={isSaved ? 'var(--accent-gold)' : 'none'} />
        </button>
      )}

      {/* Share */}
      {onShare && (
        <button
          onClick={onShare}
          style={{ color: 'var(--text-secondary)' }}
          aria-label={t('post.detail.share')}
        >
          <Share2 size={20} />
        </button>
      )}

      {/* DM — pushed to right */}
      {onDm && (
        <button
          onClick={onDm}
          className="ml-auto rounded-full px-3 py-1 text-xs font-medium"
          style={{ border: '1px solid var(--stroke)', color: 'var(--text-secondary)' }}
          aria-label="DM"
        >
          DM
        </button>
      )}
    </div>
  );
}
