// 채팅 목록 단일 행 — 아바타(48px)+온라인dot+이름+국기+미읽뱃지+번역아이콘+마지막메시지+시간
import { Languages } from 'lucide-react';

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
  const timeStr = lastMessageAt ? formatTime(new Date(lastMessageAt)) : '';
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors active:opacity-70"
      style={{ borderBottom: '1px solid var(--stroke)' }}
    >
      {/* Avatar 48px + online dot */}
      <div className="relative shrink-0">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm overflow-hidden"
          style={{
            background: avatarUrl ? 'transparent' : 'var(--surface-2)',
            color: 'var(--accent-mint)',
            border: '2px solid var(--stroke)',
            ...(avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
          }}
        >
          {!avatarUrl && initials}
        </div>
        {/* Online dot */}
        <span
          className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
          style={{
            background: isOnline ? '#4ADE80' : 'var(--text-secondary)',
            border: '2px solid var(--app-bg)',
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + flag + time */}
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-semibold truncate"
              style={{ fontSize: 14, color: 'var(--text-primary)' }}
            >
              {name}
            </span>
            {flag && <span className="text-sm flex-shrink-0">{flag}</span>}
          </div>
          <span
            className="shrink-0 ml-2"
            style={{ fontSize: 12, color: 'var(--text-secondary)' }}
          >
            {timeStr}
          </span>
        </div>

        {/* Row 2: last message + unread badge + translation icon */}
        <div className="flex items-center gap-2">
          <p
            className="flex-1 truncate"
            style={{
              fontSize: 13,
              color: hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: hasUnread ? 500 : 400,
            }}
          >
            {lastMessage || '대화를 시작해보세요'}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasTranslation && (
              <Languages size={14} style={{ color: 'var(--accent-mint)' }} />
            )}
            {hasUnread && (
              <span
                className="rounded-full px-1.5 text-xs font-bold"
                style={{
                  background: 'var(--accent-mint)',
                  color: '#0A0B10',
                  minWidth: 20,
                  height: 20,
                  lineHeight: '20px',
                  textAlign: 'center',
                  display: 'inline-block',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
