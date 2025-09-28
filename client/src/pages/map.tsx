import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ExperienceCard from '@/components/ExperienceCard';
import BookingModal from '@/components/BookingModal';
import type { Experience } from '@shared/schema';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function Map() {
  const { t } = useTranslation(['ui']);
  const [selectedExperience, setSelectedExperience] =
    useState<Experience | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Fetch experiences
  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['/api/experiences'],
  });

  // Load Google Maps script
  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;

      (window as any).initGoogleMap = () => {
        // Google Maps loaded, will trigger map initialization
      };

      document.head.appendChild(script);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && !map) {
      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);
            initializeMap(location);
          },
          () => {
            // Default to Seoul if geolocation fails
            const defaultLocation = { lat: 37.5665, lng: 126.978 };
            setUserLocation(defaultLocation);
            initializeMap(defaultLocation);
          }
        );
      }
    }
  }, [map]);

  const initializeMap = (center: { lat: number; lng: number }) => {
    if (!window.google?.maps) return;

    const mapInstance = new window.google.maps.Map(
      document.getElementById('map') as HTMLElement,
      {
        center,
        zoom: 13,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      }
    );

    setMap(mapInstance);

    // Add user location marker
    new window.google.maps.Marker({
      position: center,
      map: mapInstance,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
  };

  // Add experience markers when experiences load
  useEffect(() => {
    if (map && (experiences as Experience[]).length > 0) {
      (experiences as Experience[]).forEach((experience: Experience) => {
        if (experience.latitude && experience.longitude) {
          const marker = new window.google.maps.Marker({
            position: {
              lat: parseFloat(experience.latitude),
              lng: parseFloat(experience.longitude),
            },
            map,
            title: experience.title,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: getMarkerColor(experience.category),
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });

          marker.addListener('click', () => {
            setSelectedExperience(experience);
          });
        }
      });
    }
  }, [map, experiences]);

  const getMarkerColor = (category: string) => {
    switch (category) {
      case 'tour':
        return '#FF6B6B';
      case 'food':
        return '#4ECDC4';
      case 'activity':
        return '#45B7D1';
      default:
        return '#96CEB4';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Map Container */}
      <div id="map" className="w-full h-full"></div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <button
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
          onClick={() => map?.setZoom((map?.getZoom() || 13) + 1)}
        >
          <i className="fas fa-plus text-gray-600"></i>
        </button>
        <button
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
          onClick={() => map?.setZoom(Math.max((map?.getZoom() || 13) - 1, 1))}
        >
          <i className="fas fa-minus text-gray-600"></i>
        </button>
        <button
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
          onClick={() => {
            if (userLocation && map) {
              map.setCenter(userLocation);
              map.setZoom(15);
            }
          }}
        >
          <i className="fas fa-location-arrow text-gray-600"></i>
        </button>
      </div>

      {/* Bottom Sheet - Nearby Experiences */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-80 overflow-y-auto custom-scrollbar slide-up">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
        <h3 className="font-bold text-lg mb-4">{t('ui:experiences.nearbyTitle')}</h3>

        <div className="space-y-3">
          {(experiences as Experience[]).map((experience: Experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              onBook={() => {
                setSelectedExperience(experience);
                setShowBookingModal(true);
              }}
              compact={true}
            />
          ))}

          {(experiences as Experience[]).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-map-marker-alt text-3xl mb-2"></i>
              <p>{t('ui:experiences.noExperiences')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Experience Detail Modal */}
      {selectedExperience && !showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl max-h-4/5 overflow-y-auto slide-up">
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-lg">{selectedExperience.title}</h3>
              <button
                onClick={() => setSelectedExperience(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <i className="fas fa-times text-gray-500"></i>
              </button>
            </div>

            <ExperienceCard
              experience={selectedExperience}
              onBook={() => setShowBookingModal(true)}
            />
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedExperience && (
        <BookingModal
          experience={selectedExperience}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedExperience(null);
          }}
        />
      )}
    </div>
  );
}
