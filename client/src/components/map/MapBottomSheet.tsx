// MapBottomSheet — premium 3-snap bottom sheet with richer recommendation cards and person detail state.
import { CalendarDays, Clock3, MapPin, MessageCircle, Sparkles, Star, X } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  focusedStoryLabel?: string | null;
  onQuickMiniConcierge?: () => void;
}

interface RecCard {
  id: number;
  accent: 'gold' | 'mint' | 'coral';
  eyebrow: string;
  title: string;
  subtitle: string;
  host: string;
  eta: string;
  distance: string;
  price: string;
  badges: string[];
}

const SNAPS: MapSheetState[] = ['collapsed', 'half', 'expanded'];
const HEIGHT: Record<MapSheetState, string> = {
  collapsed: '132px',
  half: '54vh',
  expanded: '90vh',
};

const REC_ACCENTS: RecCard['accent'][] = ['gold', 'mint', 'coral'];

export default function MapBottomSheet({ state, onStateChange, selectedUser, onClearUser, focusedStoryLabel, onQuickMiniConcierge }: Props) {
  const touchStartY = useRef<number | null>(null);
  const { t } = useTranslation('ui');

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current;
    const idx = SNAPS.indexOf(state);
    if (dy < -50 && idx < SNAPS.length - 1) {
      onStateChange(SNAPS[idx + 1]!);
    } else if (dy > 120) {
      onStateChange('collapsed');
    } else if (dy > 50 && idx > 0) {
      onStateChange(SNAPS[idx - 1]!);
    }
    touchStartY.current = null;
  };

  const handleHandleTap = () => {
    if (state === 'collapsed') onStateChange('half');
    else onStateChange('collapsed');
  };

  return (
    <div
      className="tg-bottom-sheet absolute inset-x-0 bottom-0 z-20 transition-[height] duration-300 overflow-hidden flex flex-col"
      style={{ height: HEIGHT[state] }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex w-full flex-shrink-0 items-center justify-center" style={{ height: 44 }}>
        <button
          onClick={handleHandleTap}
          className="flex h-full w-full items-center justify-center"
          aria-label={t('common.back')}
        >
          <div
            className="w-12 rounded-full"
            style={{ height: 5, background: 'rgba(255,255,255,0.18)' }}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {selectedUser ? (
          <PersonView user={selectedUser} {...(onClearUser ? { onClose: onClearUser } : {})} />
        ) : (
          <DefaultView
            state={state}
            focusedStoryLabel={focusedStoryLabel}
            {...(onQuickMiniConcierge ? { onQuickMiniConcierge } : {})}
          />
        )}
      </div>
    </div>
  );
}

function DefaultView({ state, focusedStoryLabel, onQuickMiniConcierge }: { state: MapSheetState; focusedStoryLabel?: string | null | undefined; onQuickMiniConcierge?: () => void }) {
  const { t } = useTranslation('ui');
  const rawCards = t('map.sheet.recommendationCards', { returnObjects: true });
  const recommendationCards: Omit<RecCard, 'id' | 'accent'>[] = Array.isArray(rawCards) ? rawCards : [];
  const mockRecs: RecCard[] = recommendationCards.map((card, index) => ({
    id: index + 1,
    accent: REC_ACCENTS[index] ?? 'gold',
    ...card,
  }));

  return (
    <>
      <div className="mb-3 mt-1 flex items-center justify-between gap-4">
        <div>
          <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('map.sheet.title')}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{t('map.sheet.exploreMore')}</p>
        </div>
        <div
          className="shrink-0 rounded-[18px] px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p style={{ color: 'var(--accent-gold)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>{t('map.sheet.recommendations')}</p>
          <p style={{ color: 'var(--text-primary)', fontSize: 12, marginTop: 3 }}>{focusedStoryLabel ?? t('map.sheet.liveNow')}</p>
        </div>
      </div>

      <div
        className="mb-3 rounded-[24px] p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(26,29,38,0.96), rgba(18,20,28,0.98))',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ color: 'var(--accent-gold)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>{t('map.sheet.heroEyebrow')}</p>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginTop: 6, lineHeight: 1.25 }}>
              {t('map.sheet.heroTitle')}
            </h3>
          </div>
          <div className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-gold)' }}>
            <Sparkles size={16} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Array.isArray(t('map.sheet.heroTags', { returnObjects: true })) ? t('map.sheet.heroTags', { returnObjects: true }) as string[] : []).map((chip) => (
            <span key={chip} className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{chip}</span>
          ))}
        </div>

        {state === 'collapsed' && (
          <p className="mt-3" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {t('map.sheet.collapsedHint')}
          </p>
        )}
      </div>

      {mockRecs.map((rec) => (
        <StoryRecCard key={rec.id} rec={rec} expanded={state !== 'collapsed'} {...(onQuickMiniConcierge ? { onQuickMiniConcierge } : {})} ctaText={t('map.sheet.view')} />
      ))}
    </>
  );
}

