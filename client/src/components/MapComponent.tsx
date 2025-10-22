import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { api } from '@/lib/api';

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
}) => {
  const { t } = useTranslation('ui');
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [showMiniMeetModal, setShowMiniMeetModal] = useState(false);
  const [miniMeetLocation, setMiniMeetLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

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
  const [markers, setMarkers] = useState<any[]>([]);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [poiMarkers, setPOIMarkers] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [mapBounds, setMapBounds] = useState<ViewportBounds | null>(null);

  // 150ms debounce for optimal performance
  const debouncedZoom = useDebounce(currentZoom, 150);
  const debouncedCenter = useDebounce(mapCenter, 150);
  const debouncedBounds = useDebounce(mapBounds, 150);

  // 만남 열려있는 사용자들 조회
  const { data: openUsers = [] } = useQuery({
    queryKey: ['/api/users/open'],
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

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

  // POI 업데이트 함수
  const updatePOIs = async () => {
    if (!map || currentZoom < 13 || enabledPOITypes.length === 0) {
      // 기존 마커만 제거하고 종료
      poiMarkers.forEach((marker) => marker.setMap(null));
      setPOIMarkers([]);
      return;
    }

    console.log(
      'POI 업데이트 시작, 줌 레벨:',
      currentZoom,
      '활성 타입:',
      enabledPOITypes
    );

    // 기존 POI 마커 제거
    poiMarkers.forEach((marker) => marker.setMap(null));
    console.log('기존 POI 마커 제거 완료');

    const center = map.getCenter();
    const newPOIMarkers: any[] = [];

    // 각 활성화된 POI 타입별로 검색
    for (const poiType of enabledPOITypes) {
      const request = {
        location: center,
        radius: 2000,
        type: poiType,
      };

      console.log(`${poiType} 검색 요청:`, request);

      const service = new window.google.maps.places.PlacesService(map);

      await new Promise((resolve) => {
        service.nearbySearch(request, (results: any, status: any) => {
          console.log(`${poiType} 검색 결과:`, status, results?.length);

          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            console.log(`${poiType} 검색 성공, 결과 개수:`, results.length);

            results.slice(0, 5).forEach((place: any, index: number) => {
              console.log(`${poiType} ${index + 1}:`, place.name, place.types);

              const icon = getIconForPlaceType(place.types[0]);

              const marker = new window.google.maps.Marker({
                position: place.geometry.location,
                map: map,
                icon: createPOIMarker({ icon }),
                title: place.name,
              });

              console.log(`${poiType} 마커 생성:`, place.name);

              // POI 클릭 이벤트 - 기존 관광명소와 동일한 로직 사용
              marker.addListener('click', (event: any) => {
                event.stop();
                console.log(`${poiType} POI 클릭:`, place.name);

                // 다른 모달 먼저 닫기
                setSelectedPost(null);

                // Places API에서 상세 정보 가져오기 (사진 포함)
                const service = new window.google.maps.places.PlacesService(
                  map
                );
                service.getDetails(
                  {
                    placeId: place.place_id,
                    fields: [
                      'name',
                      'photos',
                      'formatted_address',
                      'types',
                      'rating',
                      'reviews',
                    ],
                  },
                  (placeDetails: any, status: any) => {
                    if (
                      status ===
                        window.google.maps.places.PlacesServiceStatus.OK &&
                      placeDetails
                    ) {
                      console.log(
                        `${poiType} POI 상세 정보 가져오기 성공:`,
                        placeDetails.name
                      );

                      const photoUrl = placeDetails.photos?.[0]?.getUrl({
                        maxWidth: 400,
                        maxHeight: 300,
                      });

                      setSelectedPOI({
                        name: placeDetails.name || place.name,
                        type: place.types?.[0]?.replace(/_/g, ' ') || 'POI',
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        icon: getIconForPlaceType(
                          place.types?.[0] || 'point_of_interest'
                        ),
                        image:
                          photoUrl ||
                          `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`,
                        description:
                          placeDetails.formatted_address ||
                          place.vicinity ||
                          '흥미로운 장소입니다.',
                        rating: placeDetails.rating,
                        reviews: placeDetails.reviews,
                      });
                    } else {
                      // 상세 정보 없어도 기본 POI 정보로 모달 열기
                      setSelectedPOI({
                        name: place.name,
                        type: place.types?.[0]?.replace(/_/g, ' ') || 'POI',
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        icon: getIconForPlaceType(
                          place.types?.[0] || 'point_of_interest'
                        ),
                        image: `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`,
                        description: place.vicinity || '흥미로운 장소입니다.',
                      });
                    }
                  }
                );
              });

              newPOIMarkers.push(marker);
            });
          } else {
            console.log(`${poiType} 검색 실패:`, status);
          }
          resolve(null);
        });
      });
    }

    setPOIMarkers(newPOIMarkers);
    console.log('전체 POI 마커 생성 완료, 총 개수:', newPOIMarkers.length);
  };

  // 포스트 데이터 가져오기
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/posts'],
    enabled: true,
  }) as { data: any[]; isLoading: boolean; error: any };

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

    const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.5665, lng: 126.978 }, // 서울
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

      // Places API를 사용해서 실제 POI 데이터 가져오기
      if (window.google?.maps?.places) {
        const service = new window.google.maps.places.PlacesService(newMap);

        // POI 마커들을 저장할 배열
        const poiMarkers: any[] = [];

        // 지도 이동/줌 변경시 POI 업데이트 (디바운스 적용)
        let poiUpdateTimeout: any = null;
        const updatePOIs = () => {
          if (poiUpdateTimeout) {
            clearTimeout(poiUpdateTimeout);
          }

          poiUpdateTimeout = setTimeout(() => {
            const zoom = newMap.getZoom();
            console.log('POI 업데이트 시작, 줌 레벨:', zoom);

            if (zoom >= 13) {
              // 높은 줌에서만 POI 표시
              // 기존 POI 마커 제거
              poiMarkers.forEach((marker) => marker.setMap(null));
              poiMarkers.length = 0;
              console.log('기존 POI 마커 제거 완료');

              // 현재 지도 영역에서 POI 검색
              const request = {
                location: newMap.getCenter(),
                radius: 2000, // 2km 반경
                type: 'tourist_attraction', // 문자열로 변경
              };

              console.log('POI 검색 요청:', request);

              service.nearbySearch(request, (results: any, status: any) => {
                console.log('POI 검색 결과:', status, results?.length);

                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  results
                ) {
                  console.log('POI 검색 성공, 결과 개수:', results.length);

                  results.slice(0, 10).forEach((place: any, index: number) => {
                    if (place.geometry?.location) {
                      console.log(`POI ${index + 1}:`, place.name, place.types);

                      const placeIcon = getIconForPlaceType(
                        place.types?.[0] || 'point_of_interest'
                      );
                      const poiMarker = new window.google.maps.Marker({
                        position: place.geometry.location,
                        map: newMap,
                        icon: createPOIMarker({ icon: placeIcon }),
                        title: place.name,
                        zIndex: 1000,
                      });

                      console.log('POI 마커 생성:', place.name);

                      poiMarker.addListener('click', (event: any) => {
                        event.stop();
                        console.log('POI 클릭:', place.name);

                        // 다른 모달 먼저 닫기
                        setSelectedPost(null);

                        // Places API에서 상세 정보 가져오기
                        service.getDetails(
                          {
                            placeId: place.place_id,
                            fields: [
                              'name',
                              'photos',
                              'formatted_address',
                              'types',
                              'rating',
                              'reviews',
                            ],
                          },
                          (placeDetails: any, status: any) => {
                            if (
                              status ===
                                window.google.maps.places.PlacesServiceStatus
                                  .OK &&
                              placeDetails
                            ) {
                              console.log(
                                'POI 상세 정보 가져오기 성공:',
                                placeDetails.name
                              );

                              const photoUrl = placeDetails.photos?.[0]?.getUrl(
                                {
                                  maxWidth: 400,
                                  maxHeight: 300,
                                }
                              );

                              setSelectedPOI({
                                name: placeDetails.name || place.name,
                                type:
                                  place.types?.[0]?.replace(/_/g, ' ') || 'POI',
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng(),
                                icon: getIconForPlaceType(
                                  place.types?.[0] || 'point_of_interest'
                                ),
                                image:
                                  photoUrl ||
                                  `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`,
                                description:
                                  placeDetails.formatted_address ||
                                  place.vicinity ||
                                  '흥미로운 장소입니다.',
                                rating: placeDetails.rating,
                                reviews: placeDetails.reviews,
                              });
                            } else {
                              // 상세 정보 없어도 기본 POI 정보로 모달 열기
                              setSelectedPOI({
                                name: place.name,
                                type:
                                  place.types?.[0]?.replace(/_/g, ' ') || 'POI',
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng(),
                                icon: getIconForPlaceType(
                                  place.types?.[0] || 'point_of_interest'
                                ),
                                image: `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`,
                                description:
                                  place.vicinity || '흥미로운 장소입니다.',
                              });
                            }
                          }
                        );
                      });

                      poiMarkers.push(poiMarker);
                    }
                  });

                  console.log(
                    'POI 마커 생성 완료, 총 개수:',
                    poiMarkers.length
                  );
                } else {
                  console.log('POI 검색 실패:', status);
                  if (
                    status ===
                    window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED
                  ) {
                    console.error(
                      'Places API 권한 거부됨. API 키 설정을 확인하세요.'
                    );
                  }
                }
              });
            } else {
              // 낮은 줌에서는 POI 마커 제거
              poiMarkers.forEach((marker) => marker.setMap(null));
              poiMarkers.length = 0;
              console.log('줌 레벨 낮음, POI 마커 제거');
            }
          }, 300); // 300ms 디바운스
        };

        // 지도 이벤트 리스너 추가
        newMap.addListener('idle', updatePOIs);

        // 지도 클릭 이벤트 - 피드 생성 모달 열기
        // 롱탭을 위한 마우스다운 이벤트
        newMap.addListener('mousedown', (event: any) => {
          // POST 모드에서만 롱탭 활성화
          if (mapMode !== 'POST') return;
          
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
          if (mapMode !== 'POST') return;
          
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
      }

      setMap(newMap);
      console.log('Google Maps 초기화 완료');
  }, [isGoogleMapsLoaded]);

  // 마커 생성 (줌 레벨에 따라 클러스터링)
  useEffect(() => {
    if (!map || !window.google || !posts.length) {
      console.log('마커 생성 조건 실패:', {
        map: !!map,
        google: !!window.google,
        postsLength: posts.length,
      });
      return;
    }

    console.log(
      `줌 레벨 ${currentZoom}에서 ${posts.length}개 포스트로 마커 생성 시작`
    );
    console.log(
      '첫 5개 포스트:',
      posts
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          title: p.title,
          lat: p.latitude,
          lng: p.longitude,
          theme: p.theme,
        }))
    );

    // 한국 지역 포스트만 따로 확인
    const koreaPostsInFunction = posts.filter(
      (p: any) =>
        parseFloat(p.latitude) >= 33 &&
        parseFloat(p.latitude) <= 38 &&
        parseFloat(p.longitude) >= 125 &&
        parseFloat(p.longitude) <= 130
    );
    console.log(
      '한국 지역 포스트들:',
      koreaPostsInFunction.map((p: any) => ({
        id: p.id,
        title: p.title,
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
      }))
    );

    // 기존 마커 제거
    markers.forEach((marker) => marker.setMap(null));

    const newMarkers: any[] = [];

    // 사용자 포스트 마커
    if (currentZoom >= 11) {
      // 높은 줌: 개별 테마 아이콘 마커 표시
      const locationGroups = new Map();

      posts.forEach((post: any) => {
        if (!post.latitude || !post.longitude) {
          console.log('좌표 없음:', post.title);
          return;
        }

        const lat = parseFloat(post.latitude);
        const lng = parseFloat(post.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          console.log(
            '좌표 변환 실패:',
            post.title,
            post.latitude,
            post.longitude
          );
          return;
        }

        console.log('마커 추가:', post.title, lat, lng);
        const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, []);
        }
        locationGroups.get(key).push(post);
      });

      console.log(`위치 그룹 개수: ${locationGroups.size}`);

      locationGroups.forEach((groupPosts) => {
        const post = groupPosts[0];
        const count = groupPosts.length;

        console.log(
          `마커 생성: ${post.title} (${count}개 포스트) - 테마: ${post.theme}`
        );

        // 사용자가 만남 열려있는지 확인
        const isUserOpen = Array.isArray(openUsers) && openUsers.some((openUser: any) => openUser.id === post.userId);
        
        const marker = new window.google.maps.Marker({
          position: {
            lat: parseFloat(post.latitude),
            lng: parseFloat(post.longitude),
          },
          map: map,
          icon:
            count > 1
              ? createFeedClusterMarker(count)
              : createFeedMarker(post.theme || 'emotional', 1, isUserOpen),
          title: count > 1 ? `${count}개의 포스트` : post.title,
        });

        marker.addListener('click', () => {
          if (groupPosts.length === 1) {
            setSelectedPost(groupPosts[0]);
          } else {
            console.log(
              `클러스터 클릭: ${groupPosts.length}개 피드`,
              groupPosts.map((p: any) => p.title)
            );
            setSelectedPost({
              isMultiple: true,
              posts: groupPosts,
              count: groupPosts.length,
              location: groupPosts[0].location || '여러 피드',
            });
          }
        });

        newMarkers.push(marker);
      });
    } else {
      // 낮은 줌: 클러스터 마커 표시 (숫자로)
      let clusterSize;
      if (currentZoom <= 3)
        clusterSize = 5.0; // 대륙 레벨
      else if (currentZoom <= 6)
        clusterSize = 2.0; // 국가 레벨
      else if (currentZoom <= 9)
        clusterSize = 0.5; // 지역 레벨
      else if (currentZoom <= 11)
        clusterSize = 0.1; // 도시 레벨
      else clusterSize = 0.05; // 구역 레벨

      const clusters = new Map();

      posts.forEach((post: any) => {
        if (!post.latitude || !post.longitude) {
          console.log('클러스터 - 좌표 없음:', post.title);
          return;
        }

        const lat = parseFloat(post.latitude);
        const lng = parseFloat(post.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          console.log(
            '클러스터 - 좌표 변환 실패:',
            post.title,
            post.latitude,
            post.longitude
          );
          return;
        }

        const clusterLat = Math.round(lat / clusterSize) * clusterSize;
        const clusterLng = Math.round(lng / clusterSize) * clusterSize;
        const key = `${clusterLat.toFixed(2)}_${clusterLng.toFixed(2)}`;

        if (!clusters.has(key)) {
          clusters.set(key, { lat: clusterLat, lng: clusterLng, posts: [] });
        }
        clusters.get(key).posts.push(post);
      });

      clusters.forEach((cluster) => {
        const count = cluster.posts.length;
        if (count === 0) return;

        const marker = new window.google.maps.Marker({
          position: { lat: cluster.lat, lng: cluster.lng },
          map: map,
          icon: createSmallClusterMarker(count),
          title: `${count}개의 포스트`,
        });

        marker.addListener('click', () => {
          const newZoom = Math.min(currentZoom + 4, 18);
          map.setZoom(newZoom);
          map.setCenter({ lat: cluster.lat, lng: cluster.lng });
        });

        newMarkers.push(marker);
      });
    }

    setMarkers(newMarkers);

    console.log(
      `줌 레벨 ${currentZoom}: ${newMarkers.length}개 마커 생성 완료`
    );
  }, [map, posts, currentZoom]);

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

    (window as any).mapContentSearch = (query: string) => {
      console.log('컨텐츠 검색:', query);

      if (!posts || posts.length === 0) {
        console.log('검색할 포스트가 없습니다');
        return;
      }

      console.log('전체 포스트 수:', posts.length);
      console.log('첫 번째 포스트 샘플:', posts[0]);

      // 포스트에서 키워드 검색
      const searchResults = posts.filter((post) => {
        const title = post.title?.toLowerCase() || '';
        const content = post.content?.toLowerCase() || '';
        const location = post.location?.toLowerCase() || '';
        const theme = post.theme?.toLowerCase() || '';
        const searchTerm = query.toLowerCase();

        return (
          title.includes(searchTerm) ||
          content.includes(searchTerm) ||
          location.includes(searchTerm) ||
          theme.includes(searchTerm)
        );
      });

      console.log('검색 결과:', searchResults.length, '개');
      console.log('검색 결과 데이터:', searchResults);

      if (searchResults.length > 0) {
        // 첫 번째 결과로 지도 이동
        const firstResult = searchResults[0];
        console.log('선택된 결과:', firstResult);

        if (firstResult.latitude && firstResult.longitude) {
          const lat = parseFloat(firstResult.latitude);
          const lng = parseFloat(firstResult.longitude);
          console.log('이동할 좌표:', lat, lng);

          map.setCenter({ lat, lng });
          map.setZoom(15);
          console.log('컨텐츠 검색 성공:', firstResult.title);
        } else {
          console.log(
            '좌표 정보 없음:',
            firstResult.latitude,
            firstResult.longitude
          );
        }
      } else {
        console.log('검색 결과 없음');
      }
    };

    return () => {
      delete (window as any).mapLocationSearch;
      delete (window as any).mapContentSearch;
    };
  }, [map, posts]);

  // POI 필터 변경 시 업데이트
  useEffect(() => {
    if (map && currentZoom >= 13) {
      console.log('POI 필터 변경됨:', enabledPOITypes);
      updatePOIs();
    }
  }, [enabledPOITypes, map, currentZoom]);

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
                        console.log('피드 상세보기 클릭');
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
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

      {/* POI 필터링 토글 */}
      <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg z-10">
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="flex items-center justify-between gap-2 w-full p-3 hover:bg-gray-50 rounded-xl transition-colors"
          data-testid="button-toggle-poi-filters"
        >
          <span className="text-xs font-medium text-gray-600">{t('filters.poi')}</span>
          {isFilterExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isFilterExpanded && (
          <div className="px-3 pb-3 space-y-1">
            {[
              { type: 'tourist_attraction', label: t('filters.tourist_attraction'), icon: '🏛️' },
              { type: 'restaurant', label: t('filters.restaurant'), icon: '🍽️' },
              { type: 'lodging', label: t('filters.lodging'), icon: '🏨' },
              { type: 'hospital', label: t('filters.hospital'), icon: '🏥' },
              { type: 'bank', label: t('filters.bank'), icon: '🏦' },
              { type: 'gas_station', label: t('filters.gas_station'), icon: '⛽' },
            ].map((poi) => (
              <label
                key={poi.type}
                className="flex items-center gap-2 cursor-pointer"
                data-testid={`checkbox-poi-${poi.type}`}
              >
                <input
                  type="checkbox"
                  checked={enabledPOITypes.includes(poi.type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEnabledPOITypes([...enabledPOITypes, poi.type]);
                    } else {
                      setEnabledPOITypes(
                        enabledPOITypes.filter((t) => t !== poi.type)
                      );
                    }
                  }}
                  className="rounded text-teal-500"
                />
                <span className="text-xs">
                  {poi.icon} {poi.label}
                </span>
              </label>
            ))}
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
          {mapMode === 'PAN' ? '🖐️ 탐색' : '📌 작성'}
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

      {/* 하단 체험 정보 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t">
        <h3 className="font-semibold text-gray-900">{t('post.experienceCount', { count: posts.length })}</h3>
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
            <h2 className="text-xl font-bold">여기서 미니모임 만들기</h2>
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
              🎯 모임 제목
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
              👥 최대 인원 (본인 포함)
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
              {isLoading ? '생성 중...' : '모임 만들기'}
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
                {isJoining ? '참여 중...' : '🤝 모임 참여하기'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default MapComponent;
