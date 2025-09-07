import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Edit3, Calendar, MapPin, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import type { Post, Trip, Experience } from '@shared/schema';

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');

  const { data: posts = [] } = useQuery({
    queryKey: ['/api/posts', 'user'],
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['/api/trips'],
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ['/api/experiences', 'user'],
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings'],
  });

  const stats = {
    posts: posts.length,
    trips: trips.length,
    followers: 245,
    following: 180,
    experiences: experiences.length,
  };

  return (
    <div className="mobile-content bg-white custom-scrollbar">
      {/* Profile Header */}
      <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
        <div className="absolute top-4 right-4">
          <Button variant="ghost" size="sm" className="p-2">
            <Settings size={20} />
          </Button>
        </div>

        <div className="flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 mb-4 border-4 border-white shadow-lg">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback className="text-xl">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : user?.email?.split('@')[0] || '사용자'}
          </h2>

          {user?.bio && (
            <p className="text-gray-600 text-sm mb-3 max-w-xs">{user.bio}</p>
          )}

          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin size={14} />
            <span>{user?.location || '위치 미설정'}</span>
          </div>

          {user?.isHost && (
            <Badge className="bg-gradient-to-r from-primary to-secondary text-white mb-4">
              ✨ 인증된 호스트
            </Badge>
          )}

          <Button className="travel-button-outline">
            <Edit3 size={16} className="mr-2" />
            프로필 편집
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.posts}</div>
            <div className="text-xs text-gray-500">게시글</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.trips}</div>
            <div className="text-xs text-gray-500">여행</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.followers}
            </div>
            <div className="text-xs text-gray-500">팔로워</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.following}
            </div>
            <div className="text-xs text-gray-500">팔로잉</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {stats.experiences}
            </div>
            <div className="text-xs text-gray-500">체험</div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-50 p-1 mx-4 mt-4 rounded-lg">
          <TabsTrigger value="posts" className="text-xs">
            게시글
          </TabsTrigger>
          <TabsTrigger value="trips" className="text-xs">
            여행
          </TabsTrigger>
          <TabsTrigger value="experiences" className="text-xs">
            체험
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs">
            예약
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 px-4">
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📸</div>
              <p className="text-gray-500 text-sm">아직 게시한 사진이 없어요</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post: Post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center"
                >
                  <span className="text-2xl">📷</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trips" className="mt-4 px-4">
          {trips.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✈️</div>
              <p className="text-gray-500 text-sm">계획된 여행이 없어요</p>
              <Button className="travel-button mt-3">
                <Calendar size={16} className="mr-2" />
                여행 계획하기
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip: Trip) => (
                <div key={trip.id} className="travel-card p-4">
                  <h3 className="font-medium mb-1">{trip.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <MapPin size={12} />
                    <span>{trip.destination}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(trip.startDate).toLocaleDateString('ko-KR')} -
                    {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experiences" className="mt-4 px-4">
          {experiences.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-gray-500 text-sm">등록한 체험이 없어요</p>
              <Button className="travel-button mt-3">체험 등록하기</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((experience: Experience) => (
                <div key={experience.id} className="travel-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{experience.title}</h3>
                    <div className="flex items-center gap-1">
                      <Star
                        size={12}
                        className="text-yellow-400 fill-current"
                      />
                      <span className="text-xs">
                        {experience.rating || '0'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {experience.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      ₩{Number(experience.price).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {experience.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-4 px-4">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500 text-sm">예약한 체험이 없어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="travel-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">체험 제목</h3>
                    <Badge
                      className={
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {booking.status === 'confirmed'
                        ? '확정'
                        : booking.status === 'pending'
                          ? '대기'
                          : '취소'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {new Date(booking.date).toLocaleDateString('ko-KR')} ·{' '}
                    {booking.participants}명
                  </div>
                  <div className="text-sm font-medium text-primary">
                    ₩{Number(booking.totalPrice).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
