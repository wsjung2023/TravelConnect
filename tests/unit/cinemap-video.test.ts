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
    // '/path\\to' 실제 문자열: /path\to (콜론 없음)
    expect(escapeFilterPath('/path\\to')).toBe('/path\\\\to');
  });

  it("작은따옴표 이스케이프", () => {
    expect(escapeFilterPath("/path/it's")).toBe("/path/it\\'s");
  });

  it('복합 이스케이프', () => {
    // '/path\\to:file' 실제 문자열: /path\to:file
    const result = escapeFilterPath('/path\\to:file');
    expect(result).toBe('/path\\\\to\\:file');
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
