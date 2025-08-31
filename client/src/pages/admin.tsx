import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, MapPin, Heart, Calendar, Search, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DatabasePost {
  id: number;
  title: string | null;
  content: string | null;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  day: number | null;
  shape: string | null;
  theme: string | null;
  postDate: string | null;
  postTime: string | null;
  tags: string[] | null;
  images: string[] | null;
  videos: string[] | null;
  likesCount: number | null;
  createdAt: string;
}

export default function AdminPage() {
  const { user, isLoading: userLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTheme, setFilterTheme] = useState('all');

  // 관리자 권한 체크
  const isAdmin = user?.role === 'admin';

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['/api/posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts?limit=100');
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json() as DatabasePost[];
    },
    enabled: isAdmin && !userLoading, // 관리자일 때만 데이터 요청
  });

  const deletePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const getThemeColor = (theme: string | null) => {
    switch (theme) {
      case '맛집': return 'bg-orange-100 text-orange-800';
      case '명소': return 'bg-blue-100 text-blue-800';
      case '파티타임': return 'bg-purple-100 text-purple-800';
      case '핫플레이스': return 'bg-red-100 text-red-800';
      case '힐링': return 'bg-green-100 text-green-800';
      case '감성': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 필터링된 피드
  const filteredPosts = posts?.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTheme = filterTheme === 'all' || post.theme === filterTheme;
    
    return matchesSearch && matchesTheme;
  }) || [];

  // 로딩 중이거나 권한 확인 중
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">사용자 정보 확인 중...</div>
        </div>
      </div>
    );
  }

  // 관리자 권한이 없는 경우
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-6">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <Button onClick={() => window.location.href = '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">데이터베이스 피드 관리</h1>
          <div className="text-center">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/'}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">데이터베이스 피드 관리</h1>
          </div>
          <div className="text-sm text-gray-600">
            {filteredPosts.length} / {posts?.length || 0}개
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="제목, 내용, 위치로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTheme} onValueChange={setFilterTheme}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="테마 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 테마</SelectItem>
                <SelectItem value="맛집">맛집</SelectItem>
                <SelectItem value="명소">명소</SelectItem>
                <SelectItem value="파티타임">파티타임</SelectItem>
                <SelectItem value="핫플레이스">핫플레이스</SelectItem>
                <SelectItem value="힐링">힐링</SelectItem>
                <SelectItem value="감성">감성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {post.title || '제목 없음'}
                        </h3>
                        <div className="flex gap-2">
                          {post.theme && (
                            <Badge className={getThemeColor(post.theme)}>
                              {post.theme}
                            </Badge>
                          )}
                          {post.shape && post.shape !== 'none' && (
                            <Badge variant="outline">{post.shape}</Badge>
                          )}
                        </div>
                      </div>
                      
                      {post.content && (
                        <p className="text-gray-600 mb-3 leading-relaxed">
                          {post.content}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePost(post.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-4"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  {/* 위치 및 통계 정보 */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                    {post.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{post.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Heart size={14} />
                      <span>{post.likesCount || 0}개 좋아요</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>
                        {post.postDate || new Date(post.createdAt).toLocaleDateString()}
                        {post.postTime && ` • ${post.postTime}`}
                      </span>
                    </div>
                  </div>

                  {/* 좌표 정보 */}
                  {(post.latitude && post.longitude) && (
                    <div className="text-sm text-gray-500 font-mono mb-3 bg-gray-50 px-3 py-2 rounded">
                      좌표: {parseFloat(post.latitude).toFixed(6)}, {parseFloat(post.longitude).toFixed(6)}
                    </div>
                  )}

                  {/* 태그 */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {post.tags.map((tag, index) => (
                        <span key={index} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 메타 정보 */}
                  <div className="text-xs text-gray-400 border-t pt-3 flex justify-between">
                    <span>ID: {post.id}</span>
                    <span>생성일: {new Date(post.createdAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <div className="text-xl font-semibold mb-2">
              {searchTerm || filterTheme !== 'all' ? '검색 결과가 없습니다' : '저장된 피드가 없습니다'}
            </div>
            <div className="text-gray-500 mb-6">
              {searchTerm || filterTheme !== 'all' 
                ? '다른 검색어나 필터를 시도해보세요' 
                : '첫 번째 피드를 작성해보세요'
              }
            </div>
            {(!searchTerm && filterTheme === 'all') && (
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="outline"
              >
                피드 작성하러 가기
              </Button>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">지도 확인 방법</h3>
          <p className="text-sm text-blue-800">
            위 피드들이 지도에 마커로 표시됩니다. 홈페이지로 돌아가서 지도를 확인해보세요. 
            각 피드의 위치 좌표가 있는 경우 해당 위치에 마커가 생성됩니다.
          </p>
          <Button 
            onClick={() => window.location.href = '/'} 
            className="mt-3"
            size="sm"
          >
            지도에서 확인하기
          </Button>
        </div>
      </div>
    </div>
  );
}