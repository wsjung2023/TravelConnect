import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { VirtualizedFeed, FeedStats } from '@/components/VirtualizedFeed';
import { groupSimilarPosts } from '@/utils/postGrouping';
import type { Post } from '@shared/schema';
import { ImageFallback } from '@/components/ImageFallback';
import SmartImage from '@/components/SmartImage';
import { Seo } from '@/components/Seo';

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

export default function Feed() {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set<number>());
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts'],
  });

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

  // 포스트 수가 많으면 자동으로 가상화 활성화
  const shouldUseVirtualization = posts.length > 50 || useVirtualization;
  const postGroups = groupSimilarPosts(posts);

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      return api(`/api/posts/${postId}/like`, { method: 'POST' });
    },
    onMutate: async (postId) => {
      // 옵티미스틱 업데이트: UI를 먼저 업데이트
      await queryClient.cancelQueries({ queryKey: ['/api/posts'] });
      
      const previousPosts = queryClient.getQueryData<Post[]>(['/api/posts']);
      
      // 즉시 UI 업데이트
      queryClient.setQueryData<Post[]>(['/api/posts'], (oldPosts) => {
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
      
      // likedPosts 상태도 즉시 업데이트
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
      
      return { previousPosts };
    },
    onError: (err, postId, context) => {
      // 에러 시 롤백
      if (context?.previousPosts) {
        queryClient.setQueryData(['/api/posts'], context.previousPosts);
      }
      // likedPosts도 롤백
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
      // 완료 후 서버에서 최신 데이터 가져오기
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
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
        title: post.title || '여행 포스트',
        text: post.content || '',
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: '링크가 복사되었습니다!',
          description: '링크를 붙여넣어서 공유하세요.',
        });
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: '링크가 복사되었습니다!',
        description: '링크를 붙여넣어서 공유하세요.',
      });
    }
  };

  const handleReportPost = (post: Post) => {
    // TODO: Implement report functionality
    toast({
      title: '신고 접수',
      description: `게시물 "${post.title}"가 신고되었습니다.`,
    });
  };

  const handleEditPost = (post: Post) => {
    // TODO: Implement edit functionality
    toast({
      title: '편집 기능',
      description: '게시물 편집 기능은 곧 제공됩니다.',
    });
  };

  const handleDeletePost = async (post: Post) => {
    if (confirm(`"${post.title}" 게시물을 삭제하시겠습니까?`)) {
      try {
        await api(`/api/posts/${post.id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        toast({
          title: '게시물 삭제',
          description: '게시물이 성공적으로 삭제되었습니다.',
        });
      } catch (error) {
        toast({
          title: '삭제 실패',
          description: '게시물 삭제 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="mobile-content p-4">
        <Seo 
          title="여행 피드"
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
        title="여행 피드"
        desc="Share and discover authentic travel experiences from local hosts and travelers"
      />
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">여행 피드</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* 가상화 토글 */}
          <button
            onClick={() => setUseVirtualization(!useVirtualization)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              shouldUseVirtualization 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {shouldUseVirtualization ? '가상화 ON' : '가상화 OFF'}
          </button>
          <Link href="/timeline">
            <button className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors">
              <Calendar size={20} className="text-purple-600" />
            </button>
          </Link>
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
      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 피드가 없습니다.
        </div>
      ) : shouldUseVirtualization ? (
        <VirtualizedFeed
          posts={posts}
          onPostClick={(post) => setSelectedPost(post)}
          containerRef={containerRef}
        />
      ) : (
        <div className="space-y-4 p-4">
          {posts.map((post: Post) => (
            <div key={post.id} className="travel-card p-4">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.userId}`}
                    />
                    <AvatarFallback>
                      {post.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{post.userId}</p>
                    <p className="text-xs text-gray-500">
                      {formatTime(post.createdAt || new Date())}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 hover:bg-gray-100 rounded-full"
                      data-testid={`button-menu-${post.id}`}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleSharePost(post)}
                      data-testid={`item-share-${post.id}`}
                    >
                      <Share2 size={16} className="mr-2" />
                      공유하기
                    </DropdownMenuItem>
                    
                    {currentUser?.id === post.userId && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleEditPost(post)}
                          data-testid={`item-edit-${post.id}`}
                        >
                          <Edit3 size={16} className="mr-2" />
                          편집하기
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeletePost(post)}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`item-delete-${post.id}`}
                        >
                          <Trash2 size={16} className="mr-2" />
                          삭제하기
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {currentUser?.id !== post.userId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleReportPost(post)}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`item-report-${post.id}`}
                        >
                          <Flag size={16} className="mr-2" />
                          신고하기
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Content */}
              <div className="mb-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {post.content}
                </p>

                {/* Location */}
                {post.location && (
                  <div className="flex items-center gap-1 mt-2 text-gray-500">
                    <MapPin size={14} />
                    <span className="text-xs">{post.location}</span>
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.tags.map((tag, index) => (
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
              {post.images && post.images.length > 0 && (
                <div
                  className={`mb-3 overflow-hidden ${
                    post.shape === 'heart'
                      ? 'rounded-full'
                      : post.shape === 'cloud'
                        ? 'rounded-3xl'
                        : post.shape === 'wave'
                          ? 'rounded-2xl transform rotate-2'
                          : post.shape === 'polaroid'
                            ? 'rounded border-8 border-white shadow-lg'
                            : 'rounded-lg'
                  }`}
                >
                  {post.images?.[0]?.startsWith('dummy_') ? (
                    <div
                      className={`w-full h-64 flex items-center justify-center ${
                        post.shape === 'heart'
                          ? 'bg-gradient-to-br from-pink-300 to-red-300'
                          : post.shape === 'cloud'
                            ? 'bg-gradient-to-br from-blue-200 to-white'
                            : post.shape === 'wave'
                              ? 'bg-gradient-to-br from-teal-200 to-blue-200'
                              : post.shape === 'polaroid'
                                ? 'bg-white'
                                : 'bg-gradient-to-br from-teal-200 to-pink-200'
                      }`}
                    >
                      <span className="text-white text-2xl">
                        {post.shape === 'heart'
                          ? '💖'
                          : post.shape === 'cloud'
                            ? '☁️'
                            : post.shape === 'wave'
                              ? '🌊'
                              : post.shape === 'polaroid'
                                ? '📸'
                                : '📷'}
                      </span>
                    </div>
                  ) : failedImages.has(post.id) ? (
                    <ImageFallback 
                      shape={post.shape ?? undefined} 
                      className="w-full h-64 bg-gradient-to-br flex items-center justify-center" 
                    />
                  ) : (
                  <SmartImage
                          alt={post.title ?? ''}
                          className={`w-full h-64 object-cover ${
                            post.shape === 'heart' ? 'clip-path-heart' : ''
                          }`}
                          widthHint={720} // 카드 영역 폭 기준
                          // 서버가 썸네일/카드/풀을 아직 안 주더라도 OK (src로 자동 fallback)
                          src={post.images?.[0] || ''}
                          // variants가 있다면 여기에 붙이세요(없으면 생략): variants={post.imageVariants}
                          onError={() => {
                            setFailedImages(prev => new Set(prev).add(post.id));
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
                      onClick={() => handleLike(post.id)}
                      disabled={likeMutation.isPending}
                      className={`flex items-center gap-2 transition-colors ${
                        likedPosts.has(post.id)
                          ? 'text-red-500'
                          : 'text-gray-600 hover:text-red-500'
                      } ${likeMutation.isPending ? 'opacity-50' : ''}`}
                    >
                      <Heart
                        size={20}
                        className={
                          likedPosts.has(post.id) ? 'fill-current' : ''
                        }
                      />
                      <span className="text-sm">{post.likesCount || 0}</span>
                    </button>
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                      onClick={() => setSelectedPost(post)}
                    >
                      <MessageCircle size={20} />
                      <span className="text-sm">{post.commentsCount || 0}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                  >
                    피드 상세보기
                  </button>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}
