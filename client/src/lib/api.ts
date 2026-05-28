// API 클라이언트 유틸 — fetch 기반 공통 API 요청 함수. 쿠키 우선 인증(httpOnly tg_access) + 상태변경 시 CSRF 헤더 송신.
// H-5 (쿠키 우선, 레거시 localStorage Bearer는 호환용 폴백):
//  - 기본: Authorization 헤더 미송신. credentials:'include'로 tg_access 쿠키 자동 송신.
//  - 상태 변경 메서드: 쿠키(tg_csrf) 값을 X-CSRF-Token 헤더로 송신 (double-submit).
//  - 401 발생 시: ① /api/auth/refresh (쿠키 기반 회전) → ② 실패하고 레거시 localStorage 토큰이 있으면 Bearer로 1회 재시도 + 백그라운드에서
//    /api/auth/refresh/issue 호출해 쿠키로 마이그레이션 (이후 요청부터는 쿠키만 사용).

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

// 레거시 Bearer 토큰을 쿠키로 마이그레이션(백그라운드, 한 번만). 성공하면 localStorage를 정리한다.
let migrationInFlight = false;
async function migrateLegacyTokenToCookies(legacyToken: string): Promise<void> {
  if (migrationInFlight) return;
  migrationInFlight = true;
  try {
    const resp = await fetch('/api/auth/refresh/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${legacyToken}`,
      },
      credentials: 'include',
    });
    if (resp.ok) {
      // 마이그레이션 성공 — 이후 요청은 쿠키만으로 인증. 레거시 토큰 제거.
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
    }
  } catch {
    // 실패해도 다음 401 사이클에서 다시 시도되므로 조용히 무시
  } finally {
    migrationInFlight = false;
  }
}

function attachCsrfHeader(headers: Record<string, string>, method: string): void {
  if (!STATE_CHANGING.has(method)) return;
  const csrf = readBrowserCookie('tg_csrf');
  if (csrf) headers["X-CSRF-Token"] = csrf;
}

export async function api(url: string, opts: { method?: string; body?: any; auth?: boolean } = {}) {
  const { method = "GET", body, auth = true } = opts;
  const methodUpper = method.toUpperCase();
  const isFormData = body instanceof FormData;

  const buildHeaders = (bearer?: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (auth) attachCsrfHeader(headers, methodUpper);
    if (auth && bearer) headers["Authorization"] = `Bearer ${bearer}`;
    return headers;
  };

  const baseFetchOptions: RequestInit = {
    method,
    credentials: "include",
  };
  if (body) baseFetchOptions.body = isFormData ? body : JSON.stringify(body);

  // 1차: 쿠키 기반 인증 (Authorization 헤더 미송신)
  let res = await fetch(url, { ...baseFetchOptions, headers: buildHeaders() });

  // 401 → 토큰 재발급 시도
  if (res.status === 401 && auth && url !== '/api/auth/generate-token' && url !== '/api/auth/refresh' && url !== '/api/auth/refresh/issue') {
    try {
      // (a) 쿠키 기반 refresh 회전
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // 쿠키가 회전됨 — 원래 요청 재시도 (회전된 CSRF 토큰 포함)
        res = await fetch(url, { ...baseFetchOptions, headers: buildHeaders() });
      } else {
        // (b) 레거시 localStorage Bearer 토큰이 남아 있으면 그것으로 1회 재시도 + 쿠키로 마이그레이션
        const legacyToken = (() => { try { return localStorage.getItem('token') || undefined; } catch { return undefined; } })();
        if (legacyToken) {
          res = await fetch(url, { ...baseFetchOptions, headers: buildHeaders(legacyToken) });
          if (res.ok) {
            // 백그라운드 마이그레이션 (응답 가로채지 않음)
            void migrateLegacyTokenToCookies(legacyToken);
          }
        }
      }
    } catch (error) {
      console.error('토큰 재발급/마이그레이션 실패:', error);
    }
  }

  const ct = res.headers.get("content-type") || "";
  const out = ct.includes("application/json") ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
  if (!res.ok) throw new Error(typeof out === "string" ? `${res.status} ${out}` : (out?.message || `${res.status}`));
  return out;
}
