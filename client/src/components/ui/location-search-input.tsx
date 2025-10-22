import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';
import { cn } from '@/lib/utils';

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string, placeData?: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showCurrentLocationButton?: boolean;
  useCurrentLocationText?: string;
}

export function LocationSearchInput({
  value,
  onChange,
  placeholder = 'Search city, country...',
  className,
  disabled = false,
  showCurrentLocationButton = true,
  useCurrentLocationText = 'Use Current Location',
}: LocationSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initAutocomplete = async () => {
      if (!inputRef.current) return;

      setIsLoading(true);
      try {
        await loadGoogleMaps();
        
        if (!isMounted) return;

        // 모든 장소 검색 가능 (도시, 건물, 주소 등)
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'name', 'address_components'],
          }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            onChange(place.formatted_address, place);
          }
        });
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAutocomplete();

    return () => {
      isMounted = false;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await loadGoogleMaps();
          const geocoder = new window.google.maps.Geocoder();
          const latlng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          geocoder.geocode({ location: latlng }, (results: any, status: any) => {
            setIsGettingLocation(false);
            
            if (status === 'OK' && results && results[0]) {
              // 도시 레벨 결과 찾기
              const cityResult = results.find((result: any) => 
                result.types.includes('locality') || 
                result.types.includes('administrative_area_level_1')
              ) || results[0];
              
              onChange(cityResult.formatted_address, cityResult);
            } else {
              console.error('Geocoder failed due to: ' + status);
            }
          });
        } catch (error) {
          console.error('Failed to get location:', error);
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
      }
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('pr-10', className)}
          disabled={disabled || isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {showCurrentLocationButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCurrentLocation}
          disabled={disabled || isGettingLocation}
          className="w-full"
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              {useCurrentLocationText}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
