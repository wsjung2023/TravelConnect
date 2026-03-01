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
| T11 완료 후 | 8,395줄 | -112 (follow) |
| 8개 블록 추출 후 | 6,579줄 | -1,816 (MiniMeet/TripLegal/Channel/HostReviews/Shopping/RequestsTemplates/SlotsBookings/Translation) |
| **7개 블록 추가 추출 후** | **2,575줄** | **-4,004** (AI/POI/Billing/Contract/Webhook/Dispute/Analytics) |
| **총 감소** | | **-6,282줄 (71% 감소)** |

---

### 세션 2 — 대규모 블록 추출 (2026-03-01)

**추출된 legacy 파일 목록 (17개):**
1. `notifications.legacy.ts` (66줄)
2. `follow.legacy.ts` (116줄)
3. `minimeet.legacy.ts`
4. `trip-legal.legacy.ts`
5. `channel.legacy.ts`
6. `host-reviews.legacy.ts`
7. `shopping.legacy.ts`
8. `requests-templates.legacy.ts`
9. `slots-bookings.legacy.ts`
10. `translation.legacy.ts`
11. `ai-features.legacy.ts` (1,070줄 — AI Concierge/Mini Concierge/CineMap)
12. `poi-smartfeed.legacy.ts` (539줄 — POI + Smart Feed)
13. `billing.legacy.ts` (671줄 — Billing Plans/구독/Trip Pass)
14. `contract.legacy.ts` (701줄 — 에스크로/계약)
15. `webhook-settlement.legacy.ts` (351줄 — PortOne 웹훅/정산)
16. `dispute.legacy.ts` (327줄 — Dispute Management)
17. `analytics-search.legacy.ts` (359줄 — Analytics/Search)

**수정 이슈 해결 패턴:**
- import 삽입 위치 버그: 멀티라인 import 블록 내부 삽입 → `} from '...'` 다음 줄로 이동
- 동적 import 경로: `'./services/...'` → `'../services/...'` (legacy 파일은 routes/ 하위)
- 누락 import: `Request`, `Response`, `AuthRequest` 타입을 각 legacy 파일에 추가
- `express.text()` 사용: `import express from 'express'` 추가 필요

---

### 주요 결정/발견

1. `server/routes.ts`는 레거시 거대 파일 — 새 엔드포인트 추가 절대 금지
2. 새 엔드포인트는 반드시 `server/routes/` 하위 모듈에 추가
3. Replit 환경: package.json 직접 수정 불가 → scripts는 `node <path>` 직접 실행
4. Replit 환경: Chromium 미설치 → Playwright 실행 불가 → smoke script 대체
5. T9/T11 추출 패턴: `deps: { storage, authenticateToken, ... }` 주입 방식 표준화
6. `AuthRequest` 타입 위치: `server/auth.ts:60`에서 export — legacy 파일은 `import type { AuthRequest } from '../auth'`
7. Node.js 스크립트 블록 추출: bottom-to-top으로 splice 처리해야 라인 번호 shift 방지

---

---

### 세션 3 — SEO 검증 + html lang 버그 수정 (2026-03-01)

#### SEO 문서 대조 검증 결과

두 문서(`tourgether_SEO_public_pack.md`, `tourgether_SEO_upgrade.md`) 대비 구현 현황:

| 항목 | 상태 |
|------|------|
| 6개 원본 SEO 랜딩 페이지 | ✅ 전체 구현 + App.tsx 라우트 등록 |
| 추가 4개 랜딩 페이지 (become-guide 등) | ✅ 전체 구현 |
| SeoHead 컴포넌트 (canonical/OG/Twitter Card) | ✅ 10개 전 페이지 적용 |
| FAQ JSON-LD (FAQPage + mainEntity) | ✅ 전 페이지 구현 |
| Title/Meta description — 문서 스펙 일치 | ✅ 정확히 일치 (예: `여행 일정표 만들기 \| 투어게더`) |
| sitemap.xml | ✅ 10개 랜딩 + legal, lastmod/priority 포함 |
| robots.txt | ✅ 사이트맵 링크, 파라미터 맵 상태 차단 |
| index.html meta 업데이트 | ✅ TravelConnect → 투어게더/Tourgether 완전 교체 |
| /features, /pricing, /about | ⏳ 향후 구현 (sitemap 주석에도 명시) |
| /destinations/{city} | ⏳ 장기 로드맵 |

