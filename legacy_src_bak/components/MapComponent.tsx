import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Debounce hook for performance optimization
function useDebounce<T>(value: T, delay: number): T {
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
}

interface MapComponentProps {
  className?: string;
}

// Google Maps 전역 선언
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const MapComponent: React.FC<MapComponentProps> = ({ className = '' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  
  // Debounced values for performance
  const debouncedZoom = useDebounce(currentZoom, 150);
  const debouncedCenter = useDebounce(mapCenter, 150);
  const debouncedBounds = useDebounce(mapBounds, 150);

  // 포스트 데이터 가져오기
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['/api/posts'],
    enabled: true
  }) as { data: any[], isLoading: boolean, error: any };
  
  // Viewport filtering for markers - only render markers within visible bounds
  const visiblePosts = useMemo(() => {
    if (!debouncedBounds || !posts.length) return posts;
    
    return posts.filter((post: any) => {
      if (!post.latitude || !post.longitude) return false;
      
      const lat = parseFloat(post.latitude);
      const lng = parseFloat(post.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return false;
      
      return debouncedBounds.contains(new window.google.maps.LatLng(lat, lng));
    });
  }, [posts, debouncedBounds]);
  
  // Enhanced clustering for 200+ markers
  const shouldShowClusters = visiblePosts.length > 200;
  
  console.log('성능 최적화:', {
    totalPosts: posts.length,
    visiblePosts: visiblePosts.length,
    shouldShowClusters,
    zoom: debouncedZoom
  });

  // 포스트 데이터 상태 로깅
  useEffect(() => {
    console.log('포스트 데이터 상태:', {
      loading: isLoading,
      error: error,
      postsCount: posts?.length || 0,
      posts: posts
    });
  }, [posts, isLoading, error]);



  // 테마별 아이콘과 색상
  const getThemeIcon = (theme: string) => {
    const themeIcons = {
      '맛집': { icon: '🍽️', color: '#FF6B6B' },
      '명소': { icon: '🏛️', color: '#4ECDC4' },
      '파티타임': { icon: '🎉', color: '#FF4757' },
      '핫플레이스': { icon: '🔥', color: '#FFA726' },
      '힐링': { icon: '🌿', color: '#66BB6A' },
      '야경': { icon: '🌃', color: '#9B59B6' },
      '하이킹': { icon: '🥾', color: '#27AE60' },
      '호텔': { icon: '🏨', color: '#3498DB' },
      '쇼핑': { icon: '🛍️', color: '#E67E22' },
      '카페': { icon: '☕', color: '#8B4513' }
    } as const;
    return themeIcons[theme as keyof typeof themeIcons] || { icon: '📍', color: '#FF6B6B' };
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
    
    const opacity = 0.3 + (intensity * 0.7); // 0.3~1.0 범위
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // 예쁜 피드 마커 (핀 모양, 참여도별 색상 강도)
  const createPrettyMarker = (theme: string, count: number = 1) => {
    const themeData = getThemeIcon(theme);
    const intensity = Math.min(count / 5, 1); // 5명 이상이면 최대 강도
    const opacity = 0.6 + (intensity * 0.4); // 0.6~1.0 범위
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="22" height="28" viewBox="0 0 22 28" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="feed-shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.25"/>
            </filter>
          </defs>
          <path d="M11 0C5 0 0 5 0 11c0 11 11 17 11 17s11-6 11-17c0-6-5-11-11-11z" 
                fill="${themeData.color}" fill-opacity="${opacity}" stroke="${themeData.color}" 
                stroke-width="1" filter="url(#feed-shadow)"/>
          <circle cx="11" cy="11" r="7" fill="white" stroke="${themeData.color}" stroke-width="1"/>
          <text x="11" y="15" text-anchor="middle" font-size="9" font-family="Arial">${themeData.icon}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(22, 28),
      anchor: new window.google.maps.Point(11, 28)
    };
  };

  // 작은 클러스터 마커
  const createSmallClusterMarker = (count: number) => {
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
      anchor: new window.google.maps.Point(16, 16)
    };
  };

  // POI 명소 데이터 (서울 기준) - 이미지와 설명 추가
  const poiData = [
    { 
      id: 'gyeongbok', name: '경복궁', type: '명소', lat: 37.5789, lng: 126.9770, icon: '🏛️',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
      description: '조선왕조의 법궁으로 한국의 대표적인 궁궐입니다. 웅장한 근정전과 아름다운 경회루를 만날 수 있습니다.'
    },
    { 
      id: 'namsan', name: '남산타워', type: '명소', lat: 37.5512, lng: 126.9882, icon: '🗼',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
      description: '서울의 상징적인 랜드마크로 도시 전체를 한눈에 볼 수 있는 최고의 전망대입니다.'
    },
    { 
      id: 'hongdae', name: '홍대거리', type: '파티타임', lat: 37.5563, lng: 126.9234, icon: '🎉',
      image: 'https://images.unsplash.com/photo-1541976590-713941681591?w=400&h=300&fit=crop',
      description: '젊음과 활기가 넘치는 홍대! 클럽, 바, 라이브 음악으로 가득한 서울 최고의 나이트라이프 명소입니다.'
    },
    { 
      id: 'myeongdong', name: '명동', type: '쇼핑', lat: 37.5636, lng: 126.9850, icon: '🛍️',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
      description: '서울의 대표적인 쇼핑 거리로 백화점, 브랜드샵, 먹거리가 집중된 관광 명소입니다.'
    },
    { 
      id: 'hanriver', name: '한강공원', type: '힐링', lat: 37.5294, lng: 126.9356, icon: '🌿',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
      description: '한강에서 즐기는 여유로운 피크닉과 산책. 서울 시민들의 대표적인 휴식 공간입니다.'
    }
  ];

  // 동그라미 POI 마커 (스크린샷 기준)
  const createPOIMarker = (poi: any) => {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="poi-shadow">
              <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.25"/>
            </filter>
          </defs>
          <circle cx="12" cy="12" r="11" fill="#FF6B9D" filter="url(#poi-shadow)"/>
          <circle cx="12" cy="12" r="8" fill="white"/>
          <text x="12" y="16" text-anchor="middle" font-size="10" font-family="Arial" fill="#666">${poi.icon}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(24, 24),
      anchor: new window.google.maps.Point(12, 12)
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
        center: mapCenter,
        zoom: 13,
        styles: [
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#4ECDC4" }]
          },
          {
            "featureType": "landscape.natural",
            "elementType": "geometry",
            "stylers": [{ "color": "#F5F5DC" }]
          },
          {
            "featureType": "landscape.man_made",
            "elementType": "geometry",
            "stylers": [{ "color": "#FDF6E3" }]
          },
          {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{ "color": "#C8E6C9" }]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels",
            "stylers": [{ "visibility": "on" }]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#4A7C59" }]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{ "color": "#E8E8E8" }, { "weight": 1.2 }]
          },
          {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [{ "color": "#F0F0F0" }, { "weight": 1.0 }]
          },
          {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [{ "color": "#FAFAFA" }, { "weight": 0.6 }]
          },
          {
            "featureType": "road",
            "elementType": "labels",
            "stylers": [{ "visibility": "simplified" }]
          },
          {
            "featureType": "poi.business",
            "elementType": "labels",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "poi.attraction",
            "elementType": "all",
            "stylers": [{ "visibility": "on" }]
          },
          {
            "featureType": "poi.place_of_worship",
            "elementType": "all", 
            "stylers": [{ "visibility": "on" }]
          },
          {
            "featureType": "poi.government",
            "elementType": "all",
            "stylers": [{ "visibility": "on" }]
          },
          {
            "featureType": "poi.medical",
            "elementType": "labels",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "poi.school",
            "elementType": "labels", 
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "transit",
            "stylers": [{ "visibility": "off" }]
          },
          {
            "featureType": "administrative",
            "elementType": "labels",
            "stylers": [{ "visibility": "simplified" }]
          },
          {
            "featureType": "road",
            "elementType": "labels",
            "stylers": [{ "visibility": "simplified" }]
          }
        ],
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      // 줌 변경 이벤트 리스너
      // Debounced event listeners for performance
      newMap.addListener('zoom_changed', () => {
        const zoom = newMap.getZoom();
        setCurrentZoom(zoom);
      });
      
      newMap.addListener('center_changed', () => {
        const center = newMap.getCenter();
        if (center) {
          setMapCenter({ lat: center.lat(), lng: center.lng() });
        }
      });
      
      newMap.addListener('bounds_changed', () => {
        const bounds = newMap.getBounds();
        setMapBounds(bounds);
      });

      setMap(newMap);
      console.log('Google Maps 초기화 완료');
    };

    initGoogleMaps();
  }, []);

  // 마커 생성 (성능 최적화: debounced values 및 viewport 필터링)
  useEffect(() => {
    if (!map || !window.google || !visiblePosts.length) return;
    
    console.log('마커 업데이트 시작:', { zoom: debouncedZoom, visibleCount: visiblePosts.length });

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    
    const newMarkers: any[] = [];

    // 사용자 포스트 마커 (성능 최적화)
    if (debouncedZoom >= 11 && !shouldShowClusters) {
      // 높은 줌: 개별 테마 아이콘 마커 표시
      const locationGroups = new Map();
      
      visiblePosts.forEach((post: any) => {
        if (!post.latitude || !post.longitude) return;
        
        const lat = parseFloat(post.latitude);
        const lng = parseFloat(post.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, []);
        }
        locationGroups.get(key).push(post);
      });

      // POI 마커 추가 (높은 줌에서만, 성능 최적화)
      if (debouncedZoom >= 13 && visiblePosts.length < 100) {
        poiData.forEach((poi) => {
          const poiMarker = new window.google.maps.Marker({
            position: { lat: poi.lat, lng: poi.lng },
            map: map,
            icon: createPOIMarker(poi),
            title: poi.name
          });

          poiMarker.addListener('click', () => {
            setSelectedPOI(poi);
          });

          newMarkers.push(poiMarker);
        });
      }

      locationGroups.forEach((groupPosts) => {
        const post = groupPosts[0];
        const count = groupPosts.length;
        
        const marker = new window.google.maps.Marker({
          position: { 
            lat: parseFloat(post.latitude), 
            lng: parseFloat(post.longitude) 
          },
          map: map,
          icon: createPrettyMarker(post.theme, count),
          title: `${count}개의 포스트`
        });

        marker.addListener('click', () => {
          setSelectedPost(groupPosts);
        });

        newMarkers.push(marker);
      });
      
    } else {
      // 낮은 줌 또는 200+ 마커: 효율적인 클러스터 표시
      let clusterSize;
      if (debouncedZoom <= 3) clusterSize = 5.0;        // 대륙 레벨
      else if (debouncedZoom <= 6) clusterSize = 2.0;   // 국가 레벨  
      else if (debouncedZoom <= 9) clusterSize = 0.5;   // 지역 레벨
      else if (debouncedZoom <= 11) clusterSize = 0.1;  // 도시 레벨
      else clusterSize = 0.05;                        // 구역 레벨

      const clusters = new Map();

      visiblePosts.forEach((post: any) => {
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
        clusters.get(key).posts.push(post);
      });

      clusters.forEach((cluster) => {
        const count = cluster.posts.length;
        if (count === 0) return;

        const marker = new window.google.maps.Marker({
          position: { lat: cluster.lat, lng: cluster.lng },
          map: map,
          icon: createSmallClusterMarker(count),
          title: `${count}개의 포스트`
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
    console.log(`줌 레벨 ${debouncedZoom}: ${newMarkers.length}개 마커 생성 (최적화됨)`);
  }, [map, debouncedZoom, visiblePosts, shouldShowClusters]);

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
        fields: ['place_id', 'name', 'geometry', 'formatted_address']
      };

      service.textSearch(request, (results: any, status: any) => {
        console.log('Places API 상태:', status);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
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
      const searchResults = posts.filter(post => {
        const title = post.title?.toLowerCase() || '';
        const content = post.content?.toLowerCase() || '';
        const location = post.location?.toLowerCase() || '';
        const theme = post.theme?.toLowerCase() || '';
        const searchTerm = query.toLowerCase();
        
        return title.includes(searchTerm) || 
               content.includes(searchTerm) || 
               location.includes(searchTerm) || 
               theme.includes(searchTerm);
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
          console.log('좌표 정보 없음:', firstResult.latitude, firstResult.longitude);
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

  return (
    <div className={`relative h-full ${className}`}>


      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="w-full h-full" />

      {/* POI 모달 */}
      {selectedPOI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm mx-4 w-full">
            {/* POI 이미지 */}
            <div className="h-48 relative overflow-hidden">
              <img 
                src={selectedPOI.image} 
                alt={selectedPOI.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const nextEl = target.nextElementSibling as HTMLElement;
                  if (nextEl) nextEl.style.display = 'block';
                }}
              />
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 hidden"></div>
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-3xl mb-2">{selectedPOI.icon}</div>
                <h2 className="text-xl font-bold">{selectedPOI.name}</h2>
                <p className="text-sm opacity-90">{selectedPOI.type}</p>
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
                  {selectedPOI.description || `${selectedPOI.name}은(는) 서울의 대표적인 ${selectedPOI.type} 명소입니다.`}
                </p>
              </div>
              
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors">
                📝 이곳에서 추억 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 포스트 모달 */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-sm mx-4 w-full">
            {/* 포스트 이미지 */}
            <div className="h-48 bg-gradient-to-br from-pink-400 to-purple-500 relative">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    👤
                  </div>
                  <div>
                    <p className="font-medium">여행자</p>
                    <p className="text-xs opacity-80">2일 전</p>
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
                  {Array.isArray(selectedPost) ? selectedPost[0]?.title : selectedPost?.title || '여행 포스트'}
                </h2>
              </div>
            </div>
            
            {/* 포스트 내용 */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed mb-3">
                  {Array.isArray(selectedPost) ? selectedPost[0]?.content : selectedPost?.content || '멋진 여행 경험을 공유합니다!'}
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  {(Array.isArray(selectedPost) ? selectedPost[0]?.theme : selectedPost?.theme) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-pink-100 text-pink-600">
                      {getThemeIcon(Array.isArray(selectedPost) ? selectedPost[0]?.theme : selectedPost?.theme).icon} {Array.isArray(selectedPost) ? selectedPost[0]?.theme : selectedPost?.theme}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} />
                  <span>{Array.isArray(selectedPost) ? selectedPost[0]?.location : selectedPost?.location || '위치 정보'}</span>
                </div>
              </div>
              
              <button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all">
                ✨ 나도 여기서 흔적 남기기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 체험 정보 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t">
        <h3 className="font-semibold text-gray-900">
          {posts.length}개의 체험
        </h3>
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