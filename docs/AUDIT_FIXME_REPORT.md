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

## ⏸️ 보류 (D 카테고리 — 별도 큰 작업 필요)

| ID | 항목 | 사유 |
|----|------|------|
| T10 | N+1 패키지 조회 | CODE_AUDIT_REPORT의 마커 위치 미상 (코드 내 마커 부재). H-7로 분류된 영역 별도 식별 필요 |
| T13 | 신고 API 기본 구현 | `reports`/`userReports`/`contentReports` 테이블 미정의. 스키마 추가 + 마이그레이션 + Repository + Routes + Admin 대시보드 일괄 작업 필요 |
| T15 | JWT Refresh Token | Access 단일 토큰 구조 → Refresh+Access 전환 시 client 인증 흐름 전면 재설계 필요 (api.ts, 자동갱신, 만료 핸들링) |
| - | 이메일 인증 (auth.ts:127) | 외부 이메일 서비스(SendGrid 등) 연동 + 인증 토큰 테이블 + 발송 워커 필요 |
| - | localStorage → httpOnly 쿠키 (api.ts:2, auth.ts:370) | CSRF 토큰 도입 + SameSite 정책 + 모든 인증 호출부 변경 필요 |
| - | 로그아웃 세션 DB 영속화 (index.ts:25) | 세션 저장소 마이그레이션 (인메모리 Set → Redis/PG 토큰 블랙리스트) 필요 |
| - | CineMap 실제 영상 렌더링 (ai-features.legacy.ts:599) | FFmpeg/Remotion 등 외부 렌더링 인프라 별도 도입 필요 |
| - | 전자서명 암호학적 구현 (escrowService.ts:247) | PKI/디지털서명 라이브러리 통합, 키 관리 인프라 필요 |
| - | Transfer 실송금 (portoneClient.ts:502) | TRANSFER_ENABLED 환경 + PortOne Transfer API 운영 계정 + KYC 검증 필요 |

## 🔁 코드 리뷰 반영 (Architect 피드백)

1. **T11 활성 라우트 보정** — `/api/posts` 실제 핸들러는 `server/routes.ts:1433`. 모더레이션 호출을 해당 위치에도 추가 (social.ts는 백업 경로로 유지).
2. **T5 역할 인자 보정** — `getBookingsByUser(userId, 'guest')` 또는 `getBookingsByGuest`로 호출 (이전 호출은 role 누락으로 호스트측 컬럼 매칭 실패).
3. **T4 동작 보장** — `receiptUrl`을 응답에 포함 (클라이언트 즉시 사용 가능), DB 저장은 best-effort. `payments.intentId` 미저장 흐름은 0건 정상 처리.
4. **T12 IDOR 방지** — `/api/ai/concierge/stream`에서 `channelId` 사용 시 `getChannelMembers`로 멤버십 확인 후 403 차단.

## 🧪 검증

- TypeScript 컴파일: **통과** (기존 무관 에러 `ProfileSettingsSection.tsx` 1건 제외)
- 서버 기동: **정상** — `▶/⏸️ Subscription renewal scheduler` 로그 표시 확인
- 글로벌 에러 핸들러 `throw err` 제거로 unhandledRejection 위험 제거

## 📌 운영 활성화 가이드

- **구독 자동 갱신 ON**: 운영 환경변수에 `SUBSCRIPTION_SCHEDULER_ENABLED=true` 설정 후 재배포
- **자동 모더레이션 ON**: `OPENAI_API_KEY` 존재 시 자동 활성 (이미 설정됨)
- **DB Admin 접근**: 이전 `?token=` 방식 차단 → 반드시 `Authorization: Bearer <JWT>` 헤더 사용
