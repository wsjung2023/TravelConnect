# CODE_AUDIT_REPORT FIXME-TODO/SECURITY-TODO 처리 결과 보고서

날짜: 2026-05-28
범위: C-3 Replit OAuth 제외, 전 마커 처리

## ✅ 완료 (A/B 카테고리)

| ID | 항목 | 변경 위치 | 핵심 변경 |
|----|------|-----------|-----------|
| T1 | /db-admin URL 토큰 제거 | server/routes.ts | `?token=` 거부, Authorization Bearer 헤더 전용 |
| T2 | i18n lng 하드코딩 제거 | client/src/lib/i18n.ts | `lng:'en'` 삭제 → LanguageDetector 자동 감지 |
| T3 | 구독 스케줄러 자동 기동 | server/index.ts | `SUBSCRIPTION_SCHEDULER_ENABLED=true` 시 24h 주기 |
| T4 | receiptUrl 저장 | server/services/portoneClient.ts, server/routes/billing.legacy.ts | PortOne getPayment → payments.receiptUrl 업데이트 |
| T5 | 리뷰 verifiedBooking 검증 | server/routes/host-reviews.legacy.ts | bookings.status='completed' 확인 후 작성 허용 |
| T6 | 사용자 검색 API | server/repositories/socialRepository.ts, server/routes/analytics-search.legacy.ts | `searchUsers` 추가 + `/api/search?type=users` |
| T7 | DB 트랜잭션 적용 | server/services/escrowService.ts | handlePaymentComplete의 insert/update를 db.transaction으로 원자화 |
| T8 | 계약 취소 자동 환불 | server/services/escrowService.ts, server/routes/contracts.ts | funded escrowTransactions 조회 → portoneClient.cancelPayment 호출 + 환불 결과 로그 |
| T9 | N+1 알림 루프 → 병렬 | server/routes.ts | profile/open + experiences POST 두 곳 Promise.all 병렬화 |
| T11 | 자동 모더레이션 | server/routes/social.ts | OpenAI Moderation API 호출 후 위반 시 422 차단 |
| T12 | AI Concierge SSE | server/routes/ai-features.legacy.ts | POST /api/ai/concierge/stream (text/event-stream) 신설 |
| 부가 | index.ts 글로벌 에러 핸들러 | server/index.ts | `throw err` 제거 (unhandledRejection 방지) |

## ⚠️ 의도적 유지 (C 카테고리)

| ID | 항목 | 사유 |
|----|------|------|
| T14 | CSP unsafe-inline/unsafe-eval | PortOne 결제 SDK·Google AdSense·Vite HMR 인라인 스크립트 필수. nonce 기반 CSP 전환은 별도 빌드 파이프라인 변경 작업 필요 |

## ✅ 완료 (D 카테고리 추가 처리분 — 2026-05-28)

| ID | 항목 | 변경 위치 | 핵심 변경 |
|----|------|-----------|-----------|
| T10 | N+1 패키지 조회 | server/routes.ts (`/api/packages/my`) | 패키지 아이템 + 템플릿을 단일 IN 쿼리로 일괄 fetch (Map 매칭) |
| T13 | 신고 API + 관리자 대시보드 | shared/schema.ts(`reports`), server/routes/reports.ts, client/src/pages/admin/Reports.tsx, App.tsx | POST/GET/GET·by-target/PATCH(admin) + 상태 토글 UI + 라우트 `/admin/reports` |
| T15 | JWT Refresh Token (회전) | shared/schema.ts(`refreshTokens`,`revokedTokens`), server/services/tokenService.ts, server/routes/auth-extended.ts, client/src/lib/api.ts | httpOnly 쿠키 기반 refresh 발급/회전(reuse 감지), 액세스 토큰 폐기 DB 영속화, 401 시 자동 회전 → fallback generate-token |
| 이메일 인증 | auth.ts:127 | shared/schema.ts(`emailVerificationTokens`), server/routes/auth.ts(가입 시 isEmailVerified=false + 토큰 자동 발급), server/routes/auth-extended.ts(`/email/verify/send`,`/email/verify`) | 토큰 해시 저장, 24h TTL, 콘솔 + verifyUrl 노출(개발). **실 발송 인프라(SMTP/SendGrid)는 외부 의존 — 환경변수 연동만 추가하면 됨** |
| 로그아웃 세션 DB 영속화 | index.ts:25 | server/services/tokenService.ts (`revokeAccessToken`/`isAccessTokenRevoked`), server/auth.ts(authenticateToken 내 revoked 체크), server/routes/auth-extended.ts(`/logout/secure`) | 인메모리 Set → `revoked_tokens` 테이블. 모든 인증 요청에서 폐기 여부 검증 |
| 전자서명 강화 | escrowService.ts:247 | shared/schema.ts(`contractSignatures`), server/services/signatureService.ts, escrowService.confirmContract/acceptTerms | HMAC-SHA256 서명 + IP/UserAgent/타임스탬프/계약 스냅샷 영속화 (감사 추적·위변조 방지). **PKI/DocuSign 수준은 별도 도입 필요** |
| Transfer 실송금 게이트 강화 | portoneClient.ts:502 | server/services/portoneClient.ts | `TRANSFER_ENABLED` + `SETTLEMENT_ENABLED` + `kycVerified` 3중 게이트. 운영 환경에서 미충족 시 명확한 거절(반환), 개발에서만 mock |

