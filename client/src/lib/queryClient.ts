import { QueryClient, QueryFunction } from '@tanstack/react-query';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  console.log(`API 요청: ${options.method || 'GET'} ${url}`, options.body);

  // 토큰 가져오기
  const token = localStorage.getItem('token');
  console.log('토큰 상태:', token ? `있음 (${token.substring(0, 20)}...)` : '없음');

  const headers: HeadersInit = {
    ...options.headers,
  };

  // body가 있고 FormData가 아닌 경우 JSON으로 처리
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    // body가 이미 문자열이 아닌 경우에만 JSON.stringify 적용
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  console.log(`응답: ${res.status} ${res.statusText}`, {
    url,
    hasToken: !!token,
    method: options.method || 'GET'
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join('/') as string, {
      headers,
      credentials: 'include',
    });

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
