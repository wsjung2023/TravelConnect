import type { Post } from '@shared/schema';
import { useLocation } from 'wouter';

interface Props {
  posts: Post[];
  onClose: () => void;
}

export default function ExploreReelsViewer({ posts, onClose }: Props) {
  const [, navigate] = useLocation();

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div className="sticky top-0 flex items-center justify-between p-4 bg-black/70">
        <h3 className="font-semibold">Explore Reels</h3>
        <button className="app-chip" onClick={onClose}>닫기</button>
      </div>
      <div className="h-[calc(100vh-64px)] overflow-y-auto snap-y snap-mandatory">
        {posts.slice(0, 12).map((post) => (
          <section key={post.id} className="snap-start min-h-[calc(100vh-64px)] p-4 border-b border-white/10 flex flex-col justify-end">
            <h4 className="text-lg font-semibold">{post.title || 'Travel reel'}</h4>
            <p className="text-sm text-white/80 line-clamp-5">{post.content || 'No description'}</p>
            <div className="mt-2 text-xs text-white/60">@ {post.location || 'Unknown location'}</div>
            <button
              className="mt-3 app-chip w-fit"
              onClick={() => {
                onClose();
                navigate('/');
              }}
            >
              지도에서 보기
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
