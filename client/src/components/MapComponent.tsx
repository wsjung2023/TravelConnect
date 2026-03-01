// 지도 메인 컴포넌트 — Google Maps 기반 인터랙티브 지도. 게시글·POI·MiniMeet 마커 표시, 클러스터링, 줌 이벤트, POI 필터링, 지도 클릭으로 게시글 작성을 지원한다.
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { api } from '@/lib/api';
import { calculateDistance } from '@shared/utils';
import SmartImage from '@/components/SmartImage';
import { MiniPlanButton } from '@/components/MiniConcierge/MiniPlanButton';
import { MiniPlanOptionsModal, type MiniPlanOptions } from '@/components/MiniConcierge/MiniPlanOptionsModal';
import { MiniPlanCardsView, type MiniPlan } from '@/components/MiniConcierge/MiniPlanCardsView';
import { MiniPlanExecutionView } from '@/components/MiniConcierge/MiniPlanExecutionView';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMapMarkers } from '@/hooks/useMapMarkers';
import { usePOIMarkers } from '@/hooks/usePOIMarkers';

// Custom debounce hook for performance optimization
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Viewport bounds interface
interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapComponentProps {
  className?: string;
  onCreatePost?: (location?: {
    name: string;
    latitude: number;
    longitude: number;
  }) => void;
  onPostDetailClick?: (postId: number) => void;
}

