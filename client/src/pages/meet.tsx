// 만나기 탭 페이지 — 레이더 + 필터 + 유저 카드 목록 (v3)
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import MeetTopBar from '@/components/meet/MeetTopBar';
import MeetStatusBanner from '@/components/meet/MeetStatusBanner';
import MeetRadar from '@/components/meet/MeetRadar';
import MeetFilterRow, { type MeetFilter } from '@/components/meet/MeetFilterRow';
import MeetUserList from '@/components/meet/MeetUserList';

export default function MeetPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<MeetFilter>('지금');

  // Existing data hooks — untouched
  const { data: openUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/users/open'],
  });

  const { data: openStatus } = useQuery<any>({
    queryKey: ['/api/profile/open'],
    refetchInterval: 60000,
  });

  const isOpen = openStatus?.openToMeet ?? false;

  const helloMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiRequest('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, initialMessage: 'Hi there! 👋' }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      navigate(`/chat?conversationId=${data.id}`);
    },
    onError: () => {
      toast({ title: '인사 전송 실패', variant: 'destructive' });
    },
  });

  const [isScrollingToBanner, setIsScrollingToBanner] = useState(false);

  // Simple client-side filter by activity/intent keyword
  const filteredUsers = openUsers.filter((u: any) => {
    if (activeFilter === '지금') return true;
    const activity = (u.currentActivity ?? u.interests?.[0] ?? '').toLowerCase();
    const map: Record<MeetFilter, string> = {
      '지금': '',
      '1시간': '',
      '2km': '',
      '저녁': 'dinner',
      '산책': 'walk',
      '언어교환': 'lang',
    };
    return activity.includes(map[activeFilter] ?? activeFilter.toLowerCase());
  });

  return (
    <div
      style={{
        height: 'calc(100vh - 72px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--app-bg)',
      }}
    >
      {/* Top bar: title + online/offline toggle pill */}
      <MeetTopBar
        isOpen={isOpen}
        onToggle={() => {
          setIsScrollingToBanner(true);
          document.getElementById('meet-status-banner')?.scrollIntoView({ behavior: 'smooth' });
          setTimeout(() => setIsScrollingToBanner(false), 600);
        }}
        isPending={isScrollingToBanner}
      />

      {/* Radar visualization */}
      <MeetRadar users={openUsers.slice(0, 5)} />

      {/* Filter chips */}
      <MeetFilterRow active={activeFilter} onChange={setActiveFilter} />

      {/* Status banner — open-to-meet toggle */}
      <div id="meet-status-banner">
        <MeetStatusBanner />
      </div>

      {/* User card list */}
      <MeetUserList
        users={filteredUsers}
        isLoading={isLoading}
        onHello={(userId) => helloMutation.mutate(userId)}
        onViewProfile={(userId) => navigate(`/profile?userId=${userId}`)}
      />
    </div>
  );
}
