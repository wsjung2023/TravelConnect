import { Compass, MapPin, MessageCircle, Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import { APP_TABS, type AppTab } from '@/constants/navigation';

interface BottomNavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  hidden?: boolean;
}

const ICONS: Record<AppTab, any> = {
  map: MapPin,
  explore: Compass,
  meet: Sparkles,
  chat: MessageCircle,
  profile: User,
};

export default function BottomNavigation({ activeTab, onTabChange, hidden }: BottomNavigationProps) {
  const { t } = useTranslation('ui');
  const { user } = useAuth();

  return (
    <nav
      id="bottom-nav"
      className={clsx('app-tabbar fixed inset-x-0 bottom-0 z-30 border-t', hidden && 'pointer-events-none opacity-0')}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around py-2 px-4">
        {APP_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          const isActive = activeTab === tab.id;
          const isMeet = tab.id === 'meet';

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx('nav-btn', isActive && 'active', isMeet && 'meet')}
              data-testid={`tab-${tab.id}`}
            >
              {tab.id === 'profile' && user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="profile" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <Icon size={isMeet ? 22 : 20} />
              )}
              <span className="text-xs">{t(tab.labelKey, tab.id)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
