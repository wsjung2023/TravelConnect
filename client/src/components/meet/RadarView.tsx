// 레이더 시각화 — mockup-inspired premium mint radar with glow field, sweep beam, and avatar satellites.
import { useAuth } from '@/hooks/useAuth';

interface Props { users?: any[] }

const SIZE = 318;
const CX = 159;
const CY = 159;
const MAX_R = 126;
const DOT_R = 19;

const DOT_SLOTS = [
  { angle: 36, r: 0.68 },
  { angle: 120, r: 0.55 },
  { angle: 210, r: 0.5 },
  { angle: 302, r: 0.74 },
  { angle: 15, r: 0.42 },
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

const BEAM_R = MAX_R + 8;
const BEAM_END_X = CX + BEAM_R * Math.sin((56 * Math.PI) / 180);
const BEAM_END_Y = CY - BEAM_R * Math.cos((56 * Math.PI) / 180);
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
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        paddingTop: 6,
        paddingBottom: 8,
        background: 'radial-gradient(circle at center, rgba(124,231,214,0.05) 0%, rgba(7,9,13,0) 62%)',
      }}
    >
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="rdrBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7CE7D6" stopOpacity="0.12" />
              <stop offset="55%" stopColor="#7CE7D6" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#7CE7D6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="beamFill" gradientUnits="userSpaceOnUse" cx={String(CX)} cy={String(CY)} r={String(BEAM_R)}>
              <stop offset="0%" stopColor="#7CE7D6" stopOpacity="0.26" />
              <stop offset="72%" stopColor="#7CE7D6" stopOpacity="0.11" />
              <stop offset="100%" stopColor="#7CE7D6" stopOpacity="0" />
            </radialGradient>
            <filter id="radarGlow">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={CX} cy={CY} r={MAX_R + 12} fill="url(#rdrBg)" />

          {[0.2, 0.4, 0.6, 0.8, 1].map((frac, i) => (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={MAX_R * frac}
              fill="none"
              stroke="#7CE7D6"
              strokeWidth={i === 4 ? 1.6 : 1}
              strokeOpacity={[0.22, 0.26, 0.32, 0.42, 0.58][i]}
              filter={i === 4 ? 'url(#radarGlow)' : undefined}
            />
          ))}

          <path d={BEAM_D} fill="url(#beamFill)">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="4.8s" repeatCount="indefinite" />
          </path>
          <line x1={CX} y1={CY} x2={CX} y2={CY - BEAM_R} stroke="#9cf5e6" strokeWidth={2} strokeOpacity={0.85}>
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="4.8s" repeatCount="indefinite" />
          </line>
        </svg>

        {dots.map(({ pct, user, isOpen }, i) => (
          <div
            key={i}
            style={{
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
              border: '2px solid rgba(7,9,13,0.96)',
              boxShadow: isOpen
                ? '0 0 0 3px rgba(124,231,214,0.86), 0 0 14px rgba(124,231,214,0.38), 0 0 30px rgba(124,231,214,0.12)'
                : '0 0 0 2px rgba(124,231,214,0.24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#7CE7D6',
              zIndex: 2,
            }}
          >
            {!user?.profileImageUrl && getInitial(user)}
            {isOpen && (
              <span style={{ position: 'absolute', bottom: 1, right: 1, width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', border: '1.5px solid #07090d' }} />
            )}
          </div>
        ))}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: myAvatar ? undefined : 'var(--surface-2)',
            backgroundImage: myAvatar ? `url(${myAvatar})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '2.5px solid rgba(7,9,13,0.96)',
            boxShadow: '0 0 0 4px rgba(124,231,214,0.9), 0 0 20px rgba(124,231,214,0.35), 0 0 44px rgba(124,231,214,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            color: '#7CE7D6',
            zIndex: 3,
            animation: 'meetCenterPulse 2.6s ease-in-out infinite',
          }}
        >
          {!myAvatar && myInitial}
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 8,
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(18,20,29,0.72)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'var(--accent-mint)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            backdropFilter: 'blur(12px)',
          }}
        >
          {users.length}명
        </div>

        <style>{`
          @keyframes meetCenterPulse {
            0%, 100% { box-shadow: 0 0 0 4px rgba(124,231,214,0.9), 0 0 20px rgba(124,231,214,0.35), 0 0 44px rgba(124,231,214,0.14); }
            50% { box-shadow: 0 0 0 9px rgba(124,231,214,0.24), 0 0 26px rgba(124,231,214,0.26), 0 0 56px rgba(124,231,214,0.12); }
          }
        `}</style>
      </div>
    </div>
  );
}
