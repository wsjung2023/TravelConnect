import { useState, useRef } from 'react';
import MapComponent from '@/components/MapComponent';
import CreatePostModal from '@/components/CreatePostModal';
import MapTopBar, { type MapFilter } from '@/components/map/MapTopBar';
import MapBottomSheet, { type MapSheetState, type SelectedUser } from '@/components/map/MapBottomSheet';
import NotificationBell from '@/components/NotificationBell';
import { useLocation } from 'wouter';
import { Search, MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation('ui');
  const [, navigate] = useLocation();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [sheetState, setSheetState] = useState<MapSheetState>('collapsed');
  const [activeFilter, setActiveFilter] = useState<MapFilter>('nearby');
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'content'>('location');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (searchMode === 'location') {
      (window as any).mapLocationSearch?.(searchQuery);
    } else {
      (window as any).mapContentSearch?.(searchQuery);
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 'calc(100vh - 78px - env(safe-area-inset-bottom))', background: 'var(--app-bg)' }}
    >
      {/* Map fills full area */}
      <div className="absolute inset-0">
        <MapComponent
          className="h-full w-full"
          onCreatePost={(location) => {
            if (location) {
              setPrefilledLocation({ lat: location.latitude, lng: location.longitude, name: location.name });
            }
            setShowCreatePost(true);
          }}
          onPostDetailClick={(postId) => {
            setSheetState('half');
          }}
        />
      </div>

      {/* Floating top bar + filter chips */}
      <MapTopBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onSearchClick={() => {
          setShowSearch(true);
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }}
        bellNode={
          <div style={{ color: 'var(--text-primary)' }}>
            <NotificationBell />
          </div>
        }
      />

      {/* 3-snap bottom sheet */}
      <MapBottomSheet
        state={sheetState}
        onStateChange={setSheetState}
        selectedUser={selectedUser}
        onClearUser={() => setSelectedUser(null)}
        onQuickMiniConcierge={() => navigate('/meet')}
      />

      {/* 검색 오버레이 */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(7,9,13,0.92)', paddingTop: 'max(10px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            {/* 모드 토글 */}
            <button
              onClick={() => setSearchMode(searchMode === 'location' ? 'content' : 'location')}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
              style={{
                background: searchMode === 'location' ? 'var(--accent-mint)' : 'var(--accent-violet)',
                color: '#fff',
              }}
            >
              {searchMode === 'location' ? <MapPin size={13} /> : <Search size={13} />}
              {searchMode === 'location' ? t('search.location') : t('search.content')}
            </button>

            {/* 검색 입력 */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5 tg-glass-strong" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchMode === 'location' ? t('search.locationPlaceholder') : t('search.contentPlaceholder')}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
            </form>

            {/* 닫기 */}
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="shrink-0 flex items-center justify-center rounded-full tg-glass-strong"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', minWidth: 44, minHeight: 44 }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-3 px-4 pb-4">
            <button
              onClick={() => setSearchMode('location')}
              className={`tg-chip ${searchMode === 'location' ? 'tg-chip-active' : ''}`}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              <MapPin size={12} className="inline mr-1" />
              {t('search.location')}
            </button>
            <button
              onClick={() => setSearchMode('content')}
              className={`tg-chip ${searchMode === 'content' ? 'tg-chip-active' : ''}`}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              <Search size={12} className="inline mr-1" />
              {t('search.content')}
            </button>
          </div>

          <p className="px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {searchMode === 'location' ? t('search.locationPlaceholder') : t('search.contentPlaceholder')}
          </p>
        </div>
      )}

      {showCreatePost && (
        <CreatePostModal
          isOpen={showCreatePost}
          onClose={() => {
            setShowCreatePost(false);
            setPrefilledLocation(null);
          }}
          location={prefilledLocation}
        />
      )}
    </div>
  );
}
