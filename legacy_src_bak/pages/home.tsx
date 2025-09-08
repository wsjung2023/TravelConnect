import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import MapComponent from "@/components/MapComponent";

import SearchHeader from "@/components/SearchHeader";
import NotificationBell from "@/components/NotificationBell";
import Feed from "@/pages/feed";
import Chat from "@/pages/chat";
import Profile from "@/pages/profile";
import BottomNavigation from "@/components/BottomNavigation";
import { JourneyCreateModal } from "@/components/JourneyCreateModal";

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'map' | 'feed' | 'chat' | 'profile'>('map');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const mapRef = useRef<any>(null);

  const handleLocationSearch = (query: string) => {
    console.log('장소 검색:', query);
    if ((window as any).mapLocationSearch) {
      (window as any).mapLocationSearch(query);
    }
  };

  const handleContentSearch = (query: string) => {
    console.log('컨텐츠 검색:', query);
    if ((window as any).mapContentSearch) {
      (window as any).mapContentSearch(query);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'map':
        return <MapComponent className="w-full h-full" />;
      case 'feed':
        return <Feed />;
      case 'chat':
        return <Chat />;
      case 'profile':
        return <Profile />;
      default:
        return <MapComponent />;
    }
  };

  return (
    <div className="mobile-container" style={{ position: 'relative' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30" style={{ width: '100%' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 travel-gradient rounded-full flex items-center justify-center">
            <i className="fas fa-globe text-white text-sm"></i>
          </div>
          <div>
            <h1 className="font-bold text-dark">Tourgether</h1>
            <p className="text-xs text-gray-500">Explore the world</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button 
            onClick={() => window.location.href = '/admin'}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="데이터베이스 관리"
          >
            📊
          </button>
          <button 
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => window.location.href = '/api/logout'}
          >
            <i className="fas fa-sign-out-alt text-gray-600"></i>
          </button>
        </div>
      </header>

      {/* Search Header - 지도 탭에서만 표시 */}
      {activeTab === 'map' && (
        <SearchHeader 
          onLocationSearch={handleLocationSearch}
          onContentSearch={handleContentSearch}
        />
      )}

      {/* Tab Content */}
      <div style={{ 
        position: 'absolute',
        top: activeTab === 'map' ? '144px' : '80px', // 검색바 있을 때 높이 조정
        left: 0,
        right: 0,
        bottom: '80px',
        overflow: 'hidden',
        width: '100%',
        height: activeTab === 'map' ? 'calc(100vh - 224px)' : 'calc(100vh - 160px)'
      }}>
        {renderActiveTab()}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreatePost={() => setShowCreatePost(true)}
      />

      {/* Journey Create Modal */}
      {showCreatePost && (
        <JourneyCreateModal 
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
        />
      )}
    </div>
  );
}
