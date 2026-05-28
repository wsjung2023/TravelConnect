---
name: Tourgether 라우트 이중성
description: routes.ts (활성)와 routes/*.ts (일부 미연결) 양쪽에 같은 경로 핸들러가 존재할 수 있음
---

# Tourgether — 라우트 이중성 주의

`server/routes.ts`는 historically 거대한 단일 파일이며 `/api/posts` 등 핵심 엔드포인트의 **활성** 핸들러가 여기 있다.
같은 경로(예: `POST /posts`)가 `server/routes/social.ts` 같은 모듈에도 존재하지만, 라우터가 실제 마운트되지 않거나 routes.ts가 먼저 매칭해 그림자가 될 수 있다.

**How to apply:**
- 신규 보안 검사(모더레이션·인증·rate limit)는 routes.ts의 활성 핸들러에 반드시 추가하고, 모듈 쪽 핸들러는 백업/마이그레이션 대상으로만 취급.
- 마커(FIXME-TODO) 처리 시 마커 위치가 활성 라우트인지 grep으로 먼저 확인 (`app.post('/api/...'` 검색).

**Why:** 모듈 쪽에만 보안 검사를 추가하면 실제 트래픽에 적용되지 않아 보안 우회가 발생.
