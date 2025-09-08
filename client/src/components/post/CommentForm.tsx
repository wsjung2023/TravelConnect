import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function CommentForm({ postId, onSent }: { postId: number; onSent: () => void }) {
  const [text, setText] = useState(""); 
  const canSend = text.trim().length > 0;

  async function submit() {
    if (!canSend) return;
    await apiRequest(`/api/posts/${postId}/comments`, { 
      method: "POST", 
      body: { content: text.trim() }
    });
    setText(""); 
    onSent();
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); submit(); }}
      className="sticky bottom-0 z-[1001] bg-white border-t p-2 flex gap-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <input
        className="flex-1 border rounded-xl px-3 py-2"
        placeholder="댓글을 입력하세요"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
      />
      <button type="submit" disabled={!canSend} className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-40">
        전송
      </button>
    </form>
  );
}