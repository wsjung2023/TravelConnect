// AppBottomNav — v3 하단 5탭 내비게이션 (mint glow, 72px, safe-area 지원)
import type { ElementType } from 'react';
import { Compass, MapPin, MessageCircle, Sparkles, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { AppTab } from '@/constants/navigation';

interface AppBottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

interface TabDef {
  id: AppTab;
  label: string;
  Icon: ElementType;
}

const TABS: TabDef[] = [
  { id: 'map',     label: '지도',   Icon: MapPin },
  { id: 'explore', label: '탐색',   Icon: Compass },
  { id: 'meet',    label: '만나기', Icon: Sparkles },
  { id: 'chat',    label: '채팅',   Icon: MessageCircle },
  { id: 'profile', label: '나',     Icon: User },
];

export default function AppBottomNav({ activeTab, onTabChange }: AppBottomNavProps) {
  const { user } = useAuth();

  return (
    <nav
      id="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30"
      style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--stroke)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[72px] px-1">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const isMeet = id === 'meet';
          const activeColor = 'var(--accent-mint)';
          const inactiveColor = 'var(--text-secondary)';

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              data-testid={`tab-${id}`}
              className="flex flex-col items-center justify-center gap-[3px] flex-1 h-full"
              style={{ color: isActive ? activeColor : inactiveColor }}
            >
              {isMeet ? (
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
                  style={
                    isActive
                      ? {
                          background: 'rgba(124,231,214,0.15)',
                          boxShadow: '0 0 0 2.5px var(--accent-mint), 0 0 14px rgba(124,231,214,0.35)',
                          color: 'var(--accent-mint)',
                        }
                      : {
                          boxShadow: '0 0 0 1.5px rgba(124,231,214,0.25)',
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  <Icon size={22} />
                </span>
              ) : id === 'profile' && user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="나"
                  className="w-6 h-6 rounded-full object-cover transition-all duration-200"
                  style={
                    isActive
                      ? { outline: '2px solid var(--accent-mint)', outlineOffset: '1px' }
                      : undefined
                  }
                />
              ) : (
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              )}
              <span style={{ fontSize: '11px', lineHeight: 1, fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
