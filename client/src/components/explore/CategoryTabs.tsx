// 탐색 탭 카테고리 탭 행 — 전체/음식/카페/활동/야경/쇼핑 가로 스크롤
import type { CSSProperties } from 'react';

export const CATEGORIES = ['전체', '음식', '카페', '활동', '야경', '쇼핑'] as const;
export type ExploreCategory = typeof CATEGORIES[number];

interface Props {
  active: ExploreCategory;
  onChange: (cat: ExploreCategory) => void;
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div
      className="flex overflow-x-auto px-4 py-2 gap-1"
      style={{ scrollbarWidth: 'none', background: 'var(--app-bg)' } as CSSProperties}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className="shrink-0 relative px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: 'transparent',
              borderBottom: isActive ? '2px solid var(--accent-mint)' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
