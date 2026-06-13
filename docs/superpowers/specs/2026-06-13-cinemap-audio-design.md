# CineMap 배경음악·TTS 추가 설계

**날짜:** 2026-06-13  
**상태:** 승인됨

---

## 개요

CineMap 영상 생성 시 배경음악(BGM)과 자막 음성(TTS)을 선택적으로 추가할 수 있도록 한다. 사용자는 영상 생성 전 옵션 패널에서 BGM(사전 목록 또는 직접 업로드)과 TTS를 설정한다.

---

## 데이터 모델

### 1. BGM 사전 목록 — `system_config` 테이블

```
category: 'cinemap', key: 'bgm_tracks'
value: JSON 배열
[
  { "id": "calm",      "label": "잔잔한 여행",  "filename": "bgm_calm.mp3"      },
  { "id": "upbeat",   "label": "활기찬 탐험",  "filename": "bgm_upbeat.mp3"    },
  { "id": "cinematic","label": "시네마틱",      "filename": "bgm_cinematic.mp3" }
]
```

실제 BGM 파일은 `server/assets/bgm/` 폴더에 저장.  
퍼블릭 도메인 또는 CC0 라이선스 파일 사용.

### 2. `cinemap_jobs` 테이블 — `config` JSONB 컬럼 추가

```typescript
interface CinemapJobConfig {
  bgmType: 'preset' | 'upload' | 'none';
  bgmPresetId?: string;       // bgmType === 'preset'일 때
  bgmUploadUrl?: string;      // bgmType === 'upload'일 때 (/api/files/xxx.mp3)
  ttsEnabled: boolean;
  ttsVoice?: string;          // 기본값: 'alloy'
}
```

기본값 (config 없을 때): `{ bgmType: 'none', ttsEnabled: false }`

---

## 백엔드 변경

### 1. DB 마이그레이션
`cinemap_jobs` 테이블에 `config jsonb` 컬럼 추가 (`npm run db:push`).

### 2. BGM 파일 준비
`server/assets/bgm/` 폴더에 3개 BGM 파일 배치.  
`system_config`에 시드 데이터 추가 (`scripts/seed-cinemap-bgm.mjs`).

### 3. `server/services/cinemapVideoService.ts` 수정

#### AudioOptions 인터페이스 추가
```typescript
export interface AudioOptions {
  bgmPath?: string;       // 로컬 파일 경로 (resolved)
  ttsEnabled: boolean;
  ttsVoice: string;
}
```

#### TTS 생성 함수 추가
- `generateTtsForCaption(text, voice, outPath)`: OpenAI TTS API 호출
- 각 stop의 caption → mp3 파일 생성
- 타임아웃: 15초/캡션

#### 세그먼트 렌더링 수정
- TTS 활성 시: 세그먼트에 `-i ttsAudio -filter_complex amix` 추가
- TTS 볼륨: 1.0, 없을 경우 무음

#### BGM 오버레이 추가
- `concatSegments` 후 BGM 믹싱 단계 추가
- BGM 볼륨: 0.15 (TTS 대비 낮게)
- BGM 루프: concat 영상 길이에 맞춰 잘라냄 (`-t duration`)

#### `renderCinemapVideo` 시그니처 변경
```typescript
export function renderCinemapVideo(
  storyboard: Storyboard,
  audioOptions?: AudioOptions
): Promise<Buffer>
```

### 4. `server/routes/ai-features.legacy.ts` 수정
- `POST /api/cinemap/jobs`: `config` 필드를 req.body에서 받아 저장
- 비동기 처리 블록: job.config에서 audioOptions 구성 → renderCinemapVideo에 전달
- BGM upload URL인 경우 `resolvePhotoUrl` 패턴으로 서명 URL 획득 후 다운로드

### 5. `GET /api/cinemap/bgm-tracks` 엔드포인트 추가
- `system_config`에서 `cinemap/bgm_tracks` 조회
- 반환: `[{ id, label }]` (filename은 서버 내부용이므로 노출 안 함)

---

## 프론트엔드 변경

### 1. `CineMapHeroCard.tsx` 확장

**오디오 옵션 패널** (접고 펼치는 `<details>` 또는 상태 토글):

```
▼ 오디오 설정 (선택사항)
  BGM:  ● 잔잔한 여행
        ○ 활기찬 탐험
        ○ 시네마틱
        ○ 내 파일 업로드 [파일 선택 버튼]
        ○ 없음
  TTS:  [켜기/끄기 Switch]
```

**새 Props:**
```typescript
bgmTracks: { id: string; label: string }[];
onAudioConfigChange: (config: CinemapJobConfig) => void;
```

**내부 state:**
```typescript
const [audioConfig, setAudioConfig] = useState<CinemapJobConfig>({
  bgmType: 'none',
  ttsEnabled: false,
  ttsVoice: 'alloy',
});
```

### 2. `timeline.tsx` 변경
- BGM 목록 쿼리 추가: `GET /api/cinemap/bgm-tracks`
- 사용자 BGM 업로드: 기존 `POST /api/upload` 활용
- Generate 클릭 시 `audioConfig` 포함해서 `POST /api/cinemap/jobs`

---

## 변경 파일 목록

1. `shared/schema.ts` — `cinemap_jobs`에 `config` 컬럼 추가
2. `server/assets/bgm/` — BGM 파일 3개 추가
3. `scripts/seed-cinemap-bgm.mjs` — BGM system_config 시드 스크립트
4. `server/services/cinemapVideoService.ts` — AudioOptions, TTS, BGM 믹싱 추가
5. `server/routes/ai-features.legacy.ts` — config 처리 + bgm-tracks 엔드포인트
6. `client/src/components/timeline/CineMapHeroCard.tsx` — 오디오 옵션 패널
7. `client/src/pages/timeline.tsx` — BGM 목록 쿼리 + audioConfig 전달

---

## 범위 외 (이번 작업에서 제외)

- TTS 음성 종류 선택 UI (alloy 고정)
- BGM 볼륨 조절 슬라이더
- 영상 생성 후 오디오 변경(재렌더링)
- i18n 번역 (UI 텍스트는 한국어 하드코딩 후 추후 i18n 추가)
