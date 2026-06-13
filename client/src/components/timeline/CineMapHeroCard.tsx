// CineMap 히어로 카드 — 영상 생성 상태 표시 + 오디오 옵션 패널 (BGM·TTS)
import { useState } from 'react';
import { ChevronDown, ChevronUp, Film, Loader2, PlayCircle, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface CinemapJobConfig {
  bgmType: 'preset' | 'upload' | 'none';
  bgmPresetId?: string;
  bgmUploadUrl?: string;
  ttsEnabled: boolean;
  ttsVoice?: string;
}

interface BgmTrack { id: string; label: string; }

interface Props {
  status?: string | null;
  stage?: string | null;
  queuePosition?: number | null;
  videoUrl?: string | null;
  bgmTracks?: BgmTrack[];
  onCreate: (config: CinemapJobConfig) => void;
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

export default function CineMapHeroCard({
  status, stage, queuePosition, videoUrl, bgmTracks = [], onCreate, onRetry, loading,
}: Props) {
  const completed = status === 'completed' && !!videoUrl;
  const isActive = status === 'pending' || status === 'processing';

  const [showOptions, setShowOptions] = useState(false);
  const [bgmType, setBgmType] = useState<'preset' | 'upload' | 'none'>('none');
  const [bgmPresetId, setBgmPresetId] = useState<string>(bgmTracks[0]?.id ?? '');
  const [bgmUploadUrl, setBgmUploadUrl] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState(false);

  function handleGenerate() {
    const config: CinemapJobConfig = {
      bgmType,
      ...(bgmType === 'preset' ? { bgmPresetId } : {}),
      ...(bgmType === 'upload' ? { bgmUploadUrl } : {}),
      ttsEnabled,
      ttsVoice: 'alloy',
    };
    onCreate(config);
  }

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
      <div className="mb-2 flex items-center gap-2 text-sm text-white/80">
        <Sparkles size={14} />
        CineMap Hero
      </div>
      <div className="mb-1 text-lg font-semibold">Your trip as a cinematic story</div>
      <div className="mb-3 text-xs text-white/70">Generate, preview, and share your travel movie.</div>

      {(isActive || status === 'failed') && (
        <StatusMessage status={status} stage={stage} queuePosition={queuePosition} />
      )}

      {!completed && !isActive && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90"
          >
            {showOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            오디오 설정 (선택사항)
          </button>

          {showOptions && (
            <div className="mt-2 space-y-3 rounded-xl bg-white/10 p-3 text-sm">
              <div>
                <div className="mb-1 font-medium text-white/80">배경음악 (BGM)</div>
                <div className="space-y-1">
                  {bgmTracks.map((track) => (
                    <label key={track.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="bgm"
                        value={track.id}
                        checked={bgmType === 'preset' && bgmPresetId === track.id}
                        onChange={() => { setBgmType('preset'); setBgmPresetId(track.id); }}
                        className="accent-white"
                      />
                      {track.label}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bgm"
                      checked={bgmType === 'upload'}
                      onChange={() => setBgmType('upload')}
                      className="accent-white"
                    />
                    내 파일 업로드
                  </label>
                  {bgmType === 'upload' && (
                    <input
                      type="text"
                      placeholder="/api/files/xxx.mp3"
                      value={bgmUploadUrl}
                      onChange={(e) => setBgmUploadUrl(e.target.value)}
                      className="mt-1 w-full rounded bg-white/20 px-2 py-1 text-xs text-white placeholder:text-white/40"
                    />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bgm"
                      checked={bgmType === 'none'}
                      onChange={() => setBgmType('none')}
                      className="accent-white"
                    />
                    없음
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="tts-toggle"
                  checked={ttsEnabled}
                  onCheckedChange={setTtsEnabled}
                />
                <Label htmlFor="tts-toggle" className="text-white/80 cursor-pointer">
                  자막 음성 (TTS)
                </Label>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center gap-2">
        {completed ? (
          <a href={videoUrl!} target="_blank" rel="noreferrer" className="inline-flex">
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <PlayCircle className="mr-2 h-4 w-4" />
              Play CineMap
            </Button>
          </a>
        ) : status === 'failed' ? (
          <Button onClick={onRetry} className="bg-white text-slate-900 hover:bg-white/90">
            <Film className="mr-2 h-4 w-4" />
            재시도
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={loading || isActive || (bgmType === 'upload' && !bgmUploadUrl)}
            className="bg-white text-slate-900 hover:bg-white/90"
          >
            <Film className="mr-2 h-4 w-4" />
            Generate CineMap
          </Button>
        )}
      </div>
    </div>
  );
}
