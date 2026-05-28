---
name: Tourgether refresh 토큰 회전
description: refresh 토큰 회전·reuse 감지·쿠키 파싱의 비명시적 제약과 그 이유
---

- `rotateRefreshToken`은 다음 3단계로 동작한다:
  1. tokenHash로 row 조회 → 없으면 null.
  2. row.revokedAt이 이미 채워져 있으면 **재사용(탈취) 시도**로 간주하고 `revokeAllRefreshTokens(userId)` 호출 후 null.
  3. 새 토큰 발급은 `db.transaction` 안에서 조건부 UPDATE(`revokedAt IS NULL`) → 같은 raw token으로 동시에 들어온 두 요청 중 한 쪽만 회전을 받고 나머지는 null을 받는다.

**Why:** 폐기·발급이 두 개 쿼리로 떨어져 있으면 두 동시 요청이 같은 raw 토큰으로 두 개의 신규 토큰을 받을 수 있다(race). 조건부 UPDATE의 returning이 비어 있으면 다른 회전이 이미 끝났다는 신호이므로 그 요청은 신규 토큰을 만들지 않는다.

**How to apply:** refresh 흐름에 새 단계를 추가할 때 `rotateRefreshToken` 내부 트랜잭션을 깨지 마라. reuse 감지에 의존하는 보안 모델이므로 "revokedAt 무시하고 그냥 재발급" 같은 단축 경로 금지.

- cookie-parser는 **미설치**다. `req.cookies`를 직접 쓰지 말고 `server/routes/auth-extended.ts`의 `readCookie(req, name)` 헬퍼처럼 `req.headers.cookie`를 직접 파싱한다.

**Why:** packager로만 설치 가능한 환경에서 무리하게 새 의존성을 추가하지 않기 위한 의도적 선택.
