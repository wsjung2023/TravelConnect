import { MapPin, Home, MessageCircle, User, Plus } from "lucide-react";

interface BottomNavigationProps {
  activeTab: 'map' | 'feed' | 'chat' | 'profile';
  onTabChange: (tab: 'map' | 'feed' | 'chat' | 'profile') => void;
  onCreatePost: () => void;
}

export default function BottomNavigation({ activeTab, onTabChange, onCreatePost }: BottomNavigationProps) {
  const tabs = [
    { id: 'map', icon: MapPin, label: '지도' },
    { id: 'feed', icon: Home, label: '피드' },
    { id: 'chat', icon: MessageCircle, label: '채팅' },
    { id: 'profile', icon: User, label: '프로필' },
  ];

  return (
    <div className="mobile-nav">
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
              
              {/* Create Post Button between Feed and Chat */}
              {index === 1 && (
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
    </div>
  );
}