import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import SearchHeader from '@/components/SearchHeader';
import MapComponent from '@/components/MapComponent';
import CreatePostModal from '@/components/CreatePostModal';
import MapBottomSheet, { type MapSheetState } from '@/components/map/MapBottomSheet';

export default function Home() {
  const { t } = useTranslation('ui');
  const [, navigate] = useLocation();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [sheetState, setSheetState] = useState<MapSheetState>('collapsed');
  const [focusedStoryLabel, setFocusedStoryLabel] = useState<string | null>(null);

  const handleLocationSearch = (query: string) => {
    if ((window as any).mapLocationSearch) (window as any).mapLocationSearch(query);
  };
  const handleContentSearch = (query: string) => {
    if ((window as any).mapContentSearch) (window as any).mapContentSearch(query);
  };

  return (
    <div className="relative h-[calc(100vh-80px)] overflow-hidden bg-background">
      <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#101320]/80 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold text-white">{t('homePage.appName', 'Tourgether')}</h1>
      </div>

      <div className="absolute inset-x-0 top-14 z-20 px-3">
        <SearchHeader onLocationSearch={handleLocationSearch} onContentSearch={handleContentSearch} />
      </div>

      <div className="absolute inset-0 pt-28">
        <MapComponent
          className="h-full w-full"
          onCreatePost={(location) => {
            if (location) {
              setPrefilledLocation({ lat: location.latitude, lng: location.longitude, name: location.name });
            }
            setShowCreatePost(true);
          }}
          onPostDetailClick={(postId) => {
            setFocusedStoryLabel(`Story #${postId}`);
            setSheetState('expanded');
          }}
        />
      </div>

      <MapBottomSheet
        state={sheetState}
        onStateChange={setSheetState}
        focusedStoryLabel={focusedStoryLabel}
        onQuickMiniConcierge={() => {
          navigate('/meet');
        }}
      />

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
