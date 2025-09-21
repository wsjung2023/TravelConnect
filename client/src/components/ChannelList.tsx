import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hash, MessageCircle, Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Channel, ChannelMember, Conversation } from '@shared/schema';

interface ChannelListProps {
  selectedChannelId?: number | undefined;
  selectedConversationId?: number | undefined;
  onChannelSelect: (channel: Channel) => void;
  onConversationSelect: (conversation: Conversation) => void;
  onCreateChannel: () => void;
  currentUserId: string;
}

type ChatItem = 
  | { type: 'channel'; data: Channel & { memberCount?: number; unreadCount?: number } }
  | { type: 'conversation'; data: Conversation & { unreadCount?: number } };

export default function ChannelList({
  selectedChannelId,
  selectedConversationId,
  onChannelSelect,
  onConversationSelect,
  onCreateChannel,
  currentUserId,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'channels' | 'dms'>('all');

  // 사용자의 채널 목록 조회
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['/api/channels'],
  });

  // 기존 1:1 대화 목록 조회
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // 채팅 아이템 통합 및 필터링
  const chatItems: ChatItem[] = [
    ...channels.map(channel => ({ 
      type: 'channel' as const, 
      data: { ...channel, memberCount: 0, unreadCount: 0 } 
    })),
    ...conversations.map(conversation => ({ 
      type: 'conversation' as const, 
      data: { ...conversation, unreadCount: 0 } 
    })),
  ];

  const filteredItems = chatItems.filter(item => {
    // 탭 필터
    if (activeTab === 'channels' && item.type !== 'channel') return false;
    if (activeTab === 'dms' && item.type !== 'conversation') return false;

    // 검색 필터
    if (!searchQuery) return true;
    
    if (item.type === 'channel') {
      return item.data.name?.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherParticipant = 
        item.data.participant1Id === currentUserId
          ? item.data.participant2Id
          : item.data.participant1Id;
      return otherParticipant.toLowerCase().includes(searchQuery.toLowerCase());
    }
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );

    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else {
      return messageDate.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'topic':
        return <Hash size={16} className="text-gray-500" />;
      case 'group':
        return <Users size={16} className="text-gray-500" />;
      case 'dm':
        return <MessageCircle size={16} className="text-gray-500" />;
      default:
        return <Hash size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">채팅</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateChannel}
            className="p-2"
            data-testid="button-create-channel"
          >
            <Plus size={18} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={16}
          />
          <Input
            placeholder="채팅방 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-lg bg-gray-50 border-gray-200"
            data-testid="input-search-channels"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className="flex-1 text-xs"
            data-testid="tab-all"
          >
            전체
          </Button>
          <Button
            variant={activeTab === 'channels' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('channels')}
            className="flex-1 text-xs"
            data-testid="tab-channels"
          >
            채널
          </Button>
          <Button
            variant={activeTab === 'dms' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('dms')}
            className="flex-1 text-xs"
            data-testid="tab-dms"
          >
            DM
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-base font-medium text-gray-900 mb-2">
              채팅방이 없어요
            </h3>
            <p className="text-gray-500 text-sm">
              {activeTab === 'channels' ? '채널을 만들어보세요!' : '대화를 시작해보세요!'}
            </p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => {
              if (item.type === 'channel') {
                const channel = item.data;
                const isSelected = selectedChannelId === channel.id;
                
                return (
                  <div
                    key={`channel-${channel.id}`}
                    onClick={() => onChannelSelect(channel)}
                    className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-gray-50'
                    }`}
                    data-testid={`channel-item-${channel.id}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                      {getChannelIcon(channel.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {channel.name || `${channel.type} 채널`}
                        </h4>
                        {channel.lastMessageAt && (
                          <span className="text-xs text-gray-500">
                            {formatTime(channel.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600 truncate">
                          {channel.description || '설명 없음'}
                        </p>
                        {(channel.unreadCount || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1">
                            {channel.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                const conversation = item.data;
                const isSelected = selectedConversationId === conversation.id;
                const otherParticipant =
                  conversation.participant1Id === currentUserId
                    ? conversation.participant2Id
                    : conversation.participant1Id;

                return (
                  <div
                    key={`conversation-${conversation.id}`}
                    onClick={() => onConversationSelect(conversation)}
                    className={`flex items-center gap-3 p-3 mx-2 my-1 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-gray-50'
                    }`}
                    data-testid={`conversation-item-${conversation.id}`}
                  >
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {otherParticipant.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-white rounded-full"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {otherParticipant}
                        </h4>
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600 truncate">
                          마지막 메시지...
                        </p>
                        {(conversation.unreadCount || 0) > 0 && (
                          <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}