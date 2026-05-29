---
name: Tourgether Critical C-1/C-2/C-3 검증 완료
description: 감사 보고서가 미수정으로 표기했던 3대 Critical이 실제 코드엔 이미 해결됨 — 재추적 금지
---

# Tourgether — C-1/C-2/C-3는 이미 해결됨 (보고서 표기가 stale였음)

CODE_AUDIT_REPORT.md가 오래도록 "❌ 미수정"으로 표기했으나 2026-05-29 코드 정독 결과 3건 모두 해결 상태.

- **C-1 댓글 오퍼 IDOR** (`PATCH /api/comments/:id/offer-status`): 핸들러가 댓글→포스트 조회 후 `post.userId !== userId`면 403. 포스트 작성자만 변경.
- **C-2 Admin Raw SQL / db-admin**: 운영 환경 미들웨어가 `/db-admin`,`/api/sql`,`/download_backup`,`/simple_download`를 403 차단(`server/index.ts`). dev `/db-admin`은 Bearer admin 인증+폐기토큰 차단. `sql.raw` 실행 핸들러 자체가 코드에 없음.
- **C-3 타임라인 무인증 조회** (`GET /api/timelines/:id`): 공개 타임라인만 무인증 허용, 비공개는 토큰 필수+본인(`decoded.id === timeline.userId`)+폐기토큰 차단.

**Why:** 보고서/이전 메모리의 "잔여 위험 C-1/C-2/C-3"는 stale 정보. 라인 번호도 옛 값(1685/424/1116)이라 신뢰 금지.
**How to apply:** 이 3건을 "다시 고쳐야 할 위험"으로 재제안하지 말 것. 의심되면 위 실제 위치를 grep으로 직접 확인.
