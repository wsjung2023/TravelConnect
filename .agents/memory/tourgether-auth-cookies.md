---
name: Tourgether 인증 쿠키 + CSRF
description: 액세스/리프레시 토큰을 httpOnly 쿠키로 발급하면서 레거시 localStorage Bearer 흐름과 공존시키는 듀얼 모드 인증 구조와 CSRF 규칙.
---

## 발급 모델
서버는 로그인/회원가입/refresh 시 세 개의 쿠키를 항상 함께 발급한다: `tg_access`(HttpOnly, Path=/, 7d), `tg_refresh`(HttpOnly, Path=/api/auth, 30d), `tg_csrf`(non-HttpOnly, double-submit용). 응답 JSON에 토큰 필드를 그대로 포함하는 건 OAuth 콜백 등 레거시 호환용일 뿐, **신규 로그인 클라이언트는 응답 본문 토큰을 저장하지 않는다.**

## 인증/CSRF 정책
`authenticateToken`/`authenticateHybrid`는 Authorization Bearer 헤더가 없으면 `tg_access` 쿠키로 폴백한다. **쿠키로 인증된 경우에 한해** 상태 변경 메서드(POST/PUT/PATCH/DELETE)에 X-CSRF-Token 헤더와 `tg_csrf` 쿠키 값을 timing-safe 비교한다. Bearer 인증은 CSRF 면제(자동 송신되지 않으므로 CSRF 표면이 없음).

## 클라이언트 정책 (쿠키 우선)
`api.ts`/`queryClient.ts`/`useAuth.ts`는 기본적으로 Authorization 헤더를 송신하지 않고 `credentials:'include'`로 쿠키만 보낸다. 401이 떨어지면 ① `/api/auth/refresh` (쿠키 기반 회전) → ② 그래도 401이고 `localStorage.token`이 남아 있으면 그 토큰으로 1회 재시도 + 백그라운드로 `/api/auth/refresh/issue`(authenticateHybrid → Bearer 허용 → 쿠키 발급) 호출 후 `localStorage` 정리. 이 마이그레이션 경로 덕분에 기존 사용자는 첫 401 한 번만 겪고 자동 전환된다.

**Why:** 기존 활성 세션을 강제 로그아웃하지 않으면서 XSS 토큰 탈취 위험을 점진적으로 줄여야 한다. localStorage Bearer 경로를 곧장 제거하면 모든 활성 사용자가 로그아웃되고, 거꾸로 신규 로그인까지 localStorage에 저장하면 쿠키 도입의 의미가 사라진다.

**How to apply:**
- 새 인증 엔드포인트를 만들면 `server/utils/cookies.ts`의 `setAuthCookies`/`clearAuthCookies`를 반드시 사용. 직접 `res.cookie('tg_*', ...)` 호출 금지(옵션 누락 위험).
- 로그아웃 흐름(`/api/logout`, `/api/auth/logout-secure`)에서는 Bearer **와** 쿠키 액세스 토큰을 **둘 다** `revokeAccessToken`으로 폐기해야 한다 — 한쪽만 폐기하면 다른 쪽으로 우회 가능.
- `/api/auth/refresh`는 `routes/auth.ts`와 `routes/auth-extended.ts` 양쪽에 등록되어 있고 authRouter가 먼저 mount되므로 전자가 우선. 둘 다 동일하게 세 쿠키를 회전해야 한다.
- 클라이언트 전역 fetch 인터셉터(`client/src/lib/fetchInterceptor.ts`, `main.tsx`에서 부팅 시 설치)가 동일 출처 상태 변경 요청에 자동으로 `X-CSRF-Token`(tg_csrf 쿠키 값)과 `credentials:'include'`를 부착한다. 따라서 직접 `fetch`를 호출하는 hooks(useFeedController 등)도 추가 작업 없이 동작한다. 호출자가 직접 헤더를 set한 경우엔 인터셉터가 덮어쓰지 않는다.
- 새 로그인/회원가입 UI는 절대 `localStorage.setItem('token'/'user', ...)`을 호출하지 않는다 — 쿠키가 이미 권위 있는 상태. OAuth 콜백(URL 쿼리스트링 토큰 → localStorage)만이 마지막으로 남아 있는 레거시 작성 지점.
- 쿠키 path 분리 주의: `tg_refresh`는 `/api/auth`에만 송신되므로 다른 라우트에서 refresh 토큰을 직접 읽으려 하면 안 됨.
