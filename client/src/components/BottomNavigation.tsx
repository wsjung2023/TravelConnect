import {
  MapPin,
  Home,
  MessageCircle,
  User,
  Plus,
  Calendar,
} from 'lucide-react';
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
  const tabs = [
    { id: 'map', icon: MapPin, label: '지도' },
    { id: 'feed', icon: Home, label: '피드' },
    { id: 'timeline', icon: Calendar, label: '타임라인' },
    { id: 'chat', icon: MessageCircle, label: '채팅' },
    { id: 'profile', icon: User, label: '프로필' },
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
