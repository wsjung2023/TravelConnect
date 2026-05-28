// 만남 수락 토글 — 다른 여행자와의 만남 요청 수락 여부를 ON/OFF하는 토글 컴포넌트.
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Clock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LocationSearchInput } from '@/components/ui/location-search-input';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';

interface OpenToMeetToggleProps {
  compact?: boolean;
  className?: string;
}

export default function OpenToMeetToggle({ 
  compact = false, 
  className = '' 
}: OpenToMeetToggleProps) {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [region, setRegion] = useState('');
  const [hours, setHours] = useState(12);
  const [showSettings, setShowSettings] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  // 마지막으로 역지오코딩한 좌표 캐시 — 1km 이상 이동했을 때만 재호출
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  // 두 좌표 사이 거리(km) — Haversine
  const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  // GPS → 역지오코딩으로 region 자동 채움 (settings 열릴 때 1회)
  const autoFillRegionFromGps = async () => {
    if (!navigator.geolocation) return;
    setIsAutoFilling(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      const here = { lat: position.coords.latitude, lng: position.coords.longitude };

      // 1km 이내 재호출 스킵
      if (lastGeocodedRef.current && distanceKm(lastGeocodedRef.current, here) < 1) {
        return;
      }

      await loadGoogleMaps();
      const geocoder = new window.google.maps.Geocoder();
      const results: any = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: here }, (res: any, status: any) => {
          if (status === 'OK' && res?.[0]) resolve(res);
          else reject(new Error(`Geocoder failed: ${status}`));
        });
      });

      // 동/구 수준 우선, 없으면 도시 수준
      const pick =
        results.find((r: any) =>
          r.types.some((t: string) =>
            ['sublocality', 'sublocality_level_1', 'neighborhood'].includes(t)
          )
        ) ||
        results.find((r: any) =>
          r.types.some((t: string) =>
            ['locality', 'administrative_area_level_2', 'administrative_area_level_1'].includes(t)
          )
        ) ||
        results[0];

      if (pick?.formatted_address) {
        setRegion(pick.formatted_address);
        lastGeocodedRef.current = here;
      }
    } catch (err) {
      console.warn('[OpenToMeet] 자동 권역 채움 실패:', err);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // 설정 패널이 열릴 때 region이 비어 있으면 자동 채움 시도
  useEffect(() => {
    if (showSettings && !region && !isAutoFilling) {
      autoFillRegionFromGps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettings]);

  // 중앙화된 useAuth 훅 사용 (중복 요청 방지)
  const { user } = useAuth();

  // "Open to meet" 상태 API
  const { data: openStatus, refetch: refetchOpenStatus } = useQuery({
    queryKey: ['/api/profile/open'],
    refetchInterval: 60000, // 1분마다 만료 체크
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ open, region, hours }: { 
      open: boolean; 
      region?: string; 
      hours?: number 
    }) => {
      // Open to Meet를 켤 때는 먼저 현재 위치를 업데이트
      if (open) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        // 위치 업데이트
        await api('/api/serendipity/location', {
          method: 'PUT',
          body: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
      }

      // Open to Meet 상태 변경
      await api('/api/profile/open', {
        method: 'PATCH',
        body: { open, region, hours },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/open'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/open'] });
      refetchOpenStatus();
      toast({
        title: '만남 상태 변경됨',
        description: variables.open
          ? `${variables.hours}시간 동안 ${variables.region || '현재 위치'}에서 만남이 활성화되었습니다.`
          : '만남이 비활성화되었습니다.',
      });
    },
    onError: (error: any) => {
      const isLocationError = error?.message?.includes('Geolocation') || 
                             error?.message?.includes('location');
      toast({
        title: '오류',
        description: isLocationError 
          ? '위치 정보를 가져올 수 없습니다. 브라우저에서 위치 권한을 허용해주세요.'
          : '설정을 변경하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    if (checked) {
      if (compact) {
        // 컴팩트 모드에서는 기본값으로 바로 활성화
        toggleMutation.mutate({ open: true, region, hours });
      } else {
        setShowSettings(true);
      }
    } else {
      toggleMutation.mutate({ open: false });
      setShowSettings(false);
    }
  };

  const activateWithSettings = () => {
    toggleMutation.mutate({ open: true, region, hours });
    setShowSettings(false);
  };

  // 만료 시간 표시
  const getExpiryText = () => {
    if (!(openStatus as any)?.openUntil) return null;
    const expiry = new Date((openStatus as any).openUntil);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return '만료됨';
    
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursLeft > 0) {
      return `${hoursLeft}시간 ${minutesLeft}분 남음`;
    }
    return `${minutesLeft}분 남음`;
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border">
          <Users 
            size={16} 
            className={(openStatus as any)?.openToMeet ? 'text-green-600' : 'text-gray-400'} 
          />
          <Switch
            checked={(openStatus as any)?.openToMeet || false}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            data-testid="compact-toggle-open-to-meet"
          />
          {(openStatus as any)?.openToMeet && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Clock size={12} />
              <span>{getExpiryText()}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Users size={18} className="text-primary" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">
            새로운 만남 열려있음
          </div>
          <div className="text-xs text-gray-500">
            {(openStatus as any)?.openToMeet && (openStatus as any)?.openUntil
              ? getExpiryText()
              : '다른 여행자들과 연결됩니다'}
          </div>
        </div>
        <Switch
          checked={(openStatus as any)?.openToMeet || false}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
          data-testid="toggle-open-to-meet"
        />
      </div>

      {showSettings && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-600 mb-1">
              권역
              {isAutoFilling && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Loader2 size={10} className="animate-spin" />
                  {t('openToMeet.autoFilling')}
                </span>
              )}
            </label>
            <LocationSearchInput
              value={region}
              onChange={(v) => setRegion(v)}
              placeholder={t('openToMeet.placeholder')}
              className="text-xs"
              useCurrentLocationText={t('openToMeet.useCurrentLocation')}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t('openToMeet.activeHoursLabel')}</label>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full p-2 rounded border text-xs"
              data-testid="select-open-to-meet-hours"
            >
              <option value={6}>{t('openToMeet.hours6')}</option>
              <option value={12}>{t('openToMeet.hours12')}</option>
              <option value={24}>{t('openToMeet.hours24')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={activateWithSettings}
              className="flex-1 px-3 py-1.5 bg-primary text-white rounded text-xs"
              disabled={toggleMutation.isPending}
            >
              {t('openToMeet.activate')}
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs"
            >
              {t('openToMeet.cancelBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}