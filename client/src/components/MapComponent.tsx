import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);

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

  // 만남 열려있는 사용자들 조회
  const { data: openUsers = [] } = useQuery({
    queryKey: ['/api/users/open'],
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

  // 150ms debounce for optimal performance
  const debouncedZoom = useDebounce(currentZoom, 150);
  const debouncedCenter = useDebounce(mapCenter, 150);
  const debouncedBounds = useDebounce(mapBounds, 150);
  const [enabledPOITypes, setEnabledPOITypes] = useState<string[]>([
    'tourist_attraction',
  ]);


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

  // Google Maps 초기화
  useEffect(() => {
    const initGoogleMaps = () => {
      if (!window.google || !window.google.maps) {
        console.log('Google Maps API 로딩 중...');
        setTimeout(initGoogleMaps, 100);
        return;
      }

      if (!mapRef.current || map) return;

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
        newMap.addListener('click', (event: any) => {
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
    };

    initGoogleMaps();
  }, []);

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
        const isUserOpen = openUsers.some((openUser: any) => openUser.id === post.userId);
        
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
      <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg p-3 z-10">
        <div className="text-xs font-medium text-gray-600 mb-2">POI 필터</div>
        <div className="space-y-1">
          {[
            { type: 'tourist_attraction', label: '관광명소', icon: '🏛️' },
            { type: 'restaurant', label: '맛집', icon: '🍽️' },
            { type: 'lodging', label: '호텔', icon: '🏨' },
            { type: 'hospital', label: '병원', icon: '🏥' },
            { type: 'bank', label: '은행', icon: '🏦' },
            { type: 'gas_station', label: '주유소', icon: '⛽' },
          ].map((poi) => (
            <label
              key={poi.type}
              className="flex items-center gap-2 cursor-pointer"
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
      </div>

      {/* 하단 체험 정보 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t">
        <h3 className="font-semibold text-gray-900">{posts.length}개의 체험</h3>
      </div>
    </div>
  );
};

// Google Maps 스크립트 로드
if (typeof window !== 'undefined') {
  if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('API 키 확인:', apiKey ? '존재함' : '없음');

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      console.log('Google Maps 스크립트 로드 완료');
    };

    script.onerror = () => {
      console.error('Google Maps 스크립트 로드 실패');
    };
  }
}

export default MapComponent;
