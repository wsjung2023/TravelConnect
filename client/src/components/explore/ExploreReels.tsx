import { useQuery } from '@tanstack/react-query';

export default function ExploreReels() {
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ['/api/posts'] });

  return (
    <div className="space-y-2">
      {posts.slice(0, 2).map((post: any) => (
        <article key={post.id} className="rounded-2xl bg-card p-3">
          <div className="text-sm font-semibold line-clamp-1">{post.title || 'Travel reel'}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">{post.content || 'Short immersive travel reel preview.'}</div>
        </article>
      ))}
      {posts.length === 0 && <div className="rounded-2xl bg-card p-4 text-sm">Reels mode: immersive vertical travel stories.</div>}
    </div>
  );
}
