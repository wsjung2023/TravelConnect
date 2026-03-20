// 프로필 설정 섹션 — Open to Meet / Portfolio Mode 토글 + 이동 rows with chevron
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Props {
  openToMeet: boolean;
  onToggleOpenToMeet: (val: boolean) => void;
  portfolioMode: boolean;
  onTogglePortfolioMode: (val: boolean) => void;
}

interface RowProps {
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}

function SettingsRow({ label, description, right, onClick }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid var(--stroke)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</p>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</p>
        )}
      </div>
      {right ?? <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />}
    </div>
  );
}

export default function ProfileSettingsSection({ openToMeet, onToggleOpenToMeet, portfolioMode, onTogglePortfolioMode }: Props) {
  return (
    <div
      style={{
        margin: '16px 16px 8px',
        background: 'var(--surface-1)',
        borderRadius: 16,
        border: '1px solid var(--stroke)',
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          padding: '12px 16px 4px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        설정
      </p>
      <SettingsRow
        label="Open to Meet"
        description={openToMeet ? '현재 만남 가능 상태' : '만남 상태 비공개'}
        right={
          <Switch
            checked={openToMeet}
            onCheckedChange={onToggleOpenToMeet}
          />
        }
      />
      <SettingsRow
        label="Portfolio Mode"
        description={portfolioMode ? '포트폴리오 공개 중' : '포트폴리오 비공개'}
        right={
          <Switch
            checked={portfolioMode}
            onCheckedChange={onTogglePortfolioMode}
          />
        }
      />
      <SettingsRow label="알림 설정" />
      <SettingsRow label="개인 정보" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
        }}
      >
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>언어 및 지역</p>
        <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
      </div>
    </div>
  );
}
