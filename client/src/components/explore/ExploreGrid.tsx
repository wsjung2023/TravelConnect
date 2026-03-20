// 탐색 탭 카드 목록 — ExploreCard 수직 스크롤 + 로딩/빈 상태
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ExploreCard, { type ExploreCardProps } from './ExploreCard';

interface Props {
  items: ExploreCardProps[];
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div
    className="mx-4 mb-3 overflow-hidden animate-pulse"
    style={{
      borderRadius: 'var(--radius-card)',
      background: 'var(--surface-1)',
      border: '1px solid var(--stroke)',
    }}
  >
    <div style={{ height: 200, background: 'var(--surface-2)' }} />
    <div className="px-4 py-3 space-y-2">
      <div className="h-4 rounded" style={{ background: 'var(--surface-2)', width: '70%' }} />
      <div className="h-3 rounded" style={{ background: 'var(--surface-2)', width: '50%' }} />
    </div>
  </div>
);

export default function ExploreGrid({ items, isLoading }: Props) {
  const { t } = useTranslation('ui');
  if (isLoading) {
    return (
      <div className="pt-2">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Compass size={40} strokeWidth={1.5} />
        <p className="text-sm">{t('explore.emptyLoading')}</p>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-4">
      {items.map((item) => (
        <ExploreCard key={`${item.type ?? 'item'}-${item.id}`} {...item} />
      ))}
    </div>
  );
}
