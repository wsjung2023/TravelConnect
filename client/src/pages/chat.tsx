import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChatWindow from "@/components/ChatWindow";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    enabled: !!selectedConversation,
  });

  const currentUserId = "current-user"; // This should come from auth

  const handleSendMessage = (content: string) => {
    // This would send the message via WebSocket or API
    console.log("Sending message:", content);
  };

  const formatLastMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

    if (messageDay.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } else {
      return messageDate.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const filteredConversations = conversations.filter((conv: Conversation) => {
    const otherParticipant = conv.participant1Id === currentUserId 
      ? conv.participant2Id 
      : conv.participant1Id;
    return otherParticipant.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (selectedConversation) {
    return (
      <div className="h-full">
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUserId={currentUserId}
        />
      </div>
    );
  }

  return (
    <div className="mobile-content bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">채팅</h2>
          <Button variant="ghost" size="sm" className="p-2">
            <Edit size={20} />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="채팅방 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full bg-gray-100 border-0"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">채팅방이 없어요</h3>
            <p className="text-gray-500 text-sm">호스트와 대화를 시작해보세요!</p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation: Conversation) => {
              const otherParticipant = conversation.participant1Id === currentUserId 
                ? conversation.participant2Id 
                : conversation.participant1Id;
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className="flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>{otherParticipant.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 truncate">{otherParticipant}</h4>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-gray-500">
                          {formatLastMessageTime(conversation.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      마지막 메시지 내용이 여기에 표시됩니다...
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}