import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, MapPin, MoreHorizontal, Calendar, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PostDetailModal from "@/components/PostDetailModal";
import type { Post } from "@shared/schema";

export default function Feed() {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts"],
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      console.log('좋아요 API 호출:', postId);
      return apiRequest(`/api/posts/${postId}/like`, "POST");
    },
    onSuccess: (data, postId) => {
      console.log('좋아요 성공:', data);
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (data.isLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      console.error('좋아요 실패:', error);
    }
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
    console.log('좋아요 버튼 클릭:', postId);
    likeMutation.mutate(postId);
  };

  if (isLoading) {
    return (
      <div className="mobile-content p-4">
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
    <div className="mobile-content custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              window.postMessage({ type: 'navigate-home' }, '*');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">여행 피드</h1>
        </div>
        <Link href="/timeline">
          <button className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors">
            <Calendar size={20} className="text-purple-600" />
          </button>
        </Link>
      </div>

      {/* Posts */}
      <div className="space-y-4 p-4">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            아직 피드가 없습니다.
          </div>
        ) : (
          posts.map((post: Post) => (
            <div key={post.id} className="travel-card p-4">
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${post.userId}`} />
                    <AvatarFallback>{post.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{post.userId}</p>
                    <p className="text-xs text-gray-500">{formatTime(post.createdAt)}</p>
                  </div>
                </div>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => {
                    // 피드 메뉴 열기
                    alert('게시물 옵션 메뉴입니다.');
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              {/* Post Content */}
              <div className="mb-3">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{post.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{post.content}</p>
                
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
                      <span key={index} className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Image with Shape */}
              {post.images && post.images.length > 0 && (
                <div className={`mb-3 overflow-hidden ${
                  post.shape === 'heart' ? 'rounded-full' :
                  post.shape === 'cloud' ? 'rounded-3xl' :
                  post.shape === 'wave' ? 'rounded-2xl transform rotate-2' :
                  post.shape === 'polaroid' ? 'rounded border-8 border-white shadow-lg' :
                  'rounded-lg'
                }`}>
                  {post.images[0].startsWith('dummy_') ? (
                    <div className={`w-full h-64 flex items-center justify-center ${
                      post.shape === 'heart' ? 'bg-gradient-to-br from-pink-300 to-red-300' :
                      post.shape === 'cloud' ? 'bg-gradient-to-br from-blue-200 to-white' :
                      post.shape === 'wave' ? 'bg-gradient-to-br from-teal-200 to-blue-200' :
                      post.shape === 'polaroid' ? 'bg-white' :
                      'bg-gradient-to-br from-teal-200 to-pink-200'
                    }`}>
                      <span className="text-white text-2xl">
                        {post.shape === 'heart' ? '💖' :
                         post.shape === 'cloud' ? '☁️' :
                         post.shape === 'wave' ? '🌊' :
                         post.shape === 'polaroid' ? '📸' : '📷'}
                      </span>
                    </div>
                  ) : (
                    <img 
                      src={`/uploads/${post.images[0]}`} 
                      alt={post.title}
                      className={`w-full h-64 object-cover ${
                        post.shape === 'heart' ? 'clip-path-heart' : ''
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const shapeIcon = post.shape === 'heart' ? '💖' :
                                          post.shape === 'cloud' ? '☁️' :
                                          post.shape === 'wave' ? '🌊' :
                                          post.shape === 'polaroid' ? '📸' : '📷';
                          parent.innerHTML = `<div class="w-full h-64 bg-gradient-to-br from-teal-200 to-pink-200 flex items-center justify-center"><span class="text-white text-2xl">${shapeIcon}</span></div>`;
                        }
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
                        likedPosts.has(post.id) ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                      } ${likeMutation.isPending ? 'opacity-50' : ''}`}
                    >
                      <Heart size={20} className={likedPosts.has(post.id) ? 'fill-current' : ''} />
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
          ))
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          isLiked={likedPosts.has(selectedPost.id)}
        />
      )}
    </div>
  );
}