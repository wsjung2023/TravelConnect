// 프로필 통계 — 헤더 아래에 이어지는 compact premium stats row
import { useTranslation } from 'react-i18next';

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
  <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-2 text-center">
    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1.1 }}>
      {value}
    </span>
    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.03em' }}>{label}</span>
  </div>
);

export default function ProfileStats({ visitedCountries = 0, travelDays = 0, friends = 0 }: Props) {
  const { t } = useTranslation('ui');
  return (
    <div className="mx-4 mt-3 rounded-[24px] px-2 py-2" style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
      backdropFilter: 'blur(10px)',
    }}>
      <div className="flex items-stretch justify-between rounded-[20px]" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <StatItem value={visitedCountries} label={t('profile.stats.countries')} />
        <div style={{ width: 1, background: 'linear-gradient(180deg, transparent 0%, rgba(255,214,134,0.18) 24%, rgba(255,214,134,0.18) 76%, transparent 100%)', margin: '10px 0' }} />
        <StatItem value={travelDays} label={t('profile.stats.travelDays')} />
        <div style={{ width: 1, background: 'linear-gradient(180deg, transparent 0%, rgba(255,214,134,0.18) 24%, rgba(255,214,134,0.18) 76%, transparent 100%)', margin: '10px 0' }} />
        <StatItem value={friends} label={t('profile.stats.friends')} />
      </div>
    </div>
  );
}
