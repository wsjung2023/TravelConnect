// PeopleMarker — v3 지도 사람 마커 SVG 유틸
// 48px 원형 아바타 + mint glow ring (open-to-meet) + 레이블 pill
// Google Maps AdvancedMarkerElement / icon.url 에 data URL로 전달한다.

export interface PeopleMarkerOptions {
  profileImageUrl?: string | null;
  initials?: string;
  label?: string;        // 'Dinner' | 'Photo Walk' | 'Coffee' etc.
  openToMeet?: boolean;
}

const CX = 32;
const CY = 32;
const AVATAR_R = 22;

export function createPeopleMarkerSvg({
  profileImageUrl,
  initials = 'TG',
  label,
  openToMeet = false,
}: PeopleMarkerOptions): string {
  const labelCharW = 5.5;
  const labelPadX = 12;
  const labelH = 14;
  const labelWidth = label ? Math.max(label.length * labelCharW + labelPadX * 2, 32) : 0;
  const svgW = Math.max(CX * 2, labelWidth + 4);
  const labelY = CY + AVATAR_R + 6;
  const svgH = label ? labelY + labelH + 4 : CY + AVATAR_R + 4;
  const lx = svgW / 2;

  const imageEl = profileImageUrl
    ? `<image href="${profileImageUrl}" x="${CX - AVATAR_R}" y="${CY - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" clip-path="url(#ac)" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="${CX}" y="${CY + 5}" text-anchor="middle" fill="#F6F7FB" font-size="13" font-weight="700" font-family="system-ui,sans-serif">${initials.slice(0, 2).toUpperCase()}</text>`;

  const mintRing = openToMeet
    ? `<circle cx="${CX}" cy="${CY}" r="${AVATAR_R + 4}" fill="none" stroke="#7CE7D6" stroke-width="2.5">
        <animate attributeName="opacity" values="0.9;0.35;0.9" dur="2s" repeatCount="indefinite"/>
      </circle>`
    : '';

  const labelPill = label
    ? `<rect x="${lx - labelWidth / 2}" y="${labelY}" width="${labelWidth}" height="${labelH}" rx="7" fill="#151824"/>
       <text x="${lx}" y="${labelY + 9.5}" text-anchor="middle" fill="#A5AEC4" font-size="8" font-family="system-ui,sans-serif">${label}</text>`
    : '';

  const svg = `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="ac"><circle cx="${CX}" cy="${CY}" r="${AVATAR_R}"/></clipPath>
  </defs>
  ${mintRing}
  <circle cx="${CX}" cy="${CY}" r="${AVATAR_R + 1}" fill="#11131A"/>
  <circle cx="${CX}" cy="${CY}" r="${AVATAR_R}" fill="#1F2535"/>
  ${imageEl}
  ${labelPill}
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Cluster badge for 3+ overlapping markers */
export function createClusterMarkerSvg(count: number): string {
  const svg = `<svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
  <circle cx="26" cy="26" r="24" fill="none" stroke="#7CE7D6" stroke-width="2" opacity="0.75">
    <animate attributeName="opacity" values="0.75;0.3;0.75" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="26" cy="26" r="20" fill="#11131A"/>
  <text x="26" y="31" text-anchor="middle" fill="#F6F7FB" font-size="15" font-weight="700" font-family="system-ui,sans-serif">${count}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
