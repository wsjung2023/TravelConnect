# Tourgether — Replit 작업지시서 (Guardrails T11)
작업명: **T11 — Follow/Following API 블록 분리(레거시 추출 1개 더)**  
목적: 거대 파일 `server/routes.ts`에서 **Follow/Following API(팔로우/언팔/상태/목록/카운트)** 블록을 **그대로** 외부 모듈로 옮겨, 파일 크기를 줄이고(Guardrails: 250~400 초과 시 분리), 이후 분리 작업을 반복 가능하게 만든다.

> ⚠️ 원칙: **동작 변경 0** (Copy/Paste Move Only)

---

## 1) 이번 티켓 변경 파일(정확히 2개)
- 추가: `server/routes/follow.legacy.ts`
- 수정: `server/routes.ts`

---

## 2) Replit Agent에게 줄 “실행 지시문”(그대로 복붙)
```text
[SAFE PATCH MODE - T11 Extract Follow/Following Legacy Block]

Goal:
- Extract the Follow/Following API block from server/routes.ts into a new module:
  server/routes/follow.legacy.ts
- The new module should export:
  registerLegacyFollowRoutes(app, { storage, authenticateToken })
- In server/routes.ts, replace the extracted block with a single function call.
- Do NOT change any route paths, messages, logic, or behavior.

Allowed files (ONLY):
- server/routes/follow.legacy.ts
- server/routes.ts

Forbidden:
- No other files touched.
- No refactors, no formatting, no reordering unrelated code.
- No dependency/config changes.

Output:
- Provide a unified diff patch ONLY.

Stop rules:
- If you cannot find the exact block markers, STOP and ask me.

Verify:
- I will run npm run dev and test:
  POST   /api/users/:id/follow
  DELETE /api/users/:id/follow
  GET    /api/users/:id/following-status
  GET    /api/users/:id/followers
  GET    /api/users/:id/following
  GET    /api/users/:id/follow-counts
```

---

## 3) 수동 적용(Agent 없이 직접 수정할 때)

### A) 새 파일 생성: `server/routes/follow.legacy.ts`
아래 내용을 **그대로** 붙여넣기.

```ts
// Legacy follow/following routes extracted from server/routes.ts to reduce file size.
import type { Express } from 'express';

export function registerLegacyFollowRoutes(
  app: Express,
  deps: {
    storage: any;
    authenticateToken: any;
  }
) {
  const { storage, authenticateToken } = deps;

  // Follow/Following API
  app.post('/api/users/:id/follow', authenticateToken, async (req: any, res: any) => {
    try {
      const followingId = req.params.id;
      const followerId = req.user?.id;

      if (!followerId || !followingId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
      }

      if (followerId === followingId) {
        return res.status(400).json({ message: '자기 자신을 팔로우할 수 없습니다' });
      }

      // 이미 팔로우 중인지 확인
      const isAlreadyFollowing = await storage.isFollowing(followerId, followingId);
      if (isAlreadyFollowing) {
        return res.status(400).json({ message: '이미 팔로우 중입니다' });
      }

      await storage.followUser(followerId, followingId);

      // 팔로우 알림 생성
      const follower = await storage.getUser(followerId);
      if (follower) {
        const notification = await storage.createNotification({
          userId: followingId,
          type: 'follow',
          title: '새로운 팔로워',
          message: `${follower.firstName || follower.email}님이 회원님을 팔로우하기 시작했습니다.`,
          relatedUserId: followerId,
        });

        // 실시간 알림 전송
        const sendNotificationToUser = (app as any).sendNotificationToUser;
        if (sendNotificationToUser) {
          sendNotificationToUser(followingId, notification);
        }
      }

      res.status(200).json({ message: '팔로우 완료' });
    } catch (error) {
      console.error('Follow error:', error);
      res.status(500).json({ message: '팔로우 중 오류가 발생했습니다' });
    }
  });

  app.delete('/api/users/:id/follow', authenticateToken, async (req: any, res: any) => {
    try {
      const followingId = req.params.id;
      const followerId = req.user?.id;

      if (!followerId || !followingId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
      }

      await storage.unfollowUser(followerId, followingId);
      res.status(200).json({ message: '언팔로우 완료' });
    } catch (error) {
      console.error('Unfollow error:', error);
      res.status(500).json({ message: '언팔로우 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/following-status', authenticateToken, async (req: any, res: any) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user?.id;

      if (!currentUserId || !targetUserId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
      }

      const isFollowing = await storage.isFollowing(currentUserId, targetUserId);
      res.json({ isFollowing });
    } catch (error) {
      console.error('Following status error:', error);
      res.status(500).json({ message: '팔로우 상태 조회 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/followers', async (req: any, res: any) => {
    try {
      const userId = req.params.id;
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({ message: '팔로워 조회 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/following', async (req: any, res: any) => {
    try {
      const userId = req.params.id;
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({ message: '팔로잉 조회 중 오류가 발생했습니다' });
    }
  });

  app.get('/api/users/:id/follow-counts', async (req: any, res: any) => {
    try {
      const userId = req.params.id;
      const counts = await storage.getFollowCounts(userId);
      res.json(counts);
    } catch (error) {
      console.error('Get follow counts error:', error);
      res.status(500).json({ message: '팔로우 개수 조회 중 오류가 발생했습니다' });
    }
  });
}
```

---

### B) `server/routes.ts` 수정
#### B-1) import 추가
`server/routes.ts` 상단 import 구간에 아래 1줄 추가:

```ts
import { registerLegacyFollowRoutes } from './routes/follow.legacy';
```

#### B-2) 기존 Follow/Following 블록 제거 + 함수 호출로 대체
`server/routes.ts` 안에서 아래 **시작/끝 마커**로 블록을 찾는다:

- 시작 마커: `// Follow/Following API`
- 끝 마커: 바로 다음 주석 `// MiniMeet 관련 API` **직전까지**

그 블록을 **통째로 삭제**하고, 같은 위치에 아래 1줄을 넣는다:

```ts
  registerLegacyFollowRoutes(app, { storage, authenticateToken });
```

---

## 4) 검증(필수)
1) 서버 실행
```bash
npm run dev
```

2) UI 또는 API로 팔로우 동작 확인  
- 팔로우 버튼 동작
- 팔로워/팔로잉 숫자 조회
- 팔로우 상태 조회

(선택) curl 예시:
```bash
# 토큰은 demo-login 등으로 확보 후 대체
curl -s -X POST http://127.0.0.1:5000/api/users/<TARGET_ID>/follow \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 5) 완료 기준
- `server/routes.ts`에서 Follow/Following 블록이 사라지고, 함수 호출로 대체됨
- 기능(팔로우/언팔/목록/카운트/상태)이 기존과 동일하게 동작

---

## 6) 롤백(문제 생기면)
- `server/routes/follow.legacy.ts` 삭제
- `server/routes.ts`에서 import/call 제거
- 삭제했던 Follow/Following 블록을 원복(Git 사용 시 revert/reset)

---

## 7) 메모 기록(권장)
`docs/AI_MEMO.md`에 아래를 기록:
- T11: Follow/Following 블록을 `follow.legacy.ts`로 추출(동작 변경 없음)
