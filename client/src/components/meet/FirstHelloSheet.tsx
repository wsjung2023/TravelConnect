interface Props { onSend: (message: string) => void }

export default function FirstHelloSheet({ onSend }: Props) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <div className="mb-2 text-sm font-semibold">첫 인사</div>
      <div className="flex flex-wrap gap-2">
        {['안녕하세요! 같이 커피 어때요?', '근처 명소 같이 보실래요?', '오늘 일정 공유할까요?'].map((m) => (
          <button key={m} className="rounded-full bg-muted px-3 py-1 text-xs" onClick={() => onSend(m)}>{m}</button>
        ))}
      </div>
    </div>
  );
}
