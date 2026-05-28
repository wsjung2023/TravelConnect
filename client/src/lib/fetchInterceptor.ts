// 전역 fetch 인터셉터 — 동일 출처 상태 변경 요청에 자동으로 X-CSRF-Token 헤더와 credentials를 부착한다.
// H-5: 쿠키 기반 인증 도입 후 useFeedController 등 다수의 직접 fetch 호출이 CSRF를 송신하지 않아 403을 받는 문제를 한 곳에서 해결.

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const target = name + '=';
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) return decodeURIComponent(trimmed.slice(target.length));
  }
  return undefined;
}

function isSameOrigin(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function installFetchInterceptor(): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  if (w.__tgFetchPatched) return;
  w.__tgFetchPatched = true;

  const origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    if (!isSameOrigin(url)) {
      return origFetch(input as any, init);
    }

    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    // 동일 출처 요청은 항상 쿠키 송신
    const merged: RequestInit = { ...init };
    if (merged.credentials === undefined) merged.credentials = 'include';

    // 상태 변경 메서드에 X-CSRF-Token 자동 부착 (이미 있으면 유지)
    if (STATE_CHANGING.has(method)) {
      const csrf = readCookie('tg_csrf');
      if (csrf) {
        const headers = new Headers(merged.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', csrf);
        merged.headers = headers;
      }
    }

    return origFetch(input as any, merged);
  };
}