#### `<html lang>` 동적 변경 버그 수정 ✅

- **문제**: 언어 전환 시 `<html lang="">` 속성이 바뀌지 않아 검색엔진이 다국어를 잘못 인식
- **원인**: `i18n.changeLanguage()`를 호출해도 `document.documentElement.lang` 업데이트 코드가 없었음
- **수정**: `client/src/lib/i18n.ts` 하단에 `i18n.on('languageChanged', syncHtmlLang)` 이벤트 리스너 추가
- **효과**: 초기 로드 시 + 언어 변경 시 모두 `<html lang="ko">` 등 자동 반영
- **파일**: `client/src/lib/i18n.ts`

---

### T011 — 완료 확인 (세션 3)

| Task | 상태 |
|------|------|
| T1 레포 위생 | ✅ |
| T2 가드레일 문서 | ✅ |
| T3 커밋 차단 스크립트 | ✅ |
| T4 폴더별 GUIDE.md 6개 | ✅ |
| T5 Auth 1차 교체 | ✅ |
| T6 Auth 완전 통합 | ✅ |
| T7 Smoke Test | ✅ |
| T8 Notifications 추출 | ✅ |
| T9 Follow 추출 | ✅ |
| T10 Playwright (Replit 환경 제한으로 smoke 대체) | ⚠️ |
| T11 AI_MEMO 최종 업데이트 | ✅ |

---

### 다음 액션
- 각 `*.legacy.ts` → 정식 `*.ts`로 리팩토링 (타입 정비, 의존성 명시화)
- Admin 라우터 분리 검토
- routes.ts 2,575줄 중 남은 인라인 블록 추가 분리 가능 여부 검토
- /features, /pricing, /about 페이지 구현 (SEO 문서 스펙 참고)

---

### 세션 4 — T1~T11 전체 검증 완료 (2026-03-01)

#### 검증 결과 요약

| 항목 | 결과 |
|------|------|
| `node scripts/smoke/smoke-auth.mjs` | ✅ SMOKE PASS |
| `node scripts/guardrails/check-lines.mjs server/routes.ts` | ✅ 2,577줄 감지·차단 (정상) |
| `node scripts/guardrails/check-header.mjs` | ✅ 동작 확인 |
| WebSocket 다중 사용자 DM 테스트 (3명) | ✅ 실시간 전달 + DB 저장 모두 정상 |
| `/api/auth/me` serendipityEnabled 필드 | ✅ 응답 포함 확인 |
| 전체 파일 구조 체크 (GUIDE.md 6개, .gitkeep, GUARDRAILS.md 등) | ✅ 모두 존재 |

#### 발견 사항 — WebSocket DM 인증 타입
- 서버는 `type: 'auth'` 를 기대 (프론트엔드도 동일)
- 이전 테스트 스크립트는 `type: 'authenticate'` 사용 → 오류 원인이었음
- WS 메시지 타입: auth → `auth_success`, DM → `type: 'chat_message'` + `recipientId` 필수
- 수신 이벤트: 발신자는 `message_sent`, 수신자는 `chat_message`

#### routes.ts 현재 상태
- **2,576줄** (원본 8,857줄 대비 **71% 감소**)
- 가드레일 스크립트가 400줄 초과를 정상 감지·차단 중
- `server/routes/auth.ts`: 389줄 (250줄 초과 경고 발생 → 분리 검토 대상)

---

### 세션 5 — 채팅 페이지 401 버그 수정 (2026-03-01)

#### 문제
채팅 페이지 접속 시 `/api/conversations`, `/api/channels` 등 GET 엔드포인트가 401 반환

