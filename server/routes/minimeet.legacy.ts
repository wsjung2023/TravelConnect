// MiniMeet 라우터 — 짧은 만남 요청(MiniMeet) 생성·조회·참가·취소, 근처 MiniMeet 목록 조회 엔드포인트를 담당한다.
import type { Express } from 'express';

export function registerLegacyMiniMeetRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; apiLimiter: any; validateSchema: any; insertMiniMeetSchema: any; CreateMiniMeetSchema: any }
) {
  const { storage, authenticateToken, apiLimiter, validateSchema, insertMiniMeetSchema, CreateMiniMeetSchema } = deps;

  // MiniMeet 관련 API
  // 모임 생성 (별칭: /api/meets)
  const createMeetHandler = async (req: any, res: any) => {
    try {
      const userId = req.user!.id;
      
      const meetData = {
        ...req.validatedData,
        latitude: req.validatedData.latitude.toString(),
        longitude: req.validatedData.longitude.toString(),
        hostId: userId,
        startAt: new Date(req.validatedData.startAt),
      };

      const validatedData = insertMiniMeetSchema.parse(meetData);
      const miniMeet = await storage.createMiniMeet(validatedData);

      // 생성된 모임 정보와 호스트 정보 함께 반환
      const meetWithHost = await storage.getMiniMeetById(miniMeet.id);
      
      res.status(201).json(meetWithHost);
    } catch (error) {
      console.error('모임 생성 오류:', error);
      res.status(400).json({
        message: '모임 생성에 실패했습니다',
        error: (error as Error).message,
      });
    }
  };
  
  app.post('/api/mini-meets', authenticateToken, apiLimiter, validateSchema(CreateMiniMeetSchema), createMeetHandler);
  app.post('/api/meets', authenticateToken, apiLimiter, validateSchema(CreateMiniMeetSchema), createMeetHandler);

  // 근처 모임 조회 (별칭: /api/meets와 /api/meets/nearby)
  const getNearbyMeetsHandler = async (req: any, res: any) => {
    try {
      const { lat, lng, latitude, longitude, radius = 5 } = req.query;
      
      // latitude/longitude 또는 lat/lng 모두 지원 (nullish coalescing 사용)
      const finalLat = lat ?? latitude;
      const finalLng = lng ?? longitude;
      
      if (finalLat == null || finalLng == null) {
        return res.status(400).json({ 
          message: '위도와 경도는 필수 입니다' 
        });
      }

      const latNum = parseFloat(String(finalLat));
      const lngNum = parseFloat(String(finalLng));
      const searchRadius = parseFloat(String(radius));

      if (isNaN(latNum) || isNaN(lngNum) || isNaN(searchRadius)) {
        return res.status(400).json({ 
          message: '올바른 숫자 값을 입력해주세요' 
        });
      }

      const miniMeets = await storage.getMiniMeetsNearby(latNum, lngNum, searchRadius);
      res.json(miniMeets);
    } catch (error) {
      console.error('근처 모임 조회 오류:', error);
      res.status(500).json({ message: '근처 모임 조회에 실패했습니다' });
    }
  };
  
  app.get('/api/mini-meets', getNearbyMeetsHandler);
  app.get('/api/meets', getNearbyMeetsHandler);
  app.get('/api/meets/nearby', getNearbyMeetsHandler);

  // 모임 상세 조회 (별칭: /api/meets/:id)
  const getMeetByIdHandler = async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: '올바른 모임 ID를 입력해주세요' });
      }

      const miniMeet = await storage.getMiniMeetById(id);
      
      if (!miniMeet) {
        return res.status(404).json({ message: '모임을 찾을 수 없습니다' });
      }

      res.json(miniMeet);
    } catch (error) {
      console.error('모임 상세 조회 오류:', error);
      res.status(500).json({ message: '모임 상세 조회에 실패했습니다' });
    }
  };
  
  app.get('/api/mini-meets/:id', getMeetByIdHandler);
  app.get('/api/meets/:id', getMeetByIdHandler);

  // 모임 참여 (별칭: /api/meets/:id/join)
  const joinMeetHandler = async (req: any, res: any) => {
    try {
      const userId = req.user!.id;
      const meetId = parseInt(req.params.id);
      
      if (isNaN(meetId)) {
        return res.status(400).json({ message: '올바른 모임 ID를 입력해주세요' });
      }

      // 모임 존재 여부 확인
      const meet = await storage.getMiniMeetById(meetId);
      if (!meet) {
        return res.status(404).json({ message: '모임을 찾을 수 없습니다' });
      }

      // 자신이 호스트인 모임에는 참여할 수 없음
      if (meet.hostId === userId) {
        return res.status(400).json({ message: '자신이 만든 모임에는 참여할 수 없습니다' });
      }

      // 모임 시간이 이미 지났는지 확인
      if (new Date(meet.startAt) <= new Date()) {
        return res.status(400).json({ message: '이미 시작된 모임입니다' });
      }

      const attendee = await storage.joinMiniMeet(meetId, userId);

      // 호스트에게 참가 알림 생성
      const participant = await storage.getUser(userId);
      if (participant && meet.hostId !== userId) {
        const notification = await storage.createNotification({
          userId: meet.hostId,
          type: 'chat', // MiniMeet 관련이므로 chat 타입 사용
          title: 'MiniMeet 참가자',
          message: `${participant.firstName || participant.email}님이 "${meet.title}" 모임에 참가했습니다.`,
          relatedUserId: userId,
        });

        // 실시간 알림 전송
        const sendNotificationToUser = (app as any).sendNotificationToUser;
        if (sendNotificationToUser) {
          sendNotificationToUser(meet.hostId, notification);
        }
      }

      // 참여 후 최신 모임 정보 반환
      const updatedMeet = await storage.getMiniMeetById(meetId);
      
      res.status(201).json({
        message: '모임 참여가 완료되었습니다',
        attendee,
        meet: updatedMeet
      });
    } catch (error) {
      console.error('모임 참여 오류:', error);
      
      if ((error as Error).message.includes('이미 참여한 모임')) {
        return res.status(400).json({ message: '이미 참여한 모임입니다' });
      }
      
      if ((error as Error).message.includes('정원이 가득')) {
        return res.status(400).json({ message: '모임 정원이 가득 찼습니다' });
      }

      res.status(500).json({ message: '모임 참여에 실패했습니다' });
    }
  };
  
  app.post('/api/mini-meets/:id/join', authenticateToken, apiLimiter, joinMeetHandler);
  app.post('/api/meets/:id/join', authenticateToken, apiLimiter, joinMeetHandler);

  // 모임 나가기 (별칭: /api/meets/:id/leave)
  const leaveMeetHandler = async (req: any, res: any) => {
    try {
      const userId = req.user!.id;
      const meetId = parseInt(req.params.id);
      
      if (isNaN(meetId)) {
        return res.status(400).json({ message: '올바른 모임 ID를 입력해주세요' });
      }

      await storage.leaveMiniMeet(meetId, userId);
      
      res.json({ message: '모임에서 나갔습니다' });
    } catch (error) {
      console.error('모임 나가기 오류:', error);
      res.status(500).json({ message: '모임 나가기에 실패했습니다' });
    }
  };
  
  app.delete('/api/mini-meets/:id/leave', authenticateToken, apiLimiter, leaveMeetHandler);
  app.delete('/api/meets/:id/leave', authenticateToken, apiLimiter, leaveMeetHandler);
}
