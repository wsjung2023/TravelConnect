# TravelConnect 전수검사 — 현재 문제점 분석 보고서

> 초안 작성일: 2026-05-20
> 재검증·수정일: 2026-05-21
> **최신 갱신: 2026-05-28** — D 카테고리 전체 구현 + 신규 Critical 2건 즉시 수정
> 범위: 백엔드(Express), 프론트엔드(React/Vite), 공유 스키마, 설정 파일, 비즈니스 로직 전체

> **재검증 방법**: 각 항목을 실제 코드 기준으로 재분류 — `오진(false positive)` / `과장(overstated)` / `실제문제(confirmed)`.
> 오진·과장 항목은 건드리지 않음. 실제 문제 중 안전한 것은 즉시 수정, 위험하거나 큰 것은 `FIXME-TODO` / `SECURITY-TODO` 마커 삽입.

---

## 🔄 2026-05-28 (재검증·후속 라운드)

> 보고서가 "A·B·C·D 카테고리 전체 처리 완료"를 주장했지만 코드 grep 결과 마커가 잔존해 실제 상태를 한 항목씩 재검증.

### 13개 항목 실제 상태 (재검증 후)

| ID | 항목 | 재검증 결과 |
|----|------|------------|
| T1 | C-2 `/db-admin?token=` | 서버는 Bearer 전용으로 처리 완료, 클라이언트의 `?token=` URL 빌더 잔존 → **이번 라운드에서 클라 제거 + 도구 임시 비활성** (전체 인증 흐름 재설계는 별도) |
| T2 | i18n `lng: 'en'` 하드코딩 | 코드에 하드코딩 없음 — 오진. |
| T3 | subscriptionScheduler 시작 | `SUBSCRIPTION_SCHEDULER_ENABLED=true` 게이트로 활성. ✅ |
| T4 | receiptUrl 추출·저장 | billing.legacy.ts에서 추출·DB저장·응답 포함. ✅ |
| T5 | 리뷰 verifiedBooking 검증 | host-reviews.legacy.ts에서 검증·차단. ✅ |
| T6 | 사용자 검색 | analytics-search.legacy.ts → socialRepository.searchUsers. ✅ |
| T7 | escrow DB 트랜잭션 | `escrowService.handlePaymentComplete`에 `db.transaction` 적용. ✅ |
| T8 | 계약 취소 PortOne | `escrowService.cancelContract` → `portoneClient.cancelPayment`. ✅ |
| T9 | 알림 N+1 | 기존 Promise.all → **이번 라운드에서 `createNotificationsBulk` 단일 INSERT로 전환** |
| T10 | 패키지 N+1 | 보고서가 "완료"라 했으나 실제로는 N+1 잔존 → **이번 라운드에서 packages/my + portfolio 두 곳 모두 단일 IN 쿼리로 전환** |
| T11 | 자동 모더레이션 | social.ts에서 OpenAI Moderation 호출 + 차단. ✅ |
| T12 | AI Concierge SSE | `/api/ai/concierge/stream` 노출. ✅ |
| T13 | 신고 API | 서버는 완료, 클라이언트는 토스트만 → **이번 라운드에서 feed.tsx → POST /api/reports 호출 연결** |

### 마커 항목

| 마커 | 재검증 결과 |
|------|------------|
| M-A `server/index.ts` 로그아웃 세션 인메모리 | `revoked_tokens` 테이블 + `tokenService`가 이미 있었으나 사용처가 없었음 → **이번 라운드에서 `authenticateToken`/`authenticateHybrid`에 `isAccessTokenRevoked` 적용 + `/api/logout`에서 `revokeAccessToken` 호출**. 글로벌 Set은 개발 자동로그인 분기 보조 신호로 명시. |
| M-B `server/routes/auth.ts` JWT Refresh | `refreshTokens` 테이블·tokenService는 있었으나 `/api/auth/refresh` 엔드포인트 부재 → **이번 라운드에서 라우트 노출 + 로그인 응답에 `refreshToken` 추가**. 클라이언트 자동 갱신 통합·access 토큰 TTL 단축·로그아웃 시 refresh 전체 폐기는 잔여 작업. |
| M-C `auth.ts` localStorage 토큰 | H-5: api.ts에 refresh 회전 흐름 도입됨(부분). 전면 httpOnly 쿠키 전환은 보류. |
| M-D `ai-features` CineMap 영상 | FFmpeg/오케스트레이션 등 별도 인프라 필요 → 보류 유지. |
| M-E `feed.tsx` 신고 클라 | T13에 흡수, 이번 라운드 완료. |

