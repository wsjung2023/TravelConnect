import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Clock, MapPin, TrendingUp, Hash } from 'lucide-react';

export type FeedMode = 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag';

interface FeedModeSelectorProps {
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export default function FeedModeSelector({ mode, onModeChange }: FeedModeSelectorProps) {
  const { t, i18n } = useTranslation('ui');

  const modes: { id: FeedMode; label: string; icon: typeof Sparkles; color: string }[] = [
    { id: 'smart', label: t('feedMode.smart') || 'For You', icon: Sparkles, color: 'purple' },
    { id: 'latest', label: t('feedMode.latest') || 'Latest', icon: Clock, color: 'blue' },
    { id: 'nearby', label: t('feedMode.nearby') || 'Nearby', icon: MapPin, color: 'green' },
    { id: 'popular', label: t('feedMode.popular') || 'Popular', icon: TrendingUp, color: 'orange' },
    { id: 'hashtag', label: t('feedMode.hashtag') || 'Following', icon: Hash, color: 'pink' },
  ];

  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2 min-w-max">
        {modes.map(({ id, label, icon: Icon, color }) => {
          const isActive = mode === id;
          const colorClasses: { [key: string]: { active: string; inactive: string } } = {
            purple: { active: 'bg-purple-600 text-white', inactive: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
            blue: { active: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            green: { active: 'bg-green-600 text-white', inactive: 'bg-green-50 text-green-600 hover:bg-green-100' },
            orange: { active: 'bg-orange-600 text-white', inactive: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
            pink: { active: 'bg-pink-600 text-white', inactive: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
          };

          const activeClass = colorClasses[color]?.active || 'bg-gray-600 text-white';
          const inactiveClass = colorClasses[color]?.inactive || 'bg-gray-50 text-gray-600 hover:bg-gray-100';
          
          return (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive ? activeClass : inactiveClass
              }`}
              data-testid={`feed-mode-${id}`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
