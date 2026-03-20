// @ts-nocheck
// 프로필 페이지 (v3) — Me/Profile 탭, 기존 API 훅/데이터 로직 유지
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { MapPin, Plus, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import HelpRequestForm from '@/components/HelpRequestForm';
import CreateExperienceModal from '@/components/CreateExperienceModal';
import CreatePostModal from '@/components/CreatePostModal';
import TimelineCreateModal from '@/components/TimelineCreateModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import type { Post, Trip, Experience } from '@shared/schema';
import { Seo } from '@/components/Seo';
import { useTranslation } from 'react-i18next';
import PostDetailModal from '@/components/PostDetailModal';
import SeoLinkCards from '@/components/seo/SeoLinkCards';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
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
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
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

      <div style={{ height: 10 }} />

      {/* Tabs — 포스트 / 루트 / 저장 / 서비스 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="mx-4 flex w-auto rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
        >
          {(['posts', 'trips', 'saved', 'services'] as const).map((tab) => {
            const labels: Record<string, string> = { posts: t('profile.tabs.posts'), trips: t('profile.tabs.trips'), saved: t('profile.tabs.saved'), services: t('profile.tabs.services') };
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-1 rounded-full py-3 text-sm font-medium"
                style={
                  activeTab === tab
                    ? { color: 'var(--accent-gold)', background: 'rgba(255,214,134,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }
                    : { color: 'var(--text-secondary)', background: 'transparent' }
                }
                data-testid={`tab-${tab}`}
              >
                {labels[tab]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="posts" className="mt-0 px-4 pt-4 pb-6">
          {posts.length === 0 ? (
            <div className="mx-0 rounded-[24px] px-6 py-12 text-center" style={{ color: 'var(--text-secondary)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 44px rgba(0,0,0,0.18)' }}>
              <div className="mb-3 text-4xl">📸</div>
              <p className="text-sm">{t('profile.empty.noPosts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post: Post) => (
                <div
                  key={post.id}
                  className="group aspect-square overflow-hidden cursor-pointer relative rounded-2xl"
                  style={{ background: 'var(--surface-2)', boxShadow: '0 14px 32px rgba(0,0,0,0.18)' }}
                  onClick={() => setSelectedPost(post)}
                  data-testid={`post-item-${post.id}`}
                >
                  {post.images && post.images.length > 0 ? (
                    <img src={post.images[0]} alt={post.title || 'Post'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : post.videos && post.videos.length > 0 ? (
                    <video src={post.videos[0]} className="h-full w-full object-cover" muted />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">📷</div>
                  )}

                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.45) 100%)' }} />

                  <div
                    className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 py-2"
                    style={{ background: 'linear-gradient(to top, rgba(8,8,12,0.76) 0%, rgba(8,8,12,0.18) 100%)' }}
                  >
                    <span style={{ fontSize: 10, color: 'rgba(255,225,155,0.96)' }}>❤ {post.likesCount ?? 0}</span>
                    {post.location && (
                      <span className="truncate" style={{ fontSize: 9, color: 'rgba(255,255,255,0.78)', flex: 1 }}>
                        {post.location}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)' }}>👁 {post.viewsCount ?? 0}</span>
                  </div>
                </div>
              ))}

              {isViewingOwnProfile && (
                <button
                  type="button"
                  className="flex aspect-square items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,214,134,0.08) 0%, rgba(255,214,134,0.04) 100%)',
                    border: '1px dashed rgba(255,214,134,0.35)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                  onClick={() => setShowCreatePostModal(true)}
                  data-testid="button-create-post-tile"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(255,214,134,0.1)', color: 'var(--accent-gold)' }}>
                      <Plus size={22} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('profile.actions.newPost')}</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-0 px-4 pt-4 pb-6">
          {trips.length === 0 ? (
            <div className="rounded-[24px] px-6 py-12 text-center" style={{ color: 'var(--text-secondary)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 44px rgba(0,0,0,0.18)' }}>
              <div className="mb-3 text-4xl">✈️</div>
              <p className="text-sm">{t('profile.empty.noTrips')}</p>
              <button className="tg-btn-primary mt-4" onClick={() => setShowTimelineCreateModal(true)} data-testid="button-plan-trip">
                {t('profile.planTrip')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip: Trip) => (
                <div
                  key={trip.id}
                  className="overflow-hidden rounded-[24px] p-4"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 44px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(255,214,134,0.08)', border: '1px solid rgba(255,214,134,0.18)', color: 'var(--accent-gold)', fontSize: 11, fontWeight: 700 }}>
                        ✈︎ {t('profile.trip.cardType')}
                      </div>
                      <h3 className="mt-3 font-semibold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>{trip.title}</h3>
                    </div>
                    <div className="rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: 11 }}>
                      {(trip as any).status || t('profile.trip.planned')}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    <MapPin size={12} style={{ color: 'var(--accent-gold)' }} /><span>{trip.destination}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.025)' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('profile.trip.departure')}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginTop: 3 }}>
                        {new Date(trip.startDate).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                    <div style={{ width: 28, height: 1, background: 'rgba(255,214,134,0.3)' }} />
                    <div className="text-right">
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('profile.trip.return')}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginTop: 3 }}>
                        {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-0" data-testid="tab-content-saved">
          <SavedPostsTab />
        </TabsContent>

        <TabsContent value="services" className="mt-0 px-4 pt-4 pb-6">
          {experiences.length === 0 ? (
            <div className="rounded-[24px] px-6 py-12 text-center" style={{ color: 'var(--text-secondary)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 44px rgba(0,0,0,0.18)' }}>
              <div className="mb-3 text-4xl">🗺️</div>
              <p className="text-sm">{t('profile.empty.noExperiences')}</p>
              {isViewingOwnProfile && (
                <button className="tg-btn-primary mt-4" onClick={() => setShowCreateExperienceModal(true)} data-testid="button-create-experience">
                  {t('profile.createExperience')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((experience: Experience) => (
                <div
                  key={experience.id}
                  className="overflow-hidden rounded-[24px] p-4"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 44px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(124,231,214,0.08)', border: '1px solid rgba(124,231,214,0.18)', color: 'var(--accent-mint)', fontSize: 11, fontWeight: 700 }}>
                        {t('profile.service.cardType')}
                      </div>
                      <h3 className="mt-3 font-semibold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>{experience.title}</h3>
                    </div>
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Star size={12} style={{ color: 'var(--accent-gold)' }} className="fill-current" />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{experience.rating || '0'}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }} className="line-clamp-2 mt-3">{experience.description}</p>

                  <div className="mt-4 flex items-center justify-between rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.025)' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('profile.service.price')}</div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-gold)' }}>₩{Number(experience.price).toLocaleString()}</span>
                    </div>
                    <span className="rounded-full px-3 py-1.5" style={{ fontSize: 11, color: 'var(--text-primary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>{experience.category}</span>
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
