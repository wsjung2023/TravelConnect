// CineMap 영상 렌더링 서비스 — 스토리보드의 사진과 캡션을 ffmpeg 슬라이드쇼 mp4로 합성한다.
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getSignedReadUrl } from './objectStorageService';
import type { Storyboard } from '../ai/cinemap';
import { generateTts, padAudio, type AudioOptions } from './cinemapAudioService';

const FONT_PATH = path.resolve(process.cwd(), 'server/assets/fonts/NotoSansCJKkr-Regular.otf');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const SECONDS_PER_PHOTO = 3.5;
const CARD_SECONDS = 3;
const MAX_PHOTOS = 15;
const FADE = 0.4;
const FFMPEG_TIMEOUT_MS = 90_000; // ffmpeg 단일 호출 워치독 (멈춤 방지)
const DOWNLOAD_TIMEOUT_MS = 20_000; // 사진 다운로드 타임아웃
const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 사진 1장 최대 크기

export interface SlideItem {
  imagePath: string;
  caption: string;
}

export interface SlideshowInput {
  title: string;
  intro: string;
  outro: string;
  items: SlideItem[];
}

// ffmpeg 자식 프로세스 실행 (stderr 수집, 타임아웃 워치독, 비정상 종료 시 reject)
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGKILL');
      reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
    }, FFMPEG_TIMEOUT_MS);
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

// ffmpeg 필터에서 파일 경로 이스케이프 (콜론/백슬래시/따옴표)
export function escapeFilterPath(p: string): string {
  return p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

// 긴 캡션을 대략 maxChars 기준으로 줄바꿈 (CJK는 글자 기준)
export function wrapText(text: string, maxChars = 28): string {
  const clean = (text || '').replace(/\r?\n/g, ' ').trim();
  if (!clean) return ' ';
  const words = clean.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line.length === 0) {
      line = w;
    } else if ((line + ' ' + w).length <= maxChars) {
      line += ' ' + w;
    } else {
      lines.push(line);
      line = w;
    }
    // 공백 없는 긴 CJK 토큰 강제 분할
    while (line.length > maxChars) {
      lines.push(line.slice(0, maxChars));
      line = line.slice(maxChars);
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3).join('\n');
}

// drawtext용 텍스트 파일 작성 (콘텐츠 이스케이프 불필요)
async function writeTextFile(dir: string, name: string, text: string): Promise<string> {
  const fp = path.join(dir, name);
  await fs.writeFile(fp, text, 'utf-8');
  return fp;
}

// 한 장의 사진 → 줌/페이드/자막이 적용된 세그먼트 mp4 생성
export async function renderPhotoSegment(
  imagePath: string,
  captionFile: string,
  outPath: string,
  audioOpts?: { ttsPath?: string },
): Promise<void> {
  const fontEsc = escapeFilterPath(FONT_PATH);
  const capEsc = escapeFilterPath(captionFile);
  // zoompan(켄번스)은 슈퍼샘플 비용이 커 컨테이너 자원을 압박하므로 정적 프레임 + 페이드로 처리한다.
  const vf = [
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${WIDTH}:${HEIGHT}`,
    `fade=t=in:st=0:d=${FADE}`,
    `fade=t=out:st=${(SECONDS_PER_PHOTO - FADE).toFixed(2)}:d=${FADE}`,
    `drawtext=fontfile='${fontEsc}':textfile='${capEsc}':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.5:boxborderw=18:x=(w-text_w)/2:y=h-text_h-60:line_spacing=10`,
  ].join(',');

  if (audioOpts !== undefined) {
    const audioInput = audioOpts.ttsPath ?? null;
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
    await runFfmpeg([
      '-y', '-hide_banner', '-loglevel', 'error',
      '-loop', '1', '-t', String(SECONDS_PER_PHOTO), '-i', imagePath,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      outPath,
    ]);
  }
}

// 타이틀/엔딩 카드 (단색 배경 + 큰 제목 + 보조 문구)
export async function renderCard(
  dir: string,
  idx: number,
  heading: string,
  body: string,
  outPath: string,
  withAudio = false,
): Promise<void> {
  const headFile = await writeTextFile(dir, `card_h_${idx}.txt`, wrapText(heading, 22));
  const bodyFile = await writeTextFile(dir, `card_b_${idx}.txt`, wrapText(body, 34));
  const fontEsc = escapeFilterPath(FONT_PATH);
  const vf = [
    `drawtext=fontfile='${fontEsc}':textfile='${escapeFilterPath(headFile)}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2-50:line_spacing=12`,
    `drawtext=fontfile='${fontEsc}':textfile='${escapeFilterPath(bodyFile)}':fontcolor=white@0.85:fontsize=32:x=(w-text_w)/2:y=(h/2)+40:line_spacing=10`,
    `fade=t=in:st=0:d=${FADE}`,
    `fade=t=out:st=${(CARD_SECONDS - FADE).toFixed(2)}:d=${FADE}`,
  ].join(',');

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
}

