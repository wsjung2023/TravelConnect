// 지도 프로필 버블 마커 유틸 — Open to Meet 사용자를 원형 프로필 + 링 + 펄스로 표현한다.
export function createProfileBubbleMarker(profileImageUrl?: string | null, label: string = 'TG') {
  const image = profileImageUrl
    ? `<image href="${profileImageUrl}" x="6" y="6" width="36" height="36" clip-path="url(#avatarClip)" />`
    : `<text x="24" y="29" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">${label.slice(0, 2).toUpperCase()}</text>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pulse-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/>
        </filter>
        <clipPath id="avatarClip"><circle cx="24" cy="24" r="18"/></clipPath>
      </defs>
      <circle cx="24" cy="24" r="21" fill="#7B5EA7" fill-opacity="0.25">
        <animate attributeName="r" values="20;22;20" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="20" fill="#111827" stroke="#7B5EA7" stroke-width="2" filter="url(#pulse-shadow)"/>
      <circle cx="24" cy="24" r="18" fill="#334155"/>
      ${image}
      <circle cx="38" cy="10" r="4" fill="#10B981" stroke="#ffffff" stroke-width="1.5"/>
    </svg>
  `)}`;
}
