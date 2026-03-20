// 프로필 히어로 — 커버 200px + 아바타 96px + mint ring + 이름 + 뱃지 + CTA
import { Compass, Camera, Map, Home, Edit3 } from 'lucide-react';

interface User {
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  nickname?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  bio?: string | null;
  location?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  isHost?: boolean;
  openToMeet?: boolean;
  openMeetRegion?: string | null;
  userType?: string | null;
  role?: string | null;
}

interface Props {
  user: User | null | undefined;
  isOwnProfile: boolean;
  onEdit?: () => void;
  onChat?: () => void;
  onFollow?: () => void;
  onMeet?: () => void;
}

const BADGE_DEFS = [
  { key: 'traveler', label: 'Traveler', icon: <Compass size={14} /> },
  { key: 'creator', label: 'Creator', icon: <Camera size={14} /> },
  { key: 'guide', label: 'Local Guide', icon: <Map size={14} /> },
  { key: 'host', label: 'Host', icon: <Home size={14} /> },
] as const;

function getBadges(user: User) {
  const badges: { key: string; label: string; icon: React.ReactNode }[] = [];
  badges.push(BADGE_DEFS[0]);
  if (user.userType === 'influencer' || user.userType === 'creator') badges.push(BADGE_DEFS[1]);
  if (user.userType === 'local_guide') badges.push(BADGE_DEFS[2]);
  if (user.isHost) badges.push(BADGE_DEFS[3]);
  return badges;
}

export default function ProfileHeader({ user, isOwnProfile, onEdit, onChat, onFollow, onMeet }: Props) {
  if (!user) return null;

  const displayName =
    user.nickname ||
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
    user.email?.split('@')[0] ||
    'User';

  const badges = getBadges(user);

  return (
    <div>
      {/* Open-to-meet banner */}
      {user.openToMeet && (
        <div
          className="flex items-center justify-center gap-2 py-2"
          style={{ background: 'rgba(124,231,214,0.10)', borderBottom: '1px solid var(--accent-mint)' }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--accent-mint)', boxShadow: '0 0 6px var(--accent-mint)' }}
          />
          <span style={{ fontSize: 12, color: 'var(--accent-mint)', fontWeight: 500 }}>
            Open-to-meet · {user.openMeetRegion || user.location || 'Seoul'}
          </span>
        </div>
      )}

      {/* Cover image */}
      <div className="relative" style={{ height: 200, overflow: 'hidden' }}>
        {user.coverImageUrl ? (
          <img src={user.coverImageUrl} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #1a2340 0%, #0d1520 50%, #0A0B10 100%)' }}
          />
        )}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: '60%', background: 'linear-gradient(to top, #0A0B10 0%, transparent 100%)' }}
        />
        {isOwnProfile && (
          <button
            onClick={onEdit}
            className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: '1px solid var(--stroke)' }}
            aria-label="Edit profile"
          >
            <Edit3 size={14} style={{ color: 'var(--text-primary)' }} />
          </button>
        )}
      </div>

      {/* Avatar — 96px overlapping cover */}
      <div className="flex flex-col items-center" style={{ marginTop: -48 }}>
        <div
          className="relative"
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: '3px solid var(--accent-gold)',
            boxShadow: user.openToMeet
              ? '0 0 0 5px rgba(124,231,214,0.35), 0 0 20px rgba(124,231,214,0.3)'
              : '0 4px 16px rgba(200,168,78,0.25)',
          }}
        >
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-bold text-2xl"
              style={{ background: 'var(--surface-2)', color: 'var(--accent-gold)', border: '3px solid var(--surface-1)' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + location */}
        <div className="mt-3 text-center px-4">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {displayName}
          </h2>
          {user.location && (
            <p style={{ fontSize: 13, color: 'var(--accent-gold)', marginTop: 3, opacity: 0.85 }}>
              {user.location}
            </p>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p
            className="mt-3 text-center px-6"
            style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}
          >
            {user.bio}
          </p>
        )}

        {/* Badge row */}
        {badges.length > 0 && (
          <div className="flex gap-3 mt-4 flex-wrap justify-center px-4">
            {badges.map((b) => (
              <div key={b.key} className="flex flex-col items-center gap-1">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--accent-gold)',
                    color: 'var(--accent-gold)',
                  }}
                >
                  {b.icon}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CTA row */}
        <div className="flex gap-2 mt-4 px-4 w-full justify-center pb-4">
          {!isOwnProfile ? (
            <>
              <button
                className="tg-btn-ghost"
                style={{ flex: 1, maxWidth: 110, padding: '8px 0', fontSize: 13 }}
                onClick={onFollow}
              >
                팔로우
              </button>
              <button
                className="tg-btn-ghost"
                style={{ flex: 1, maxWidth: 110, padding: '8px 0', fontSize: 13 }}
                onClick={onChat}
              >
                채팅
              </button>
              <button
                className="tg-btn-primary"
                style={{ flex: 1, maxWidth: 110, padding: '8px 0', fontSize: 13 }}
                onClick={onMeet}
              >
                같이만나기
              </button>
            </>
          ) : (
            <button
              className="tg-btn-ghost"
              style={{ minWidth: 140, padding: '8px 20px', fontSize: 13 }}
              onClick={onEdit}
            >
              프로필 편집
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
