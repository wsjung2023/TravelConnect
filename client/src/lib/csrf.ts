// CSRF 토큰 헬퍼 — tg_csrf 쿠키에서 토큰을 읽어 X-CSRF-Token 헤더로 송신하기 위한 유틸.
// Task #9: 쿠키 전용 인증 전환 시 api() 외부에서 직접 fetch하는 코드도 CSRF를 송신해야 함.
export function readCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const target = 'tg_csrf=';
  for (const part of document.cookie.split(';')) {
    const t = part.trim();
    if (t.startsWith(target)) return decodeURIComponent(t.slice(target.length));
  }
  return undefined;
}

export function withCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const csrf = readCsrfToken();
  if (!csrf) return headers;
  return { ...(headers as Record<string, string>), 'X-CSRF-Token': csrf };
}
