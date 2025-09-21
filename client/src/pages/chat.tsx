import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChannelList from '@/components/ChannelList';
import EnhancedChatWindow from '@/components/EnhancedChatWindow';
import ThreadPanel from '@/components/ThreadPanel';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation, Message, Channel } from '@shared/schema';

type ChatMode = 'list' | 'chat' | 'thread';

export default function Chat() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<Message | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('list');
  
  const { user } = useAuth();
  const { sendMessage, addMessageHandler, removeMessageHandler } = useWebSocket();
  const queryClient = useQueryClient();

  const currentUserId = user?.id || 'current-user';

  // 현재 선택된 채팅의 메시지 조회
  const { data: messages = [] } = useQuery<Message[]>({
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
      if (data.message && selectedConversation) {
        queryClient.setQueryData(
          ['/api/conversations', selectedConversation.id, 'messages'],
          (oldMessages: Message[] = []) => [...oldMessages, data.message]
        );
      }
    });

    addMessageHandler('message_sent', (data) => {
      console.log('DM 메시지 전송 확인:', data);
      if (data.message && selectedConversation) {
        queryClient.setQueryData(
          ['/api/conversations', selectedConversation.id, 'messages'],
          (oldMessages: Message[] = []) => [...oldMessages, data.message]
        );
      }
    });

    // 채널 메시지 핸들러
    addMessageHandler('channel_message', (data) => {
      console.log('새 채널 메시지 수신:', data);
      if (data.message && data.channelId === selectedChannel?.id) {
        queryClient.setQueryData(
          ['/api/channels', data.channelId, 'messages'],
          (oldMessages: Message[] = []) => [...oldMessages, data.message]
        );
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

  const handleSendMessage = (content: string, parentMessageId?: number) => {
    if (!user) {
      console.error('사용자 정보가 없습니다');
      return;
    }

    if (selectedChannel) {
      // 채널 메시지 전송
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
      // DM 메시지 전송
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

  const handleCreateChannel = () => {
    console.log('채널 생성 기능 준비 중...');
    // TODO: 채널 생성 모달 구현
  };

  // 데스크톱 레이아웃 (3-panel)
  const isDesktop = window.innerWidth >= 1024;

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
              onSendMessage={handleSendMessage}
              onStartThread={handleStartThread}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  채팅을 선택하세요
                </h3>
                <p className="text-gray-500">
                  왼쪽에서 채널이나 대화를 선택해서 채팅을 시작하세요
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
  );
}