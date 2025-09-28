import { useQuery } from '@tanstack/react-query';

export function useAuth() {
  // JWT 토큰 확인 (선택적)
  const token = localStorage.getItem('token');

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me', token],
    enabled: true, // 항상 활성화하여 세션 기반 인증도 확인
    retry: false,
    queryFn: async () => {
      // JWT 토큰이 있으면 Bearer 인증 시도
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include', // 세션 쿠키도 포함
        });

        if (response.ok) {
          return response.json();
        }
        
        // 토큰이 유효하지 않으면 로컬스토리지에서 제거
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      // JWT 토큰이 없거나 실패한 경우, 세션 기반 인증 시도
      const sessionResponse = await fetch('/api/auth/me', {
        credentials: 'include', // 세션 쿠키 포함
      });

      if (!sessionResponse.ok) {
        throw new Error('Not authenticated');
      }

      const userData = await sessionResponse.json();
      
      // 세션 인증은 성공했지만 JWT 토큰이 없는 경우, 토큰 생성 요청
      if (!token && userData) {
        try {
          const tokenResponse = await fetch('/api/auth/generate-token', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            localStorage.setItem('token', tokenData.token);
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('JWT 토큰 자동 생성 완료');
          }
        } catch (error) {
          console.warn('JWT 토큰 생성 실패:', error);
        }
      }

      return userData;
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
