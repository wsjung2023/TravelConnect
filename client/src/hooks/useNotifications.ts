// 알림 훅 — 알림 목록 조회, 읽음 처리, 삭제 뮤테이션을 제공하는 훅.
// WebSocket 수신은 공유 WebSocketContext를 통해 처리 (독립 연결 생성 제거).
import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

// 데이터베이스 스키마와 일치하도록 수정된 Notification 인터페이스
export interface Notification {
  id: number;
  userId: string;
  type: 'feed' | 'help' | 'chat' | 'follow' | 'reaction' | 'promotion' | 'comment' | 'timeline_followed';
  title: string;
  message: string;
  location?: string;
  isRead: boolean;
  relatedUserId?: string;
  relatedPostId?: number;
  relatedConversationId?: number;
  relatedTimelineId?: number;
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
  comment: number;
  timeline_followed: number;
  total: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe, unsubscribe } = useWebSocketContext();

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
    comment: notifications.filter(n => !n.isRead && n.type === 'comment').length,
    timeline_followed: notifications.filter(n => !n.isRead && n.type === 'timeline_followed').length,
    total: notifications.filter(n => !n.isRead).length,
  };

  const hasNewNotifications = counts.total > 0;

  // 공유 WS 컨텍스트에서 notification 이벤트 구독
  useEffect(() => {
    if (!user) return;

    const handleNotification = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });

      const notification = data.notification;
      if (notification && (notification.type === 'reaction' || notification.type === 'comment')) {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        if (notification.relatedPostId) {
          queryClient.invalidateQueries({ queryKey: ['/api/posts', notification.relatedPostId] });
        }
      }
    };

    subscribe('notification', handleNotification);
    return () => { unsubscribe('notification', handleNotification); };
  }, [user, queryClient, subscribe, unsubscribe]);

  // 알림을 읽음으로 표시하는 뮤테이션
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await api(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // 모든 알림을 읽음으로 표시하는 뮤테이션
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api('/api/notifications/read-all', { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // 알림 삭제 뮤테이션
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await api(`/api/notifications/${notificationId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAsRead = useCallback(
    (notificationId: number) => { markAsReadMutation.mutate(notificationId); },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(
    () => { markAllAsReadMutation.mutate(); },
    [markAllAsReadMutation]
  );

  const clearNotifications = useCallback(() => {
    notifications.forEach(n => deleteNotificationMutation.mutate(n.id));
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
  return await api('/api/notifications', {
    method: 'POST',
    body: {
      userId,
      type,
      title,
      message,
      location,
      relatedUserId,
      relatedPostId,
      relatedConversationId,
    },
  });
}
