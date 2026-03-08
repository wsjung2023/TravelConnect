// notificationRepository: 알림(Notification) 관련 데이터베이스 작업을 담당하는 리포지토리입니다.
import { db } from '../db';
import { notifications, type Notification, type InsertNotification } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function createNotification(notification: InsertNotification): Promise<Notification> {
  const [newNotification] = await db
    .insert(notifications)
    .values(notification)
    .returning();
  return newNotification!;
}

export async function getNotificationsByUser(userId: string): Promise<Notification[]> {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationAsRead(id: number): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(notifications.userId, userId));
}

export async function deleteNotification(id: number): Promise<boolean> {
  const result = await db
    .delete(notifications)
    .where(eq(notifications.id, id));
  return (result.rowCount ?? 0) > 0;
}
