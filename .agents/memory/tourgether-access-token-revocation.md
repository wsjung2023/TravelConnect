---
name: Tourgether 액세스 토큰 폐기 경로
description: revoked_tokens 테이블 기반 액세스 토큰 폐기 검사를 적용해야 하는 모든 진입 경로.
---

# 규칙

JWT 액세스 토큰을 검증하는 모든 경로는 `verifyToken` 직후 `tokenService.isAccessTokenRevoked(token)`을 호출해 폐기 여부를 확인해야 한다.

**Why:** 로그아웃 시 `/api/logout`이 `revokeAccessToken`으로 토큰을 DB에 영속 저장한다. 검사 누락 경로가 있으면 로그아웃된 토큰으로 그 경로만 계속 인증된다. (이전 architect 라운드에서 `authenticateToken/Hybrid`만 적용하고 `/db-admin`, 비공개 타임라인, WebSocket 인증 3곳을 빠뜨려 FAIL 판정 받음.)

**How to apply:** 새 인증 경로를 만들 때
- 가능하면 `authenticateToken` / `authenticateHybrid` 미들웨어를 쓴다 (자동 적용됨).
- 부득이하게 `verifyToken`을 직접 호출하면, 바로 다음에 `await isAccessTokenRevoked(token)` 체크를 추가하고 폐기 시 401을 반환한다.
- 로그아웃 흐름에서는 `revokeAccessToken(accessToken)`과 `revokeAllRefreshTokens(userId)`를 함께 호출한다. refresh를 빠뜨리면 잔존 refresh로 access 재발급이 가능해 폐기가 무의미해진다.
