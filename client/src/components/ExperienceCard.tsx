import { Star, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { Experience } from '@shared/schema';
import SmartImage from '@/components/SmartImage'; // ★ 추가

interface ExperienceCardProps {
  experience: Experience;
  onBook: () => void;
  compact?: boolean;
}

export default function ExperienceCard({
  experience,
  onBook,
  compact = false,
}: ExperienceCardProps) {
  const { t } = useTranslation(['ui']);

  // 서버 필드명이 달라도 최대한 커버: imageUrl / coverImage / images[0].url
  const imageSrc =
    (experience as any).imageUrl ||
    (experience as any).coverImage ||
    (experience as any).images?.[0]?.url ||
    null;

  // 나중에 썸네일/카드/풀 변형본이 오면 자동 사용
  const imageVariants =
    (experience as any).imageVariants ||
    (experience as any).images?.[0]?.variants ||
    undefined;

  const getCategoryColor = (category: string) => {
    const colors = {
      tour: 'bg-primary/10 text-primary',
      food: 'bg-secondary/10 text-secondary',
      activity: 'bg-accent/10 text-accent',
      tip: 'bg-mint/10 text-mint-foreground',
    };
    return colors[category as keyof typeof colors] || colors.tour;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      tour: '🗺️',
      food: '🍜',
      activity: '🎯',
      tip: '💡',
    };
    return icons[category as keyof typeof icons] || '🗺️';
  };

  if (compact) {
    return (
      <div className="travel-card p-3">
        <div className="flex gap-3">
          {/* 썸네일(작게) — 이미지 있으면 이미지, 없으면 이모지 */}
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
            {imageSrc ? (
              <SmartImage
                alt={experience.title}
                className="w-full h-full object-cover"
                widthHint={160} // 컴팩트 썸네일은 작게
                src={imageSrc}
                variants={imageVariants}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {getCategoryIcon(experience.category)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-gray-900 truncate">
                  {experience.title}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500 truncate">
                    {experience.location}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {experience.rating && (
                    <div className="flex items-center gap-1">
                      <Star
                        size={12}
                        className="text-yellow-400 fill-current"
                      />
                      <span className="text-xs text-gray-600">
                        {experience.rating}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-semibold text-primary">
                    ₩{Number(experience.price).toLocaleString()}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={onBook}
                className="text-xs px-2 py-1 h-auto"
                data-testid="book-experience-button"
              >
                {t('ui:buttons.book')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="travel-card overflow-hidden">
      {/* 메인 이미지 — 있으면 이미지, 없으면 이모지 박스 */}
      <div className="h-48 bg-gray-200 overflow-hidden flex items-center justify-center">
        {imageSrc ? (
          <SmartImage
            alt={experience.title}
            className="w-full h-full object-cover"
            widthHint={720} // 카드 영역 폭 기준
            src={imageSrc}
            variants={imageVariants} // 변형본이 있으면 자동 사용
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {getCategoryIcon(experience.category)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge className={getCategoryColor(experience.category)}>
            {experience.category}
          </Badge>
          {experience.rating && (
            <div className="flex items-center gap-1">
              <Star size={14} className="text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">{experience.rating}</span>
              <span className="text-xs text-gray-400">
                ({experience.reviewCount})
              </span>
            </div>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">{experience.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {experience.description}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{experience.location}</span>
          </div>
          {experience.duration && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>
                {t('ui:experiences.hours', {
                  count: Math.floor(experience.duration / 60),
                })}
              </span>
            </div>
          )}
          {experience.maxParticipants && (
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>
                {t('ui:experiences.maxParticipants', {
                  count: experience.maxParticipants,
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-900">
              ₩{Number(experience.price).toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              {t('ui:experiences.perPerson')}
            </span>
          </div>
          <Button
            onClick={onBook}
            className="travel-button"
            data-testid="book-experience-button"
          >
            {t('ui:buttons.bookExperience')}
          </Button>
        </div>
      </div>
    </div>
  );
}
