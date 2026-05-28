---
name: Tourgether 사용자 응답 sanitize 규칙
description: User 객체를 응답에 내보낼 때 반드시 password 등을 제거해야 하는 이유와 방법
---

- 어떤 엔드포인트든 `users` 테이블 row를 응답에 직접 노출하면 안 된다. `password`(이메일 로그인용 해시) 컬럼이 같이 빠져나간다.
- `server/utils/sanitizeUser.ts`의 `sanitizeUser(user)` / `sanitizeUsers(users)`를 사용해 `password`, `passwordHash`를 제거한 뒤 `res.json`에 넣는다.
- 새 사용자 조회 API를 만들 때 같은 규칙을 적용. 프로필 페이지의 명시적 select(필드 화이트리스트)도 안전한 대안이지만 코드 추가 비용이 크면 sanitizeUser 헬퍼가 우선.

**Why:** 2026-05-28 보안 점검에서 `server/routes/auth.ts:371` `GET /api/auth/user`와 `server/routes.ts:2173` `PATCH /api/user/profile`이 `res.json(user)`로 password hash까지 응답 본문에 포함하던 사실이 확인됨(High → 즉시 수정).

**How to apply:** users row를 응답에 포함시키는 모든 신규/기존 핸들러에 헬퍼 호출을 강제. PR/리뷰 시 `res.json(user)` 패턴 발견하면 자동 차단 대상으로 본다.
