import { useQuery } from '@tanstack/react-query';

export default function NearbyStoriesSheet() {
  const { data: posts = [] } = useQuery<any[]>({ queryKey: ['/api/posts'] });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Nearby stories</h3>
      <div className="space-y-2">
        {posts.slice(0, 3).map((post: any) => (
          <div key={post.id} className="rounded-xl bg-white/10 p-2">
            <div className="text-sm font-medium text-white line-clamp-1">{post.content || 'Travel story'}</div>
            <div className="text-xs text-white/60">@ {post.location || 'Nearby spot'}</div>
          </div>
        ))}
        {posts.length === 0 && <div className="text-xs text-white/60">No stories around this area yet.</div>}
      </div>
    </div>
  );
}
