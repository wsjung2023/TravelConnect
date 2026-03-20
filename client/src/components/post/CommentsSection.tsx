// 댓글 섹션 v3 — 오퍼 카드(blue border)와 일반 댓글을 v3 토큰으로 렌더링
import { useTranslation } from 'react-i18next';
import { MessageCircle, Clock, Reply } from 'lucide-react';
import { useComments } from '@/features/comments/useComments';
import { useUpdateOfferStatus } from '@/features/comments/useAddComment';

interface Comment {
  id: number | string;
  userId: string;
  content: string;
  parentId?: number | null;
  isOffer?: boolean;
  offerPrice?: number | null;
  offerDescription?: string | null;
  offerDuration?: string | null;
  offerStatus?: string | null;
  createdAt: string;
  author?: { nickname?: string };
  _optimistic?: boolean;
}

interface CommentsSectionProps {
  postId: number;
  postOwnerId?: string;
  currentUserId?: string | undefined;
  onReply?: ((parentId: number) => void) | undefined;
}

/* ── Offer card ── */
function OfferCard({ comment, isPostOwner, onAccept, onDecline }: {
  comment: Comment;
  isPostOwner: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation('ui');
  const authorName = comment.author?.nickname || `user_${comment.userId.slice(-4)}`;
  const initials = authorName.slice(0, 2).toUpperCase();

  return (
    <div
      className="mb-3 p-3"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--accent-blue)', borderRadius: 16 }}
    >
      {/* Guide row */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs"
          style={{ width: 32, height: 32, background: 'var(--surface-2)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{authorName}</span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{ fontSize: 10, fontWeight: 600, background: 'rgba(107,168,255,0.15)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}
            >
              {t('post.detail.offer.guideBadge')}
            </span>
            {comment.offerDuration && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                <Clock size={10} className="inline mr-0.5" />{comment.offerDuration}
              </span>
            )}
            <span
              className="rounded-full px-2 py-0.5"
              style={{ fontSize: 10, background: 'rgba(107,168,255,0.10)', color: 'var(--accent-blue)', border: '1px solid rgba(107,168,255,0.3)' }}
            >
              {t('post.detail.offer.specialOffer')}
            </span>
          </div>
        </div>
        {/* Status badge */}
        {comment.offerStatus === 'accepted' && (
          <span className="tg-chip" style={{ fontSize: 10, color: 'var(--accent-mint)', borderColor: 'var(--accent-mint)' }}>
            {t('post.detail.offer.accepted')}
          </span>
        )}
        {comment.offerStatus === 'declined' && (
          <span className="tg-chip" style={{ fontSize: 10, color: 'var(--accent-coral)', borderColor: 'var(--accent-coral)' }}>
            {t('post.detail.offer.declined')}
          </span>
        )}
        {comment.offerStatus === 'pending' && (
          <span className="tg-chip" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {t('post.detail.offer.pending')}
          </span>
        )}
      </div>

      {/* Price + description */}
      <div className="flex items-end justify-between gap-3">
        <div>
          {comment.offerPrice && (
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>
              ${comment.offerPrice}
            </span>
          )}
          {comment.content && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{comment.content}</p>
          )}
          {comment.offerDescription && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>{comment.offerDescription}</p>
          )}
        </div>

        {/* CTA */}
        {isPostOwner && comment.offerStatus === 'pending' ? (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onAccept}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--accent-mint)', color: '#0A0B10' }}
            >
              {t('post.detail.offer.accept')}
            </button>
            <button
              onClick={onDecline}
              className="rounded-full px-3 py-1.5 text-xs font-medium tg-btn-ghost"
            >
              {t('post.detail.offer.decline')}
            </button>
          </div>
        ) : (
          <button
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: 'var(--accent-coral)', color: '#fff' }}
          >
            {t('post.detail.offer.viewOffer')}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Regular comment item ── */
