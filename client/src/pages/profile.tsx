import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Settings, Edit3, Calendar, MapPin, Star, Heart, Users, Briefcase, HelpCircle, Sparkles, ShoppingBag, Clock, Home, CreditCard, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import HelpRequestForm from '@/components/HelpRequestForm';
import HelpRequestList from '@/components/HelpRequestList';
import ServiceTemplateList from '@/components/ServiceTemplateList';
import ServicePackageList from '@/components/ServicePackageList';
import { SlotManagement } from '@/components/SlotManagement';
import BookingList from '@/components/BookingList';
import CreateExperienceModal from '@/components/CreateExperienceModal';
import TimelineCreateModal from '@/components/TimelineCreateModal';
import ProfileEditModal from '@/components/ProfileEditModal';
import SerendipityToggle from '@/components/SerendipityToggle';
import type { Post, Trip, Experience } from '@shared/schema';
import { Seo } from '@/components/Seo';
import { useTranslation } from 'react-i18next';
import PostDetailModal from '@/components/PostDetailModal';

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

  // Fetch profile data for the user being viewed
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

  // Use either the fetched profile or current user
  const user = viewingUserId ? profileUser : currentUser;

  // Help Request Form 상태
  const [showHelpRequestForm, setShowHelpRequestForm] = useState(false);
  
  // Experience & Timeline Modal 상태
  const [showCreateExperienceModal, setShowCreateExperienceModal] = useState(false);
  const [showTimelineCreateModal, setShowTimelineCreateModal] = useState(false);
  
  // Profile Edit Modal 상태
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  
  // Post Detail Modal 상태
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  // 만남 상태 토글 mutation
  const [openMeetRegion, setOpenMeetRegion] = useState('강남구');
  const [openMeetHours, setOpenMeetHours] = useState(12);
  
  // Switch 직접 제어를 위한 상태
  const [switchChecked, setSwitchChecked] = useState(false);

  // Portfolio Mode 상태
  const [portfolioSwitchChecked, setPortfolioSwitchChecked] = useState(false);
  const [publicProfileUrl, setPublicProfileUrl] = useState('');
  
  // 서버 상태를 Switch에 반영
  useEffect(() => {
    setSwitchChecked(user?.openToMeet || false);
    console.log('[Profile] Switch state updated from server:', user?.openToMeet);
  }, [user?.openToMeet]);

  // Portfolio Mode 서버 상태를 Switch에 반영
  useEffect(() => {
    setPortfolioSwitchChecked(user?.portfolioMode || false);
    setPublicProfileUrl(user?.publicProfileUrl || '');
    console.log('[Profile] Portfolio mode state updated from server:', user?.portfolioMode);
  }, [user?.portfolioMode, user?.publicProfileUrl]);

  // 호스트 신청 mutation
  const applyHostMutation = useMutation({
    mutationFn: async () => {
      return api('/api/user/apply-host', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: t('profile.hostApplySuccess'),
        description: t('profile.hostApplySuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Host application error:', error);
      toast({
        title: t('profile.hostApplyError'),
        description: t('profile.hostApplyErrorDesc'),
        variant: 'destructive',
      });
    },
  });

  // 여행 생성 mutation
  const createTripMutation = useMutation({
    mutationFn: async (tripData: any) => {
      return api('/api/trips', {
        method: 'POST',
        body: tripData,
      });
    },
    onSuccess: () => {
      toast({
        title: t('timeline.createSuccess'),
        description: t('timeline.createSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setShowTimelineCreateModal(false);
    },
    onError: (error) => {
      console.error('Trip creation error:', error);
      toast({
        title: t('timeline.createError'),
        description: t('timeline.createErrorDesc'),
        variant: 'destructive',
      });
    },
  });

  const toggleOpenToMeetMutation = useMutation({
    mutationFn: async ({ open, region, hours }: { open: boolean; region?: string; hours?: number }) => {
      const result = await api('/api/profile/open', {
        method: 'PATCH',
        body: { open, region, hours },
      });
      return result;
    },
    onMutate: async ({ open }) => {
      console.log('[Profile] Mutation starting: openToMeet =', open);
      await queryClient.cancelQueries({ queryKey: AUTH_QUERY_KEY });
      
      const previousUser = queryClient.getQueryData(AUTH_QUERY_KEY);
      
      // Switch 상태는 이미 즉시 업데이트됨
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      console.log('[Profile] Mutation success, invalidating queries');
      // 여러 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/open'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/open'] });
      
      // 강제 리페치 (로컬 상태는 useEffect에서 동기화)
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY }).then(() => {
          console.log('[Profile] Refetch completed, waiting for useEffect sync');
          // 로컬 상태 clear는 useEffect에서 안전하게 처리
        });
      }, 100);
      
      toast({
        title: t('profile.meetStatusChanged'),
        description: variables.open
          ? t('profile.meetActivated', { hours: openMeetHours, region: openMeetRegion })
          : t('profile.meetDeactivated'),
      });
    },
    onError: (err, variables, context) => {
      console.error('[Profile] Mutation error:', err);
      // 실패 시 Switch를 이전 서버 상태로 롤백
      setSwitchChecked(user?.openToMeet || false);
      
      // 캐시도 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(AUTH_QUERY_KEY, context.previousUser);
      }
      
      toast({
        title: t('common.error'),
        description: t('profile.settingsChangeError'),
        variant: 'destructive',
      });
    },
  });

  // Portfolio Mode 토글 mutation
  const togglePortfolioModeMutation = useMutation({
    mutationFn: async ({ portfolioMode, publicProfileUrl }: { portfolioMode: boolean; publicProfileUrl?: string }) => {
      const result = await api('/api/profile/portfolio-mode', {
        method: 'PUT',
        body: { portfolioMode, publicProfileUrl },
      });
      return result;
    },
    onMutate: async ({ portfolioMode }) => {
      console.log('[Profile] Portfolio mode mutation starting:', portfolioMode);
      await queryClient.cancelQueries({ queryKey: AUTH_QUERY_KEY });
      
      const previousUser = queryClient.getQueryData(AUTH_QUERY_KEY);
      
      // Switch 상태는 이미 즉시 업데이트됨
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      console.log('[Profile] Portfolio mode mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      
      // 강제 리페치
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY }).then(() => {
          console.log('[Profile] Portfolio mode refetch completed');
        });
      }, 100);
      
      toast({
        title: t('profile.portfolioModeChanged'),
        description: variables.portfolioMode
          ? t('profile.portfolioModeActivated', { url: variables.publicProfileUrl })
          : t('profile.portfolioModeDeactivated'),
      });
    },
    onError: (err, variables, context) => {
      console.error('[Profile] Portfolio mode mutation error:', err);
      // 실패 시 Switch를 이전 서버 상태로 롤백
      setPortfolioSwitchChecked(user?.portfolioMode || false);
      
      // 캐시도 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(AUTH_QUERY_KEY, context.previousUser);
      }
      
      toast({
        title: t('common.error'),
        description: t('profile.portfolioModeChangeError'),
        variant: 'destructive',
      });
    },
  });

  const effectiveUserId = viewingUserId || currentUser?.id;

  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ['/api/posts', 'user', effectiveUserId],
    queryFn: async () => {
      const response = await fetch(`/api/posts?userId=${effectiveUserId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!effectiveUserId,
  });

  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ['/api/trips', effectiveUserId],
    queryFn: async () => {
      const response = await fetch(`/api/trips?userId=${effectiveUserId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!effectiveUserId,
  });

  const { data: experiences = [] } = useQuery<any[]>({
    queryKey: ['/api/host/experiences', effectiveUserId],
    queryFn: async () => {
      const response = await fetch(`/api/host/experiences?userId=${effectiveUserId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!effectiveUserId,
  });

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ['/api/bookings', effectiveUserId],
    enabled: isViewingOwnProfile && !!effectiveUserId,
  });

  // 실제 팔로우 데이터 가져오기
  const { data: followCounts = { followers: 0, following: 0 } } = useQuery<{ followers: number; following: number }>({
    queryKey: ['/api/users', effectiveUserId, 'follow-counts'],
    enabled: !!effectiveUserId,
  });

  const stats = {
    posts: (posts as any[]).length,
    trips: (trips as any[]).length,
    followers: (followCounts as any).followers || 0,
    following: (followCounts as any).following || 0,
    experiences: (experiences as any[]).length,
  };

  return (
    <div className="mobile-content bg-white custom-scrollbar">
      <Seo 
        title={user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.email?.split('@')[0] || 'Profile'}
        desc={user?.bio || 'Tourgether user profile - Connect with travelers and local hosts'}
      />
      {/* Profile Header */}
      <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
        {/* 홈 버튼 (왼쪽 상단) */}
        <div className="absolute top-4 left-4 z-50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 relative z-50"
            onClick={() => {
              console.log('[Profile] Home button clicked - navigating to /');
              window.location.href = '/';
            }}
            data-testid="button-home"
          >
            <Home size={20} />
          </Button>
        </div>

        {/* 오른쪽 상단 버튼들 */}
        {isViewingOwnProfile && (
          <div className="absolute top-4 right-4 flex items-center gap-1">
            {/* 구독/멤버십 버튼 */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={() => setLocation('/subscription')}
              data-testid="button-subscription"
            >
              <Crown size={20} className="text-amber-500" />
            </Button>
            {/* 설정 아이콘 (관리자 전용) */}
            {user?.role === 'admin' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2"
                onClick={() => setLocation('/config')}
                data-testid="button-settings"
              >
                <Settings size={20} />
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 mb-4 border-4 border-white shadow-lg">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback className="text-xl">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : user?.email?.split('@')[0] || t('profile.user')}
          </h2>

          {user?.bio && (
            <p className="text-gray-600 text-sm mb-3 max-w-xs">{user.bio}</p>
          )}

          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin size={14} />
            <span>{user?.location || t('profile.locationNotSet')}</span>
          </div>

          {user?.isHost ? (
            <Badge className="bg-gradient-to-r from-primary to-secondary text-white mb-4">
              {t('profile.verifiedHost')}
            </Badge>
          ) : isViewingOwnProfile ? (
            <Button
              onClick={() => applyHostMutation.mutate()}
              disabled={applyHostMutation.isPending}
              className="mb-4 bg-gradient-to-r from-primary to-secondary text-white"
              data-testid="button-apply-host"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              {applyHostMutation.isPending ? t('profile.applying') : t('profile.becomeHost')}
            </Button>
          ) : null}

          {isViewingOwnProfile && (
            <Button
              onClick={() => setShowHelpRequestForm(true)}
              className="mb-4 bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-open-help-request"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {t('profile.requestHelp')}
            </Button>
          )}

          {/* 만남 상태 토글 - 자기 프로필만 */}
          {isViewingOwnProfile && (
          <div className="mb-4 p-4 bg-white/50 rounded-lg border backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <Users size={18} className="text-primary" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">
                  {t('profile.openToNewMeetings')}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.openToMeet && user?.openUntil
                    ? `${new Date(user.openUntil).toLocaleString()} ${t('profile.activeUntil')}`
                    : t('profile.connectWithTravelers')}
                </div>
              </div>
              <Switch
                checked={switchChecked}
                onCheckedChange={(checked) => {
                  // 즉시 Switch 상태 업데이트
                  setSwitchChecked(checked);
                  console.log('[Profile] Switch toggled to:', checked);
                  
                  if (checked) {
                    toggleOpenToMeetMutation.mutate({
                      open: true,
                      region: openMeetRegion,
                      hours: openMeetHours
                    });
                  } else {
                    toggleOpenToMeetMutation.mutate({ open: false });
                  }
                }}
                disabled={toggleOpenToMeetMutation.isPending}
                data-testid="toggle-open-to-meet"
              />
            </div>
            
            {/* 권역 및 시간 설정 */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 mb-1">{t('profile.region')}</label>
                <select
                  value={openMeetRegion}
                  onChange={(e) => setOpenMeetRegion(e.target.value)}
                  className="w-full p-2 rounded border text-xs"
                  disabled={user?.openToMeet}
                >
                  <option value="강남구">{t('profile.regions.gangnam')}</option>
                  <option value="홍대/합정">{t('profile.regions.hongdae')}</option>
                  <option value="명동/중구">{t('profile.regions.myeongdong')}</option>
                  <option value="강북/노원">{t('profile.regions.gangbuk')}</option>
                  <option value="서초구">{t('profile.regions.seocho')}</option>
                  <option value="마포구">{t('profile.regions.mapo')}</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">{t('profile.activeHours')}</label>
                <select
                  value={openMeetHours}
                  onChange={(e) => setOpenMeetHours(Number(e.target.value))}
                  className="w-full p-2 rounded border text-xs"
                  disabled={user?.openToMeet}
                >
                  <option value={6}>{t('profile.hours', { count: 6 })}</option>
                  <option value={12}>{t('profile.hours', { count: 12 })}</option>
                  <option value={24}>{t('profile.hours', { count: 24 })}</option>
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Serendipity Protocol 토글 - 자기 프로필만 */}
          {isViewingOwnProfile && (
          <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 backdrop-blur-sm">
            <SerendipityToggle />
          </div>
          )}

          {/* Portfolio Mode 토글 - 인플루언서 & 자기 프로필만 */}
          {isViewingOwnProfile && user?.userType === 'influencer' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={18} className="text-purple-600" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {t('profile.portfolioMode')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.portfolioMode && user?.publicProfileUrl
                      ? `${t('profile.publicProfile')}: /${user.publicProfileUrl}`
                      : t('profile.portfolioModeDesc')}
                  </div>
                </div>
                <Switch
                  checked={portfolioSwitchChecked}
                  onCheckedChange={(checked) => {
                    // 즉시 Switch 상태 업데이트
                    setPortfolioSwitchChecked(checked);
                    console.log('[Profile] Portfolio mode switch toggled to:', checked);
                    
                    if (checked) {
                      // URL 검증 강화
                      if (!publicProfileUrl || publicProfileUrl.trim().length < 3) {
                        setPortfolioSwitchChecked(false);
                        toast({
                          title: t('profile.urlRequired'),
                          description: t('profile.urlRequiredDesc'),
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      // URL 형식 검증
                      const urlPattern = /^[a-zA-Z0-9_-]+$/;
                      if (!urlPattern.test(publicProfileUrl.trim())) {
                        setPortfolioSwitchChecked(false);
                        toast({
                          title: t('profile.invalidUrlFormat'),
                          description: t('profile.invalidUrlFormatDesc'),
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      togglePortfolioModeMutation.mutate({
                        portfolioMode: true,
                        publicProfileUrl: publicProfileUrl.trim()
                      });
                    } else {
                      togglePortfolioModeMutation.mutate({ portfolioMode: false });
                    }
                  }}
                  disabled={togglePortfolioModeMutation.isPending}
                  data-testid="toggle-portfolio-mode"
                />
              </div>
              
              {/* 프로필 URL 설정 */}
              <div className="text-xs">
                <label className="block text-gray-600 mb-1">{t('profile.publicProfileUrl')}</label>
                <div className="flex gap-2">
                  <span className="text-gray-400 self-center">tourgether.com/</span>
                  <input
                    type="text"
                    value={publicProfileUrl}
                    onChange={(e) => setPublicProfileUrl(e.target.value)}
                    placeholder="your-profile-name"
                    className="flex-1 p-2 rounded border text-xs"
                    disabled={user?.portfolioMode}
                    pattern="[a-zA-Z0-9_-]+"
                    title={t('profile.urlPatternHelp')}
                  />
                </div>
                <p className="text-gray-400 mt-1">{t('profile.urlHint')}</p>
              </div>
            </div>
          )}

          {isViewingOwnProfile && (
            <Button 
              className="travel-button-outline"
              onClick={() => setShowProfileEditModal(true)}
              data-testid="button-edit-profile"
            >
              <Edit3 size={16} className="mr-2" />
              {t('profileEdit.title')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.posts}</div>
            <div className="text-xs text-gray-500">{t('profile.stats.posts')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.trips}</div>
            <div className="text-xs text-gray-500">{t('profile.stats.trips')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.followers}
            </div>
            <div className="text-xs text-gray-500">{t('profile.stats.followers')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.following}
            </div>
            <div className="text-xs text-gray-500">{t('profile.stats.following')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.experiences}
            </div>
            <div className="text-xs text-gray-500">{t('profile.stats.experiences')}</div>
          </div>
        </div>
      </div>

      {/* Quick Access Buttons - 마켓플레이스 및 호스트 대시보드 */}
      <div className="flex gap-2 px-4 py-3">
        <Button
          variant="outline"
          className="flex-1 flex items-center justify-center gap-2"
          onClick={() => setLocation('/marketplace')}
          data-testid="btn-marketplace"
        >
          <ShoppingBag className="w-4 h-4" />
          {t('profile.marketplace')}
        </Button>
        {(user?.isHost || user?.userType === 'local_guide') && (
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={() => setLocation('/host-dashboard')}
            data-testid="btn-host-dashboard"
          >
            <Briefcase className="w-4 h-4" />
            {t('profile.hostDashboard')}
          </Button>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 bg-gray-50 p-1 mx-4 mt-4 rounded-lg">
          <TabsTrigger value="posts" className="text-xs">
            {t('profile.tabs.posts')}
          </TabsTrigger>
          <TabsTrigger value="trips" className="text-xs">
            {t('profile.tabs.trips')}
          </TabsTrigger>
          <TabsTrigger value="experiences" className="text-xs">
            {t('profile.tabs.experiences')}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs">
            {t('profile.tabs.bookings')}
          </TabsTrigger>
          {(user?.userType === 'local_guide' || user?.isHost) && (
            <TabsTrigger value="host-bookings" className="text-xs" data-testid="tab-host-bookings">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{t('profile.tabs.receivedBookings')}</span>
              </div>
            </TabsTrigger>
          )}
          <TabsTrigger value="help-requests" className="text-xs" data-testid="tab-help-requests">
            {t('profile.tabs.helpRequests')}
          </TabsTrigger>
          <TabsTrigger value="service-templates" className="text-xs" data-testid="tab-service-templates">
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>{t('profile.tabs.templates')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="service-packages" className="text-xs" data-testid="tab-service-packages">
            <div className="flex items-center space-x-1">
              <ShoppingBag className="w-3 h-3" />
              <span>{t('profile.tabs.packages')}</span>
            </div>
          </TabsTrigger>
          {(user?.userType === 'local_guide' || user?.isHost) && (
            <TabsTrigger value="slots" className="text-xs" data-testid="tab-slots">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{t('profile.tabs.slots')}</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-4 px-4">
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📸</div>
              <p className="text-gray-500 text-sm">{t('profile.empty.noPosts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post: Post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedPost(post)}
                  data-testid={`post-item-${post.id}`}
                >
                  {post.images && post.images.length > 0 ? (
                    <img 
                      src={post.images[0]} 
                      alt={post.title || 'Post'} 
                      className="w-full h-full object-cover"
                    />
                  ) : post.videos && post.videos.length > 0 ? (
                    <video 
                      src={post.videos[0]} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <span className="text-2xl">📷</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-4 px-4">
          {trips.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✈️</div>
              <p className="text-gray-500 text-sm">{t('profile.empty.noTrips')}</p>
              <Button 
                className="travel-button mt-3"
                onClick={() => setShowTimelineCreateModal(true)}
                data-testid="button-plan-trip"
              >
                <Calendar size={16} className="mr-2" />
                {t('profile.planTrip')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip: Trip) => (
                <div key={trip.id} className="travel-card p-4">
                  <h3 className="font-medium mb-1">{trip.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <MapPin size={12} />
                    <span>{trip.destination}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(trip.startDate).toLocaleDateString('ko-KR')} -
                    {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experiences" className="mt-4 px-4">
          {experiences.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-gray-500 text-sm">{t('profile.empty.noExperiences')}</p>
              <Button 
                className="travel-button mt-3"
                onClick={() => setShowCreateExperienceModal(true)}
                data-testid="button-create-experience"
              >
                {t('profile.createExperience')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((experience: Experience) => (
                <div key={experience.id} className="travel-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{experience.title}</h3>
                    <div className="flex items-center gap-1">
                      <Star
                        size={12}
                        className="text-yellow-400 fill-current"
                      />
                      <span className="text-xs">
                        {experience.rating || '0'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {experience.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      ₩{Number(experience.price).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {experience.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 px-4" data-testid="tab-content-bookings">
          <BookingList role="guest" />
        </TabsContent>

        {/* 호스트용 예약 관리 탭 */}
        {(user?.userType === 'local_guide' || user?.isHost) && (
          <TabsContent value="host-bookings" className="mt-4 px-4" data-testid="tab-content-host-bookings">
            <BookingList role="host" />
          </TabsContent>
        )}

        <TabsContent value="help-requests" className="mt-4 px-4" data-testid="tab-content-help-requests">
          <HelpRequestList />
        </TabsContent>

        <TabsContent value="service-templates" className="mt-4 px-4" data-testid="tab-content-service-templates">
          <ServiceTemplateList />
        </TabsContent>

        <TabsContent value="service-packages" className="mt-4 px-4" data-testid="tab-content-service-packages">
          <ServicePackageList />
        </TabsContent>

        {(user?.userType === 'local_guide' || user?.isHost) && (
          <TabsContent value="slots" className="mt-4 px-4" data-testid="tab-content-slots">
            <SlotManagement />
          </TabsContent>
        )}
      </Tabs>

      {/* Help Request Form */}
      <HelpRequestForm
        isOpen={showHelpRequestForm}
        onClose={() => setShowHelpRequestForm(false)}
      />
      
      {/* Create Experience Modal */}
      <CreateExperienceModal
        isOpen={showCreateExperienceModal}
        onClose={() => setShowCreateExperienceModal(false)}
      />
      
      {/* Timeline Create Modal */}
      <TimelineCreateModal
        isOpen={showTimelineCreateModal}
        onClose={() => setShowTimelineCreateModal(false)}
        onSubmit={(tripData) => createTripMutation.mutate(tripData)}
      />
      
      {/* Profile Edit Modal */}
      {user && (
        <ProfileEditModal
          open={showProfileEditModal}
          onOpenChange={setShowProfileEditModal}
          user={user}
        />
      )}
      
      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={(postId) => {
            setLikedPosts(prev => {
              const newSet = new Set(prev);
              if (newSet.has(postId)) {
                newSet.delete(postId);
              } else {
                newSet.add(postId);
              }
              return newSet;
            });
          }}
          isLiked={likedPosts.has(selectedPost.id)}
        />
      )}
    </div>
  );
}
