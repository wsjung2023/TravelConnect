import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import MeetRadar from '@/components/meet/MeetRadar';
import NearbyTravelerCard from '@/components/meet/NearbyTravelerCard';
import FirstHelloSheet from '@/components/meet/FirstHelloSheet';
import OpenToMeetToggle from '@/components/OpenToMeetToggle';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function MeetPage() {
  const [, navigate] = useLocation();
  const [helloMessage, setHelloMessage] = useState('');
  const { toast } = useToast();
  const { data: openUsers = [] } = useQuery<any[]>({ queryKey: ['/api/users/open'] });
  const [miniPlans, setMiniPlans] = useState<any[]>([]);

  const helloMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiRequest('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, initialMessage: helloMessage || 'Hi there! 👋' }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      navigate(`/chat?conversationId=${data.id}`);
    },
  });

  const miniConciergeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('/api/mini-concierge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationHours: 1,
          vibe: 'serendipity',
          budgetLevel: 'medium',
          latitude: 37.5665,
          longitude: 126.978,
        }),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setMiniPlans(data.plans || []);
    },
    onError: () => {
      toast({ title: 'Mini Concierge 요청 실패', variant: 'destructive' });
    },
  });

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Meet</h2>
      <OpenToMeetToggle />
      <MeetRadar />

      <div className="rounded-2xl border bg-card p-3">
        <div className="mb-2 text-sm font-semibold">지금 1시간 뭐하지?</div>
        <button
          className="travel-button px-4 py-2 text-xs"
          onClick={() => miniConciergeMutation.mutate()}
          disabled={miniConciergeMutation.isPending}
        >
          Mini Concierge 추천 받기
        </button>
        {miniPlans.length > 0 && (
          <div className="mt-3 space-y-2">
            {miniPlans.slice(0, 3).map((plan: any, idx: number) => (
              <div key={plan.id} className="rounded-xl bg-muted p-2 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Option {String.fromCharCode(65 + idx)} · {plan.title || '1-hour plan'}</div>
                  <span className="app-chip">{plan.estimatedDurationMin || 60}min</span>
                </div>
                <div className="text-muted-foreground">{plan.summary || plan.description || '근처 여행자와 함께 갈 수 있는 플랜'}</div>
                <div className="flex flex-wrap gap-1">
                  {(plan.tags || []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="app-chip">{tag}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="travel-button px-3 py-1 text-xs" onClick={() => navigate('/')}>바로 이동</button>
                  <button className="travel-button-outline px-3 py-1 text-xs" onClick={() => window.scrollTo({ top: 9999, behavior: 'smooth' })}>같이 갈 사람 찾기</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FirstHelloSheet onSend={setHelloMessage} />
      <div className="space-y-2">
        {openUsers.slice(0, 10).map((user: any) => (
          <NearbyTravelerCard
            key={user.id}
            user={user}
            onHello={() => helloMutation.mutate(user.id)}
            onViewProfile={() => navigate(`/profile?userId=${user.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
