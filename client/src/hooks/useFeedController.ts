import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Post, Experience } from '@shared/schema';

export type FeedMode = 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag';
export type FilterType = 'all' | 'posts' | 'experiences';

const LIKED_POSTS_KEY = 'likedPosts';

const getLikedPostsFromStorage = (userId?: string): Set<number> => {
  if (!userId) return new Set();
  try {
    const key = `${LIKED_POSTS_KEY}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.warn('Failed to load liked posts:', error);
  }
  return new Set();
};

const saveLikedPostsToStorage = (likedPosts: Set<number>, userId?: string) => {
  if (!userId) return;
  try {
    const key = `${LIKED_POSTS_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(Array.from(likedPosts)));
  } catch (error) {
    console.warn('Failed to save liked posts:', error);
  }
};

export interface FeedPost extends Post {
  score?: number;
  hashtags?: { id: number; name: string }[];
  isSaved?: boolean;
}

interface UseFeedControllerOptions {
  initialMode?: FeedMode;
  initialFilter?: FilterType;
  limit?: number;
}

export function useFeedController(options: UseFeedControllerOptions = {}) {
  const { 
    initialMode = 'smart', 
    initialFilter = 'all',
    limit = 50 
  } = options;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [feedMode, setFeedMode] = useState<FeedMode>(initialMode);
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const { data: currentUser } = useQuery<{ id: string; email: string; role?: string }>({
    queryKey: ['/api/auth/me'],
  });

  useEffect(() => {
    if (currentUser?.id) {
      setLikedPosts(getLikedPostsFromStorage(currentUser.id));
    }
  }, [currentUser?.id]);

  const { data: posts = [], isLoading: isLoadingPosts, refetch: refetchPosts } = useQuery<FeedPost[]>({
    queryKey: ['/api/feed', feedMode],
    queryFn: async () => {
      const params = new URLSearchParams({
        mode: feedMode,
        limit: limit.toString(),
      });
      
      if (navigator.geolocation && (feedMode === 'nearby' || feedMode === 'smart')) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          );
          params.set('lat', position.coords.latitude.toString());
          params.set('lng', position.coords.longitude.toString());
        } catch {}
      }
      
      const response = await fetch(`/api/feed?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch feed');
      return response.json();
    },
  });

  const { data: experiences = [], isLoading: isLoadingExperiences } = useQuery<Experience[]>({
    queryKey: ['/api/experiences'],
  });

  const { data: savedPostsData = [] } = useQuery<{ id: number }[]>({
    queryKey: ['/api/me/saved-posts'],
    queryFn: async () => {
      const response = await fetch('/api/me/saved-posts?limit=100');
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (Array.isArray(savedPostsData)) {
      setSavedPosts(new Set(savedPostsData.map(p => p.id)));
    }
  }, [savedPostsData]);

  const likeMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: 'like' | 'unlike' }) => {
      const response = await fetch(`/api/posts/${postId}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action}`);
      return response.json();
    },
    onMutate: async ({ postId, action }) => {
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (action === 'like') next.add(postId);
        else next.delete(postId);
        saveLikedPostsToStorage(next, currentUser?.id);
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed', feedMode] });
    },
    onError: (_, { postId, action }) => {
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (action === 'like') next.delete(postId);
        else next.add(postId);
        saveLikedPostsToStorage(next, currentUser?.id);
        return next;
      });
      toast({
        title: 'Error',
        description: 'Failed to update like status',
        variant: 'destructive',
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: 'save' | 'unsave' }) => {
      const response = await fetch(`/api/posts/${postId}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action}`);
      return response.json();
    },
    onMutate: async ({ postId, action }) => {
      setSavedPosts(prev => {
        const next = new Set(prev);
        if (action === 'save') next.add(postId);
        else next.delete(postId);
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me/saved-posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed', feedMode] });
    },
    onError: (_, { postId, action }) => {
      setSavedPosts(prev => {
        const next = new Set(prev);
        if (action === 'save') next.delete(postId);
        else next.add(postId);
        return next;
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed', feedMode] });
      toast({
        title: 'Success',
        description: 'Post deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    },
  });

  const handleLike = useCallback((postId: number) => {
    const isLiked = likedPosts.has(postId);
    likeMutation.mutate({ postId, action: isLiked ? 'unlike' : 'like' });
  }, [likedPosts, likeMutation]);

  const handleSave = useCallback((postId: number) => {
    const isSaved = savedPosts.has(postId);
    saveMutation.mutate({ postId, action: isSaved ? 'unsave' : 'save' });
  }, [savedPosts, saveMutation]);

  const handleDelete = useCallback((postId: number) => {
    deleteMutation.mutate(postId);
  }, [deleteMutation]);

  const isPostLiked = useCallback((postId: number) => likedPosts.has(postId), [likedPosts]);
  const isPostSaved = useCallback((postId: number) => savedPosts.has(postId), [savedPosts]);

  const filteredItems = (() => {
    const postItems = posts.map(p => ({ type: 'post' as const, data: p, createdAt: p.createdAt }));
    const expItems = experiences.map(e => ({ type: 'experience' as const, data: e, createdAt: e.createdAt }));
    
    switch (filter) {
      case 'posts':
        return postItems;
      case 'experiences':
        return expItems;
      default:
        return [...postItems, ...expItems].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
  })();

  return {
    feedMode,
    setFeedMode,
    filter,
    setFilter,
    posts,
    experiences,
    filteredItems,
    isLoading: isLoadingPosts || isLoadingExperiences,
    currentUser,
    likedPosts,
    savedPosts,
    handleLike,
    handleSave,
    handleDelete,
    isPostLiked,
    isPostSaved,
    refetchPosts,
    isLikePending: likeMutation.isPending,
    isSavePending: saveMutation.isPending,
    isDeletePending: deleteMutation.isPending,
  };
}

export default useFeedController;
