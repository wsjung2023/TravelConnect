import { useLocation } from 'wouter';

interface Props {
  mode?: 'stories' | 'nearby';
}

export default function ExploreCardFeed({ mode = 'stories' }: Props) {
  const [, navigate] = useLocation();

  if (mode === 'nearby') {
    return (
      <div className="rounded-2xl bg-card p-4 text-sm space-y-2">
        <div className="font-semibold">Nearby discovery</div>
        <div className="text-muted-foreground">Discover people, places and stories around your current map area.</div>
        <button
          className="app-chip"
          onClick={() => navigate('/')}
        >
          장소 보기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 text-sm space-y-2">
      <div className="font-semibold">Stories discovery</div>
      <div className="text-muted-foreground">Jump from story to map and meet people nearby.</div>
      <button className="app-chip" onClick={() => navigate('/')}>지도에서 스토리 보기</button>
    </div>
  );
}
