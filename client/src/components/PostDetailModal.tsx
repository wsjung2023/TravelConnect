// 게시글 상세 모달 v3 — 히어로 + 작성자 + 반응 + 본문 + 지도 + 댓글 (기존 로직 유지)
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useTranslation } from 'react-i18next';
import type { Post } from '@shared/schema';
import PostHero from '@/components/post/PostHero';
import PostAuthorRow from '@/components/post/PostAuthorRow';
import PostReactions from '@/components/post/PostReactions';
import PostMapThumb from '@/components/post/PostMapThumb';
import CommentForm from '@/components/post/CommentForm';
import CommentsSection from '@/components/post/CommentsSection';

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onLike: (postId: number) => void;
  isLiked: boolean;
  onSave?: (postId: number) => void;
  isSaved?: boolean;
  onShare?: (post: Post) => void;
}

export default function PostDetailModal({
  post, isOpen, onClose, onLike, isLiked, onSave, isSaved = false, onShare,
}: PostDetailModalProps) {
  const { t } = useTranslation('ui');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [failedMedia, setFailedMedia] = useState(new Set<string>());

  if (!isOpen) return null;

  const formatTime = (date: Date): string => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return t('post.detail.timeAgo.justNow');
    if (mins < 60) return t('post.detail.timeAgo.mins', { count: mins });
    if (hours < 24) return t('post.detail.timeAgo.hours', { count: hours });
    return t('post.detail.timeAgo.days', { count: days });
  };

  const allMedia = [
    ...(post.images || []).map((src) => ({ type: 'image' as const, src })),
    ...(post.videos || []).map((src) => ({ type: 'video' as const, src })),
  ];

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div style={{ background: 'var(--app-bg)', minHeight: '100%' }}>

        {/* Hero image with controls */}
        <PostHero
          media={allMedia}
          currentIndex={currentMediaIndex}
          onPrev={() => setCurrentMediaIndex((i) => Math.max(0, i - 1))}
          onNext={() => setCurrentMediaIndex((i) => Math.min(allMedia.length - 1, i + 1))}
          onIndexChange={setCurrentMediaIndex}
          isSaved={isSaved}
          onSave={onSave ? () => onSave(post.id) : undefined}
          onShare={onShare ? () => onShare(post) : undefined}
          onBack={onClose}
          failedMedia={failedMedia}
          onMediaError={(src) => setFailedMedia((prev) => new Set(prev).add(src))}
        />

        {/* Author row */}
        <PostAuthorRow
          userId={post.userId}
          location={post.location}
          timeAgo={post.createdAt ? formatTime(post.createdAt) : t('post.detail.timeAgo.justNow')}
          isOwnPost={false}
        />

        {/* Reactions bar */}
        <PostReactions
          likesCount={post.likesCount || 0}
          commentsCount={post.commentsCount || 0}
          isLiked={isLiked}
          isSaved={isSaved}
          onLike={() => onLike(post.id)}
          onSave={onSave ? () => onSave(post.id) : undefined}
          onShare={onShare ? () => onShare(post) : undefined}
        />

        {/* Post body */}
        <div className="px-4 py-4">
          {post.title && (
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
              {post.title}
            </h2>
          )}
          {post.content && (
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.75 }}>
              {post.content}
            </p>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map((tag, i) => (
                <span
                  key={i}
                  className="tg-chip tg-chip-active"
                  style={{ fontSize: 12, padding: '3px 10px' }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Map thumbnail */}
        <PostMapThumb location={post.location} />

        {/* Comments header */}
        <div className="px-4 pb-2">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {t('post.detail.comments.title')}
          </p>
          <CommentsSection postId={post.id} />
        </div>

        {/* Comment input — sticky at bottom */}
        <CommentForm postId={post.id} />
      </div>
    </Modal>
  );
}
