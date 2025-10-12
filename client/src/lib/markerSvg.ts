// client/src/lib/markerSvg.ts
export function makePinSVG({
  text,
  fill = '#2563eb', // 파랑
  textColor = '#ffffff'
}: { text?: string; fill?: string; textColor?: string }) {
  const label = text ? `<text x="12" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="${textColor}">${text}</text>` : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
      <path d="M12 0C6 0 1.5 4.6 1.5 10.2c0 7.7 9 20.8 9.4 21.4a1.4 1.4 0 0 0 2.2 0c.5-.6 9.4-13.7 9.4-21.4C22.5 4.6 18 0 12 0z" fill="${fill}"/>
      ${label}
    </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
