# CineMap 대기열·진행 상태 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여러 명이 동시에 CineMap 영상을 생성할 때 대기 순서와 처리 단계를 UI에 표시한다.

**Architecture:** `cinemap_jobs` 테이블에 `stage` 컬럼을 추가해 처리 단계를 추적한다. 기존 `GET /api/cinemap/jobs/:id` 응답에 `queuePosition`을 포함시키고, 프론트엔드는 3초 폴링으로 상태를 갱신해 단계별 메시지를 표시한다.

**Tech Stack:** Drizzle ORM (schema push), Express, React + TanStack Query

---

## File Map

| 파일 | 변경 내용 |
|------|---------|
| `shared/schema.ts` | `cinemapJobs` 테이블에 `stage` 컬럼 추가 |
| `server/repositories/contentRepository.ts` | `getCinemapQueuePosition` 함수 추가 |
| `server/storage.ts` | `getCinemapQueuePosition` 인터페이스 + 위임 추가 |
| `server/routes/ai-features.legacy.ts` | stage 업데이트 추가 + `GET /jobs/:id`에 queuePosition 포함 |
| `client/src/components/timeline/CineMapHeroCard.tsx` | stage/queuePosition props 추가, UI 상태 확장 |
| `client/src/pages/timeline.tsx` | 3초 폴링 + stage/queuePosition 전달 |

---

## Task 1: schema.ts — stage 컬럼 추가

**Files:**
- Modify: `shared/schema.ts:199-216`

- [ ] **Step 1: `cinemapJobs` 테이블 정의에 `stage` 컬럼 추가**

`shared/schema.ts`의 `cinemapJobs` 테이블 정의를 다음과 같이 수정:

```typescript
export const cinemapJobs = pgTable('cinemap_jobs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  timelineId: integer('timeline_id')
    .references(() => timelines.id),
  status: varchar('status').default('pending'), // pending, processing, completed, failed
  stage: varchar('stage', { length: 32 }).default('idle').notNull(), // idle, storyboard_generating, video_rendering
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

- [ ] **Step 2: DB 스키마 push**

```bash
npm run db:push
```

Expected: `cinemap_jobs` 테이블에 `stage` 컬럼이 추가됨 (오류 없이 완료)

- [ ] **Step 3: 커밋**

```bash
git add shared/schema.ts
git commit -m "feat: cinemap_jobs 테이블에 stage 컬럼 추가"
```

---

## Task 2: contentRepository.ts — 큐 위치 계산 함수 추가

**Files:**
- Modify: `server/repositories/contentRepository.ts` (updateCinemapJob 아래에 추가)

- [ ] **Step 1: 필요한 import 확인**

`server/repositories/contentRepository.ts` 상단에 `lte`, `inArray`가 import되어 있는지 확인. 없으면 추가:

```typescript
import { eq, desc, and, lte, inArray, sql } from 'drizzle-orm';
```

(기존 import 라인을 수정)

- [ ] **Step 2: `getCinemapQueuePosition` 함수 추가**

`updateCinemapJob` 함수 바로 뒤에 추가:

```typescript
// 해당 job 앞에 처리 대기/진행 중인 job 수 반환 (1 = 바로 다음 차례)
export async function getCinemapQueuePosition(jobId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cinemapJobs)
    .where(
      and(
        inArray(cinemapJobs.status, ['pending', 'processing']),
        lte(cinemapJobs.id, jobId)
      )
    );
  return result[0]?.count ?? 1;
}
```

- [ ] **Step 3: 커밋**

```bash
git add server/repositories/contentRepository.ts
git commit -m "feat: getCinemapQueuePosition 함수 추가"
```

---

## Task 3: storage.ts — 인터페이스 + 위임 추가

**Files:**
- Modify: `server/storage.ts`

- [ ] **Step 1: `IStorage` 인터페이스에 메서드 추가**

`updateCinemapJob` 선언(293번째 줄 근처) 바로 뒤에 추가:

```typescript
  getCinemapQueuePosition(jobId: number): Promise<number>;
