import { useEffect, useRef } from 'react';

export default function MapTest() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Google Maps 스크립트 로드
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // 전역 콜백 함수 설정
      (window as any).initMap = initMap;
      
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) return;

      console.log('Google Maps 초기화 시작');
      
      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.5665, lng: 126.9780 }, // 서울
          zoom: 12,
        });

        // 마커 추가
        new window.google.maps.Marker({
          position: { lat: 37.5665, lng: 126.9780 },
          map: map,
          title: '서울',
        });

        console.log('Google Maps 로드 성공!');
      } catch (error) {
        console.error('Google Maps 초기화 에러:', error);
      }
    };

    loadGoogleMaps();
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <h1 style={{ padding: '20px', margin: 0, backgroundColor: '#f0f0f0' }}>
        2단계: 전체 화면 지도 (레이아웃 제거)
      </h1>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 60px)',
          backgroundColor: '#e0e0e0'
        }}
      >
        지도 로딩 중...
      </div>
    </div>
  );
}