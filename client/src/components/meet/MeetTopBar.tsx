// 만나기 탭 상단바 — "지금 만날 사람" 제목 + 온라인/오프라인 상태 pill
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  isPending?: boolean;
}

export default function MeetTopBar({ isOpen, onToggle, isPending }: Props) {
  const { t } = useTranslation('ui');
  return (
    <div
      className="flex items-center justify-between px-4 pt-4 pb-3"
      style={{ background: 'var(--app-bg)' }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
        {t('meet.title')}
      </h1>

      <button
        onClick={onToggle}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all"
        style={
          isOpen
            ? {
                background: 'rgba(124,231,214,0.15)',
                color: 'var(--accent-mint)',
                border: '1px solid var(--accent-mint)',
              }
            : {
                background: 'var(--surface-2)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--stroke)',
              }
        }
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: isOpen ? 'var(--accent-mint)' : 'var(--text-secondary)' }}
        />
        {isOpen ? t('meet.online') : t('meet.offline')}
      </button>
    </div>
  );
}