function StoryRecCard({ rec, expanded, onQuickMiniConcierge, ctaText }: { rec: RecCard; expanded: boolean; onQuickMiniConcierge?: () => void; ctaText: string }) {
  const { t } = useTranslation('ui');
  const accent = rec.accent === 'mint' ? 'rgba(124,231,214,0.72)' : rec.accent === 'coral' ? 'rgba(255,138,112,0.68)' : 'rgba(230,201,137,0.74)';
  const glow = '0 10px 24px rgba(0,0,0,0.14)';

  return (
    <div className="mb-3 flex gap-3 items-stretch">
      <div
        className="shrink-0 rounded-[22px] px-3 py-4 flex flex-col items-center justify-between"
        style={{ width: 72, background: 'linear-gradient(180deg, rgba(23,25,34,0.98), rgba(18,20,28,0.98))', border: `1px solid ${accent}`, boxShadow: glow }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--accent-gold)' }}>
          <MapPin size={16} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-[1px]" style={{ background: `linear-gradient(180deg, transparent, ${accent}, transparent)` }} />
          <div className="w-7 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', boxShadow: `0 0 0 1px ${accent}` }} />
        </div>
      </div>

      <div
        className="flex-1 rounded-[24px] p-3.5"
        style={{ background: 'linear-gradient(180deg, rgba(24,27,36,0.96), rgba(18,20,28,0.98))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: glow }}
      >
        <div
          className="w-full rounded-[20px] p-4 flex flex-col justify-between"
          style={{
            minHeight: expanded ? 164 : 126,
            background: 'linear-gradient(180deg, rgba(37,41,53,0.9), rgba(19,21,29,0.96))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p style={{ color: 'var(--accent-gold)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>{rec.eyebrow}</p>
              <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginTop: 7 }}>{rec.title}</p>
            </div>
            <div className="rounded-full px-2 py-1" style={{ background: 'rgba(18,20,28,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>{rec.price}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {rec.badges.map((badge) => (
              <span key={badge} className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{badge}</span>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>{rec.host}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{rec.subtitle}</p>
          </div>
          <div className="rounded-[16px] px-3 py-2 shrink-0" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--accent-gold)', fontSize: 11, fontWeight: 700 }}>
              <Star size={11} fill="currentColor" />
              <span>4.9</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 10, marginTop: 4 }}>{rec.distance}</p>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
            <div className="rounded-[18px] px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--accent-gold)', fontSize: 11, fontWeight: 600 }}>
                <CalendarDays size={12} />
                <span>{rec.eta}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>{rec.distance}</p>
            </div>
            <div className="rounded-[18px] px-3 py-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--accent-mint)', fontSize: 11, fontWeight: 700 }}>
                <Clock3 size={12} />
                <span>{t('map.sheet.routeFlexible')}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>{t('map.sheet.routePickup')}</p>
            </div>
            <button className="tg-btn-primary px-4 py-2 text-xs font-semibold" onClick={onQuickMiniConcierge}>
              {ctaText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonView({ user, onClose }: { user: SelectedUser; onClose?: () => void }) {
  const { t } = useTranslation('ui');
  const initials = user.initials ?? user.name.slice(0, 2);

  return (
    <>
      <div className="flex justify-end -mt-1 mb-2">
        {onClose && (
          <button onClick={onClose} aria-label={t('common.back')}>
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        )}
      </div>

      <div className="rounded-[28px] p-5 tg-surface">
        <div className="flex flex-col items-center gap-3 mb-5">
          <div
            className="rounded-full flex items-center justify-center font-bold text-xl overflow-hidden"
            style={{
              width: 78,
              height: 78,
              background: user.avatarUrl ? undefined : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(24,27,37,0.96) 70%)',
              backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'var(--accent-mint)',
              boxShadow: '0 0 0 3px rgba(124,231,214,0.85), 0 0 20px rgba(124,231,214,0.28), 0 0 40px rgba(124,231,214,0.12)',
            }}
          >
            {!user.avatarUrl && initials}
          </div>

          <div className="text-center">
            <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>{user.name}</p>
            {user.distance && <p style={{ color: 'var(--accent-gold)', fontSize: 12, marginTop: 4 }}>{user.distance}</p>}
          </div>

          {user.languages && user.languages.length > 0 && (
            <div className="flex gap-1.5 flex-wrap justify-center">
              {user.languages.map((lang) => (
                <span key={lang} className="tg-chip" style={{ fontSize: 11, padding: '4px 9px' }}>{lang}</span>
              ))}
            </div>
          )}

          {user.activity && (
            <span className="tg-chip tg-chip-mint-active" style={{ fontSize: 12, padding: '6px 12px' }}>
              {user.activity}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <button className="tg-btn-primary py-3 text-sm font-semibold">{t('map.sheet.sayHello')}</button>
          <button className="tg-btn-ghost py-3 text-sm font-medium">{t('map.sheet.profile')}</button>
          <button className="tg-btn-ghost w-12 h-12 flex items-center justify-center" aria-label={t('navigation.chat')}>
            <MessageCircle size={16} />
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          {t('map.sheet.personHint')}
        </p>
      </div>
    </>
  );
}
