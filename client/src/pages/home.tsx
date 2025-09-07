import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import MapComponent from '@/components/MapComponent';

import SearchHeader from '@/components/SearchHeader';
import NotificationBell from '@/components/NotificationBell';
import Feed from '@/pages/feed';
import TimelinePage from '@/pages/timeline';
import Chat from '@/pages/chat';
import Profile from '@/pages/profile';
import BottomNavigation from '@/components/BottomNavigation';
import { JourneyCreateModal } from '@/components/JourneyCreateModal';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<
    'map' | 'feed' | 'chat' | 'profile' | 'timeline'
  >('map');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<any>(null);

  // 전역 함수로 모달 열기 (지도 클릭 시 사용) 및 홈 네비게이션 처리
  useEffect(() => {
    (window as any).openJourneyModal = (location: any) => {
      setPrefilledLocation(location);
      setShowCreatePost(true);
    };

    // 홈 네비게이션 메시지 리스너
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate-home') {
        setActiveTab('map');
      } else if (event.data.type === 'navigate-timeline') {
        console.log('타임라인 탭으로 이동');
        setActiveTab('timeline');
      } else if (event.data.type === 'open-timeline-modal') {
        console.log('타임라인 생성 모달 직접 열기');
        setActiveTab('timeline');
        // 타임라인 페이지의 모달 열기 함수 호출 (피드에서 왔다고 표시)
        setTimeout(() => {
          if ((window as any).openTimelineModal) {
            (window as any).openTimelineModal(true); // fromFeed = true
          }
        }, 100);
      } else if (event.data.type === 'timeline-created-return-to-feed') {
        console.log('타임라인 생성 완료, 피드로 돌아가기');
        setActiveTab('map');
        // 피드 모달 다시 열기
        setTimeout(() => {
          setShowCreatePost(true);
        }, 100);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      delete (window as any).openJourneyModal;
      window.removeEventListener('message', handleMessage);
    };
  }, []);

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
        return (
          <MapComponent
            className="w-full h-full"
            onCreatePost={(location) => {
              setPrefilledLocation(location || null);
              setShowCreatePost(true);
            }}
          />
        );
      case 'feed':
        return <Feed />;
      case 'timeline':
        return <TimelinePage />;
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
      <header
        className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30"
        style={{ width: '100%' }}
      >
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

          {/* Admin 전용 버튼들 */}
          {user?.role === 'admin' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/config')}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Configuration Panel"
                data-testid="button-config-panel"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </Button>
              <button
                onClick={() => window.open('/db-admin', '_blank')}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="DB Admin 도구"
                data-testid="button-db-admin"
              >
                <i className="fas fa-database text-gray-600"></i>
              </button>
            </>
          )}

          <button
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.reload();
            }}
            title="로그아웃"
            data-testid="button-logout"
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
      <div
        style={{
          position: 'absolute',
          top: activeTab === 'map' ? '144px' : '80px', // 검색바 있을 때 높이 조정
          left: 0,
          right: 0,
          bottom: '80px',
          overflow: 'hidden',
          width: '100%',
          height:
            activeTab === 'map' ? 'calc(100vh - 224px)' : 'calc(100vh - 160px)',
        }}
      >
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
          onClose={() => {
            setShowCreatePost(false);
            setPrefilledLocation(null);
          }}
          prefilledLocation={prefilledLocation}
        />
      )}
    </div>
  );
}
