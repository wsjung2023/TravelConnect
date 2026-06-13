# CineMap 영상 생성 자동 테스트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vitest 단위 테스트(순수 함수 + 모킹) + 스모크 스크립트(영상 완료까지 폴링)로 CineMap 영상 생성 기능을 자동 검증한다.

**Architecture:** Vitest로 `wrapText`, `escapeFilterPath`, `clusterPhotos`, `resolveAudioOptions`, `generateTts` 및 ffmpeg 인자 구성 함수를 테스트한다. `child_process.spawn`과 `fetch`를 vi.mock으로 대체해 외부 의존성 없이 로직만 검증한다. 스모크 스크립트는 실제 서버에 job을 생성하고 3분 타임아웃으로 완료를 확인한다.

**Tech Stack:** Vitest, vi.mock (child_process / fs / fetch), Node.js ESM smoke scripts

---

## File Map

| 파일 | 역할 |
|------|------|
| `vitest.config.ts` | Create: Vitest 설정 (node 환경, tests/unit 포함) |
| `package.json` | Modify: vitest devDep + "test" 스크립트 |
| `server/services/cinemapVideoService.ts` | Modify: wrapText, escapeFilterPath, renderPhotoSegment, renderCard, overlayBgm export 추가 |
| `tests/unit/cinemap-video.test.ts` | Create: wrapText + escapeFilterPath + ffmpeg 인자 검증 |
| `tests/unit/cinemap-audio.test.ts` | Create: resolveAudioOptions + generateTts |
| `tests/unit/cinemap-cluster.test.ts` | Create: clusterPhotos |
| `scripts/smoke/smoke-cinemap-video.mjs` | Create: 영상 생성 완료 폴링 스모크 테스트 |

---

## Task 1: Vitest 설치 + 설정

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: vitest 설치**

```bash
npm install --save-dev vitest
```

Expected: `node_modules/vitest` 생성, `package.json` devDependencies에 `"vitest": "..."` 추가됨

- [ ] **Step 2: vitest.config.ts 생성**

```typescript
// Vitest 설정 — 단위 테스트만 (Node 환경, tests/unit 폴더)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"` 섹션에 두 줄 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 동작 확인용 임시 테스트 실행**

```bash
npx vitest run --reporter=verbose 2>&1 | head -10
```

Expected: "No test files found" 또는 정상 종료 (오류 없음)

- [ ] **Step 5: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: Vitest 설치 및 설정"
```

---

## Task 2: cinemapVideoService.ts — 테스트용 export 추가

**Files:**
- Modify: `server/services/cinemapVideoService.ts`

현재 `wrapText`, `escapeFilterPath`, `renderPhotoSegment`, `renderCard`, `overlayBgm`은 내부 함수라 테스트에서 직접 호출 불가. `export` 키워드를 추가한다.

- [ ] **Step 1: 5개 함수에 export 추가**

아래 각 함수 선언 앞에 `export` 추가 (함수 본문은 변경 없음):

```typescript
// 변경 전 → 변경 후

