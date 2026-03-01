// 알림 라우터 — 로그인 유저의 알림 목록 조회, 단건/전체 읽음 처리, 알림 삭제 엔드포인트를 담당한다.
import type { Express } from 'express';

export function registerLegacyNotificationRoutes(
  app: Express,
  deps: {
    storage: any;
    authenticateToken: any;
    insertNotificationSchema: any;
  }
) {
  const { storage, authenticateToken, insertNotificationSchema } = deps;

  // Notification routes (legacy)
  app.get('/api/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Failed to create notification' });
    }
  });

  app.patch('/api/notifications/:id/read', authenticateToken, async (req: any, res: any) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/read-all', authenticateToken, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  app.delete('/api/notifications/:id', authenticateToken, async (req: any, res: any) => {
    try {
      const notificationId = parseInt(req.params.id);
      const success = await storage.deleteNotification(notificationId);
      if (success) {
        res.json({ message: 'Notification deleted' });
      } else {
        res.status(404).json({ message: 'Notification not found' });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });
}
