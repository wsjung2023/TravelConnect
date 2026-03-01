// 인증 유틸리티 — JWT 토큰 저장·조회·삭제, 로컬 인증 상태 관리 헬퍼 함수 모음.
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
