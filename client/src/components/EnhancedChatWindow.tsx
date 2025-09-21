import { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, ArrowLeft, MessageSquare, Reply, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Message, Conversation, Channel } from '@shared/schema';

interface EnhancedChatWindowProps {
  // 채널 또는 대화방 정보
  channel?: Channel | undefined;
  conversation?: Conversation | undefined;
  messages: Message[];
  messagesLoading?: boolean;
  messagesError?: Error | null;
  onSendMessage: (content: string, parentMessageId?: number) => void;
  onBack?: () => void;
  onStartThread?: (message: Message) => void;
  currentUserId: string;
}

export default function EnhancedChatWindow({
  channel,
  conversation,
  messages,
  messagesLoading = false,
  messagesError = null,
  onSendMessage,
  onBack,
  onStartThread,
  currentUserId,
}: EnhancedChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
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
      return null; // 오늘은 날짜 표시 안함
    } else if (messageDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return '어제';
    } else {
      return messageDate.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // 헤더 정보 결정
  const getHeaderInfo = () => {
    if (channel) {
      return {
        title: channel.name || `${channel.type} 채널`,
        subtitle: channel.description || `${channel.type} 채널`,
        isChannel: true,
      };
    } else if (conversation) {
      const otherParticipant =
        conversation.participant1Id === currentUserId
          ? conversation.participant2Id
          : conversation.participant1Id;
      return {
        title: otherParticipant,
        subtitle: '온라인',
        isChannel: false,
      };
    }
    return { title: '채팅', subtitle: '', isChannel: false };
  };

  const headerInfo = getHeaderInfo();

  // 메시지를 날짜별로 그룹화
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      const messageDate = formatDate(message.createdAt!) || '오늘';
      
      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft size={18} />
            </Button>
          )}
          
          <div className="flex items-center gap-3">
            {headerInfo.isChannel ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <MessageSquare size={20} className="text-primary" />
              </div>
            ) : (
              <Avatar className="w-10 h-10">
                <AvatarImage src="" />
                <AvatarFallback>
                  {headerInfo.title.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div>
              <h3 className="font-medium">{headerInfo.title}</h3>
              <p className="text-xs text-gray-500">{headerInfo.subtitle}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!headerInfo.isChannel && (
            <>
              <Button variant="ghost" size="sm" className="p-2">
                <Phone size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Video size={18} />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="p-2">
            <MoreVertical size={18} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {messagesLoading ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>메시지를 불러오는 중...</p>
          </div>
        ) : messagesError ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="mb-4">메시지를 불러올 수 없습니다</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              다시 시도
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">💬</div>
            <p>대화를 시작해보세요!</p>
          </div>
        ) : (
          <div className="p-4">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Separator */}
                {group.date !== '오늘' && (
                  <div className="flex items-center justify-center my-6">
                    <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {group.date}
                    </div>
                  </div>
                )}
                
                {/* Messages */}
                <div className="space-y-4">
                  {group.messages.map((message) => {
                    const isOwn = message.senderId === currentUserId;
                    const hasReplies = messages.some(m => m.parentMessageId === message.id);
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className="max-w-sm relative group">
                          {!isOwn && headerInfo.isChannel && (
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {message.senderId.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-600 font-medium">
                                {message.senderId}
                              </span>
                            </div>
                          )}
                          
                          <div className={`chat-bubble ${isOwn ? 'sent' : 'received'} relative`}>
                            <p className="break-words">{message.content}</p>
                            
                            {hasReplies && (
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/20">
                                <MessageSquare size={12} />
                                <span className="text-xs opacity-80">
                                  {messages.filter(m => m.parentMessageId === message.id).length}개 댓글
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-400">
                              {formatTime(message.createdAt!)}
                            </p>
                            
                            {/* Thread Reply Button */}
                            {onStartThread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onStartThread(message)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6"
                                data-testid={`button-reply-${message.id}`}
                              >
                                <Reply size={12} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full border-gray-200"
            data-testid="input-message"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim()}
            className="rounded-full w-10 h-10 p-0"
            data-testid="button-send-message"
          >
            <Send size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}