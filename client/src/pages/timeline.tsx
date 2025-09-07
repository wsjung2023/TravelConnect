import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Users,
  Clock,
  Heart,
  MessageCircle,
} from 'lucide-react';
import PostDetailModal from '@/components/PostDetailModal';
import TimelineCreateModal from '@/components/TimelineCreateModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timeline, Post } from '@shared/schema';

interface TimelineWithPosts extends Timeline {
  posts: Post[];
}

export default function TimelinePage() {
  const [selectedTimeline, setSelectedTimeline] =
    useState<TimelineWithPosts | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 전역 함수로 모달 열기 등록
  useEffect(() => {
    (window as any).openTimelineModal = (fromFeed = false) => {
      console.log('타임라인 모달 열기 함수 호출됨, fromFeed:', fromFeed);
      setShowCreateModal(true);
      // fromFeed 상태를 저장하기 위해 window에 임시 저장
      (window as any).timelineModalFromFeed = fromFeed;
    };

    return () => {
      delete (window as any).openTimelineModal;
    };
  }, []);

  // 사용자의 타임라인 목록 조회
  const { data: timelines, isLoading } = useQuery<Timeline[]>({
    queryKey: ['/api/timelines'],
  });

  // 선택된 타임라인의 상세 정보 조회
  const { data: timelineDetail } = useQuery<TimelineWithPosts>({
    queryKey: ['/api/timelines', selectedTimeline?.id],
    enabled: !!selectedTimeline?.id,
  });

  // 여행 일정 복제 mutation
  const cloneTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const response = await fetch(`/api/trips/${tripId}/clone`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '일정 복제에 실패했습니다');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ 일정이 복제되었습니다!",
        description: "내 일정에 추가됨. 캘린더에서 확인하세요.",
      });
      // 캘린더 페이지로 이동 (추후 구현)
      console.log('복제된 여행:', data.trip);
    },
    onError: (error) => {
      toast({
        title: "❌ 복제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-pink-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <button
            onClick={() => {
              // 강제로 홈 탭으로 이동
              window.postMessage({ type: 'navigate-home' }, '*');
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span>홈</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">여행 타임라인</h1>
          <Button
            onClick={() => setLocation('/timeline/create')}
            variant="outline"
            size="sm"
            className="travel-button-outline"
            data-testid="add-timeline-button"
          >
            <Plus size={16} className="mr-1" />
            만들기
          </Button>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <div className="mb-4">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">아직 타임라인이 없습니다</h2>
              <p className="text-gray-500 mb-6">사진으로 여행 기록을 만들어보세요</p>
            </div>
            <Button 
              onClick={() => setLocation('/timeline/create')}
              className="travel-button"
              data-testid="create-timeline-button"
            >
              <Plus size={16} className="mr-2" />
              사진으로 타임라인 만들기
            </Button>
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getThemeEmoji = (theme: string) => {
    const themes: Record<string, string> = {
      맛집: '🍽️',
      명소: '🏛️',
      파티타임: '🎉',
      핫플레이스: '🔥',
      힐링: '🌿',
      감성: '💭',
      emotional: '💭',
      healing: '🌿',
      landmark: '🏛️',
      food: '🍽️',
    };
    return themes[theme] || '📍';
  };

  const getDaysByTimeline = (posts: Post[]) => {
    const days = posts.reduce(
      (acc, post) => {
        const day = post.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(post);
        return acc;
      },
      {} as Record<number, Post[]>
    );

    return Object.keys(days)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((day) => ({
        day: parseInt(day),
        posts: days[parseInt(day)].sort(
          (a, b) => {
            // EXIF 기반 타임라인 정렬: takenAt 우선, 없으면 createdAt 사용
            const aTime = a.takenAt ? new Date(a.takenAt).getTime() : new Date(a.createdAt).getTime();
            const bTime = b.takenAt ? new Date(b.takenAt).getTime() : new Date(b.createdAt).getTime();
            return aTime - bTime;
          }
        ),
      }));
  };

  if (selectedTimeline && timelineDetail) {
    const dayGroups = getDaysByTimeline(timelineDetail.posts);

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-pink-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTimeline(null)}
            className="text-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            타임라인 목록
          </Button>
          <h1 className="text-xl font-bold text-gray-900">
            {timelineDetail.title}
          </h1>
          {/* Follow 버튼 - 다른 사용자의 타임라인인 경우에만 표시 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => cloneTripMutation.mutate(timelineDetail.id)}
            disabled={cloneTripMutation.isPending}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-none hover:from-pink-600 hover:to-purple-600"
            data-testid="button-follow-trip"
          >
            <Heart className="w-4 h-4 mr-1" />
            {cloneTripMutation.isPending ? '복제 중...' : '일정 복제'}
          </Button>
        </div>
        <div className="p-4 pb-32 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* 타임라인 정보 */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      {timelineDetail.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      {timelineDetail.destination && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {timelineDetail.destination}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(timelineDetail.startDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {timelineDetail.totalDays}일
                      </div>
                    </div>
                  </div>
                </div>
                {timelineDetail.description && (
                  <p className="text-gray-600 mt-3">
                    {timelineDetail.description}
                  </p>
                )}
              </CardHeader>
            </Card>

            {/* Day별 타임라인 */}
            <div className="space-y-8 pb-10">
              {dayGroups.map(({ day, posts }) => (
                <div key={day} className="relative">
                  {/* Day 헤더 */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-teal-500 text-white px-4 py-2 rounded-full font-bold">
                      DAY {day}
                    </div>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>

                  {/* 해당 Day의 포스트들 */}
                  <div className="space-y-4 ml-8">
                    {posts.map((post, index) => (
                      <Card
                        key={post.id}
                        className="relative cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('카드 클릭됨:', post.title);
                          console.log(
                            'selectedPost 설정 전:',
                            selectedPost?.title
                          );
                          setSelectedPost(post);
                          console.log('selectedPost 설정 후:', post.title);
                        }}
                      >
                        {/* 타임라인 연결선 */}
                        {index < posts.length - 1 && (
                          <div className="absolute -left-8 top-8 w-px h-full bg-gray-300"></div>
                        )}

                        {/* 타임라인 점 */}
                        <div className="absolute -left-10 top-6 w-4 h-4 bg-teal-500 rounded-full border-2 border-white shadow-sm"></div>

                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* 포스트 이미지 */}
                            {post.images && post.images.length > 0 && (
                              <img
                                src={`/uploads/${post.images[0]}`}
                                alt={post.title || ''}
                                className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src =
                                    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=200&fit=crop';
                                }}
                              />
                            )}

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {post.theme && (
                                  <span className="text-lg">
                                    {getThemeEmoji(post.theme)}
                                  </span>
                                )}
                                <h3 className="font-semibold text-gray-800">
                                  {post.title || '제목 없음'}
                                </h3>
                                {post.postTime && (
                                  <span className="text-sm text-gray-500">
                                    {post.postTime}
                                  </span>
                                )}
                              </div>

                              {post.content && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                  {post.content}
                                </p>
                              )}

                              {post.location && (
                                <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                                  <MapPin className="w-3 h-3" />
                                  {post.location}
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-4 h-4" />
                                    {post.likesCount}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="w-4 h-4" />
                                    {post.commentsCount}
                                  </div>
                                </div>
                                <span className="text-xs text-blue-600">
                                  상세보기 →
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Post Detail Modal - 타임라인 상세보기에서도 표시 */}
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            isOpen={true}
            onClose={() => {
              console.log('모달 닫기 클릭');
              setSelectedPost(null);
            }}
            onLike={(postId) => {
              console.log('좋아요 클릭:', postId);
              setLikedPosts((prev) => new Set([...prev, postId]));
            }}
            isLiked={likedPosts.has(selectedPost.id)}
          />
        )}
      </div>
    );
  }

  // 타임라인 목록 보기
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-pink-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <button
          onClick={() => {
            // 강제로 홈 탭으로 이동
            window.postMessage({ type: 'navigate-home' }, '*');
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>홈</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">여행 타임라인</h1>
        <div className="w-8"></div>
      </div>
      <div className="p-4 pb-32 max-h-[calc(100vh-80px)] overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🗓️ 나의 여행 타임라인
          </h1>

          {/* 타임라인 목록 */}
          <div className="grid gap-4 pb-10">
            {timelines && timelines.length > 0 ? (
              <>
                {timelines.map((timeline) => (
                  <button
                    key={timeline.id}
                    className="w-full text-left cursor-pointer hover:shadow-lg transition-shadow bg-white rounded-lg border p-6 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onClick={() => {
                      console.log(
                        '타임라인 카드 클릭:',
                        timeline.title,
                        timeline.id
                      );
                      setSelectedTimeline(timeline as TimelineWithPosts);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          {timeline.title}
                        </h3>

                        <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                          {timeline.destination && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {timeline.destination}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(timeline.startDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {timeline.totalDays}일
                          </div>
                        </div>

                        {timeline.description && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {timeline.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* 새 타임라인 만들기 버튼 - 목록 맨 마지막에 표시 */}
                <div
                  className="border-2 border-dashed border-teal-300 hover:border-teal-500 cursor-pointer transition-all rounded-lg bg-white p-6 text-center"
                  onClick={() => {
                    console.log('새 타임라인 만들기 클릭');
                    setShowCreateModal(true);
                  }}
                >
                  <Plus className="w-8 h-8 mx-auto mb-3 text-teal-500" />
                  <h3 className="text-lg font-semibold text-teal-600 mb-2">
                    새 타임라인 만들기
                  </h3>
                  <p className="text-sm text-gray-500">
                    새로운 여행 타임라인을 생성하세요
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  타임라인이 없어요
                </h3>
                <p className="text-gray-600 mb-6">
                  첫 번째 여행 타임라인을 만들어보세요!
                </p>
                <Button
                  className="bg-teal-500 hover:bg-teal-600"
                  onClick={() => {
                    console.log('새 타임라인 만들기 클릭 (빈 상태)');
                    setShowCreateModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />새 타임라인 만들기
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 하단 여백 - 네비게이션 바와 겹치지 않도록 */}
        <div className="h-20"></div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={(postId) => {
            setLikedPosts((prev) => new Set([...prev, postId]));
          }}
          isLiked={likedPosts.has(selectedPost.id)}
        />
      )}

      {/* Timeline Create Modal */}
      <TimelineCreateModal
        isOpen={showCreateModal}
        fromFeed={(window as any).timelineModalFromFeed || false}
        onClose={() => {
          setShowCreateModal(false);
          // fromFeed 상태 초기화
          (window as any).timelineModalFromFeed = false;
        }}
        onSubmit={async (data) => {
          console.log('타임라인 생성 데이터:', data);
          try {
            // 날짜를 Date 객체로 변환
            const timelineData = {
              ...data,
              startDate: new Date(data.startDate),
            };

            const response = await fetch('/api/timelines', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(timelineData),
            });

            if (response.ok) {
              console.log('타임라인 생성 성공!');
              setShowCreateModal(false);

              // 피드로 돌아가기 (임시저장된 피드 내용이 있다면 복원됨)
              window.postMessage(
                { type: 'timeline-created-return-to-feed' },
                '*'
              );
            } else {
              const error = await response.json();
              console.error('타임라인 생성 실패:', error);
              alert('타임라인 생성에 실패했습니다: ' + error.message);
            }
          } catch (error) {
            console.error('타임라인 생성 오류:', error);
            alert('타임라인 생성 중 오류가 발생했습니다.');
          }
        }}
      />
    </div>
  );
}
