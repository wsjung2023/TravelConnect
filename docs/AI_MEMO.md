# AI MEMO (중요 결정/발견 기록)

---

## [세션 N] storage.ts 도메인 분리 완료 (2026-03-08)

### 작업 결과
- **server/storage.ts** 5,091줄 → **690줄** thin composer로 교체 완료
- **11개 도메인 repository 파일** 생성 (`server/repositories/` 하위):
  - `userRepository.ts` (207줄) — 유저/팔로우
  - `notificationRepository.ts` (42줄) — 알림
  - `socialRepository.ts` (407줄) — 포스트/댓글/좋아요
  - `chatRepository.ts` (378줄) — 대화/메시지/채널
  - `contentRepository.ts` (505줄) — 타임라인/트립/리뷰/미니밋/CineMap
  - `bookingRepository.ts` (649줄) — 예약/체험/슬롯
  - `feedRepository.ts` (733줄) — 해시태그/스마트피드/저장
  - `aiRepository.ts` (502줄) — AI Concierge/Mini/Serendipity/프롬프트
  - `billingRepository.ts` (443줄) — 빌링/구독/에스크로/결제
  - `commerceRepository.ts` (521줄) — 구매대행/도움요청/서비스패키지
  - `adminRepository.ts` (398줄) — 시스템설정/POI/번역/SystemConfig/Analytics

### 핵심 결정
- **thin composer 방식**: `export const storage: IStorage = { ...userRepo, ...notificationRepo, ... }`
- **기존 callers 무수정**: `storage.method()` 호출 방식 100% 유지
- **중복 해결**: feedRepository가 Post/Timeline/Trip 함수 중복 포함 → thin composer에서 socialRepo/contentRepo 먼저 spread하여 덮어씌움 (spread 순서로 충돌 처리)
- **import 오류 수정**: aiRepository.ts가 drizzle-orm 함수(`and`, `eq` 등)를 `@shared/schema`에서 잘못 import → `drizzle-orm`으로 분리 수정
- **서버 정상 기동**: /api/posts, /api/experiences 200 응답 확인

### 주의사항
- feedRepository.ts에 socialRepository/contentRepository 함수가 중복 존재 (subagent가 추가)
- 실제로는 spread 순서(socialRepo가 먼저)로 인해 socialRepository 구현체가 우선 적용됨
- 향후 feedRepository 리팩토링 시 중복 함수 제거 권장

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

---

## P2P 거래 흐름 전체 테스트 (2026-03-01)

### 테스트 스크립트
`scripts/smoke/smoke-transaction.mjs`

### 시나리오
경복궁 투어 $90 / Min-ji Kim(여행자) ↔ Guide Park(가이드), 계약금 $27(30%) + 잔금 $63(70%)

### 결과: ✅ 20/20 PASS

| 단계 | 내용 | 방법 | 결과 |
|------|------|------|------|
| 0 | 초기 상태 확인 | DB 조회 | ✅ pending |
| 1 | 토큰 발급 | API `POST /api/auth/dev-token` | ✅ |
| 2 | 계약 조회 | API `GET /api/contracts/13` | ✅ 200 |
| 3 | 계약금 결제 시작 | API `POST /api/contracts/13/initiate-payment` | ✅ paymentId 발급 |
| 4 | 계약금 결제 완료 | DB 직접 (PortOne 웹훅 역할) | ✅ in_progress |
| 5 | 잔금 결제 | API + DB 직접 | ✅ 총 $90 funded |
| 6 | 서비스 완료 | API `POST /api/contracts/13/complete` | ✅ completed |
| 7 | 에스크로 정산 | DB 직접 (API 버그) | ✅ $80 지급 |
| 8 | 최종 상태 확인 | DB 조회 | ✅ released |

### 발견된 버그
**`escrowService.releaseEscrow()` payouts INSERT 컬럼 불일치**
- 서비스 코드: `amount`, `platformFee`, `paymentMethod`, `contractId` 컬럼으로 INSERT 시도
- 실제 DB: `gross_amount`, `total_fees`, `net_amount`, `period_start`, `period_end`, `transaction_count` 구조 (NOT NULL 많음)
- 영향: `POST /api/contracts/:id/release` 항상 500 실패
- 위치: `server/services/escrowService.ts` `releaseEscrow()` 함수 약 803줄 부근
- 해결: `escrowService.releaseEscrow()`의 payouts INSERT를 실제 DB 컬럼에 맞게 수정 필요

### 실제 API 호출 vs DB 직접 처리 구분
- **실제 API**: initiate-payment(계약금/잔금), GET 계약 조회, POST complete
- **DB 직접**: 결제 완료(PortOne 없음), 에스크로 정산(API 버그)

---

## [세션 3] Object Storage 마이그레이션 (2026-03-08)

