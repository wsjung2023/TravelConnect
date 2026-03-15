import { useQuery } from '@tanstack/react-query';

export default function NearbyPeopleSheet() {
  const { data: openUsers = [] } = useQuery<any[]>({ queryKey: ['/api/users/open'] });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Nearby people</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {openUsers.slice(0, 6).map((user: any) => (
          <div key={user.id} className="min-w-24 rounded-xl bg-white/10 p-2 text-xs text-white/90">
            <div className="font-medium truncate">{user.firstName || 'Traveler'}</div>
            <div className="text-white/60">Open to meet</div>
          </div>
        ))}
        {openUsers.length === 0 && <div className="text-xs text-white/60">No nearby travelers yet.</div>}
      </div>
    </div>
  );
}
