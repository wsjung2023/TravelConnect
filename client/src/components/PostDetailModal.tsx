import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';
import CommentForm from '@/components/post/CommentForm';
import CommentsSection from '@/components/post/CommentsSection';
import type { Post } from '@shared/schema';
import { ImageFallback } from '@/components/ImageFallback';
import { useTranslation } from 'react-i18next';

interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onLike: (postId: number) => void;
  isLiked: boolean;
}

export default function PostDetailModal({
  post,
  isOpen,
  onClose,
  onLike,
  isLiked,
}: PostDetailModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [failedMedia, setFailedMedia] = useState(new Set<string>());

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
    ...(post.images || []).map((img) => ({ type: 'image' as const, src: img })),
    ...(post.videos || []).map((vid) => ({ type: 'video' as const, src: vid })),
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
    <Modal open={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
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
                {post.createdAt ? formatTime(post.createdAt) : '방금 전'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-y-auto">
          {/* Title and Content */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {post.title}
            </h2>
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
          {allMedia.length > 0 && allMedia[currentMediaIndex] && (
            <div className="relative mb-4">
              <div className="rounded-lg overflow-hidden bg-gray-100">
                {allMedia[currentMediaIndex].type === 'image' ? (
                  allMedia[currentMediaIndex].src.startsWith('dummy_') || failedMedia.has(allMedia[currentMediaIndex].src) ? (
                    <ImageFallback className="w-full h-80 bg-gradient-to-br flex items-center justify-center" />
                  ) : (
                    <img
                      src={allMedia[currentMediaIndex].src}
                      alt={post.title ?? ''}
                      className="w-full h-80 object-cover"
                      onError={() => {
                        setFailedMedia(prev => new Set(prev).add(allMedia[currentMediaIndex]?.src || ''));
                      }}
                    />
                  )
                ) : (
                  failedMedia.has(allMedia[currentMediaIndex].src) ? (
                    <ImageFallback 
                      isVideo={true} 
                      className="w-full h-80 bg-gradient-to-br flex items-center justify-center" 
                    />
                  ) : (
                    <video
                      src={allMedia[currentMediaIndex].src}
                      controls
                      className="w-full h-80 object-cover"
                      onError={() => {
                        setFailedMedia(prev => new Set(prev).add(allMedia[currentMediaIndex]?.src || ''));
                      }}
                    />
                  )
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
                          index === currentMediaIndex
                            ? 'bg-white'
                            : 'bg-white bg-opacity-50'
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
                <span
                  key={index}
                  className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm"
                >
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
                {post.postDate &&
                  new Date(post.postDate).toLocaleDateString('ko-KR')}
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
            <CommentForm postId={post.id} />

            {/* Live Comments */}
            <CommentsSection postId={post.id} />
          </div>
        </div>
    </Modal>
  );
}
