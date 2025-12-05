import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Star, Users, Clock, Heart, MessageCircle, Calendar } from 'lucide-react';

interface GuideData {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  bio?: string;
  location?: string;
  isHost: boolean;
  totalExperiences: number;
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  joinedAt: string;
}

interface Experience {
  id: number;
  title: string;
  description: string;
  price: string;
  currency: string;
  location: string;
  category: string;
  duration: number;
  maxParticipants: number;
  images: string[];
  rating: string;
  reviewCount: number;
}

interface Post {
  id: number;
  title: string;
  content: string;
  images: string[];
  location: string;
  theme: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  experienceTitle: string;
  createdAt: string;
}

export default function GuideProfile() {
  const { t } = useTranslation('ui');
  const [, params] = useRoute('/guide/:id');
  const guideId = params?.id;
  const [activeTab, setActiveTab] = useState('experiences');

  // 가이드 기본 정보
  const { data: guide, isLoading: guideLoading } = useQuery<GuideData>({
    queryKey: ['/api/guide', guideId],
    enabled: !!guideId,
  });

  // 가이드의 경험 목록
  const { data: experiences = [], isLoading: experiencesLoading } = useQuery<Experience[]>({
    queryKey: ['/api/guide', guideId, 'experiences'],
    enabled: !!guideId && activeTab === 'experiences',
  });

  // 가이드의 SNS 포스트
  const { data: posts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/guide', guideId, 'posts'],
    enabled: !!guideId && activeTab === 'posts',
  });

  // 가이드 후기
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ['/api/guide', guideId, 'reviews'],
    enabled: !!guideId && activeTab === 'reviews',
  });

  const formatPrice = (price: string, currency: string = 'USD') => {
    const numPrice = parseFloat(price);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(numPrice);
    } catch {
      return `$${numPrice.toFixed(2)}`;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}${t('guide.minutes')}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}${t('guide.hours')} ${remainingMinutes}${t('guide.minutes')}` : `${hours}${t('guide.hours')}`;
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      tour: t('guide.categoryTour'),
      food: t('guide.categoryFood'),
      activity: t('guide.categoryActivity'),
      tip: t('guide.categoryTip'),
    };
    return categoryMap[category] || category;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tour': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'food': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'activity': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'tip': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case 'restaurant': return 'bg-green-100 text-green-800';
      case 'landmark': return 'bg-blue-100 text-blue-800';
      case 'healing': return 'bg-purple-100 text-purple-800';
      case 'activity': return 'bg-orange-100 text-orange-800';
      case 'hotplace': return 'bg-red-100 text-red-800';
      case 'emotional': return 'bg-pink-100 text-pink-800';
      case 'party': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (guideLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('guide.notFound')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('guide.notFoundDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 가이드 헤더 */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center md:items-start">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={guide.profileImageUrl} alt={`${guide.firstName} ${guide.lastName}`} />
                  <AvatarFallback className="text-2xl">
                    {guide.firstName?.[0]}{guide.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <Button data-testid="button-contact-guide" className="w-full md:w-auto">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t('guide.sendMessage')}
                </Button>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {guide.firstName} {guide.lastName}
                  </h1>
                  {guide.isHost && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {t('guide.verifiedGuide')}
                    </Badge>
                  )}
                </div>
                
                {guide.location && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{guide.location}</span>
                  </div>
                )}
                
                {guide.bio && (
                  <p className="text-gray-700 dark:text-gray-300 mb-6">{guide.bio}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {guide.totalExperiences}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('guide.experiences')}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {guide.averageRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('guide.reviewsCount', { count: guide.totalReviews })}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {guide.responseRate}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('guide.responseRate')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Date(guide.joinedAt).getFullYear()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('guide.joinedYear')}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 네비게이션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="experiences" data-testid="tab-guide-experiences">
              {t('guide.experiencesTab', { count: guide.totalExperiences })}
            </TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-guide-posts">
              {t('guide.storiesTab')}
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-guide-reviews">
              {t('guide.reviewsTab', { count: guide.totalReviews })}
            </TabsTrigger>
          </TabsList>

          {/* 경험 탭 */}
          <TabsContent value="experiences" className="mt-6">
            {experiencesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experiences.map((experience) => (
                  <Card key={experience.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48">
                      {experience.images?.[0] ? (
                        <img
                          src={experience.images[0]}
                          alt={experience.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <MapPin className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className={getCategoryColor(experience.category)}>
                          {getCategoryLabel(experience.category)}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{experience.rating}</span>
                          <span className="text-sm text-gray-600">({experience.reviewCount})</span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{experience.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {experience.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(experience.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {t('guide.maxParticipants', { count: experience.maxParticipants })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatPrice(experience.price, experience.currency)}
                        </div>
                        <Link to={`/experience/${experience.id}`}>
                          <Button size="sm" data-testid={`button-view-experience-${experience.id}`}>
                            {t('guide.viewDetails')}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 여행 스토리 탭 */}
          <TabsContent value="posts" className="mt-6">
            {postsLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {post.theme && (
                            <Badge variant="secondary" className={getThemeColor(post.theme)}>
                              {post.theme}
                            </Badge>
                          )}
                          {post.location && (
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{post.location}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{post.title}</h3>
                      {post.content && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4">{post.content}</p>
                      )}
                      {post.images?.[0] && (
                        <div className="mb-4">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full max-h-80 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{post.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 후기 탭 */}
          <TabsContent value="reviews" className="mt-6">
            {reviewsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-medium">{review.reviewerName}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        경험: {review.experienceTitle}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}