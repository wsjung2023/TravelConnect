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
    const os = await import('os');
    const tmpPath = path.join(os.default.tmpdir(), `cinemap-bgm-${Date.now()}.mp3`);
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

// TTS mp3를 targetSeconds에 맞게 패딩/트림 → 새 파일 출력 (aac)
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
