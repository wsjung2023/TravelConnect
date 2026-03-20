// 댓글 입력 폼 v3 — 일반 댓글 + 오퍼 모드, v3 토큰 + i18n
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddComment } from '@/features/comments/useAddComment';
import { DollarSign, Clock, X, Send, Reply } from 'lucide-react';

interface CommentFormProps {
  postId: number;
  parentId?: number | null;
  isOfferMode?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function CommentForm({
  postId,
  parentId = null,
  isOfferMode = false,
  onCancel,
  onSuccess,
}: CommentFormProps) {
  const { t } = useTranslation('ui');
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDuration, setOfferDuration] = useState('');
  const [offerDescription, setOfferDescription] = useState('');

  const add = useAddComment(postId);
  const canSend = text.trim().length > 0 && !add.isPending &&
    (!isOfferMode || offerPrice.length > 0);

  async function submit() {
    if (!canSend) return;
    await add.mutateAsync({
      content: text.trim(),
      parentId,
      isOffer: isOfferMode,
      offerPrice: isOfferMode && offerPrice ? parseInt(offerPrice) : null,
      offerDuration: isOfferMode && offerDuration ? offerDuration : null,
      offerDescription: isOfferMode && offerDescription ? offerDescription : null,
    });
    setText('');
    setOfferPrice('');
    setOfferDuration('');
    setOfferDescription('');
    onSuccess?.();
  }

  /* ── Offer mode ── */
  if (isOfferMode) {
    return (
      <div
        className="mx-4 mb-4 p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--accent-blue)', borderRadius: 16 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>
            <DollarSign size={14} /> {t('post.detail.offer.title')}
          </span>
          {onCancel && (
            <button onClick={onCancel} style={{ color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Service description */}
        <input
          placeholder={t('post.detail.offer.contentPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full mb-3"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--stroke)',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />

        {/* Price + duration row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="flex items-center gap-1 mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <DollarSign size={10} /> {t('post.detail.offer.priceLabel')}
            </label>
            <input
              type="number"
              placeholder="50"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--stroke)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-1 mb-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              <Clock size={10} /> {t('post.detail.offer.durationLabel')}
            </label>
            <input
              placeholder="2h"
              value={offerDuration}
              onChange={(e) => setOfferDuration(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--stroke)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Optional description */}
        <textarea
          placeholder={t('post.detail.offer.descriptionPlaceholder')}
          value={offerDescription}
          onChange={(e) => setOfferDescription(e.target.value)}
          rows={2}
          className="w-full mb-3"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--stroke)',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'none',
          }}
        />

        {/* Actions */}
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 rounded-full py-2 text-sm font-medium tg-btn-ghost"
            >
              {t('post.detail.offer.cancel')}
            </button>
          )}
          <button
            onClick={submit}
            disabled={!canSend}
            className="flex-1 rounded-full py-2 text-sm font-semibold"
            style={{ background: canSend ? 'var(--accent-blue)' : 'var(--surface-2)', color: canSend ? '#0A0B10' : 'var(--text-secondary)' }}
          >
            {add.isPending ? t('post.detail.offer.sending') : t('post.detail.offer.send')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Regular comment / reply ── */
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="sticky bottom-0 z-[1001] flex gap-2 px-3 py-2"
      style={{
        background: 'var(--app-bg)',
        borderTop: '1px solid var(--stroke)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {parentId && (
        <div
          className="flex items-center gap-1 rounded-full px-2"
          style={{ fontSize: 11, color: 'var(--accent-blue)', background: 'rgba(107,168,255,0.12)', flexShrink: 0 }}
        >
          <Reply size={11} />
          {t('post.detail.comments.replyBadge')}
          {onCancel && (
            <button onClick={onCancel} className="ml-1" style={{ color: 'var(--text-secondary)' }}>
              <X size={11} />
            </button>
          )}
        </div>
      )}
      <input
        className="flex-1"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--stroke)',
          borderRadius: 99,
          padding: '8px 14px',
          fontSize: 13,
          color: 'var(--text-primary)',
          outline: 'none',
        }}
        placeholder={parentId ? t('post.detail.comments.replyPlaceholder') : t('post.detail.comments.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !composing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="submit"
        disabled={!canSend}
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 36, height: 36,
          background: canSend ? 'var(--accent-mint)' : 'var(--surface-2)',
          color: canSend ? '#0A0B10' : 'var(--text-secondary)',
          opacity: add.isPending ? 0.6 : 1,
        }}
      >
        <Send size={15} />
      </button>
    </form>
  );
}
