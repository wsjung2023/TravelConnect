// 채팅 목록 — 오늘/이번 주 섹션 헤더 + ChatListItem + 스켈레톤 + 빈 상태
import { MessageCircle } from 'lucide-react';
import ChatListItem, { type ChatListItemData } from './ChatListItem';

interface Props {
  items: ChatListItemData[];
  isLoading?: boolean;
}

/* ── Date grouping ── */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

interface Group {
  label: string;
  items: ChatListItemData[];
}

function groupItems(items: ChatListItemData[]): Group[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = todayStart - 6 * 86400_000;

  const today: ChatListItemData[] = [];
  const week: ChatListItemData[] = [];
  const older: ChatListItemData[] = [];

  for (const item of items) {
    const t = item.lastMessageAt ? new Date(item.lastMessageAt).getTime() : 0;
    if (t >= todayStart) today.push(item);
    else if (t >= weekStart) week.push(item);
    else older.push(item);
  }

  return [
    { label: '오늘', items: today },
    { label: '이번 주', items: week },
    { label: '이전', items: older },
  ].filter((g) => g.items.length > 0);
}

/* ── Skeleton row ── */
const SkeletonRow = () => (
  <div
    className="flex items-center gap-3 px-4 py-3 animate-pulse"
    style={{ borderBottom: '1px solid var(--stroke)' }}
  >
    <div className="rounded-full shrink-0" style={{ width: 48, height: 48, background: 'var(--surface-2)' }} />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 rounded" style={{ background: 'var(--surface-2)', width: '40%' }} />
      <div className="h-3 rounded" style={{ background: 'var(--surface-2)', width: '65%' }} />
    </div>
  </div>
);

/* ── Section header ── */
const SectionHeader = ({ label }: { label: string }) => (
  <div
    className="px-4 py-1.5"
    style={{ background: 'var(--surface-1)' }}
  >
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {label}
    </span>
  </div>
);

/* ── Empty state ── */
const EmptyState = () => (
  <div
    className="flex flex-col items-center justify-center gap-3 py-20"
    style={{ color: 'var(--text-secondary)' }}
  >
    <MessageCircle size={48} strokeWidth={1.2} />
    <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
      아직 대화가 없어요
    </p>
    <p className="text-sm">먼저 인사를 건네볼까요?</p>
  </div>
);

/* ── Main component ── */
export default function ChatList({ items, isLoading }: Props) {
  if (isLoading) {
    return (
      <div>
        {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  // Items without a date go to "older" bucket → still render
  const groups = groupItems(items);

  // If all items have no date, groupItems returns a single "이전" group — that's fine
  const showHeaders = groups.length > 1 || (groups.length === 1 && groups[0]!.label !== '이전');

  return (
    <div>
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
