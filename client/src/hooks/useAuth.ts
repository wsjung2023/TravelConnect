// 인증 훅 — 로그인 유저 정보(me), 로그인/로그아웃/회원가입 뮤테이션, 인증 상태를 제공하는 전역 훅.
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
// H-5: 쿠키 우선. tg_access 쿠키가 자동 송신되므로 Authorization 헤더는 레거시 localStorage 토큰이 있을 때만 폴백.
// 레거시 Bearer 성공 시 /api/auth/refresh/issue 호출로 쿠키 발급 → 이후 요청은 쿠키만 사용 (강제 로그아웃 없는 점진 마이그레이션).
let migrationInFlight = false;
async function migrateLegacyTokenToCookies(legacyToken: string): Promise<void> {
  if (migrationInFlight) return;
  migrationInFlight = true;
  try {
    const resp = await fetch('/api/auth/refresh/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${legacyToken}` },
      credentials: 'include',
    });
    if (resp.ok) {
      try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch {}
    }
  } catch {
    // 실패 시 다음 401 사이클에서 재시도되므로 조용히 무시
  } finally {
    migrationInFlight = false;
  }
}

async function fetchAuthUser(): Promise<any> {
  // OAuth 콜백 처리 (레거시: URL 쿼리스트링 토큰 → localStorage. 후속 OAuth 마이그레이션에서 정리 예정)
  const legacyToken = handleOAuthCallback();

  // 1차: 쿠키만으로 요청
  let response = await fetch('/api/auth/me', { credentials: 'include' });

  // 401이고 레거시 토큰이 있으면 Bearer로 폴백
  if (response.status === 401 && legacyToken) {
    response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${legacyToken}` },
      credentials: 'include',
    });
    if (response.ok) {
      // 레거시 Bearer가 살아있음 — 백그라운드로 쿠키 발급 받아 마이그레이션
      void migrateLegacyTokenToCookies(legacyToken);
    } else if (response.status === 401) {
      // 레거시 토큰이 만료되었으면 강제 로그아웃 전에 마지막으로 refresh 시도(쿠키 기반)
      // refresh가 성공하면 새 쿠키가 발급되므로 한 번 더 /me 요청.
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (refreshRes.ok) {
          response = await fetch('/api/auth/me', { credentials: 'include' });
        }
      } catch {}
    }
  }

  if (!response.ok) {
    // 인증 실패 시에만 레거시 토큰 정리 (재발급 경로를 모두 시도한 뒤)
    if (response.status === 401 && legacyToken) {
      try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch {}
    }
    return null;
  }

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
