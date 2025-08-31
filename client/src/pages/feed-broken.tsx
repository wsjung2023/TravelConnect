import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, MapPin, MoreHorizontal, Calendar } from "lucide-react";
import { Link } from "wouter";
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
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <i className="fas fa-home text-gray-600"></i>
            </button>
          </Link>
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
          posts.map((post: any) => (
            <div key={post.id} className="travel-card mb-4">
              {/* Post Header */}
              <div className="flex items-center justify-between p-4 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {post.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">사용자{post.userId.slice(-4)}</div>
                    <div className="text-xs text-gray-500">{formatTime(post.createdAt)}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal size={20} />
                </Button>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                {post.content && (
                  <p className="text-gray-700 mb-3">{post.content}</p>
                )}
                {post.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                    <MapPin size={16} />
                    <span>{post.location}</span>
                  </div>
                )}
              </div>

              {/* Post Images/Videos */}
              {(post.images?.length > 0 || post.videos?.length > 0) && (
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {post.images?.length > 0 ? (
                    <img 
                      src={`/uploads/${post.images[0]}`}
                      alt={post.title || ""}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&h=500&fit=crop";
                      }}
                    />
                  ) : post.videos?.length > 0 ? (
                    <video 
                      src={`/uploads/${post.videos[0]}`}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-200 to-pink-200 flex items-center justify-center">
                      <span className="text-white text-2xl">
                        📷
                      </span>
                    </div>
                  )}
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
                  <Link href={`/timeline`}>
                    <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">
                      피드 상세보기
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}