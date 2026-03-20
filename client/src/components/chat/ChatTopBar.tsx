// 채팅 탭 상단바 — 제목 + 요약 배지 + 검색 토글
import { useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  onSearchChange?: (q: string) => void;
}

export default function ChatTopBar({ onSearchChange }: Props) {
  const { t } = useTranslation('ui');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleChange = (v: string) => {
    setQuery(v);
    onSearchChange?.(v);
  };

  const handleClose = () => {
    setSearchOpen(false);
    handleChange('');
  };

  return (
    <div
      className="sticky top-0 z-10 px-4 pt-4 pb-3"
      style={{ background: 'var(--app-bg)', borderBottom: '1px solid var(--stroke)' }}
    >
      {searchOpen ? (
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2 rounded-full px-3 py-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
          >
            <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder={t('chat.searchPlaceholder')}
              value={query}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
          <button onClick={handleClose} aria-label={t('chat.closeSearch', 'Close search')}>
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('chat.title')}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 3 }}>
                {t('chat.subtitle')}
              </p>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
              aria-label={t('chat.openSearch', 'Search')}
            >
              <Search size={16} style={{ color: 'var(--text-primary)' }} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('chat.chips.translationReady')}</span>
            <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px' }}>{t('chat.chips.recentIntros')}</span>
            <span className="tg-chip" style={{ fontSize: 11, padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={11} />
              {t('chat.chips.quickReplies')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