function CommentItem({ comment, replies, isPostOwner, currentUserId, onReply, onAcceptOffer, onDeclineOffer, depth = 0 }: {
  comment: Comment;
  replies: Comment[];
  isPostOwner: boolean;
  currentUserId?: string | undefined;
  onReply?: ((parentId: number) => void) | undefined;
  onAcceptOffer: (id: number) => void;
  onDeclineOffer: (id: number) => void;
  depth?: number;
}) {
  const { t } = useTranslation('ui');
  const authorName = comment.author?.nickname || `user_${comment.userId.slice(-4)}`;
  const initials = authorName.slice(0, 2).toUpperCase();

  if (comment.isOffer) {
    return (
      <div className={depth > 0 ? 'ml-8 pl-3' : ''} style={depth > 0 ? { borderLeft: '2px solid var(--stroke)' } : {}}>
        <OfferCard
          comment={comment}
          isPostOwner={isPostOwner}
          onAccept={() => onAcceptOffer(comment.id as number)}
          onDecline={() => onDeclineOffer(comment.id as number)}
        />
        {replies.map((r) => (
          <CommentItem key={r.id} comment={r} replies={[]} isPostOwner={isPostOwner}
            {...(currentUserId !== undefined ? { currentUserId } : {})}
            {...(onReply ? { onReply } : {})}
            onAcceptOffer={onAcceptOffer} onDeclineOffer={onDeclineOffer} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2.5 mb-3 ${depth > 0 ? 'ml-8 pl-3' : ''}`}
      style={depth > 0 ? { borderLeft: '2px solid var(--stroke)' } : {}}
    >
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs"
        style={{ width: 32, height: 32, background: 'var(--surface-2)', color: 'var(--accent-mint)', border: '1px solid var(--stroke)' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{authorName}</span>
          <span style={{ color: 'var(--text-primary)', marginLeft: 6 }}>{comment.content || ''}</span>
          {comment._optimistic && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>({t('post.detail.comments.sending')})</span>}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {comment.createdAt ? new Date(comment.createdAt).toLocaleString('ko-KR') : t('post.detail.timeAgo.justNow')}
          </span>
          {onReply && typeof comment.id === 'number' && depth === 0 && (
            <button
              onClick={() => onReply(comment.id as number)}
              className="flex items-center gap-1"
              style={{ fontSize: 11, color: 'var(--text-secondary)' }}
            >
              <Reply size={11} />{t('post.detail.comments.reply')}
            </button>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-2">
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} replies={[]} isPostOwner={isPostOwner}
              {...(currentUserId !== undefined ? { currentUserId } : {})}
              {...(onReply ? { onReply } : {})}
              onAcceptOffer={onAcceptOffer} onDeclineOffer={onDeclineOffer} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main export ── */
export default function CommentsSection({ postId, postOwnerId, currentUserId, onReply }: CommentsSectionProps) {
  const { t } = useTranslation('ui');
  const { data: comments, isLoading } = useComments(postId);
  const updateStatus = useUpdateOfferStatus();

  const safeComments: Comment[] = Array.isArray(comments) ? comments : [];
  const rootComments = safeComments.filter((c) => !c.parentId);
  const repliesMap = safeComments.reduce((acc: Record<number, Comment[]>, c) => {
    if (c.parentId != null) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId]!.push(c);
    }
    return acc;
  }, {});

  const isPostOwner = currentUserId === postOwnerId;

  if (isLoading) {
    return <div className="py-4 text-center" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('post.detail.comments.loading')}</div>;
  }

  if (safeComments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--text-secondary)' }}>
        <MessageCircle size={32} strokeWidth={1.5} />
        <p style={{ fontSize: 13 }}>{t('post.detail.comments.empty')}</p>
      </div>
    );
  }

  return (
    <div className="pb-2">
      {rootComments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          replies={repliesMap[c.id as number] || []}
          isPostOwner={isPostOwner}
          currentUserId={currentUserId}
          onReply={onReply}
          onAcceptOffer={(id) => updateStatus.mutate({ commentId: id, status: 'accepted' })}
          onDeclineOffer={(id) => updateStatus.mutate({ commentId: id, status: 'declined' })}
        />
      ))}
    </div>
  );
}
