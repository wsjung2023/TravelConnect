# CineMap 배경음악·TTS 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CineMap 영상 생성 시 배경음악(BGM)과 TTS 자막 음성을 선택적으로 추가한다.

**Architecture:** `cinemap_jobs`에 `config` JSONB 컬럼을 추가해 오디오 설정을 저장한다. `cinemapAudioService.ts`에서 TTS 생성·BGM 해석을 담당하고, `cinemapVideoService.ts`가 이를 받아 ffmpeg 세그먼트에 오디오를 합성한다. 프론트엔드는 생성 전 옵션 패널에서 설정을 수집해 job 생성 API에 전달한다.

**Tech Stack:** OpenAI TTS API (`tts-1`), ffmpeg amix 필터, Drizzle ORM, React + TanStack Query

---

## File Map

| 파일 | 역할 |
|------|------|
| `shared/schema.ts` | `cinemap_jobs`에 `config` jsonb 컬럼 추가 |
| `server/assets/bgm/` | BGM 파일 3개 (ffmpeg으로 생성) |
| `scripts/seed-cinemap-bgm.mjs` | BGM 목록 system_config 시드 |
| `server/services/cinemapAudioService.ts` | NEW: TTS 생성, BGM 해석, 오디오 패딩 |
| `server/services/cinemapVideoService.ts` | AudioOptions 파라미터 추가, 오디오 합성 |
| `server/routes/ai-features.legacy.ts` | config 처리, GET /api/cinemap/bgm-tracks |
| `server/routes.ts` | ALLOWED_MIME_TYPES에 audio/mpeg 추가 |
| `client/src/components/timeline/CineMapHeroCard.tsx` | 오디오 옵션 패널 추가 |
| `client/src/pages/timeline.tsx` | BGM 목록 쿼리, audioConfig 전달 |

---

## Task 1: schema.ts + BGM 파일 + 시드

**Files:**
- Modify: `shared/schema.ts:199-217`
- Create: `server/assets/bgm/bgm_calm.mp3`, `bgm_upbeat.mp3`, `bgm_cinematic.mp3`
- Create: `scripts/seed-cinemap-bgm.mjs`

- [ ] **Step 1: `cinemap_jobs` 테이블에 `config` 컬럼 추가**

`shared/schema.ts`의 `cinemapJobs` 테이블 정의를 수정 (stage 컬럼 바로 뒤에 추가):

```typescript
export const cinemapJobs = pgTable('cinemap_jobs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  timelineId: integer('timeline_id').references(() => timelines.id),
  status: varchar('status').default('pending'),
  stage: varchar('stage', { length: 32 }).default('idle').notNull(),
  config: jsonb('config'),  // CinemapJobConfig | null
  resultVideoUrl: varchar('result_video_url'),
  storyboard: jsonb('storyboard'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_cinemap_jobs_user_id').on(table.userId),
  index('IDX_cinemap_jobs_timeline_id').on(table.timelineId),
  index('IDX_cinemap_jobs_status').on(table.status),
]);
```

- [ ] **Step 2: DB push**

```bash
npm run db:push
```

Expected: `cinemap_jobs` 테이블에 `config` 컬럼 추가됨 (오류 없이 완료)

- [ ] **Step 3: BGM assets 디렉토리 생성 및 파일 생성**

```bash
mkdir -p server/assets/bgm
```

ffmpeg으로 플레이스홀더 BGM 파일 생성 (실제 배포 시 CC0 음악으로 교체):

```bash
ffmpeg -y -f lavfi -i "anoisesrc=color=brown:duration=60" \
  -af "lowpass=f=800,volume=0.12" \
  server/assets/bgm/bgm_calm.mp3

ffmpeg -y -f lavfi -i "sine=frequency=440:duration=60" \
  -af "volume=0.10" \
  server/assets/bgm/bgm_upbeat.mp3

ffmpeg -y -f lavfi -i "anoisesrc=color=pink:duration=60" \
  -af "lowpass=f=1200,volume=0.10" \
  server/assets/bgm/bgm_cinematic.mp3
```

