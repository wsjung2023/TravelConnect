// AppShell — 인증된 앱의 단일 쉘: content slot + AppBottomNav, --app-bg 배경
import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
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

export default function AppShell() {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AppTab>(pathToTab(location));

  useEffect(() => {
    setActiveTab(pathToTab(location));
  }, [location]);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'explore': return <Feed />;
      case 'meet':    return <Meet />;
      case 'chat':    return <ChatPage />;
      case 'profile': return <Profile />;
      case 'map':
      default:        return <Home />;
    }
  }, [activeTab]);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    navigate(TAB_PATHS[tab]);
  };

  return (
    <div
      className="mobile-container relative min-h-screen"
      style={{ background: 'var(--app-bg)' }}
    >
      <div style={{ paddingBottom: 'calc(78px + env(safe-area-inset-bottom))' }}>
        <Suspense fallback={<TabSpinner />}>
          {content}
        </Suspense>
      </div>
      <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
