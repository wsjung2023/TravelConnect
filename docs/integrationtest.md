# Tourgether 결제 시스템 통합 테스트 가이드

**작성일**: 2025년 12월 5일  
**버전**: Phase 2 완료

---

## 1. Phase 2 구현 완료 상태

### 1.1 PortOne V2 클라이언트 (`server/services/portoneClient.ts`)

| 기능 | 메서드 | 상태 | 설명 |
|------|--------|------|------|
| 결제 생성 | `createPayment()` | ✅ 완료 | 1회성 결제 생성 |
| 빌링키 결제 | `createPaymentWithBillingKey()` | ✅ 완료 | 정기결제용 |
| 결제 조회 | `getPayment()` | ✅ 완료 | 결제 상태 확인 |
| 결제 취소 | `cancelPayment()` | ✅ 완료 | 전체/부분 환불 |
| 빌링키 조회 | `getBillingKey()` | ✅ 완료 | 카드 정보 포함 |
| 빌링키 삭제 | `deleteBillingKey()` | ✅ 완료 | 정기결제 해지용 |
| 웹훅 검증 | `verifyWebhookSignature()` | ✅ 완료 | HMAC-SHA256 |

### 1.2 에스크로 서비스 (`server/services/escrowService.ts`)

| 기능 | 메서드 | 상태 | 설명 |
|------|--------|------|------|
| 계약 생성 | `createContract()` | ✅ 완료 | 단계별 결제 구조 |
| 결제 시작 | `initiateStagePayment()` | ✅ 완료 | PortOne 결제 준비 |
| 결제 완료 | `handlePaymentComplete()` | ✅ 완료 | 에스크로 동결 |
| 서비스 완료 | `confirmServiceComplete()` | ✅ 완료 | 가이드 완료 확인 |
| 분쟁 제기 | `raiseDispute()` | ✅ 완료 | 분쟁 상태 전환 |
| 계약 취소 | `cancelContract()` | ✅ 완료 | 미완료 단계 취소 |
| 환불 처리 | `processRefund()` | ✅ 완료 | PortOne 연동 환불 |
| 에스크로 해제 | `releaseEscrow()` | ✅ 완료 | 정산금 지급 |
| 출금 처리 | `processPayoutWithdrawal()` | ✅ 완료 | 은행 송금 처리 |
| 출금 완료 | `confirmPayoutCompleted()` | ✅ 완료 | 정산 완료 확인 |

### 1.3 빌링 API 엔드포인트

| 엔드포인트 | 메서드 | 상태 | 설명 |
|------------|--------|------|------|
| `/api/billing/plans` | GET | ✅ 완료 | 요금제 목록 |
| `/api/billing/subscription` | GET | ✅ 완료 | 현재 구독 조회 |
| `/api/billing/subscription` | POST | ✅ 완료 | 구독 신청 |
| `/api/billing/subscription` | DELETE | ✅ 완료 | 구독 해지 |
| `/api/billing/trip-pass` | POST | ✅ 완료 | Trip Pass 구매 |
| `/api/contracts/:id/initiate-payment` | POST | ✅ 완료 | 계약 결제 시작 |
| `/api/contracts/:id/confirm-payment` | POST | ✅ 완료 | 결제 완료 확인 |
| `/api/contracts/:id/complete` | POST | ✅ 완료 | 서비스 완료 |
| `/api/contracts/:id/cancel` | POST | ✅ 완료 | 계약 취소 |
| `/api/contracts/:id/dispute` | POST | ✅ 완료 | 분쟁 제기 |
| `/api/contracts/:id/release` | POST | ✅ 완료 | 에스크로 해제 |
| `/api/payouts` | GET | ✅ 완료 | 정산 내역 |
| `/api/escrow-account` | GET | ✅ 완료 | 에스크로 계좌 |
| `/api/webhooks/portone` | POST | ✅ 완료 | 웹훅 수신 |

---

## 2. 웹훅 보안 테스트

### 2.1 보안 체크리스트

