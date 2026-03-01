// 댓글 섹션 — 게시글의 전체 댓글 목록(중첩 구조)을 렌더링하는 컴포넌트.
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useComments } from '@/features/comments/useComments';
import { useUpdateOfferStatus } from '@/features/comments/useAddComment';
import { Reply, DollarSign, Clock, Check, X, MessageCircle } from 'lucide-react';

interface Comment {
  id: number | string;
  userId: string;
  content: string;
  parentId?: number | null;
  isOffer?: boolean;
  offerPrice?: number | null;
  offerDescription?: string | null;
  offerDuration?: string | null;
  offerStatus?: string | null;
  createdAt: string;
  author?: { nickname?: string };
  _optimistic?: boolean;
}

interface CommentsSectionProps {
  postId: number;
  postOwnerId?: string;
  currentUserId?: string;
  onReply?: (parentId: number) => void;
}

function OfferCard({ comment, isPostOwner, onAccept, onDecline }: {
  comment: Comment;
  isPostOwner: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="bg-violet-100 text-violet-700">
          <DollarSign className="w-3 h-3 mr-1" />
          오퍼
        </Badge>
        {comment.offerStatus === 'accepted' && (
          <Badge className="bg-green-100 text-green-700">수락됨</Badge>
        )}
        {comment.offerStatus === 'declined' && (
          <Badge variant="destructive">거절됨</Badge>
        )}
        {comment.offerStatus === 'pending' && (
          <Badge variant="outline">대기중</Badge>
        )}
      </div>
      
      <p className="text-sm text-gray-800 mb-3">{comment.content}</p>
      
      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
        {comment.offerPrice && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-700">${comment.offerPrice}</span>
          </span>
        )}
        {comment.offerDuration && (
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-blue-600" />
            {comment.offerDuration}
          </span>
        )}
      </div>
      
      {comment.offerDescription && (
        <p className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg mb-3">
          {comment.offerDescription}
        </p>
      )}
      
      {isPostOwner && comment.offerStatus === 'pending' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onAccept} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-1" /> 수락
          </Button>
          <Button size="sm" variant="outline" onClick={onDecline}>
            <X className="w-4 h-4 mr-1" /> 거절
          </Button>
        </div>
      )}
    </div>
  );
}

function CommentItem({ 
  comment, 
  replies, 
  isPostOwner, 
  currentUserId,
  onReply, 
  onAcceptOffer, 
  onDeclineOffer,
  depth = 0 
}: {
  comment: Comment;
  replies: Comment[];
  isPostOwner: boolean;
  currentUserId?: string | undefined;
  onReply?: ((parentId: number) => void) | undefined;
  onAcceptOffer: (id: number) => void;
  onDeclineOffer: (id: number) => void;
  depth?: number | undefined;
}) {
  const isReply = depth > 0;
  
  if (comment.isOffer) {
    return (
      <div className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="flex gap-2 mb-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment?.userId || 'User'}`} />
            <AvatarFallback>
              {comment?.author?.nickname?.[0] || comment?.userId?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {comment?.author?.nickname || `사용자${comment?.userId?.slice(-4) || ''}`}
            </p>
            <p className="text-xs text-gray-500">
              {comment?.createdAt ? new Date(comment.createdAt).toLocaleString('ko-KR') : '방금 전'}
            </p>
          </div>
        </div>
        <OfferCard 
          comment={comment} 
          isPostOwner={isPostOwner}
          onAccept={() => onAcceptOffer(comment.id as number)}
          onDecline={() => onDeclineOffer(comment.id as number)}
        />
        {replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                replies={[]}
                isPostOwner={isPostOwner}
                currentUserId={currentUserId}
                onReply={onReply}
                onAcceptOffer={onAcceptOffer}
                onDeclineOffer={onDeclineOffer}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="flex gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment?.userId || 'User'}`} />
          <AvatarFallback>
            {comment?.author?.nickname?.[0] || comment?.userId?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium text-gray-900">
              {comment?.author?.nickname || `사용자${comment?.userId?.slice(-4) || ''}`}
            </span>
            <span className="text-gray-700 ml-2">
              {comment?.content || ''}
            </span>
            {comment?._optimistic && (
              <span className="text-xs text-gray-400 ml-2">(전송중)</span>
            )}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-gray-500">
              {comment?.createdAt ? new Date(comment.createdAt).toLocaleString('ko-KR') : '방금 전'}
            </p>
            {/* 인스타그램처럼 1단계 답글만 허용 (depth 0인 루트 댓글에만 답글 버튼 표시) */}
            {onReply && typeof comment.id === 'number' && depth === 0 && (
              <button 
                onClick={() => onReply(comment.id as number)}
                className="text-xs text-gray-500 hover:text-violet-600 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> 답글
              </button>
            )}
          </div>
        </div>
      </div>
      
      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              isPostOwner={isPostOwner}
              currentUserId={currentUserId}
              onReply={onReply}
              onAcceptOffer={onAcceptOffer}
              onDeclineOffer={onDeclineOffer}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({ postId, postOwnerId, currentUserId, onReply }: CommentsSectionProps) {
  const { data: comments, isLoading } = useComments(postId);
  const updateStatus = useUpdateOfferStatus();
  
  const safeComments = Array.isArray(comments) ? comments : [];
  
  const rootComments = safeComments.filter((c: Comment) => !c.parentId);
  const repliesMap = safeComments.reduce((acc: Record<number, Comment[]>, c: Comment) => {
    if (c.parentId != null) {
      const parentKey = c.parentId;
      if (!acc[parentKey]) acc[parentKey] = [];
      acc[parentKey].push(c);
    }
    return acc;
  }, {});

  const isPostOwner = currentUserId === postOwnerId;

  const handleAcceptOffer = (commentId: number) => {
    updateStatus.mutate({ commentId, status: 'accepted' });
  };

  const handleDeclineOffer = (commentId: number) => {
    updateStatus.mutate({ commentId, status: 'declined' });
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 py-4">댓글 로딩중...</div>;
  }

  if (safeComments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4 flex flex-col items-center gap-2">
        <MessageCircle className="w-8 h-8 text-gray-300" />
        첫 댓글을 남겨보세요!
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
      {rootComments.map((comment: Comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          replies={repliesMap[comment.id as number] || []}
          isPostOwner={isPostOwner}
          currentUserId={currentUserId}
          onReply={onReply}
          onAcceptOffer={handleAcceptOffer}
          onDeclineOffer={handleDeclineOffer}
        />
      ))}
    </div>
  );
}
