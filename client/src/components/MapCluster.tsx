// client/src/components/MapCluster.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import Supercluster from 'supercluster';
import { makePinSVG } from '@/lib/markerSvg';

type Pt = { id: string; lat: number; lng: number };
type Props = {
  map: google.maps.Map | null;        // 부모 Map 컴포넌트에서 넘겨줌
  points: Pt[];                       // 서버/캐시에서 받은 POI/피드 좌표들
  zoom: number;
  bounds: google.maps.LatLngBounds | null;
  onClusterClick?: (ids: string[]) => void;
  onPointClick?: (id: string) => void;
};

export default function MapCluster({ map, points, zoom, bounds, onClusterClick, onPointClick }: Props) {
  const markersRef = useRef<google.maps.Marker[]>([]);

  // 1) GeoJSON 포맷으로 변환
  const features = useMemo(() => points.map(p => ({
    type: 'Feature',
    properties: { pointId: p.id },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
  })), [points]);

  // 2) Supercluster 인덱스 구성 (줌 0~20)
  const index = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,        // 픽셀 반경
      maxZoom: 20,
      minPoints: 3       // 클러스터 최소 포인트 수
    });
    sc.load(features as any);
    return sc;
  }, [features]);

  // 3) 현재 뷰포트(BBOX)에서 클러스터 가져오기
  const clusters = useMemo(() => {
    if (!bounds) return [];
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const bbox: [number, number, number, number] = [sw.lng(), sw.lat(), ne.lng(), ne.lat()];
    return index.getClusters(bbox, Math.round(zoom));
  }, [bounds, zoom, index]);

  // 4) 클러스터/포인트를 구글 마커로 렌더
  useEffect(() => {
    if (!map) return;

    // 이전 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    clusters.forEach((c: any) => {
      const [lng, lat] = c.geometry.coordinates;
      const isCluster = !!c.properties.cluster;
      const pos = new google.maps.LatLng(lat, lng);

      // 스타일: 클러스터는 수량, 포인트는 점
      const label = isCluster ? String(c.properties.point_count) : undefined;
      const icon = makePinSVG({
        text: label,
        fill: isCluster ? '#0ea5e9' : '#2563eb', // 클러스터: 하늘색, 단일: 파랑
      });

      const marker = new google.maps.Marker({
        position: pos,
        map,
        icon,
        optimized: true,
      });

      // 클릭 동작
      if (isCluster) {
        marker.addListener('click', () => {
          const expansionZoom = Math.min(
            index.getClusterExpansionZoom(c.properties.cluster_id),
            20
          );
          map.setZoom(expansionZoom);
          map.panTo(pos);
          if (onClusterClick) {
            // 클러스터 내 개별 포인트 id들 모으기 (원하면 사용)
            const leaves = index.getLeaves(c.properties.cluster_id, Infinity);
            onClusterClick(leaves.map((l: any) => l.properties.pointId));
          }
        });
      } else {
        marker.addListener('click', () => {
          onPointClick?.(c.properties.pointId);
        });
      }

      markersRef.current.push(marker);
    });

    // cleanup
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
    };
  }, [clusters, map, index, onClusterClick, onPointClick]);

  return null;
}
