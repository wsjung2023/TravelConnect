import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Settings, Edit3, Calendar, MapPin, Star, Heart, Users, Briefcase, HelpCircle, Sparkles, ShoppingBag, Clock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
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
import type { Post, Trip, Experience } from '@shared/schema';

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Help Request Form 상태
  const [showHelpRequestForm, setShowHelpRequestForm] = useState(false);
  
  // Experience & Timeline Modal 상태
  const [showCreateExperienceModal, setShowCreateExperienceModal] = useState(false);
  const [showTimelineCreateModal, setShowTimelineCreateModal] = useState(false);
  
  // Profile Edit Modal 상태
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);

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
        title: '호스트 신청 완료',
        description: '축하합니다! 이제 호스트로 활동하실 수 있습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error) => {
      console.error('Host application error:', error);
      toast({
        title: '신청 실패',
        description: '호스트 신청 중 오류가 발생했습니다. 다시 시도해주세요.',
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
        title: '여행 계획 생성 완료',
        description: '새로운 여행 계획이 성공적으로 생성되었습니다!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setShowTimelineCreateModal(false);
    },
    onError: (error) => {
      console.error('Trip creation error:', error);
      toast({
        title: '생성 실패',
        description: '여행 계획 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
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
      await queryClient.cancelQueries({ queryKey: ['/api/auth/me'] });
      
      const previousUser = queryClient.getQueryData(['/api/auth/me']);
      
      // Switch 상태는 이미 즉시 업데이트됨
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      console.log('[Profile] Mutation success, invalidating queries');
      // 여러 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/open'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/open'] });
      
      // 강제 리페치 (로컬 상태는 useEffect에서 동기화)
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'] }).then(() => {
          console.log('[Profile] Refetch completed, waiting for useEffect sync');
          // 로컬 상태 clear는 useEffect에서 안전하게 처리
        });
      }, 100);
      
      toast({
        title: '만남 상태 변경됨',
        description: variables.open
          ? `${openMeetHours}시간 동안 ${openMeetRegion}에서 만남이 활성화되었습니다.`
          : '만남이 비활성화되었습니다.',
      });
    },
    onError: (err, variables, context) => {
      console.error('[Profile] Mutation error:', err);
      // 실패 시 Switch를 이전 서버 상태로 롤백
      setSwitchChecked(user?.openToMeet || false);
      
      // 캐시도 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(['/api/auth/me'], context.previousUser);
      }
      
      toast({
        title: '오류',
        description: '설정을 변경하는 중 오류가 발생했습니다.',
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
      await queryClient.cancelQueries({ queryKey: ['/api/auth/me'] });
      
      const previousUser = queryClient.getQueryData(['/api/auth/me']);
      
      // Switch 상태는 이미 즉시 업데이트됨
      return { previousUser };
    },
    onSuccess: (data, variables) => {
      console.log('[Profile] Portfolio mode mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // 강제 리페치
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'] }).then(() => {
          console.log('[Profile] Portfolio mode refetch completed');
        });
      }, 100);
      
      toast({
        title: '포트폴리오 모드 변경됨',
        description: variables.portfolioMode
          ? `포트폴리오 모드가 활성화되었습니다. URL: ${variables.publicProfileUrl}`
          : '포트폴리오 모드가 비활성화되었습니다.',
      });
    },
    onError: (err, variables, context) => {
      console.error('[Profile] Portfolio mode mutation error:', err);
      // 실패 시 Switch를 이전 서버 상태로 롤백
      setPortfolioSwitchChecked(user?.portfolioMode || false);
      
      // 캐시도 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(['/api/auth/me'], context.previousUser);
      }
      
      toast({
        title: '오류',
        description: '포트폴리오 모드 설정을 변경하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ['/api/posts', 'user'],
  });

  const { data: trips = [] } = useQuery<any[]>({
    queryKey: ['/api/trips'],
  });

  const { data: experiences = [] } = useQuery<any[]>({
    queryKey: ['/api/host/experiences'],
  });

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ['/api/bookings'],
  });

  // 실제 팔로우 데이터 가져오기
  const { data: followCounts = { followers: 0, following: 0 } } = useQuery<{ followers: number; following: number }>({
    queryKey: ['/api/users', user?.id, 'follow-counts'],
    enabled: !!user?.id,
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
      {/* Profile Header */}
      <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
        {/* 홈 버튼 (왼쪽 상단) */}
        <div className="absolute top-4 left-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2"
            onClick={() => setLocation('/')}
            data-testid="button-home"
          >
            <Home size={20} />
          </Button>
        </div>

        {/* 설정 아이콘 (관리자 전용, 오른쪽 상단) */}
        {user?.role === 'admin' && (
          <div className="absolute top-4 right-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={() => setLocation('/config')}
              data-testid="button-settings"
            >
              <Settings size={20} />
            </Button>
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
              : user?.email?.split('@')[0] || '사용자'}
          </h2>

          {user?.bio && (
            <p className="text-gray-600 text-sm mb-3 max-w-xs">{user.bio}</p>
          )}

          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin size={14} />
            <span>{user?.location || '위치 미설정'}</span>
          </div>

          {user?.isHost ? (
            <Badge className="bg-gradient-to-r from-primary to-secondary text-white mb-4">
              ✨ 인증된 호스트
            </Badge>
          ) : (
            <Button
              onClick={() => applyHostMutation.mutate()}
              disabled={applyHostMutation.isPending}
              className="mb-4 bg-gradient-to-r from-primary to-secondary text-white"
              data-testid="button-apply-host"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              {applyHostMutation.isPending ? '신청 중...' : '호스트 되기'}
            </Button>
          )}

          <Button
            onClick={() => setShowHelpRequestForm(true)}
            className="mb-4 bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-open-help-request"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            도움 요청하기
          </Button>

          {/* 만남 상태 토글 */}
          <div className="mb-4 p-4 bg-white/50 rounded-lg border backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <Users size={18} className="text-primary" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">
                  새로운 만남 열려있음
                </div>
                <div className="text-xs text-gray-500">
                  {user?.openToMeet && user?.openUntil
                    ? `${new Date(user.openUntil).toLocaleString()}까지 활성`
                    : '다른 여행자들과 연결됩니다'}
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
                <label className="block text-gray-600 mb-1">권역</label>
                <select
                  value={openMeetRegion}
                  onChange={(e) => setOpenMeetRegion(e.target.value)}
                  className="w-full p-2 rounded border text-xs"
                  disabled={user?.openToMeet}
                >
                  <option value="강남구">강남구</option>
                  <option value="홍대/합정">홍대/합정</option>
                  <option value="명동/중구">명동/중구</option>
                  <option value="강북/노원">강북/노원</option>
                  <option value="서초구">서초구</option>
                  <option value="마포구">마포구</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">활성 시간</label>
                <select
                  value={openMeetHours}
                  onChange={(e) => setOpenMeetHours(Number(e.target.value))}
                  className="w-full p-2 rounded border text-xs"
                  disabled={user?.openToMeet}
                >
                  <option value={6}>6시간</option>
                  <option value={12}>12시간</option>
                  <option value={24}>24시간</option>
                </select>
              </div>
            </div>
          </div>

          {/* Portfolio Mode 토글 - 인플루언서만 */}
          {user?.userType === 'influencer' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={18} className="text-purple-600" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900">
                    포트폴리오 모드
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.portfolioMode && user?.publicProfileUrl
                      ? `공개 프로필: /${user.publicProfileUrl}`
                      : '당신의 서비스와 패키지를 공개 프로필로 showcase하세요'}
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
                          title: '프로필 URL 필요',
                          description: '포트폴리오 모드를 활성화하려면 3자 이상의 프로필 URL을 입력해주세요.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      // URL 형식 검증
                      const urlPattern = /^[a-zA-Z0-9_-]+$/;
                      if (!urlPattern.test(publicProfileUrl.trim())) {
                        setPortfolioSwitchChecked(false);
                        toast({
                          title: '잘못된 URL 형식',
                          description: '프로필 URL은 영문, 숫자, _, - 만 사용 가능합니다.',
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
                <label className="block text-gray-600 mb-1">공개 프로필 URL</label>
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
                    title="영문, 숫자, _, - 만 사용 가능합니다"
                  />
                </div>
                <p className="text-gray-400 mt-1">영문, 숫자, _, - 만 사용 가능 (3-50자)</p>
              </div>
            </div>
          )}

          <Button 
            className="travel-button-outline"
            onClick={() => setShowProfileEditModal(true)}
            data-testid="button-edit-profile"
          >
            <Edit3 size={16} className="mr-2" />
            프로필 편집
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.posts}</div>
            <div className="text-xs text-gray-500">게시글</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.trips}</div>
            <div className="text-xs text-gray-500">여행</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.followers}
            </div>
            <div className="text-xs text-gray-500">팔로워</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.following}
            </div>
            <div className="text-xs text-gray-500">팔로잉</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.experiences}
            </div>
            <div className="text-xs text-gray-500">체험</div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8 bg-gray-50 p-1 mx-4 mt-4 rounded-lg">
          <TabsTrigger value="posts" className="text-xs">
            게시글
          </TabsTrigger>
          <TabsTrigger value="trips" className="text-xs">
            여행
          </TabsTrigger>
          <TabsTrigger value="experiences" className="text-xs">
            체험
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs">
            예약
          </TabsTrigger>
          {(user?.userType === 'local_guide' || user?.isHost) && (
            <TabsTrigger value="host-bookings" className="text-xs" data-testid="tab-host-bookings">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>받은예약</span>
              </div>
            </TabsTrigger>
          )}
          <TabsTrigger value="help-requests" className="text-xs" data-testid="tab-help-requests">
            도움요청
          </TabsTrigger>
          <TabsTrigger value="service-templates" className="text-xs" data-testid="tab-service-templates">
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>템플릿</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="service-packages" className="text-xs" data-testid="tab-service-packages">
            <div className="flex items-center space-x-1">
              <ShoppingBag className="w-3 h-3" />
              <span>패키지</span>
            </div>
          </TabsTrigger>
          {(user?.userType === 'local_guide' || user?.isHost) && (
            <TabsTrigger value="slots" className="text-xs" data-testid="tab-slots">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>슬롯</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="posts" className="mt-4 px-4">
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📸</div>
              <p className="text-gray-500 text-sm">아직 게시한 사진이 없어요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post: Post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center"
                >
                  <span className="text-2xl">📷</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-4 px-4">
          {trips.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✈️</div>
              <p className="text-gray-500 text-sm">계획된 여행이 없어요</p>
              <Button 
                className="travel-button mt-3"
                onClick={() => setShowTimelineCreateModal(true)}
                data-testid="button-plan-trip"
              >
                <Calendar size={16} className="mr-2" />
                여행 계획하기
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
              <p className="text-gray-500 text-sm">등록한 체험이 없어요</p>
              <Button 
                className="travel-button mt-3"
                onClick={() => setShowCreateExperienceModal(true)}
                data-testid="button-create-experience"
              >
                체험 등록하기
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
    </div>
  );
}
