import { useQuery } from '@tanstack/react-query';

export function useAuth() {
  // JWT 토큰 확인
  const token = localStorage.getItem('token');

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      if (!token) return null;

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // 토큰이 유효하지 않으면 로컬스토리지에서 제거
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Invalid token');
      }

      return response.json();
    },
  });

  // 토큰이 없으면 즉시 false 반환
  if (!token) {
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
