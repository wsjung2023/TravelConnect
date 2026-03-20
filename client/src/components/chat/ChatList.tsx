// 채팅 목록 — 상단 상태 카드 + 섹션 헤더 + ChatListItem + 스켈레톤 + 빈 상태
import { MessageCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ChatListItem, { type ChatListItemData } from './ChatListItem';

interface Props {
  items: ChatListItemData[];
  isLoading?: boolean;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

interface Group {
  label: string;
  items: ChatListItemData[];
}

function groupItems(items: ChatListItemData[], labelToday: string, labelWeek: string, labelOlder: string): Group[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = todayStart - 6 * 86400_000;

  const today: ChatListItemData[] = [];
  const week: ChatListItemData[] = [];
  const older: ChatListItemData[] = [];

  for (const item of items) {
    const ts = item.lastMessageAt ? new Date(item.lastMessageAt).getTime() : 0;
    if (ts >= todayStart) today.push(item);
    else if (ts >= weekStart) week.push(item);
    else older.push(item);
  }

  return [
    { label: labelToday, items: today },
    { label: labelWeek, items: week },
    { label: labelOlder, items: older },
  ].filter((g) => g.items.length > 0);
}

const SkeletonRow = () => (
  <div
    className="flex items-center gap-3 px-4 py-3 animate-pulse"
    style={{ borderBottom: '1px solid var(--stroke)' }}
  >
    <div className="rounded-full shrink-0" style={{ width: 56, height: 56, background: 'var(--surface-2)' }} />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 rounded" style={{ background: 'var(--surface-2)', width: '40%' }} />
      <div className="h-3 rounded" style={{ background: 'var(--surface-2)', width: '65%' }} />
    </div>
  </div>
);

const SectionHeader = ({ label }: { label: string }) => (
  <div className="px-4 py-2" style={{ background: 'var(--surface-1)' }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {label}
    </span>
  </div>
);

function InboxSummary({ count }: { count: number }) {
  const { t } = useTranslation('ui');
  return (
    <div
      className="mx-4 mt-3 mb-2 rounded-[24px] p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(25,28,36,0.96), rgba(18,20,28,0.98))',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p style={{ color: 'var(--accent-gold)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>{t('chat.summary.eyebrow')}</p>
          <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
            {t('chat.summary.title')}
          </p>
        </div>
        <div className="rounded-full p-2 shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-mint)' }}>
          <Sparkles size={15} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('chat.summary.activeThreads', { count })}</span>
        <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('chat.summary.translationOnDemand')}</span>
        <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('chat.summary.replyFaster')}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation('ui');
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-20"
      style={{ color: 'var(--text-secondary)' }}
    >
      <MessageCircle size={48} strokeWidth={1.2} />
      <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
        {t('chat.empty.title')}
      </p>
      <p className="text-sm">{t('chat.empty.hint')}</p>
    </div>
  );
}

export default function ChatList({ items, isLoading }: Props) {
  const { t } = useTranslation('ui');
  if (isLoading) {
    return (
      <div>
        <InboxSummary count={0} />
        {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <InboxSummary count={0} />
        <EmptyState />
      </div>
    );
  }

  const olderLabel = t('chat.group.older');
  const groups = groupItems(items, t('chat.group.today'), t('chat.group.thisWeek'), olderLabel);
  const showHeaders = groups.length > 1 || (groups.length === 1 && groups[0]!.label !== olderLabel);

  return (
    <div>
      <InboxSummary count={items.length} />
      {groups.map((group) => (
        <div key={group.label}>
          {showHeaders && <SectionHeader label={group.label} />}
          {group.items.map((item) => (
            <ChatListItem key={`${item.type}-${item.id}`} {...item} />
          ))}
        </div>
      ))}
    </div>
  );
}
