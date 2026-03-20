// 만나기 매칭 카드 — 콜랩스/익스팬드 토글, 확장 시 80px 아바타+민트 글로우+풀위드 coral CTA
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface UserCardProps {
  user: any;
  onHello: () => void;
  onViewProfile?: () => void;
}

const FLAG_MAP: Record<string, string> = {
  KR: '🇰🇷', EN: '🇺🇸', JP: '🇯🇵', CN: '🇨🇳', FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸',
};

const ACTIVITY_ICONS: Record<string, string> = {
  dinner: '🍜', food: '🍜', photo: '📸', walk: '🚶', coffee: '☕',
  chat: '💬', explore: '🧭', 'night view': '🌃',
};

function getActivityIcon(tag?: string): string {
  if (!tag) return '✨';
  const key = tag.toLowerCase();
  return Object.entries(ACTIVITY_ICONS).find(([k]) => key.includes(k))?.[1] ?? '✨';
}

function getInitials(user: any): string {
  return (user.firstName?.[0] ?? user.username?.[0] ?? 'T').toUpperCase();
}

function getLanguages(user: any): string[] {
  return user.languages?.slice(0, 3) ?? ['KR'];
}

export default function UserCard({ user, onHello, onViewProfile }: UserCardProps) {
  const { t } = useTranslation('ui');
  const [expanded, setExpanded] = useState(false);

  const isOpen = user.openToMeet ?? true;
  const name = user.firstName || user.username || 'Traveler';
  const langs = getLanguages(user);
  const activity = user.currentActivity ?? user.interests?.[0] ?? 'Explore';
  const distance = user.distance ?? '500m 이내';
  const availableUntil = user.availableUntil ?? '오늘 저녁 가능';
  const trustHigh = user.trustScore ? user.trustScore > 70 : true;
  const hasAvatar = !!user.profileImageUrl;

  const avatarBase: React.CSSProperties = {
    borderRadius: '50%',
    background: 'var(--surface-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: 'var(--accent-mint)',
    backgroundImage: hasAvatar ? `url(${user.profileImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    flexShrink: 0,
    border: '2px solid #11131A',
  };

  // ── EXPANDED VIEW ────────────────────────────────────────────────────
  if (expanded) {
    return (
      <div
        className="mx-4 mb-3 p-4"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--stroke)', borderRadius: 20 }}
      >
        {/* 80px avatar centered with thick mint glow ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => setExpanded(false)}
            style={{
              ...avatarBase,
              width: 80,
              height: 80,
              fontSize: 22,
              boxShadow: isOpen
                ? '0 0 0 4px #7CE7D6, 0 0 20px rgba(124,231,214,0.45)'
                : '0 0 0 3px rgba(124,231,214,0.3)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {!hasAvatar && getInitials(user)}
            {isOpen && (
              <span style={{
                position: 'absolute', bottom: 3, right: 3,
                width: 12, height: 12, borderRadius: '50%',
                background: '#4ADE80', border: '2px solid var(--surface-1)',
              }} />
            )}
          </div>

          {/* Name + flag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
            {langs[0] && <span>{FLAG_MAP[langs[0]] ?? '🌍'}</span>}
            {trustHigh && <ShieldCheck size={14} color="var(--accent-blue)" />}
          </div>

          {/* Language chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {langs.map((l) => (
              <span key={l} className="tg-chip" style={{ fontSize: 11, padding: '2px 10px' }}>{l}</span>
            ))}
          </div>

          {/* Activity + distance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, borderRadius: 99, padding: '3px 10px',
              background: 'rgba(124,231,214,0.1)', color: 'var(--accent-mint)',
              border: '1px solid rgba(124,231,214,0.3)',
            }}>
              {getActivityIcon(activity)} {activity}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📍 {distance}</span>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{availableUntil}</p>

          {/* Full-width coral CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onHello(); }}
            className="tg-btn-primary"
            data-testid="button-hello-expanded"
            style={{ width: '100%', padding: '12px 0', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, marginTop: 4 }}
          >
            {t('meet.userCard.hello', { defaultValue: '인사 보내기' })}
          </button>

          {/* Ghost profile button */}
          {onViewProfile && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
              className="tg-btn-ghost"
              data-testid="button-view-profile"
              style={{ width: '100%', padding: '10px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              {t('meet.userCard.viewProfile', { defaultValue: '프로필 보기' })}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── COLLAPSED VIEW ───────────────────────────────────────────────────
  return (
    <div
      className="mx-4 mb-3 p-3"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--stroke)', borderRadius: 20, cursor: 'pointer' }}
      onClick={() => setExpanded(true)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar 52px + online dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            ...avatarBase,
            width: 52,
            height: 52,
            fontSize: 16,
            boxShadow: isOpen ? '0 0 0 2.5px var(--accent-mint)' : 'none',
          }}>
            {!hasAvatar && getInitials(user)}
          </div>
          <span style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 11, height: 11, borderRadius: '50%',
            background: isOpen ? '#4ADE80' : 'var(--text-secondary)',
            border: '2px solid var(--surface-1)',
            display: 'block',
          }} />
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
            {langs[0] && <span style={{ fontSize: 13 }}>{FLAG_MAP[langs[0]] ?? '🌍'}</span>}
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {langs.map((l) => (
              <span key={l} style={{
                fontSize: 10, borderRadius: 99, padding: '1px 7px',
                background: 'var(--surface-2)', color: 'var(--text-secondary)',
                border: '1px solid var(--stroke)', lineHeight: '16px',
              }}>{l}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, borderRadius: 99, padding: '2px 8px',
              background: 'rgba(124,231,214,0.10)', color: 'var(--accent-mint)',
              border: '1px solid rgba(124,231,214,0.3)',
            }}>
              {getActivityIcon(activity)} {activity}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{availableUntil}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, marginBottom: 0 }}>📍 {distance}</p>
        </div>

        {/* Right: trust badge + coral hello button */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {trustHigh && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent-blue)', fontSize: 10 }}>
              <ShieldCheck size={12} />
              <span>{t('meet.userCard.trust', { defaultValue: '신뢰도 높음' })}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onHello(); }}
            data-testid="button-hello"
            style={{
              background: 'var(--accent-coral)', color: '#fff',
              border: 'none', borderRadius: 99,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {t('meet.userCard.hello', { defaultValue: '인사 보내기' })}
          </button>
        </div>
      </div>
    </div>
  );
}
