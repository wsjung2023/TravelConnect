// 만나기 탭 필터 칩 행 — 지금/1시간/2km/저녁/산책/언어교환 가로 스크롤
import type { CSSProperties, ReactNode } from 'react';
import { Clock, MapPin, Utensils, PersonStanding, MessageSquare, Timer } from 'lucide-react';

export const MEET_FILTERS = ['지금', '1시간', '2km', '저녁', '산책', '언어교환'] as const;
export type MeetFilter = typeof MEET_FILTERS[number];

const ICONS: Record<MeetFilter, ReactNode> = {
  '지금':   <Clock size={12} />,
  '1시간':  <Timer size={12} />,
  '2km':    <MapPin size={12} />,
  '저녁':   <Utensils size={12} />,
  '산책':   <PersonStanding size={12} />,
  '언어교환': <MessageSquare size={12} />,
};

interface Props {
  active: MeetFilter;
  onChange: (f: MeetFilter) => void;
}

export default function MeetFilterRow({ active, onChange }: Props) {
  return (
    <div
      className="flex gap-2 px-4 py-2 overflow-x-auto"
      style={{ scrollbarWidth: 'none' } as CSSProperties}
    >
      {MEET_FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          style={
            active === f
              ? {
                  background: 'rgba(124,231,214,0.12)',
                  color: 'var(--accent-mint)',
                  border: '1px solid var(--accent-mint)',
                }
              : {
                  background: 'var(--surface-2)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--stroke)',
                }
          }
        >
          {ICONS[f]}
          {f}
        </button>
      ))}
    </div>
  );
}
