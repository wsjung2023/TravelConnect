import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Hash, Plus, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Hashtag {
  id: number;
  name: string;
  displayName: string;
  postCount: number;
  followerCount: number;
  growthRate?: number;
}

interface TrendingHashtagsProps {
  onHashtagClick?: (hashtag: Hashtag) => void;
  showFollowButton?: boolean;
}

export default function TrendingHashtags({ onHashtagClick, showFollowButton = true }: TrendingHashtagsProps) {
  const { t, i18n } = useTranslation('ui');
  const queryClient = useQueryClient();
  const lang = i18n.language?.slice(0, 2) || 'en';

  const { data: trending = [], isLoading } = useQuery<Hashtag[]>({
    queryKey: ['/api/hashtags/trending', lang],
    queryFn: async () => {
      const response = await fetch(`/api/hashtags/trending?limit=5&lang=${lang}`);
      if (!response.ok) throw new Error('Failed to fetch trending hashtags');
      return response.json();
    },
  });

  const { data: followedHashtags = [] } = useQuery<Hashtag[]>({
    queryKey: ['/api/me/hashtags', lang],
    queryFn: async () => {
      const response = await fetch(`/api/me/hashtags?lang=${lang}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const followedIds = new Set(followedHashtags.map(h => h.id));

  const followMutation = useMutation({
    mutationFn: async ({ hashtagId, action }: { hashtagId: number; action: 'follow' | 'unfollow' }) => {
      const method = action === 'follow' ? 'POST' : 'DELETE';
      return api(`/api/hashtags/${hashtagId}/follow`, { method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/hashtags', lang] });
      queryClient.invalidateQueries({ queryKey: ['/api/hashtags/trending', lang] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
    },
  });

  const handleFollowToggle = (hashtagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFollowing = followedIds.has(hashtagId);
    followMutation.mutate({ hashtagId, action: isFollowing ? 'unfollow' : 'follow' });
  };

  if (isLoading) {
    return (
      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-purple-700">{t('trending.title') || 'Trending'}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-full px-3 py-1.5 h-7 w-20" />
          ))}
        </div>
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={16} className="text-purple-600" />
        <span className="text-sm font-medium text-purple-700">{t('trending.title') || 'Trending'}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {trending.map(hashtag => {
          const isFollowing = followedIds.has(hashtag.id);
          
          return (
            <div
              key={hashtag.id}
              onClick={() => onHashtagClick?.(hashtag)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isFollowing 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white text-purple-700 hover:bg-purple-100'
              }`}
              role="button"
              tabIndex={0}
              data-testid={`trending-hashtag-${hashtag.id}`}
            >
              <Hash size={12} />
              <span>{hashtag.displayName || hashtag.name}</span>
              <span className="text-xs opacity-70">({hashtag.postCount})</span>
              
              {showFollowButton && (
                <span
                  onClick={(e) => handleFollowToggle(hashtag.id, e)}
                  className={`ml-1 p-0.5 rounded-full transition-colors cursor-pointer ${
                    isFollowing 
                      ? 'bg-white/20 hover:bg-white/30' 
                      : 'bg-purple-100 hover:bg-purple-200'
                  }`}
                  role="button"
                  tabIndex={0}
                  data-testid={`follow-hashtag-${hashtag.id}`}
                >
                  {isFollowing ? <Check size={10} /> : <Plus size={10} />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
