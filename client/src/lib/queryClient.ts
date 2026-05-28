// TanStack Query 클라이언트 설정 — QueryClient 인스턴스와 기본 fetch 함수(apiRequest)를 설정한다.
import { QueryClient, QueryFunction } from '@tanstack/react-query';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Deprecated: Use api() from @/lib/api instead
type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiRequest(
  url: string,
  options: ApiRequestOptions = {}
): Promise<any> {
  // 호환성을 위해 api() 함수 사용
  const { api } = await import('@/lib/api');
  const method = options.method || 'GET';
  const body = options.body
    ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body)
    : undefined;
  
  const result = await api(url, { method, body });
  
  // Response 객체처럼 보이게 만들기 (호환성)
  return {
    json: () => Promise.resolve(result),
    ok: true,
    status: 200,
    statusText: 'OK'
  };
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // H-5: 쿠키 우선. credentials:'include'로 tg_access 자동 송신. GET이라 CSRF 불필요.
    // 레거시 localStorage Bearer는 쿠키 인증이 401일 때만 폴백으로 사용 (점진 마이그레이션).
    const headers: HeadersInit = {};
    let res = await fetch(queryKey.join('/') as string, {
      headers,
      credentials: 'include',
    });
    if (res.status === 401) {
      const legacy = (() => { try { return localStorage.getItem('token'); } catch { return null; } })();
      if (legacy) {
        res = await fetch(queryKey.join('/') as string, {
          headers: { Authorization: `Bearer ${legacy}` },
          credentials: 'include',
        });
      }
    }

    if (unauthorizedBehavior === 'returnNull' && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
