import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Phone, Video, MoreVertical, ArrowLeft, MessageSquare, Reply, Loader2, UserPlus, Settings, LogOut, Languages, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { t, i18n } = useTranslation('ui');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Translation state
  const [translatedMessages, setTranslatedMessages] = useState<Record<number, string>>({});
  const [translatingMessages, setTranslatingMessages] = useState<Set<number>>(new Set());

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

  const handleTranslate = async (messageId: number) => {
    // Toggle translation
    if (translatedMessages[messageId]) {
      setTranslatedMessages(prev => {
        const { [messageId]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    // Start translation
    setTranslatingMessages(prev => new Set(prev).add(messageId));

    try {
      const response = await fetch(`/api/messages/${messageId}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetLanguage: i18n.language,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslatedMessages(prev => ({
        ...prev,
        [messageId]: data.translatedText,
      }));
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslatingMessages(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  };

  const formatTime = (date: Date) => {
    const locale = i18n.language === 'ko' ? 'ko-KR' : 
                   i18n.language === 'ja' ? 'ja-JP' :
                   i18n.language === 'zh' ? 'zh-CN' :
                   i18n.language === 'fr' ? 'fr-FR' :
                   i18n.language === 'es' ? 'es-ES' : 'en-US';
    return new Date(date).toLocaleTimeString(locale, {
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
      return null;
    } else if (messageDay.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return t('chat.yesterday');
    } else {
      const locale = i18n.language === 'ko' ? 'ko-KR' : 
                     i18n.language === 'ja' ? 'ja-JP' :
                     i18n.language === 'zh' ? 'zh-CN' :
                     i18n.language === 'fr' ? 'fr-FR' :
                     i18n.language === 'es' ? 'es-ES' : 'en-US';
      return messageDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // 헤더 정보 결정
  const getHeaderInfo = () => {
    if (channel) {
      return {
        title: channel.name || `${channel.type} ${t('chat.channel')}`,
        subtitle: channel.description || `${channel.type} ${t('chat.channel')}`,
        isChannel: true,
      };
    } else if (conversation) {
      const otherParticipant =
        conversation.participant1Id === currentUserId
          ? conversation.participant2Id
          : conversation.participant1Id;
      return {
        title: otherParticipant,
        subtitle: t('chat.online'),
        isChannel: false,
      };
    }
    return { title: t('chat.chat'), subtitle: '', isChannel: false };
  };

  const headerInfo = getHeaderInfo();

  // 메시지를 날짜별로 그룹화
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      const messageDate = formatDate(message.createdAt!) || t('chat.today');
      
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2" data-testid="button-menu">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {headerInfo.isChannel ? (
                <>
                  <DropdownMenuItem>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>{t('chat.inviteMember')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('chat.channelSettings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('chat.leaveChannel')}</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('chat.conversationSettings')}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {messagesLoading ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('chat.loadingMessages')}</p>
          </div>
        ) : messagesError ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="mb-4">{t('chat.cannotLoadMessages')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              {t('chat.retry')}
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">💬</div>
            <p>{t('chat.startConversation')}</p>
          </div>
        ) : (
          <div className="p-4">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Separator */}
                {group.date !== t('chat.today') && (
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
                    const isTranslated = !!translatedMessages[message.id];
                    const isTranslating = translatingMessages.has(message.id);
                    const isAIConcierge = message.senderId === null;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className="max-w-sm relative group">
                          {!isOwn && headerInfo.isChannel && (
                            <div className="flex items-center gap-2 mb-1">
                              {isAIConcierge ? (
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                                  <Sparkles size={12} className="text-white" />
                                </div>
                              ) : (
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {(message.senderId || 'U').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="text-xs text-gray-600 font-medium">
                                {isAIConcierge ? t('chat.aiConcierge') : message.senderId}
                              </span>
                            </div>
                          )}
                          
                          <div className={`chat-bubble ${isOwn ? 'sent' : isAIConcierge ? 'ai' : 'received'} relative`}>
                            <p className="break-words">
                              {isTranslated ? translatedMessages[message.id] : message.content}
                            </p>
                            
                            {isTranslated && (
                              <div className="text-xs opacity-60 mt-1 italic">
                                {t('chat.translated')}
                              </div>
                            )}
                            
                            {hasReplies && (
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/20">
                                <MessageSquare size={12} />
                                <span className="text-xs opacity-80">
                                  {t('chat.repliesCount', { count: messages.filter(m => m.parentMessageId === message.id).length })}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-400">
                              {formatTime(message.createdAt!)}
                            </p>
                            
                            <div className="flex items-center gap-1">
                              {/* Translation Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTranslate(message.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6"
                                data-testid={`button-translate-${message.id}`}
                                disabled={isTranslating}
                              >
                                {isTranslating ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Languages size={12} className={isTranslated ? 'text-blue-500' : ''} />
                                )}
                              </Button>
                              
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
            placeholder={t('chat.enterMessage')}
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