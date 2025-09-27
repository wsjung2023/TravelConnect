import {
  MapPin,
  Home,
  MessageCircle,
  User,
  Plus,
  Calendar,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface BottomNavigationProps {
  activeTab: 'map' | 'feed' | 'chat' | 'profile' | 'timeline';
  onTabChange: (tab: 'map' | 'feed' | 'chat' | 'profile' | 'timeline') => void;
  onCreatePost: () => void;
  hidden?: boolean;
}

export default function BottomNavigation({
  activeTab,
  onTabChange,
  onCreatePost,
  hidden,
}: BottomNavigationProps) {
  const { t } = useTranslation('ui');
  const tabs = [
    { id: 'map', icon: MapPin, label: t('navigation.map') },
    { id: 'feed', icon: Home, label: t('navigation.feed') },
    { id: 'timeline', icon: Calendar, label: t('navigation.timeline') },
    { id: 'chat', icon: MessageCircle, label: t('navigation.chat') },
    { id: 'profile', icon: User, label: t('navigation.profile') },
  ];

  return (
    <nav
      id="bottom-nav"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-30 bg-white/90 backdrop-blur border-t", // z-30 (모달보다 낮음)
        hidden && "pointer-events-none opacity-0"
      )}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around py-2 px-4">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <div key={tab.id} className="flex items-center">
              <button
                onClick={() => onTabChange(tab.id as any)}
                className={`nav-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span className="text-xs">{tab.label}</span>
              </button>

              {/* Create Post Button between Timeline and Chat */}
              {index === 2 && (
                <button
                  onClick={onCreatePost}
                  className="flex flex-col items-center gap-1 p-2 mx-2"
                >
                  <div className="w-12 h-12 travel-gradient rounded-full flex items-center justify-center shadow-lg">
                    <Plus size={24} className="text-white" />
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
