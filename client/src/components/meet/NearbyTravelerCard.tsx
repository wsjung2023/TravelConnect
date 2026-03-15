interface Props {
  user: any;
  onHello: () => void;
  onViewProfile?: () => void;
}

export default function NearbyTravelerCard({ user, onHello, onViewProfile }: Props) {
  const interests = user.interests?.slice?.(0, 2) || ['Food', 'Culture'];

  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="text-sm font-semibold">{user.firstName || 'Traveler'}</div>
      <div className="text-xs text-muted-foreground">{user.bio || 'Looking for local food and stories'}</div>
      <div className="mt-2 flex gap-1">
        {interests.map((item: string) => (
          <span key={item} className="app-chip">{item}</span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="travel-button px-3 py-1 text-xs" onClick={onHello}>인사 건네기</button>
        <button className="travel-button-outline px-3 py-1 text-xs" onClick={onViewProfile}>프로필 보기</button>
      </div>
    </div>
  );
}
