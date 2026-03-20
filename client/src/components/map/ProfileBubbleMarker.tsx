// 지도 프로필 버블 마커 유틸 — mint neon profile bubble matching the new meet/map visual language.
export function createProfileBubbleMarker(profileImageUrl?: string | null, label: string = 'TG') {
  const image = profileImageUrl
    ? `<image href="${profileImageUrl}" x="6" y="6" width="36" height="36" clip-path="url(#avatarClip)" />`
    : `<text x="24" y="29" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">${label.slice(0, 2).toUpperCase()}</text>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pulse-shadow">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#7CE7D6" flood-opacity="0.35"/>
        </filter>
        <clipPath id="avatarClip"><circle cx="24" cy="24" r="18"/></clipPath>
      </defs>
      <circle cx="24" cy="24" r="21" fill="#7CE7D6" fill-opacity="0.12">
        <animate attributeName="r" values="20;22;20" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="20" fill="#11131A" stroke="#7CE7D6" stroke-width="2" filter="url(#pulse-shadow)"/>
      <circle cx="24" cy="24" r="18" fill="#1F2535"/>
      ${image}
      <circle cx="38" cy="10" r="4" fill="#4ADE80" stroke="#ffffff" stroke-width="1.5"/>
    </svg>
  `)}`;
}
