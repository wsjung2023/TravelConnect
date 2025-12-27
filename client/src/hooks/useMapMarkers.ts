/**
 * useMapMarkers - 지도 마커 관리 훅
 * 
 * 목적: MapComponent의 무한 루프(Maximum update depth exceeded) 문제 해결
 * 
 * 핵심 변경사항:
 * 1. useState → useRef: 마커 배열을 ref로 관리하여 렌더링 유발 방지
 * 2. useCallback: 마커 생성 함수 안정화
 * 3. 단일 useEffect: 마커 생성 로직 통합으로 의존성 충돌 방지
 */

import { useRef, useCallback, useEffect } from 'react';

// 마커 타입 정의
interface MarkerRefs {
  posts: google.maps.Marker[];
  experiences: google.maps.Marker[];
  openUsers: google.maps.Marker[];
}

interface UseMapMarkersProps {
  map: google.maps.Map | null;
  posts: any[];
  experiences: any[];
  openUsers: any[];
  currentZoom: number;
  onPostClick: (post: any) => void;
  onExperienceClick: (experienceId: number) => void;
  onOpenUserClick: (user: any) => void;
  getThemeIcon: (theme: string) => { icon: string; color: string };
}

interface UseMapMarkersReturn {
  refreshMarkers: () => void;
  clearAllMarkers: () => void;
}