| 보안 요소 | 상태 | 구현 내용 |
|-----------|------|----------|
| 헤더 검증 | ✅ | `x-portone-signature`, `x-portone-webhook-id`, `x-portone-timestamp` 필수 |
| HMAC 검증 | ✅ | `HMAC-SHA256(webhookId.timestamp.payload, secret)` |
| 타임스탬프 검증 | ✅ | 5분 이내 요청만 허용 |
| 재전송 방지 | ✅ | webhookId 10분 TTL 캐시로 중복 방지 |
| 프로덕션 강제 | ✅ | `NODE_ENV=production`에서 `PORTONE_WEBHOOK_SECRET` 필수 |

### 2.2 웹훅 테스트 케이스

```bash
# 1. 정상 웹훅 (서명 유효)
curl -X POST http://localhost:5000/api/webhooks/portone \
  -H "Content-Type: application/json" \
  -H "x-portone-signature: <valid_signature>" \
  -H "x-portone-webhook-id: webhook_123" \
  -H "x-portone-timestamp: $(date +%s)" \
  -d '{"type":"Transaction.Paid","data":{"paymentId":"pay_123"}}'
# 예상: 200 OK

# 2. 헤더 누락
curl -X POST http://localhost:5000/api/webhooks/portone \
  -H "Content-Type: application/json" \
  -d '{"type":"Transaction.Paid"}'
# 예상: 400 Bad Request (Missing required webhook headers)

# 3. 잘못된 서명 (프로덕션)
curl -X POST http://localhost:5000/api/webhooks/portone \
  -H "Content-Type: application/json" \
  -H "x-portone-signature: invalid_sig" \
  -H "x-portone-webhook-id: webhook_123" \
  -H "x-portone-timestamp: $(date +%s)" \
  -d '{"type":"Transaction.Paid"}'
# 예상: 401 Unauthorized (NODE_ENV=production 시)

# 4. 중복 webhookId
# 동일 webhookId로 2번 요청 시 두 번째는:
# 예상: 200 OK { received: true, duplicate: true }

# 5. 만료된 타임스탬프
curl -X POST http://localhost:5000/api/webhooks/portone \
  -H "x-portone-timestamp: 1609459200" \
  ...
# 예상: 401 Unauthorized (Timestamp expired)
```

---

## 3. 에스크로 플로우 테스트

### 3.1 정상 플로우 (Happy Path)

```
1. 계약 생성
   POST /api/contracts
   → contract.status = 'pending'
   → stages: [deposit(30%), final(70%)]

2. 계약금 결제
   POST /api/contracts/:id/initiate-payment { stageId: 'deposit' }
   → 프론트엔드에서 PortOne SDK 호출
   POST /api/contracts/:id/confirm-payment { stageId, portonePaymentId }
   → stage.status = 'paid', escrowTransaction.status = 'frozen'

3. 서비스 제공

4. 잔금 결제
   (계약금과 동일 플로우)

5. 서비스 완료 확인
   POST /api/contracts/:id/complete (가이드)
   → contract.status = 'completed'

6. 에스크로 해제
   POST /api/contracts/:id/release (여행자)
   → escrowTransactions.status = 'released'
   → payout 생성 (가이드 88%, 플랫폼 12%)

7. 정산 완료
   → payout.status = 'completed'
   → 가이드 은행 계좌로 송금
```

### 3.2 취소 플로우

```
1. 계약 취소 (결제 전)
   POST /api/contracts/:id/cancel
   → contract.status = 'cancelled'
   → 모든 pending 단계 cancelled

2. 환불 (결제 후)
   POST /api/admin/billing/refund { contractId, refundAmount, reason }
   → PortOne 환불 API 호출
   → escrowTransaction.status = 'refunded'
```

### 3.3 분쟁 플로우

```
1. 분쟁 제기
   POST /api/contracts/:id/dispute { reason }
   → contract.status = 'disputed'
   
2. 관리자 중재
   (수동 처리)
   
3. 해결
   → 환불 or 정산 진행
```

