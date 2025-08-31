import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, MapPin, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Post } from '@shared/schema';

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onLike: (postId: number) => void;
  isLiked: boolean;
}

export default function PostDetailModal({ post, isOpen, onClose, onLike, isLiked }: PostDetailModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  if (!isOpen) return null;

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

  // 모든 미디어 파일 합치기 (이미지 + 동영상)
  const allMedia = [
    ...(post.images || []).map(img => ({ type: 'image' as const, src: img })),
    ...(post.videos || []).map(vid => ({ type: 'video' as const, src: vid }))
  ];

  const nextMedia = () => {
    if (currentMediaIndex < allMedia.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
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
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* Title and Content */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h2>
            <p className="text-gray-700 leading-relaxed">{post.content}</p>
          </div>

          {/* Location */}
          {post.location && (
            <div className="flex items-center gap-1 mb-4 text-gray-500">
              <MapPin size={16} />
              <span className="text-sm">{post.location}</span>
            </div>
          )}

          {/* Media Carousel */}
          {allMedia.length > 0 && (
            <div className="relative mb-4">
              <div className="rounded-lg overflow-hidden bg-gray-100">
                {allMedia[currentMediaIndex].type === 'image' ? (
                  allMedia[currentMediaIndex].src.startsWith('dummy_') ? (
                    <div className="w-full h-80 bg-gradient-to-br from-teal-200 to-pink-200 flex items-center justify-center">
                      <span className="text-white text-3xl">📷</span>
                    </div>
                  ) : (
                    <img 
                      src={`/uploads/${allMedia[currentMediaIndex].src}`}
                      alt={post.title}
                      className="w-full h-80 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-80 bg-gradient-to-br from-teal-200 to-pink-200 flex items-center justify-center"><span class="text-white text-3xl">📷</span></div>';
                        }
                      }}
                    />
                  )
                ) : (
                  <video 
                    src={`/uploads/${allMedia[currentMediaIndex].src}`}
                    controls
                    className="w-full h-80 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLVideoElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-80 bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center"><span class="text-white text-3xl">🎥</span></div>';
                      }
                    }}
                  />
                )}
              </div>

              {/* Media Navigation */}
              {allMedia.length > 1 && (
                <>
                  {/* Left Arrow */}
                  {currentMediaIndex > 0 && (
                    <button
                      onClick={prevMedia}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}

                  {/* Right Arrow */}
                  {currentMediaIndex < allMedia.length - 1 && (
                    <button
                      onClick={nextMedia}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}

                  {/* Media Indicators */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {allMedia.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`w-2 h-2 rounded-full ${
                          index === currentMediaIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Media Counter */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {currentMediaIndex + 1} / {allMedia.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag, index) => (
                <span key={index} className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Post Date and Time */}
          {(post.postDate || post.postTime) && (
            <div className="flex items-center gap-1 mb-4 text-gray-500">
              <Calendar size={16} />
              <span className="text-sm">
                {post.postDate && new Date(post.postDate).toLocaleDateString('ko-KR')}
                {post.postDate && post.postTime && ' '}
                {post.postTime}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onLike(post.id)}
                className={`flex items-center gap-2 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                <span className="text-sm">{post.likesCount || 0}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
                <MessageCircle size={20} />
                <span className="text-sm">{post.commentsCount || 0}</span>
              </button>
            </div>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
          
          {/* Comments Section */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900 mb-3">댓글</h3>
            
            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=Current" />
                <AvatarFallback>나</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="댓글을 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      alert('댓글 기능은 곧 구현될 예정입니다!');
                    }
                  }}
                />
              </div>
            </div>

            {/* Sample Comments */}
            <div className="space-y-3 max-h-32 overflow-y-auto">
              <div className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=User1" />
                  <AvatarFallback>여행</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-gray-900">여행러버</span>
                    <span className="text-gray-700 ml-2">정말 멋진 곳이네요! 저도 가보고 싶어요 ✨</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">2시간 전</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=User2" />
                  <AvatarFallback>모험</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-gray-900">모험가</span>
                    <span className="text-gray-700 ml-2">완전 인스타그램 감성! 📸</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">1일 전</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}