// 저장한 포스트 탭 — profile premium grid 3열, 북마크 토글 지원
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
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
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
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
        setSavedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      }
      toast({ title: t('toast.error.generic'), variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div
          className="h-8 w-8 animate-spin rounded-full border-b-2"
          style={{ borderColor: 'var(--accent-mint)' }}
        />
      </div>
    );
  }

  if (!savedPosts || savedPosts.length === 0) {
    return (
      <div
        className="mx-4 mt-4 rounded-[24px] px-6 py-12 text-center"
        style={{
          color: 'var(--text-secondary)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 44px rgba(0,0,0,0.18)',
        }}
      >
        <div className="mb-3 text-4xl">🔖</div>
        <p className="text-sm">{t('profile.empty.noSavedPosts')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 px-4 pt-4 pb-6">
        {savedPosts.map((post: Post) => (
          <div
            key={post.id}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl"
            style={{ background: 'var(--surface-2)', boxShadow: '0 14px 32px rgba(0,0,0,0.18)' }}
            onClick={() => setSelectedPost(post)}
            data-testid={`saved-post-item-${post.id}`}
          >
            {post.images && post.images.length > 0 ? (
              <img
                src={post.images[0]}
                alt={post.title || ''}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">📝</div>
            )}

            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.45) 100%)' }} />
            <div
              className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 py-2"
              style={{ background: 'linear-gradient(to top, rgba(8,8,12,0.76) 0%, rgba(8,8,12,0.18) 100%)' }}
            >
              <span style={{ fontSize: 10, color: 'rgba(255,225,155,0.96)' }}>🔖 {t('profile.saved.savedBadge')}</span>
              {post.location && (
                <span className="truncate" style={{ fontSize: 9, color: 'rgba(255,255,255,0.78)', flex: 1 }}>
                  {post.location}
                </span>
              )}
            </div>
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
