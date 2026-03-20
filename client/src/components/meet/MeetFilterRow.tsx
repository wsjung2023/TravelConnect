// MeetFilterRow — premium mint chips with stable IDs and translated labels.
import type { CSSProperties, ReactNode } from 'react';
import { Clock, MapPin, Utensils, PersonStanding, MessageSquare, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MEET_FILTERS = ['now', 'oneHour', 'within2km', 'dinner', 'walk', 'langExchange'] as const;
export type MeetFilter = typeof MEET_FILTERS[number];

const ICONS: Record<MeetFilter, ReactNode> = {
  now: <Clock size={12} />,
  oneHour: <Timer size={12} />,
  within2km: <MapPin size={12} />,
  dinner: <Utensils size={12} />,
  walk: <PersonStanding size={12} />,
  langExchange: <MessageSquare size={12} />,
};

const FILTER_KEYS: Record<MeetFilter, string> = {
  now: 'meet.filter.now',
  oneHour: 'meet.filter.1hour',
  within2km: 'meet.filter.2km',
  dinner: 'meet.filter.dinner',
  walk: 'meet.filter.walk',
  langExchange: 'meet.filter.langExchange',
};

interface Props {
  active: MeetFilter;
  onChange: (f: MeetFilter) => void;
}

export default function MeetFilterRow({ active, onChange }: Props) {
  const { t } = useTranslation('ui');

  return (
    <div className="px-4 pt-1 pb-3">
      <div className="flex items-end justify-between gap-3 px-0.5 mb-2">
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('meet.sections.filters')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('meet.filters.helper')}
          </p>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pr-1" style={{ scrollbarWidth: 'none' } as CSSProperties}>
        {MEET_FILTERS.map((f) => {
          const selected = active === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              className={selected ? 'shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium transition-colors tg-chip-mint-active' : 'shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium transition-colors tg-chip'}
              aria-pressed={selected}
            >
              {ICONS[f]}
              {t(FILTER_KEYS[f])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
