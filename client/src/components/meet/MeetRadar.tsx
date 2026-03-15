export default function MeetRadar() {
  return (
    <div className="relative mx-auto mt-4 h-56 w-56 rounded-full border border-primary/40">
      <div className="absolute inset-6 rounded-full border border-primary/30" />
      <div className="absolute inset-12 rounded-full border border-primary/20" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
    </div>
  );
}
