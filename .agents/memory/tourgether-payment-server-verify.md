---
name: Tourgether 결제 서버 검증
description: 클라이언트가 결제 성공을 알려와도 PortOne API로 다시 검증해야 하는 규칙
---

- `/api/billing/confirm-payment`(그리고 모든 비슷한 confirm 경로)는 `req.body`의 `paymentId`/`impUid`를 받아 **반드시** `portoneClient.getPayment(...)`로 PortOne에 재조회한다.
- 검증 통과 조건: `payment.success === true` AND `payment.status === 'PAID'`(또는 'paid'). amount는 클라이언트 입력이 아니라 서버 측 원장(`payments` 테이블에서 `intentId` 매칭 row의 `amount`)과 일치해야 함. 클라이언트가 보낸 expectedAmount만 신뢰하면 누락 시 우회됨.
- 두 개의 confirm-payment 구현이 있음: `server/routes/billing.ts`(미마운트)와 `server/routes/billing.legacy.ts`(활성). 보안 변경은 반드시 legacy 쪽에 반영해야 실제 적용된다.
- 실패 시 400을 반환하고 로그에 user/paymentId/사유를 남긴다. 200으로 `verified:true`를 돌려주면 안 된다.

**Why:** 2026-05-28 점검에서 confirm-payment가 PortOne 호출 없이 `{success:true, verified:true}`만 돌려주던 사실이 확인됐다(C-6, Critical). 클라이언트가 임의로 결제 ID를 만들어 전송하면 무료로 유료 서비스가 활성화되는 위험.

**How to apply:** 결제 확인·구독 활성화·정산 트리거 등 "결제됐다"는 신호로 동작이 분기되는 모든 핸들러에 같은 서버 검증을 적용. `expectedAmount`를 함께 받을 수 있으면 변조 방지에 더 안전.
