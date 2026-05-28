// 피드 페이지 — 여행 게시글 스마트 피드를 스크롤 형태로 보여주고, 게시글 작성·좋아요·댓글·저장 기능을 제공한다.
import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  MapPin,
  MoreHorizontal,
  Calendar,
  ArrowLeft,
  Share2,
  Flag,
  Edit3,
  Trash2,
  Bookmark,
  BookmarkCheck,
  PenLine,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import PostDetailModal from '@/components/PostDetailModal';
import CreatePostModal from '@/components/CreatePostModal';
import CreateExperienceModal from '@/components/CreateExperienceModal';
import { VirtualizedFeed, FeedStats } from '@/components/VirtualizedFeed';
import type { Experience } from '@shared/schema';
import { groupSimilarPosts } from '@/utils/postGrouping';
import type { Post } from '@shared/schema';
import { ImageFallback } from '@/components/ImageFallback';
import SmartImage from '@/components/SmartImage';
import { Seo } from '@/components/Seo';
import { type FeedMode } from '@/components/FeedModeSelector';
import { useAuth } from '@/hooks/useAuth';
import ExploreReelsViewer from '@/components/explore/ExploreReelsViewer';
import ExploreTopBar, { type ExploreSegment } from '@/components/explore/ExploreTopBar';
import CategoryTabs, { type ExploreCategory } from '@/components/explore/CategoryTabs';
import ExploreGrid from '@/components/explore/ExploreGrid';
import type { ExploreCardProps } from '@/components/explore/ExploreCard';

// localStorage 키 상수
const LIKED_POSTS_KEY = 'likedPosts';