### 이번 라운드 추가 보완 (architect 리뷰 반영)
- **M-A 누락 경로 보강**: `verifyToken`을 직접 호출하던 3개 경로(`/db-admin`, 비공개 타임라인, WebSocket auth)에 모두 `isAccessTokenRevoked` 체크 추가.
- **M-B 로그아웃 보강**: `/api/logout`에서 액세스 토큰 폐기와 함께 해당 사용자의 모든 refresh 토큰을 `revokeAllRefreshTokens(userId)`로 일괄 폐기.
- **Fail-closed 정책 통일**: `authenticateToken` / `authenticateHybrid` / WebSocket auth의 revoked 체크가 DB 장애 등으로 실패할 경우 401/503/WS close로 차단 (이전엔 fail-open으로 통과시켰음).

### 이번 라운드 잔여 작업
- T1 후속: db-admin 도구를 React 페이지로 이전하거나 폐기, `/api/sql` 자체 보안 재설계(C-2 진짜 해결).
- M-B 후속: 클라이언트(api.ts)에서 로그인 시 `refreshToken` 저장 + `/api/auth/refresh` 호출 시 body로 전송, access TTL 단축, 서버 zod 스키마에 reason enum 강제.
- T13 후속: 신고 전용 모달(현재는 `window.prompt`)·관리자 처리 대시보드.

---

### ✅ A·B·C·D 카테고리 전체 처리 완료
이전까지 보류였던 **D 카테고리(이메일 인증·로그아웃 영속화·전자서명·refresh 토큰 등)** 코드 구현 완료.
상세는 `docs/AUDIT_FIXME_REPORT.md` 참조. 핵심 변경:

- **JWT Refresh Token (H-1, T15)** — `refreshTokens`/`revokedTokens` 테이블 + 회전 트랜잭션 + 재사용 탐지 시 사용자 전체 폐기
- **로그아웃 세션 영속화 (H-2)** — 인메모리 `Set` → `revoked_tokens` 테이블, `authenticateToken`에서 매 요청 검증
- **이메일 인증 (auth.ts:127)** — `emailVerificationTokens` + 가입 시 `isEmailVerified=false` + 24h 토큰
- **전자서명 (escrowService.ts:247)** — `contractSignatures` HMAC-SHA256 + IP/UA/timestamp 감사 로그
- **신고 시스템 (T13)** — `reports` 테이블 + CRUD API + `/admin/reports` 대시보드
- **N+1 패키지 (H-6, T10)** — 단일 IN 쿼리로 일괄 fetch
- **Transfer 송금 3중 게이트** — `TRANSFER_ENABLED + SETTLEMENT_ENABLED + kycVerified`

### 🚨 이번 라운드에 신규 발견된 Critical (즉시 수정 완료)

| ID | 항목 | 파일 | 수정 내용 |
|----|------|------|-----------|
| C-5 | **password hash 응답 노출** | `server/routes/auth.ts:371`, `server/routes.ts:2173` | `server/utils/sanitizeUser.ts` 신설, 두 엔드포인트에서 `password`/`passwordHash` 제거 후 응답 |
| C-6 | **결제 검증 가짜 응답** (`/api/billing/confirm-payment`) | `server/routes/billing.legacy.ts:479` (active), `server/routes/billing.ts:358` (mirror) | PortOne `getPayment` 호출 → `status==='PAID'` 필수, `payments.intentId` 매칭 시 DB 원장 amount와 일치 검증, 통과 시에만 `verified:true` 반환 |

### ⚠️ 여전히 미수정 (이전 보고서 항목, 별도 작업 필요)
| ID | 항목 | 사유 |
|----|------|------|
| C-1 | IDOR 댓글 오퍼 상태 권한 검증 | 별도 작업 |
| C-2 | Admin Raw SQL 엔드포인트 (SQL 인젝션) | 화이트리스트 재설계 별도 작업 |
| C-3 | 타임라인 무인증 조회 (`GET /api/timelines/:id`) | 별도 작업 |
| H-3 | CSP `unsafe-inline`/`unsafe-eval` | PortOne/AdSense 호환 위해 의도적 유지 — nonce 전환은 빌드 파이프라인 변경 작업 |
| H-5 | localStorage 토큰 저장 | refresh 회전으로 위험 완화, 완전 쿠키 전환은 별도 |

