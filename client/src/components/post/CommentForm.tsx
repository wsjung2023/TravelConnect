import { useState } from "react";
import { useAddComment } from "@/features/comments/useAddComment";

export default function CommentForm({ postId }: { postId: number }) {
  const [text, setText] = useState("");
  const [composing, setComposing] = useState(false); // 한글 IME
  const add = useAddComment(postId);

  const canSend = text.trim().length > 0 && !add.isPending;

  async function submit() {
    if (!canSend) return;
    await add.mutateAsync(text.trim());
    setText("");
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="sticky bottom-0 z-[1001] bg-white border-t p-2 flex gap-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <input
        className="flex-1 border rounded-xl px-3 py-2"
        placeholder="댓글을 입력하세요"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !composing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="submit"
        disabled={!canSend}
        className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-40"
      >
        {add.isPending ? "전송중…" : "전송"}
      </button>
    </form>
  );
}