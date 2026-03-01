// 공통 유틸리티 함수 — 날짜 포맷, 문자열 처리, 거리 계산 등 프론트·백 양쪽에서 사용하는 순수 함수 모음이다.
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isInBounds(
  lat: number,
  lng: number,
  bounds: google.maps.LatLngBounds
): boolean {
  const point = new google.maps.LatLng(lat, lng);
  return bounds.contains(point);
}
