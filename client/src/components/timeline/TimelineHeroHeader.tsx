import { Calendar, MapPin, Route } from 'lucide-react';

interface Props {
  title: string;
  destination?: string | null;
  startDate: string;
  endDate?: string | null;
  totalDays?: number | null;
}

export default function TimelineHeroHeader({ title, destination, startDate, endDate, totalDays }: Props) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {destination && (
          <span className="inline-flex items-center gap-1"><MapPin size={12} />{destination}</span>
        )}
        <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(startDate).toLocaleDateString()} {endDate ? `- ${new Date(endDate).toLocaleDateString()}` : ''}</span>
        <span className="inline-flex items-center gap-1"><Route size={12} />{totalDays || 1} days</span>
      </div>
    </div>
  );
}
