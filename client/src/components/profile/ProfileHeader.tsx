// 프로필 히어로 — mockup 기준의 커버/오픈투밋 배너/아바타/언어칩/역할 배지/CTA
import { Compass, Camera, Map, Home, Edit3, MapPin, Sparkles, MessageCircle, UserPlus, HeartHandshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  { key: 'traveler', labelKey: 'profile.badge.traveler', fallback: '여행자', icon: <Compass size={15} /> },
  { key: 'creator', labelKey: 'profile.badge.creator', fallback: '크리에이터', icon: <Camera size={15} /> },
  { key: 'guide', labelKey: 'profile.badge.guide', fallback: '로컬 가이드', icon: <Map size={15} /> },
  { key: 'host', labelKey: 'profile.badge.host', fallback: '호스트', icon: <Home size={15} /> },
] as const;

function getBadges(user: User) {
  const badges: { key: string; labelKey: string; fallback: string; icon: React.ReactNode }[] = [];
  badges.push(BADGE_DEFS[0]);
  if (user.userType === 'influencer' || user.userType === 'creator') badges.push(BADGE_DEFS[1]);
  if (user.userType === 'local_guide') badges.push(BADGE_DEFS[2]);
  if (user.isHost) badges.push(BADGE_DEFS[3]);
  return badges;
}

function normalizeLanguage(lang: string) {
  return lang.trim().slice(0, 3).toUpperCase();
}

export default function ProfileHeader({ user, isOwnProfile, onEdit, onChat, onFollow, onMeet }: Props) {
  const { t } = useTranslation('ui');
  if (!user) return null;

  const displayName =
    user.nickname ||
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
    user.email?.split('@')[0] ||
    'User';

  const badges = getBadges(user);
  const languages = (user.languages && user.languages.length > 0 ? user.languages : ['EN']).slice(0, 3);
  const meetLabel = user.openMeetRegion || user.location || t('profile.hero.defaultMeetRegion');
  const bio = user.bio || t('profile.hero.defaultBio');

  return (
    <div className="px-4 pt-3 pb-2">
      <div
        className="overflow-hidden"
        style={{
          borderRadius: 28,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 28px 80px rgba(0,0,0,0.34)',
        }}
      >
        <div className="relative" style={{ height: 230, overflow: 'hidden' }}>
          {user.coverImageUrl ? (
            <img src={user.coverImageUrl} alt="cover" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background:
                  'radial-gradient(circle at top left, rgba(255,186,102,0.18) 0%, transparent 30%), linear-gradient(180deg, rgba(36,39,59,0.2) 0%, rgba(12,14,22,0.12) 100%), linear-gradient(135deg, #3a2a21 0%, #1b2132 42%, #090b12 100%)',
              }}
            />
          )}

          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(10,11,16,0.08) 10%, rgba(10,11,16,0.62) 66%, #0A0B10 100%)' }}
          />

          <div className="absolute left-1/2 top-4 -translate-x-1/2">
            {user.openToMeet ? (
              <div
                className="flex items-center gap-2 rounded-full px-3.5 py-2"
                style={{
                  background: 'rgba(28,30,34,0.58)',
                  border: '1px solid rgba(255,214,134,0.14)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 12px rgba(74,222,128,0.9)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,214,134,0.92)', fontWeight: 700 }}>{t('profile.hero.openToMeet')}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.86)' }}>{t('profile.hero.currentlyIn', { region: meetLabel })}</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 rounded-full px-3.5 py-2"
                style={{
                  background: 'rgba(28,30,34,0.58)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <Sparkles size={13} style={{ color: 'var(--accent-gold)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.84)', fontWeight: 600 }}>{t('profile.hero.identityHub')}</span>
              </div>
            )}
          </div>

          {isOwnProfile && (
            <button
              onClick={onEdit}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: 'rgba(10,11,16,0.5)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(12px)',
              }}
              aria-label={t('profile.actions.edit')}
            >
              <Edit3 size={15} style={{ color: 'var(--text-primary)' }} />
            </button>
          )}
        </div>

        <div className="relative px-5 pb-6">
          <div className="flex flex-col items-center" style={{ marginTop: -46 }}>
            <div
              className="relative"
              style={{
                width: 92,
                height: 92,
                borderRadius: '50%',
                padding: 3,
                background: 'linear-gradient(135deg, rgba(255,227,157,0.95) 0%, rgba(200,168,78,0.98) 100%)',
                boxShadow: '0 18px 36px rgba(0,0,0,0.35)',
              }}
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.88)', background: 'var(--surface-2)' }}>
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full font-bold"
                    style={{
                      background: 'radial-gradient(circle at top, rgba(124,231,214,0.18) 0%, rgba(255,255,255,0.02) 55%), #151923',
                      color: 'var(--accent-gold)',
                      fontSize: 30,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-center">
              <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{displayName}</h2>
              {user.location && (
                <div className="mt-2 flex items-center justify-center gap-1.5" style={{ color: 'var(--accent-gold)' }}>
                  <MapPin size={13} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user.location}</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-full px-3 py-1"
                  style={{
                    background: 'rgba(255,214,134,0.05)',
                    border: '1px solid rgba(255,214,134,0.22)',
                    color: 'rgba(255,234,184,0.92)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                  }}
                >
                  {normalizeLanguage(lang)}
                </span>
              ))}
            </div>

            <p
              className="mt-4 max-w-md text-center"
              style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}
            >
              {bio}
            </p>

            {badges.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-5">
                {badges.map((badge) => (
                  <div key={badge.key} className="flex flex-col items-center gap-2">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        background: 'radial-gradient(circle at top, rgba(255,237,186,0.2) 0%, rgba(200,168,78,0.08) 45%, rgba(20,22,30,0.92) 100%)',
                        border: '1px solid rgba(200,168,78,0.4)',
                        color: 'var(--accent-gold)',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.24)',
                      }}
                    >
                      {badge.icon}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{t(badge.labelKey)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex w-full flex-wrap gap-2">
              {!isOwnProfile ? (
                <>
                  <button className="tg-btn-ghost flex-1" style={{ minWidth: 96, padding: '10px 12px', fontSize: 13 }} onClick={onFollow}>
                    <span className="inline-flex items-center gap-1.5"><UserPlus size={14} />{t('profile.actions.follow')}</span>
                  </button>
                  <button className="tg-btn-ghost flex-1" style={{ minWidth: 96, padding: '10px 12px', fontSize: 13 }} onClick={onChat}>
                    <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} />{t('profile.actions.chat')}</span>
                  </button>
                  <button className="tg-btn-primary flex-1" style={{ minWidth: 120, padding: '10px 12px', fontSize: 13 }} onClick={onMeet}>
                    <span className="inline-flex items-center gap-1.5"><HeartHandshake size={14} />{t('profile.actions.meet')}</span>
                  </button>
                </>
              ) : (
                <button className="tg-btn-ghost w-full" style={{ padding: '11px 16px', fontSize: 13 }} onClick={onEdit}>
                  {t('profile.actions.editProfile')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
