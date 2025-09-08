import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAddComment(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      return api(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: { content },
        auth: true,
      });
    },
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: ["comments", postId] });
      const prev = qc.getQueryData<any[]>(["comments", postId]) || [];
      const temp = {
        id: `temp-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        userId: "현재사용자", // 임시 사용자 ID
        author: { nickname: "나" },
        _optimistic: true,
      };
      qc.setQueryData(["comments", postId], [temp, ...prev]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["comments", postId], ctx.prev);
      alert("댓글 전송 실패: 로그인 또는 네트워크를 확인하세요.");
    },
    onSuccess: (newComment) => {
      qc.setQueryData<any[]>(["comments", postId], (old = []) => {
        // temp 제거 + 서버 응답으로 치환
        const noTemps = old.filter((c: any) => !c._optimistic);
        return [newComment, ...noTemps];
      });
    },
  });
}