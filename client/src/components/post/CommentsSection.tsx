import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useComments } from '@/features/comments/useComments';

export default function CommentsSection({ postId }: { postId: number }) {
  const { data: comments = [], isLoading } = useComments(postId);

  if (isLoading) {
    return <div className="text-center text-gray-500 py-4">댓글 로딩중...</div>;
  }

  if (comments.length === 0) {
    return <div className="text-center text-gray-500 py-4">첫 댓글을 남겨보세요!</div>;
  }

  return (
    <div className="space-y-3 max-h-32 overflow-y-auto">
      {comments.map((comment: any) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.userId || 'User'}`} />
            <AvatarFallback>
              {comment.author?.nickname?.[0] || comment.userId?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium text-gray-900">
                {comment.author?.nickname || `사용자${comment.userId?.slice(-4) || ''}`}
              </span>
              <span className="text-gray-700 ml-2">
                {comment.content}
              </span>
              {comment._optimistic && (
                <span className="text-xs text-gray-400 ml-2">(전송중)</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {comment.createdAt ? new Date(comment.createdAt).toLocaleString('ko-KR') : '방금 전'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}