// 만나기 유저 카드 목록 — UserCard 수직 스크롤 + 스켈레톤/빈 상태
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserCard from './UserCard';

interface Props {
  users: any[];
  isLoading?: boolean;
  onHello: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

const SkeletonCard = () => (
  <div
    className="mx-4 mb-3 p-3 animate-pulse"
    style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--stroke)',
      borderRadius: 20,
    }}
  >
    <div className="flex items-center gap-3">
      <div className="rounded-full shrink-0" style={{ width: 52, height: 52, background: 'var(--surface-2)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded" style={{ background: 'var(--surface-2)', width: '45%' }} />
        <div className="h-3 rounded" style={{ background: 'var(--surface-2)', width: '30%' }} />
        <div className="h-3 rounded" style={{ background: 'var(--surface-2)', width: '60%' }} />
      </div>
      <div className="rounded-full shrink-0" style={{ width: 72, height: 28, background: 'var(--surface-2)' }} />
    </div>
  </div>
);

export default function MeetUserList({ users, isLoading, onHello, onViewProfile }: Props) {
  const { t } = useTranslation('ui');
  if (isLoading) {
    return (
      <div className="pt-2">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-12"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Users size={40} strokeWidth={1.5} />
        <p className="text-sm">{t('meet.empty.noUsers')}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {t('meet.empty.openToMeetHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-4">
      {users.map((user: any) => (
        <UserCard
          key={user.id}
          user={user}
          onHello={() => onHello(user.id)}
          onViewProfile={onViewProfile ? () => onViewProfile(user.id) : undefined}
        />
      ))}
    </div>
  );
}
