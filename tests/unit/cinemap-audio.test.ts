// cinemapAudioService 단위 테스트 — resolveAudioOptions + generateTts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';

// vi.hoisted 사용 — vi.mock 팩토리보다 먼저 초기화되어야 하므로
const { mockAccess } = vi.hoisted(() => ({ mockAccess: vi.fn() }));

// fs.promises.access 모킹 — BGM 파일 존재 여부 제어
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
