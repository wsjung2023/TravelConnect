import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import BottomNavigation from '@/components/BottomNavigation';
import Home from '@/pages/home';
import Feed from '@/pages/feed';
import MeetPage from '@/pages/meet';
import Chat from '@/pages/chat';
import Profile from '@/pages/profile';
import type { AppTab } from '@/constants/navigation';

const pathToTab = (path: string): AppTab => {
  if (path.startsWith('/feed')) return 'explore';
  if (path.startsWith('/meet')) return 'meet';
  if (path.startsWith('/chat')) return 'chat';
  if (path.startsWith('/profile')) return 'profile';
  return 'map';
};

export default function AppShell() {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AppTab>(pathToTab(location));

  useEffect(() => {
    setActiveTab(pathToTab(location));
  }, [location]);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'explore':
        return <Feed />;
      case 'meet':
        return <MeetPage />;
      case 'chat':
        return <Chat />;
      case 'profile':
        return <Profile />;
      case 'map':
      default:
        return <Home />;
    }
  }, [activeTab]);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'map') navigate('/');
    if (tab === 'explore') navigate('/feed');
    if (tab === 'meet') navigate('/meet');
    if (tab === 'chat') navigate('/chat');
    if (tab === 'profile') navigate('/profile');
  };

  return (
    <div className="mobile-container relative min-h-screen">
      <div className="pb-20">{content}</div>
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
