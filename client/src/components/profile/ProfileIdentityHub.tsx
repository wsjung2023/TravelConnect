import { Badge } from '@/components/ui/badge';

interface Props {
  bio?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  isHost?: boolean | null;
  openToMeet?: boolean | null;
}

export default function ProfileIdentityHub({ bio, languages, interests, isHost, openToMeet }: Props) {
  const normalizedLanguages = languages && languages.length > 0 ? languages : ['EN'];
  const normalizedInterests = interests && interests.length > 0 ? interests : ['Food', 'Culture', 'Photo'];

  return (
    <div className="rounded-xl border bg-white/70 p-3 text-left">
      <div className="mb-2 flex flex-wrap gap-2">
        <Badge variant="secondary">{isHost ? 'Guide/Host' : 'Traveler'}</Badge>
        <Badge variant={openToMeet ? 'default' : 'outline'}>{openToMeet ? 'Open to Meet' : 'Meet Off'}</Badge>
      </div>
      {bio && <p className="mb-2 text-sm text-gray-700">{bio}</p>}
      <div className="mb-1 text-xs text-gray-500">Languages</div>
      <div className="mb-2 flex flex-wrap gap-1">
        {normalizedLanguages.map((lang) => (
          <span key={lang} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{lang}</span>
        ))}
      </div>
      <div className="mb-1 text-xs text-gray-500">Interests</div>
      <div className="flex flex-wrap gap-1">
        {normalizedInterests.map((item) => (
          <span key={item} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{item}</span>
        ))}
      </div>
    </div>
  );
}
