# server/middleware — GUIDE

- 이 폴더는 Express middleware만 둔다.
- 규칙:
  - 미들웨어는 side-effect 최소화.
  - 인증/권한/요금제/AI 사용량 같은 cross-cutting concern만.
  - 에러는 next(err) 또는 통일된 에러 응답으로 처리.
