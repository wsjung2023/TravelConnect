// 인증 훅 — 로그인 유저 정보(me), 로그인/로그아웃/회원가입 뮤테이션, 인증 상태를 제공하는 전역 훅.
// Task #9: 레거시 localStorage 토큰 의존 제거. 쿠키 전용 인증.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// 인증 쿼리 키 (전체 앱에서 일관성 있게 사용)
export const AUTH_QUERY_KEY = ['/api/auth/me'] as const;

// OAuth 콜백: URL 쿼리스트링에 token이 오면 즉시 쿠키로 교환 후 URL 정리
// (Google/Replit OAuth는 후속 작업에서 서버단에서 직접 쿠키를 발급하도록 마이그레이션 예정)
let oauthExchangeInFlight: Promise<void> | null = null;
async function exchangeUrlTokenForCookies(): Promise<void> {
  if (typeof window === 'undefined') return;
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (!urlToken) return;

  if (oauthExchangeInFlight) return oauthExchangeInFlight;

  oauthExchangeInFlight = (async () => {
    try {
      // refresh/issue는 Bearer로 인증하면 새 access/refresh/csrf 쿠키를 발급한다.
      await fetch('/api/auth/refresh/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${urlToken}` },
        credentials: 'include',
      });
    } catch (err) {
      console.error('OAuth 토큰 → 쿠키 교환 실패:', err);
    } finally {
      // URL에서 token/user 파라미터 제거 (깔끔한 URL 유지)
      try {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch {}
    }
  })();

  return oauthExchangeInFlight;
}

async function fetchAuthUser(): Promise<any> {
  // OAuth 콜백 처리: URL 토큰이 있으면 쿠키로 교환한 뒤 /me 호출
  await exchangeUrlTokenForCookies();

  let response = await fetch('/api/auth/me', { credentials: 'include' });

  // 401이면 쿠키 기반 refresh 한 번 시도 (자연스러운 세션 갱신)
  if (response.status === 401) {
    try {
      // 쿠키 기반 refresh는 CSRF 검증 대상 — X-CSRF-Token 헤더 송신 필수.
      const { withCsrfHeader } = await import('@/lib/csrf');
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
      });
      if (refreshRes.ok) {
        response = await fetch('/api/auth/me', { credentials: 'include' });
      }
    } catch {}
  }

  if (!response.ok) return null;
  return await response.json();
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

  // 로그아웃 시 캐시 초기화 (쿠키는 서버 /api/auth/logout-secure에서 clearAuthCookies로 제거됨)
  const clearAuth = useCallback(() => {
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
