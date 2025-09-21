import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Send, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Message } from '@shared/schema';

interface ThreadPanelProps {
  parentMessage: Message | null;
  onClose: () => void;
  onSendReply: (content: string, parentMessageId: number) => void;
  currentUserId: string;
}

export default function ThreadPanel({
  parentMessage,
  onClose,
  onSendReply,
  currentUserId,
}: ThreadPanelProps) {
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // 스레드 메시지 조회
  const { 
    data: threadMessages = [], 
    isLoading: threadLoading, 
    error: threadError 
  } = useQuery<Message[]>({
    queryKey: ['/api/messages', parentMessage?.id, 'thread'],
    enabled: !!parentMessage?.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim() && parentMessage) {
      const replyContent = replyText.trim();
      
      // Optimistic update - 즉시 UI에 반영
      const optimisticMessage: Message = {
        id: Date.now(), // 임시 ID
        content: replyContent,
        senderId: currentUserId,
        parentMessageId: parentMessage.id,
        channelId: parentMessage.channelId,
        conversationId: parentMessage.conversationId,
        messageType: 'text',
        metadata: null,
        createdAt: new Date(),
      };

      // 쿼리 캐시에 즉시 추가
      queryClient.setQueryData(
        ['/api/messages', parentMessage.id, 'thread'],
        (oldMessages: Message[] = []) => [...oldMessages, optimisticMessage]
      );

      onSendReply(replyContent, parentMessage.id);
      setReplyText('');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );

    if (messageDay.getTime() === today.getTime()) {
      return '오늘';
    } else if (messageDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return '어제';
    } else {
      return messageDate.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (!parentMessage) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900">스레드</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
            data-testid="button-close-thread"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-start gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">
              {parentMessage.senderId.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">
                {parentMessage.senderId}
              </span>
              <span className="text-xs text-gray-500">
                {formatDate(parentMessage.createdAt!)} {formatTime(parentMessage.createdAt!)}
              </span>
            </div>
            <p className="text-sm text-gray-700 break-words">
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {threadLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">
              댓글을 불러오는 중...
            </p>
          </div>
        ) : threadError ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-sm text-gray-500 mb-3">
              댓글을 불러올 수 없습니다
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              다시 시도
            </Button>
          </div>
        ) : threadMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">💬</div>
            <p className="text-sm text-gray-500">
              첫 댓글을 남겨보세요!
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {threadMessages.map((message) => {
              const isOwn = message.senderId === currentUserId;
              
              return (
                <div
                  key={message.id}
                  className="flex items-start gap-3"
                  data-testid={`thread-message-${message.id}`}
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs">
                      {message.senderId.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium text-sm ${
                        isOwn ? 'text-primary' : 'text-gray-900'
                      }`}>
                        {message.senderId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.createdAt!)}
                      </span>
                    </div>
                    <div className={`p-3 rounded-lg max-w-none break-words ${
                      isOwn 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="flex-1 rounded-lg border-gray-200"
            data-testid="input-thread-reply"
          />
          <Button
            type="submit"
            disabled={!replyText.trim()}
            className="rounded-lg px-3"
            data-testid="button-send-thread-reply"
          >
            <Send size={16} />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter로 전송, Shift+Enter로 줄바꿈
        </p>
      </form>
    </div>
  );
}