---

## 4. 플랫폼 수수료 테스트

### 4.1 수수료 계산

```typescript
const PLATFORM_FEE_RATE = 0.12; // 12%

// 예: 100,000원 서비스
totalAmount = 100000;
platformFee = Math.floor(totalAmount * 0.12); // 12,000원
guideAmount = totalAmount - platformFee;       // 88,000원
```

### 4.2 검증 포인트

- [ ] `escrowTransactions.platformFee`에 수수료 저장
- [ ] `payouts.platformFee`에 수수료 저장
- [ ] `payouts.amount`는 가이드 정산금 (수수료 제외)
- [ ] 에스크로 계좌 잔액 업데이트

---

## 5. 환경 변수 설정

### 5.1 필수 환경 변수

| 변수명 | 설명 | 프로덕션 필수 |
|--------|------|--------------|
| `PORTONE_API_SECRET` | PortOne API 시크릿 | ✅ |
| `PORTONE_STORE_ID` | 상점 ID | ✅ |
| `PORTONE_WEBHOOK_SECRET` | 웹훅 검증 시크릿 | ✅ |
| `PORTONE_CHANNEL_KEY` | 결제 채널 키 | ✅ |

### 5.2 개발 환경 동작

- `PORTONE_WEBHOOK_SECRET` 미설정 시: 웹훅 서명 검증 스킵 (경고 로그)
- `NODE_ENV !== 'production'` 시: 일부 검증 완화

---

## 6. 알려진 제한 사항

### 6.1 현재 미구현 (Phase 3 예정)

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 정기결제 스케줄링 | PortOne 스케줄 API 연동 | 중 |
| 멀티 인스턴스 중복 방지 | Redis 기반 idempotency | 중 |
| 자동 정산 처리 | 배치 정산 스케줄러 | 낮음 |

### 6.2 프론트엔드 연동 필요

| 기능 | 엔드포인트 | 프론트 작업 |
|------|-----------|------------|
| 빌링키 발급 | N/A (SDK) | PortOne SDK 호출 |
| 결제창 호출 | N/A (SDK) | PortOne SDK 호출 |
| 구독 UI | `/api/billing/*` | 구독 관리 페이지 |
| 계약 결제 | `/api/contracts/*` | 계약 결제 플로우 |

---

## 7. 다음 단계 (Phase 3)

### 7.1 프론트엔드 결제 통합

1. PortOne JavaScript SDK 설치
2. 빌링키 발급 UI
3. 결제창 호출 로직
4. 결제 완료 콜백 처리
5. 구독 관리 페이지

### 7.2 백엔드 보완

1. 정기결제 스케줄 등록/갱신
2. 결제 실패 재시도 로직
3. 자동 정산 배치 처리
4. 통계/리포트 API

---

## 8. 테스트 체크리스트

### 8.1 API 테스트

- [ ] 구독 생성 (billingKeyId 필수)
- [ ] 구독 조회
- [ ] 구독 해지
- [ ] Trip Pass 구매
- [ ] 계약 생성
- [ ] 계약 결제 시작
- [ ] 계약 결제 확인
- [ ] 서비스 완료
- [ ] 에스크로 해제
- [ ] 분쟁 제기
- [ ] 계약 취소
- [ ] 환불 처리

### 8.2 웹훅 테스트

- [ ] Transaction.Paid 처리
- [ ] Transaction.Cancelled 처리
- [ ] Transaction.Failed 처리
- [ ] BillingKey.Issued 처리
- [ ] BillingKey.Deleted 처리
- [ ] 서명 검증 실패 시 거부
- [ ] 중복 webhookId 방지
- [ ] 만료 타임스탬프 거부

### 8.3 에스크로 테스트

- [ ] 단계별 결제 처리
- [ ] 플랫폼 수수료 계산
- [ ] 정산금 계산
- [ ] 에스크로 해제
- [ ] 출금 처리
- [ ] 환불 처리

