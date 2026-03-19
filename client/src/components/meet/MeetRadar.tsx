// 만나기 레이더 시각화 — mint 동심원 SVG + 중심 아바타 + 주변 유저 dots + pulse 애니메이션
import { useAuth } from '@/hooks/useAuth';

interface Props {
  users?: any[];
}

// Static positions for up to 5 user dots (angle in degrees, radius fraction 0-1)
const DOT_SLOTS = [
  { angle: 45,  r: 0.38 },
  { angle: 135, r: 0.58 },
  { angle: 220, r: 0.45 },
  { angle: 310, r: 0.65 },
  { angle: 20,  r: 0.72 },
];

const CX = 150;
const CY = 150;
const MAX_R = 130; // outermost ring radius

function polarToXY(angleDeg: number, radiusFraction: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: CX + Math.cos(rad) * radiusFraction * MAX_R,
    y: CY + Math.sin(rad) * radiusFraction * MAX_R,
  };
}

function getInitials(user: any): string {
  return (user?.firstName?.[0] ?? user?.username?.[0] ?? 'T').toUpperCase();
}

export default function MeetRadar({ users = [] }: Props) {
  const { user: me } = useAuth();
  const myInitial = me ? getInitials(me) : 'ME';

  const dots = DOT_SLOTS.slice(0, Math.min(users.length, 5)).map((slot, i) => ({
    ...slot,
    ...polarToXY(slot.angle, slot.r),
    user: users[i],
  }));

  return (
    <div
      className="relative w-full mx-auto overflow-hidden"
      style={{ maxWidth: 400, height: 280 }}
    >
      {/* Radial background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(124,231,214,0.06) 0%, transparent 70%)',
        }}
      />

      <svg
        viewBox="0 0 300 300"
        className="w-full h-full"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Sweep gradient */}
          <radialGradient id="sweepGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7CE7D6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#7CE7D6" stopOpacity="0" />
          </radialGradient>
          <clipPath id="radarClip">
            <circle cx={CX} cy={CY} r={MAX_R + 5} />
          </clipPath>
        </defs>

        {/* Sweep wedge (rotating) */}
        <g clipPath="url(#radarClip)">
          <path
            d={`M ${CX} ${CY} L ${CX} ${CY - MAX_R - 5} A ${MAX_R + 5} ${MAX_R + 5} 0 0 1 ${CX + (MAX_R + 5) * Math.sin((60 * Math.PI) / 180)} ${CY - (MAX_R + 5) * Math.cos((60 * Math.PI) / 180)} Z`}
            fill="url(#sweepGrad)"
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              animation: 'radarSweep 4s linear infinite',
            }}
          />
        </g>

        {/* Concentric rings */}
        {[0.35, 0.58, 0.85].map((fraction, i) => (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={MAX_R * fraction}
            fill="none"
            stroke="#7CE7D6"
            strokeWidth={1}
            strokeOpacity={0.5 - i * 0.13}
            strokeDasharray="4 3"
          />
        ))}

        {/* Cross-hairs */}
        <line x1={CX} y1={CY - MAX_R - 4} x2={CX} y2={CY + MAX_R + 4} stroke="#7CE7D6" strokeWidth={0.4} strokeOpacity={0.18} />
        <line x1={CX - MAX_R - 4} y1={CY} x2={CX + MAX_R + 4} y2={CY} stroke="#7CE7D6" strokeWidth={0.4} strokeOpacity={0.18} />

        {/* User dots */}
        {dots.map(({ x, y, user }, i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={18}
              fill="var(--surface-1, #11131A)"
              stroke="#7CE7D6"
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fill="#F6F7FB"
              fontSize={10}
              fontWeight={700}
              fontFamily="system-ui,sans-serif"
            >
              {getInitials(user)}
            </text>
            {/* Online dot */}
            <circle cx={x + 13} cy={y - 13} r={4} fill="#4ADE80" stroke="#11131A" strokeWidth={1.5} />
          </g>
        ))}

        {/* Center — my avatar + pulse ring */}
        <circle
          cx={CX}
          cy={CY}
          r={30}
          fill="none"
          stroke="#7CE7D6"
          strokeWidth={2}
          strokeOpacity={0.7}
        >
          <animate attributeName="r" values="28;34;28" dur="2s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.7;0.2;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r={24} fill="var(--surface-2, #151824)" stroke="#11131A" strokeWidth={2} />
        <text
          x={CX}
          y={CY + 5}
          textAnchor="middle"
          fill="#7CE7D6"
          fontSize={13}
          fontWeight={700}
          fontFamily="system-ui,sans-serif"
        >
          {myInitial}
        </text>
      </svg>

      {/* CSS animation for sweep */}
      <style>{`
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
