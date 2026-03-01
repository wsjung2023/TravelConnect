// 댓글 추가 훅 — 게시글에 댓글 또는 대댓글을 추가하는 뮤테이션과 캐시 무효화 로직을 제공한다.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CommentData {
  content: string;
  parentId?: number | null;
  isOffer?: boolean;
  offerPrice?: number | null;
  offerDescription?: string | null;
  offerDuration?: string | null;
}

export function useAddComment(postId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CommentData) => {
      return api(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: data,
        auth: true,
      });
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ["comments", postId] });
      const prev = qc.getQueryData<any[]>(["comments", postId]) || [];
      const temp = {
        id: `temp-${Date.now()}`,
        content: data.content,
        parentId: data.parentId || null,
        isOffer: data.isOffer || false,
        offerPrice: data.offerPrice || null,
        offerDescription: data.offerDescription || null,
        offerDuration: data.offerDuration || null,
        offerStatus: data.isOffer ? 'pending' : null,
        createdAt: new Date().toISOString(),
        userId: "현재사용자",
        author: { nickname: "나" },
        _optimistic: true,
      };
      qc.setQueryData(["comments", postId], [...prev, temp]);
      return { prev };
    },
    onError: (err: any, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["comments", postId], ctx.prev);
      
      if (err.message?.includes("401")) {
        alert("댓글을 작성하려면 먼저 로그인해주세요!");
        window.location.href = "/";
      } else {
        alert("댓글 전송 실패: 네트워크를 확인하세요.");
      }
    },
    onSuccess: (newComment) => {
      qc.setQueryData<any[]>(["comments", postId], (old = []) => {
        const noTemps = old.filter((c: any) => !c._optimistic);
        return [...noTemps, newComment];
      });
      
      qc.setQueryData<any[]>(['/api/posts'], (oldPosts = []) => {
        return oldPosts.map((post: any) => {
          if (post.id === postId) {
            return {
              ...post,
              commentsCount: (post.commentsCount || 0) + 1
            };
          }
          return post;
        });
      });
    },
  });
}

export function useUpdateOfferStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, status }: { commentId: number; status: string }) => {
      return api(`/api/comments/${commentId}/offer-status`, {
        method: "PATCH",
        body: { status },
        auth: true,
      });
    },
    onSuccess: (updated, { commentId }) => {
      qc.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}
