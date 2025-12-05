/**
 * ============================================
 * 알림 라우터 (Notification Router)
 * ============================================
 * 
 * 이 모듈은 사용자 알림 관련 API를 관리합니다.
 * 
 * 주요 기능:
 * - 알림 조회
 * - 알림 생성
 * - 읽음 표시
 * - 알림 삭제
 * 
 * 알림 유형 (6가지):
 * - like: 좋아요 알림
 * - comment: 댓글 알림
 * - follow: 팔로우 알림
 * - booking: 예약 관련 알림
 * - message: 메시지 알림
 * - system: 시스템 알림
 * 
 * 비즈니스 규칙:
 * - 본인 알림만 조회/수정/삭제 가능
 * - 읽지 않은 알림 수 실시간 표시
 * - 위치 기반 알림 지원 (근처 이벤트 등)
 */

import { Router, Response } from 'express';
import { storage } from '../storage';
import {
  authenticateToken,
  AuthRequest,
} from '../auth';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// 알림 목록 조회
// ============================================
// GET /api/notifications
// 현재 사용자의 모든 알림을 조회합니다.
// 쿼리 파라미터: unreadOnly, limit, offset
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // getNotificationsByUser 메서드 사용
    let notifications = await storage.getNotificationsByUser(req.user.id);
    
    // 읽지 않은 알림만 필터링 (옵션)
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    // 페이지네이션 적용
    const paginatedNotifications = notifications.slice(offset, offset + limit);
    res.json(paginatedNotifications);
  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ============================================
// 알림 생성 (내부용)
// ============================================
// POST /api/notifications
// 새 알림을 생성합니다.
// 주로 시스템에서 자동으로 생성됨
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, title, message, data, targetUserId } = req.body;

    // 필수 필드 검증
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }

    // 유효한 알림 유형 확인
    const validTypes = ['like', 'comment', 'follow', 'booking', 'message', 'system'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const notification = await storage.createNotification({
      userId: targetUserId || req.user.id,
      type,
      title,
      message: message || null,
      data: data || null,
      senderId: req.user.id,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('알림 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ============================================
// 알림 읽음 표시
// ============================================
// PATCH /api/notifications/:id/read
// 특정 알림을 읽음으로 표시합니다.
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationId = parseInt(req.params.id);
    
    // 사용자의 알림 목록에서 해당 알림 조회
    const notifications = await storage.getNotificationsByUser(req.user.id);
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // 소유권은 이미 getNotificationsByUser로 확인됨
    await storage.markNotificationAsRead(notificationId);
    res.json({ ...notification, read: true });
  } catch (error) {
    console.error('알림 읽음 표시 오류:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ============================================
// 모든 알림 읽음 표시
// ============================================
// PATCH /api/notifications/read-all
// 현재 사용자의 모든 알림을 읽음으로 표시합니다.
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await storage.markAllNotificationsAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('모든 알림 읽음 표시 오류:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// ============================================
// 알림 삭제
// ============================================
// DELETE /api/notifications/:id
// 특정 알림을 삭제합니다.
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationId = parseInt(req.params.id);
    
    // 사용자의 알림 목록에서 해당 알림 조회
    const notifications = await storage.getNotificationsByUser(req.user.id);
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // 소유권은 이미 getNotificationsByUser로 확인됨

    await storage.deleteNotification(notificationId);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// ============================================
// 읽지 않은 알림 수 조회
// ============================================
// GET /api/notifications/unread-count
// 읽지 않은 알림의 개수를 반환합니다.
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const count = await storage.getUnreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('읽지 않은 알림 수 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

export const notificationRouter = router;
