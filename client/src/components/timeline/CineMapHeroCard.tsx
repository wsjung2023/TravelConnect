import { Film, PlayCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  status?: string | null;
  videoUrl?: string | null;
  onCreate: () => void;
  loading?: boolean;
}

export default function CineMapHeroCard({ status, videoUrl, onCreate, loading }: Props) {
  const completed = status === 'completed' && !!videoUrl;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/80">
        <Sparkles size={14} />
        CineMap Hero
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Your trip as a cinematic story</div>
          <div className="text-xs text-white/70">Generate, preview, and share your travel movie.</div>
        </div>
        <Badge variant="outline" className="border-white/30 text-white">
          {status || 'idle'}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!completed ? (
          <Button onClick={onCreate} disabled={loading} className="bg-white text-slate-900 hover:bg-white/90">
            <Film className="mr-2 h-4 w-4" />
            Generate CineMap
          </Button>
        ) : (
          <a href={videoUrl!} target="_blank" rel="noreferrer" className="inline-flex">
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <PlayCircle className="mr-2 h-4 w-4" />
              Play CineMap
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