### 배경
- 기존: multer.diskStorage → `uploads/` 로컬 디스크 저장
- 문제: 재배포 시 운영 유저 업로드 파일 유실 위험
- 해결: Replit Object Storage(GCS) 마이그레이션

### 변경 내용
| 파일 | 변경 내용 |
|------|-----------|
| `server/routes.ts` | multer.diskStorage → memoryStorage, /api/files/:filename → GCS 서명 URL redirect, /uploads/:fileName 제거, fs import 제거 |
| `server/services/objectStorageService.ts` | 신규: uploadFile, getSignedReadUrl, fileExists, deleteFile |
| `server/replit_integrations/object_storage/` | Object Storage blueprint 파일 4개 (objectStorage.ts, objectAcl.ts, routes.ts, index.ts) |
| `scripts/migrate-uploads.mjs` | 신규: 로컬 uploads/ → Object Storage 일괄 마이그레이션 |
| `scripts/smoke/smoke-upload.mjs` | 신규: Object Storage 동작 검증 smoke test |

### 마이그레이션 결과
- **업로드 파일**: 108개 → Object Storage 업로드 성공 ✅
- **실패**: 0개
- **uploads/ 폴더**: .gitkeep만 남기고 전체 삭제 ✅

### smoke test 결과 (4/4 PASS)
1. ✅ 기존 파일 /api/files/:filename → 302 redirect → storage.googleapis.com
2. ✅ redirect 따라가서 실제 파일 수신 (200 OK, image/jpeg)
3. ✅ 신규 업로드 → Object Storage 저장 성공
4. ✅ 신규 업로드 파일 /api/files/:filename → GCS redirect 확인

### 업로드 흐름 (신규)
1. 클라이언트 → `POST /api/upload` (multipart/form-data)
2. multer memoryStorage → file.buffer 메모리에 보관
3. `objectStorageService.uploadFile(filename, buffer, mimetype)` → GCS `public/uploads/{filename}`
4. 응답: `{ url: '/api/files/{filename}' }` (프론트엔드 변경 불필요)
5. 파일 접근: `GET /api/files/{filename}` → `getSignedReadUrl(filename)` → `302 → GCS 서명 URL`

### DB URL 형태
- 기존: `/api/files/{uuid}.jpg` (로컬 디스크 참조)
- 현재: `/api/files/{uuid}.jpg` (동일 — 엔드포인트가 Object Storage redirect 처리)
- 변경 불필요: DB 마이그레이션 없이 투명하게 Object Storage로 전환

