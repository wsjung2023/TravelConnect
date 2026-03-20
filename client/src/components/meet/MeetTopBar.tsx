// 만나기 탭 상단바 — premium title row with live presence pill.
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  isPending?: boolean;
}

export default function MeetTopBar({ isOpen, onToggle, isPending }: Props) {
  const { t } = useTranslation('ui');

  return (
    <div className="px-4 pt-4 pb-2" style={{ background: 'var(--app-bg)' }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} color="var(--accent-gold)" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{t('meet.title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('meet.subtitle')}</p>
        </div>

        <button
          onClick={onToggle}
          disabled={isPending}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all tg-glass-strong"
          style={
            isOpen
              ? {
                  color: 'var(--accent-mint)',
                  border: '1px solid rgba(124,231,214,0.5)',
                  boxShadow: '0 0 0 1px rgba(124,231,214,0.08), 0 0 18px rgba(124,231,214,0.14)',
                }
              : {
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }
          }
        >
          <span className="w-2 h-2 rounded-full" style={{ background: isOpen ? 'var(--accent-mint)' : 'var(--text-secondary)', boxShadow: isOpen ? '0 0 10px rgba(124,231,214,0.6)' : 'none' }} />
          {isOpen ? t('meet.online') : t('meet.offline')}
        </button>
      </div>
    </div>
  );
}
