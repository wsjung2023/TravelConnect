# CineMap 영상 생성 자동 테스트 설계

**날짜:** 2026-06-13  
**상태:** 승인됨

---

## 개요

CineMap 영상 생성 기능의 신뢰성을 자동 테스트로 보장한다.  
단위 테스트(Vitest)로 순수 로직을 빠르게 검증하고, 스모크 스크립트로 실제 API 흐름과 영상 생성 완료를 검증한다.

---

## 테스트 구조

```
tests/unit/
  cinemap-video.test.ts   — cinemapVideoService 순수 함수 + ffmpeg 인자 검증
  cinemap-audio.test.ts   — cinemapAudioService resolveAudioOptions + generateTts
  cinemap-cluster.test.ts — cinemap.ts clusterPhotos

scripts/smoke/
  smoke-cinemap-video.mjs — API 흐름 + 영상 완료까지 폴링
```

---

## 단위 테스트 (Vitest)

### 설정

**패키지 추가:** `vitest` (devDependency)

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

**`package.json` scripts 추가:**
```json
"test": "vitest run",
"test:watch": "vitest"
```

### 모킹 전략

- `vi.mock('child_process')` → `spawn` 모킹으로 ffmpeg 실제 실행 없이 인자 검증
- `vi.spyOn(global, 'fetch')` → OpenAI TTS API 호출 모킹
- `vi.mock('fs/promises')` → 파일 시스템 접근 모킹 (필요한 경우)

---

### tests/unit/cinemap-video.test.ts

**대상:** `server/services/cinemapVideoService.ts`

#### wrapText

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 빈 문자열 | `''` | `' '` |
| 짧은 텍스트 | `'hello'` | `'hello'` |
| 한국어 28자 초과 강제분할 | `'가'.repeat(30)` | 2줄로 분할 |
| 영문 공백 줄바꿈 | `'word1 word2 ...'` (40자) | 다중 줄 |
| 3줄 초과 잘림 | 100자 한국어 | 최대 3줄 |

#### escapeFilterPath

| 케이스 | 입력 | 기대 출력 |
|--------|------|-----------|
| 콜론 이스케이프 | `/path/to:file` | `/path/to\:file` |
| 백슬래시 이스케이프 | `C:\path` | `C:\\path` |
| 따옴표 이스케이프 | `/path/it's` | `/path/it\\'s` |
| 복합 | `/C:\path:to'file` | 모두 이스케이프 |

#### renderPhotoSegment — ffmpeg 인자 검증 (spawn 모킹)

| 케이스 | audioOpts | 검증 항목 |
|--------|-----------|-----------|
| 오디오 없음 | `undefined` | `-c:a` 인자 없음, `anullsrc` 없음 |
| TTS 있음 | `{ ttsPath: '/tmp/tts.aac' }` | `-i /tmp/tts.aac` 포함, `-c:a aac` 포함 |
| TTS 없이 오디오 모드 | `{}` | `anullsrc` 포함, `-c:a aac` 포함 |

#### renderCard — ffmpeg 인자 검증 (spawn 모킹)

| 케이스 | withAudio | 검증 항목 |
|--------|-----------|-----------|
| 비디오만 | `false` (default) | `anullsrc` 없음 |
| 오디오 포함 | `true` | `anullsrc=r=44100:cl=stereo` 포함, `-c:a aac` 포함 |

#### overlayBgm — ffmpeg 인자 검증 (spawn 모킹)

- `amix=inputs=2:duration=first:weights=1 0.15` 포함
- `-stream_loop -1` 포함
- `-c:v copy` 포함

---

### tests/unit/cinemap-audio.test.ts

**대상:** `server/services/cinemapAudioService.ts`

#### resolveAudioOptions

