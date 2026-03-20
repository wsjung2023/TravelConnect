// 채팅 목록 단일 행 — richer card row with translation and unread emphasis
import { Globe, MessageCircleMore } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ChatListItemData {
  id: string;
  type: 'conversation' | 'channel';
  name: string;
  avatarUrl?: string | null;
  initials: string;
  flag?: string;
  lastMessage?: string;
  lastMessageAt?: Date | null;
  unreadCount?: number;
  hasTranslation?: boolean;
  isOnline?: boolean;
  onClick: () => void;
}

function formatTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d.getTime() === today.getTime()) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const diff = today.getTime() - d.getTime();
  if (diff < 7 * 86400_000) {
    return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] ?? '';
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ChatListItem({
  name, avatarUrl, initials, flag, lastMessage,
  lastMessageAt, unreadCount = 0, hasTranslation, isOnline = true, onClick,
}: ChatListItemData) {
  const { t } = useTranslation('ui');
  const timeStr = lastMessageAt ? formatTime(new Date(lastMessageAt)) : '';
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-2 text-left transition-transform active:scale-[0.995]"
    >
      <div
        className="flex items-center gap-3 rounded-[22px] px-3.5 py-3"
        style={{
          border: '1px solid rgba(255,255,255,0.07)',
          background: hasUnread
            ? 'linear-gradient(180deg, rgba(31,28,33,0.96), rgba(18,20,28,0.98))'
            : 'linear-gradient(180deg, rgba(24,27,35,0.94), rgba(18,20,28,0.98))',
          boxShadow: hasUnread ? '0 10px 20px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        <div className="relative shrink-0">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center font-semibold text-sm overflow-hidden"
            style={{
              background: avatarUrl ? 'transparent' : 'var(--surface-2)',
              color: 'var(--accent-mint)',
              border: `2px solid ${hasUnread ? 'var(--accent-gold)' : 'rgba(255,255,255,0.16)'}`,
              ...(avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
            }}
          >
            {!avatarUrl && initials}
          </div>
          <span
            className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full"
            style={{
              background: isOnline ? 'var(--accent-mint)' : 'var(--text-secondary)',
              border: '2px solid var(--app-bg)',
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {name}
                </span>
                {flag && <span className="text-sm flex-shrink-0">{flag}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {hasTranslation && (
                  <span className="tg-chip" style={{ fontSize: 10, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Globe size={11} />
                    {t('chat.item.translation')}
                  </span>
                )}
                {isOnline && (
                  <span className="tg-chip" style={{ fontSize: 10, padding: '4px 8px' }}>{t('chat.item.onlineNow')}</span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeStr}</span>
              {hasUnread && (
                <div className="mt-2 flex justify-end">
                  <span
                    className="rounded-full px-1.5 text-xs font-bold"
                    style={{
                      background: 'var(--accent-coral)',
                      color: '#fff',
                      minWidth: 22,
                      height: 22,
                      lineHeight: '22px',
                      textAlign: 'center',
                      display: 'inline-block',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: hasUnread ? 'var(--accent-gold)' : 'var(--text-secondary)' }}>
              <MessageCircleMore size={14} />
            </div>
            <p
              className="flex-1 truncate"
              style={{
                fontSize: 13,
                color: hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: hasUnread ? 500 : 400,
              }}
            >
              {lastMessage || t('chat.item.fallbackMessage')}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
