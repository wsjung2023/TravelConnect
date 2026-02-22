# Tourgether — Replit 작업지시서 (Guardrails T9)
작업명: **T9 — routes.ts '레거시 블록' 분리(1차): Notifications 블록만 외부 모듈로 이동**  
목적: 거대 파일(`server/routes.ts`)을 Guardrails 규칙에 맞게 "조각"으로 쪼개는 첫 단계.  
중요: **동작 변경 0** — 기존 routes.ts의 notification 코드 그대로를 다른 파일로 옮기기만 한다.

---

## 1) 이번 티켓 변경 파일(정확히 2개)
- 추가: `server/routes/notifications.legacy.ts`
- 수정: `server/routes.ts`

---

## 2) Replit Agent에게 줄 실행 지시문(그대로 복붙)
```text
[SAFE PATCH MODE - T9 Extract Notifications Legacy Block]

Goal:
- Extract the existing inline notification routes from server/routes.ts into a new module:
  server/routes/notifications.legacy.ts
- The new module should export function:
  registerLegacyNotificationRoutes(app, { storage, authenticateToken, insertNotificationSchema })
- In server/routes.ts, replace the extracted block with one function call.
- Do NOT change the logic/behavior of routes.

Allowed files (ONLY):
- server/routes/notifications.legacy.ts
- server/routes.ts

Forbidden:
- No other files touched.
- No refactors or behavior changes.
- Keep patch minimal (copy-paste move only).

Output:
- Unified diff only.

Verify:
- I will run npm run dev and open notifications UI, and hit:
  GET /api/notifications
  PATCH /api/notifications/read-all
```

---

## 3) 수동 적용(직접)
### A) 새 파일 생성: `server/routes/notifications.legacy.ts`
내용(그대로 복붙):

```ts
// Legacy notification routes extracted from server/routes.ts to reduce file size.
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
```

### B) `server/routes.ts` 수정
1) 상단 import에 추가:
```ts
import { registerLegacyNotificationRoutes } from './routes/notifications.legacy';
```

2) `registerRoutes(app)` 내부에서, **기존 Notification routes 블록(주석: `// Notification routes`) 전체를 삭제**하고,
그 자리에 아래 1줄을 넣는다:

```ts
  registerLegacyNotificationRoutes(app, { storage, authenticateToken, insertNotificationSchema });
```

> 정확한 위치 추천: 기존 `// Notification routes` 블록이 있던 자리에 그대로.

---

## 4) 검증
```bash
npm run dev
```
- 알림 목록 조회가 정상인지
- 읽음 처리/전체 읽음/삭제가 정상인지

---

## 5) 완료 기준
- routes.ts에서 Notification routes 블록이 사라지고, 함수 호출로 대체됨
- 동작 동일

---

## 6) 롤백
- `server/routes/notifications.legacy.ts` 삭제
- routes.ts에서 import/call 제거하고 원래 블록 복원
