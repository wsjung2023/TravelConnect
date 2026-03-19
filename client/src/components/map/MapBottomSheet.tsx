// MapBottomSheet — v3 3-snap 바텀시트
// collapsed(120px) → half(50vh) → expanded(90vh)
// 기본 뷰: 추천 카드 / 마커 탭 시: 인물 카드
import { useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';

export type MapSheetState = 'collapsed' | 'half' | 'expanded';

export interface SelectedUser {
  id: number;
  name: string;
  avatarUrl?: string | null;
  initials?: string;
  distance?: string;
  activity?: string;
  languages?: string[];
}

interface Props {
  state: MapSheetState;
  onStateChange: (s: MapSheetState) => void;
  selectedUser?: SelectedUser | null;
  onClearUser?: () => void;
  /** @deprecated use selectedUser for marker-tap flow */
  focusedStoryLabel?: string | null;
  onQuickMiniConcierge?: () => void;
}

const SNAPS: MapSheetState[] = ['collapsed', 'half', 'expanded'];
const HEIGHT: Record<MapSheetState, string> = {
  collapsed: '120px',
  half:      '50vh',
  expanded:  '90vh',
};

const MOCK_RECS = [
  { id: 1, initials: '민', title: '감성 카페 투어 & 사진 찍기', sub: 'with 민지', dist: '0.3km' },
  { id: 2, initials: '준', title: '북촌 한옥마을 야경 산책',   sub: 'with 준호', dist: '0.7km' },
  { id: 3, initials: '현', title: '강남 맛집 탐방 저녁 식사', sub: 'with 현우 & 수진', dist: '1.2km' },
];

export default function MapBottomSheet({
  state,
  onStateChange,
  selectedUser,
  onClearUser,
  onQuickMiniConcierge,
}: Props) {
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    const idx = SNAPS.indexOf(state);
    if (dy < -50 && idx < SNAPS.length - 1) onStateChange(SNAPS[idx + 1]!);
    else if (dy > 50 && idx > 0)            onStateChange(SNAPS[idx - 1]!);
    touchStartY.current = null;
  };

  const handleHandleTap = () => {
    const idx = SNAPS.indexOf(state);
    if (idx < SNAPS.length - 1) onStateChange(SNAPS[idx + 1]!);
    else onStateChange('collapsed');
  };

  return (
    <div
      className="tg-bottom-sheet absolute inset-x-0 bottom-0 z-20 transition-[height] duration-300 overflow-hidden flex flex-col"
      style={{ height: HEIGHT[state] }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Drag handle */}
      <button
        onClick={handleHandleTap}
        className="mx-auto mt-3 mb-1 flex-shrink-0 h-1 w-12 rounded-full cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.18)' }}
        aria-label="Drag handle"
      />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {selectedUser
          ? <PersonView user={selectedUser} onClose={onClearUser} />
          : <DefaultView state={state} onQuickMiniConcierge={onQuickMiniConcierge} />
        }
      </div>
    </div>
  );
}

/* ── Default view ── */
function DefaultView({
  state,
  onQuickMiniConcierge,
}: {
  state: MapSheetState;
  onQuickMiniConcierge?: () => void;
}) {
  return (
    <>
      <p className="text-sm font-semibold mb-3 mt-1" style={{ color: 'var(--text-primary)' }}>
        '지금 1시간, 뭐 하지?'
      </p>

      {MOCK_RECS.map((rec) => (
        <div
          key={rec.id}
          className="flex items-center gap-3 mb-2.5 rounded-2xl p-3"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
        >
          {/* Avatar 40px */}
          <div
            className="shrink-0 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              width: 40, height: 40,
              background: 'var(--surface-1)',
              color: 'var(--accent-mint)',
              border: '2px solid #11131A',
            }}
          >
            {rec.initials}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {rec.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {rec.sub} · {rec.dist}
            </p>
          </div>

          {/* CTA */}
          <button
            className="shrink-0 tg-btn-primary rounded-full px-3 py-1.5 text-xs font-medium"
            onClick={onQuickMiniConcierge}
          >
            보기
          </button>
        </div>
      ))}

      {state === 'expanded' && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          주변 더 많은 활동을 탐색하세요
        </p>
      )}
    </>
  );
}

/* ── Person view (marker tap) ── */
function PersonView({ user, onClose }: { user: SelectedUser; onClose?: () => void }) {
  const initials = user.initials ?? user.name.slice(0, 2);

  return (
    <>
      <div className="flex justify-end -mt-1 mb-2">
        {onClose && (
          <button onClick={onClose} aria-label="Close person view">
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
      </div>

      {/* Avatar 64px */}
      <div className="flex flex-col items-center gap-2 mb-5">
        <div
          className="rounded-full flex items-center justify-center font-bold text-xl"
          style={{
            width: 64, height: 64,
            background: 'var(--surface-2)',
            color: 'var(--accent-mint)',
            border: '2px solid #11131A',
            boxShadow: '0 0 0 3px #7CE7D6',
          }}
        >
          {initials}
        </div>

        <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          {user.name}
        </p>

        {user.distance && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {user.distance}
          </p>
        )}

        {user.languages && user.languages.length > 0 && (
          <div className="flex gap-1.5">
            {user.languages.map((lang) => (
              <span key={lang} className="tg-chip" style={{ fontSize: 11, padding: '2px 8px' }}>
                {lang}
              </span>
            ))}
          </div>
        )}

        {user.activity && (
          <span
            className="rounded-full px-3 py-1 text-xs"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--accent-mint)',
              border: '1px solid var(--stroke)',
            }}
          >
            {user.activity}
          </span>
        )}
      </div>

      {/* CTA row */}
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-full py-2.5 text-sm font-semibold"
          style={{ background: 'var(--accent-coral)', color: '#fff' }}
        >
          인사 보내기
        </button>
        <button
          className="rounded-full px-4 py-2.5 text-sm"
          style={{ border: '1px solid var(--stroke)', color: 'var(--text-primary)' }}
        >
          프로필
        </button>
        <button
          className="rounded-full px-4 py-2.5"
          style={{ border: '1px solid var(--stroke)', color: 'var(--text-primary)' }}
          aria-label="Chat"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </>
  );
}