| 케이스 | config | 기대 결과 |
|--------|--------|-----------|
| null | `null` | `{ ttsEnabled: false, ttsVoice: 'alloy' }` (bgmPath 없음) |
| none | `{ bgmType: 'none', ttsEnabled: false }` | bgmPath 없음 |
| preset (파일 존재) | `{ bgmType: 'preset', bgmPresetId: 'calm', ttsEnabled: true, ttsVoice: 'echo' }` | bgmPath에 `bgm_calm.mp3` 포함, ttsVoice: 'echo' |
| preset (파일 없음) | `{ bgmType: 'preset', bgmPresetId: 'nonexistent', ttsEnabled: false }` | bgmPath 없음 (경고만) |
| TTS 기본 voice | `{ bgmType: 'none', ttsEnabled: true }` | ttsVoice: 'alloy' (기본값) |

#### generateTts (fetch 모킹)

| 케이스 | 조건 | 기대 결과 |
|--------|------|-----------|
| 성공 | fetch 200, ArrayBuffer 반환 | `true`, 파일 저장됨 |
| API 실패 | fetch 500 | `false` |
| 빈 텍스트 | `text = '   '` | `false` (API 미호출) |
| API 키 없음 | `OPENAI_API_KEY` 미설정 | `false` |
| 타임아웃 | AbortController signal | `false` |

---

### tests/unit/cinemap-cluster.test.ts

**대상:** `server/ai/cinemap.ts` — `clusterPhotos`

| 케이스 | 입력 | 기대 결과 |
|--------|------|-----------|
| 빈 배열 | `[]` | `[]` |
| 단일 사진 | 사진 1장 | 클러스터 1개, 사진 1장 |
| 동일 좌표 2장 | 같은 GPS | 클러스터 1개, 사진 2장 |
| 500km 이상 떨어진 사진 | 서울/부산 | 클러스터 2개 |
| 날짜순 정렬 | 날짜 역순 입력 | 클러스터 내 사진이 날짜순 |

---

## 스모크 테스트 (완료 대기)

### scripts/smoke/smoke-cinemap-video.mjs

**실행 조건:** 서버 실행 중, EXIF 데이터 있는 사진이 포함된 타임라인 존재

**흐름:**

```
1. demo-login → 쿠키/CSRF 획득
2. GET /api/timelines → 타임라인 목록 조회
3. 타임라인 선택 (첫 번째)
4. POST /api/cinemap/jobs { timelineId, config: { bgmType: 'none', ttsEnabled: false } }
5. 5초 간격 폴링 → GET /api/cinemap/jobs/:id
6. status === 'completed' → 검증 단계
   status === 'failed'   → FAIL (errorMessage 출력)
   180초 초과            → FAIL (타임아웃)
7. 검증:
   - resultVideoUrl 존재 확인
   - GET /api/files/:filename → 302 응답 확인
   - 302 redirect 따라가서 실제 파일 수신 확인
   - 파일 크기 > 0 확인
```

**출력 예시:**
```
🎬 CineMap 영상 생성 스모크 테스트
  ✅ demo-login 성공
  ✅ 타임라인 ID=13 확인
  ✅ CineMap job 생성 (id=3)
  ⏳ 폴링 중... (10s)
  ⏳ 폴링 중... (15s, stage=storyboard_generating)
  ⏳ 폴링 중... (20s, stage=video_rendering)
  ✅ 영상 생성 완료 (25s)
  ✅ resultVideoUrl 존재 (/api/files/xxx.mp4)
  ✅ Object Storage 302 redirect 확인
  ✅ 실제 파일 수신 (1,234,567 bytes)

결과: 7 PASS / 0 FAIL
✅ CineMap 영상 생성 스모크 PASS
```

---

## 구현 참고

`renderPhotoSegment`, `renderCard`, `overlayBgm`은 현재 내부(non-export) 함수다.  
테스트를 위해 `cinemapVideoService.ts`에서 `export` 추가 필요 (또는 `renderSlideshow` 통합 테스트로 대체).  
플랜에서 export 추가 방식으로 결정한다.

---

## 범위 외

- E2E 브라우저 테스트 (Chromium 미지원)
- BGM 믹싱 오디오 품질 검증 (ffprobe 불필요)
- TTS 음성 내용 검증 (실제 OpenAI 호출 없음)
- CI/CD 파이프라인 연동