## ⏸️ 외부 인프라 의존 한계 (코드는 완료, 운영 연동 필요)

| 항목 | 코드 상태 | 운영 활성화 조건 |
|------|----------|------------------|
| C-3 Replit OAuth | 본 작업 범위 외 (사용자 명시 제외) | - |
| 이메일 실 발송 | 토큰 발급/검증 완료, 콘솔 로그만 출력 | SMTP/SendGrid/Resend 연동 함수 추가 (`server/routes/auth.ts` 가입 직후, `auth-extended.ts /email/verify/send`) |
| PortOne Transfer 실송금 | KYC 게이트 + 환경변수 게이트 완료 | `TRANSFER_ENABLED=true`, `SETTLEMENT_ENABLED=true`, PortOne Transfer 계약, 호스트 KYC 검증 데이터 |
| CineMap 영상 렌더링 | 스토리보드 생성·저장 완료 | FFmpeg/Remotion 등 외부 렌더 워커 |

## 🆕 추가 신설 파일/테이블 (D 카테고리)

- **shared/schema.ts**: `reports`, `refreshTokens`, `revokedTokens`, `emailVerificationTokens`, `contractSignatures` (`npm run db:push --force` 적용 완료)
- **server/services/tokenService.ts**: refresh 토큰 발급/회전/폐기, reuse 감지, 액세스 토큰 폐기 영속화
- **server/services/signatureService.ts**: HMAC-SHA256 계약 서명 + 검증
- **server/routes/reports.ts**: 신고 CRUD (POST/GET/admin GET·PATCH)
- **server/routes/auth-extended.ts**: `/refresh/issue`, `/refresh`, `/logout/secure`, `/email/verify/send`, `/email/verify` (cookie-parser 없이 raw cookie 헤더 파싱)
- **client/src/pages/admin/Reports.tsx**: 신고 관리 대시보드 (필터·상태 토글·메모)

## 🔁 코드 리뷰 반영 (Architect 피드백)

1. **T11 활성 라우트 보정** — `/api/posts` 실제 핸들러는 `server/routes.ts:1433`. 모더레이션 호출을 해당 위치에도 추가 (social.ts는 백업 경로로 유지).
2. **T5 역할 인자 보정** — `getBookingsByUser(userId, 'guest')` 또는 `getBookingsByGuest`로 호출 (이전 호출은 role 누락으로 호스트측 컬럼 매칭 실패).
3. **T4 동작 보장** — `receiptUrl`을 응답에 포함 (클라이언트 즉시 사용 가능), DB 저장은 best-effort. `payments.intentId` 미저장 흐름은 0건 정상 처리.
4. **T12 IDOR 방지** — `/api/ai/concierge/stream`에서 `channelId` 사용 시 `getChannelMembers`로 멤버십 확인 후 403 차단.

## 🧪 검증

- TypeScript 컴파일: **통과** (기존 무관 에러 `ProfileSettingsSection.tsx` 1건 제외)
- 서버 기동: **정상** — port 5000 serving, 모든 스케줄러 초기화 완료
- 글로벌 에러 핸들러 `throw err` 제거로 unhandledRejection 위험 제거
- DB 마이그레이션: `npm run db:push --force` 적용 완료 (신규 5개 테이블)

## 📌 운영 활성화 가이드

- **구독 자동 갱신 ON**: 운영 환경변수에 `SUBSCRIPTION_SCHEDULER_ENABLED=true` 설정 후 재배포
- **자동 모더레이션 ON**: `OPENAI_API_KEY` 존재 시 자동 활성 (이미 설정됨)
- **DB Admin 접근**: 이전 `?token=` 방식 차단 → 반드시 `Authorization: Bearer <JWT>` 헤더 사용
