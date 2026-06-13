import { Film, Loader2, PlayCircle, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  status?: string | null;
  stage?: string | null;
  queuePosition?: number | null;
  videoUrl?: string | null;
  onCreate: () => void;
  onRetry?: () => void;
  loading?: boolean;
}

function StatusMessage({ status, stage, queuePosition }: {
  status: string | null | undefined;
  stage: string | null | undefined;
  queuePosition: number | null | undefined;
}) {
  if (status === 'pending') {
    const pos = queuePosition ?? '?';
    const label = pos === 1 ? '처리 준비 중' : `대기 중 (${pos}번째)`;
    return (
      <div className="flex items-center gap-2 text-sm text-white/80">
        <Loader2 size={14} className="animate-spin" />
        {label}
      </div>
    );
  }
  if (status === 'processing') {
    const label = stage === 'video_rendering' ? '영상 렌더링 중...' : 'AI 스토리보드 생성 중...';
    return (
      <div className="flex items-center gap-2 text-sm text-white/80">
        <Loader2 size={14} className="animate-spin" />
        {label}
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-300">
        <XCircle size={14} />
        생성 실패
      </div>
    );
  }
  return null;
}

export default function CineMapHeroCard({ status, stage, queuePosition, videoUrl, onCreate, onRetry, loading }: Props) {
  const completed = status === 'completed' && !!videoUrl;
  const isActive = status === 'pending' || status === 'processing';

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/80">
        <Sparkles size={14} />
        CineMap Hero
      </div>
      <div className="mb-1 text-lg font-semibold">Your trip as a cinematic story</div>
      <div className="mb-3 text-xs text-white/70">Generate, preview, and share your travel movie.</div>

      {(isActive || status === 'failed') && <StatusMessage status={status} stage={stage} queuePosition={queuePosition} />}

      <div className="mt-3 flex items-center gap-2">
        {completed ? (
          <a href={videoUrl!} target="_blank" rel="noreferrer" className="inline-flex">
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <PlayCircle className="mr-2 h-4 w-4" />
              Play CineMap
            </Button>
          </a>
        ) : status === 'failed' ? (
          <Button onClick={onRetry ?? onCreate} className="bg-white text-slate-900 hover:bg-white/90">
            <Film className="mr-2 h-4 w-4" />
            재시도
          </Button>
        ) : (
          <Button onClick={onCreate} disabled={loading || isActive} className="bg-white text-slate-900 hover:bg-white/90">
            <Film className="mr-2 h-4 w-4" />
            Generate CineMap
          </Button>
        )}
      </div>
    </div>
  );
}
