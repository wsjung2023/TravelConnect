import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, MapPin, Star, Heart, User } from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import { useAuth } from '@/hooks/useAuth';

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
  included: string[];
  requirements: string[];
  cancelPolicy: string;
}

export default function ExperienceDetailPage() {
  const { t } = useTranslation('ui');
  const [, params] = useRoute('/experience/:id');
  const { user } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const experienceId = params?.id;

  const { data: experience, isLoading, error } = useQuery<Experience>({
    queryKey: ['/api/experiences', experienceId],
    queryFn: async () => {
      const response = await fetch(`/api/experiences/${experienceId}`);
      if (!response.ok) throw new Error('Failed to fetch experience');
      return response.json();
    },
    enabled: !!experienceId,
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
    if (minutes < 60) return t('experiencePage.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? t('experiencePage.hoursMinutes', { hours, minutes: remainingMinutes })
      : t('experiencePage.hours', { count: hours });
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      tour: t('experiencePage.tour'),
      food: t('experiencePage.food'),
      activity: t('experiencePage.activityCat'),
      tip: t('experiencePage.tip'),
    };
    return categoryMap[category] || category;
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('experiencePage.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('experiencePage.notFound')}</h2>
            <p className="text-muted-foreground mb-6">{t('experiencePage.notFoundDesc')}</p>
            <Button onClick={() => window.history.back()} data-testid="button-back">
              {t('experiencePage.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-4"
            data-testid="button-back"
          >
            ← {t('experiencePage.back')}
          </Button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getCategoryColor(experience.category)}>
                  {getCategoryLabel(experience.category)}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{experience.rating}</span>
                  <span className="text-sm text-muted-foreground">({experience.reviewCount})</span>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-title">
                {experience.title}
              </h1>
              
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{experience.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{formatDuration(experience.duration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{t('experiencePage.max')} {experience.maxParticipants}{t('experiencePage.people')}</span>
                </div>
              </div>
            </div>
            
            <Button variant="outline" size="icon">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{t('experiencePage.description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed" data-testid="text-description">
                  {experience.description}
                </p>
              </CardContent>
            </Card>

            {/* Host Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('experiencePage.guideInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  to={`/guide/${experience.hostId}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  data-testid="link-guide-profile"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-medium">
                    {experience.host?.firstName?.[0] || <User className="w-6 h-6" />}
                    {experience.host?.lastName?.[0] || ''}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {experience.host?.firstName && experience.host?.lastName 
                        ? `${experience.host.firstName} ${experience.host.lastName}`
                        : t('experiencePage.guide')
                      }
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('experiencePage.viewGuideProfile')}
                    </p>
                  </div>
                  <div className="text-blue-600 dark:text-blue-400">
                    <Star className="w-5 h-5" />
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* What's Included */}
            {experience.included && experience.included.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('experiencePage.includes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {experience.included.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-foreground">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {experience.requirements && experience.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('experiencePage.requirements')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {experience.requirements.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-foreground">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground" data-testid="text-price">
                    {formatPrice(experience.price, experience.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('experiencePage.perPerson')}</div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full travel-button text-lg"
                  onClick={() => setIsBookingModalOpen(true)}
                  disabled={!user}
                  data-testid="button-book"
                >
                  {user ? t('experiencePage.bookNow') : t('experiencePage.loginToBook')}
                </Button>
                
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t('experiencePage.cancelPolicy')}</span>
                    <span className="capitalize">{experience.cancelPolicy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('experiencePage.maxParticipants')}</span>
                    <span>{experience.maxParticipants}{t('experiencePage.people')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <BookingModal
          experience={experience}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />
      )}
    </div>
  );
}