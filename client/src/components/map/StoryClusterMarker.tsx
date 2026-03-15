// 지도 스토리 클러스터 마커 유틸 — 사람/스토리 버블 클러스터를 원형 카드 느낌으로 만든다.
export function createStoryClusterMarker(count: number) {
  const tone = count > 20 ? '#FF6B6B' : count > 10 ? '#9B75CF' : '#7B5EA7';

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="cluster-shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/></filter>
      </defs>
      <circle cx="22" cy="22" r="21" fill="#0f172a" stroke="${tone}" stroke-width="2" filter="url(#cluster-shadow)"/>
      <circle cx="22" cy="22" r="15" fill="${tone}" fill-opacity="0.22"/>
      <text x="22" y="27" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700" font-family="Arial">${count}</text>
    </svg>
  `)}`;
}
