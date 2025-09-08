import React from 'react';
import { PostGroup } from '@/utils/postGrouping';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users } from 'lucide-react';
import VideoShape, { ImageShape } from '@/components/VideoShape';
import type { Post } from '@shared/schema';

interface PostGroupCardProps {
  group: PostGroup;
  onClick: (post: Post) => void;
  className?: string;
}

export function PostGroupCard({ group, onClick, className = '' }: PostGroupCardProps) {
  const { posts, primaryPost, location, timeRange } = group;
  const isMultiPost = posts.length > 1;

  // 미디어 파일 여부 확인
  const hasMedia = (post: Post) => {
    return post.mediaUrl && (
      post.mediaUrl.includes('.jpg') || 
      post.mediaUrl.includes('.png') || 
      post.mediaUrl.includes('.mp4') || 
      post.mediaUrl.includes('.webm') ||
      post.mediaUrl.includes('.gif')
    );
  };

  const isVideo = (url: string) => {
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  };

  // 테마별 색상
  const getThemeColor = (theme?: string) => {
    const colors = {
      emotional: 'bg-pink-100 border-pink-300',
      healing: 'bg-green-100 border-green-300', 
      landmark: 'bg-purple-100 border-purple-300',
      food: 'bg-orange-100 border-orange-300',
      party: 'bg-red-100 border-red-300',
      hotplace: 'bg-yellow-100 border-yellow-300',
    };
    return colors[theme as keyof typeof colors] || 'bg-gray-100 border-gray-300';
  };

  // 시간 포맷
  const formatTimeRange = () => {
    const start = timeRange.start;
    const end = timeRange.end;
    
    if (start.getTime() === end.getTime()) {
      return start.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    const timeDiff = (end.getTime() - start.getTime()) / (1000 * 60);
    if (timeDiff < 60) {
      return `${start.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })} (${Math.round(timeDiff)}분간)`;
    }
    
    return `${start.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  return (
    <Card 
      className={`relative cursor-pointer hover:shadow-lg transition-all duration-200 ${
        isMultiPost ? 'ring-2 ring-blue-200' : ''
      } ${className}`}
      onClick={() => onClick(primaryPost)}
      data-testid={`post-group-card-${group.id}`}
    >
      <CardContent className="p-4">
        {/* 멀티포스트 표시 */}
        {isMultiPost && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
              <Users className="w-3 h-3 mr-1" />
              {posts.length}개
            </Badge>
          </div>
        )}

        {/* 테마 표시 */}
        {primaryPost.theme && (
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${
            getThemeColor(primaryPost.theme)
          }`}>
            {primaryPost.theme === 'emotional' && '💕 감성'}
            {primaryPost.theme === 'healing' && '🌿 힐링'}
            {primaryPost.theme === 'landmark' && '🏛️ 명소'}
            {primaryPost.theme === 'food' && '🍽️ 맛집'}
            {primaryPost.theme === 'party' && '🎉 파티'}
            {primaryPost.theme === 'hotplace' && '🔥 핫플'}
          </div>
        )}

        {/* 제목 */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {primaryPost.title || '제목 없음'}
        </h3>

        {/* 내용 미리보기 */}
        {primaryPost.content && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {primaryPost.content}
          </p>
        )}

        {/* 메인 미디어 표시 (단일 포스트) */}
        {!isMultiPost && hasMedia(primaryPost) && (
          <div className="mb-3 flex justify-center">
            {isVideo(primaryPost.mediaUrl!) ? (
              <VideoShape
                src={primaryPost.mediaUrl!}
                shape="default"
                className="medium"
                autoPlay={false}
                data-testid={`video-${primaryPost.id}`}
              />
            ) : (
              <ImageShape
                src={primaryPost.mediaUrl!}
                alt={primaryPost.title || 'Post image'}
                shape="default"
                className="medium"
                data-testid={`image-${primaryPost.id}`}
              />
            )}
          </div>
        )}

        {/* 멀티포스트 미디어 그리드 */}
        {isMultiPost && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {posts.slice(0, 4).map((post, index) => (
              hasMedia(post) && (
                <div key={post.id} className="relative">
                  {isVideo(post.mediaUrl!) ? (
                    <VideoShape
                      src={post.mediaUrl!}
                      shape="heart"
                      className="small"
                      autoPlay={false}
                      data-testid={`grid-video-${post.id}`}
                    />
                  ) : (
                    <ImageShape
                      src={post.mediaUrl!}
                      alt={`Post ${index + 1}`}
                      shape={index === 0 ? 'heart' : index === 1 ? 'cloud' : 'default'}
                      className="small"
                      data-testid={`grid-image-${post.id}`}
                    />
                  )}
                  {index === 3 && posts.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center text-white text-xs">
                      +{posts.length - 4}개 더
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimeRange()}</span>
            </div>
          </div>
          
          {isMultiPost && (
            <span className="text-blue-600 font-medium">
              {posts.length}개 함께보기
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}