import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface SerendipityToggleProps {
  compact?: boolean;
  className?: string;
}

export default function SerendipityToggle({ 
  compact = false, 
  className = '' 
}: SerendipityToggleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['/api/auth/me']
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api('/api/serendipity/toggle', {
        method: 'PUT',
        body: { enabled },
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: enabled ? '🍀 Serendipity 활성화' : 'Serendipity 비활성화',
        description: enabled 
          ? '근처의 비슷한 여행자를 발견하면 알려드릴게요!'
          : 'Serendipity 기능이 꺼졌습니다.',
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

  const isEnabled = (user as any)?.serendipityEnabled ?? true;

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate(checked);
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border">
          <Sparkles 
            size={16} 
            className={isEnabled ? 'text-amber-500' : 'text-gray-400'} 
          />
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            data-testid="compact-toggle-serendipity"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Sparkles size={18} className="text-amber-500" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">
            Serendipity Protocol
          </div>
          <div className="text-xs text-gray-500">
            {isEnabled 
              ? '근처 여행자와 우연한 만남 활성화됨' 
              : '비활성화됨'}
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
          data-testid="toggle-serendipity"
        />
      </div>
    </div>
  );
}
