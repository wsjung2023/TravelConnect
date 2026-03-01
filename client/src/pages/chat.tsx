// 채팅 페이지 — 3패널(채널 목록·채팅창·스레드) 구조의 실시간 메시지 화면. WebSocket 기반 실시간 업데이트와 DM 번역을 지원한다.
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearch } from 'wouter';
import ChannelList from '@/components/ChannelList';
import EnhancedChatWindow from '@/components/EnhancedChatWindow';
import ThreadPanel from '@/components/ThreadPanel';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import type { Conversation, Message, Channel } from '@shared/schema';

type ChatMode = 'list' | 'chat' | 'thread';

export default function Chat() {
  const { t } = useTranslation('ui');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<Message | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('list');
  
  const { user } = useAuth();
  const { sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();
  const queryClient = useQueryClient();
  
  // URL 파라미터에서 conversationId 읽기
  const searchString = useSearch();
  const conversationIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const id = params.get('conversationId');
    return id ? parseInt(id, 10) : null;
  }, [searchString]);
  
  // 대화 목록 조회 (URL 파라미터 처리용 - queryKey 공유)
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });
  
  // URL의 conversationId로 대화 자동 선택
  useEffect(() => {
    // conversationId가 변경될 때마다 선택 (selectedConversation 조건 제거)
    if (conversationIdFromUrl && conversations.length > 0) {
      const targetConversation = conversations.find(c => c.id === conversationIdFromUrl);
      if (targetConversation && targetConversation.id !== selectedConversation?.id) {
        setSelectedConversation(targetConversation);
        setSelectedChannel(null);
        setChatMode('chat');
      }
    }
  }, [conversationIdFromUrl, conversations]);

  const currentUserId = user?.id || 'current-user';

  // 현재 선택된 채팅의 메시지 조회
  const { 
    data: messages = [], 
    isLoading: messagesLoading, 
    error: messagesError 
  } = useQuery<Message[]>({
    queryKey: selectedChannel 
      ? ['/api/channels', selectedChannel.id, 'messages'] 
      : selectedConversation 
      ? ['/api/conversations', selectedConversation.id, 'messages']
      : ['no-messages'],
    enabled: !!(selectedChannel || selectedConversation),
  });

  useEffect(() => {
    // WebSocket 메시지 핸들러 등록
    
    // DM 메시지 핸들러
    addMessageHandler('chat_message', (data) => {
      console.log('새 DM 메시지 수신:', data);
      if (data.message) {
        // 현재 선택된 대화의 메시지 목록 업데이트
        if (selectedConversation && data.message.conversationId === selectedConversation.id) {
          queryClient.setQueryData(
            ['/api/conversations', selectedConversation.id, 'messages'],
            (oldMessages: Message[] = []) => [...oldMessages, data.message]
          );
        }

        // 대화 목록 새로고침 (마지막 메시지 정보 및 읽지 않음 카운트 업데이트)
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    });

    addMessageHandler('message_sent', (data) => {
      console.log('DM 메시지 전송 확인:', data);
      if (data.message && selectedConversation) {
        queryClient.setQueryData(
          ['/api/conversations', selectedConversation.id, 'messages'],
          (oldMessages: Message[] = []) => [...oldMessages, data.message]
        );

        // 스레드 메시지인 경우 스레드 캐시도 업데이트
        if (data.message.parentMessageId) {
          queryClient.setQueryData(
            ['/api/messages', data.message.parentMessageId, 'thread'],
            (oldThreadMessages: Message[] = []) => [...oldThreadMessages, data.message]
          );
        }
      }
      
      // 대화 목록도 업데이트 (마지막 메시지 정보)
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    });

    // 채널 메시지 핸들러
    addMessageHandler('channel_message', (data) => {
      console.log('새 채널 메시지 수신:', data);
      if (data.message && data.channelId === selectedChannel?.id) {
        queryClient.setQueryData(
          ['/api/channels', data.channelId, 'messages'],
          (oldMessages: Message[] = []) => [...oldMessages, data.message]
        );

        // 스레드 메시지인 경우 스레드 캐시도 업데이트
        if (data.message.parentMessageId) {
          queryClient.setQueryData(
            ['/api/messages', data.message.parentMessageId, 'thread'],
            (oldThreadMessages: Message[] = []) => [...oldThreadMessages, data.message]
          );
        }
      }
      
      // 채널 목록도 업데이트
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
    });

    return () => {
      removeMessageHandler('chat_message');
      removeMessageHandler('message_sent'); 
      removeMessageHandler('channel_message');
    };
  }, [selectedConversation, selectedChannel, addMessageHandler, removeMessageHandler, queryClient]);

  const handleSendMessage = async (content: string, parentMessageId?: number) => {
    if (!user) {
      console.error('사용자 정보가 없습니다');
      return;
    }

    if (selectedChannel) {
      if (selectedChannel.name === 'AI Concierge') {
        try {
          const response = await apiRequest('/api/ai/concierge/message', {
            method: 'POST',
            body: JSON.stringify({
              message: content,
              channelId: selectedChannel.id,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();
          
          queryClient.invalidateQueries({ 
            queryKey: ['/api/channels', selectedChannel.id, 'messages'] 
          });
        } catch (error) {
          console.error('AI Concierge 메시지 전송 실패:', error);
        }
        return;
      }

      const success = sendMessage({
        type: 'channel_message',
        channelId: selectedChannel.id,
        content,
        parentMessageId,
      });

      if (!success) {
        console.error('채널 메시지 전송 실패 - WebSocket 연결 없음');
      }
    } else if (selectedConversation) {
      const recipientId = selectedConversation.participant1Id === user.id 
        ? selectedConversation.participant2Id 
        : selectedConversation.participant1Id;

      const success = sendMessage({
        type: 'chat_message',
        conversationId: selectedConversation.id,
        content,
        recipientId
      });

      if (!success) {
        console.error('DM 메시지 전송 실패 - WebSocket 연결 없음');
      }
    }
  };

  const handleSendThreadReply = (content: string, parentMessageId: number) => {
    handleSendMessage(content, parentMessageId);
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setSelectedConversation(null);
    setSelectedThreadMessage(null);
    setChatMode('chat');
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedChannel(null);
    setSelectedThreadMessage(null);
    setChatMode('chat');
  };

  const handleStartThread = (message: Message) => {
    setSelectedThreadMessage(message);
    setChatMode('thread');
  };

  const handleCloseThread = () => {
    setSelectedThreadMessage(null);
    setChatMode('chat');
  };

  const handleBack = () => {
    setSelectedChannel(null);
    setSelectedConversation(null);
    setSelectedThreadMessage(null);
    setChatMode('list');
  };

  // 채널 생성 상태
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const handleCreateChannel = () => {
    setIsCreateChannelOpen(true);
  };

  const handleCreateChannelSubmit = async () => {
    if (!newChannelName.trim()) return;
    
    try {
      const response = await apiRequest('/api/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: newChannelName.trim(),
          type: 'topic',
          description: ''
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const newChannel = await response.json();
      
      // 채널 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/channels'] });
      
      // 모달 닫기 및 초기화
      setIsCreateChannelOpen(false);
      setNewChannelName('');
      
      // 새로 생성된 채널 선택
      if (newChannel && newChannel.id) {
        setSelectedChannel(newChannel);
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('채널 생성 실패:', error);
    }
  };

  // 데스크톱 레이아웃 (3-panel) - 실시간 반응형
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="h-full flex bg-gray-50">
        {/* Left Panel - Channel List */}
        <ChannelList
          selectedChannelId={selectedChannel?.id}
          selectedConversationId={selectedConversation?.id}
          onChannelSelect={handleChannelSelect}
          onConversationSelect={handleConversationSelect}
          onCreateChannel={handleCreateChannel}
          currentUserId={currentUserId}
        />

        {/* Center Panel - Chat Window */}
        <div className="flex-1 min-w-0">
          {selectedChannel || selectedConversation ? (
            <EnhancedChatWindow
              channel={selectedChannel ? selectedChannel : undefined}
              conversation={selectedConversation ? selectedConversation : undefined}
              messages={messages}
              messagesLoading={messagesLoading}
              messagesError={messagesError}
              onSendMessage={handleSendMessage}
              onStartThread={handleStartThread}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {t('chatPage.selectChat')}
                </h3>
                <p className="text-gray-500">
                  {t('chatPage.selectChatDesc')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Thread Panel */}
        {selectedThreadMessage && (
          <ThreadPanel
            parentMessage={selectedThreadMessage}
            onClose={handleCloseThread}
            onSendReply={handleSendThreadReply}
            currentUserId={currentUserId}
          />
        )}

        {/* 채널 생성 모달 */}
        <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('chatPage.createChannel')}</DialogTitle>
              <DialogDescription>
                {t('chatPage.createChannelDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="channel-name" className="text-right">
                  {t('chatPage.channelName')}
                </Label>
                <Input
                  id="channel-name"
                  data-testid="input-channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={t('chatPage.channelPlaceholder')}
                  className="col-span-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateChannelSubmit();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateChannelOpen(false);
                  setNewChannelName('');
                }}
              >
                {t('chatPage.cancel')}
              </Button>
              <Button 
                onClick={handleCreateChannelSubmit}
                disabled={!newChannelName.trim()}
                data-testid="button-create-channel-submit"
              >
                {t('chatPage.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 모바일 레이아웃 (단일 패널)
  if (chatMode === 'thread' && selectedThreadMessage) {
    return (
      <div className="h-full">
        <ThreadPanel
          parentMessage={selectedThreadMessage}
          onClose={handleCloseThread}
          onSendReply={handleSendThreadReply}
          currentUserId={currentUserId}
        />
      </div>
    );
  }

  if (chatMode === 'chat' && (selectedChannel || selectedConversation)) {
    return (
      <div className="h-full">
        <EnhancedChatWindow
          channel={selectedChannel ? selectedChannel : undefined}
          conversation={selectedConversation ? selectedConversation : undefined}
          messages={messages}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          onSendMessage={handleSendMessage}
          onBack={handleBack}
          onStartThread={handleStartThread}
          currentUserId={currentUserId}
        />
      </div>
    );
  }

  // 기본: 채널/대화 목록
  return (
    <>
      <div className="h-full">
        <ChannelList
          selectedChannelId={selectedChannel?.id}
          selectedConversationId={selectedConversation?.id}
          onChannelSelect={handleChannelSelect}
          onConversationSelect={handleConversationSelect}
          onCreateChannel={handleCreateChannel}
          currentUserId={currentUserId}
        />
      </div>

      {/* 채널 생성 모달 */}
      <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('chatPage.createChannel')}</DialogTitle>
            <DialogDescription>
              {t('chatPage.createChannelDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channel-name" className="text-right">
                {t('chatPage.channelName')}
              </Label>
              <Input
                id="channel-name"
                data-testid="input-channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder={t('chatPage.channelPlaceholder')}
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateChannelSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateChannelOpen(false);
                setNewChannelName('');
              }}
            >
              {t('chatPage.cancel')}
            </Button>
            <Button 
              onClick={handleCreateChannelSubmit}
              disabled={!newChannelName.trim()}
              data-testid="button-create-channel-submit"
            >
              {t('chatPage.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}