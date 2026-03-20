import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search, Navigation, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface LocationPickerProps {
  value: string;
  onChange: (value: string, placeData?: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showCurrentLocationButton?: boolean;
  useCurrentLocationText?: string;
  coords?: { lat: number; lng: number } | null;
}

export function LocationPicker({
  value,
  onChange,
  placeholder = 'Search city, country...',
  className,
  disabled = false,
  showCurrentLocationButton = true,
  useCurrentLocationText = 'Use Current Location',
  coords = null,
}: LocationPickerProps) {
  const { t } = useTranslation('ui');
  const [isOpen, setIsOpen] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [tempPlaceData, setTempPlaceData] = useState<any>(null);
  const [userMadeSelection, setUserMadeSelection] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const mapClickListenerRef = useRef<any>(null);
  const markerDragListenerRef = useRef<any>(null);

  const openModal = () => {
    setTempLocation(value);
    setTempCoords(coords);
    setTempPlaceData(null);
    setUserMadeSelection(false);
    setIsOpen(true);
  };

  const cleanupMap = () => {
    if (mapClickListenerRef.current) {
      window.google?.maps?.event?.removeListener(mapClickListenerRef.current);
      mapClickListenerRef.current = null;
    }
    if (markerDragListenerRef.current) {
      window.google?.maps?.event?.removeListener(markerDragListenerRef.current);
      markerDragListenerRef.current = null;
    }
    if (autocompleteRef.current) {
      window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    mapRef.current = null;
  };

  const reverseGeocode = (lat: number, lng: number) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]) {
        const result = results.find((r: any) =>
          r.types.includes('locality') ||
          r.types.includes('sublocality') ||
          r.types.includes('administrative_area_level_1')
        ) || results[0];

        const placeData = {
          ...result,
          geometry: { location: { lat: () => lat, lng: () => lng } },
        };
        setTempLocation(result.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setTempCoords({ lat, lng });
        setTempPlaceData(placeData);
        setUserMadeSelection(true);
      } else {
        const coordLabel = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setTempLocation(coordLabel);
        setTempCoords({ lat, lng });
        setTempPlaceData({
          formatted_address: coordLabel,
          geometry: { location: { lat: () => lat, lng: () => lng } },
        });
        setUserMadeSelection(true);
      }
    });
  };

  const placeMarkerAndGeocode = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    markerRef.current?.setPosition({ lat, lng });
    markerRef.current?.setVisible(true);
    mapRef.current?.panTo({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const initMap = async (initialCoords: { lat: number; lng: number } | null) => {
    if (!mapContainerRef.current) return;

    try {
      await loadGoogleMaps();

      const defaultCenter = { lat: 37.5665, lng: 126.978 };
      const center = initialCoords || defaultCenter;
      const hasInitialCoords = !!initialCoords;

      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: hasInitialCoords ? 15 : 5,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      markerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        draggable: true,
        visible: hasInitialCoords,
        position: center,
      });

      mapClickListenerRef.current = mapRef.current.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        placeMarkerAndGeocode(lat, lng);
      });

      markerDragListenerRef.current = markerRef.current.addListener('dragend', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setTempCoords({ lat, lng });
        markerRef.current?.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      });

      if (searchInputRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          { fields: ['formatted_address', 'geometry', 'name', 'address_components'] }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const name = place.name || place.formatted_address || '';

            setTempLocation(name);
            setTempCoords({ lat, lng });
            setTempPlaceData(place);
            setUserMadeSelection(true);

            markerRef.current?.setPosition({ lat, lng });
            markerRef.current?.setVisible(true);
            mapRef.current?.panTo({ lat, lng });
            mapRef.current?.setZoom(15);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        placeMarkerAndGeocode(lat, lng);
        mapRef.current?.setZoom(15);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
      }
    );
  };

  const handleConfirm = () => {
    if (userMadeSelection && tempLocation) {
      onChange(tempLocation, tempPlaceData);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      const currentCoords = coords;
      const timer = setTimeout(() => {
        initMap(currentCoords);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      cleanupMap();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      cleanupMap();
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent/50 transition-colors min-h-[40px]',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={() => !disabled && openModal()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !disabled && openModal(); } }}
      >
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className={cn('text-sm truncate', !value && 'text-muted-foreground')}>
          {value || placeholder}
        </span>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('locationPicker.title', '위치 선택')}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={placeholder}
                className="pl-9"
              />
            </div>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[300px] bg-muted"
          />

          {tempLocation && (
            <div className="px-4 py-2 bg-muted/50 border-t">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tempLocation}</p>
                  {tempCoords && (
                    <p className="text-xs text-muted-foreground">
                      {tempCoords.lat.toFixed(6)}, {tempCoords.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="p-4 pt-2 flex gap-2">
            {showCurrentLocationButton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrentLocation}
                disabled={isGettingLocation}
                className="shrink-0"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">{useCurrentLocationText}</span>
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-1" />
              {t('locationPicker.cancel', '취소')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!tempLocation}
            >
              <Check className="h-4 w-4 mr-1" />
              {t('locationPicker.confirm', '확인')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
