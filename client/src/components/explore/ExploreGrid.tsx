// 탐색 탭 카드 목록 — 2열 그리드 레이아웃 (이미지+제목+위치)
import { Compass, Heart, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ExploreCardProps } from './ExploreCard';

interface Props {
  items: ExploreCardProps[];
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="overflow-hidden animate-pulse" style={{ borderRadius: 16, background: 'var(--surface-1)', border: '1px solid rgba(200,168,78,0.15)' }}>
    <div style={{ height: 130, background: 'var(--surface-2)' }} />
    <div className="p-2 space-y-1.5">
      <div className="h-3.5 rounded" style={{ background: 'var(--surface-2)', width: '75%' }} />
      <div className="h-3 rounded" style={{ background: 'var(--surface-2)', width: '50%' }} />
    </div>
  </div>
);

function GridCard({ item }: { item: ExploreCardProps }) {
  return (
    <div
      className="overflow-hidden cursor-pointer"
      style={{ borderRadius: 16, background: 'var(--surface-1)', border: '1px solid rgba(200,168,78,0.15)', boxShadow: '0 0 6px rgba(200,168,78,0.1)' }}
      onClick={item.onClick}
    >
      {/* Image */}
      <div className="relative" style={{ height: 130 }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
            <MapPin size={24} style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
        {item.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ background: 'rgba(17,19,26,0.82)', color: 'var(--text-primary)', backdropFilter: 'blur(6px)', fontSize: 10 }}>
            {item.category}
          </span>
        )}
        {typeof item.likesCount === 'number' && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Heart size={10} style={{ color: item.isLiked ? '#FF8A70' : '#fff' }} fill={item.isLiked ? '#FF8A70' : 'none'} />
            <span style={{ fontSize: 10, color: '#fff' }}>{item.likesCount}</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="truncate font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</p>
        {item.location && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={10} style={{ color: 'var(--accent-mint)' }} />
            <span className="truncate" style={{ fontSize: 11, color: 'var(--accent-mint)' }}>{item.location}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExploreGrid({ items, isLoading }: Props) {
  const { t } = useTranslation('ui');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-3 pt-3 pb-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20" style={{ color: 'var(--text-secondary)' }}>
        <Compass size={40} strokeWidth={1.5} />
        <p className="text-sm">{t('explore.emptyLoading')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-3 pt-3 pb-4">
      {items.map((item) => (
        <GridCard key={`${item.type ?? 'item'}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
