import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import SearchHeader from '@/components/SearchHeader';
import NotificationBell from '@/components/NotificationBell';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import BottomNavigation from '@/components/BottomNavigation';
import { JourneyCreateModal } from '@/components/JourneyCreateModal';
import CreatePostModal from '@/components/CreatePostModal';
import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';

// Direct import MapComponent to fix hook errors, keep others lazy
import MapComponent from '@/components/MapComponent';

// Lazy load other heavy components
const Feed = lazy(() => import('@/pages/feed'));
const TimelinePage = lazy(() => import('@/pages/timeline'));
const Chat = lazy(() => import('@/pages/chat'));
const Profile = lazy(() => import('@/pages/profile'));

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation(['ui']);
  const [activeTab, setActiveTab] = useState<
    'map' | 'feed' | 'chat' | 'profile' | 'timeline'
  >('map');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState<{
    lat: number;
    lng: number;
    name?: string;
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

  // Simple loading component for home tabs
  const TabLoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'map':
        return (
          <MapComponent
            className="w-full h-full"
            onCreatePost={(location) => {
              if (location) {
                setPrefilledLocation({
                  lat: location.latitude,
                  lng: location.longitude,
                  name: location.name
                });
              } else {
                setPrefilledLocation(null);
              }
              setShowCreatePost(true);
            }}
          />
        );
      case 'feed':
        return (
          <Suspense fallback={<TabLoadingSpinner />}>
            <Feed onBack={() => setActiveTab('map')} />
          </Suspense>
        );
      case 'timeline':
        return (
          <Suspense fallback={<TabLoadingSpinner />}>
            <TimelinePage />
          </Suspense>
        );
      case 'chat':
        return (
          <Suspense fallback={<TabLoadingSpinner />}>
            <Chat />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<TabLoadingSpinner />}>
            <Profile />
          </Suspense>
        );
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
        <button 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          onClick={() => setActiveTab('map')}
          data-testid="logo-home-button"
        >
          <div className="w-8 h-8 travel-gradient rounded-full flex items-center justify-center">
            <i className="fas fa-globe text-white text-sm"></i>
          </div>
          <div className="text-left">
            <h1 className="font-bold text-dark">{t('ui:homePage.appName')}</h1>
            <p className="text-xs text-gray-500">{t('ui:homePage.exploreWorld')}</p>
          </div>
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationBell />
          <LanguageSwitcher />

          {/* Admin 전용 버튼들 */}
          {user?.role === 'admin' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/config')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full"
                title={t('ui:homePage.configPanel')}
                data-testid="button-config-panel"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </Button>
            </>
          )}

          <button
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full flex items-center justify-center"
            onClick={() => {
              // localStorage 지우기
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              // 서버 로그아웃 API 호출
              window.location.href = '/api/logout';
            }}
            title={t('ui:homePage.logout')}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 text-gray-600" />
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
        onTabChange={(tab) => {
          if (tab === 'feed') {
            navigate('/feed');
          } else if (tab === 'chat') {
            navigate('/chat');
          } else if (tab === 'profile') {
            navigate('/profile');
          } else if (tab === 'timeline') {
            navigate('/timeline');
          } else {
            setActiveTab(tab);
          }
        }}
        onCreatePost={() => setShowCreatePost(true)}
      />

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal
          isOpen={showCreatePost}
          onClose={() => {
            setShowCreatePost(false);
            setPrefilledLocation(null);
          }}
          location={prefilledLocation}
        />
      )}
    </div>
  );
}
