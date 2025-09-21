import { useState, useEffect } from 'react';

/**
 * 미디어 쿼리 상태를 관리하는 커스텀 훅
 * 창 크기 변경에 실시간으로 반응합니다.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // 초기값 설정
    setMatches(mediaQuery.matches);

    // 변경 이벤트 리스너
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 이벤트 리스너 등록
    mediaQuery.addEventListener('change', handleChange);

    // 정리 함수
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * 자주 사용하는 미디어 쿼리들을 위한 편의 훅들
 */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}