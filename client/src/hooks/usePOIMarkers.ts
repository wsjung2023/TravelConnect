// POI 마커 훅 — POI(관심장소) 데이터를 Google Maps 마커로 변환하고, 줌 레벨 기반 필터링을 관리한다.
/**
 * usePOIMarkers - POI(관심지점) 마커 관리 훅
 * 
 * 목적: MapComponent의 POI 관련 useEffect 분리 및 안정화
 * 
 * 핵심 변경사항:
 * 1. useRef로 POI 마커 관리 (렌더링 유발 방지)
 * 2. useCallback으로 updatePOIs 안정화
 * 3. 디바운스 적용으로 과도한 API 호출 방지
 */

import { useRef, useCallback, useEffect } from 'react';

interface UsePOIMarkersProps {
  map: google.maps.Map | null;
  enabledPOITypes: string[];
  currentZoom: number;
  onPOIClick: (poi: any) => void;
}

interface UsePOIMarkersReturn {
  updatePOIs: () => void;
  clearPOIs: () => void;
}

export function usePOIMarkers({
  map,
  enabledPOITypes,
  currentZoom,
  onPOIClick,
}: UsePOIMarkersProps): UsePOIMarkersReturn {
  // useRef로 마커 관리 - 상태 변경 없이 마커 추적
  const poiMarkersRef = useRef<google.maps.Marker[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  // 장소 타입에 따른 아이콘 반환
  const getIconForPlaceType = useCallback((type: string): string => {
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
  }, []);

  // POI 마커 아이콘 생성 (foreignObject로 이모지 렌더링)
  const createPOIMarkerIcon = useCallback((icon: string) => {
    if (!window.google) return null;
    
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
          <foreignObject x="4" y="4" width="18" height="18">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;font-size:11px;">${icon}</div>
          </foreignObject>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(39, 39),
      anchor: new window.google.maps.Point(19.5, 19.5),
    };
  }, []);

  // POI 마커 모두 제거
  const clearPOIs = useCallback(() => {
    poiMarkersRef.current.forEach((marker) => marker.setMap(null));
    poiMarkersRef.current = [];
  }, []);

  // POI 업데이트 함수 (안정화됨)
  const updatePOIsInternal = useCallback(async () => {
    if (!map || !window.google) return;
    if (isUpdatingRef.current) return;

    // 줌 레벨이 13 미만이거나 활성화된 POI 타입이 없으면 마커 제거
    if (currentZoom < 13 || enabledPOITypes.length === 0) {
      clearPOIs();
      return;
    }

    isUpdatingRef.current = true;

    try {
      // 기존 POI 마커 제거
      clearPOIs();

      const center = map.getCenter();
      if (!center) {
        isUpdatingRef.current = false;
        return;
      }

      const newPOIMarkers: google.maps.Marker[] = [];
      const service = new window.google.maps.places.PlacesService(map);

      // 각 활성화된 POI 타입별로 검색
      for (const poiType of enabledPOITypes) {
        const request = {
          location: center,
          radius: 2000,
          type: poiType,
        };

        await new Promise<void>((resolve) => {
          service.nearbySearch(request, (results: any, status: any) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results
            ) {
              results.slice(0, 5).forEach((place: any) => {
                const icon = getIconForPlaceType(place.types[0]);
                const markerIcon = createPOIMarkerIcon(icon);

                if (!markerIcon) {
                  resolve();
                  return;
                }

                const marker = new window.google.maps.Marker({
                  position: place.geometry.location,
                  map: map,
                  icon: markerIcon,
                  title: place.name,
                });

                // POI 클릭 이벤트
                marker.addListener('click', (event: any) => {
                  event.stop();

                  // Places API에서 상세 정보 가져오기
                  service.getDetails(
                    {
                      placeId: place.place_id,
                      fields: ['name', 'photos', 'formatted_address', 'types', 'rating', 'reviews'],
                    },
                    (placeDetails: any, detailStatus: any) => {
                      if (
                        detailStatus === window.google.maps.places.PlacesServiceStatus.OK &&
                        placeDetails
                      ) {
                        const photoUrl = placeDetails.photos?.[0]?.getUrl({
                          maxWidth: 400,
                          maxHeight: 300,
                        });

                        onPOIClick({
                          name: placeDetails.name || place.name,
                          type: place.types?.[0]?.replace(/_/g, ' ') || 'POI',
                          lat: place.geometry.location.lat(),
                          lng: place.geometry.location.lng(),
                          icon: getIconForPlaceType(place.types?.[0] || 'point_of_interest'),
                          image: photoUrl || `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`,
                          description: placeDetails.formatted_address || place.vicinity || '흥미로운 장소입니다.',
                          rating: placeDetails.rating,
                          reviews: placeDetails.reviews,
                        });
                      } else {
                        // 상세 정보 없어도 기본 POI 정보로 모달 열기
                        onPOIClick({
                          name: place.name,
                          type: place.types?.[0]?.replace(/_/g, ' ') || 'POI',
                          lat: place.geometry.location.lat(),
                          lng: place.geometry.location.lng(),
                          icon: getIconForPlaceType(place.types?.[0] || 'point_of_interest'),
                          image: `https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop`,
                          description: place.vicinity || '흥미로운 장소입니다.',
                        });
                      }
                    }
                  );
                });

                newPOIMarkers.push(marker);
              });
            }
            resolve();
          });
        });
      }

      poiMarkersRef.current = newPOIMarkers;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [map, currentZoom, enabledPOITypes, clearPOIs, getIconForPlaceType, createPOIMarkerIcon, onPOIClick]);

  // 디바운스된 POI 업데이트
  const updatePOIs = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updatePOIsInternal();
    }, 300);
  }, [updatePOIsInternal]);

  // POI 필터 변경 시 업데이트
  useEffect(() => {
    if (map && currentZoom >= 13) {
      updatePOIs();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabledPOITypes, map, currentZoom, updatePOIs]);

  // 컴포넌트 언마운트 시 클린업
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearPOIs();
    };
  }, [clearPOIs]);

  return {
    updatePOIs,
    clearPOIs,
  };
}