```

- [ ] **Step 2: `contentRepo` 위임 확인**

`server/storage.ts` 하단의 `storage` 객체(`...contentRepo` 스프레드)가 이미 있으므로 `getCinemapQueuePosition`은 자동으로 위임됨. 별도 추가 불필요.

- [ ] **Step 3: 커밋**

```bash
git add server/storage.ts
git commit -m "feat: IStorage에 getCinemapQueuePosition 추가"
```

---

## Task 4: ai-features.legacy.ts — stage 업데이트 + queuePosition 응답

**Files:**
- Modify: `server/routes/ai-features.legacy.ts`

### Part A: 비동기 처리 블록에 stage 업데이트 추가

- [ ] **Step 1: processing 진입 시 storyboard_generating으로 업데이트**

기존 코드(576번째 줄 근처):
```typescript
await storage.updateCinemapJob(job.id, { status: 'processing' });
```

변경 후:
```typescript
await storage.updateCinemapJob(job.id, { status: 'processing', stage: 'storyboard_generating' });
```

- [ ] **Step 2: generateStoryboard 완료 후 video_rendering으로 업데이트**

기존 코드(618번째 줄 근처 — `console.log('[CineMap] Storyboard generated successfully'` 바로 뒤):
```typescript
console.log(`[CineMap] Storyboard generated successfully for job ${job.id}`);
```

그 다음 줄(렌더링 try 블록 시작 전)에 추가:
```typescript
await storage.updateCinemapJob(job.id, { stage: 'video_rendering' });
```

- [ ] **Step 3: completed 시 stage를 idle로 리셋**

기존 코드(640번째 줄 근처):
```typescript
await storage.updateCinemapJob(job.id, {
  status: 'completed',
  storyboard: storyboard as any,
  resultVideoUrl,
});
```

변경 후:
```typescript
await storage.updateCinemapJob(job.id, {
  status: 'completed',
  stage: 'idle',
  storyboard: storyboard as any,
  resultVideoUrl,
});
```

- [ ] **Step 4: failed 시 stage를 idle로 리셋**

렌더링 실패 블록(632번째 줄 근처):
```typescript
await storage.updateCinemapJob(job.id, {
  status: 'failed',
  storyboard: storyboard as any,
  errorMessage: `영상 렌더링 실패: ${renderError.message || '알 수 없는 오류'}`,
});
```

변경 후:
```typescript
await storage.updateCinemapJob(job.id, {
  status: 'failed',
  stage: 'idle',
  storyboard: storyboard as any,
  errorMessage: `영상 렌더링 실패: ${renderError.message || '알 수 없는 오류'}`,
});
```

일반 오류 블록(648번째 줄 근처)도 동일하게:
```typescript
await storage.updateCinemapJob(job.id, {
  status: 'failed',
  stage: 'idle',
  errorMessage: error.message || 'Failed to generate storyboard',
});
```

### Part B: GET /api/cinemap/jobs/:id — queuePosition 포함

- [ ] **Step 5: queuePosition 계산 후 응답에 포함**

기존 코드(662번째 줄 근처):
```typescript
const job = await storage.getCinemapJobById(jobId);
if (!job) {
  return res.status(404).json({ message: 'Job not found' });
}

if (job.userId !== req.user.id) {
  return res.status(403).json({ message: 'Access denied' });
}

res.json({ job });
```

변경 후:
```typescript
const job = await storage.getCinemapJobById(jobId);
if (!job) {
  return res.status(404).json({ message: 'Job not found' });
}

if (job.userId !== req.user.id) {
  return res.status(403).json({ message: 'Access denied' });
}

const queuePosition =
  job.status === 'pending' || job.status === 'processing'
    ? await storage.getCinemapQueuePosition(jobId)
    : null;

res.json({ job, queuePosition });
```

- [ ] **Step 6: 커밋**

```bash
git add server/routes/ai-features.legacy.ts
git commit -m "feat: CineMap job 처리 단계 stage 추적 및 queuePosition 응답 추가"
```

---

## Task 5: CineMapHeroCard.tsx — UI 상태 확장

**Files:**
- Modify: `client/src/components/timeline/CineMapHeroCard.tsx`

- [ ] **Step 1: Props에 stage, queuePosition 추가 및 UI 렌더링 업데이트**

전체 파일을 다음으로 교체:

```typescript
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

function StatusMessage({ status, stage, queuePosition }: Pick<Props, 'status' | 'stage' | 'queuePosition'>) {
  if (status === 'pending') {
    const pos = queuePosition ?? '?';
    return (
      <div className="flex items-center gap-2 text-sm text-white/80">
        <Loader2 size={14} className="animate-spin" />
        대기 중 ({pos}번째)
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

      {isActive && <StatusMessage status={status} stage={stage} queuePosition={queuePosition} />}

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
```

- [ ] **Step 2: 커밋**

```bash
git add client/src/components/timeline/CineMapHeroCard.tsx
git commit -m "feat: CineMapHeroCard에 대기열·진행 단계 표시 추가"
```

---

## Task 6: timeline.tsx — 폴링 + props 전달

**Files:**
- Modify: `client/src/pages/timeline.tsx`

- [ ] **Step 1: cinemapJob 단건 폴링 추가**

기존 `cinemapJobs` 목록 쿼리(116번째 줄 근처) 아래에 추가:

```typescript
// 활성 job이 있을 때 단건 폴링 (3초)
const activeJobId = cinemapJob?.status === 'pending' || cinemapJob?.status === 'processing'
  ? cinemapJob?.id
  : null;

const { data: activeJobData } = useQuery<{ job: CinemapJob; queuePosition: number | null }>({
  queryKey: ['/api/cinemap/jobs', activeJobId],
  queryFn: async () => {
    const response = await fetch(`/api/cinemap/jobs/${activeJobId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    });
    if (!response.ok) throw new Error('Failed to fetch job');
    return response.json();
  },
  enabled: !!activeJobId,
  refetchInterval: 3000,
});

// 폴링 결과로 목록 캐시 갱신
const polledJob = activeJobData?.job ?? null;
const queuePosition = activeJobData?.queuePosition ?? null;
const displayJob = polledJob ?? cinemapJob;
```

- [ ] **Step 2: `CineMapHeroCard`에 새 props 전달**

기존 코드(222번째 줄 근처):
```typescript
<CineMapHeroCard
  status={cinemapJob?.status}
  videoUrl={cinemapJob?.resultVideoUrl}
```

변경 후:
```typescript
<CineMapHeroCard
  status={displayJob?.status}
  stage={displayJob?.stage}
  queuePosition={queuePosition}
  videoUrl={displayJob?.resultVideoUrl}
  stage={displayJob?.stage}
  onRetry={() => createCinemapJob.mutate()}
```

(Task 1 완료 후 `CinemapJob` 타입에 `stage: string`이 자동 포함되므로 별도 타입 캐스트 불필요)

- [ ] **Step 3: 커밋**

```bash
git add client/src/pages/timeline.tsx
git commit -m "feat: CineMap 활성 job 3초 폴링 및 queuePosition 전달"
```

---

## Task 7: 동작 확인

- [ ] **Step 1: TypeScript 오류 확인**

```bash
npm run check 2>&1 | grep -i "error\|cinemap\|stage\|queuePosition" | head -20
```

Expected: 오류 없음

- [ ] **Step 2: 서버 실행 확인 (서버 재시작은 사용자에게 요청)**

TypeScript 오류가 없으면 사용자에게 Replit Stop → Run 요청.

- [ ] **Step 3: 수동 확인 포인트**

1. CineMap 영상 생성 버튼 클릭 → "대기 중 (1번째)" 표시 확인
2. 처리 시작 → "AI 스토리보드 생성 중..." 표시 확인
3. 렌더링 단계 → "영상 렌더링 중..." 표시 확인
4. 완료 → "Play CineMap" 버튼 표시 확인
