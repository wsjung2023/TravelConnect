interface Props { mode: 'stories' | 'reels' | 'nearby'; onChange: (m: 'stories'|'reels'|'nearby') => void }

export default function ExploreHeader({ mode, onChange }: Props) {
  const modes: Array<'stories'|'reels'|'nearby'> = ['stories','reels','nearby'];
  return (
    <div className="mb-3">
      <h2 className="text-xl font-semibold">Explore</h2>
      <div className="mt-2 flex gap-2">
        {modes.map((m) => (
          <button key={m} onClick={() => onChange(m)} className={`rounded-full px-3 py-1 text-xs ${mode===m ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
