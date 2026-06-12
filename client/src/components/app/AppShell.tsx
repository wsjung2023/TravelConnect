// AppShell — 인증된 앱의 단일 쉘: 모든 탭을 항상 마운트하고 CSS display로 전환한다.
// 이전: useMemo로 탭 교체 → Google Maps 재초기화, 탭 상태 유실
// 현재: CSS display none/block → 지도·피드·채팅 상태 유지, 재초기화 없음
import { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation } from 'wouter';
import AppBottomNav from '@/components/app/AppBottomNav';
import type { AppTab } from '@/constants/navigation';

const Home    = lazy(() => import('@/pages/home'));
const Feed    = lazy(() => import('@/pages/feed'));
const Meet    = lazy(() => import('@/pages/meet'));
const ChatPage = lazy(() => import('@/pages/chat'));
const Profile = lazy(() => import('@/pages/profile'));

const TabSpinner = () => (
  <div className="flex items-center justify-center h-32">
    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: 'var(--accent-mint)', borderTopColor: 'transparent' }} />
  </div>
);

const pathToTab = (path: string): AppTab => {
  if (path.startsWith('/feed') || path.startsWith('/explore')) return 'explore';
  if (path.startsWith('/meet')) return 'meet';
  if (path.startsWith('/chat') || path.startsWith('/conversations')) return 'chat';
  if (
    path.startsWith('/profile') ||
    path.startsWith('/timeline') ||
    path === '/me'
  ) return 'profile';
  return 'map';
};

const TAB_PATHS: Record<AppTab, string> = {
  map:     '/',
  explore: '/feed',
  meet:    '/meet',
  chat:    '/chat',
  profile: '/profile',
};

// 탭별 CSS display 스타일: 활성 탭만 보이고 나머지는 숨긴다.
// 컴포넌트는 언마운트되지 않으므로 Google Maps, 채팅, 피드 상태가 유지된다.
const tabStyle = (active: boolean): React.CSSProperties => ({
  display: active ? 'block' : 'none',
  height: '100%',
});

export default function AppShell() {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AppTab>(pathToTab(location));
  // 한 번이라도 활성화된 탭만 마운트 (초기 로딩 비용 분산)
  const [mountedTabs, setMountedTabs] = useState<Set<AppTab>>(
    new Set([pathToTab(location)])
  );

  useEffect(() => {
    const tab = pathToTab(location);
    setActiveTab(tab);
    setMountedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [location]);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    setMountedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    navigate(TAB_PATHS[tab]);
  };

  return (
    <div
      className="mobile-container relative min-h-screen"
      style={{ background: 'var(--app-bg)' }}
    >
      <div style={{ paddingBottom: 'calc(78px + env(safe-area-inset-bottom))' }}>
        <Suspense fallback={<TabSpinner />}>
          {mountedTabs.has('map') && (
            <div style={tabStyle(activeTab === 'map')}>
              <Home />
            </div>
          )}
          {mountedTabs.has('explore') && (
            <div style={tabStyle(activeTab === 'explore')}>
              <Feed />
            </div>
          )}
          {mountedTabs.has('meet') && (
            <div style={tabStyle(activeTab === 'meet')}>
              <Meet />
            </div>
          )}
          {mountedTabs.has('chat') && (
            <div style={tabStyle(activeTab === 'chat')}>
              <ChatPage />
            </div>
          )}
          {mountedTabs.has('profile') && (
            <div style={tabStyle(activeTab === 'profile')}>
              <Profile />
            </div>
          )}
        </Suspense>
      </div>
      <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
