// AppBottomNav — premium glass 5-tab nav with gold active state and mint meet beacon.
import type { ElementType } from 'react';
import { Compass, MapPin, MessageCircle, Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import type { AppTab } from '@/constants/navigation';

interface AppBottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

interface TabDef {
  id: AppTab;
  labelKey: string;
  Icon: ElementType;
}

const TABS: TabDef[] = [
  { id: 'map', labelKey: 'navigation.map', Icon: MapPin },
  { id: 'explore', labelKey: 'navigation.explore', Icon: Compass },
  { id: 'meet', labelKey: 'navigation.meet', Icon: Sparkles },
  { id: 'chat', labelKey: 'navigation.chat', Icon: MessageCircle },
  { id: 'profile', labelKey: 'navigation.profile', Icon: User },
];

export default function AppBottomNav({ activeTab, onTabChange }: AppBottomNavProps) {
  const { t } = useTranslation('ui');
  const { user } = useAuth();

  return (
    <nav
      id="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'linear-gradient(180deg, rgba(17,19,26,0.72), rgba(12,13,18,0.95))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 -12px 32px rgba(0,0,0,0.42)',
      }}
    >
      <div className="flex items-center justify-around h-[78px] px-2">
        {TABS.map(({ id, labelKey, Icon }) => {
          const isActive = activeTab === id;
          const isMeet = id === 'meet';
          const isProfile = id === 'profile';

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              data-testid={`tab-${id}`}
              type="button"
              aria-pressed={isActive}
              className="flex flex-col items-center justify-center gap-[5px] flex-1 h-full relative transition-transform duration-200"
              style={{
                color: isActive ? 'var(--accent-gold)' : 'rgba(181, 186, 205, 0.72)',
                transform: isActive ? 'translateY(-1px)' : 'none',
              }}
            >
              {isMeet ? (
                <span
                  className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 relative"
                  style={
                    isActive
                      ? {
                          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), rgba(124,231,214,0.1) 35%, rgba(18,20,29,0.92) 72%)',
                          boxShadow: '0 0 0 1.5px rgba(124,231,214,0.9), 0 0 16px rgba(124,231,214,0.34), 0 0 30px rgba(124,231,214,0.18)',
                          color: 'var(--accent-mint)',
                        }
                      : {
                          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(25,27,36,0.94) 70%)',
                          boxShadow: '0 0 0 1px rgba(124,231,214,0.22)',
                          color: 'rgba(181, 186, 205, 0.78)',
                        }
                  }
                >
                  <span
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '999px',
                      opacity: isActive ? 1 : 0.45,
                      boxShadow: isActive ? '0 0 28px rgba(124,231,214,0.22)' : 'none',
                    }}
                  />
                  <Icon size={21} />
                </span>
              ) : isProfile && user?.profileImageUrl ? (
                <span
                  className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, rgba(230,201,137,0.26), rgba(230,201,137,0.04))',
                          boxShadow: '0 0 0 1px rgba(230,201,137,0.28)',
                        }
                      : undefined
                  }
                >
                  <img
                    src={user.profileImageUrl}
                    alt={t(labelKey)}
                    className="w-7 h-7 rounded-full object-cover transition-all duration-200"
                    style={
                      isActive
                        ? {
                            outline: '2px solid var(--accent-gold)',
                            outlineOffset: '2px',
                            boxShadow: '0 0 18px rgba(230,201,137,0.28)',
                          }
                        : { opacity: 0.88 }
                    }
                  />
                </span>
              ) : (
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, rgba(230,201,137,0.18), rgba(230,201,137,0.03))',
                          boxShadow: '0 0 0 1px rgba(230,201,137,0.16)',
                        }
                      : undefined
                  }
                >
                  <Icon size={21} strokeWidth={isActive ? 2.25 : 1.85} />
                </span>
              )}

              <span
                style={{
                  fontSize: '11px',
                  lineHeight: 1,
                  fontWeight: isActive ? 650 : 520,
                  letterSpacing: '-0.01em',
                  opacity: isActive ? 1 : 0.82,
                }}
              >
                {t(labelKey)}
              </span>

              {isActive && !isMeet && (
                <span
                  style={{
                    position: 'absolute',
                    top: 9,
                    width: isProfile ? 30 : 26,
                    height: 1.5,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, rgba(230,201,137,0), rgba(230,201,137,1), rgba(230,201,137,0))',
                    boxShadow: '0 0 10px rgba(230,201,137,0.35)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