### 환경 변수
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`: replit-objstore-484c828a-735c-4b18-90ff-46167029bbf3
- `PUBLIC_OBJECT_SEARCH_PATHS`: /{bucket}/public 형태
- `PRIVATE_OBJECT_DIR`: /{bucket}/.private 형태

---

## [세션 6] syncTranslations 리팩토링 계획

- **날짜**: 2026-03-08
- **상태**: 계획 수립 완료, 구현 대기 (사용자 승인 필요)

---

### 배경 / 원인 분석

**운영 DB (6,363행) vs 시드 파일 (5,563개) 불일치 이유:**

| 네임스페이스 | 시드파일 | 개발DB | 운영DB | 비고 |
|---|---|---|---|---|
| billing | 456 | 456 | 456 | ✅ 동일 |
| common | 188 | 188 | 188 | ✅ 동일 |
| interests | 없음 | 72 | 72 | ⚠️ 시드 생성 후 추가 |
| notification | 없음 | 12 | 12 | ⚠️ 시드 생성 후 추가 |
| seo | 없음 | 338 | 338 | ⚠️ 시드 생성 후 추가 |
| toast | 114 | 114 | 114 | ✅ 동일 |
| ui | 4,733 | 5,117 | 5,111 | ⚠️ 시드 이후 앱/배포로 누적 |
| validation | 72 | 72 | 72 | ✅ 동일 |

- 개발 vs 운영 실질 차이: **`post.photos` 1개 키 (6개 행)** — 오늘 개발 DB에만 직접 INSERT
- 시드 파일은 과거 특정 시점 스냅샷이며 이후 계속 이탈됨

**현재 `syncTranslations.ts`의 버그:**
```
COUNT(DB행) >= COUNT(시드항목) → 즉시 return
```
→ DB가 시드보다 많으면 영원히 skip, 특정 키가 누락돼도 감지 불가

---

### 현재 파일 구조 문제점

| 파일 | 줄 수 | 문제 |
|---|---|---|
| `server/syncTranslations.ts` | 93줄 | 위치 부적절 — seeds/ 아래로 이동해야 함 |
| `server/seeds/systemConfigSeed.ts` | 1,528줄 | 데이터(106개 항목) + 로직 혼재, 분리 필요 |
| `server/index.ts` | 405줄 | 스케줄러 로직(22~154줄) 내장 — 별도 모듈로 분리 필요 |

---

### 변경 계획 (3개 작업)

#### 작업 A — `syncTranslations` 로직 수정 + 파일 이동
- **현재**: `server/syncTranslations.ts`
- **이후**: `server/seeds/syncTranslations.ts`
- **핵심 변경**: COUNT 비교 제거 → `INSERT ON CONFLICT DO NOTHING` 배치 처리
  - 배치 크기 100개, 시드 파일 항목을 DB에 없는 것만 추가
  - 이미 있는 항목은 ON CONFLICT로 무시 (기존 번역 덮어쓰기 안 함)
  - 운영 배포 시 `post.photos` 6개 행 자동 추가됨
- **영향 범위**: `server/index.ts` import 경로 1곳 변경만 필요

#### 작업 B — `systemConfigSeed.ts` 데이터·로직 분리
- **현재**: 데이터 106개 + `seedSystemConfig()` 함수 1,528줄 1파일
- **이후**:
  - `server/seeds/data/systemConfigData.ts` — 106개 설정값 배열만 보관
  - `server/seeds/systemConfigSeed.ts` — `seedSystemConfig()` 함수만 보관 (50줄 이하)
- **영향 범위**: `server/index.ts` import 경로 변경 없음 (함수명 동일)

#### 작업 C — `index.ts` 스케줄러 코드 분리
- **현재**: `server/index.ts` 22~154줄에 스케줄러 정의·실행 코드 내장
- **이후**: `server/scheduler.ts` 새 파일로 분리
  - `schedulerHandles`, `stopScheduler`, `stopAllSchedulers`, `startBookingScheduler` 이동
  - `getSchedulerHandles()` export 유지
- **영향 범위**:
  - `server/index.ts` import 추가, 관련 코드 제거
  - `server/routes/` 에서 `schedulerHandles` 참조하는 곳 import 경로 수정

---

### 실행 순서

1. 작업 A (syncTranslations 수정) — 운영 DB post.photos 누락 즉시 해결
2. 작업 B (systemConfigSeed 분리) — 독립 작업, A와 무관
3. 작업 C (scheduler 분리) — index.ts 정리

### 금지 사항
- 기존 번역 데이터 값 수정 금지 (ON CONFLICT DO UPDATE 사용 안 함)
- systemConfigSeed의 실제 설정값 변경 금지
- 스케줄러 동작 로직 변경 금지 (코드 이동만)

---

## [세션 N] 모듈화 리팩토링 완료 (T001~T004)

- **날짜**: 2026-03-08
- **결과**: T001~T004 전부 PASS, Playwright e2e 테스트 성공

### T001 — syncTranslations 수정 + 이동 ✅
- `server/syncTranslations.ts` → `server/seeds/syncTranslations.ts` (deprecated stub 유지)
- COUNT 비교 로직 제거 → `INSERT ON CONFLICT DO NOTHING` 배치(100개) 방식으로 교체
- 운영 배포 시 `post.photos` 6개 키 자동 삽입됨

### T002 — systemConfigSeed.ts 데이터·로직 분리 ✅
- `server/seeds/systemConfigSeed.ts` (1,528줄) → 두 파일로 분리:
  - `server/seeds/data/systemConfigData.ts` (1,497줄): 데이터 배열만
  - `server/seeds/systemConfigSeed.ts` (35줄): seedSystemConfig() 로직만
- 버그 수정: `SYSTEM_CONFIG_SEEDS`에 `export` 키워드 누락 → 추가

### T003 — index.ts 스케줄러 코드 → scheduler.ts 분리 ✅
- `server/index.ts` 스케줄러 코드(~130줄) → `server/scheduler.ts` (143줄)로 이동
- `server/routes/billing.legacy.ts`: import `'./index'` → `'../scheduler'`로 수정
- `server/index.ts`는 이제 scheduler를 re-export만 함

### T004 — Playwright e2e 테스트 ✅
- 번역 API /api/translations/ui?locale=ko — 200, post.photos 키 확인
- 피드/홈 페이지 렌더링 정상
- JWT dev-token 인증 + /api/posts 200 확인
- 콘솔에 raw translation key 없음, JS 에러 없음

### 최종 파일 크기 (모듈화 후)
| 파일 | 전 | 후 |
|---|---|---|
| server/seeds/systemConfigSeed.ts | 1,528줄 | 35줄 |
| server/seeds/data/systemConfigData.ts | (신규) | 1,497줄 |
| server/index.ts | ~270줄 | ~270줄 (스케줄러 코드 제거) |
| server/scheduler.ts | (신규) | 143줄 |
| server/seeds/syncTranslations.ts | (이동) | 76줄 |
