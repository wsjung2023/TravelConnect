// MapTopBar — floating overlay over the map: city label + search pill + bell + filter chips
import type { CSSProperties } from 'react';
import { Bell, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FILTER_CHIPS = ['Nearby', 'Stories', 'Meet', 'Food', 'Photo'] as const;
export type MapFilter = typeof FILTER_CHIPS[number];

interface Props {
  city?: string;
  activeFilter: MapFilter;
  onFilterChange: (f: MapFilter) => void;
}

export default function MapTopBar({ city = '서울 강남구', activeFilter, onFilterChange }: Props) {
  const { t } = useTranslation('ui');
  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
      style={{ background: 'linear-gradient(to bottom, rgba(10,11,16,0.92) 0%, transparent 100%)' }}
    >
      {/* Main row: city | search pill | bell */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 pointer-events-auto">
        <span
          className="shrink-0 font-semibold"
          style={{ fontSize: 16, color: 'var(--text-primary)' }}
        >
          {city}
        </span>

        <div
          className="tg-glass flex flex-1 items-center gap-2 rounded-full px-3 py-2 cursor-pointer"
          style={{ border: '1px solid var(--stroke)' }}
        >
          <Search size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
            {t('map.searchPlaceholder')}
          </span>
        </div>

        <button
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full tg-glass"
          style={{ border: '1px solid var(--stroke)' }}
          aria-label="Notifications"
        >
          <Bell size={17} style={{ color: 'var(--text-primary)' }} />
        </button>
      </div>

      {/* Filter chips: horizontal scroll, no scrollbar */}
      <div
        className="flex gap-2 px-4 pb-3 overflow-x-auto pointer-events-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
      >
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onFilterChange(chip)}
            className={activeFilter === chip ? 'tg-chip tg-chip-active' : 'tg-chip'}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
