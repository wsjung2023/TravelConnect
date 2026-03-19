// 탐색 탭 상단바 — "탐색" 제목 + 세그먼트 컨트롤 + 필터 아이콘
import type { CSSProperties } from 'react';
import { SlidersHorizontal, PenLine } from 'lucide-react';

export const SEGMENTS = ['추천', '주변', '릴스', '로컬호스트', '경로'] as const;
export type ExploreSegment = typeof SEGMENTS[number];

interface Props {
  segment: ExploreSegment;
  onSegmentChange: (s: ExploreSegment) => void;
  onFilterClick?: () => void;
  onCreateClick?: () => void;
}

export default function ExploreTopBar({ segment, onSegmentChange, onFilterClick, onCreateClick }: Props) {
  return (
    <div
      className="sticky top-0 z-10"
      style={{ background: 'var(--app-bg)', borderBottom: '1px solid var(--stroke)' }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>탐색</h1>
        <div className="flex items-center gap-2">
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="flex items-center justify-center w-9 h-9 rounded-full"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
              aria-label="Create post"
            >
              <PenLine size={16} style={{ color: 'var(--accent-mint)' }} />
            </button>
          )}
          <button
            onClick={onFilterClick}
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
            aria-label="Filter"
          >
            <SlidersHorizontal size={16} style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>
      </div>

      {/* Segment control: pill row */}
      <div
        className="flex gap-2 px-4 pb-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none' } as CSSProperties}
      >
        {SEGMENTS.map((s) => (
          <button
            key={s}
            onClick={() => onSegmentChange(s)}
            className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              segment === s
                ? {
                    background: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--accent-mint)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid transparent',
                  }
            }
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
