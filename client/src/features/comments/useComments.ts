// 댓글 조회 훅 — 특정 게시글의 댓글 목록(중첩 구조 포함)을 조회하는 쿼리 훅.
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useComments(postId: number) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      try {
        const result = await api(`/api/posts/${postId}/comments`, { auth: false });
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('댓글 로딩 실패:', error);
        return [];
      }
    },
    staleTime: 10_000,
  });
}