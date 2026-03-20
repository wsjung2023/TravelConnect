// PeopleMarker — 지도 사람 마커 SVG: 원형 아바타 56px + mint neon 링 + 라벨 pill
// NO pin/teardrop. Circular only. Matches concept art exactly.

export interface PeopleMarkerOptions {
  profileImageUrl?: string | null;
  initials?: string;
  label?: string;
  openToMeet?: boolean;
}

// SVG layout constants
const CX = 40;          // center X
const CY = 40;          // center Y
const R_AVATAR = 27;    // avatar clip radius  (54px diameter)
const R_BORDER = 29;    // dark border backing circle
const R_MINT   = 31;    // mint ring radius
const R_GLOW1  = 33;    // inner glow halo
const R_GLOW2  = 35;    // outer glow halo
const SVG_W    = 80;    // fixed SVG width

export function createPeopleMarkerSvg({
  profileImageUrl,
  initials = 'TG',
  label,
  openToMeet = false,
}: PeopleMarkerOptions): string {
  // Label pill dimensions
  const charW = 5.8;
  const padX  = 12;
  const pillH = 15;
  const pillW = label ? Math.max(label.length * charW + padX * 2, 36) : 0;
  const pillX = label ? (SVG_W - pillW) / 2 : 0;
  const pillY = CY + R_BORDER + 6;
  const svgH  = label ? pillY + pillH + 4 : CY + R_BORDER + 4;

  const initials2 = (initials ?? 'TG').slice(0, 2).toUpperCase();

  // Profile image or initials text
  const contentEl = profileImageUrl
    ? `<image href="${profileImageUrl}" x="${CX - R_AVATAR}" y="${CY - R_AVATAR}" width="${R_AVATAR * 2}" height="${R_AVATAR * 2}" clip-path="url(#pm-clip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="${CX}" y="${CY + 6}" text-anchor="middle" fill="#F6F7FB" font-size="14" font-weight="700" font-family="system-ui,sans-serif">${initials2}</text>`;

  // Mint glow rings (only for openToMeet)
  const glowRings = openToMeet ? `
    <circle cx="${CX}" cy="${CY}" r="${R_GLOW2}" fill="none" stroke="#7CE7D6" stroke-width="1">
      <animate attributeName="opacity" values="0.12;0.28;0.12" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${CX}" cy="${CY}" r="${R_GLOW1}" fill="none" stroke="#7CE7D6" stroke-width="1.5">
      <animate attributeName="opacity" values="0.25;0.5;0.25" dur="2s" repeatCount="indefinite" begin="0.3s"/>
    </circle>
    <circle cx="${CX}" cy="${CY}" r="${R_MINT}" fill="none" stroke="#7CE7D6" stroke-width="2.5"/>` : '';

  // Label pill
  const pillEl = label ? `
    <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="7.5" fill="#151824" fill-opacity="0.92"/>
    <text x="${SVG_W / 2}" y="${pillY + 10.5}" text-anchor="middle" fill="#A5AEC4" font-size="9" font-family="system-ui,sans-serif">${label}</text>` : '';

  const svg = `<svg width="${SVG_W}" height="${svgH}" viewBox="0 0 ${SVG_W} ${svgH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="pm-clip"><circle cx="${CX}" cy="${CY}" r="${R_AVATAR}"/></clipPath>
  </defs>
  ${glowRings}
  <circle cx="${CX}" cy="${CY}" r="${R_BORDER}" fill="#11131A"/>
  <circle cx="${CX}" cy="${CY}" r="${R_AVATAR}" fill="#1F2535"/>
  ${contentEl}
  ${pillEl}
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Cluster badge for 3+ overlapping open-to-meet markers */
export function createClusterMarkerSvg(count: number): string {
  const svg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="none" stroke="#7CE7D6" stroke-width="1.5">
    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="32" cy="32" r="26" fill="#11131A"/>
  <circle cx="32" cy="32" r="24" fill="#1F2535"/>
  <text x="32" y="38" text-anchor="middle" fill="#F6F7FB" font-size="16" font-weight="700" font-family="system-ui,sans-serif">${count}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