---

## 9. Phase 5: AI 사용량 제한

### 9.1 구현 완료 상태

| 기능 | 상태 | 설명 |
|------|------|------|
| checkAiUsage 미들웨어 | ✅ 완료 | Trip Pass 및 Free tier 제한 적용 |
| Mini Concierge 제한 | ✅ 완료 | `concierge` 사용량 타입 |
| AI Concierge 제한 | ✅ 완료 | `ai_message` 사용량 타입 |
| CineMap 제한 | ✅ 완료 | `ai_message` 사용량 타입 |
| Translation 제한 | ✅ 완료 | `translation` 사용량 타입 |
| 사용량 조회 API | ✅ 완료 | `/api/billing/usage` |

### 9.2 Free Tier 기본 한도 (월별)

| 사용량 타입 | 한도 | 적용 서비스 |
|------------|------|------------|
| `ai_message` | 5회 | AI Concierge, CineMap |
| `translation` | 10회 | DM 번역 |
| `concierge` | 3회 | Mini Concierge |

### 9.3 사용량 체크 플로우

```
요청 → 인증 확인 → Admin 여부 확인
                          ↓ (Admin = bypass)
                    Trip Pass 확인
                          ↓
            ┌─────────────┴─────────────┐
            │ Trip Pass 있음            │ Trip Pass 없음
            │                           │
            ↓                           ↓
      Trip Pass 한도 체크         Free tier 한도 체크
            │                           │
     ┌──────┴──────┐             ┌──────┴──────┐
     │ 한도 내     │ 한도 초과    │ 한도 내     │ 한도 초과
     │             │              │             │
     ↓             ↓              ↓             ↓
   사용량 +1    402 응답       사용량 +1    402 응답
     │                           │
     ↓                           ↓
   요청 진행                   요청 진행
```

### 9.4 402 응답 형식

**Trip Pass 한도 초과:**
```json
{
  "message": "Trip Pass limit exceeded",
  "code": "TRIP_PASS_LIMIT_EXCEEDED",
  "usageType": "ai_message",
  "limit": 100,
  "used": 100,
  "suggestion": "Please purchase a new Trip Pass to continue using this feature"
}
```

**Free tier 한도 초과:**
```json
{
  "message": "Free tier limit exceeded",
  "code": "FREE_LIMIT_EXCEEDED",
  "usageType": "ai_message",
  "limit": 5,
  "used": 5,
  "suggestion": "Purchase a Trip Pass to unlock more AI features",
  "periodEnd": "2025-12-31T23:59:59.000Z"
}
```

### 9.5 사용량 조회 API

**엔드포인트:** `GET /api/billing/usage`

**Trip Pass 보유 시 응답:**
```json
{
  "source": "trip_pass",
  "tripPassId": 123,
  "validUntil": "2026-01-01T00:00:00.000Z",
  "limits": {
    "ai_message": { "limit": 100, "used": 25, "remaining": 75 },
    "translation": { "limit": 200, "used": 50, "remaining": 150 },
    "concierge": { "limit": 50, "used": 10, "remaining": 40 }
  }
}
```

**Free tier 응답:**
```json
{
  "source": "free_tier",
  "limits": {
    "ai_message": { "limit": 5, "used": 2, "remaining": 3, "periodEnd": "2025-12-31" },
    "translation": { "limit": 10, "used": 5, "remaining": 5, "periodEnd": "2025-12-31" },
    "concierge": { "limit": 3, "used": 1, "remaining": 2, "periodEnd": "2025-12-31" }
  }
}
```

### 9.6 테스트 체크리스트

- [ ] Free tier 사용량 초과 시 402 반환
- [ ] Free tier 사용량 정상 증가
- [ ] Trip Pass 사용량 초과 시 402 반환
- [ ] Trip Pass 사용량 정상 증가
- [ ] Admin 사용자 bypass 확인
- [ ] `/api/billing/usage` 응답 형식 확인
- [ ] 월별 사용량 리셋 확인
