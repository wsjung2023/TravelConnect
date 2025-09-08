import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Post } from '@shared/schema';
import { groupPostsByDay, PostGroup } from '@/utils/postGrouping';
import { PostGroupCard } from '@/components/PostGroupCard';
import { Card, CardContent } from '@/components/ui/card';

interface VirtualizedTimelineProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  startDate?: Date;
  className?: string;
}

interface DayItem {
  type: 'day-header' | 'post-group';
  day?: number;
  group?: PostGroup;
}

export function VirtualizedTimeline({ 
  posts, 
  onPostClick, 
  containerRef,
  startDate,
  className = ''
}: VirtualizedTimelineProps) {
  // Day별 포스트 그룹핑
  const dayGroups = useMemo(() => groupPostsByDay(posts, startDate), [posts, startDate]);

  // 가상화를 위한 플랫 아이템 리스트 생성
  const virtualItems = useMemo((): DayItem[] => {
    const items: DayItem[] = [];
    
    Object.keys(dayGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(dayStr => {
        const day = parseInt(dayStr);
        const groups = dayGroups[day];
        
        if (groups.length > 0) {
          // Day 헤더 추가
          items.push({
            type: 'day-header',
            day
          });
          
          // 해당 Day의 그룹들 추가
          groups.forEach(group => {
            items.push({
              type: 'post-group',
              group
            });
          });
        }
      });
    
    return items;
  }, [dayGroups]);

  // 가상화 설정
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      return item.type === 'day-header' ? 80 : 220; // 헤더는 80px, 포스트는 220px
    },
    overscan: 3,
  });

  // Day 헤더 컴포넌트
  const DayHeader = ({ day }: { day: number }) => (
    <div className="flex items-center gap-4 mb-4 ml-8">
      <div className="bg-teal-500 text-white px-4 py-2 rounded-full font-bold text-sm">
        DAY {day}
      </div>
      <div className="flex-1 h-px bg-gray-300"></div>
    </div>
  );

  return (
    <div 
      className={`space-y-4 pb-10 ${className}`}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const item = virtualItems[virtualItem.index];
        
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
            {item.type === 'day-header' ? (
              <DayHeader day={item.day!} />
            ) : (
              <div className="relative ml-8">
                {/* 타임라인 연결선 (다음 아이템이 포스트 그룹인 경우) */}
                {virtualItem.index < virtualItems.length - 1 && 
                 virtualItems[virtualItem.index + 1].type === 'post-group' && (
                  <div className="absolute -left-8 top-8 w-px h-full bg-gray-300"></div>
                )}
                
                {/* 타임라인 점 */}
                <div className="absolute -left-10 top-6 w-4 h-4 bg-teal-500 rounded-full border-2 border-white shadow-sm"></div>
                
                <PostGroupCard
                  group={item.group!}
                  onClick={onPostClick}
                  className="mb-4"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 타임라인 통계 정보
export function TimelineStats({ 
  dayGroups,
  originalPostCount
}: { 
  dayGroups: Record<number, PostGroup[]>;
  originalPostCount: number;
}) {
  const totalGroups = Object.values(dayGroups).flat().length;
  const reductionPercentage = originalPostCount > 0 
    ? Math.round(((originalPostCount - totalGroups) / originalPostCount) * 100)
    : 0;
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-teal-700 font-medium">
              📅 타임라인 최적화
            </span>
            <div className="text-gray-600">
              {Object.keys(dayGroups).length}일간의 여행
            </div>
          </div>
          <div className="flex gap-4 text-teal-600">
            <span>{originalPostCount}개 → {totalGroups}개</span>
            <span className="font-bold text-green-600">
              {reductionPercentage}% 카드 감소
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}