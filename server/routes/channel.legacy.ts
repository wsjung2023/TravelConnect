// @ts-nocheck
// 채널·메시지 라우터 — 그룹 채널 생성/목록/상세/초대/나가기, 채널 내 메시지 송수신, 읽음 처리, WebSocket 연동 관련 REST 엔드포인트를 담당한다.
import type { Express } from 'express';

export function registerLegacyChannelRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid?: any }
) {
  const { storage, authenticateToken, authenticateHybrid = authenticateToken } = deps;

  // =================== 채널 시스템 API 엔드포인트 ===================
  
  // 채널 생성 (그룹 채팅, 토픽 채널)
  app.post('/api/channels', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { type = 'group', name, description, isPrivate = false } = req.body;
      
      if (!['dm', 'group', 'topic'].includes(type)) {
        return res.status(400).json({ message: '유효하지 않은 채널 타입입니다' });
      }

      const channel = await storage.createChannel({
        type,
        name,
        description,
        ownerId: userId,
        isPrivate,
      });

      res.status(201).json(channel);
    } catch (error) {
      console.error('채널 생성 오류:', error);
      res.status(500).json({ message: '채널 생성 중 오류가 발생했습니다' });
    }
  });

  // 사용자의 채널 목록 조회
  app.get('/api/channels', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const aiConciergeChannel = await storage.getOrCreateAIConciergeChannel(userId);
      const userChannels = await storage.getChannelsByUser(userId);
      
      const allChannels = [aiConciergeChannel, ...userChannels.filter(ch => ch.id !== aiConciergeChannel.id)];
      
      res.json(allChannels);
    } catch (error) {
      console.error('채널 목록 조회 오류:', error);
      res.status(500).json({ message: '채널 목록 조회 중 오류가 발생했습니다' });
    }
  });

  // 특정 채널 정보 조회
  app.get('/api/channels/:id', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const channel = await storage.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({ message: '채널을 찾을 수 없습니다' });
      }

      // 채널 멤버인지 확인
      const members = await storage.getChannelMembers(channelId);
      const isMember = members.some(m => m.userId === userId);
      
      if (!isMember && channel.isPrivate) {
        return res.status(403).json({ message: '이 채널에 접근할 권한이 없습니다' });
      }

      res.json({ ...channel, members });
    } catch (error) {
      console.error('채널 조회 오류:', error);
      res.status(500).json({ message: '채널 조회 중 오류가 발생했습니다' });
    }
  });

  // 채널에 멤버 추가
  app.post('/api/channels/:id/members', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const { targetUserId, role = 'member' } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // 채널 존재 확인
      const channel = await storage.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({ message: '채널을 찾을 수 없습니다' });
      }

      // 권한 확인 (채널 소유자 또는 관리자만)
      const members = await storage.getChannelMembers(channelId);
      const requesterMember = members.find(m => m.userId === userId);
      
      if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
        return res.status(403).json({ message: '멤버를 추가할 권한이 없습니다' });
      }

      const newMember = await storage.addChannelMember(channelId, targetUserId, role);
      res.status(201).json(newMember);
    } catch (error) {
      console.error('채널 멤버 추가 오류:', error);
      res.status(500).json({ message: '채널 멤버 추가 중 오류가 발생했습니다' });
    }
  });

  // 채널에서 멤버 제거
  app.delete('/api/channels/:id/members/:userId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const targetUserId = req.params.userId;
      
      if (!requesterId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // 채널 존재 확인
      const channel = await storage.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({ message: '채널을 찾을 수 없습니다' });
      }

      // 자신을 나가는 경우는 항상 허용
      if (requesterId !== targetUserId) {
        // 다른 사람을 내보내는 경우 권한 확인
        const members = await storage.getChannelMembers(channelId);
        const requesterMember = members.find(m => m.userId === requesterId);
        
        if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
          return res.status(403).json({ message: '멤버를 제거할 권한이 없습니다' });
        }
      }

      await storage.removeChannelMember(channelId, targetUserId!);
      res.json({ message: '멤버가 제거되었습니다' });
    } catch (error) {
      console.error('채널 멤버 제거 오류:', error);
      res.status(500).json({ message: '채널 멤버 제거 중 오류가 발생했습니다' });
    }
  });

  // 채널 메시지 목록 조회
  app.get('/api/channels/:id/messages', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // 채널 멤버인지 확인
      const members = await storage.getChannelMembers(channelId);
      const isMember = members.some(m => m.userId === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: '이 채널의 메시지를 볼 권한이 없습니다' });
      }

      const messages = await storage.getMessagesByChannel(channelId, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error('채널 메시지 조회 오류:', error);
      res.status(500).json({ message: '채널 메시지 조회 중 오류가 발생했습니다' });
    }
  });

  // 채널에 메시지 전송
  app.post('/api/channels/:id/messages', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const channelId = parseInt(req.params.id!);
      const { content, messageType = 'text', parentMessageId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: '메시지 내용이 필요합니다' });
      }

      // 채널 멤버인지 확인
      const members = await storage.getChannelMembers(channelId);
      const isMember = members.some(m => m.userId === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: '이 채널에 메시지를 보낼 권한이 없습니다' });
      }

      const message = await storage.createChannelMessage({
        channelId,
        senderId: userId,
        content: content.trim(),
        messageType,
        parentMessageId,
      } as any);

      // WebSocket으로 실시간 전송
      const wsClients = (app as any).wsClients as Map<string, any>;
      if (wsClients) {
        for (const member of members) {
          if (member.userId !== userId) { // 발신자 제외
            const memberWs = wsClients.get(member.userId);
            if (memberWs && memberWs.readyState === 1) { // WebSocket.OPEN
              memberWs.send(JSON.stringify({
                type: 'channel_message',
                channelId,
                message,
              }));
            }
          }
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error('채널 메시지 전송 오류:', error);
      res.status(500).json({ message: '채널 메시지 전송 중 오류가 발생했습니다' });
    }
  });

  // 스레드 메시지 조회
  app.get('/api/messages/:id/thread', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const parentMessageId = parseInt(req.params.id!);
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const threadMessages = await storage.getThreadMessages(parentMessageId);
      res.json(threadMessages);
    } catch (error) {
      console.error('스레드 메시지 조회 오류:', error);
      res.status(500).json({ message: '스레드 메시지 조회 중 오류가 발생했습니다' });
    }
  });

  // 테스트용 JWT 토큰 생성 엔드포인트 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/test/create-token', async (req, res) => {
      try {
        const { sub, email, first_name, last_name, role, userType } = req.body;
        
        if (!sub || !email) {
          return res.status(400).json({ message: 'sub and email are required' });
        }

        // 테스트 사용자 생성/업데이트
        const userId = sub;
        const userRole = (role === 'admin') ? 'admin' : 'user';
        const validUserTypes = ['traveler', 'influencer', 'host'];
        const resolvedUserType = validUserTypes.includes(userType) ? userType : 'traveler';
        
        const testUser = {
          id: userId,
          email,
          firstName: first_name || 'Test',
          lastName: last_name || 'User', 
          role: userRole as 'admin' | 'user',
          userType: resolvedUserType as 'traveler' | 'influencer' | 'host',
          profileImageUrl: null,
          bio: null,
          location: null,
          isProfileOpen: true,
        };

        await storage.upsertUser(testUser);

        // JWT 토큰 생성
        const token = generateToken({
          id: userId,
          email,
          role: userRole,
        });

        console.log(`[TEST TOKEN] Created ${userRole} token for ${email} (${userId})`);

        res.json({ 
          token,
          user: testUser,
          message: `Test ${userRole} token created successfully` 
        });
      } catch (error) {
        console.error('Error creating test token:', error);
        res.status(500).json({ message: 'Failed to create test token' });
      }
    });
  }
}