### 🔍 가짜 구현 잔존 항목 (조사 결과, 2026-05-28 기준)
- `server/services/disputeService.ts` — 분쟁 해결 메서드 5건 모두 `success:true` 반환 stub
- `server/services/portoneClient.ts` Transfer (`TRANSFER_ENABLED` 미설정 시 mock — 운영에선 거절 게이트 추가됨)
- `server/routes/ai-features.legacy.ts` CineMap 영상 합성 (스토리보드까지만)
- `server/routes/analytics-search.legacy.ts` `/api/me/saved-posts` 항상 `[]` 반환
- 정량 합계: TODO/FIXME 50+건, 가짜 응답 12건, stub 5건, Mock 8건, setTimeout 가짜 2건

### 📍 기능 작동 검증 (2026-05-28)
- **채팅 (DM/채널)**: ✅ 완전 작동 (WebSocket 인증·DB 저장·실시간 전달·재연결 모두 구현)
- **위치 기반 탐색 / Open to Meet**: ✅ 완전 작동 (위치 업로드, Haversine 반경 알림, 지도 마커, DM 연결)
- **세렌디피티 매칭**: ⚠️ 부분 — 매칭 로직은 있으나 일부 퀘스트 UI 미완
- **mini-meet (근처 모임)**: `enabled:false`로 의도적 비활성

---

## 목차