#### 원인
- `server/routes.ts`: `GET /api/conversations` → `authenticateToken` (엄격 JWT 전용) 사용
- `server/routes/channel.legacy.ts`: `GET /api/channels`, `GET /api/channels/:id`, `GET /api/channels/:id/messages`, `GET /api/messages/:id/thread` → `authenticateToken` 사용
- `server/routes.ts`: `GET /api/conversations/:id/messages` → `authenticateToken` 사용
- 개발 모드 폴백 없는 `authenticateToken`은 토큰 없는 요청에 즉시 401 반환

#### 수정
| 파일 | 변경 내용 |
|------|-----------|
| `server/routes.ts:2009` | `GET /api/conversations` → `authenticateHybrid` |
| `server/routes.ts:2022` | `GET /api/conversations/:id/messages` → `authenticateHybrid` |
| `server/routes/channel.legacy.ts` | `GET /api/channels`, `GET /api/channels/:id`, `GET /api/channels/:id/messages`, `GET /api/messages/:id/thread` → `authenticateHybrid` (deps에 `authenticateHybrid?` 추가) |
| `server/routes.ts:2553` | `registerLegacyChannelRoutes()` 호출에 `authenticateHybrid` 추가 전달 |

#### 원칙
- **읽기(GET)** → `authenticateHybrid` (개발 모드 폴백 + 세션/JWT 모두 지원)
- **쓰기(POST/DELETE)** → `authenticateToken` 유지 (보안)

#### 검증 결과
```
GET /api/conversations:          200 ✅
GET /api/channels:               200 ✅
GET /api/conversations/5/messages: 200 ✅
```

#### 참고: chatRouter 미마운트
- `server/routes/chat.ts`와 `server/routes/index.ts`의 `chatRouter`/`mountRouters`는 `registerRoutes()`에서 호출되지 않음
- 실제 활성 라우트: `server/routes.ts` 인라인 + `channel.legacy.ts`
- `server/routes/chat.ts`의 GET 수정도 병행했으나 실제 동작에는 미영향 (미마운트)

---

### 세션 6 — T1~T11 최종 완료 검증 (2026-03-01)

#### T1~T11 최종 상태 점검

| 태스크 | 내용 | 상태 |
|--------|------|------|
| T1 | `.gitignore` + `.gitkeep` | ✅ |
| T2 | `GUARDRAILS.md` + `docs/AI_MEMO.md` | ✅ |
| T3 | `check-lines.mjs` + `check-header.mjs` + `.lintstagedrc.json` | ✅ |
| T4 | 폴더별 `GUIDE.md` 6개 | ✅ |
| T5 | Auth 라우트 1차 교체 (register/login/demo-login) | ✅ |
| T6 | Auth 라우트 완전 통합 (/me, /user, /onboarding) | ✅ |
| T7 | `scripts/smoke/smoke-auth.mjs` 생성 | ✅ |
| T8 | Notifications 블록 추출 (`notifications.legacy.ts`) | ✅ |
| T9 | Follow 블록 추출 (`follow.legacy.ts`) | ✅ |
| T10 | Playwright config 생성, Chromium 미설치 → smoke 대체 | ⚠️ (config만, 실행 불가) |
| T11 | AI_MEMO.md 최종 업데이트 | ✅ |

#### smoke:auth 최종 검증
```
🧪 Smoke auth against http://127.0.0.1:5000
✅ SMOKE PASS: demo-login -> me works
```

#### package.json 스크립트 추가 불가
- Replit 환경 제약으로 `package.json` 직접 수정 불가
- `smoke:auth` 실행: `node scripts/smoke/smoke-auth.mjs` 로 직접 실행
- `test:e2e` 실행: playwright 미설치 상태 (Chromium 없음) → smoke로 대체

#### routes.ts 최종 상태
- **현재 2,576줄** (원본 8,857줄 대비 **71% 감소**)
- 17개 legacy 파일로 분리 완료
- 가드레일: `.lintstagedrc.json`에 `check-lines.mjs` + `check-header.mjs` 연결