Expected: `server/assets/bgm/` 폴더에 3개 mp3 파일 생성됨

- [ ] **Step 4: BGM 시드 스크립트 작성**

`scripts/seed-cinemap-bgm.mjs` 파일 생성:

```javascript
// CineMap BGM 사전 목록을 system_config에 시드
import { db } from '../server/db.ts';
import { systemConfigs } from '../shared/schema.ts';
import { eq, and } from 'drizzle-orm';

const BGM_TRACKS = [
  { id: 'calm',      label: '잔잔한 여행',  filename: 'bgm_calm.mp3'      },
  { id: 'upbeat',   label: '활기찬 탐험',  filename: 'bgm_upbeat.mp3'    },
  { id: 'cinematic', label: '시네마틱',     filename: 'bgm_cinematic.mp3' },
];

const existing = await db.query.systemConfigs.findFirst({
  where: and(
    eq(systemConfigs.category, 'cinemap'),
    eq(systemConfigs.key, 'bgm_tracks')
  ),
});

if (existing) {
  console.log('BGM tracks already seeded, skipping.');
} else {
  await db.insert(systemConfigs).values({
    category: 'cinemap',
    key: 'bgm_tracks',
    value: JSON.stringify(BGM_TRACKS),
    description: 'CineMap 영상 배경음악 목록',
    updatedBy: 'seed',
  });
  console.log('BGM tracks seeded successfully.');
}
process.exit(0);
```

- [ ] **Step 5: 시드 스크립트 실행**

```bash
node --loader ts-node/esm scripts/seed-cinemap-bgm.mjs 2>/dev/null || \
npx tsx scripts/seed-cinemap-bgm.mjs
```

Expected: "BGM tracks seeded successfully." 출력

- [ ] **Step 6: 커밋**

```bash
git add shared/schema.ts scripts/seed-cinemap-bgm.mjs server/assets/bgm/
git commit -m "feat: cinemap_jobs config 컬럼, BGM 파일, 시드 스크립트 추가"
```

---

## Task 2: cinemapAudioService.ts 신규 생성

**Files:**
- Create: `server/services/cinemapAudioService.ts`

- [ ] **Step 1: `cinemapAudioService.ts` 파일 생성**

```typescript
// CineMap 오디오 서비스 — TTS 생성, BGM 해석, 오디오 패딩
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { getSignedReadUrl } from './objectStorageService';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const TTS_TIMEOUT_MS = 20_000;
const BGM_DIR = path.resolve(process.cwd(), 'server/assets/bgm');

export interface AudioOptions {
  bgmPath?: string;        // 로컬 절대 경로 (resolved)
  ttsEnabled: boolean;
  ttsVoice: string;        // 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
}

export interface CinemapJobConfig {
  bgmType: 'preset' | 'upload' | 'none';
  bgmPresetId?: string;
  bgmUploadUrl?: string;
  ttsEnabled: boolean;
  ttsVoice?: string;
}

// job config → AudioOptions (BGM 파일 경로 resolve 포함)
export async function resolveAudioOptions(config: CinemapJobConfig | null | undefined): Promise<AudioOptions> {
  const defaults: AudioOptions = { ttsEnabled: false, ttsVoice: 'alloy' };
  if (!config) return defaults;

  let bgmPath: string | undefined;
  if (config.bgmType === 'preset' && config.bgmPresetId) {
    const candidate = path.join(BGM_DIR, `bgm_${config.bgmPresetId}.mp3`);
    try {
      await fs.access(candidate);
      bgmPath = candidate;
    } catch {
      console.warn(`[CineMap Audio] BGM preset file not found: ${candidate}`);
    }
  } else if (config.bgmType === 'upload' && config.bgmUploadUrl) {
    bgmPath = await downloadBgmToTemp(config.bgmUploadUrl);
  }

  return {
    bgmPath,
    ttsEnabled: config.ttsEnabled ?? false,
    ttsVoice: config.ttsVoice ?? 'alloy',
  };
}

// Object Storage의 BGM URL을 임시 파일로 다운로드
async function downloadBgmToTemp(url: string): Promise<string | undefined> {
  const m = url.match(/\/api\/files\/([^/?#]+)/);
  if (!m || !m[1]) return undefined;
  try {
    const signedUrl = await getSignedReadUrl(decodeURIComponent(m[1]));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(signedUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const tmpPath = path.join(
      (await import('os')).default.tmpdir(),
      `cinemap-bgm-${Date.now()}.mp3`
    );
    await fs.writeFile(tmpPath, buf);
    return tmpPath;
  } catch {
    return undefined;
  }
}

// OpenAI TTS API로 캡션 → mp3 파일 생성
export async function generateTts(text: string, voice: string, outPath: string): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !text.trim()) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 200), voice, response_format: 'mp3' }),
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// TTS mp3를 targetSeconds에 맞게 패딩/트림 → 새 파일 출력
export async function padAudio(inputPath: string, targetSeconds: number, outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', inputPath,
      '-af', `apad=pad_dur=${targetSeconds},atrim=0:${targetSeconds}`,
      '-c:a', 'aac', '-ar', '44100',
      outPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`padAudio ffmpeg code ${code}`)));
  });
}

// 무음 aac 파일 생성 (카드용)
export async function generateSilence(durationSeconds: number, outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
      '-t', String(durationSeconds),
      '-c:a', 'aac',
      outPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`generateSilence ffmpeg code ${code}`)));
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add server/services/cinemapAudioService.ts
git commit -m "feat: cinemapAudioService — TTS 생성, BGM 해석, 오디오 유틸리티"
```

