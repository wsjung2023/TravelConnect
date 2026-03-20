// 만나기 매칭 카드 — premium radar-list card with expand state and strong mockup-style CTA.
import { useState } from 'react';
import { Clock3, MapPin, ShieldCheck } from 'lucide-react';
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
  return user.languages?.slice(0, 3) ?? [];
}

export default function UserCard({ user, onHello, onViewProfile }: UserCardProps) {
  const { t } = useTranslation('ui');
  const [expanded, setExpanded] = useState(false);

  const isOpen = user.openToMeet ?? true;
  const name = user.firstName || user.username || user.nickname || t('profile.user');
  const langs = getLanguages(user);
  const activity = user.currentActivity ?? user.interests?.[0] ?? null;
  const distance = user.distance ?? null;
  const availableUntil = user.availableUntil ?? null;
  const trustHigh = user.trustScore ? user.trustScore > 70 : true;
  const hasAvatar = !!user.profileImageUrl;

  const avatarBase: React.CSSProperties = {
    borderRadius: '50%',
    background: 'linear-gradient(180deg, rgba(31,34,46,0.96), rgba(20,22,32,0.98))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: 'var(--accent-mint)',
    backgroundImage: hasAvatar ? `url(${user.profileImageUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    flexShrink: 0,
    border: '2px solid rgba(7,9,13,0.96)',
  };

  if (expanded) {
    return (
      <div className="mx-4 mb-3 p-4.5 rounded-[24px]" style={{ background: 'linear-gradient(180deg, rgba(19,22,31,0.98), rgba(12,14,20,0.98))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 18px 40px rgba(0,0,0,0.32), 0 0 18px rgba(124,231,214,0.08)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
          <div
            onClick={() => setExpanded(false)}
            style={{
              ...avatarBase,
              width: 88,
              height: 88,
              fontSize: 24,
              boxShadow: isOpen ? '0 0 0 4px rgba(124,231,214,0.9), 0 0 20px rgba(124,231,214,0.34), 0 0 42px rgba(124,231,214,0.12)' : '0 0 0 3px rgba(124,231,214,0.22)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {!hasAvatar && getInitials(user)}
            {isOpen && <span style={{ position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, borderRadius: '50%', background: '#4ADE80', border: '2px solid rgba(7,9,13,0.96)' }} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
            {langs[0] && <span>{FLAG_MAP[langs[0]] ?? '🌍'}</span>}
            {trustHigh && <ShieldCheck size={15} color="var(--accent-blue)" />}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {langs.map((l) => <span key={l} className="tg-chip" style={{ fontSize: 11, padding: '4px 10px' }}>{l}</span>)}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {activity && <span className="tg-chip tg-chip-mint-active" style={{ fontSize: 12, padding: '6px 12px' }}>{getActivityIcon(activity)} {activity}</span>}
            {distance && <span className="tg-chip" style={{ fontSize: 12, padding: '6px 12px' }}><MapPin size={11} className="inline mr-1" />{distance}</span>}
            {availableUntil && <span className="tg-chip" style={{ fontSize: 12, padding: '6px 12px' }}><Clock3 size={11} className="inline mr-1" />{availableUntil}</span>}
          </div>

          <button onClick={(e) => { e.stopPropagation(); onHello(); }} className="tg-btn-primary" data-testid="button-hello-expanded" style={{ width: '100%', padding: '14px 0', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, marginTop: 4 }}>
            {t('meet.userCard.hello')}
          </button>

          {onViewProfile && (
            <button onClick={(e) => { e.stopPropagation(); onViewProfile(); }} className="tg-btn-ghost" data-testid="button-view-profile" style={{ width: '100%', padding: '12px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {t('meet.userCard.viewProfile')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 p-3.5 rounded-[24px]" style={{ background: 'linear-gradient(180deg, rgba(20,23,32,0.96), rgba(15,17,24,0.98))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 14px 32px rgba(0,0,0,0.22)' }} onClick={() => setExpanded(true)}>
      <div className="flex items-center gap-3">
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ ...avatarBase, width: 56, height: 56, fontSize: 16, boxShadow: isOpen ? '0 0 0 3px rgba(124,231,214,0.85), 0 0 14px rgba(124,231,214,0.24)' : '0 0 0 2px rgba(124,231,214,0.18)' }}>
            {!hasAvatar && getInitials(user)}
          </div>
          <span style={{ position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%', background: isOpen ? '#4ADE80' : 'var(--text-secondary)', border: '2px solid rgba(7,9,13,0.96)', display: 'block' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            {langs[0] && <span style={{ fontSize: 13 }}>{FLAG_MAP[langs[0]] ?? '🌍'}</span>}
          </div>

          {langs.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
              {langs.map((l) => <span key={l} className="tg-chip" style={{ fontSize: 10, padding: '4px 8px' }}>{l}</span>)}
            </div>
          )}

          {(activity || availableUntil) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {activity && <span className="tg-chip tg-chip-mint-active" style={{ fontSize: 11, padding: '5px 9px' }}>{getActivityIcon(activity)} {activity}</span>}
              {availableUntil && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{availableUntil}</span>}
            </div>
          )}

          {distance && <p style={{ fontSize: 11, color: 'var(--accent-gold)', marginTop: 4, marginBottom: 0 }}>{distance}</p>}
        </div>

        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 86 }}>
          {trustHigh && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--accent-blue)', fontSize: 10 }}>
              <ShieldCheck size={12} />
              <span>{t('meet.userCard.trust')}</span>
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); onHello(); }} data-testid="button-hello" className="tg-btn-primary" style={{ border: 'none', padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', width: '100%' }}>
            {t('meet.userCard.hello')}
          </button>
          {onViewProfile && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewProfile(); }}
              className="tg-btn-ghost"
              style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, width: '100%' }}
            >
              {t('meet.userCard.viewProfile')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
