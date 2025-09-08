import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

// 데이터베이스 스키마와 일치하도록 수정된 Notification 인터페이스
export interface Notification {
  id: number;
  userId: string;
  type: 'feed' | 'help' | 'chat' | 'follow' | 'reaction' | 'promotion';
  title: string;
  message: string;
  location?: string;
  isRead: boolean;
  relatedUserId?: string;
  relatedPostId?: number;
  relatedConversationId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCounts {
  feed: number;
  help: number;
  chat: number;
  follow: number;
  reaction: number;
  promotion: number;
  total: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  // 데이터베이스에서 알림 조회
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  });

  // 알림 개수 계산 (읽지 않은 알림만)
  const counts: NotificationCounts = {
    feed: notifications.filter(n => !n.isRead && n.type === 'feed').length,
    help: notifications.filter(n => !n.isRead && n.type === 'help').length,
    chat: notifications.filter(n => !n.isRead && n.type === 'chat').length,
    follow: notifications.filter(n => !n.isRead && n.type === 'follow').length,
    reaction: notifications.filter(n => !n.isRead && n.type === 'reaction').length,
    promotion: notifications.filter(n => !n.isRead && n.type === 'promotion').length,
    total: notifications.filter(n => !n.isRead).length,
  };

  const hasNewNotifications = counts.total > 0;

  // WebSocket 연결 및 실시간 알림 수신
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
      // 사용자 인증
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'notification') {
          console.log('실시간 알림 수신:', data.notification);
          // 알림 목록 새로고침
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        }
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 해제');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, queryClient]);

  // 알림을 읽음으로 표시하는 뮤테이션
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // 모든 알림을 읽음으로 표시하는 뮤테이션
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/notifications/read-all', {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // 알림 삭제 뮤테이션
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAsRead = useCallback((notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const clearNotifications = useCallback(() => {
    // 모든 알림을 삭제하려면 각각 삭제해야 함
    notifications.forEach(notification => {
      deleteNotificationMutation.mutate(notification.id);
    });
  }, [notifications, deleteNotificationMutation]);

  return {
    notifications,
    counts,
    hasNewNotifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}

// 알림 생성을 위한 유틸리티 함수
export async function createNotification({
  userId,
  type,
  title,
  message,
  location,
  relatedUserId,
  relatedPostId,
  relatedConversationId,
}: {
  userId: string;
  type: 'feed' | 'help' | 'chat' | 'follow' | 'reaction' | 'promotion';
  title: string;
  message: string;
  location?: string;
  relatedUserId?: string;
  relatedPostId?: number;
  relatedConversationId?: number;
}) {
  return await apiRequest('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      type,
      title,
      message,
      location,
      relatedUserId,
      relatedPostId,
      relatedConversationId,
    }),
  });
}