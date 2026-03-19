// 만나기 매칭 카드 — 아바타(52px)+온라인dot+언어칩+활동태그+거리+신뢰뱃지+CTA
import { ShieldCheck } from 'lucide-react';

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
  const isOpen = user.openToMeet ?? true;
  const name = user.firstName || user.username || 'Traveler';
  const langs = getLanguages(user);
  const activity = user.currentActivity ?? user.interests?.[0] ?? 'Explore';
  const distance = user.distance ?? '500m 이내';
  const availableUntil = user.availableUntil ?? '오늘 저녁 가능';
  const trustHigh = user.trustScore ? user.trustScore > 70 : true;

  return (
    <div
      className="mx-4 mb-3 p-3"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--stroke)',
        borderRadius: 20,
      }}
      onClick={onViewProfile}
    >
      <div className="flex items-center gap-3">
        {/* Avatar 52px + online dot + mint ring */}
        <div className="relative shrink-0">
          <div
            className="flex items-center justify-center rounded-full font-bold text-base"
            style={{
              width: 52,
              height: 52,
              background: 'var(--surface-2)',
              color: 'var(--accent-mint)',
              border: '2px solid #11131A',
              boxShadow: isOpen ? '0 0 0 2.5px var(--accent-mint)' : 'none',
              ...(user.profileImageUrl
                ? { backgroundImage: `url(${user.profileImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}),
            }}
          >
            {!user.profileImageUrl && getInitials(user)}
          </div>
          {/* Online dot */}
          <span
            className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
            style={{
              background: isOpen ? '#4ADE80' : 'var(--text-secondary)',
              border: '2px solid var(--surface-1)',
            }}
          />
        </div>

        {/* Center: name + languages + activity + distance */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold truncate" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {name}
            </span>
            {langs[0] && <span className="text-sm">{FLAG_MAP[langs[0]] ?? '🌍'}</span>}
          </div>

          {/* Language chips */}
          <div className="flex gap-1 mb-1">
            {langs.map((l) => (
              <span
                key={l}
                className="rounded-full px-1.5"
                style={{
                  fontSize: 10,
                  background: 'var(--surface-2)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--stroke)',
                  lineHeight: '16px',
                }}
              >
                {l}
              </span>
            ))}
          </div>

          {/* Activity tag */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                fontSize: 11,
                background: 'rgba(124,231,214,0.1)',
                color: 'var(--accent-mint)',
                border: '1px solid rgba(124,231,214,0.3)',
              }}
            >
              {getActivityIcon(activity)} {activity}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {availableUntil}
            </span>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            📍 {distance}
          </p>
        </div>

        {/* Right: trust badge + CTA */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {trustHigh && (
            <div className="flex items-center gap-0.5" style={{ color: 'var(--accent-blue)', fontSize: 10 }}>
              <ShieldCheck size={12} />
              <span>신뢰도 높음</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onHello(); }}
            className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            style={{ background: 'var(--accent-coral)', color: '#fff' }}
          >
            인사 보내기
          </button>
        </div>
      </div>
    </div>
  );
}