// Google Maps 전역 선언
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const MapComponent: React.FC<MapComponentProps> = ({
  className = '',
  onCreatePost,
  onPostDetailClick,
}) => {
  const { t } = useTranslation('ui');
  const [, setLocation] = useLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [showMiniMeetModal, setShowMiniMeetModal] = useState(false);
  const [miniMeetLocation, setMiniMeetLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isNearbyPanelCollapsed, setIsNearbyPanelCollapsed] = useState(false);
  const [nearbyFilter, setNearbyFilter] = useState<'all' | 'posts' | 'experiences' | 'open_users'>('all');

  // 상태 변화 디버깅
  useEffect(() => {
    console.log('상태 변화 - selectedPost:', selectedPost);
  }, [selectedPost]);

  useEffect(() => {
    console.log('상태 변화 - selectedPOI:', selectedPOI);
  }, [selectedPOI]);

  // 렌더링 시 현재 상태 확인
  console.log(
    '렌더링 - selectedPOI 존재:',
    !!selectedPOI,
    'selectedPost 존재:',
    !!selectedPost
  );
  // 마커 상태는 useMapMarkers/usePOIMarkers 훅에서 useRef로 관리 (무한 루프 방지)
  const [currentZoom, setCurrentZoom] = useState(13);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [mapBounds, setMapBounds] = useState<ViewportBounds | null>(null);

  // 150ms debounce for optimal performance
  const debouncedZoom = useDebounce(currentZoom, 150);
  const debouncedCenter = useDebounce(mapCenter, 150);
  const debouncedBounds = useDebounce(mapBounds, 150);

  // 현재 사용자 정보 조회 (중앙화된 useAuth 훅 사용)
  const { user: currentUser } = useAuth();

  // 만남 열려있는 사용자들 조회
  const { data: openUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users/open'],
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

  // DB 기반 POI 카테고리 조회
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en';
  const { data: poiCategoriesData } = useQuery<{ categories: any[] }>({
    queryKey: ['/api/poi/categories', currentLang],
    queryFn: async () => {
      const response = await fetch(`/api/poi/categories?lang=${currentLang}`);
      if (!response.ok) throw new Error('Failed to fetch POI categories');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
  const poiCategories = poiCategoriesData?.categories || [];
  
  // 확장된 카테고리 상태 관리
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 근처 모임들 조회 (임시 비활성화)
  const { data: miniMeets = [] } = useQuery({
    queryKey: ['/api/mini-meets', debouncedCenter.lat, debouncedCenter.lng],
    queryFn: async () => {
      const response = await fetch(`/api/mini-meets?lat=${debouncedCenter.lat}&lng=${debouncedCenter.lng}&radius=5`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000, // 30초마다 갱신
    enabled: false, // 임시 비활성화
  });
  const [enabledPOITypes, setEnabledPOITypes] = useState<string[]>([
    'tourist_attraction',
  ]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [miniMeetMarkers, setMiniMeetMarkers] = useState<any[]>([]);
  const [selectedMiniMeet, setSelectedMiniMeet] = useState<any>(null);
  const [mapMode, setMapMode] = useState<'PAN' | 'POST'>('PAN');
  const mapModeRef = useRef<'PAN' | 'POST'>('PAN');
  const [showModeToast, setShowModeToast] = useState(false);

  // Mini Concierge states
  const [showMiniOptions, setShowMiniOptions] = useState(false);
  const [showMiniCards, setShowMiniCards] = useState(false);
  const [showMiniExecution, setShowMiniExecution] = useState(false);
  const [generatedPlans, setGeneratedPlans] = useState<MiniPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MiniPlan | null>(null);
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
  const { toast } = useToast();

  // Mini Concierge mutations
  const generatePlansMutation = useMutation({
    mutationFn: async (options: MiniPlanOptions & { location: { lat: number; lng: number } }) => {
      const response = await apiRequest('/api/mini-concierge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      return response.json() as Promise<{ plans: MiniPlan[] }>;
    },
    onSuccess: (data: { plans: MiniPlan[] }) => {
      setGeneratedPlans(data.plans);
      setShowMiniOptions(false);
      setShowMiniCards(true);
    },
    onError: (error: any) => {
      toast({
        title: t('miniConcierge.error.title'),
        description: error.message || t('miniConcierge.error.description'),
        variant: 'destructive',
      });
    },
  });

  const startPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      return await apiRequest(`/api/mini-concierge/plans/${planId}/start`, {
        method: 'POST',
      });
    },
  });

  const completePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      return await apiRequest(`/api/mini-concierge/plans/${planId}/complete`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: t('miniConcierge.completed.title'),
        description: t('miniConcierge.completed.description'),
      });
      setShowMiniExecution(false);
      setSelectedPlan(null);
      setCurrentSpotIndex(0);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ spotId, planId }: { spotId: number; planId: number }) => {
      return await apiRequest(`/api/mini-concierge/spots/${spotId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
    },
    onSuccess: () => {
      setCurrentSpotIndex((prev) => prev + 1);
      toast({
        title: t('miniConcierge.checkin.title'),
        description: t('miniConcierge.checkin.description'),
      });
    },
  });

  // Mini Concierge handlers
  const handleOpenMiniOptions = () => {
    setShowMiniOptions(true);
  };

  const handleGeneratePlans = (options: MiniPlanOptions) => {
    generatePlansMutation.mutate({
      ...options,
      location: {
        lat: mapCenter.lat,
        lng: mapCenter.lng,
      },
    });
  };

  const handleSelectPlan = async (plan: MiniPlan) => {
    setSelectedPlan(plan);
    setCurrentSpotIndex(0);
    setShowMiniCards(false);
    setShowMiniExecution(true);

    await startPlanMutation.mutateAsync(plan.id);

    if (plan.spots.length > 0 && map) {
      const firstSpot = plan.spots[0];
      if (firstSpot) {
        map.panTo({
          lat: parseFloat(firstSpot.latitude),
          lng: parseFloat(firstSpot.longitude),
        });
      }
    }
  };

  const handleCheckIn = (spotId: number) => {
    if (!selectedPlan) return;
    checkInMutation.mutate({ spotId, planId: selectedPlan.id });
  };

  const handleCompletePlan = () => {
    if (!selectedPlan) return;
    completePlanMutation.mutate(selectedPlan.id);
  };

  // mapMode 변경시 ref도 업데이트
  useEffect(() => {
    mapModeRef.current = mapMode;
  }, [mapMode]);

  // POST 모드 전환시 안내 토스트 표시 (1회)
  useEffect(() => {
    if (mapMode === 'POST' && !showModeToast) {
      setShowModeToast(true);
      const timer = setTimeout(() => {
        setShowModeToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mapMode]);

  // MiniMeet 마커 업데이트 함수 (임시 비활성화)
  // const updateMiniMeetMarkers = useCallback(() => {
  //   if (!map || !miniMeets) return;
  //   // ... 마커 업데이트 로직
  // }, [map, miniMeets]);

  // useEffect(() => {
  //   updateMiniMeetMarkers();
  // }, [map, miniMeets]);

  // POI 업데이트는 usePOIMarkers 훅에서 처리

  // 포스트 데이터 가져오기
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/posts'],
    enabled: true,
  }) as { data: any[]; isLoading: boolean; error: any };

  // 체험 데이터 가져오기
  const {
    data: experiences = [],
    isLoading: isExperiencesLoading,
  } = useQuery({
    queryKey: ['/api/experiences'],
    enabled: true,
  }) as { data: any[]; isLoading: boolean };

  // Viewport filtering for performance - only render visible posts
  const visiblePosts = useMemo(() => {
    if (!posts || !debouncedBounds) return posts || [];
    
    return posts.filter((post: any) => {
      if (!post.latitude || !post.longitude) return false;
      
      const lat = parseFloat(post.latitude);
      const lng = parseFloat(post.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return false;
      
      // Check if post is within current viewport bounds
      return (
        lat <= debouncedBounds.north &&
        lat >= debouncedBounds.south &&
        lng <= debouncedBounds.east &&
        lng >= debouncedBounds.west
      );
    });
  }, [posts, debouncedBounds]);

  // Nearby posts filtering - 현재 지도에서 보이는 모든 게시물
  const nearbyPosts = useMemo(() => {
    if (!posts || posts.length === 0 || !mapBounds) return [];
    
    const filtered = posts.filter((post: any) => {
      if (!post.latitude || !post.longitude) return false;
      
      const lat = parseFloat(post.latitude);
      const lng = parseFloat(post.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return false;
      
      // Check if post is within current map viewport
      return (
        lat >= mapBounds.south &&
        lat <= mapBounds.north &&
        lng >= mapBounds.west &&
        lng <= mapBounds.east
      );
    });
    
    return filtered
      .map((post: any) => ({
        ...post,
        type: 'post' as const,
        distance: calculateDistance(
          mapCenter.lat,
          mapCenter.lng,
          parseFloat(post.latitude),
          parseFloat(post.longitude)
        ),
      }))
      .sort((a: any, b: any) => a.distance - b.distance);
      // 지도에 보이는 모든 포스트 표시
  }, [posts, mapCenter, mapBounds]);

  // Nearby experiences filtering - 현재 지도에서 보이는 모든 체험
  const nearbyExperiences = useMemo(() => {
    if (!experiences || experiences.length === 0 || !mapBounds) return [];
    
    // Filter experiences with coordinates within map viewport
    const filtered = experiences.filter((exp: any) => {
      if (!exp.latitude || !exp.longitude) return false;
      
      const lat = parseFloat(exp.latitude);
      const lng = parseFloat(exp.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return false;
      
      // Check if experience is within current map viewport
      return (
        lat >= mapBounds.south &&
        lat <= mapBounds.north &&
        lng >= mapBounds.west &&
        lng <= mapBounds.east
      );
    });
    
    return filtered
      .map((exp: any) => ({
        ...exp,
        type: 'experience' as const,
        distance: calculateDistance(
          mapCenter.lat,
          mapCenter.lng,
          parseFloat(exp.latitude),
          parseFloat(exp.longitude)
        ),
      }))
      .sort((a: any, b: any) => a.distance - b.distance);
      // 지도에 보이는 모든 체험 표시
  }, [experiences, mapCenter, mapBounds]);

  // Combine nearby posts and experiences based on filter
  const nearbyItems = useMemo(() => {
    console.log('🔍 Nearby 계산:', {
      filter: nearbyFilter,
      postsCount: nearbyPosts.length,
      experiencesCount: nearbyExperiences.length,
      mapCenter,
    });
    
    if (nearbyFilter === 'posts') return nearbyPosts;
    if (nearbyFilter === 'experiences') return nearbyExperiences;
    if (nearbyFilter === 'open_users') {
      // 본인 제외
      return (openUsers || [])
        .filter((user: any) => user.id !== currentUser?.id)
        .map((user: any) => ({
          ...user,
          type: 'open_user' as const,
          distance: user.lastLatitude && user.lastLongitude 
            ? calculateDistance(mapCenter.lat, mapCenter.lng, parseFloat(user.lastLatitude), parseFloat(user.lastLongitude))
            : 999
        })).sort((a: any, b: any) => a.distance - b.distance);
    }
    
    // Combine and sort by distance - 모든 아이템 표시 (제한 제거)
    const combined = [...nearbyPosts, ...nearbyExperiences]
      .sort((a: any, b: any) => a.distance - b.distance);
    
    console.log('✅ Nearby 결과:', combined.length, '개 아이템');
    return combined;
  }, [nearbyPosts, nearbyExperiences, nearbyFilter, openUsers, mapCenter, currentUser?.id]);

  // Determine clustering strategy based on marker count
  const shouldShowClusters = useMemo(() => {
    return visiblePosts.length > 200 || debouncedZoom < 11;
  }, [visiblePosts.length, debouncedZoom]);

  // 포스트 데이터 상태 로깅
  useEffect(() => {
    const koreaPosts =
      posts?.filter(
        (p: any) =>
          p.latitude >= 33 &&
          p.latitude <= 38 &&
          p.longitude >= 125 &&
          p.longitude <= 130
      ) || [];

    console.log('포스트 데이터 상태:', {
      loading: isLoading,
      error: error,
      postsCount: posts?.length || 0,
      koreaPostsCount: koreaPosts.length,
      koreaPostDetails: koreaPosts.slice(0, 5).map((p: any) => ({
        id: p.id,
        title: p.title,
        theme: p.theme,
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
      })),
    });
  }, [posts, isLoading, error]);

  // 테마별 아이콘과 색상 (표준 코드)
  const getThemeIcon = (theme: string) => {
    const themeIcons = {
      restaurant: { icon: '🍽️', color: '#FF6B6B' },
      landmark: { icon: '🏛️', color: '#4ECDC4' },
      party: { icon: '🎉', color: '#FF4757' },
      hotplace: { icon: '🔥', color: '#FFA726' },
      healing: { icon: '🌿', color: '#66BB6A' },
      emotional: { icon: '💫', color: '#E91E63' },
      activity: { icon: '🏃', color: '#FF9800' },
    } as const;
    return (
      themeIcons[theme as keyof typeof themeIcons] || {
        icon: '📍',
        color: '#FF6B6B',
      }
    );
  };

  // 참여도에 따른 색상 강도 계산
  const getIntensityColor = (baseColor: string, count: number) => {
    const maxCount = 10; // 최대 참여도 기준
    const intensity = Math.min(count / maxCount, 1);

    // RGB로 변환하여 투명도 조절
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const opacity = 0.3 + intensity * 0.7; // 0.3~1.0 범위
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // 피드 마커 (핀 모양) - 사용자 포스트용
  const createFeedMarker = (theme: string, count: number = 1, isOpenToMeet: boolean = false) => {
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
          <text x="16" y="20" text-anchor="middle" font-size="10" font-family="Arial">${themeData.icon}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 50),
      anchor: new window.google.maps.Point(20, 50),
    };
  };

  // 체험 마커 (별 모양) - 예약 가능한 체험용
  const createExperienceMarker = (category: string) => {
    // 카테고리별 색상
    const categoryColors: { [key: string]: string } = {
      tour: '#9333EA', // 보라색
      food: '#F97316', // 주황색
      activity: '#0EA5E9', // 하늘색
      tip: '#10B981', // 초록색
      shopping: '#EC4899', // 핑크색
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
          <text x="20" y="23" text-anchor="middle" font-size="12" font-family="Arial">⭐</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  };

  // 피드 클러스터 마커 (핀 모양)
  const createFeedClusterMarker = (count: number) => {
    const color =
      count > 20
        ? '#FF6B9D'
        : count > 10
          ? '#4ECDC4'
          : count > 5
            ? '#FFA726'
            : '#66BB6A';

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
  };

  // 작은 클러스터 마커 (원형 - 낮은 줌용)
  const createSmallClusterMarker = (count: number) => {
    const color =
      count > 20
        ? '#FF6B9D'
        : count > 10
          ? '#4ECDC4'
          : count > 5
            ? '#FFA726'
            : '#66BB6A';

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
  };

  // 장소 타입에 따른 아이콘 반환
  const getIconForPlaceType = (type: string) => {
    const iconMap: { [key: string]: string } = {
      tourist_attraction: '🏛️',
      restaurant: '🍽️',
      food: '🍴',
      cafe: '☕',
      bar: '🍺',
      shopping_mall: '🛍️',
      park: '🌳',
      museum: '🏛️',
      hospital: '🏥',
      school: '🏫',
      bank: '🏦',
      gas_station: '⛽',
      lodging: '🏨',
      subway_station: '🚇',
      bus_station: '🚌',
      point_of_interest: '📍',
      establishment: '🏢',
    };
    return iconMap[type] || '📍';
  };

  // POI 마커 (동그라미) - Google Maps POI용
  const createPOIMarker = (poi: any) => {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="poi-shadow">
              <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.25"/>
            </filter>
          </defs>
          <circle cx="13" cy="13" r="12" fill="#FF6B9D" filter="url(#poi-shadow)"/>
          <circle cx="13" cy="13" r="9" fill="white"/>
          <text x="13" y="17" text-anchor="middle" font-size="11" font-family="Arial">${poi.icon}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(39, 39),
      anchor: new window.google.maps.Point(19.5, 19.5),
    };
  };

  // Open to Meet 사용자 마커 (녹색 원형)
  const createOpenUserMarker = (hasImage: boolean = false) => {
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
          <text x="20" y="26" text-anchor="middle" font-size="16" font-family="Arial">👋</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20),
    };
  };

  // Open to Meet 사용자 클릭 시 DM 시작
  const handleOpenUserClick = async (user: any) => {
    // 로그인 확인
    if (!currentUser?.id) {
      toast({
        title: '로그인 필요',
        description: 'DM을 보내려면 먼저 로그인해 주세요.',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participant2Id: user.id }),
      });
      
      if (response.ok) {
        const conversation = await response.json();
        setLocation(`/chat?conversationId=${conversation.id}`);
      } else {
        toast({
          title: 'DM 시작 실패',
          description: '대화를 시작할 수 없습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('DM 시작 오류:', error);
      toast({
        title: '오류',
        description: '대화를 시작하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 본인을 제외한 Open to Meet 사용자 목록
  const filteredOpenUsers = useMemo(() => {
    return (openUsers || []).filter((user: any) => user.id !== currentUser?.id);
  }, [openUsers, currentUser?.id]);

  // 마커 관리 훅 (무한 루프 방지를 위해 useRef 기반)
  useMapMarkers({
    map,
    posts,
    experiences,
    openUsers: filteredOpenUsers,
    currentZoom,
    onPostClick: setSelectedPost,
    onExperienceClick: (expId: number) => setLocation(`/experience/${expId}`),
    onOpenUserClick: handleOpenUserClick,
    getThemeIcon,
  });

  // POI 마커 관리 훅
  usePOIMarkers({
    map,
    enabledPOITypes,
    currentZoom,
    onPOIClick: (poi: any) => {
      setSelectedPost(null);
      setSelectedPOI(poi);
    },
  });

  // Google Maps 스크립트 로딩
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        console.log('Google Maps 로딩 시작...');
        await loadGoogleMaps();
        console.log('Google Maps 로딩 완료!');
        setIsGoogleMapsLoaded(true);
      } catch (error) {
        console.error('Google Maps 로드 실패:', error);
      }
    };

    initializeGoogleMaps();
  }, []);

  // Google Maps 초기화
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || map) return;

    console.log('Google Maps 초기화 시작');

    // GPS로 현재 위치 가져오기
    const initializeMapWithUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            console.log('사용자 현재 위치:', userLat, userLng);
            
            // 지도 중심을 사용자 위치로 설정
            setMapCenter({ lat: userLat, lng: userLng });
            createMap(userLat, userLng);
          },
          (error) => {
            console.warn('위치 권한 없음, 기본 위치(서울) 사용:', error);
            // 위치 권한이 없으면 서울로 기본값 설정
            createMap(37.5665, 126.978);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      } else {
        console.warn('Geolocation API 지원 안됨, 기본 위치(서울) 사용');
        createMap(37.5665, 126.978);
      }
    };

    const createMap = (lat: number, lng: number) => {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 13,
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#4ECDC4' }],
          },
          {
            featureType: 'landscape.natural',
            elementType: 'geometry',
            stylers: [{ color: '#F5F5DC' }],
          },
          {
            featureType: 'landscape.man_made',
            elementType: 'geometry',
            stylers: [{ color: '#FDF6E3' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#C8E6C9' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#4A7C59' }],
          },
          {
            featureType: 'landscape.natural.landcover',
            elementType: 'geometry',
            stylers: [{ color: '#A8D5A8' }],
          },
          {
            featureType: 'landscape.natural.terrain',
            elementType: 'geometry',
            stylers: [{ color: '#B8E6B8' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#E8E8E8' }, { weight: 1.2 }],
          },
          {
            featureType: 'road.arterial',
            elementType: 'geometry',
            stylers: [{ color: '#F0F0F0' }, { weight: 1.0 }],
          },
          {
            featureType: 'road.local',
            elementType: 'geometry',
            stylers: [{ color: '#FAFAFA' }, { weight: 0.6 }],
          },
          {
            featureType: 'road',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }],
          },
          {
            featureType: 'poi',
            elementType: 'all',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'poi.medical',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'poi.school',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'administrative',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }],
          },
          {
            featureType: 'road',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }],
          },
        ],
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false, // 기본 POI 클릭 비활성화
      });

      // 줌 변경 이벤트 리스너
      newMap.addListener('zoom_changed', () => {
        const zoom = newMap.getZoom();
        setCurrentZoom(zoom);
      });

      // 지도 중심 및 경계 업데이트 (Nearby 패널 실시간 업데이트용) - 항상 등록
      newMap.addListener('idle', () => {
        const center = newMap.getCenter();
        const bounds = newMap.getBounds();
        const zoom = newMap.getZoom();
        
        if (center) {
          setMapCenter({ lat: center.lat(), lng: center.lng() });
        }
        
        if (bounds) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          setMapBounds({
            north: ne.lat(),
            south: sw.lat(),
            east: ne.lng(),
            west: sw.lng(),
          });
        }
        
        if (zoom !== undefined) {
          setCurrentZoom(zoom);
        }
      });

      // POI 마커는 usePOIMarkers 훅에서 관리됨

      // 지도 클릭 이벤트 - 피드 생성 모달 열기
      // 롱탭을 위한 마우스다운 이벤트
      newMap.addListener('mousedown', (event: any) => {
          // POST 모드에서만 롱탭 활성화
          if (mapModeRef.current !== 'POST') return;
          
          longPressRef.current = window.setTimeout(() => {
            // 롱탭 시 MiniMeet 생성 모달 열기
            const clickedLat = event.latLng.lat();
            const clickedLng = event.latLng.lng();

            console.log('지도 롱탭:', clickedLat, clickedLng);

            // 역지오코딩으로 주소 가져오기
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: clickedLat, lng: clickedLng } },
              (results: any, status: any) => {
                let locationName = `위도 ${clickedLat.toFixed(4)}, 경도 ${clickedLng.toFixed(4)}`;
                if (status === 'OK' && results && results[0]) {
                  locationName = results[0].formatted_address || locationName;
                }

                setMiniMeetLocation({
                  lat: clickedLat,
                  lng: clickedLng,
                  name: locationName
                });
                setShowMiniMeetModal(true);
              }
            );
          }, 800); // 800ms 롱탭
        });

        // 마우스업으로 롱탭 취소
        newMap.addListener('mouseup', () => {
          if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
          }
        });

        newMap.addListener('click', (event: any) => {
          // POST 모드에서만 클릭 활성화
          if (mapModeRef.current !== 'POST') return;
          
          // 롱탭이 진행 중이면 일반 클릭 무시
          if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
            return;
          }

          // 기본 InfoWindow가 있다면 닫기
          if ((window as any).lastInfoWindow) {
            (window as any).lastInfoWindow.close();
          }

          // 클릭한 위치로 피드 생성 모달 열기
          const clickedLat = event.latLng.lat();
          const clickedLng = event.latLng.lng();

          console.log('지도 클릭:', clickedLat, clickedLng);

          // 역지오코딩으로 주소 가져오기 (에러 처리 개선)
          let locationName = `위도 ${clickedLat.toFixed(4)}, 경도 ${clickedLng.toFixed(4)}`;
          
          try {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode(
              { location: { lat: clickedLat, lng: clickedLng } },
              (results: any, status: any) => {
                if (status === 'OK' && results && results[0]) {
                  locationName = results[0].formatted_address || locationName;
                } else {
                  console.log('Geocoding 실패, 기본 위치명 사용:', status);
                }

                // 전역 함수로 모달 열기
                if ((window as any).openJourneyModal) {
                  (window as any).openJourneyModal({
                    name: locationName,
                    latitude: clickedLat,
                    longitude: clickedLng,
                  });
                }
              }
            );
          } catch (error) {
            console.log('Geocoding API 오류, 기본 위치명 사용:', error);
            // Geocoding이 실패해도 모달은 열기
            if ((window as any).openJourneyModal) {
              (window as any).openJourneyModal({
                name: locationName,
                latitude: clickedLat,
                longitude: clickedLng,
              });
            }
          }
        });

      setMap(newMap);
      console.log('Google Maps 초기화 완료');
    };

    initializeMapWithUserLocation();
  }, [isGoogleMapsLoaded]);

  // 마커 생성은 useMapMarkers 훅에서 처리 (무한 루프 방지)

  // 검색 기능 - Geocoding 재시도
  useEffect(() => {
    // 전역 검색 함수 등록
    (window as any).mapLocationSearch = (query: string) => {
      if (!map || !window.google?.maps) return;

      console.log('장소 검색:', query);

      // Places API Text Search 사용 (권한 있음)
      const service = new window.google.maps.places.PlacesService(map);
      const request = {
        query: query,
        fields: ['place_id', 'name', 'geometry', 'formatted_address'],
      };

      service.textSearch(request, (results: any, status: any) => {
        console.log('Places API 상태:', status);

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results[0]
        ) {
          const location = results[0].geometry.location;
          map.setCenter(location);
          map.setZoom(14);
          console.log('Places API 검색 성공:', results[0].name);
        } else {
          console.log('Places API 검색 실패:', status);
        }
      });
    };

    (window as any).mapContentSearch = async (query: string) => {
      console.log('컨텐츠 검색 (서버 API):', query);

      if (query.trim().length < 2) {
        console.log('검색어는 최소 2글자 이상 입력해주세요');
        return;
      }

      try {
        // 서버 검색 API 호출 (ILIKE 패턴 매칭)
        const response = await fetch(`/api/search?term=${encodeURIComponent(query)}&type=all&limit=20`);
        
        if (!response.ok) {
          throw new Error('검색 API 오류');
        }

        const data = await response.json();
        console.log('서버 검색 결과:', data);

        // 포스트와 체험 결과 합치기
        const allResults = [
          ...(data.posts || []),
          ...(data.experiences || [])
        ];

        console.log('검색 결과:', allResults.length, '개');

        if (allResults.length > 0) {
          // 좌표가 있는 첫 번째 결과로 지도 이동
          const firstWithLocation = allResults.find((result: any) => 
            result.latitude && result.longitude
          );
          
          if (firstWithLocation) {
            const lat = parseFloat(firstWithLocation.latitude);
            const lng = parseFloat(firstWithLocation.longitude);
            console.log('이동할 좌표:', lat, lng);

            map.setCenter({ lat, lng });
            map.setZoom(15);
            console.log('컨텐츠 검색 성공:', firstWithLocation.title);
          } else {
            console.log('좌표가 있는 검색 결과 없음');
          }
        } else {
          console.log('검색 결과 없음');
        }
      } catch (error) {
        console.error('검색 API 호출 실패:', error);
        
        // 폴백: 로컬 포스트에서 검색
        if (posts && posts.length > 0) {
          const searchResults = posts.filter((post) => {
            const title = post.title?.toLowerCase() || '';
            const content = post.content?.toLowerCase() || '';
            const location = post.location?.toLowerCase() || '';
            const searchTerm = query.toLowerCase();
            return title.includes(searchTerm) || content.includes(searchTerm) || location.includes(searchTerm);
          });

          if (searchResults.length > 0 && searchResults[0].latitude && searchResults[0].longitude) {
            const lat = parseFloat(searchResults[0].latitude);
            const lng = parseFloat(searchResults[0].longitude);
            map.setCenter({ lat, lng });
            map.setZoom(15);
          }
        }
      }
    };

    return () => {
      delete (window as any).mapLocationSearch;
      delete (window as any).mapContentSearch;
    };
  }, [map, posts]);

  // POI 필터 변경은 usePOIMarkers 훅에서 처리

  // 로딩 상태 처리
  if (!isGoogleMapsLoaded) {
    return (
      <div className={`relative w-full h-full ${className} flex items-center justify-center bg-gray-100 rounded-2xl`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">지도를 로딩하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full ${className}`}>
      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="w-full h-full" />

      {/* POI 모달 */}
      {selectedPOI && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPOI(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm mx-4 w-full">
            {/* POI 이미지 */}
            <div className="h-48 relative overflow-hidden">
              <img
                src={
                  selectedPOI.image ||
                  `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`
                }
                alt={selectedPOI.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`;
                }}
              />
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-3xl mb-2">{selectedPOI.icon}</div>
                <h2 className="text-xl font-bold">{selectedPOI.name}</h2>
                <p className="text-sm opacity-90">POI • {selectedPOI.type}</p>
              </div>
              <button
                onClick={() => setSelectedPOI(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* POI 내용 */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin size={16} />
                  <span>서울특별시</span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {selectedPOI.description ||
                    `${selectedPOI.name}은(는) 서울의 대표적인 ${selectedPOI.type} 명소입니다.`}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedPOI(null);
                  onCreatePost?.({
                    name: selectedPOI.name,
                    latitude: selectedPOI.lat,
                    longitude: selectedPOI.lng,
                  });
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all"
              >
                ✨ 흔적 남기기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 포스트 모달 */}
      {selectedPost && !selectedPOI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm mx-4 w-full max-h-[80vh] overflow-y-auto">
            {(selectedPost as any)?.isMultiple ? (
              // 다중 포스트 목록 UI
              <>
                <div className="h-32 bg-gradient-to-br from-teal-400 to-blue-500 relative">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h2 className="text-xl font-bold">
                      {(selectedPost as any).location}
                    </h2>
                    <p className="text-sm opacity-90">
                      {(selectedPost as any).count}개의 여행 기록
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  {/* 검색 필터 */}
                  <div className="mb-4 space-y-2">
                    <input
                      type="text"
                      placeholder="제목이나 내용으로 검색..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      onChange={(e) => {
                        // 검색 기능 구현
                        const query = e.target.value.toLowerCase();
                        const filteredPosts = (
                          selectedPost as any
                        ).posts.filter(
                          (post: any) =>
                            post.title.toLowerCase().includes(query) ||
                            post.content.toLowerCase().includes(query)
                        );
                        // 필터링된 결과 표시
                      }}
                    />
                    <div className="flex gap-2 text-xs">
                      <select className="border rounded px-2 py-1">
                        <option>전체 사용자</option>
                        <option>특정 사용자</option>
                      </select>
                      <select className="border rounded px-2 py-1">
                        <option>전체 기간</option>
                        <option>최근 1주일</option>
                        <option>최근 1개월</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {(selectedPost as any).posts.map(
                      (post: any, index: number) => (
                        <div
                          key={post.id}
                          className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedPost(post)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">
                              {post.title}
                            </h3>
                            <span className="text-xs text-gray-500">
                              Day {post.day}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-pink-100 text-pink-600">
                              {getThemeIcon(post.theme).icon} {post.theme}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const firstPost = (selectedPost as any).posts[0];
                      setSelectedPost(null);
                      onCreatePost?.({
                        name: firstPost.location || '이곳',
                        latitude: parseFloat(firstPost.latitude || '0'),
                        longitude: parseFloat(firstPost.longitude || '0'),
                      });
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all"
                  >
                    ✨ 나도 여기서 흔적 남기기
                  </button>
                </div>
              </>
            ) : (
              // 단일 포스트 UI
              <>
                <div className="h-48 bg-gradient-to-br from-pink-400 to-purple-500 relative">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        👤
                      </div>
                      <div>
                        <p className="font-medium">여행자</p>
                        <p className="text-xs opacity-80">
                          Day {(selectedPost as any)?.day}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h2 className="text-xl font-bold">
                      {(selectedPost as any)?.title || '여행 포스트'}
                    </h2>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed mb-3">
                      {(selectedPost as any)?.content ||
                        '멋진 여행 경험을 공유합니다!'}
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      {(selectedPost as any)?.theme && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-pink-100 text-pink-600">
                          {getThemeIcon((selectedPost as any).theme).icon}{' '}
                          {(selectedPost as any).theme}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} />
                      <span>
                        {(selectedPost as any)?.location || '위치 정보'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setSelectedPost(null);
                        onCreatePost?.({
                          name: (selectedPost as any)?.location || '이곳',
                          latitude: parseFloat(
                            (selectedPost as any)?.latitude || '0'
                          ),
                          longitude: parseFloat(
                            (selectedPost as any)?.longitude || '0'
                          ),
                        });
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all"
                    >
                      ✨ 나도 여기서 흔적 남기기
                    </button>

                    <button
                      onClick={() => {
                        onPostDetailClick?.(selectedPost.id);
                        setSelectedPost(null);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                      data-testid="button-view-post-detail"
                    >
                      📖 피드 상세보기
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* POI 필터링 토글 - Apple/SaaS style */}
      <div className="absolute top-4 left-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm z-10 max-w-xs">
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="flex items-center justify-between gap-3 w-full px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-colors"
          data-testid="button-toggle-poi-filters"
        >
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('filters.poi')}</span>
          <div className="flex items-center gap-2">
            {enabledPOITypes.length > 0 && (
              <span className="text-xs bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium">
                {enabledPOITypes.length > 99 ? '99+' : enabledPOITypes.length}
              </span>
            )}
            {isFilterExpanded ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </div>
        </button>
        
        {isFilterExpanded && (
          <div className="px-3 pb-3 max-h-80 overflow-y-auto">
            {poiCategories.filter(cat => !cat.isSystem).map((category) => {
              const isCategoryExpanded = expandedCategories.has(category.code);
              const categoryTypes = category.types || [];
              const selectedTypesInCategory = categoryTypes.filter((type: any) => 
                enabledPOITypes.includes(type.googlePlaceType)
              ).length;
              
              return (
                <div key={category.code} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedCategories);
                      if (isCategoryExpanded) {
                        newExpanded.delete(category.code);
                      } else {
                        newExpanded.add(category.code);
                      }
                      setExpandedCategories(newExpanded);
                    }}
                    className="flex items-center justify-between w-full py-2 text-left hover:bg-gray-50 rounded transition-colors"
                    data-testid={`button-category-${category.code}`}
                  >
                    <span className="text-sm flex items-center gap-1.5">
                      <span>{category.icon}</span>
                      <span className="font-medium text-gray-700">{category.name}</span>
                      {selectedTypesInCategory > 0 && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-1 py-0.5 rounded-full">
                          {selectedTypesInCategory}
                        </span>
                      )}
                    </span>
                    {isCategoryExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                  
                  {isCategoryExpanded && categoryTypes.length > 0 && (
                    <div className="pl-5 pb-2 space-y-1">
                      {categoryTypes.map((type: any) => (
                        <label
                          key={type.code}
                          className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-50 rounded px-1"
                          data-testid={`checkbox-poi-${type.code}`}
                        >
                          <input
                            type="checkbox"
                            checked={enabledPOITypes.includes(type.googlePlaceType)}
                            onChange={(e) => {
                              if (!type.googlePlaceType) return;
                              if (e.target.checked) {
                                setEnabledPOITypes([...enabledPOITypes, type.googlePlaceType]);
                              } else {
                                setEnabledPOITypes(
                                  enabledPOITypes.filter((t) => t !== type.googlePlaceType)
                                );
                              }
                            }}
                            className="rounded text-teal-500 h-3.5 w-3.5"
                          />
                          <span className="text-xs text-gray-600">
                            {type.icon} {type.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 시스템 카테고리 (만남활성화, 세렌디피티) */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              {poiCategories.filter(cat => cat.isSystem).map((category) => (
                <label
                  key={category.code}
                  className="flex items-center gap-2 cursor-pointer py-1.5 hover:bg-gray-50 rounded px-1"
                  data-testid={`checkbox-system-${category.code}`}
                >
                  <input
                    type="checkbox"
                    checked={enabledPOITypes.includes(category.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEnabledPOITypes([...enabledPOITypes, category.code]);
                      } else {
                        setEnabledPOITypes(
                          enabledPOITypes.filter((t) => t !== category.code)
                        );
                      }
                    }}
                    className="rounded text-teal-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {category.icon} {category.name}
                  </span>
                </label>
              ))}
            </div>
            
            {/* 전체 선택/해제 버튼 */}
            <div className="pt-2 mt-2 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => {
                  const allGoogleTypes = poiCategories
                    .flatMap(cat => cat.types || [])
                    .map((t: any) => t.googlePlaceType)
                    .filter(Boolean);
                  setEnabledPOITypes(allGoogleTypes);
                }}
                className="flex-1 text-xs py-1.5 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                data-testid="button-select-all-poi"
              >
                {t('common.selectAll') || 'Select All'}
              </button>
              <button
                onClick={() => setEnabledPOITypes([])}
                className="flex-1 text-xs py-1.5 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                data-testid="button-clear-all-poi"
              >
                {t('common.clearAll') || 'Clear All'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 지도 모드 토글 버튼 (우하단) */}
      <div className="absolute bottom-20 right-4 z-10">
        <button
          onClick={() => setMapMode(mapMode === 'PAN' ? 'POST' : 'PAN')}
          className={`px-4 py-3 rounded-full shadow-lg font-medium text-sm transition-all ${
            mapMode === 'PAN'
              ? 'bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
          }`}
          data-testid="button-toggle-map-mode"
        >
          {mapMode === 'PAN' ? `🖐️ ${t('mapPage.explore')}` : `📌 ${t('mapPage.create')}`}
        </button>
      </div>

      {/* POST 모드 십자선 (중앙) */}
      {mapMode === 'POST' && (
        <div className="absolute inset-0 pointer-events-none z-[5] flex items-center justify-center">
          <div className="relative">
            <div className="absolute w-8 h-0.5 bg-pink-500/60 -translate-x-1/2"></div>
            <div className="absolute h-8 w-0.5 bg-pink-500/60 -translate-y-1/2"></div>
          </div>
        </div>
      )}

      {/* POST 모드 안내 토스트 (상단) */}
      {mapMode === 'POST' && showModeToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white px-4 py-2 rounded-lg text-sm animate-fade-in">
          지도를 움직여 위치를 선택하고 탭하세요
        </div>
      )}

      {/* 하단 Nearby Posts - 접기/펼치기 가능 */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg transition-all duration-300 flex flex-col max-h-[80vh] min-h-0 overflow-hidden pointer-events-auto ${
          isNearbyPanelCollapsed ? 'p-2 rounded-t-3xl' : 'p-4 rounded-t-3xl'
        }`}
      >
        <button
          onClick={() => setIsNearbyPanelCollapsed(!isNearbyPanelCollapsed)}
          className="w-full flex items-center justify-between mb-2 flex-shrink-0"
          data-testid="button-toggle-nearby-panel"
        >
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            {!isNearbyPanelCollapsed && (
              <h3 className="font-bold text-lg">{t('mapPage.nearbyExperiences')}</h3>
            )}
          </div>
          {isNearbyPanelCollapsed ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {!isNearbyPanelCollapsed && (
          <div className="flex flex-col h-[50vh]">
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-3 flex-shrink-0">
              <button
                onClick={() => setNearbyFilter('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                  nearbyFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="nearby-filter-all"
              >
                {t('filter.all')}
              </button>
              <button
                onClick={() => setNearbyFilter('posts')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                  nearbyFilter === 'posts'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="nearby-filter-posts"
              >
                {t('filter.posts')}
              </button>
              <button
                onClick={() => setNearbyFilter('experiences')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                  nearbyFilter === 'experiences'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="nearby-filter-experiences"
              >
                {t('filter.experiences')}
              </button>
              <button
                onClick={() => setNearbyFilter('open_users')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                  nearbyFilter === 'open_users'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="nearby-filter-open-users"
              >
                👥 열린 사람들
              </button>
            </div>

            <div 
              className="space-y-2 flex-1 min-h-0 overflow-y-auto"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'contain'
              }}
            >
            {nearbyItems.map((item: any) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === 'experience') {
                    setLocation(`/experience/${item.id}`);
                  } else if (item.type === 'post') {
                    setSelectedPost(item);
                  } else if (item.type === 'open_user') {
                    handleOpenUserClick(item);
                  }
                }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                data-testid={`card-${item.type}-${item.id}`}
              >
                {item.type === 'open_user' ? (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 relative">
                    {item.profileImageUrl ? (
                      <SmartImage
                        src={item.profileImageUrl}
                        alt={item.firstName || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-white">👤</span>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-xs">✓</span>
                    </div>
                  </div>
                ) : (
                  item.images && item.images[0] && (
                    <SmartImage
                      src={item.images[0]}
                      alt={item.title || 'Experience'}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )
                )}
                <div className="flex-1 min-w-0">
                  {item.type === 'open_user' ? (
                    <>
                      <h4 className="font-medium text-sm truncate">{item.firstName} {item.lastName || ''}</h4>
                      <p className="text-xs text-green-600 font-medium">🟢 Open to meet</p>
                      {item.bio && <p className="text-xs text-gray-500 truncate mt-1">{item.bio}</p>}
                      {item.regionCode && <p className="text-xs text-gray-400">📍 {item.regionCode}</p>}
                      {item.distance !== undefined && item.distance < 999 && (
                        <p className="text-xs text-gray-400">{item.distance.toFixed(1)} km away</p>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium text-sm truncate">{item.title || t('mapPage.untitled')}</h4>
                      <p className="text-xs text-gray-500 truncate">{item.location || t('mapPage.unknownLocation')}</p>
                      {item.distance !== undefined && (
                        <p className="text-xs text-gray-400">{item.distance.toFixed(1)} km</p>
                      )}
                      {item.price && (
                        <p className="text-xs font-semibold text-purple-600 mt-1">
                          ${Number(item.price).toFixed(2)} {item.currency && item.currency !== 'USD' ? item.currency : ''}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {nearbyItems.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">{t('mapPage.noNearbyExperiences')}</p>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* MiniMeet 생성 모달 */}
      {showMiniMeetModal && miniMeetLocation && (
        <CreateMiniMeetModal
          location={miniMeetLocation}
          onClose={() => {
            setShowMiniMeetModal(false);
            setMiniMeetLocation(null);
          }}
          onSuccess={() => {
            setShowMiniMeetModal(false);
            setMiniMeetLocation(null);
            // TODO: 새로운 모임을 지도에 표시
          }}
        />
      )}

      {/* MiniMeet 상세 모달 */}
      {selectedMiniMeet && (
        <MiniMeetDetailModal
          meet={selectedMiniMeet}
          onClose={() => setSelectedMiniMeet(null)}
          onJoin={() => {
            // 참여 후 모달 닫기
            setSelectedMiniMeet(null);
          }}
        />
      )}

      {/* Mini Concierge FAB */}
      {!showMiniExecution && (
        <MiniPlanButton
          onClick={handleOpenMiniOptions}
          disabled={generatePlansMutation.isPending}
        />
      )}

      {/* Mini Concierge Options Modal */}
      <MiniPlanOptionsModal
        isOpen={showMiniOptions}
        onClose={() => setShowMiniOptions(false)}
        onGenerate={handleGeneratePlans}
        isGenerating={generatePlansMutation.isPending}
      />

      {/* Mini Concierge Cards View */}
      {showMiniCards && (
        <MiniPlanCardsView
          plans={generatedPlans}
          onSelectPlan={handleSelectPlan}
          onClose={() => setShowMiniCards(false)}
        />
      )}

      {/* Mini Concierge Execution View */}
      {showMiniExecution && selectedPlan && (
        <MiniPlanExecutionView
          plan={selectedPlan}
          currentSpotIndex={currentSpotIndex}
          onCheckIn={handleCheckIn}
          onComplete={handleCompletePlan}
          onClose={() => {
            setShowMiniExecution(false);
            setSelectedPlan(null);
            setCurrentSpotIndex(0);
          }}
          mapCenter={mapCenter}
        />
      )}
    </div>
  );
};

// MiniMeet 생성 모달 컴포넌트
interface CreateMiniMeetModalProps {
  location: { lat: number; lng: number; name: string };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMiniMeetModal: React.FC<CreateMiniMeetModalProps> = ({
  location,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation('ui');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [maxPeople, setMaxPeople] = useState(6);
  const [isLoading, setIsLoading] = useState(false);

  // 기본값으로 1시간 후 시간 설정
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const timeString = now.toISOString().slice(0, 16);
    setStartTime(timeString);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) return;

    setIsLoading(true);
    try {
      await api('/api/mini-meets', {
        method: 'POST',
        body: {
          title: title.trim(),
          placeName: location.name,
          latitude: location.lat,
          longitude: location.lng,
          startAt: startTime,
          maxPeople,
          visibility: 'public',
        },
      });

      onSuccess();
      console.log('모임 생성 성공');
    } catch (error) {
      console.error('모임 생성 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-4 w-full">
        {/* 헤더 */}
        <div className="h-20 bg-gradient-to-r from-emerald-400 to-teal-500 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-xl font-bold">{t('miniMeet.create')}</h2>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 장소
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {location.name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('miniMeet.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 커피 한 잔 하실래요?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
              maxLength={50}
              data-testid="input-meet-title"
            />
            <div className="text-xs text-gray-500 mt-1">
              {title.length}/50자
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⏰ 시작 시간
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
              data-testid="input-meet-time"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('miniMeet.maxPeopleLabel')}
            </label>
            <select
              value={maxPeople}
              onChange={(e) => setMaxPeople(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              data-testid="select-max-people"
            >
              <option value={2}>2명</option>
              <option value={3}>3명</option>
              <option value={4}>4명</option>
              <option value={5}>5명</option>
              <option value={6}>6명</option>
              <option value={7}>7명</option>
              <option value={8}>8명</option>
              <option value={9}>9명</option>
              <option value={10}>10명</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              data-testid="button-cancel"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !startTime || isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="button-create-meet"
            >
              {isLoading ? t('miniMeet.creating') : t('miniMeet.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// MiniMeet 상세 모달 컴포넌트
interface MiniMeetDetailModalProps {
  meet: any;
  onClose: () => void;
  onJoin: () => void;
}

const MiniMeetDetailModal: React.FC<MiniMeetDetailModalProps> = ({
  meet,
  onClose,
  onJoin,
}) => {
  const { t } = useTranslation('ui');
  const [isJoining, setIsJoining] = useState(false);
  
  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const result = await api(`/api/mini-meets/${meet.id}/join`, {
        method: 'POST',
      });

      console.log('모임 참여 성공:', result.message);
      onJoin();
    } catch (error: any) {
      console.error('모임 참여 실패:', error);
      alert(error.message || '모임 참여 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isHost = false; // TODO: 현재 사용자가 호스트인지 확인
  const currentAttendees = meet.attendees?.length || 0;
  const isTimeExpired = new Date(meet.startAt) <= new Date();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-4 w-full">
        {/* 헤더 */}
        <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-xl font-bold">{meet.title}</h2>
            <p className="text-sm opacity-90">
              {meet.host?.firstName} {meet.host?.lastName}님의 모임
            </p>
          </div>
        </div>

        {/* 모임 정보 */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              📍 <span className="font-medium">장소</span>
            </div>
            <p className="text-gray-800">{meet.placeName}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              ⏰ <span className="font-medium">시간</span>
            </div>
            <p className="text-gray-800">{formatDateTime(meet.startAt)}</p>
            {isTimeExpired && (
              <p className="text-red-500 text-sm mt-1">⚠️ 이미 시작된 모임입니다</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              👥 <span className="font-medium">참여 인원</span>
            </div>
            <p className="text-gray-800">
              {currentAttendees + 1}/{meet.maxPeople}명
              {currentAttendees + 1 >= meet.maxPeople && (
                <span className="text-red-500 ml-2">정원 마감</span>
              )}
            </p>
          </div>

          {/* 참여자 목록 */}
          {meet.attendees && meet.attendees.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                📋 <span className="font-medium">참여자</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                    👑
                  </div>
                  <span className="text-sm">
                    {meet.host?.firstName} {meet.host?.lastName} (호스트)
                  </span>
                </div>
                {meet.attendees.map((attendee: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                    <span className="text-sm">
                      {attendee.user?.firstName} {attendee.user?.lastName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="pt-4">
            {isHost ? (
              <button
                className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium cursor-not-allowed"
                disabled
              >
                내가 만든 모임입니다
              </button>
            ) : isTimeExpired ? (
              <button
                className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium cursor-not-allowed"
                disabled
              >
                시간이 지난 모임입니다
              </button>
            ) : currentAttendees + 1 >= meet.maxPeople ? (
              <button
                className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium cursor-not-allowed"
                disabled
              >
                정원이 가득 찼습니다
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                data-testid="button-join-meet"
              >
                {isJoining ? t('miniMeet.joining') : t('miniMeet.joinButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default MapComponent;
