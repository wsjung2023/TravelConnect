# server/routes — GUIDE

- 이 폴더는 기능별 Router 모듈만 둔다. (auth/admin/chat 등)
- 규칙:
  - 라우터 파일은 가능한 250줄 이하 유지. 400줄 초과 금지.
  - 새 파일 상단에 1줄 설명(// 또는 /** */) 필수.
  - routes.ts(레거시 거대 파일)에서 새 엔드포인트를 추가하지 말고, 여기로 만든다.
- 테스트:
  - npm run dev 후 해당 API 호출로 검증.
