# CineMap 대기열·진행 상태 표시 설계

**날짜:** 2026-06-13  
**상태:** 승인됨

---

## 개요

여러 명이 동시에 CineMap 영상을 생성할 때, 사용자가 자신의 요청이 대기 중인지, 처리 중인지, 어느 단계인지를 UI에서 확인할 수 있도록 한다.

현재 `renderCinemapVideo`는 내부 직렬화 락(`withRenderLock`)으로 한 번에 하나씩만 처리된다. 대기 중인 사용자는 그냥 "pending" 상태만 보인다. 이를 개선한다.

---

## 데이터 모델

### `cinemap_jobs` 테이블 — `stage` 컬럼 추가

```
stage: 'idle' | 'storyboard_generating' | 'video_rendering'
기본값: 'idle'
```

상태 흐름:

```
pending   / idle
    ↓
processing / storyboard_generating   ← AI 호출 시작 시
    ↓
processing / video_rendering         ← ffmpeg 렌더링 시작 시
    ↓
completed / idle
```

실패 시: `status: failed`, `stage: idle`로 리셋

---

## 백엔드 변경

### 1. DB 마이그레이션
`cinemap_jobs` 테이블에 `stage varchar(32) NOT NULL DEFAULT 'idle'` 컬럼 추가.  
Drizzle 스키마(`shared/schema.ts`)에 반영.

### 2. `server/routes/ai-features.legacy.ts` 수정
비동기 처리 블록 안에서 stage 업데이트 추가:

```
storage.updateCinemapJob(job.id, { status: 'processing', stage: 'storyboard_generating' })
→ generateStoryboard() 완료
→ storage.updateCinemapJob(job.id, { stage: 'video_rendering' })
→ renderCinemapVideo() 완료
→ storage.updateCinemapJob(job.id, { status: 'completed', stage: 'idle', resultVideoUrl })
```

### 3. `GET /api/cinemap/jobs/:id` 응답에 `queuePosition` 추가
별도 엔드포인트 없이 기존 응답 확장:

```json
{
  "job": {
    "id": 5,
    "status": "pending",
    "stage": "idle",
    "queuePosition": 3
  }
}
```

`queuePosition` 계산:  
`SELECT COUNT(*) FROM cinemap_jobs WHERE status IN ('pending', 'processing') AND id <= :jobId`

---

## 프론트엔드 변경

### 폴링 로직
`status`가 `pending` 또는 `processing`일 때 3초마다 `GET /api/cinemap/jobs/:id` 폴링.  
`completed` 또는 `failed`이면 폴링 중단.

### `CineMapHeroCard` UI

| 상태 | 표시 내용 |
|------|---------|
| `pending` | 스피너 + "대기 중 (N번째)" |
| `processing` / `storyboard_generating` | 스피너 + "AI 스토리보드 생성 중..." |
| `processing` / `video_rendering` | 스피너 + "영상 렌더링 중..." |
| `completed` | ▶ Play CineMap 버튼 |
| `failed` | 오류 메시지 + 재시도 버튼 |

`queuePosition`이 1이면 "처리 준비 중"으로 표시 (실제로는 곧 processing이 될 것).

---

## 변경 파일 목록

1. `shared/schema.ts` — `cinemap_jobs`에 `stage` 컬럼 추가
2. `server/storage.ts` / repository — `createCinemapJob`, `updateCinemapJob` 타입 업데이트
3. `server/routes/ai-features.legacy.ts` — stage 업데이트 + queuePosition 계산
4. `client/src/components/timeline/CineMapHeroCard.tsx` — 새 UI 상태 표시
5. `client/src/pages/timeline.tsx` — 폴링 로직 업데이트

---

## 범위 외 (이번 작업에서 제외)

- WebSocket 실시간 푸시 (폴링으로 충분)
- 예상 대기 시간 계산 (정확도 보장 어려움)
- 관리자용 전체 큐 모니터링 화면