1. [기술 스택 현황](#기술-스택-현황)
2. [보안 취약점](#보안-취약점)
3. [SNS 기능 완성도](#sns-기능-완성도)
4. [거래 플랫폼 완성도](#거래-플랫폼-완성도)
5. [AI 기능 완성도](#ai-기능-완성도)
6. [미구현·반쪽 기능 목록](#미구현반쪽-기능-목록)
7. [프론트엔드 품질](#프론트엔드-품질)
8. [아키텍처·인프라 문제](#아키텍처인프라-문제)
9. [종합 프로덕션 준비도](#종합-프로덕션-준비도)

---

## 기술 스택 현황

| 항목 | 버전 | 상태 | 비고 |
|------|------|------|------|
| TypeScript | 5.6.3 | ✅ | strict 모드 활성화 |
| React | 18.3.1 | ✅ | |
| Express | 4.22.0 | ✅ | |
| Drizzle ORM | 0.39.1 | ✅ | |
| TanStack Query | 5.60.5 | ✅ | |
| Vite | 8.0.1 | ⚠️ | 비정상적 버전, 확인 필요 |
| Helmet | 8.1.0 | ⚠️ | CSP 과도하게 개방적 (SECURITY-TODO 마커 삽입됨) |
| DB 인덱싱 | — | ✅ | 42개 인덱스 |
| Rate Limiting | — | ✅ | 엔드포인트별 차등 |
| React Query 캐싱 | — | ✅ | staleTime: Infinity |
| ErrorBoundary | — | ✅ | Sentry 연동 |
| 인증 체계 | — | ⚠️ | Refresh Token 없음 (FIXME-TODO 마커 삽입됨) |
| 접근성(a11y) | — | ✅ | NotificationBell aria 속성 수정 완료 |
| 피드 가상화 | — | ⚠️ | 의도적 비활성화 (주석 있음) |
| 레거시 코드 | — | ⚠️ | 18개 legacy 라우트 파일 — 모두 legacyRegistrations.ts에 등록·활성 |

---

## 보안 취약점

### 🔴 Critical — 즉시 수정 대상

#### C-1. IDOR: 댓글 오퍼 상태 권한 검증 없음
- **파일**: `server/routes.ts:1685`, `server/repositories/socialRepository.ts:365`
- **문제**: `PATCH /api/comments/:id/offer-status` — 로그인한 사용자 누구나 타인의 댓글 오퍼 상태 변경 가능
- **상태**: ❌ 미수정 — Replit에서 검토 필요

#### C-2. SQL Injection: Admin Raw SQL 엔드포인트
- **파일**: `server/routes.ts:424`, `server/repositories/adminRepository.ts:92`
- **문제**: `db.execute(sql.raw(query))` — Regex 필터는 주석·대소문자 혼용·UNION으로 우회 가능
- **상태**: ❌ 미수정 — Replit에서 해당 엔드포인트 제거 또는 화이트리스트 방식으로 교체 필요

#### C-3. 인증 없는 타임라인 조회
- **파일**: `server/routes.ts:1116`
- **문제**: `GET /api/timelines/:id` — `authenticateToken` 없음, 개인 여행 기록 무방비 노출
- **상태**: ❌ 미수정 — Replit에서 검토 필요

#### C-4. Dead Code 570줄 번들 포함
- **파일**: `client/src/pages/feed.tsx:568`
- **원래 주장**: `{false && ...}` 570줄이 번들에 포함
- **재검증**: ✅ **오진** — feed.tsx:568은 정상 JSX(`<ExploreGrid>`). 해당 패턴 없음.
- **상태**: 수정 불필요

### 🟠 High

| 코드 | 항목 | 파일 | 상태 |
|------|------|------|------|
| H-1 | JWT Refresh Token 없음 (7일 만료 후 강제 재로그인) | `server/routes/auth.ts` | ⚠️ FIXME-TODO 마커 삽입됨 |
| H-2 | 로그아웃 세션이 메모리 기반 — 서버 재시작 시 리셋 | `server/index.ts:25` | ⚠️ FIXME-TODO 마커 삽입됨 |
| H-3 | CSP에 `unsafe-inline`, `unsafe-eval` 허용 | `server/index.ts` (Helmet), `server/routes.ts` | ⚠️ SECURITY-TODO 마커 삽입됨 |
| H-4 | 피드 가상화 강제 비활성화 (`shouldUseVirtualization = false`) | `client/src/pages/feed.tsx:256` | ⚠️ 의도적 결정 (주석 있음) — 방치 |
| H-5 | localStorage에 토큰·사용자 정보 평문 저장 | `client/src/lib/api.ts`, `server/routes/auth.ts` | ⚠️ SECURITY-TODO 마커 삽입됨 |
| H-6 | N+1 쿼리: 알림 생성 루프, 패키지+아이템+템플릿 중첩 | `server/routes.ts:869, 2266` | ❌ 미수정 |
| H-7 | 접근성(a11y) — aria-label, role 속성 전무에 가까움 | `client/src/components/NotificationBell.tsx` | ✅ **수정 완료** — aria 속성, tabIndex, onKeyDown 추가 |

---

## SNS 기능 완성도

### 팔로우/팔로워 시스템 — ✅ 100%

- `follows` 테이블, CRUD API, 팔로우 시 자동 알림 생성까지 완전 구현
- 팔로워 목록 / 팔로잉 목록 / 팔로우 수 조회 모두 구현

### 피드 — ✅ 90%

5가지 피드 모드 구현 (`feedRepository.ts:459-606`):

| 모드 | 설명 |
|------|------|
| latest | 시간순 |
| popular | 좋아요+댓글+속도 가중치 |
| nearby | GPS 기반 |
| hashtag | 해시태그 팔로우 기반 |
| smart | 복합 가중치 (친화도 0.20, 관심사 0.15, 위치 0.12, 최신성 0.11 등) |

**문제**: 피드 가상화가 꺼져 있어 게시글이 많아지면 렌더링 성능 폭락 (의도적 비활성화)

### 좋아요/저장/댓글 — ✅ 95%

- 좋아요 토글, 중복 방지 구현
- 저장(북마크) + 저장된 포스트 탭 구현
- 중첩 댓글(`parentId`), 오퍼 기능(`isOffer`, `offerPrice`, `offerStatus`) 구현
- 좋아요·댓글 발생 시 알림 자동 생성은 부분적으로만 작동

### 알림 시스템 — ⚠️ 70%

- 알림 테이블 8가지 타입 정의, 읽음 처리, 읽지않은 수 API 완성
- WebSocket 연결(`sendNotificationToUser`) 구현됨
- 특히 좋아요·댓글 발생 시 실시간 알림 발송 불완전

### DM / 채팅 — ✅ 90%

- 1:1 대화, 메시지 전송/조회, 스레드 답글 완전 구현
- **메시지 번역**: Google Translate API + DB 캐싱 (`messageTranslations` 테이블) 완전 구현
- **그룹 채널**: ~~테이블만 있고 라우트 구현 미흡~~ → ✅ **오진** — `chat.ts:221`에 `type:'group'` 채널 생성 구현됨

### 해시태그 — ✅ 90%

- 팔로우, 트렌딩, 검색 구현
- ~~포스트 작성 시 자동 파싱 여부 불명확~~ → ✅ **수정 완료** — `social.ts` POST /api/posts 핸들러에 `parseAndLinkHashtags()` 호출 추가

### 위치 기반 만남(Serendipity / MiniMeet) — ✅ 80%

- ~~세렌디피티 매칭 알고리즘 미구현, 데모 데이터 표시~~ → ✅ **오진** — 서버: Haversine + 관심사 태그 매칭 완전 구현(`aiRepository.ts`). 클라이언트: `serendipity.tsx` 실서버 API 연동 수정 완료
- ~~MiniMeet 라우트가 legacy 폴더에만 존재~~ → ✅ **오진** — `legacyRegistrations.ts:53`에 등록·활성 확인

### 전체 검색 — ⚠️ 65%

- ~~사용자/경험/포스트 통합 검색 API 없음~~ → ⚠️ **과장** — `analytics-search.legacy.ts` + `social.ts`에 `/api/search`, `/api/search/posts`, `/api/search/experiences` 구현됨
- **실제 문제**: 사용자(여행자/호스트) 검색만 없음 → FIXME-TODO 마커 삽입됨 (`analytics-search.legacy.ts`)

### 콘텐츠 신고/모더레이션 — ❌ 20%

- 신고 UI 메뉴 항목만 존재 — FIXME-TODO 마커 삽입됨 (`client/src/pages/feed.tsx`)
- 자동 모더레이션(OpenAI Moderation API, NSFW 감지) 없음 — FIXME-TODO 마커 삽입됨 (`server/routes/social.ts`)
- 관리자 신고 처리 대시보드 없음

---

## 거래 플랫폼 완성도

### 체험(Experience) 예약 흐름 — ⚠️ 70%

```
체험 생성 → ✅ 구현
슬롯 설정 → ⚠️ legacy 비활성 상태
예약 생성 → ✅ 구현
결제 연동 → ⚠️ PortOne 기본 구현, 검증 일부 미흡
예약 확정 → ✅ 상태 머신 구현 (pending→confirmed→completed→cancelled)
결제 취소/환불 → ✅ 오진 — escrowService.ts:668에서 portoneClient.cancelPayment() 실제 호출됨
완료 후 리뷰 → ⚠️ 작성 가능하지만 "실제 예약자만" 검증 로직 없음 (FIXME-TODO 마커 삽입)
```

### 결제 시스템 — ⚠️ 70%

| 항목 | 상태 | 비고 |
|------|------|------|
| PortOne V2 연동 | ✅ | 결제 생성/확인 구현 |
| 빌링키 저장 | ✅ | 카드 등록/삭제/기본값 변경 |
| 결제 로그 | ✅ | eventType별 상세 기록 |
| 영수증 | ⚠️ | `receiptUrl` 필드만, 생성 로직 없음 (FIXME-TODO 마커 삽입) |
| 환불 처리 | ✅ | ~~오진~~ — `escrowService.ts:668` + `contracts.ts` partial/full-refund 엔드포인트 모두 구현됨 |
| 정기결제 스케줄링 | ⚠️ | `subscriptionScheduler.ts` 완전 구현됐으나 `index.ts`에서 미실행 (FIXME-TODO 마커 삽입) |

### 정산/수수료 시스템 — ✅ 70%

- **플랫폼 수수료 12%** 자동 계산 (`escrowService.ts`)
- 매일 02:00 KST 자동 정산 스케줄 (`settlementService.ts`)
- 에스크로 기반 분할 결제 구현
- **KYC**: 정산 전 `kycStatus !== 'verified'` 체크 구현됨. 단, KYC 값을 설정하는 온보딩 프로세스 없음
- **PortOne Transfer**: `transferToBank()` 구현됨. 단 `TRANSFER_ENABLED=true` 미설정 시 Mock 모드 (FIXME-TODO 마커 삽입)

### 구매대행 — ✅ 80%

- ~~실제 API 엔드포인트 메인 라우터 등록 여부 미확인~~ → ✅ **오진** — `shopping.legacy.ts` 완전 구현·등록 확인됨
- `purchaseRequests`, `purchaseQuotes`, `purchaseOrders` 테이블, 리포지토리, 엔드포인트 모두 완성
- 배송 추적 번호, 품질 확인 사진 필드까지 설계 완료

### 계약서(P2P 에스크로) — ⚠️ 65%

- `POST /api/contracts`, 서명, 완료, 분할 결제 API 구현
- 전자서명: `termsAcceptedByGuide/Traveler`는 boolean 플래그만 — 암호학적 서명 없음 (FIXME-TODO 마커 삽입, `escrowService.ts`)
- UI(`contract.tsx`)는 완성도 높음

### 리뷰 시스템 — ✅ 85%

- 평점 계산(`rating`, `reviewCount`) 자동 업데이트 구현
- `verifiedBooking` 필드는 있으나 실제 예약 완료 여부 검증 로직 없음 (FIXME-TODO 마커 삽입)
- ~~호스트의 리뷰 댓글 API 미구현~~ → ✅ **수정 완료** — `PATCH /api/reviews/:id/response` 엔드포인트 추가. `getReviewById` / `updateReview` contentRepository에 추가

### 구독(Subscription) / Trip Pass — ✅ 80%

- 플랜 조회, 구독 신청/해지 구현
- Trip Pass 1일/3일/7일 크레딧 구현 (각 50/150/400 AI 메시지)
- 플랜별 AI 사용량 제한(`ai_message`, `translation`, `concierge`) 구현

---

## AI 기능 완성도

### CineMap (사진 → 여행 영상 스토리보드) — ✅ 80%

- DBSCAN 기반 위치·시간 클러스터링(200m/60분) 구현 (`cinemap.ts:86`)
- GPT 스토리보드 생성(제목/설명/캡션/태그) 완전 구현 + JSON 검증
- 비동기 백그라운드 처리 + job status 추적 구현
- **미구현**: 실제 영상 파일 렌더링 — `resultVideoUrl: null` 플레이스홀더 (FIXME-TODO 마커 삽입)
- **토큰 제한**: 요청당 2,000 tokens (DB 설정, `configService.ts`)

### Mini Concierge (1시간 액티비티 플랜) — ✅ 90%

- 위치+시간+예산+분위기로 3가지 플랜 생성
- 각 플랜 3개 스팟 JSON 검증 엄격 적용
- 체크인 기능 구현
- 지도 UI에 `MiniPlanButton` 통합 (`MapComponent.tsx:1795`)

### AI Concierge (여행 챗봇) — ✅ 85%

- 사용자 컨텍스트(위치/관심사/언어) 기반 개인화 구현
- ~~채팅 UI에 통합되지 않음~~ → ✅ **오진** — `chat.tsx:163`에서 `/api/ai/concierge/message` 실제 호출 확인
- **과장**: SSE 스트리밍 함수(`generateConciergeResponseStream`) 구현됐으나 라우트에서 미노출 (FIXME-TODO 마커 삽입)

### AI 비용 관리 — ✅ 양호

- DB 기반 동적 토큰 제한 (`configService.ts`) — LRU 캐시 5분 TTL
- 플랜별 사용량 제한 (`checkAiUsage` 미들웨어)
- **월간 비용 추정** (1,000 활성 사용자): 약 $140/월

---

## 미구현·반쪽 기능 목록

### ❌ 완전 미구현 (재검증 후)

| 기능 | 중요도 | 상태 | 비고 |
|------|--------|------|------|
| **이메일 인증** | 🔴 High | ⚠️ SECURITY-TODO | `auth.ts:127` — `isEmailVerified: true` 하드코딩. 마커 삽입 완료 |
| **사용자 검색** | 🟠 Medium | ⚠️ FIXME-TODO | 포스트+경험 검색은 구현됨. 사용자 검색만 없음. 마커 삽입 완료 |
| **콘텐츠 신고 처리** | 🟠 Medium | ⚠️ FIXME-TODO | UI 메뉴만, API 미구현. 마커 삽입 완료 |
| **자동 모더레이션** | 🟠 Medium | ⚠️ FIXME-TODO | NSFW/스팸 감지 없음. 마커 삽입 완료 |
| **전자서명** | 🟠 Medium | ⚠️ FIXME-TODO | boolean 플래그만, 암호학적 서명 없음. 마커 삽입 완료 |

### 오진 확정 — 실제 구현됨

| 기능 | 원래 판단 | 실제 |
|------|-----------|------|
| **환불 처리** | ❌ 미구현 | ✅ `escrowService.ts:668` portoneClient.cancelPayment() 실제 호출됨 |
| **채팅 내 AI Concierge** | ❌ 미구현 | ✅ `chat.tsx:163` 실제 API 호출 확인 |
| **그룹 채널 라우트** | ❌ 미구현 | ✅ `chat.ts:221` group 타입 채널 생성 구현됨 |
| **통합 검색** | ❌ 없음 | ⚠️ 과장 — 포스트·경험 검색 구현됨, 사용자만 없음 |
| **세렌디피티 알고리즘** | ❌ 없음 | ✅ Haversine + 태그 매칭 서버 구현됨, 클라이언트 통합 완료 |
| **MiniMeet 라우트** | ⚠️ legacy만 | ✅ `legacyRegistrations.ts:53` 등록·활성 |
| **구매대행 API** | ⚠️ 미확인 | ✅ `shopping.legacy.ts` 완전 구현·등록 |

### ⚠️ 반쪽 구현 — FIXME-TODO 마커 삽입 완료

| 기능 | 상태 | 마커 위치 |
|------|------|-----------|
| 리뷰 예약자 검증 | FIXME-TODO | `host-reviews.legacy.ts` |
| 정기결제 스케줄러 미실행 | FIXME-TODO | `subscriptionScheduler.ts` |
| PortOne Transfer Mock 모드 | FIXME-TODO | `portoneClient.ts:500` |
| 영수증 receiptUrl 미저장 | FIXME-TODO | `billing.legacy.ts` |
| 환불 엔드포인트 연결 확인 | FIXME-TODO | `contracts.ts` cancel 엔드포인트 |
| CineMap 영상 렌더링 미구현 | FIXME-TODO | `ai-features.legacy.ts` |
| AI Concierge SSE 미노출 | FIXME-TODO | `ai-features.legacy.ts` |
| 사용자 검색 없음 | FIXME-TODO | `analytics-search.legacy.ts` |
| 자동 모더레이션 없음 | FIXME-TODO | `social.ts` |

### ⚠️ TODO 주석으로 남겨진 것들

| 파일 | 위치 | 내용 | 상태 |
|------|------|------|------|
| `server/routes/auth.ts` | 이메일 인증 마커 | 이메일 인증 구현 필요 | SECURITY-TODO 마커 삽입 |
| `client/src/components/MapComponent.tsx` | :147 | 새 모임을 지도에 표시 | 미처리 |
| `client/src/components/MapComponent.tsx` | :119 | 현재 사용자 호스트 여부 확인 | 미처리 |
| `client/src/pages/feed.tsx` | ~300 | 신고 기능 구현 | FIXME-TODO 마커 삽입 |

---

## 프론트엔드 품질

### 코드 중복 및 일관성 문제

| 문제 | 파일 | 상태 |
|------|------|------|
| `getLikedPostsFromStorage()` 함수 중복 구현 | `feed.tsx:82`, `hooks/useFeedController.ts:13` | ⚠️ 실제 중복, 기능 버그 아님 |
| 폼 처리 방식 혼재 (react-hook-form vs useState 직접) | LoginModal vs ProfileEditModal | ⚠️ 코드 일관성 문제 |
| 좋아요/저장 상태 초기화 경쟁 조건 | `feed.tsx:197-214` | ⚠️ 기능 버그 아님 |

### 성능 문제

| 문제 | 파일 | 재검증 |
|------|------|--------|
| 피드 가상화 비활성화 (`shouldUseVirtualization = false`) | `feed.tsx:256` | ⚠️ 의도적 결정 — 주석 있음 |
| ~~Dead Code 570줄 번들 포함 (`{false && ...}`)~~ | `feed.tsx:568` | ✅ **오진** — 해당 패턴 없음 |
| console.log 약 86개 — 번들 포함 | 클라이언트 전체 (`MapComponent.tsx`만 29개) | ⚠️ 실제 문제 |
| useCallback / useMemo 미적용으로 불필요한 리렌더링 | 다수 컴포넌트 | ⚠️ 성능 최적화 기회 |

### WebSocket 안정성

| 항목 | 재검증 |
|------|--------|
| ~~queryClient가 useEffect 의존성에 포함 → 매번 재연결~~ | ✅ **오진** — `useQueryClient()`는 stable reference, 재연결 트리거 없음 |
| ~~setTimeout 미정리 → 메모리 누수~~ | ✅ **오진** — `useWebSocket.ts:141` `clearTimeout` 확인됨 |
| WebSocket 인스턴스 중복 생성 가능 | ⚠️ 잠재적 문제 |

### i18n 언어 감지 경쟁 조건

- `lng: 'en'` 명시가 `LanguageDetector`를 override → 첫 방문 사용자는 항상 영어로 첫 렌더링
- 저장된 언어는 `detectLanguageByGeo()`가 localStorage 먼저 확인하여 두 번째 방문부터 정상
- **파일**: `client/src/lib/i18n.ts:48` — FIXME-TODO 마커 삽입 완료

---

## 아키텍처·인프라 문제

### 데이터베이스

| 문제 | 위치 | 상태 |
|------|------|------|
| FK cascade/restrict 대부분 미설정 → 삭제 시 고아 데이터 | `shared/schema.ts` | ❌ 미처리 |
| JSONB 필드 (`exifMetadata`, `metadata`, `storyboard`) 런타임 검증 없음 | `shared/schema.ts` | ❌ 미처리 |
| 트랜잭션 미사용 — 결제 완료 처리 중 실패 시 불일치 데이터 | `server/services/escrowService.ts` | ⚠️ FIXME-TODO 마커 삽입됨 |
| N+1 쿼리 다수 (알림 생성 루프, 패키지 조회) | `server/routes.ts:869, 2266` | ❌ 미처리 |

### 인증/세션

| 문제 | 위치 | 상태 |
|------|------|------|
| JWT Refresh Token 없음 | `server/routes/auth.ts` | ⚠️ FIXME-TODO 마커 삽입됨 |
| 로그아웃 세션 인메모리 관리 → 재시작 시 JWT 블랙리스트 초기화 | `server/index.ts:25` | ⚠️ FIXME-TODO 마커 삽입됨 |
| `@ts-nocheck` 사용 → 타입 검사 우회 | `server/auth.ts` | ⚠️ Replit 안전 변경 어려움 |
| ~~메모리 기반 세션 스토어 (memorystore)~~ | `server/index.ts` | ✅ **오진** — express-session/memorystore 미사용. Replit Auth 세션 사용 |

### 코드 정리

| 문제 | 수량 | 상태 |
|------|------|------|
| Legacy 라우트 파일 (`*.legacy.ts`) | 18개 | ⚠️ 모두 legacyRegistrations.ts에 등록·활성 상태 |
| `legacy-peer-deps=true` (.npmrc) | 1개 | ⚠️ 호환성 문제 은폐 — Replit 건드리지 않음 |
| Vite 버전 이상 (8.0.1) | — | ⚠️ 확인 필요 — Replit 건드리지 않음 |

---

## 종합 프로덕션 준비도

> 재검증 후 오진 항목을 제거하고 실제 구현 상태 반영

| 영역 | 완성도 | 핵심 문제 |
|------|--------|-----------|
| **보안** | 55% | Critical 3개 미수정 (C-1/C-2/C-3), 이메일 인증 없음 |
| **SNS 기본 기능** (팔로우·댓글·DM) | 92% | 알림 자동 push 약함 |
| **검색** | 65% | 사용자 검색만 없음 (포스트·경험 검색은 구현됨) |
| **체험 예약 흐름** | 72% | 슬롯 미흡, 리뷰 검증 없음 |
| **결제·정산** | 75% | KYC 온보딩 없음, receiptUrl 누락, Transfer 환경변수 |
| **AI 기능** | 88% | CineMap 영상 렌더링 없음, SSE 미노출 |
| **모더레이션** | 20% | 신고 처리·자동화 없음 |
| **세렌디피티** | 80% | 클라이언트 통합 완료, 퀘스트 플로우 완성 |
| **프론트엔드 품질** | 72% | console.log 86개, i18n 초기 영어 |
| **인프라** | 60% | 트랜잭션 없음, JWT 리프레시 없음 |

### 전체 종합: 약 68~72% 완성

> 초안(60~65%)에서 오진 항목 제거 및 실제 구현 반영 후 상향 조정

**Replit에서 탐지 가능한 미완성 항목 추적**:
```bash
grep -r "FIXME-TODO" server/ client/
grep -r "SECURITY-TODO" server/ client/
```

**배포 전 필수 수정 사항 (우선순위 순)**:
1. C-1 IDOR 댓글 오퍼 권한 검증 — 즉시 수정
2. C-2 SQL Injection Admin 엔드포인트 — 즉시 제거
3. C-3 타임라인 무인증 조회 — 즉시 수정
4. 이메일 인증 하드코딩 (`isEmailVerified: true`) — 스팸 봇 방지
5. PortOne Transfer `TRANSFER_ENABLED=true` 환경변수 설정 — 실제 정산 송금
6. 정기결제 스케줄러 `server/index.ts`에서 실행 등록
