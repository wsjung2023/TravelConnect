// MapTopBar — floating premium overlay: city label, frosted search, bell, filter chips.
import type { CSSProperties, ReactNode } from 'react';
import { MapPin, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FILTER_CHIPS = [
  { id: 'nearby', key: 'feedMode.nearby' },
  { id: 'stories', key: 'navigation.timeline' },
  { id: 'meet', key: 'navigation.meet' },
  { id: 'food', key: 'labels.food' },
  { id: 'photo', key: 'labels.photography' },
] as const;
export type MapFilter = (typeof FILTER_CHIPS)[number]['id'];

interface Props {
  city?: string;
  activeFilter: MapFilter;
  onFilterChange: (f: MapFilter) => void;
  onSearchClick?: () => void;
  bellNode?: ReactNode;
}

export default function MapTopBar({ city, activeFilter, onFilterChange, onSearchClick, bellNode }: Props) {
  const { t } = useTranslation('ui');
  const resolvedCity = city || t('labels.location');

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
      style={{
        background: 'linear-gradient(to bottom, rgba(7,9,13,0.92) 0%, rgba(7,9,13,0.46) 48%, transparent 100%)',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
      }}
    >
      <div className="flex items-center gap-3 px-4 pt-2 pb-3 pointer-events-auto">
        <div className="shrink-0" style={{ minWidth: 96 }}>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <MapPin size={15} color="var(--accent-gold)" />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{resolvedCity}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
            {t('map.topbar.subtitle')}
          </p>
        </div>

        <div
          className="tg-glass-strong flex flex-1 items-center gap-2 rounded-full px-4 py-2.5 cursor-pointer"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={onSearchClick}
          role="button"
          aria-label={t('map.searchPlaceholder')}
        >
          <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span className="truncate" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('map.searchPlaceholder')}
          </span>
        </div>

        <div className="shrink-0">
          {bellNode ?? (
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full tg-glass-strong"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
              aria-label={t('navigation.chat')}
            />
          )}
        </div>
      </div>

      <div
        className="flex gap-2 px-4 pb-3 overflow-x-auto pointer-events-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => onFilterChange(chip.id)}
              className={active ? 'tg-chip tg-chip-active' : 'tg-chip'}
              style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '8px 15px', fontSize: 12, fontWeight: active ? 600 : 500 }}
            >
              {t(chip.key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