// YouTube URL에서 video ID 추출
const extractYouTubeVideoId = (text: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

// YouTube Embed 컴포넌트
const YouTubeEmbed = ({ videoId }: { videoId: string }) => (
  <div className="relative w-full pt-[56.25%] mb-3 rounded-lg overflow-hidden">
    <iframe
      className="absolute top-0 left-0 w-full h-full"
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
);

// localStorage 헬퍼 함수들
const getLikedPostsFromStorage = (userId?: string): Set<number> => {
  if (!userId) return new Set();
  
  try {
    const key = `${LIKED_POSTS_KEY}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const likedIds = JSON.parse(stored);
      return new Set(likedIds);
    }
  } catch (error) {
    console.warn('Failed to load liked posts from localStorage:', error);
  }
  return new Set();
};

const saveLikedPostsToStorage = (likedPosts: Set<number>, userId?: string) => {
  if (!userId) return;
  
  try {
    const key = `${LIKED_POSTS_KEY}_${userId}`;
    const likedIds = Array.from(likedPosts);
    localStorage.setItem(key, JSON.stringify(likedIds));
  } catch (error) {
    console.warn('Failed to save liked posts to localStorage:', error);
  }
};

type FilterType = 'all' | 'posts' | 'experiences';

interface FeedProps {
  onBack?: () => void;
  initialPostId?: number | undefined;
}

export default function Feed({ onBack, initialPostId }: FeedProps = {}) {
  const { t, i18n } = useTranslation('ui');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [hasOpenedInitialPost, setHasOpenedInitialPost] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editExperience, setEditExperience] = useState<Experience | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [useVirtualization, setUseVirtualization] = useState(true);
  const [failedImages, setFailedImages] = useState(new Set<number>());
  const [filter, setFilter] = useState<FilterType>('all');
  const [feedMode, setFeedMode] = useState<FeedMode>('smart');
  const [exploreMode, setExploreMode] = useState<'stories' | 'reels' | 'nearby'>('stories');
  const [showReelsViewer, setShowReelsViewer] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [exploreSegment, setExploreSegment] = useState<ExploreSegment>('추천');
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>('전체');
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: smartFeedPosts = [], isLoading: isLoadingFeed } = useQuery<(Post & { score?: number; hashtags?: { id: number; name: string }[]; isSaved?: boolean })[]>({
    queryKey: ['/api/feed', feedMode],
    queryFn: async () => {
      const params = new URLSearchParams({
        mode: feedMode,
        limit: '50',
      });
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          );
          params.set('lat', position.coords.latitude.toString());
          params.set('lng', position.coords.longitude.toString());
        } catch {}
      }
      const response = await fetch(`/api/feed?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch feed');
      return response.json();
    },
  });

  const posts = smartFeedPosts;

  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery<any[]>({
    queryKey: ['/api/experiences'],
  });

  const { data: savedPostsData = [] } = useQuery<{ id: number }[]>({
    queryKey: ['/api/me/saved-posts'],
    queryFn: async () => {
      const response = await fetch('/api/me/saved-posts?limit=100');
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30000,
  });

  useEffect(() => {
    setSavedPosts(new Set(savedPostsData.map(p => p.id)));
  }, [savedPostsData]);

  // initialPostId가 있으면 자동으로 해당 포스트 열기 (한 번만)
  useEffect(() => {
    if (initialPostId && posts.length > 0 && !hasOpenedInitialPost) {
      const post = posts.find(p => p.id === initialPostId);
      if (post) {
        setSelectedPost(post);
        setHasOpenedInitialPost(true);
      }
    }
  }, [initialPostId, posts, hasOpenedInitialPost]);

  const isLoading = isLoadingFeed || isLoadingExperiences;

  // 중앙화된 useAuth 훅 사용 (중복 요청 방지)
  const { user: currentUser } = useAuth();

  // 좋아요 상태 - localStorage에서 초기화
  const [likedPosts, setLikedPosts] = useState<Set<number>>(() => 
    getLikedPostsFromStorage(currentUser?.id)
  );

  // 사용자가 로그인하면 localStorage에서 좋아요 상태 로드
  useEffect(() => {
    if (currentUser?.id) {
      const storedLikes = getLikedPostsFromStorage(currentUser.id);
      setLikedPosts(storedLikes);
    }
  }, [currentUser?.id]);

  // 좋아요 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (currentUser?.id) {
      saveLikedPostsToStorage(likedPosts, currentUser.id);
    }
  }, [likedPosts, currentUser?.id]);

  // experiences를 post 형식으로 변환 (hostId 유지)
  const experiencesAsPosts = experiences.map((exp: any) => ({
    ...exp,
    type: 'experience' as const,
    userId: exp.hostId || exp.providerId || 'Host',
    hostId: exp.hostId,
    content: exp.description || '',
    images: exp.images || [],
    likesCount: 0,
    commentsCount: 0,
  }));

  // posts와 experiences 통합 및 필터링
  const allItems = [...posts.map(p => ({ ...p, type: 'post' as const })), ...experiencesAsPosts];
  
  // 모든 탭에서 동일한 정렬 기준 적용: createdAt 최신순
  const sortedAllItems = [...allItems].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA; // 최신순
  });
  
  const filteredItems = filter === 'all' 
    ? sortedAllItems 
    : filter === 'posts' 
      ? sortedAllItems.filter(item => item.type === 'post')
      : sortedAllItems.filter(item => item.type === 'experience');

  // 디버그: 데이터 확인
  console.log('[MoVi Debug]', {
    filter,
    postsCount: posts.length,
    experiencesCount: experiences.length,
    experiencesAsPostsCount: experiencesAsPosts.length,
    allItemsCount: allItems.length,
    filteredItemsCount: filteredItems.length,
    experiencesInAll: allItems.filter(i => i.type === 'experience').length,
  });

  // UI 통일: 모든 탭에서 가상화 비활성화하고 동일한 UI 사용
  const shouldUseVirtualization = false; // 가상화 비활성화로 UI 통일
  const postGroups = groupSimilarPosts(posts);

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      return api(`/api/posts/${postId}/like`, { method: 'POST' });
    },
    onMutate: async (postId) => {
      const feedQueryKey = ['/api/feed', feedMode];
      await queryClient.cancelQueries({ queryKey: feedQueryKey });
      
      const previousPosts = queryClient.getQueryData<Post[]>(feedQueryKey);
      
      queryClient.setQueryData<Post[]>(feedQueryKey, (oldPosts) => {
        if (!oldPosts) return oldPosts;
        return oldPosts.map(post => {
          if (post.id === postId) {
            const isCurrentlyLiked = likedPosts.has(postId);
            const newCount = isCurrentlyLiked ? (post.likesCount || 1) - 1 : (post.likesCount || 0) + 1;
            return {
              ...post,
              likesCount: newCount
            };
          }
          return post;
        });
      });
      
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        const wasLiked = newSet.has(postId);
        if (wasLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
      
      return { previousPosts, feedQueryKey };
    },
    onError: (err, postId, context) => {
      if (context?.previousPosts && context?.feedQueryKey) {
        queryClient.setQueryData(context.feedQueryKey, context.previousPosts);
      }
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed', feedMode] });
    },
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const handleLike = (postId: number) => {
    // 이미 처리 중인 요청이면 무시
    if (likeMutation.isPending) {
      return;
    }
    
    likeMutation.mutate(postId);
  };

  // 포스트 저장(북마크) 핸들러
  const handleSave = async (postId: number) => {
    const isCurrentlySaved = savedPosts.has(postId);
    
    // 낙관적 업데이트
    setSavedPosts((prev) => {
      const newSet = new Set(prev);
      if (isCurrentlySaved) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    
    try {
      if (isCurrentlySaved) {
        await api(`/api/posts/${postId}/save`, { method: 'DELETE' });
        toast({
          title: t('feedPage.unsaved'),
          description: t('feedPage.unsavedDesc'),
        });
      } else {
        await api(`/api/posts/${postId}/save`, { method: 'POST' });
        toast({
          title: t('feedPage.saved'),
          description: t('feedPage.savedDesc'),
        });
      }
    } catch (error) {
      // 실패 시 롤백
      setSavedPosts((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlySaved) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
      toast({
        title: t('feedPage.saveFailed'),
        description: t('feedPage.saveFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleSharePost = (post: Post) => {
    if (navigator.share) {
      navigator.share({
        title: post.title || t('feedPage.title'),
        text: post.content || '',
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: t('feedPage.linkCopied'),
          description: t('feedPage.linkCopiedDesc'),
        });
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: t('feedPage.linkCopied'),
        description: t('feedPage.linkCopiedDesc'),
      });
    }
  };

  const handleReportPost = async (post: Post) => {
    // T13/M-E: POST /api/reports 호출로 실제 접수. UX(전용 모달)는 추후 별도 작업.
    const reasonInput = window.prompt(
      '신고 사유를 선택해 입력하세요: spam / harassment / inappropriate / fraud / other',
      'inappropriate'
    );
    if (!reasonInput) return;
    const reason = reasonInput.trim().toLowerCase();
    const allowed = ['spam', 'harassment', 'inappropriate', 'fraud', 'other'];
    if (!allowed.includes(reason)) {
      toast({ title: '잘못된 사유', description: `허용값: ${allowed.join(', ')}`, variant: 'destructive' });
      return;
    }
    const description = window.prompt('상세 설명(선택 사항)', '') || undefined;
    try {
      await api('/api/reports', {
        method: 'POST',
        body: { targetType: 'post', targetId: String(post.id), reason, description },
      });
      toast({
        title: t('feedPage.reported'),
        description: t('feedPage.reportedDesc', { title: post.title }),
      });
    } catch (err: any) {
      toast({
        title: '신고 실패',
        description: err?.message || '잠시 후 다시 시도해 주세요.',
        variant: 'destructive',
      });
    }
  };

  const handleEditPost = (post: Post) => {
    setEditPost(post);
  };

  const handleDeletePost = async (post: Post) => {
    if (confirm(t('feedPage.confirmDelete', { title: post.title }))) {
      try {
        await api(`/api/posts/${post.id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['/api/feed', feedMode] });
        toast({
          title: t('feedPage.deleteSuccess'),
          description: t('feedPage.deleteSuccessDesc'),
        });
      } catch (error) {
        toast({
          title: t('feedPage.deleteFailed'),
          description: t('feedPage.deleteFailedDesc'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditExperience = (experience: any) => {
    setEditExperience(experience);
  };

  const handleDeleteExperience = async (experience: any) => {
    if (confirm(t('feedPage.confirmDeleteExperience', { title: experience.title }) || `Delete "${experience.title}"?`)) {
      try {
        await api(`/api/experiences/${experience.id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
        toast({
          title: t('feedPage.deleteExperienceSuccess') || 'Experience deleted',
          description: t('feedPage.deleteExperienceSuccessDesc') || 'Your experience has been deleted.',
        });
      } catch (error) {
        toast({
          title: t('feedPage.deleteExperienceFailed') || 'Delete failed',
          description: t('feedPage.deleteExperienceFailedDesc') || 'Failed to delete experience.',
          variant: 'destructive',
        });
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: 'save' | 'unsave' }) => {
      const method = action === 'save' ? 'POST' : 'DELETE';
      return api(`/api/posts/${postId}/save`, { method });
    },
    onMutate: async ({ postId, action }) => {
      setSavedPosts((prev) => {
        const newSet = new Set(prev);
        if (action === 'save') {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/saved-posts'] });
    },
  });

  const handleSavePost = (postId: number) => {
    const isSaved = savedPosts.has(postId);
    saveMutation.mutate({ postId, action: isSaved ? 'unsave' : 'save' });
  };

  const handleHashtagClick = (hashtag: { id: number; name: string }) => {
    setLocation(`/feed?hashtag=${hashtag.id}`);
    toast({
      title: `#${hashtag.name}`,
      description: t('feedPage.viewingHashtag') || 'Viewing posts with this hashtag',
    });
  };

  if (isLoading) {
    return (
      <div className="mobile-content p-4">
        <Seo 
          title={t('feedPage.title')}
          desc="Share and discover authentic travel experiences from local hosts and travelers"
        />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="travel-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Map filteredItems → ExploreCardProps for v3 grid
  const exploreItems: ExploreCardProps[] = filteredItems.map((item: any) => {
    const isExp = item.type === 'experience';
    return {
      id: item.id,
      type: item.type,
      title: item.title || (isExp ? '체험' : '스토리'),
      subtitle: item.content ? item.content.slice(0, 80) : undefined,
      imageUrl: item.images?.[0] && !item.images[0].startsWith('dummy_') ? item.images[0] : undefined,
      location: item.location || undefined,
      category: item.tags?.[0] || (isExp ? '체험' : '스토리'),
      isLiked: likedPosts.has(item.id),
      likesCount: item.likesCount ?? 0,
      isSaved: savedPosts.has(item.id),
      onLike: (e: MouseEvent) => { e.stopPropagation(); handleLike(item.id); },
      onSave: (e: MouseEvent) => { e.stopPropagation(); handleSavePost(item.id); },
      onClick: () => {
        if (isExp) setLocation(`/experience/${item.id}`);
        else setSelectedPost(item);
      },
    };
  });

  return (
    <div
      className="mobile-content"
      ref={containerRef}
      style={{ height: 'calc(100vh - 78px - env(safe-area-inset-bottom))', overflow: 'auto', background: 'var(--app-bg)' }}
    >
      <Seo
        title={t('feedPage.title')}
        desc="Share and discover authentic travel experiences from local hosts and travelers"
      />

      {/* v3 Header: TopBar + CategoryTabs */}
      <ExploreTopBar
        segment={exploreSegment}
        onSegmentChange={setExploreSegment}
        onCreateClick={() => setShowCreatePost(true)}
      />
      <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

      {/* v3 Explore Grid */}
      <ExploreGrid items={exploreItems} isLoading={isLoading} />

      {/* Post Detail Modal */}
      {showReelsViewer && (
        <ExploreReelsViewer
          posts={smartFeedPosts as any}
          onClose={() => setShowReelsViewer(false)}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={
            // 최신 포스트 데이터로 업데이트
            posts?.find(p => p.id === selectedPost.id) || selectedPost
          }
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          isLiked={likedPosts.has(selectedPost.id)}
          onSave={handleSave}
          isSaved={savedPosts.has(selectedPost.id)}
          onShare={handleSharePost}
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />

      {/* Edit Post Modal */}
      <CreatePostModal
        isOpen={!!editPost}
        onClose={() => setEditPost(null)}
        editPost={editPost}
      />

      {/* Edit Experience Modal */}
      <CreateExperienceModal
        isOpen={!!editExperience}
        onClose={() => setEditExperience(null)}
        editExperience={editExperience}
      />
    </div>
  );
}
