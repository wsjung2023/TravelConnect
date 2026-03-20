// 프로필 통계 — 방문국 / 여행일수 / 친구 3-컬럼
interface Props {
  visitedCountries?: number;
  travelDays?: number;
  friends?: number;
}

interface StatItemProps {
  value: number;
  label: string;
}

const StatItem = ({ value, label }: StatItemProps) => (
  <div className="flex flex-col items-center">
    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1.2 }}>
      {value}
    </span>
    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</span>
  </div>
);

export default function ProfileStats({ visitedCountries = 0, travelDays = 0, friends = 0 }: Props) {
  return (
    <div
      className="flex justify-around py-4 mx-4 mt-5"
      style={{
        background: 'var(--surface-1)',
        borderRadius: 16,
        border: '1px solid rgba(200,168,78,0.2)',
        boxShadow: '0 0 8px rgba(200,168,78,0.12)',
      }}
    >
      <StatItem value={visitedCountries} label="방문국" />
      <div style={{ width: 1, background: 'var(--stroke)', alignSelf: 'stretch', margin: '4px 0' }} />
      <StatItem value={travelDays} label="여행일수" />
      <div style={{ width: 1, background: 'var(--stroke)', alignSelf: 'stretch', margin: '4px 0' }} />
      <StatItem value={friends} label="친구" />
    </div>
  );
}
