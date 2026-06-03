---
name: Tourgether Vite 버전 상한
description: Vite는 v6까지만 사용 가능 — v7/v8로 올리면 프리뷰 무한 에러 루프
---

# Vite 버전은 v6가 상한

`vite`는 반드시 `^6`에 고정한다. v7/v8로 올리지 말 것.

**Why:** Replit 플러그인(`@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`)과 `@tailwindcss/vite`가 Vite 5–6만 지원한다. Vite 8에서는 error-overlay 플러그인의 `hot.send()`가 undefined가 되어 전역 에러 핸들러 안에서 throw → 무한 에러 루프 발생 → 프리뷰가 CPU를 100% 점유하고 프로젝트가 느려진다.

**How to apply:** Vite 버전을 바꿔야 하면 패키지 매니저로만(`installLanguagePackages`, package.json 직접 수정 금지) 처리하고 `^6`을 넘기지 않는다. `npm ls vite`에서 `@tailwindcss/vite`/`@vitejs/plugin-react`가 모두 같은 v6로 deduped 되고 "invalid" 경고가 없어야 정상. 변경 후 워크플로우 재시작 + 로그에서 에러 루프 없음 확인.
