// 저장한 포스트 탭 — grid 3열, 북마크 토글 지원
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { ImageFallback } from '@/components/ImageFallback';
import PostDetailModal from '@/components/PostDetailModal';
import type { Post } from '@shared/schema';

export default function SavedPostsTab() {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<number>>(new Set());

  const { data: savedPosts, isLoading } = useQuery<Post[]>({
    queryKey: ['/api/me/saved-posts'],
  });

  useEffect(() => {
    if (savedPosts) setSavedPostIds(new Set(savedPosts.map((p) => p.id)));
  }, [savedPosts]);

  const handleSave = async (postId: number) => {
    const isSaved = savedPostIds.has(postId);
    if (isSaved) {
      setSavedPostIds((prev) => { const next = new Set(prev); next.delete(postId); return next; });
    } else {
      setSavedPostIds((prev) => new Set(prev).add(postId));
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: isSaved ? 'DELETE' : 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update bookmark');
      queryClient.invalidateQueries({ queryKey: ['/api/me/saved-posts'] });
      toast({ title: isSaved ? t('post.unsaved') : t('post.saved') });
    } catch {
      if (isSaved) {
        setSavedPostIds((prev) => new Set(prev).add(postId));
      } else {
        setSavedPostIds((prev) => { const next = new Set(prev); next.delete(postId); return next; });
      }
      toast({ title: t('toast.error.generic'), variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent-mint)' }} />
      </div>
    );
  }

  if (!savedPosts || savedPosts.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
        <div className="text-4xl mb-3">🔖</div>
        <p className="text-sm">{t('profile.empty.noSavedPosts')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {savedPosts.map((post: Post) => (
          <div
            key={post.id}
            className="aspect-square overflow-hidden cursor-pointer"
            style={{ background: 'var(--surface-2)' }}
            onClick={() => setSelectedPost(post)}
            data-testid={`saved-post-item-${post.id}`}
          >
            {post.images && post.images.length > 0 ? (
              <ImageFallback src={post.images[0]} alt={post.title || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📝</div>
            )}
          </div>
        ))}
      </div>
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={() => {}}
          isLiked={false}
          onSave={() => handleSave(selectedPost.id)}
          isSaved={savedPostIds.has(selectedPost.id)}
        />
      )}
    </>
  );
}
