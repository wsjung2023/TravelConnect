// 채팅 탭 상단바 — "채팅" 제목 + 검색 아이콘 + 검색 인풋 토글
import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  onSearchChange?: (q: string) => void;
}

export default function ChatTopBar({ onSearchChange }: Props) {
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
        /* Search input row */
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
              placeholder="대화 검색..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
          <button onClick={handleClose} aria-label="Close search">
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      ) : (
        /* Title row */
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            채팅
          </h1>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
            aria-label="Search"
          >
            <Search size={16} style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>
      )}
    </div>
  );
}
