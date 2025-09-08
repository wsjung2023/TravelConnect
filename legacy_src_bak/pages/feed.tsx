import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, MapPin, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Post } from "@shared/schema";

export default function Feed() {
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts"],
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest(`/api/posts/${postId}/like`, {
        method: "POST",
      });
    },
    onSuccess: (_, postId) => {
      setLikedPosts(prev => new Set([...prev, postId]));
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
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
    if (!likedPosts.has(postId)) {
      likeMutation.mutate(postId);
    }
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
      {/* Stories */}
      <div className="p-4 border-b bg-white">
        <h3 className="font-medium mb-3">여행 스토리</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="story-ring">
              <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl">+</span>
              </div>
            </div>
            <span className="text-xs text-gray-600">내 스토리</span>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="story-ring">
                <Avatar className="w-full h-full">
                  <AvatarFallback>{`U${i + 1}`}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-gray-600">사용자{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="pb-4">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시글이 없어요</h3>
            <p className="text-gray-500 text-sm">첫 번째 여행 스토리를 공유해보세요!</p>
          </div>
        ) : (
          posts.map((post: Post) => (
            <div key={post.id} className="bg-white border-b border-gray-100">
              {/* Post Header */}
              <div className="flex items-center justify-between p-4 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{post.userId.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-sm">{post.userId}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {post.location && (
                        <>
                          <MapPin size={12} />
                          <span>{post.location}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{formatTime(post.createdAt!)}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="p-1">
                  <MoreHorizontal size={18} />
                </Button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-gray-900 leading-relaxed">{post.content}</p>
              </div>

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-1">
                    {post.images.slice(0, 4).map((image, index) => (
                      <div
                        key={index}
                        className={`relative aspect-square bg-gray-200 ${
                          post.images!.length === 1 ? 'col-span-2' : ''
                        }`}
                      >
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          📷
                        </div>
                        {index === 3 && post.images!.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-medium">+{post.images!.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${
                        likedPosts.has(post.id) ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                      }`}
                    >
                      <Heart size={20} className={likedPosts.has(post.id) ? 'fill-current' : ''} />
                      <span className="text-sm">{post.likesCount || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors">
                      <MessageCircle size={20} />
                      <span className="text-sm">{post.commentsCount || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}