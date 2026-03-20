// 만나기 탭 페이지 — 레이더 + 필터 + 유저 카드 목록 (v4)
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

import MeetTopBar from '@/components/meet/MeetTopBar';
import MeetStatusBanner from '@/components/meet/MeetStatusBanner';
import MeetRadar from '@/components/meet/MeetRadar';
import MeetFilterRow, { type MeetFilter } from '@/components/meet/MeetFilterRow';
import MeetUserList from '@/components/meet/MeetUserList';

export default function MeetPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation('ui');
  const [activeFilter, setActiveFilter] = useState<MeetFilter>('now');

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
        body: JSON.stringify({ targetUserId, initialMessage: t('meet.helloInitialMessage') }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      navigate(`/chat?conversationId=${data.id}`);
    },
    onError: () => {
      toast({ title: t('meet.helloFailed'), variant: 'destructive' });
    },
  });

  const [isScrollingToBanner, setIsScrollingToBanner] = useState(false);

  const filteredUsers = openUsers.filter((u: any) => {
    if (activeFilter === 'now') return true;
    const activity = (u.currentActivity ?? u.interests?.[0] ?? '').toLowerCase();
    const map: Record<MeetFilter, string> = {
      now: '',
      oneHour: '',
      within2km: '',
      dinner: 'dinner',
      walk: 'walk',
      langExchange: 'lang',
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
      <MeetTopBar
        isOpen={isOpen}
        onToggle={() => {
          setIsScrollingToBanner(true);
          document.getElementById('meet-status-banner')?.scrollIntoView({ behavior: 'smooth' });
          setTimeout(() => setIsScrollingToBanner(false), 600);
        }}
        isPending={isScrollingToBanner}
      />

      <div className="px-4 pt-2">
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t('meet.sections.radar')}
        </p>
      </div>

      <MeetRadar users={openUsers.slice(0, 5)} />

      <div className="px-4 -mt-2 mb-3">
        <div
          className="rounded-[24px] p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(25,28,36,0.96), rgba(18,20,28,0.98))',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p style={{ color: 'var(--accent-gold)', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em' }}>{t('meet.hero.eyebrow')}</p>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
                {t('meet.hero.title')}
              </h2>
            </div>
            <div className="rounded-full p-2 shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-mint)' }}>
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('meet.hero.nearby', { count: filteredUsers.length })}</span>
            <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('meet.hero.fastHello')}</span>
            <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('meet.hero.localContext')}</span>
          </div>
        </div>
      </div>

      <MeetFilterRow active={activeFilter} onChange={setActiveFilter} />

      <div id="meet-status-banner">
        <MeetStatusBanner />
      </div>

      <div className="px-4 pt-1 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('meet.sections.travelers')}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{t('meet.travelersHint')}</p>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{filteredUsers.length}</span>
        </div>
      </div>

      <MeetUserList
        users={filteredUsers}
        isLoading={isLoading}
        onHello={(userId) => helloMutation.mutate(userId)}
        onViewProfile={(userId) => navigate(`/profile?userId=${userId}`)}
      />
    </div>
  );
}
