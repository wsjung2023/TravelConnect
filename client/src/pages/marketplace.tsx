import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
import { Heart, MapPin, Star, Users, Clock, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';

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

export default function Marketplace() {
  const { t } = useTranslation('ui');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');

  const CATEGORIES = [
    { value: 'all', label: t('marketplace.categoryAll') },
    { value: 'tour', label: t('marketplace.categoryTour') },
    { value: 'food', label: t('marketplace.categoryFood') },
    { value: 'activity', label: t('marketplace.categoryActivity') },
    { value: 'tip', label: t('marketplace.categoryTip') },
  ];

  const PRICE_RANGES = [
    { value: 'all', label: t('marketplace.priceAll') },
    { value: '0-50', label: t('marketplace.priceRange1') },
    { value: '50-100', label: t('marketplace.priceRange2') },
    { value: '100-200', label: t('marketplace.priceRange3') },
    { value: '200+', label: t('marketplace.priceRange4') },
  ];

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
    if (minutes < 60) return `${minutes}${t('marketplace.minutes')}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}${t('marketplace.hours')} ${remainingMinutes}${t('marketplace.minutes')}` : `${hours}${t('marketplace.hours')}`;
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
            <p className="text-muted-foreground">{t('marketplace.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header - Apple/SaaS clean style */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/')}
            className="mb-4 -ml-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2">{t('marketplace.title')}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t('marketplace.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              data-testid="input-search"
              placeholder={t('marketplace.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-category" className="w-32">
                <SelectValue placeholder={t('marketplace.category')} />
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
                <SelectValue placeholder={t('marketplace.priceRange')} />
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
                <SelectValue placeholder={t('marketplace.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{t('marketplace.sortByRating')}</SelectItem>
                <SelectItem value="price">{t('marketplace.sortByPrice')}</SelectItem>
                <SelectItem value="reviewCount">{t('marketplace.sortByReviews')}</SelectItem>
                <SelectItem value="createdAt">{t('marketplace.sortByNewest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {t('marketplace.totalExperiences', { count: experiences.length })}
          </p>
        </div>

        {/* Experience Grid */}
        {experiences.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">{t('marketplace.noResults')}</h3>
            <p className="text-muted-foreground mb-4">{t('marketplace.tryDifferentFilters')}</p>
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
              {t('marketplace.resetFilters')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {experiences.map((experience: Experience) => (
              <Card 
                key={experience.id} 
                className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 shadow-sm hover:shadow-md transition-shadow group"
                data-testid={`card-experience-${experience.id}`}
              >
                <div className="relative">
                  {experience.images && experience.images.length > 0 ? (
                    <img
                      src={experience.images[0]}
                      alt={experience.title}
                      className="w-full h-44 object-cover"
                      data-testid={`img-experience-${experience.id}`}
                    />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center">
                      <MapPin className="w-10 h-10 text-neutral-400" />
                    </div>
                  )}
                  
                  <Button
                    data-testid={`button-like-${experience.id}`}
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 w-8 h-8 p-0 rounded-full bg-white/90 hover:bg-white border border-neutral-200"
                  >
                    <Heart className="w-4 h-4 text-neutral-500" />
                  </Button>

                  <Badge 
                    className={`absolute bottom-3 left-3 text-xs font-medium ${getCategoryColor(experience.category)}`}
                    data-testid={`badge-category-${experience.id}`}
                  >
                    {getCategoryLabel(experience.category)}
                  </Badge>
                </div>

                <CardHeader className="pb-2 pt-4">
                  <h3 className="font-semibold line-clamp-1 text-sm text-neutral-900 dark:text-white" data-testid={`text-title-${experience.id}`}>
                    {experience.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span data-testid={`text-location-${experience.id}`} className="line-clamp-1">{experience.location}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-4">
                  {/* Compact info row */}
                  <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`text-duration-${experience.id}`}>
                        {formatDuration(experience.duration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span data-testid={`text-rating-${experience.id}`}>{experience.rating}</span>
                      <span className="text-neutral-400" data-testid={`text-review-count-${experience.id}`}>({experience.reviewCount})</span>
                    </div>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-700">
                    <div>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-white" data-testid={`text-price-${experience.id}`}>
                        {formatPrice(experience.price, experience.currency)}
                      </p>
                      <p className="text-xs text-neutral-500">{t('marketplace.perPerson')}</p>
                    </div>
                    <Link href={`/experience/${experience.id}`}>
                      <Button 
                        data-testid={`button-view-${experience.id}`}
                        variant="outline"
                        size="sm"
                        className="rounded-full border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                      >
                        {t('marketplace.viewDetails')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}