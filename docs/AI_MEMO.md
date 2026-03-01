# AI MEMO (중요 결정/발견 기록)

---

## [세션 1] T1~T11 Guardrails 작업 요약

- **날짜**: 2026-03-01
- **작업 범위**: T1 ~ T11 (Guardrails 설치 + routes.ts 모듈화)

---

### T1 — 레포 위생 ✅
- `.gitignore`에 `uploads/`, `attached_assets/` 추가
- `uploads/.gitkeep`, `attached_assets/.gitkeep` 생성

### T2 — 가드레일 문서 ✅
- `GUARDRAILS.md` 생성 (루트)
- `docs/AI_MEMO.md` 생성 (이 파일)
- `replit.md`에 Guardrails 섹션 추가 (매 세션 자동 로드)

### T3/T4 — 커밋 차단 스크립트 ✅
- `scripts/guardrails/check-lines.mjs`: 400줄 초과 시 커밋 차단
- `scripts/guardrails/check-header.mjs`: 신규 파일 헤더 누락 차단
- `.lintstagedrc.json` 업데이트

### T4/T7 — 폴더별 GUIDE.md 6개 ✅
- `server/routes/GUIDE.md`
- `server/services/GUIDE.md`
- `server/middleware/GUIDE.md`
- `client/src/pages/GUIDE.md`
- `client/src/components/GUIDE.md`
- `client/src/features/GUIDE.md`

### T5 — Auth 라우트 1차 교체 ✅
- `server/routes.ts`에서 inline register/login/demo-login 블록 삭제
- `authRouter` import 후 `app.use('/api/auth', authRouter)` 마운트
- 불필요한 import 7개 제거
- 감소: 약 207줄

### T6 — Auth 라우트 완전 통합 ✅
- `/me` 응답에 `serendipityEnabled` 필드 추가
- `/onboarding` timezone 반영, location/bio null 덮어쓰기 버그 수정
- routes.ts에서 /user, /generate-token, /onboarding inline 블록 삭제
- 감소: 약 80줄

### T8 — Smoke Test ✅
- `scripts/smoke/smoke-auth.mjs` 생성
- 실행: `node scripts/smoke/smoke-auth.mjs` → ✅ SMOKE PASS
- package.json 직접 수정 불가(Replit 제한) → 직접 실행으로 대체

### T9 — Notifications 블록 추출 ✅
- `server/routes/notifications.legacy.ts` 생성
- `registerLegacyNotificationRoutes(app, { storage, authenticateToken, insertNotificationSchema })` 함수 호출로 대체
- 감소: 약 66줄

### T11 — Follow 블록 추출 ✅
- `server/routes/follow.legacy.ts` 생성
- `registerLegacyFollowRoutes(app, { storage, authenticateToken })` 함수 호출로 대체
- 감소: 약 116줄

### T10 — Playwright E2E ⚠️ (부분 완료)
- `playwright.config.ts`, `tests/e2e/smoke.spec.ts` 생성
- **Replit 환경에서 Chromium 미설치 → 실제 실행 불가**
- 대체: `node scripts/smoke/smoke-auth.mjs` (T8 smoke)로 CI 커버

---

### routes.ts 줄 수 변화

| 단계 | 줄 수 | 감소 |
|------|-------|------|
| 원본 | 8,857줄 | - |
| T5 완료 후 | 8,650줄 | -207 |
| T6 완료 후 | 8,571줄 | -79 |
| T8/T9 완료 후 | 8,507줄 | -64 (notifications) |
| T11 완료 후 | **8,395줄** | -112 (follow) |
| **총 감소** | | **-462줄** |

---

### 주요 결정/발견

1. `server/routes.ts`는 레거시 거대 파일 — 새 엔드포인트 추가 절대 금지
2. 새 엔드포인트는 반드시 `server/routes/` 하위 모듈에 추가
3. Replit 환경: package.json 직접 수정 불가 → scripts는 `node <path>` 직접 실행
4. Replit 환경: Chromium 미설치 → Playwright 실행 불가 → smoke script 대체
5. T9/T11 추출 패턴: `deps: { storage, authenticateToken, ... }` 주입 방식 표준화

---

### 다음 액션
- routes.ts 계속 분리 (MiniMeet, Contracts 등 대형 블록)
- 각 블록 `*.legacy.ts` → `*.ts`로 리팩토링 (단계적)
- Admin 라우터 분리 검토
