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
  console.log('=== 🚀 API 요청 시작 ===');
  console.log(`방법: ${options.method || 'GET'}`);
  console.log(`URL: ${url}`);
  console.log('옵션:', options);

  // 토큰 가져오기
  const token = localStorage.getItem('token');
  console.log('🔑 토큰 상태:', token ? `있음 (${token.substring(0, 20)}...)` : '❌ 없음');

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
    console.log('✅ Authorization 헤더 추가됨');
  } else {
    console.error('⚠️ 경고: 토큰이 없어서 Authorization 헤더를 추가할 수 없습니다!');
  }

  console.log('📝 최종 헤더들:', headers);

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials,
  };
  
  console.log('🌐 fetch 옵션:', fetchOptions);

  const res = await fetch(url, fetchOptions);

  console.log(`📋 응답: ${res.status} ${res.statusText}`);
  console.log('응답 세부:', {
    url,
    hasToken: !!token,
    method: options.method || 'GET',
    status: res.status
  });
  console.log('=== ✅ API 요청 완료 ===');

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