export function useMapMarkers({
  map,
  posts,
  experiences,
  openUsers,
  currentZoom,
  onPostClick,
  onExperienceClick,
  onOpenUserClick,
  getThemeIcon,
}: UseMapMarkersProps): UseMapMarkersReturn {
  // useRef로 마커 관리 - 상태 변경 없이 마커 추적
  const markersRef = useRef<MarkerRefs>({
    posts: [],
    experiences: [],
    openUsers: [],
  });

  // 디바운스 타이머 ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 마커 아이콘 생성 함수들 (useCallback으로 안정화)
  const createFeedMarker = useCallback((theme: string, count: number = 1, isOpenToMeet: boolean = false) => {
    if (!window.google) return null;
    const themeData = getThemeIcon(theme);
    const intensity = Math.min(count / 5, 1);
    const opacity = 0.7 + intensity * 0.3;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pin-shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          ${isOpenToMeet ? `
            <circle cx="16" cy="16" r="14" fill="#10B981" fill-opacity="0.3" stroke="#10B981" stroke-width="1"/>
            <circle cx="16" cy="16" r="12" fill="none" stroke="#10B981" stroke-width="2" stroke-dasharray="2,2">
              <animate attributeName="stroke-dasharray" values="2,2;4,1;2,2" dur="2s" repeatCount="indefinite"/>
            </circle>
          ` : ''}
          <path d="M16 4C10 4 5 9 5 15c0 12 11 21 11 21s11-9 11-21c0-6-5-11-11-11z" 
                fill="${themeData.color}" fill-opacity="${opacity}" stroke="white" 
                stroke-width="2" filter="url(#pin-shadow)"/>
          <circle cx="16" cy="15" r="7" fill="white"/>
          <foreignObject x="9" y="8" width="14" height="14">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:14px;height:14px;font-size:10px;">${themeData.icon}</div>
          </foreignObject>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 50),
      anchor: new window.google.maps.Point(20, 50),
    };
  }, [getThemeIcon]);

  const createFeedClusterMarker = useCallback((count: number) => {
    if (!window.google) return null;
    const color = count > 20 ? '#FF6B9D' : count > 10 ? '#4ECDC4' : count > 5 ? '#FFA726' : '#66BB6A';

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pin-shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          <path d="M18 0C10 0 4 6 4 14c0 16 14 34 14 34s14-18 14-34c0-8-6-14-14-14z" 
                fill="${color}" stroke="white" stroke-width="2" filter="url(#pin-shadow)"/>
          <circle cx="18" cy="14" r="10" fill="white"/>
          <text x="18" y="19" text-anchor="middle" fill="${color}" 
                font-size="12" font-weight="bold" font-family="Arial">${count}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(36, 48),
      anchor: new window.google.maps.Point(18, 48),
    };
  }, []);

  const createSmallClusterMarker = useCallback((count: number) => {
    if (!window.google) return null;
    const color = count > 20 ? '#FF6B9D' : count > 10 ? '#4ECDC4' : count > 5 ? '#FFA726' : '#66BB6A';

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="cluster-shadow">
              <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          <circle cx="16" cy="16" r="15" fill="${color}" filter="url(#cluster-shadow)"/>
          <circle cx="16" cy="16" r="11" fill="white"/>
          <text x="16" y="20" text-anchor="middle" fill="${color}" 
                font-size="11" font-weight="bold" font-family="Arial">${count}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(32, 32),
      anchor: new window.google.maps.Point(16, 16),
    };
  }, []);

  const createExperienceMarker = useCallback((category: string) => {
    if (!window.google) return null;
    const categoryColors: { [key: string]: string } = {
      tour: '#9333EA',
      food: '#F97316',
      activity: '#0EA5E9',
      tip: '#10B981',
      shopping: '#EC4899',
    };
    const color = categoryColors[category] || '#9333EA';

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="exp-shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.4"/>
            </filter>
          </defs>
          <path d="M20 2 L24 14 L37 14 L27 22 L31 35 L20 27 L9 35 L13 22 L3 14 L16 14 Z" 
                fill="${color}" stroke="white" stroke-width="2" filter="url(#exp-shadow)"/>
          <circle cx="20" cy="18" r="8" fill="white"/>
          <foreignObject x="12" y="10" width="16" height="16">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;font-size:12px;">⭐</div>
          </foreignObject>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  }, []);

  const createOpenUserMarker = useCallback(() => {
    if (!window.google) return null;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="open-user-shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
            </filter>
          </defs>
          <circle cx="20" cy="20" r="18" fill="#10B981" filter="url(#open-user-shadow)">
            <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="20" cy="20" r="14" fill="white"/>
          <foreignObject x="10" y="10" width="20" height="20">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;font-size:16px;">👋</div>
          </foreignObject>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  }, []);

  // 모든 마커 제거 함수
  const clearAllMarkers = useCallback(() => {
    markersRef.current.posts.forEach((marker) => marker.setMap(null));
    markersRef.current.experiences.forEach((marker) => marker.setMap(null));
    markersRef.current.openUsers.forEach((marker) => marker.setMap(null));
    markersRef.current = { posts: [], experiences: [], openUsers: [] };
  }, []);

  // 포스트 마커 생성 (내부 함수)
  const createPostMarkers = useCallback(() => {
    if (!map || !window.google || !posts.length) return;

    // 기존 포스트 마커 제거
    markersRef.current.posts.forEach((marker) => marker.setMap(null));
    markersRef.current.posts = [];

    const newMarkers: google.maps.Marker[] = [];

    if (currentZoom >= 11) {
      // 높은 줌: 개별 마커
      const locationGroups = new Map<string, any[]>();

      posts.forEach((post: any) => {
        if (!post.latitude || !post.longitude) return;
        const lat = parseFloat(post.latitude);
        const lng = parseFloat(post.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, []);
        }
        locationGroups.get(key)!.push(post);
      });

      locationGroups.forEach((groupPosts) => {
        const post = groupPosts[0];
        const count = groupPosts.length;
        const icon = count > 1 
          ? createFeedClusterMarker(count) 
          : createFeedMarker(post.theme || 'default', 1, false);

        if (!icon) return;

        const marker = new window.google.maps.Marker({
          position: { lat: parseFloat(post.latitude), lng: parseFloat(post.longitude) },
          map: map,
          icon: icon,
          title: count > 1 ? `${count}개의 포스트` : post.title,
        });

        marker.addListener('click', () => {
          if (count > 1) {
            onPostClick({ isMultiple: true, posts: groupPosts, location: post.location });
          } else {
            onPostClick(post);
          }
        });

        newMarkers.push(marker);
      });
    } else {
      // 낮은 줌: 클러스터링
      const clusterSize = currentZoom < 8 ? 2 : currentZoom < 10 ? 1 : 0.5;
      const clusters = new Map<string, { lat: number; lng: number; posts: any[] }>();

      posts.forEach((post: any) => {
        if (!post.latitude || !post.longitude) return;
        const lat = parseFloat(post.latitude);
        const lng = parseFloat(post.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const clusterLat = Math.round(lat / clusterSize) * clusterSize;
        const clusterLng = Math.round(lng / clusterSize) * clusterSize;
        const key = `${clusterLat.toFixed(2)}_${clusterLng.toFixed(2)}`;

        if (!clusters.has(key)) {
          clusters.set(key, { lat: clusterLat, lng: clusterLng, posts: [] });
        }
        clusters.get(key)!.posts.push(post);
      });

      clusters.forEach((cluster) => {
        const count = cluster.posts.length;
        if (count === 0) return;

        const icon = createSmallClusterMarker(count);
        if (!icon) return;

        const marker = new window.google.maps.Marker({
          position: { lat: cluster.lat, lng: cluster.lng },
          map: map,
          icon: icon,
          title: `${count}개의 포스트`,
        });

        marker.addListener('click', () => {
          map.setZoom(Math.min(currentZoom + 4, 18));
          map.setCenter({ lat: cluster.lat, lng: cluster.lng });
        });

        newMarkers.push(marker);
      });
    }

    markersRef.current.posts = newMarkers;
  }, [map, posts, currentZoom, createFeedMarker, createFeedClusterMarker, createSmallClusterMarker, onPostClick]);

  // Experience 마커 생성 (내부 함수)
  const createExperienceMarkers = useCallback(() => {
    if (!map || !window.google || !experiences.length) return;

    // 기존 Experience 마커 제거
    markersRef.current.experiences.forEach((marker) => marker.setMap(null));
    markersRef.current.experiences = [];

    const newMarkers: google.maps.Marker[] = [];

    experiences.forEach((exp: any) => {
      if (!exp.latitude || !exp.longitude) return;
      const lat = parseFloat(exp.latitude);
      const lng = parseFloat(exp.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const icon = createExperienceMarker(exp.category || 'tour');
      if (!icon) return;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: icon,
        title: exp.title,
        zIndex: 1000,
      });

      marker.addListener('click', () => {
        onExperienceClick(exp.id);
      });

      newMarkers.push(marker);
    });

    markersRef.current.experiences = newMarkers;
  }, [map, experiences, createExperienceMarker, onExperienceClick]);

  // Open User 마커 생성 (내부 함수)
  const createOpenUserMarkers = useCallback(() => {
    if (!map || !window.google) return;

    // 기존 Open User 마커 제거
    markersRef.current.openUsers.forEach((marker) => marker.setMap(null));
    markersRef.current.openUsers = [];

    if (!openUsers || openUsers.length === 0) return;

    const newMarkers: google.maps.Marker[] = [];

    openUsers.forEach((user: any) => {
      const lat = parseFloat(user.lastLatitude);
      const lng = parseFloat(user.lastLongitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const icon = createOpenUserMarker();
      if (!icon) return;

      const marker = new window.google.maps.Marker({
        map,
        position: { lat, lng },
        icon: icon,
        title: `${user.firstName || 'User'} - Open to Meet`,
        zIndex: 1200,
      });

      marker.addListener('click', () => {
        onOpenUserClick(user);
      });

      newMarkers.push(marker);
    });

    markersRef.current.openUsers = newMarkers;
  }, [map, openUsers, createOpenUserMarker, onOpenUserClick]);

  // 마커 새로고침 (디바운스 적용)
  const refreshMarkers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      createPostMarkers();
      createExperienceMarkers();
      createOpenUserMarkers();
    }, 100);
  }, [createPostMarkers, createExperienceMarkers, createOpenUserMarkers]);

  // 단일 useEffect로 마커 업데이트 통합
  useEffect(() => {
    if (!map || !window.google) return;

    refreshMarkers();

    // 클린업: 컴포넌트 언마운트 시 모든 마커 제거
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearAllMarkers();
    };
  }, [map, posts, experiences, openUsers, currentZoom, refreshMarkers, clearAllMarkers]);

  return {
    refreshMarkers,
    clearAllMarkers,
  };
}
