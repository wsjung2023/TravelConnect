// 팔로우 라우터 — 유저 팔로우/언팔로우, 팔로워·팔로잉 목록 조회, 팔로우 수 카운트, 팔로우 상태 확인 엔드포인트를 담당한다.
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