function escapeFilterPath(p: string): string {
// →
export function escapeFilterPath(p: string): string {

function wrapText(text: string, maxChars = 28): string {
// →
export function wrapText(text: string, maxChars = 28): string {

async function renderPhotoSegment(
// →
export async function renderPhotoSegment(

async function renderCard(
// →
export async function renderCard(

async function overlayBgm(videoPath: string, bgmPath: string, outPath: string): Promise<void> {
// →
export async function overlayBgm(videoPath: string, bgmPath: string, outPath: string): Promise<void> {
```

- [ ] **Step 2: TypeScript 오류 확인**

```bash
npm run check 2>&1 | grep "cinemapVideoService" | grep "error TS" | head -5
```

Expected: 출력 없음 (오류 없음)

- [ ] **Step 3: 커밋**

```bash
git add server/services/cinemapVideoService.ts
git commit -m "test: cinemapVideoService 내부 함수 export (테스트용)"
```

---

## Task 3: tests/unit/cinemap-video.test.ts

**Files:**
- Create: `tests/unit/cinemap-video.test.ts`

`wrapText`와 `escapeFilterPath`는 순수 함수 — 모킹 불필요.  
`renderPhotoSegment`, `renderCard`, `overlayBgm`은 `child_process.spawn`을 모킹해 ffmpeg에 전달되는 인자를 검증한다.

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// cinemapVideoService 순수 함수 + ffmpeg 인자 단위 테스트
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// child_process.spawn 모킹 — ffmpeg 실제 실행 없이 인자만 캡처
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// fs.promises 모킹 — 파일 시스템 접근 없이 실행
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdtemp: vi.fn().mockResolvedValue('/tmp/test-cinemap'),
      rm: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from('')),
    },
  };
});

import { spawn } from 'child_process';
import {
  wrapText,
  escapeFilterPath,
  renderPhotoSegment,
  renderCard,
  overlayBgm,
} from '../../server/services/cinemapVideoService';

// spawn 호출 시 즉시 성공하는 가짜 프로세스 반환
function makeProc(exitCode = 0): any {
  const proc = new EventEmitter() as any;
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  setImmediate(() => proc.emit('close', exitCode));
  return proc;
}

// 마지막 spawn 호출의 args 배열 반환
function lastSpawnArgs(): string[] {
  const calls = vi.mocked(spawn).mock.calls;
  return (calls[calls.length - 1]?.[1] ?? []) as string[];
}

beforeEach(() => {
  vi.mocked(spawn).mockImplementation(() => makeProc());
});

afterEach(() => {
  vi.mocked(spawn).mockReset();
});

// ────────────────────────────────────────────────────────────
// wrapText
// ────────────────────────────────────────────────────────────
describe('wrapText', () => {
  it('빈 문자열 → 공백 반환', () => {
    expect(wrapText('')).toBe(' ');
  });

  it('짧은 텍스트는 그대로 반환', () => {
    expect(wrapText('hello')).toBe('hello');
  });

  it('한국어 28자 초과 시 강제 분할', () => {
    const long = '가'.repeat(30);
    const result = wrapText(long);
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(28));
  });

  it('영문 단어 단위로 줄바꿈', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the river';
    const result = wrapText(text);
    const lines = result.split('\n');
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(28));
  });

  it('최대 3줄로 잘림', () => {
    const long = '가'.repeat(100);
    const result = wrapText(long);
    expect(result.split('\n').length).toBeLessThanOrEqual(3);
  });
});

// ────────────────────────────────────────────────────────────
// escapeFilterPath
// ────────────────────────────────────────────────────────────
describe('escapeFilterPath', () => {
  it('콜론 이스케이프', () => {
    expect(escapeFilterPath('/path/to:file')).toBe('/path/to\\:file');
  });

  it('백슬래시 이스케이프', () => {
    expect(escapeFilterPath('C:\\path')).toBe('C:\\\\path');
  });

  it("작은따옴표 이스케이프", () => {
    expect(escapeFilterPath("/path/it's")).toBe("/path/it\\'s");
  });

  it('복합 이스케이프', () => {
    const result = escapeFilterPath("C:\\path:to'file");
    expect(result).toBe("C:\\\\path\\:to\\'file");
  });

  it('이스케이프 불필요한 경로는 그대로', () => {
    expect(escapeFilterPath('/normal/path/file.txt')).toBe('/normal/path/file.txt');
  });
});

// ────────────────────────────────────────────────────────────
// renderPhotoSegment — ffmpeg 인자 검증
// ────────────────────────────────────────────────────────────
describe('renderPhotoSegment', () => {
  it('audioOpts 없을 때 -c:a 인자 미포함', async () => {
    await renderPhotoSegment('/img.jpg', '/cap.txt', '/out.mp4', undefined);
    const args = lastSpawnArgs();
    expect(args).not.toContain('-c:a');
    expect(args.join(' ')).not.toContain('anullsrc');
  });

  it('audioOpts={} 일 때 anullsrc 및 -c:a aac 포함', async () => {
    await renderPhotoSegment('/img.jpg', '/cap.txt', '/out.mp4', {});
    const args = lastSpawnArgs();
    expect(args.join(' ')).toContain('anullsrc');
    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
  });

  it('ttsPath 있을 때 해당 파일을 -i 인자로 포함, anullsrc 미포함', async () => {
    await renderPhotoSegment('/img.jpg', '/cap.txt', '/out.mp4', { ttsPath: '/tts.aac' });
    const args = lastSpawnArgs();
    expect(args).toContain('/tts.aac');
    expect(args.join(' ')).not.toContain('anullsrc');
  });
});

// ────────────────────────────────────────────────────────────
// renderCard — ffmpeg 인자 검증
// ────────────────────────────────────────────────────────────
describe('renderCard', () => {
  it('withAudio=false(기본값)일 때 anullsrc 미포함', async () => {
    await renderCard('/tmp', 0, 'Title', 'Body', '/out.mp4', false);
    const args = lastSpawnArgs();
    expect(args.join(' ')).not.toContain('anullsrc');
    expect(args).not.toContain('-c:a');
  });

  it('withAudio=true일 때 anullsrc 및 -c:a aac 포함', async () => {
    await renderCard('/tmp', 0, 'Title', 'Body', '/out.mp4', true);
    const args = lastSpawnArgs();
    expect(args.join(' ')).toContain('anullsrc=r=44100:cl=stereo');
    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
  });
});

// ────────────────────────────────────────────────────────────
// overlayBgm — ffmpeg 인자 검증
// ────────────────────────────────────────────────────────────
describe('overlayBgm', () => {
  it('amix, weights=1 0.15, -stream_loop -1, -c:v copy 포함', async () => {
    await overlayBgm('/video.mp4', '/bgm.mp3', '/out.mp4');
    const args = lastSpawnArgs();
    const joined = args.join(' ');
    expect(joined).toContain('amix=inputs=2:duration=first:weights=1 0.15');
    expect(args).toContain('-stream_loop');
    expect(args).toContain('-1');
    expect(args).toContain('-c:v');
    expect(args).toContain('copy');
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run tests/unit/cinemap-video.test.ts --reporter=verbose 2>&1
```

Expected: 전체 PASS. 실패 시 오류 메시지 확인 후 수정.

- [ ] **Step 3: 커밋**

```bash
git add tests/unit/cinemap-video.test.ts
git commit -m "test: cinemapVideoService wrapText·escapeFilterPath·ffmpeg 인자 단위 테스트"
```

---

## Task 4: tests/unit/cinemap-audio.test.ts

**Files:**
- Create: `tests/unit/cinemap-audio.test.ts`

`resolveAudioOptions`는 `fs.access`를 모킹해 BGM 파일 존재 여부를 제어한다.  
`generateTts`는 `global.fetch`를 모킹해 OpenAI API 호출 없이 성공/실패/타임아웃을 검증한다.

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// cinemapAudioService 단위 테스트 — resolveAudioOptions + generateTts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';

// fs.promises.access 모킹 — BGM 파일 존재 여부 제어
const mockAccess = vi.fn();
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      access: mockAccess,
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// objectStorageService 모킹 — GCS 접근 없이 실행
vi.mock('../../server/services/objectStorageService', () => ({
  getSignedReadUrl: vi.fn().mockResolvedValue('https://example.com/signed-url'),
}));

import {
  resolveAudioOptions,
  generateTts,
  type CinemapJobConfig,
} from '../../server/services/cinemapAudioService';

const BGM_DIR = path.resolve(process.cwd(), 'server/assets/bgm');

afterEach(() => {
  vi.restoreAllMocks();
  mockAccess.mockReset();
});

// ────────────────────────────────────────────────────────────
// resolveAudioOptions
// ────────────────────────────────────────────────────────────
describe('resolveAudioOptions', () => {
  it('config null → 기본값 반환 (bgmPath 없음, ttsEnabled false)', async () => {
    const result = await resolveAudioOptions(null);
    expect(result.ttsEnabled).toBe(false);
    expect(result.ttsVoice).toBe('alloy');
    expect(result.bgmPath).toBeUndefined();
  });

  it('bgmType none → bgmPath 없음', async () => {
    const config: CinemapJobConfig = { bgmType: 'none', ttsEnabled: false };
    const result = await resolveAudioOptions(config);
    expect(result.bgmPath).toBeUndefined();
  });

  it('bgmType preset + 파일 존재 → bgmPath에 bgm_calm.mp3 경로 포함', async () => {
    mockAccess.mockResolvedValue(undefined); // 파일 존재
    const config: CinemapJobConfig = {
      bgmType: 'preset',
      bgmPresetId: 'calm',
      ttsEnabled: false,
    };
    const result = await resolveAudioOptions(config);
    expect(result.bgmPath).toBe(path.join(BGM_DIR, 'bgm_calm.mp3'));
  });

  it('bgmType preset + 파일 없음 → bgmPath undefined (경고만)', async () => {
    mockAccess.mockRejectedValue(new Error('ENOENT'));
    const config: CinemapJobConfig = {
      bgmType: 'preset',
      bgmPresetId: 'nonexistent',
      ttsEnabled: false,
    };
    const result = await resolveAudioOptions(config);
    expect(result.bgmPath).toBeUndefined();
  });

  it('ttsEnabled true + ttsVoice echo → 그대로 반환', async () => {
    const config: CinemapJobConfig = {
      bgmType: 'none',
      ttsEnabled: true,
      ttsVoice: 'echo',
    };
    const result = await resolveAudioOptions(config);
    expect(result.ttsEnabled).toBe(true);
    expect(result.ttsVoice).toBe('echo');
  });

  it('ttsVoice 미지정 시 기본값 alloy', async () => {
    const config: CinemapJobConfig = { bgmType: 'none', ttsEnabled: true };
    const result = await resolveAudioOptions(config);
    expect(result.ttsVoice).toBe('alloy');
  });
});

// ────────────────────────────────────────────────────────────
// generateTts
// ────────────────────────────────────────────────────────────
describe('generateTts', () => {
  const originalEnv = process.env.OPENAI_API_KEY;
  const TMP_PATH = path.join(os.tmpdir(), 'test-tts.mp3');

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it('fetch 성공(200) → true 반환', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1024),
    } as Response);

    const result = await generateTts('안녕하세요', 'alloy', TMP_PATH);
    expect(result).toBe(true);
  });

  it('fetch 실패(500) → false 반환', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await generateTts('안녕하세요', 'alloy', TMP_PATH);
    expect(result).toBe(false);
  });

  it('빈 텍스트(공백만) → false 반환, fetch 미호출', async () => {
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const result = await generateTts('   ', 'alloy', TMP_PATH);
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('OPENAI_API_KEY 없을 때 → false 반환, fetch 미호출', async () => {
    delete process.env.OPENAI_API_KEY;
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const result = await generateTts('텍스트', 'alloy', TMP_PATH);
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetch 예외(네트워크 오류) → false 반환', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await generateTts('텍스트', 'alloy', TMP_PATH);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run tests/unit/cinemap-audio.test.ts --reporter=verbose 2>&1
```

Expected: 전체 PASS. 실패 시 오류 메시지 확인 후 수정.

- [ ] **Step 3: 커밋**

```bash
git add tests/unit/cinemap-audio.test.ts
git commit -m "test: cinemapAudioService resolveAudioOptions·generateTts 단위 테스트"
```

---

## Task 5: tests/unit/cinemap-cluster.test.ts

**Files:**
- Create: `tests/unit/cinemap-cluster.test.ts`

`clusterPhotos`는 순수 함수 — 모킹 불필요.  
클러스터링 기준: 200m 이내 + 60분 이내 = 같은 클러스터.

- [ ] **Step 1: 테스트 파일 생성**

```typescript
// clusterPhotos 단위 테스트 — GPS 클러스터링 로직 검증
import { describe, it, expect } from 'vitest';
import { clusterPhotos, type PhotoWithExif } from '../../server/ai/cinemap';

// 기준 위치 (서울 중심부)
const SEOUL = { lat: 37.5665, lng: 126.9780 };
// 서울에서 ~400km 떨어진 부산
const BUSAN = { lat: 35.1796, lng: 129.0756 };
// 서울에서 ~100m 떨어진 인접 지점
const NEAR_SEOUL = { lat: 37.5674, lng: 126.9780 };

function makePhoto(
  id: number,
  lat: number,
  lng: number,
  minutesOffset = 0,
): PhotoWithExif {
  return {
    id,
    url: `https://example.com/photo${id}.jpg`,
    datetime: new Date(2024, 0, 1, 12, minutesOffset),
    latitude: lat,
    longitude: lng,
    metadata: null,
  };
}

describe('clusterPhotos', () => {
  it('빈 배열 → 빈 배열 반환', () => {
    expect(clusterPhotos([])).toEqual([]);
  });

  it('사진 1장 → 클러스터 1개', () => {
    const photos = [makePhoto(1, SEOUL.lat, SEOUL.lng)];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.photos).toHaveLength(1);
  });

  it('같은 위치 2장 (100m 이내, 5분 차이) → 클러스터 1개', () => {
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, NEAR_SEOUL.lat, NEAR_SEOUL.lng, 5),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.photos).toHaveLength(2);
  });

  it('서울·부산 (400km 이상) → 클러스터 2개', () => {
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, BUSAN.lat, BUSAN.lng, 10),
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(2);
  });

  it('같은 위치여도 시간 차이 61분 초과 → 클러스터 2개', () => {
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, NEAR_SEOUL.lat, NEAR_SEOUL.lng, 65), // 65분 후
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(2);
  });

  it('날짜 역순 입력 → 날짜순 정렬된 클러스터 반환', () => {
    const photos = [
      makePhoto(2, SEOUL.lat, SEOUL.lng, 10), // 나중 사진 먼저
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),  // 이전 사진 나중
    ];
    const clusters = clusterPhotos(photos);
    expect(clusters).toHaveLength(1);
    // 클러스터 내 사진이 날짜순인지 확인
    const times = clusters[0]!.photos.map((p) => p.datetime.getTime());
    expect(times[0]).toBeLessThan(times[1]!);
  });

  it('3개 장소 사진 → 클러스터 3개', () => {
    const PLACE2 = { lat: 37.5700, lng: 126.9900 }; // 서울에서 ~1km
    const photos = [
      makePhoto(1, SEOUL.lat, SEOUL.lng, 0),
      makePhoto(2, BUSAN.lat, BUSAN.lng, 120),
      makePhoto(3, PLACE2.lat, PLACE2.lng, 240),
    ];
    const clusters = clusterPhotos(photos);
    // 서울과 PLACE2는 ~1km 떨어져 있어 별도 클러스터
    expect(clusters).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run tests/unit/cinemap-cluster.test.ts --reporter=verbose 2>&1
```

Expected: 전체 PASS.

- [ ] **Step 3: 전체 단위 테스트 실행**

```bash
npm test 2>&1
```

Expected: 3개 파일, 전체 PASS.

- [ ] **Step 4: 커밋**

```bash
git add tests/unit/cinemap-cluster.test.ts
git commit -m "test: clusterPhotos GPS 클러스터링 단위 테스트"
```

---

## Task 6: scripts/smoke/smoke-cinemap-video.mjs

**Files:**
- Create: `scripts/smoke/smoke-cinemap-video.mjs`

실제 서버에 CineMap job을 생성하고 완료까지 최대 3분 폴링한다.  
완료 후 Object Storage에서 영상 파일을 실제로 수신해 크기를 검증한다.

- [ ] **Step 1: 스모크 스크립트 생성**

```javascript
// CineMap 영상 생성 완료 스모크 테스트 — job 생성 → 폴링(최대 3분) → 영상 파일 검증
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const MAX_WAIT_MS = 180_000; // 3분
const POLL_INTERVAL_MS = 5_000; // 5초

let pass = 0;
let fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, detail) {
  console.error(`  ❌ ${label}`);
  if (detail) console.error(`     ${String(detail).slice(0, 200)}`);
  fail++;
}

async function post(path, cookieHeader, csrfToken, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

async function get(path, cookieHeader) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})), res };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log('\n🎬 CineMap 영상 생성 스모크 테스트');
console.log(`   대상: ${BASE}\n`);

// 1. 로그인
const loginRes = await fetch(`${BASE}/api/auth/demo-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
if (!loginRes.ok) { ko('demo-login 실패'); process.exit(1); }
const setCookies = loginRes.headers.getSetCookie?.() ?? [];
const csrfToken = setCookies.find((c) => c.startsWith('tg_csrf='))?.match(/tg_csrf=([^;]+)/)?.[1] ?? '';
const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
ok('demo-login 성공');

// 2. 타임라인 조회
const timelinesRes = await get('/api/timelines', cookieHeader);
const timelines = timelinesRes.json;
if (!Array.isArray(timelines) || timelines.length === 0) {
  ko('타임라인 없음 — 테스트 계정에 타임라인이 필요합니다');
  process.exit(1);
}
const timelineId = timelines[0].id;
ok(`타임라인 확인 (id=${timelineId}, title="${timelines[0].title}")`);

// 3. CineMap job 생성 (BGM/TTS 없이 — 비용 최소화)
const jobRes = await post('/api/cinemap/jobs', cookieHeader, csrfToken, {
  timelineId,
  config: { bgmType: 'none', ttsEnabled: false },
});
if (!jobRes.ok) {
  ko('POST /api/cinemap/jobs 실패', JSON.stringify(jobRes.json));
  process.exit(1);
}
const jobId = jobRes.json.job?.id;
if (!jobId) { ko('job.id 없음', JSON.stringify(jobRes.json)); process.exit(1); }
ok(`CineMap job 생성 (id=${jobId})`);

// 4. 완료까지 폴링
console.log('');
const startMs = Date.now();
let finalJob = null;

while (true) {
  const elapsed = Math.round((Date.now() - startMs) / 1000);

  if (Date.now() - startMs > MAX_WAIT_MS) {
    ko(`폴링 타임아웃 (${MAX_WAIT_MS / 1000}초 초과)`);
    process.exit(1);
  }

  const pollRes = await get(`/api/cinemap/jobs/${jobId}`, cookieHeader);
  const job = pollRes.json.job;
  const status = job?.status;
  const stage = job?.stage;

  if (status === 'completed') {
    finalJob = job;
    ok(`영상 생성 완료 (${elapsed}초 소요)`);
    break;
  }

  if (status === 'failed') {
    ko(`영상 생성 실패 (${elapsed}초 경과)`, job?.errorMessage);
    process.exit(1);
  }

  console.log(`  ⏳ 폴링 중... (${elapsed}s, status=${status}, stage=${stage ?? '-'})`);
  await sleep(POLL_INTERVAL_MS);
}

// 5. resultVideoUrl 검증
const videoUrl = finalJob?.resultVideoUrl;
if (!videoUrl) {
  ko('resultVideoUrl 없음');
  process.exit(1);
}
ok(`resultVideoUrl 존재 (${videoUrl})`);

// 6. Object Storage 302 redirect 확인
const fileRes = await fetch(`${BASE}${videoUrl}`, {
  redirect: 'manual',
  headers: { Cookie: cookieHeader },
});
if (fileRes.status !== 302) {
  ko(`Object Storage redirect 실패 (status=${fileRes.status}, expected 302)`);
} else {
  ok('Object Storage 302 redirect 확인');
}

// 7. 실제 파일 수신 + 크기 확인
const redirectUrl = fileRes.headers.get('location');
if (!redirectUrl) {
  ko('redirect Location 헤더 없음');
} else {
  const fileDownload = await fetch(redirectUrl);
  if (!fileDownload.ok) {
    ko(`파일 다운로드 실패 (status=${fileDownload.status})`);
  } else {
    const buf = Buffer.from(await fileDownload.arrayBuffer());
    if (buf.length === 0) {
      ko('파일 크기 0 bytes');
    } else {
      ok(`실제 파일 수신 성공 (${buf.length.toLocaleString()} bytes)`);
    }
  }
}

// 결과
console.log(`\n${'─'.repeat(40)}`);
console.log(`📊 결과: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
  console.error('❌ SMOKE FAIL');
  process.exit(1);
} else {
  console.log('✅ CineMap 영상 생성 스모크 PASS\n');
}
```

- [ ] **Step 2: 스모크 실행**

```bash
node scripts/smoke/smoke-cinemap-video.mjs 2>&1
```

Expected:
```
🎬 CineMap 영상 생성 스모크 테스트
   대상: http://127.0.0.1:5000

  ✅ demo-login 성공
  ✅ 타임라인 확인 (id=13, title="...")
  ✅ CineMap job 생성 (id=N)

  ⏳ 폴링 중... (5s, status=pending, stage=idle)
  ⏳ 폴링 중... (10s, status=processing, stage=storyboard_generating)
  ...
  ✅ 영상 생성 완료 (Xs 소요)
  ✅ resultVideoUrl 존재 (/api/files/xxx.mp4)
  ✅ Object Storage 302 redirect 확인
  ✅ 실제 파일 수신 성공 (N bytes)

📊 결과: 7 PASS / 0 FAIL
✅ CineMap 영상 생성 스모크 PASS
```

타임라인에 EXIF 사진이 없으면 job이 failed 상태가 됨. 이 경우 EXIF 데이터가 있는 사진이 포함된 타임라인이 필요하다는 메시지가 출력됨.

- [ ] **Step 3: 커밋**

```bash
git add scripts/smoke/smoke-cinemap-video.mjs
git commit -m "test: CineMap 영상 생성 완료 폴링 스모크 테스트"
```

---

## Task 7: 전체 검증 + TypeScript check

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 단위 테스트 전체 실행**

```bash
npm test 2>&1
```

Expected: 3개 파일, 전체 PASS (실패 0)

- [ ] **Step 2: TypeScript 오류 없음 확인**

```bash
npm run check 2>&1 | grep "error TS" | grep -v "auth.ts\|contract.tsx\|ProfileSettings\|billingRouter\|portone\|PortOne" | head -10
```

Expected: 출력 없음 (기존 pre-existing 오류 제외 시 0건)

- [ ] **Step 3: 최종 커밋 (필요 시)**

오류 수정이 있었다면:
```bash
git add -A
git commit -m "fix: CineMap 테스트 TypeScript 타입 수정"
```

---

## 자가 검토

**Spec coverage:**
- ✅ Vitest 설치 + 설정 → Task 1
- ✅ wrapText 테스트 → Task 3
- ✅ escapeFilterPath 테스트 → Task 3
- ✅ renderPhotoSegment ffmpeg 인자 → Task 3
- ✅ renderCard ffmpeg 인자 → Task 3
- ✅ overlayBgm ffmpeg 인자 → Task 3
- ✅ resolveAudioOptions → Task 4
- ✅ generateTts → Task 4
- ✅ clusterPhotos → Task 5
- ✅ 스모크 스크립트 (완료 대기, 파일 검증) → Task 6
- ✅ 내부 함수 export → Task 2

**타입 일관성:**
- `PhotoWithExif` 인터페이스는 `cinemap.ts`에서 export됨 — Task 5에서 직접 import ✅
- `CinemapJobConfig` 인터페이스는 `cinemapAudioService.ts`에서 export됨 — Task 4에서 직접 import ✅
- Task 2에서 추가한 export 함수들을 Task 3에서 import ✅