---

## Task 3: cinemapVideoService.ts — 오디오 통합

**Files:**
- Modify: `server/services/cinemapVideoService.ts`

- [ ] **Step 1: AudioOptions import 추가 및 renderPhotoSegment 시그니처 수정**

파일 상단 import에 추가:
```typescript
import { generateTts, padAudio, generateSilence, type AudioOptions } from './cinemapAudioService';
```

- [ ] **Step 2: renderPhotoSegment에 오디오 파라미터 추가**

기존 함수:
```typescript
async function renderPhotoSegment(
  imagePath: string,
  captionFile: string,
  outPath: string,
): Promise<void> {
```

변경 후:
```typescript
async function renderPhotoSegment(
  imagePath: string,
  captionFile: string,
  outPath: string,
  audioOpts?: { ttsPath?: string },
): Promise<void> {
  const fontEsc = escapeFilterPath(FONT_PATH);
  const capEsc = escapeFilterPath(captionFile);
  const vf = [
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${WIDTH}:${HEIGHT}`,
    `fade=t=in:st=0:d=${FADE}`,
    `fade=t=out:st=${(SECONDS_PER_PHOTO - FADE).toFixed(2)}:d=${FADE}`,
    `drawtext=fontfile='${fontEsc}':textfile='${capEsc}':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.5:boxborderw=18:x=(w-text_w)/2:y=h-text_h-60:line_spacing=10`,
  ].join(',');

  const audioInput = audioOpts?.ttsPath ?? null;
  if (audioOpts !== undefined) {
    // 오디오 모드: TTS 또는 무음 오디오 추가
    await runFfmpeg([
      '-y', '-hide_banner', '-loglevel', 'error',
      '-loop', '1', '-t', String(SECONDS_PER_PHOTO), '-i', imagePath,
      ...(audioInput ? ['-i', audioInput] : ['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`]),
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-shortest',
      outPath,
    ]);
  } else {
    // 기존 동작: 비디오 전용
    await runFfmpeg([
      '-y', '-hide_banner', '-loglevel', 'error',
      '-loop', '1', '-t', String(SECONDS_PER_PHOTO), '-i', imagePath,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      outPath,
    ]);
  }
}
```

- [ ] **Step 3: renderCard에 무음 오디오 추가 (오디오 모드 시)**

기존 함수 시그니처에 파라미터 추가:
```typescript
async function renderCard(
  dir: string,
  idx: number,
  heading: string,
  body: string,
  outPath: string,
  withAudio = false,
): Promise<void> {
```

함수 끝의 `runFfmpeg` 호출 부분을 수정:
```typescript
  const baseArgs = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=0x0f172a:s=${WIDTH}x${HEIGHT}:d=${CARD_SECONDS}`,
  ];

  if (withAudio) {
    await runFfmpeg([
      ...baseArgs,
      '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-t', String(CARD_SECONDS),
      outPath,
    ]);
  } else {
    await runFfmpeg([
      ...baseArgs,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      outPath,
    ]);
  }
```

- [ ] **Step 4: BGM 오버레이 함수 추가**

`concatSegments` 함수 뒤에 추가:
```typescript
// 최종 영상에 BGM을 낮은 볼륨으로 오버레이
async function overlayBgm(videoPath: string, bgmPath: string, outPath: string): Promise<void> {
  await runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', videoPath,
    '-stream_loop', '-1', '-i', bgmPath,
    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.15[aout]',
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac',
    '-movflags', '+faststart',
    outPath,
  ]);
}
```

- [ ] **Step 5: renderSlideshow에 AudioOptions 통합**

`renderSlideshow` 함수 시그니처 변경:
```typescript
export async function renderSlideshow(
  input: SlideshowInput,
  outPath: string,
  audio?: AudioOptions,
): Promise<void> {
```

함수 내부에서 `withAudio` 플래그 추가:
```typescript
  const withAudio = !!(audio?.ttsEnabled || audio?.bgmPath);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cinemap-render-'));
  try {
    const segments: string[] = [];

    // 인트로 카드
    const introCard = path.join(workDir, 'seg_intro.mp4');
    await renderCard(workDir, 0, input.title || 'CineMap', input.intro || '', introCard, withAudio);
    segments.push(introCard);

    // 사진 세그먼트
    const items = input.items.slice(0, MAX_PHOTOS);
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const capFile = await writeTextFile(workDir, `cap_${i}.txt`, wrapText(item.caption));
      const segPath = path.join(workDir, `seg_${i}.mp4`);

      let ttsPath: string | undefined;
      if (audio?.ttsEnabled) {
        const rawTts = path.join(workDir, `tts_raw_${i}.mp3`);
        const paddedTts = path.join(workDir, `tts_${i}.aac`);
        const ok = await generateTts(item.caption, audio.ttsVoice, rawTts);
        if (ok) {
          await padAudio(rawTts, SECONDS_PER_PHOTO, paddedTts);
          ttsPath = paddedTts;
        }
      }

      await renderPhotoSegment(item.imagePath, capFile, segPath, withAudio ? { ttsPath } : undefined);
      segments.push(segPath);
    }

    // 엔딩 카드
    if (input.outro && input.outro.trim()) {
      const outroCard = path.join(workDir, 'seg_outro.mp4');
      await renderCard(workDir, 1, 'Fin', input.outro, outroCard, withAudio);
      segments.push(outroCard);
    }

    const concatOut = audio?.bgmPath
      ? path.join(workDir, 'concat.mp4')
      : outPath;

    await concatSegments(workDir, segments, concatOut);

    if (audio?.bgmPath) {
      await overlayBgm(concatOut, audio.bgmPath, outPath);
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
```

- [ ] **Step 6: renderCinemapVideo 시그니처 변경**

```typescript
export function renderCinemapVideo(storyboard: Storyboard, audio?: AudioOptions): Promise<Buffer> {
  return withRenderLock(() => renderCinemapVideoInner(storyboard, audio));
}

async function renderCinemapVideoInner(storyboard: Storyboard, audio?: AudioOptions): Promise<Buffer> {
```

함수 내부 `renderSlideshow` 호출에 `audio` 전달:
```typescript
    await renderSlideshow(
      { title: ..., intro: ..., outro: ..., items },
      outPath,
      audio,
    );
```

- [ ] **Step 7: 커밋**

```bash
git add server/services/cinemapVideoService.ts
git commit -m "feat: cinemapVideoService에 TTS·BGM 오디오 합성 추가"
```

---

## Task 4: 백엔드 라우트 수정

**Files:**
- Modify: `server/routes.ts` (ALLOWED_MIME_TYPES)
- Modify: `server/routes/ai-features.legacy.ts` (config 처리, bgm-tracks 엔드포인트)

### Part A: routes.ts — audio/mpeg 허용

- [ ] **Step 1: ALLOWED_MIME_TYPES에 audio/mpeg 추가**

`server/routes.ts`의 `ALLOWED_MIME_TYPES` 배열 (137번째 줄 근처):
```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',   // BGM 업로드용
];
```

### Part B: ai-features.legacy.ts

- [ ] **Step 2: import에 resolveAudioOptions 추가**

파일 상단 import에 추가:
```typescript
import { resolveAudioOptions } from '../services/cinemapAudioService';
```

- [ ] **Step 3: GET /api/cinemap/bgm-tracks 엔드포인트 추가**

`app.get('/api/cinemap/jobs/timeline/:timelineId', ...)` 핸들러 **앞에** 추가:

```typescript
  app.get('/api/cinemap/bgm-tracks', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const config = await storage.getSystemConfigByKey('cinemap', 'bgm_tracks');
      const tracks: { id: string; label: string }[] = config
        ? (JSON.parse(config.value as string) as { id: string; label: string; filename: string }[])
            .map(({ id, label }) => ({ id, label }))
        : [];
      res.json({ tracks });
    } catch (error) {
      console.error('Error fetching BGM tracks:', error);
      res.status(500).json({ message: 'Failed to fetch BGM tracks' });
    }
  });
```

- [ ] **Step 4: POST /api/cinemap/jobs — config 저장**

기존 job 생성 코드 (약 564번째 줄):
```typescript
      const job = await storage.createCinemapJob({
        userId: req.user.id,
        timelineId: parseInt(timelineId),
        status: 'pending',
      });
```

변경 후:
```typescript
      const jobConfig = req.body.config ?? null;
      const job = await storage.createCinemapJob({
        userId: req.user.id,
        timelineId: parseInt(timelineId),
        status: 'pending',
        config: jobConfig,
      });
```

- [ ] **Step 5: 비동기 처리 블록 — audioOptions 구성 + renderCinemapVideo 전달**

기존 코드 (약 620번째 줄 — `renderCinemapVideo` 호출 부분):
```typescript
            const videoBuffer = await renderCinemapVideo(storyboard);
```

변경 후:
```typescript
            const audioOptions = await resolveAudioOptions(job.config as any);
            const videoBuffer = await renderCinemapVideo(storyboard, audioOptions);
```

- [ ] **Step 6: 커밋**

```bash
git add server/routes.ts server/routes/ai-features.legacy.ts
git commit -m "feat: BGM 업로드 허용, bgm-tracks API, CineMap job config 처리"
```

---

## Task 5: CineMapHeroCard.tsx — 오디오 옵션 패널

**Files:**
- Modify: `client/src/components/timeline/CineMapHeroCard.tsx`

- [ ] **Step 1: 오디오 옵션 패널 추가**

전체 파일을 다음으로 교체:

```typescript
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
      bgmPresetId: bgmType === 'preset' ? bgmPresetId : undefined,
      bgmUploadUrl: bgmType === 'upload' ? bgmUploadUrl : undefined,
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
              {/* BGM 선택 */}
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

              {/* TTS 토글 */}
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
```

- [ ] **Step 2: 커밋**

```bash
git add client/src/components/timeline/CineMapHeroCard.tsx
git commit -m "feat: CineMapHeroCard 오디오 옵션 패널(BGM·TTS) 추가"
```

---

## Task 6: timeline.tsx — BGM 쿼리 + audioConfig 전달

**Files:**
- Modify: `client/src/pages/timeline.tsx`

- [ ] **Step 1: CinemapJobConfig import 추가**

파일 상단 import에 추가:
```typescript
import CineMapHeroCard, { type CinemapJobConfig } from '@/components/timeline/CineMapHeroCard';
```

(기존 `import CineMapHeroCard from ...` 라인을 위로 교체)

- [ ] **Step 2: BGM 트랙 쿼리 추가**

`cinemapJobs` useQuery 아래에 추가:
```typescript
  const { data: bgmData } = useQuery<{ tracks: { id: string; label: string }[] }>({
    queryKey: ['/api/cinemap/bgm-tracks'],
    queryFn: async () => {
      const res = await fetch('/api/cinemap/bgm-tracks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch BGM tracks');
      return res.json();
    },
  });
  const bgmTracks = bgmData?.tracks ?? [];
```

- [ ] **Step 3: createCinemapMutation에 config 파라미터 추가**

기존 mutation (약 158번째 줄):
```typescript
  const createCinemapMutation = useMutation({
    mutationFn: async (timelineId: number) => {
      return apiRequest(`/api/cinemap/jobs`, {
        method: 'POST',
        body: JSON.stringify({ timelineId }),
      });
    },
```

변경 후:
```typescript
  const createCinemapMutation = useMutation({
    mutationFn: async ({ timelineId, config }: { timelineId: number; config?: CinemapJobConfig }) => {
      return apiRequest(`/api/cinemap/jobs`, {
        method: 'POST',
        body: JSON.stringify({ timelineId, config }),
      });
    },
```

- [ ] **Step 4: handleCreateCinemap 함수 수정**

기존 (약 170번째 줄 근처):
```typescript
  function handleCreateCinemap() {
    if (!selectedTimelineId) return;
    createCinemapMutation.mutate(selectedTimelineId);
  }
```

변경 후:
```typescript
  function handleCreateCinemap(config?: CinemapJobConfig) {
    if (!selectedTimelineId) return;
    createCinemapMutation.mutate({ timelineId: selectedTimelineId, config });
  }
```

- [ ] **Step 5: CineMapHeroCard에 bgmTracks + 새 onCreate 시그니처 전달**

기존:
```typescript
<CineMapHeroCard
  status={displayJob?.status}
  stage={displayJob?.stage}
  queuePosition={queuePosition}
  videoUrl={displayJob?.resultVideoUrl}
  onCreate={() => handleCreateCinemap()}
  onRetry={() => handleCreateCinemap()}
  loading={createCinemapMutation.isPending}
/>
```

변경 후:
```typescript
<CineMapHeroCard
  status={displayJob?.status}
  stage={displayJob?.stage}
  queuePosition={queuePosition}
  videoUrl={displayJob?.resultVideoUrl}
  bgmTracks={bgmTracks}
  onCreate={handleCreateCinemap}
  onRetry={() => handleCreateCinemap()}
  loading={createCinemapMutation.isPending}
/>
```

- [ ] **Step 6: 커밋**

```bash
git add client/src/pages/timeline.tsx
git commit -m "feat: timeline에 BGM 쿼리 및 audioConfig 전달 추가"
```

---

## Task 7: TypeScript 검증

**Files:**
- `client/src/components/timeline/CineMapHeroCard.tsx`
- `client/src/pages/timeline.tsx`
- `server/services/cinemapAudioService.ts`
- `server/services/cinemapVideoService.ts`

- [ ] **Step 1: TypeScript 오류 확인**

```bash
npm run check 2>&1 | grep -v "auth.ts\|contract.tsx\|ProfileSettings" | grep "error TS" | head -20
```

Expected: 오류 없음 (기존 pre-existing 오류 제외)

- [ ] **Step 2: 오류 수정 후 커밋 (오류 있을 경우)**

```bash
git add -A
git commit -m "fix: CineMap 오디오 TypeScript 타입 수정"
```

- [ ] **Step 3: 서버 재시작 요청**

TypeScript 오류가 없으면 사용자에게 Replit Stop → Run 요청.

- [ ] **Step 4: 수동 확인 포인트**

1. Timeline 페이지에서 "오디오 설정" 버튼 클릭 → 패널 열림 확인
2. BGM 목록 조회됨 확인 (`/api/cinemap/bgm-tracks` 응답)
3. TTS 토글 켜고 Generate → job 생성 시 config 포함 확인 (네트워크 탭)
4. 영상 완료 후 재생 시 오디오 존재 여부 확인
