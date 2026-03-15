import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import NearbyPeopleSheet from './NearbyPeopleSheet';
import NearbyStoriesSheet from './NearbyStoriesSheet';

export type MapSheetState = 'collapsed' | 'half' | 'expanded';

interface Props {
  state: MapSheetState;
  onStateChange: (state: MapSheetState) => void;
  focusedStoryLabel?: string | null;
  onQuickMiniConcierge?: () => void;
}

const ORDER: MapSheetState[] = ['collapsed', 'half', 'expanded'];

export default function MapBottomSheet({ state, onStateChange, focusedStoryLabel, onQuickMiniConcierge }: Props) {
  const { data: openUsers = [] } = useQuery<unknown[]>({ queryKey: ['/api/users/open'] });
  const { data: posts = [] } = useQuery<unknown[]>({ queryKey: ['/api/posts'] });

  const heightClass = useMemo(() => {
    if (state === 'collapsed') return 'h-28';
    if (state === 'half') return 'h-72';
    return 'h-[72vh]';
  }, [state]);

  const nextState = () => {
    const currentIndex = ORDER.indexOf(state);
    const nextIndex = Math.min(currentIndex + 1, ORDER.length - 1);
    onStateChange(ORDER[nextIndex] ?? 'expanded');
  };

  return (
    <div className={clsx('map-bottom-sheet absolute bottom-0 inset-x-0 z-20 rounded-t-3xl p-4 transition-all', heightClass)}>
      <button className="mx-auto mb-3 block h-1.5 w-16 rounded-full bg-white/30" onClick={nextState} />
      <div className="text-white">
        <div className="flex items-center justify-between text-sm">
          <span>Nearby travelers {openUsers.length}</span>
          <span>Stories {posts.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm text-white/80">
          <span>{focusedStoryLabel ? `선택됨: ${focusedStoryLabel}` : '오늘 추천: 지금 1시간 뭐하지?'}</span>
          <button className="app-chip" onClick={onQuickMiniConcierge} disabled={!onQuickMiniConcierge}>추천</button>
        </div>

        {state !== 'collapsed' && (
          <div className="mt-4 space-y-4 overflow-y-auto max-h-[56vh] pr-1">
            <NearbyPeopleSheet />
            <NearbyStoriesSheet />
            <div className="rounded-xl bg-white/10 p-3 text-sm">추천 플랜: Han River sunset walk + coffee meetup.</div>
          </div>
        )}
      </div>
    </div>
  );
}
