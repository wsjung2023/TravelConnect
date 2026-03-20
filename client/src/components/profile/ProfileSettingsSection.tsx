// 프로필 설정 섹션 — 프로필 톤에 맞춘 글래스 카드 + 토글/이동 row
import { Bell, ChevronRight, Globe2, Lock, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  icon?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  bordered?: boolean;
}

function SettingsRow({ label, description, icon, right, onClick, bordered = true }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: bordered ? '1px solid rgba(255,255,255,0.07)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {icon && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,214,134,0.08)',
              border: '1px solid rgba(255,214,134,0.18)',
              color: 'var(--accent-gold)',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{label}</p>
          {description && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{description}</p>
          )}
        </div>
      </div>
      {right ?? <ChevronRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />}
    </div>
  );
}

export default function ProfileSettingsSection({ openToMeet, onToggleOpenToMeet, portfolioMode, onTogglePortfolioMode }: Props) {
  const { t } = useTranslation('ui');
  return (
    <div
      style={{
        margin: '18px 16px 10px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ padding: '14px 16px 8px' }}>
        <p style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t('profile.settings.title')}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('profile.settings.subtitle')}
        </p>
      </div>

      <SettingsRow
        icon={<Sparkles size={16} />}
        label={t('profile.settings.openToMeet')}
        description={openToMeet ? t('profile.settings.openToMeetOn') : t('profile.settings.openToMeetOff')}
        right={<Switch checked={openToMeet} onCheckedChange={onToggleOpenToMeet} />}
      />
      <SettingsRow
        icon={<Globe2 size={16} />}
        label={t('profile.settings.portfolioMode')}
        description={portfolioMode ? t('profile.settings.portfolioOn') : t('profile.settings.portfolioOff')}
        right={<Switch checked={portfolioMode} onCheckedChange={onTogglePortfolioMode} />}
      />
      <SettingsRow icon={<Bell size={16} />} label={t('profile.settings.notifications')} description={t('profile.settings.notificationsDesc')} />
      <SettingsRow icon={<Lock size={16} />} label={t('profile.settings.privacy')} description={t('profile.settings.privacyDesc')} />
      <SettingsRow icon={<Globe2 size={16} />} label={t('profile.settings.locale')} description={t('profile.settings.localeDesc')} bordered={false} />
    </div>
  );
}
