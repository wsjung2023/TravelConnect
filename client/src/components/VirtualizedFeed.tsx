import React, { useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Post } from '@shared/schema';
import { groupSimilarPosts, PostGroup } from '@/utils/postGrouping';
import { PostGroupCard } from '@/components/PostGroupCard';

interface VirtualizedFeedProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export function VirtualizedFeed({ 
  posts, 
  onPostClick, 
  containerRef,
  className = ''
}: VirtualizedFeedProps) {
  // 포스트 그룹핑
  const postGroups = useMemo(() => groupSimilarPosts(posts), [posts]);

  // 가상화 설정
  const virtualizer = useVirtualizer({
    count: postGroups.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => 200, []), // 예상 높이 200px
    overscan: 5, // 미리 렌더링할 아이템 수
  });

  return (
    <div 
      className={`space-y-4 p-4 ${className}`}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const group = postGroups[virtualItem.index];
        if (!group) return null;
        
        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PostGroupCard
              group={group}
              onClick={onPostClick}
              className="mb-4"
            />
          </div>
        );
      })}
    </div>
  );
}

// 통계 정보를 보여주는 컴포넌트
export function FeedStats({ 
  originalCount, 
  groupedCount 
}: { 
  originalCount: number; 
  groupedCount: number; 
}) {
  const reductionPercentage = Math.round(((originalCount - groupedCount) / originalCount) * 100);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-blue-700 font-medium">
          📊 피드 최적화
        </span>
        <div className="flex gap-4 text-blue-600">
          <span>{originalCount}개 → {groupedCount}개</span>
          <span className="font-bold text-green-600">
            {reductionPercentage}% 감소
          </span>
        </div>
      </div>
    </div>
  );
}