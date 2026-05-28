// API 클라이언트 유틸 — fetch 기반 공통 API 요청 함수. 쿠키 전용 인증(httpOnly tg_access) + 상태변경 시 CSRF 헤더 송신.
// Task #9: 레거시 localStorage Bearer 폴백 완전 제거. 모든 인증은 쿠키 기반.
//  - 기본: Authorization 헤더 미송신. credentials:'include'로 tg_access 쿠키 자동 송신.
//  - 상태 변경 메서드: 쿠키(tg_csrf) 값을 X-CSRF-Token 헤더로 송신 (double-submit).
//  - 401 발생 시: /api/auth/refresh (쿠키 기반 회전) 1회 시도 후 재시도.

function readBrowserCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const target = name + '=';
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) return decodeURIComponent(trimmed.slice(target.length));
  }
  return undefined;
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function attachCsrfHeader(headers: Record<string, string>, method: string): void {
  if (!STATE_CHANGING.has(method)) return;
  const csrf = readBrowserCookie('tg_csrf');
  if (csrf) headers["X-CSRF-Token"] = csrf;
}

export async function api(url: string, opts: { method?: string; body?: any; auth?: boolean } = {}) {
  const { method = "GET", body, auth = true } = opts;
  const methodUpper = method.toUpperCase();
  const isFormData = body instanceof FormData;

  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (auth) attachCsrfHeader(headers, methodUpper);
    return headers;
  };

  const baseFetchOptions: RequestInit = {
    method,
    credentials: "include",
  };
  if (body) baseFetchOptions.body = isFormData ? body : JSON.stringify(body);

  // 1차: 쿠키 기반 인증
  let res = await fetch(url, { ...baseFetchOptions, headers: buildHeaders() });

  // 401 → 쿠키 기반 refresh 회전 1회 시도
  if (res.status === 401 && auth && url !== '/api/auth/generate-token' && url !== '/api/auth/refresh' && url !== '/api/auth/refresh/issue') {
    try {
      // 쿠키 기반 refresh도 상태 변경 메서드이므로 CSRF 헤더 송신 필수.
      const refreshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      attachCsrfHeader(refreshHeaders, 'POST');
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: refreshHeaders,
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // 쿠키가 회전됨 — 원래 요청 재시도 (회전된 CSRF 토큰 포함)
        res = await fetch(url, { ...baseFetchOptions, headers: buildHeaders() });
      }
    } catch (error) {
      console.error('토큰 재발급 실패:', error);
    }
  }

  const ct = res.headers.get("content-type") || "";
  const out = ct.includes("application/json") ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
  if (!res.ok) throw new Error(typeof out === "string" ? `${res.status} ${out}` : (out?.message || `${res.status}`));
  return out;
}
