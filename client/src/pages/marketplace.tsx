import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heart, MapPin, Star, Users, Clock } from 'lucide-react';
import { Link } from 'wouter';

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
  hostId: string;
  host?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

const CATEGORIES = [
  { value: 'all', label: '전체' },
  { value: 'tour', label: '투어' },
  { value: 'food', label: '음식' },
  { value: 'activity', label: '액티비티' },
  { value: 'tip', label: '팁' },
];

const PRICE_RANGES = [
  { value: 'all', label: '전체 가격' },
  { value: '0-50000', label: '5만원 이하' },
  { value: '50000-100000', label: '5-10만원' },
  { value: '100000-200000', label: '10-20만원' },
  { value: '200000+', label: '20만원 이상' },
];

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  const { data: experiences = [], isLoading } = useQuery<Experience[]>({
    queryKey: ['/api/experiences', searchQuery, categoryFilter, priceFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priceFilter && priceFilter !== 'all') params.append('priceRange', priceFilter);
      if (sortBy) params.append('sortBy', sortBy);
      
      const url = `/api/experiences${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch experiences');
      return response.json();
    },
  });

  const formatPrice = (price: string, currency: string) => {
    const numPrice = parseInt(price);
    return `${numPrice.toLocaleString()}${currency === 'KRW' ? '원' : ' ' + currency}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(cat => cat.value === category)?.label || category;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tour': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'food': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'activity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'tip': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">여행 경험을 찾고 있어요...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">🌟 여행 마켓플레이스</h1>
          <p className="text-muted-foreground">현지인과 함께하는 특별한 여행 경험을 발견하세요</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              data-testid="input-search"
              placeholder="어떤 경험을 찾으시나요? (예: 한식 요리, 한강 투어)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category" className="w-32">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger data-testid="select-price" className="w-32">
                <SelectValue placeholder="가격대" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="select-sort" className="w-32">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">평점순</SelectItem>
                <SelectItem value="price">가격순</SelectItem>
                <SelectItem value="reviewCount">리뷰순</SelectItem>
                <SelectItem value="createdAt">최신순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{experiences.length}</span>개의 경험
          </p>
        </div>

        {/* Experience Grid */}
        {experiences.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">검색 결과가 없어요</h3>
            <p className="text-muted-foreground mb-4">다른 검색어나 필터를 시도해보세요</p>
            <Button 
              data-testid="button-reset-filters"
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setPriceFilter('all');
                setSortBy('rating');
              }}
            >
              필터 초기화
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {experiences.map((experience: Experience) => (
              <Card 
                key={experience.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow group"
                data-testid={`card-experience-${experience.id}`}
              >
                <div className="relative">
                  {experience.images && experience.images.length > 0 ? (
                    <img
                      src={experience.images[0]}
                      alt={experience.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      data-testid={`img-experience-${experience.id}`}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                      <MapPin className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  <Button
                    data-testid={`button-like-${experience.id}`}
                    variant="secondary"
                    size="sm"
                    className="absolute top-3 right-3 w-8 h-8 p-0 rounded-full bg-white/80 hover:bg-white"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>

                  <Badge 
                    className={`absolute bottom-3 left-3 ${getCategoryColor(experience.category)}`}
                    data-testid={`badge-category-${experience.id}`}
                  >
                    {getCategoryLabel(experience.category)}
                  </Badge>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold line-clamp-2 text-sm" data-testid={`text-title-${experience.id}`}>
                      {experience.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span data-testid={`text-location-${experience.id}`}>{experience.location}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-description-${experience.id}`}>
                    {experience.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`text-duration-${experience.id}`}>
                        {formatDuration(experience.duration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span data-testid={`text-participants-${experience.id}`}>
                        최대 {experience.maxParticipants}명
                      </span>
                    </div>
                  </div>

                  {/* 호스트 정보 */}
                  {experience.host && (
                    <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <Link 
                        to={`/guide/${experience.hostId}`}
                        className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                        data-testid={`link-guide-${experience.hostId}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                          {experience.host.firstName?.[0]}{experience.host.lastName?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {experience.host.firstName} {experience.host.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">가이드 프로필 보기</p>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">→</div>
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium" data-testid={`text-rating-${experience.id}`}>
                        {experience.rating}
                      </span>
                      <span className="text-xs text-muted-foreground" data-testid={`text-review-count-${experience.id}`}>
                        ({experience.reviewCount})
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary" data-testid={`text-price-${experience.id}`}>
                        {formatPrice(experience.price, experience.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">1인당</p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Link href={`/experience/${experience.id}`} className="w-full">
                    <Button 
                      data-testid={`button-view-${experience.id}`}
                      className="w-full" 
                      size="sm"
                    >
                      자세히 보기
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}