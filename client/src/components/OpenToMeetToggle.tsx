import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OpenToMeetToggleProps {
  compact?: boolean;
  className?: string;
}

export default function OpenToMeetToggle({ 
  compact = false, 
  className = '' 
}: OpenToMeetToggleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [region, setRegion] = useState('강남구');
  const [hours, setHours] = useState(12);
  const [showSettings, setShowSettings] = useState(false);

  // 현재 사용자 정보 가져오기
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me']
  });

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
      await apiRequest('/api/profile/open', {
        method: 'PATCH',
        body: JSON.stringify({ open, region, hours }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile/open'] });
      refetchOpenStatus();
      toast({
        title: '만남 상태 변경됨',
        description: (user as any)?.openToMeet 
          ? '만남이 비활성화되었습니다.' 
          : `${hours}시간 동안 ${region}에서 만남이 활성화되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: '오류',
        description: '설정을 변경하는 중 오류가 발생했습니다.',
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
    if (!(user as any)?.openUntil) return null;
    const expiry = new Date((user as any).openUntil);
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
            className={(user as any)?.openToMeet ? 'text-green-600' : 'text-gray-400'} 
          />
          <Switch
            checked={(user as any)?.openToMeet || false}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            data-testid="compact-toggle-open-to-meet"
          />
          {(user as any)?.openToMeet && (
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
            {(user as any)?.openToMeet && (user as any)?.openUntil
              ? getExpiryText()
              : '다른 여행자들과 연결됩니다'}
          </div>
        </div>
        <Switch
          checked={(user as any)?.openToMeet || false}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
          data-testid="toggle-open-to-meet"
        />
      </div>

      {showSettings && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">권역</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full p-2 rounded border text-xs"
              >
                <option value="강남구">강남구</option>
                <option value="홍대/합정">홍대/합정</option>
                <option value="명동/중구">명동/중구</option>
                <option value="강북/노원">강북/노원</option>
                <option value="서초구">서초구</option>
                <option value="마포구">마포구</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">활성 시간</label>
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full p-2 rounded border text-xs"
              >
                <option value={6}>6시간</option>
                <option value={12}>12시간</option>
                <option value={24}>24시간</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={activateWithSettings}
              className="flex-1 px-3 py-1.5 bg-primary text-white rounded text-xs"
              disabled={toggleMutation.isPending}
            >
              활성화
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}