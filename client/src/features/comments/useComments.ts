import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useComments(postId: number) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => api(`/api/posts/${postId}/comments`, { auth: false }), // 공개면 false, 비공개면 true
    staleTime: 10_000,
  });
}