import { useState } from 'react';
import MapComponent from '@/components/MapComponent';
import CreatePostModal from '@/components/CreatePostModal';
import MapTopBar, { type MapFilter } from '@/components/map/MapTopBar';
import MapBottomSheet, { type MapSheetState, type SelectedUser } from '@/components/map/MapBottomSheet';
import { useLocation } from 'wouter';

export default function Home() {
  const [, navigate] = useLocation();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [sheetState, setSheetState] = useState<MapSheetState>('collapsed');
  const [activeFilter, setActiveFilter] = useState<MapFilter>('nearby');
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 'calc(100vh - 72px)', background: 'var(--app-bg)' }}
    >
      {/* Map fills full area — TopBar floats above it */}
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
      />

      {/* 3-snap bottom sheet */}
      <MapBottomSheet
        state={sheetState}
        onStateChange={setSheetState}
        selectedUser={selectedUser}
        onClearUser={() => setSelectedUser(null)}
        onQuickMiniConcierge={() => navigate('/meet')}
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
