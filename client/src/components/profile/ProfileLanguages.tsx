// 프로필 언어 칩 행 — 사용 언어를 tg-chip으로 표시
interface Props {
  languages?: string[] | null;
}

export default function ProfileLanguages({ languages }: Props) {
  if (!languages || languages.length === 0) return null;

  return (
    <div style={{ padding: '0 16px 12px' }}>
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Languages
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {languages.map((lang) => (
          <span key={lang} className="tg-chip" style={{ fontSize: 13 }}>
            {lang}
          </span>
        ))}
      </div>
    </div>
  );
}
