// 프로필 활동 칩 행 — 관심사/활동 태그를 tg-chip으로 표시
interface Props {
  interests?: string[] | null;
}

export default function ProfileActivities({ interests }: Props) {
  if (!interests || interests.length === 0) return null;

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Activities
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {interests.map((activity) => (
          <span key={activity} className="tg-chip" style={{ fontSize: 13 }}>
            {activity}
          </span>
        ))}
      </div>
    </div>
  );
}
