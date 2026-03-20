// 레이더 시각화 — 순수 블랙 배경, SMIL 스캔빔, HTML div 아바타 dots (36px + mint glow ring)
import { useAuth } from '@/hooks/useAuth';

interface Props { users?: any[] }

const SIZE = 300;
const CX = 150;
const CY = 150;
const MAX_R = 122;
const DOT_R = 18; // half of 36px dot

const DOT_SLOTS = [
  { angle: 42,  r: 0.37 },
  { angle: 138, r: 0.57 },
  { angle: 218, r: 0.44 },
  { angle: 312, r: 0.64 },
  { angle: 22,  r: 0.72 },
];

function polarToPct(angleDeg: number, rFrac: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  const x = CX + Math.cos(rad) * rFrac * MAX_R;
  const y = CY + Math.sin(rad) * rFrac * MAX_R;
  return { left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` };
}

function getInitial(u: any) {
  return (u?.firstName?.[0] ?? u?.username?.[0] ?? 'T').toUpperCase();
}

// Beam wedge path (60° sector from top, will be rotated)
const BEAM_R = MAX_R + 4;
const BEAM_END_X = CX + BEAM_R * Math.sin((60 * Math.PI) / 180);
const BEAM_END_Y = CY - BEAM_R * Math.cos((60 * Math.PI) / 180);
const BEAM_D = `M ${CX} ${CY} L ${CX} ${CY - BEAM_R} A ${BEAM_R} ${BEAM_R} 0 0 1 ${BEAM_END_X} ${BEAM_END_Y} Z`;

export default function RadarView({ users = [] }: Props) {
  const { user: me } = useAuth();
  const myInitial = me ? getInitial(me) : 'ME';
  const myAvatar = (me as any)?.profileImageUrl ?? null;

  const dots = DOT_SLOTS.slice(0, Math.min(users.length, 5)).map((slot, i) => ({
    pct: polarToPct(slot.angle, slot.r),
    user: users[i],
    isOpen: users[i]?.openToMeet ?? true,
  }));

  return (
    <div style={{ width: '100%', background: '#000', display: 'flex', justifyContent: 'center', position: 'relative', paddingTop: 8, paddingBottom: 4 }}>
      {/* Fixed-size 300×300 radar canvas */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>

        {/* SVG: radial bg + rings + beam */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            {/* Radial bg glow */}
            <radialGradient id="rdrBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#7CE7D6" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#7CE7D6" stopOpacity="0" />
            </radialGradient>
            {/* Beam fill: bright at leading edge, fades to transparent */}
            <radialGradient id="beamFill" cx="50%" cy="50%" r="50%" gradientUnits="userSpaceOnUse"
              cx={String(CX)} cy={String(CY)} r={String(BEAM_R)}>
              <stop offset="0%"   stopColor="#7CE7D6" stopOpacity="0.22" />
              <stop offset="70%"  stopColor="#7CE7D6" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#7CE7D6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Radial glow bg */}
          <circle cx={CX} cy={CY} r={MAX_R + 10} fill="url(#rdrBg)" />

          {/* 4 concentric mint rings (solid, decreasing opacity outward) */}
          {[0.32, 0.54, 0.74, 1.0].map((frac, i) => (
            <circle key={i} cx={CX} cy={CY} r={MAX_R * frac}
              fill="none" stroke="#7CE7D6" strokeWidth={i === 3 ? 1.2 : 0.8}
              strokeOpacity={[0.55, 0.42, 0.30, 0.18][i]} />
          ))}

          {/* Crosshairs */}
          <line x1={CX} y1={CY - MAX_R - 6} x2={CX} y2={CY + MAX_R + 6}
            stroke="#7CE7D6" strokeWidth={0.35} strokeOpacity={0.15} />
          <line x1={CX - MAX_R - 6} y1={CY} x2={CX + MAX_R + 6} y2={CY}
            stroke="#7CE7D6" strokeWidth={0.35} strokeOpacity={0.15} />

          {/* Scan beam (SMIL rotation — guaranteed cross-browser) */}
          <g>
            <path d={BEAM_D} fill="url(#beamFill)">
              <animateTransform attributeName="transform" type="rotate"
                from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`}
                dur="4s" repeatCount="indefinite" />
            </path>
            {/* Leading edge line — bright */}
            <line x1={CX} y1={CY} x2={CX} y2={CY - BEAM_R}
              stroke="#7CE7D6" strokeWidth={1.5} strokeOpacity={0.75}>
              <animateTransform attributeName="transform" type="rotate"
                from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`}
                dur="4s" repeatCount="indefinite" />
            </line>
          </g>
        </svg>

        {/* User avatar dots — HTML divs for proper glow ring */}
        {dots.map(({ pct, user, isOpen }, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: pct.left,
            top: pct.top,
            transform: 'translate(-50%, -50%)',
            width: DOT_R * 2,
            height: DOT_R * 2,
            borderRadius: '50%',
            background: user?.profileImageUrl ? undefined : 'var(--surface-2)',
            backgroundImage: user?.profileImageUrl ? `url(${user.profileImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '2px solid #11131A',
            boxShadow: isOpen
              ? '0 0 0 2.5px #7CE7D6, 0 0 8px rgba(124,231,214,0.5)'
              : '0 0 0 2px rgba(124,231,214,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#7CE7D6',
            zIndex: 2,
          }}>
            {!user?.profileImageUrl && getInitial(user)}
            {/* Online indicator */}
            {isOpen && (
              <span style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 7, height: 7, borderRadius: '50%',
                background: '#4ADE80', border: '1.5px solid #000',
              }} />
            )}
          </div>
        ))}

        {/* Center: my avatar — 48px + thick mint glow + pulse */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: myAvatar ? undefined : 'var(--surface-2)',
          backgroundImage: myAvatar ? `url(${myAvatar})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '2.5px solid #000',
          boxShadow: '0 0 0 3px #7CE7D6, 0 0 16px rgba(124,231,214,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: '#7CE7D6',
          zIndex: 3,
          animation: 'meetCenterPulse 2s ease-in-out infinite',
        }}>
          {!myAvatar && myInitial}
        </div>

        <style>{`
          @keyframes meetCenterPulse {
            0%, 100% { box-shadow: 0 0 0 3px #7CE7D6, 0 0 16px rgba(124,231,214,0.45); }
            50%       { box-shadow: 0 0 0 6px rgba(124,231,214,0.5), 0 0 24px rgba(124,231,214,0.2); }
          }
        `}</style>
      </div>
    </div>
  );
}
