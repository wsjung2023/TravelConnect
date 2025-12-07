import { useState, useRef, useEffect } from 'react';
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
import FeedModeSelector, { type FeedMode } from '@/components/FeedModeSelector';
import TrendingHashtags from '@/components/TrendingHashtags';

// localStorage 키 상수
const LIKED_POSTS_KEY = 'likedPosts';

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
  initialPostId?: number;
}

export default function Feed({ onBack, initialPostId }: FeedProps = {}) {
  const { t, i18n } = useTranslation('ui');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editExperience, setEditExperience] = useState<Experience | null>(null);
  const [useVirtualization, setUseVirtualization] = useState(true);
  const [failedImages, setFailedImages] = useState(new Set<number>());
  const [filter, setFilter] = useState<FilterType>('all');
  const [feedMode, setFeedMode] = useState<FeedMode>('smart');
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
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

  // initialPostId가 있으면 자동으로 해당 포스트 열기
  useEffect(() => {
    if (initialPostId && posts.length > 0 && !selectedPost) {
      const post = posts.find(p => p.id === initialPostId);
      if (post) {
        setSelectedPost(post);
      }
    }
  }, [initialPostId, posts, selectedPost]);

  const isLoading = isLoadingFeed || isLoadingExperiences;

  const { data: currentUser } = useQuery<{ id: string; email: string; role?: string }>({
    queryKey: ['/api/auth/me'],
  });

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
  const filteredItems = filter === 'all' 
    ? allItems 
    : filter === 'posts' 
      ? allItems.filter(item => item.type === 'post')
      : allItems.filter(item => item.type === 'experience');

  // 포스트 수가 많으면 자동으로 가상화 활성화
  const shouldUseVirtualization = filteredItems.length > 20 || useVirtualization;
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

  const handleReportPost = (post: Post) => {
    // TODO: Implement report functionality
    toast({
      title: t('feedPage.reported'),
      description: t('feedPage.reportedDesc', { title: post.title }),
    });
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

  return (
    <div className="mobile-content" ref={containerRef} style={{ height: '100vh', overflow: 'auto' }}>
      <Seo 
        title={t('feedPage.title')}
        desc="Share and discover authentic travel experiences from local hosts and travelers"
      />
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack || (() => setLocation('/'))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">{t('feedPage.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/timeline">
              <button className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors">
                <Calendar size={20} className="text-purple-600" />
              </button>
            </Link>
          </div>
        </div>
        
        {/* MoVi Description Banner */}
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-t">
          <p className="text-xs font-semibold text-purple-600 mb-1">{t('feed.subtitle')}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{t('feed.description')}</p>
        </div>
        
        {/* Feed Mode Selector */}
        <div className="px-4 pb-2">
          <FeedModeSelector mode={feedMode} onModeChange={setFeedMode} />
        </div>

        {/* Trending Hashtags */}
        <div className="px-4 pb-3">
          <TrendingHashtags onHashtagClick={handleHashtagClick} />
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="filter-all"
          >
            {t('filter.all')}
          </button>
          <button
            onClick={() => setFilter('posts')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'posts'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="filter-posts"
          >
            {t('filter.posts')}
          </button>
          <button
            onClick={() => setFilter('experiences')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'experiences'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            data-testid="filter-experiences"
          >
            {t('filter.experiences')}
          </button>
        </div>
      </div>

      {/* 통계 정보 */}
      {shouldUseVirtualization && posts.length > 0 && (
        <div className="p-4 pb-0">
          <FeedStats 
            originalCount={posts.length}
            groupedCount={postGroups.length}
          />
        </div>
      )}

      {/* Posts */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filter === 'experiences' ? t('feedPage.noExperiences') : t('feedPage.noFeed')}
        </div>
      ) : shouldUseVirtualization ? (
        <VirtualizedFeed
          posts={filteredItems as Post[]}
          onPostClick={(post) => setSelectedPost(post)}
          containerRef={containerRef}
        />
      ) : (
        <div className="space-y-4 p-4">
          {filteredItems.map((item: any) => {
            const isExperience = item.type === 'experience';
            
            return (
            <div 
              key={`${item.type}-${item.id}`} 
              className="travel-card p-4"
              onClick={() => {
                if (isExperience) {
                  setLocation(`/experience/${item.id}`);
                }
              }}
              style={isExperience ? { cursor: 'pointer' } : undefined}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.userId}`}
                    />
                    <AvatarFallback>
                      {item.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{item.userId}</p>
                    <p className="text-xs text-gray-500">
                      {formatTime(item.createdAt || new Date())}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-full"
                      data-testid={`button-menu-${item.id}`}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); handleSharePost(item); }}
                      data-testid={`item-share-${item.id}`}
                    >
                      <Share2 size={16} className="mr-2" />
                      {t('feedPage.share')}
                    </DropdownMenuItem>
                    
                    {/* Owner actions for posts */}
                    {!isExperience && currentUser?.id === item.userId && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleEditPost(item); }}
                          data-testid={`item-edit-${item.id}`}
                        >
                          <Edit3 size={16} className="mr-2" />
                          {t('feedPage.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDeletePost(item); }}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`item-delete-${item.id}`}
                        >
                          <Trash2 size={16} className="mr-2" />
                          {t('feedPage.delete')}
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Owner actions for experiences */}
                    {isExperience && currentUser?.id === (item.hostId || item.userId) && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleEditExperience(item); }}
                          data-testid={`item-edit-exp-${item.id}`}
                        >
                          <Edit3 size={16} className="mr-2" />
                          {t('feedPage.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDeleteExperience(item); }}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`item-delete-exp-${item.id}`}
                        >
                          <Trash2 size={16} className="mr-2" />
                          {t('feedPage.delete')}
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {currentUser?.id !== item.userId && currentUser?.id !== (isExperience ? item.hostId : null) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleReportPost(item); }}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`item-report-${item.id}`}
                        >
                          <Flag size={16} className="mr-2" />
                          {t('feedPage.report')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Content */}
              <div className="mb-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {item.content}
                </p>

                {/* Location */}
                {item.location && (
                  <div className="flex items-center gap-1 mt-2 text-gray-500">
                    <MapPin size={14} />
                    <span className="text-xs">{item.location}</span>
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Image with Shape */}
              {item.images && item.images.length > 0 && (
                <div
                  className={`mb-3 overflow-hidden ${
                    item.shape === 'heart'
                      ? 'rounded-full'
                      : item.shape === 'cloud'
                        ? 'rounded-3xl'
                        : item.shape === 'wave'
                          ? 'rounded-2xl transform rotate-2'
                          : item.shape === 'polaroid'
                            ? 'rounded border-8 border-white shadow-lg'
                            : 'rounded-lg'
                  }`}
                >
                  {item.images?.[0]?.startsWith('dummy_') ? (
                    <div
                      className={`w-full h-64 flex items-center justify-center ${
                        item.shape === 'heart'
                          ? 'bg-gradient-to-br from-pink-300 to-red-300'
                          : item.shape === 'cloud'
                            ? 'bg-gradient-to-br from-blue-200 to-white'
                            : item.shape === 'wave'
                              ? 'bg-gradient-to-br from-teal-200 to-blue-200'
                              : item.shape === 'polaroid'
                                ? 'bg-white'
                                : 'bg-gradient-to-br from-teal-200 to-pink-200'
                      }`}
                    >
                      <span className="text-white text-2xl">
                        {item.shape === 'heart'
                          ? '💖'
                          : item.shape === 'cloud'
                            ? '☁️'
                            : item.shape === 'wave'
                              ? '🌊'
                              : item.shape === 'polaroid'
                                ? '📸'
                                : '📷'}
                      </span>
                    </div>
                  ) : failedImages.has(item.id) ? (
                    <ImageFallback 
                      shape={item.shape ?? undefined} 
                      className="w-full h-64 bg-gradient-to-br flex items-center justify-center" 
                    />
                  ) : (
                  <SmartImage
                          alt={item.title ?? ''}
                          className={`w-full h-64 object-cover ${
                            item.shape === 'heart' ? 'clip-path-heart' : ''
                          }`}
                          widthHint={720} // 카드 영역 폭 기준
                          // 서버가 썸네일/카드/풀을 아직 안 주더라도 OK (src로 자동 fallback)
                          src={item.images?.[0] || ''}
                          // variants가 있다면 여기에 붙이세요(없으면 생략): variants={item.imageVariants}
                          onError={() => {
                            setFailedImages(prev => new Set(prev).add(item.id));
                          }}
                        />
                  )}
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(item.id)}
                      disabled={likeMutation.isPending}
                      className={`flex items-center gap-2 transition-colors ${
                        likedPosts.has(item.id)
                          ? 'text-red-500'
                          : 'text-gray-600 hover:text-red-500'
                      } ${likeMutation.isPending ? 'opacity-50' : ''}`}
                      data-testid={`button-like-${item.id}`}
                    >
                      <Heart
                        size={20}
                        className={
                          likedPosts.has(item.id) ? 'fill-current' : ''
                        }
                      />
                      <span className="text-sm">{item.likesCount || 0}</span>
                    </button>
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                      onClick={() => setSelectedPost(item)}
                      data-testid={`button-comment-${item.id}`}
                    >
                      <MessageCircle size={20} />
                      <span className="text-sm">{item.commentsCount || 0}</span>
                    </button>
                    {!isExperience && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSavePost(item.id); }}
                        disabled={saveMutation.isPending}
                        className={`flex items-center gap-1 transition-colors ${
                          savedPosts.has(item.id)
                            ? 'text-purple-500'
                            : 'text-gray-600 hover:text-purple-500'
                        }`}
                        data-testid={`button-save-${item.id}`}
                      >
                        {savedPosts.has(item.id) ? (
                          <BookmarkCheck size={20} className="fill-current" />
                        ) : (
                          <Bookmark size={20} />
                        )}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPost(item)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                    data-testid={`button-view-${item.id}`}
                  >
                    {t('feedPage.viewDetails')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Post Detail Modal */}
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
        />
      )}

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
