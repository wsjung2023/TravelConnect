import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

// 인증 쿼리 키 (전체 앱에서 일관성 있게 사용)
export const AUTH_QUERY_KEY = ['/api/auth/me'] as const;

// URL 파라미터에서 OAuth 토큰 추출 및 저장
function handleOAuthCallback(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  const urlUser = urlParams.get('user');
  
  if (urlToken) {
    // URL에서 토큰을 찾으면 localStorage에 저장
    localStorage.setItem('token', urlToken);
    if (urlUser) {
      try {
        localStorage.setItem('user', urlUser);
      } catch (e) {
        console.warn('Failed to save user from URL');
      }
    }
    // URL에서 토큰 파라미터 제거 (깔끔한 URL 유지)
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return urlToken;
  }
  
  return localStorage.getItem('token');
}

// 인증 정보 가져오기 함수 (단일 요청)
async function fetchAuthUser(): Promise<any> {
  // OAuth 콜백에서 토큰 처리
  const token = handleOAuthCallback();
  
  // 단일 요청으로 통합 - JWT 우선, 세션 쿠키 포함
  const response = await fetch('/api/auth/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    // 401인 경우 토큰 정리
    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return null; // 인증되지 않음
  }

  const userData = await response.json();
  
  // 세션 인증 성공 but JWT 없으면 토큰 생성 (백그라운드)
  if (!token && userData) {
    fetch('/api/auth/generate-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      })
      .catch(() => {}); // 조용히 실패
  }

  return userData;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchAuthUser,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지 (중복 요청 방지)
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 방지
    retry: false,
    refetchOnMount: false, // 마운트 시 재요청 방지
    refetchOnWindowFocus: false, // 포커스 변경 시 재요청 방지
    refetchOnReconnect: false, // 네트워크 재연결 시 재요청 방지
  });

  // 로그아웃 시 캐시 초기화
  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
    clearAuth,
  };
}