// 세그먼트들을 concat demuxer로 이어붙임 (동일 코덱이라 stream copy)
async function concatSegments(dir: string, segs: string[], outPath: string): Promise<void> {
  const listPath = path.join(dir, 'concat.txt');
  const listBody = segs.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, listBody, 'utf-8');
  await runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', listPath,
    '-c', 'copy', '-movflags', '+faststart',
    outPath,
  ]);
}

// 최종 영상에 BGM을 낮은 볼륨으로 오버레이
export async function overlayBgm(videoPath: string, bgmPath: string, outPath: string): Promise<void> {
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

// 로컬 이미지 경로 기반 슬라이드쇼 합성 (테스트 가능한 코어)
export async function renderSlideshow(input: SlideshowInput, outPath: string, audio?: AudioOptions): Promise<void> {
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

      const audioOpts = withAudio ? (ttsPath ? { ttsPath } : {}) : undefined;
      await renderPhotoSegment(item.imagePath, capFile, segPath, audioOpts);
      segments.push(segPath);
    }

    // 엔딩 카드
    if (input.outro && input.outro.trim()) {
      const outroCard = path.join(workDir, 'seg_outro.mp4');
      await renderCard(workDir, 1, 'Fin', input.outro, outroCard, withAudio);
      segments.push(outroCard);
    }

    const concatOut = audio?.bgmPath ? path.join(workDir, 'concat.mp4') : outPath;
    await concatSegments(workDir, segments, concatOut);

    if (audio?.bgmPath) {
      await overlayBgm(concatOut, audio.bgmPath, outPath);
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// 사진 url을 다운로드 가능한 서명 URL로 해석.
// SSRF 방지: 신뢰된 내부 경로(/api/files/{name})만 허용하고, 외부 임의 URL은 거부한다.
// 실제로 다운로드되는 URL은 우리가 Object Storage에서 생성한 서명 URL뿐이다.
async function resolvePhotoUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const m = url.match(/\/api\/files\/([^/?#]+)/);
  if (m && m[1]) {
    try {
      return await getSignedReadUrl(decodeURIComponent(m[1]));
    } catch {
      return null;
    }
  }
  return null;
}

// 서명 URL에서 사진 다운로드 (타임아웃 + 크기 상한)
async function downloadTo(url: string, dest: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return false;
    const len = Number(res.headers.get('content-length') || '0');
    if (len > MAX_IMAGE_BYTES) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return false;
    await fs.writeFile(dest, buf);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// 렌더링 직렬화 락 — 동시 ffmpeg 실행으로 인한 CPU/메모리 급증을 방지한다.
let renderChain: Promise<unknown> = Promise.resolve();
function withRenderLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = renderChain.then(fn, fn);
  renderChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// 스토리보드 → 영상 Buffer. 각 stop의 베스트샷(없으면 첫 사진) 1장 + 캡션 사용.
// 동시 실행은 직렬화되어 한 번에 하나의 렌더만 수행된다.
export function renderCinemapVideo(storyboard: Storyboard, audio?: AudioOptions): Promise<Buffer> {
  return withRenderLock(() => renderCinemapVideoInner(storyboard, audio));
}

async function renderCinemapVideoInner(storyboard: Storyboard, audio?: AudioOptions): Promise<Buffer> {
  const dlDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cinemap-dl-'));
  const outPath = path.join(dlDir, `${randomUUID()}.mp4`);
  try {
    const items: SlideItem[] = [];
    for (const stop of storyboard.stops || []) {
      const photo = stop.photos?.find((p) => p.isBestShot) || stop.photos?.[0];
      if (!photo?.url) continue;
      const resolved = await resolvePhotoUrl(photo.url);
      if (!resolved) continue;
      const imgPath = path.join(dlDir, `img_${items.length}.jpg`);
      const ok = await downloadTo(resolved, imgPath);
      if (!ok) continue;
      items.push({ imagePath: imgPath, caption: stop.caption || stop.title || '' });
      if (items.length >= MAX_PHOTOS) break;
    }

    if (items.length === 0) {
      throw new Error('No usable photos could be downloaded for video rendering');
    }

    await renderSlideshow(
      {
        title: storyboard.title || 'CineMap',
        intro: storyboard.intro || storyboard.summary || '',
        outro: storyboard.outro || '',
        items,
      },
      outPath,
      audio,
    );

    return await fs.readFile(outPath);
  } finally {
    await fs.rm(dlDir, { recursive: true, force: true }).catch(() => {});
  }
}
