// @ts-nocheck
// 프로필 페이지 (v3) — Me/Profile 탭, 기존 API 훅/데이터 로직 유지
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { MapPin, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import HelpRequestForm from '@/components/HelpRequestForm';
import CreateExperienceModal from '@/components/CreateExperienceModal';
import TimelineCreateModal from '@/components/TimelineCreateModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import type { Post, Trip, Experience } from '@shared/schema';
import { Seo } from '@/components/Seo';
import { useTranslation } from 'react-i18next';
import PostDetailModal from '@/components/PostDetailModal';
import SeoLinkCards from '@/components/seo/SeoLinkCards';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileLanguages from '@/components/profile/ProfileLanguages';
import ProfileActivities from '@/components/profile/ProfileActivities';
import ProfileSettingsSection from '@/components/profile/ProfileSettingsSection';
import SavedPostsTab from '@/components/profile/SavedPostsTab';

export default function Profile() {
  const { user: currentUser } = useAuth();
  const searchParams = new URLSearchParams(useSearch());
  const viewingUserId = searchParams.get('userId');
  const isViewingOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;

  const [activeTab, setActiveTab] = useState('posts');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { t } = useTranslation('ui');

  const { data: profileUser } = useQuery({
    queryKey: ['/api/users', viewingUserId],
    queryFn: async () => {
      if (!viewingUserId) return currentUser;
      const response = await fetch(`/api/users/${viewingUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return response.json();
    },
    enabled: !!viewingUserId,
  });

  const user = viewingUserId ? profileUser : currentUser;

  const [showHelpRequestForm, setShowHelpRequestForm] = useState(false);
  const [showCreateExperienceModal, setShowCreateExperienceModal] = useState(false);
  const [showTimelineCreateModal, setShowTimelineCreateModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [openMeetRegion] = useState('강남구');
  const [openMeetHours] = useState(12);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [portfolioSwitchChecked, setPortfolioSwitchChecked] = useState(false);
  const [publicProfileUrl, setPublicProfileUrl] = useState('');

  useEffect(() => {
    setSwitchChecked(user?.openToMeet || false);
  }, [user?.openToMeet]);

  useEffect(() => {
    setPortfolioSwitchChecked(user?.portfolioMode || false);
    setPublicProfileUrl(user?.publicProfileUrl || '');
  }, [user?.portfolioMode, user?.publicProfileUrl]);

  const applyHostMutation = useMutation({
    mutationFn: async () => api('/api/user/apply-host', { method: 'POST' }),
    onSuccess: () => {
      toast({ title: t('profile.hostApplySuccess'), description: t('profile.hostApplySuccessDesc') });
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: () => {
      toast({ title: t('profile.hostApplyError'), description: t('profile.hostApplyErrorDesc'), variant: 'destructive' });
    },
  });

  const createTripMutation = useMutation({
    mutationFn: async (tripData: any) => api('/api/trips', { method: 'POST', body: tripData }),
    onSuccess: () => {
      toast({ title: t('timeline.createSuccess'), description: t('timeline.createSuccessDesc') });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setShowTimelineCreateModal(false);
    },
    onError: () => {
      toast({ title: t('timeline.createError'), description: t('timeline.createErrorDesc'), variant: 'destructive' });
    },
  });

  const toggleOpenToMeetMutation = useMutation({
    mutationFn: async ({ open, region, hours }: { open: boolean; region?: string; hours?: number }) =>
      api('/api/profile/open', { method: 'PATCH', body: { open, region, hours } }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: AUTH_QUERY_KEY });
      return { previousUser: queryClient.getQueryData(AUTH_QUERY_KEY) };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/open'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/open'] });
      setTimeout(() => queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY }), 100);
      toast({
        title: t('profile.meetStatusChanged'),
        description: variables.open
          ? t('profile.meetActivated', { hours: openMeetHours, region: openMeetRegion })
          : t('profile.meetDeactivated'),
      });
    },
    onError: (_, __, context) => {
      setSwitchChecked(user?.openToMeet || false);
      if (context?.previousUser) queryClient.setQueryData(AUTH_QUERY_KEY, context.previousUser);
      toast({ title: t('common.error'), description: t('profile.settingsChangeError'), variant: 'destructive' });
    },
  });

  const togglePortfolioModeMutation = useMutation({
    mutationFn: async ({ portfolioMode, publicProfileUrl }: { portfolioMode: boolean; publicProfileUrl?: string }) =>
      api('/api/profile/portfolio-mode', { method: 'PUT', body: { portfolioMode, publicProfileUrl } }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: AUTH_QUERY_KEY });
      return { previousUser: queryClient.getQueryData(AUTH_QUERY_KEY) };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      setTimeout(() => queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY }), 100);
      toast({
        title: t('profile.portfolioModeChanged'),
        description: variables.portfolioMode
          ? t('profile.portfolioModeActivated', { url: variables.publicProfileUrl })
          : t('profile.portfolioModeDeactivated'),
      });
    },
    onError: (_, __, context) => {
      setPortfolioSwitchChecked(user?.portfolioMode || false);
      if (context?.previousUser) queryClient.setQueryData(AUTH_QUERY_KEY, context.previousUser);
      toast({ title: t('common.error'), description: t('profile.portfolioModeChangeError'), variant: 'destructive' });
    },
  });

  const effectiveUserId = viewingUserId || currentUser?.id;

  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ['/api/posts', 'user', effectiveUserId],
    queryFn: async () => {
      const res = await fetch(`/api/posts?userId=${effectiveUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!effectiveUserId,
  });

  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ['/api/trips', effectiveUserId],
    queryFn: async () => {
      const res = await fetch(`/api/trips?userId=${effectiveUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!effectiveUserId,
  });

  const { data: experiences = [] } = useQuery<any[]>({
    queryKey: ['/api/host/experiences', effectiveUserId],
    queryFn: async () => {
      const res = await fetch(`/api/host/experiences?userId=${effectiveUserId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!effectiveUserId,
  });

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ['/api/bookings', effectiveUserId],
    enabled: isViewingOwnProfile && !!effectiveUserId,
  });

  const { data: followCounts = { followers: 0, following: 0 } } = useQuery<{ followers: number; following: number }>({
    queryKey: ['/api/users', effectiveUserId, 'follow-counts'],
    enabled: !!effectiveUserId,
  });

  const friends = (followCounts as any).followers || 0;

  return (
    <div style={{ height: 'calc(100vh - 72px)', overflowY: 'auto', background: 'var(--app-bg)' }}>
      <Seo
        title={user?.nickname || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email?.split('@')[0] || 'Profile')}
        desc={user?.bio || 'Tourgether user profile - Connect with travelers and local hosts'}
      />

      <ProfileHeader
        user={user}
        isOwnProfile={isViewingOwnProfile}
        onEdit={() => setShowProfileEditModal(true)}
        onChat={() => setLocation(`/chat?userId=${viewingUserId || currentUser?.id}`)}
        onFollow={() => {}}
        onMeet={() => {}}
      />

      <ProfileStats
        visitedCountries={0}
        travelDays={(trips as any[]).length}
        friends={friends}
      />

      <div style={{ height: 12 }} />
      <ProfileLanguages languages={user?.languages} />
      <ProfileActivities interests={user?.interests} />

      {/* Tabs — 포스트 / 루트 / 저장 / 서비스 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="flex w-full"
          style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--stroke)', borderRadius: 0, padding: 0 }}
        >
          {(['posts', 'trips', 'saved', 'services'] as const).map((tab) => {
            const labels: Record<string, string> = { posts: '포스트', trips: '루트', saved: '저장', services: '서비스' };
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-1 py-3 text-sm font-medium rounded-none"
                style={
                  activeTab === tab
                    ? { color: 'var(--text-primary)', borderBottom: '2px solid var(--accent-mint)', background: 'transparent' }
                    : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent', background: 'transparent' }
                }
                data-testid={`tab-${tab}`}
              >
                {labels[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="posts" className="mt-0 px-1 pt-1">
          {posts.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-4xl mb-3">📸</div>
              <p className="text-sm">{t('profile.empty.noPosts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {posts.map((post: Post) => (
                <div
                  key={post.id}
                  className="aspect-square overflow-hidden cursor-pointer"
                  style={{ background: 'var(--surface-2)' }}
                  onClick={() => setSelectedPost(post)}
                  data-testid={`post-item-${post.id}`}
                >
                  {post.images && post.images.length > 0 ? (
                    <img src={post.images[0]} alt={post.title || 'Post'} className="w-full h-full object-cover" />
                  ) : post.videos && post.videos.length > 0 ? (
                    <video src={post.videos[0]} className="w-full h-full object-cover" muted />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📷</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-0 px-4 pt-4">
          {trips.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-4xl mb-3">✈️</div>
              <p className="text-sm">{t('profile.empty.noTrips')}</p>
              <button className="tg-btn-primary mt-4" onClick={() => setShowTimelineCreateModal(true)} data-testid="button-plan-trip">
                {t('profile.planTrip')}
              </button>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {trips.map((trip: Trip) => (
                <div key={trip.id} className="tg-surface p-4" style={{ borderRadius: 16 }}>
                  <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{trip.title}</h3>
                  <div className="flex items-center gap-1 mt-1" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    <MapPin size={12} /><span>{trip.destination}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {new Date(trip.startDate).toLocaleDateString('ko-KR')} – {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-0 px-1 pt-1" data-testid="tab-content-saved">
          <SavedPostsTab />
        </TabsContent>

        <TabsContent value="services" className="mt-0 px-4 pt-4">
          {experiences.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-sm">{t('profile.empty.noExperiences')}</p>
              {isViewingOwnProfile && (
                <button className="tg-btn-primary mt-4" onClick={() => setShowCreateExperienceModal(true)} data-testid="button-create-experience">
                  {t('profile.createExperience')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {experiences.map((experience: Experience) => (
                <div key={experience.id} className="tg-surface p-4" style={{ borderRadius: 16 }}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{experience.title}</h3>
                    <div className="flex items-center gap-1">
                      <Star size={12} style={{ color: 'var(--accent-gold)' }} className="fill-current" />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{experience.rating || '0'}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }} className="line-clamp-2 mb-2">{experience.description}</p>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-gold)' }}>₩{Number(experience.price).toLocaleString()}</span>
                    <span className="tg-chip" style={{ fontSize: 11 }}>{experience.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Settings section — own profile only */}
      {isViewingOwnProfile && (
        <ProfileSettingsSection
          openToMeet={switchChecked}
          onToggleOpenToMeet={(val) => {
            setSwitchChecked(val);
            toggleOpenToMeetMutation.mutate({ open: val, region: openMeetRegion, hours: openMeetHours });
          }}
          portfolioMode={portfolioSwitchChecked}
          onTogglePortfolioMode={(val) => {
            setPortfolioSwitchChecked(val);
            togglePortfolioModeMutation.mutate({ portfolioMode: val, publicProfileUrl });
          }}
        />
      )}

      <SeoLinkCards variant="minimal" filterPaths={['/become-guide', '/earn-travel', '/travel-creator', '/travel-friends']} />

      <HelpRequestForm isOpen={showHelpRequestForm} onClose={() => setShowHelpRequestForm(false)} />
      <CreateExperienceModal isOpen={showCreateExperienceModal} onClose={() => setShowCreateExperienceModal(false)} />
      <TimelineCreateModal
        isOpen={showTimelineCreateModal}
        onClose={() => setShowTimelineCreateModal(false)}
        onSubmit={(tripData) => createTripMutation.mutate(tripData)}
      />
      {user && <ProfileEditModal open={showProfileEditModal} onOpenChange={setShowProfileEditModal} user={user} />}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={(postId) => {
            setLikedPosts((prev) => {
              const next = new Set(prev);
              next.has(postId) ? next.delete(postId) : next.add(postId);
              return next;
            });
          }}
          isLiked={likedPosts.has(selectedPost.id)}
        />
      )}
    </div>
  );
}
