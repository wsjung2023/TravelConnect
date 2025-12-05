/**
 * ============================================
 * 채팅 라우터 (Chat Router)
 * ============================================
 * 
 * 이 모듈은 실시간 채팅 관련 API를 관리합니다.
 * 
 * 주요 기능:
 * - 1:1 대화(Conversation) 관리
 * - 그룹 채널(Channel) 관리
 * - 메시지 전송 및 조회
 * - 스레드(Thread) 답글
 * - 메시지 번역 (Google Translate 연동)
 * 
 * 채널 유형:
 * - direct: 1:1 대화
 * - group: 그룹 채팅
 * - support: 고객 지원 채널
 * 
 * 실시간 통신:
 * - WebSocket으로 실시간 메시지 전달
 * - 읽음 상태, 타이핑 표시 등 실시간 업데이트
 * 
 * 번역:
 * - Google Translate API 연동
 * - 사용량은 플랜에 따라 제한됨
 */

import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  AuthRequest,
} from '../auth';
import { CreateConversationSchema, SendMessageSchema } from '@shared/api/schema';
import { checkAiUsage } from '../middleware/checkAiUsage';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
});

// 스키마 검증 미들웨어
function validateSchema(schema: any) {
  return (req: any, res: Response, next: Function) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.errors,
        });
      }
      req.validatedData = result.data;
      next();
    } catch (error) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  };
}

// ============================================
// 대화 목록 조회
// ============================================
// GET /api/conversations
// 현재 사용자의 모든 1:1 대화를 조회합니다.
router.get('/conversations', authenticateToken, apiLimiter, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // getConversationsByUser 메서드 사용
    const conversations = await storage.getConversationsByUser(req.user.id);
    res.json(conversations);
  } catch (error) {
    console.error('대화 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ============================================
// 대화 상세 조회
// ============================================
// GET /api/conversations/:id
// 특정 대화의 상세 정보와 메시지를 조회합니다.
router.get('/conversations/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = parseInt(req.params.id);
    
    // 사용자의 대화 목록에서 해당 대화 조회
    const conversations = await storage.getConversationsByUser(req.user.id);
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // 대화의 메시지도 함께 조회
    const conversationMessages = await storage.getMessagesByConversation(conversationId);
    res.json({ ...conversation, messages: conversationMessages });
  } catch (error) {
    console.error('대화 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// ============================================
// 대화 생성
// ============================================
// POST /api/conversations
// 새 1:1 대화를 생성합니다.
// 이미 존재하는 대화가 있으면 해당 대화를 반환합니다.
router.post('/conversations', authenticateToken, apiLimiter, validateSchema(CreateConversationSchema), async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { participantId } = req.validatedData;

    // 자기 자신과의 대화 방지
    if (participantId === req.user.id) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // getOrCreateConversation 메서드 사용 (기존 대화가 있으면 반환, 없으면 생성)
    const conversation = await storage.getOrCreateConversation(req.user.id, participantId);

    res.status(201).json(conversation);
  } catch (error) {
    console.error('대화 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// ============================================
// 채널 목록 조회
// ============================================
// GET /api/channels
// 현재 사용자가 참여한 모든 채널을 조회합니다.
router.get('/channels', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // getChannelsByUser 메서드 사용
    const channels = await storage.getChannelsByUser(req.user.id);
    res.json(channels);
  } catch (error) {
    console.error('채널 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// ============================================
// 채널 상세 조회
// ============================================
// GET /api/channels/:id
// 특정 채널의 상세 정보를 조회합니다.
router.get('/channels/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.id);
    // getChannelById 메서드 사용
    const channel = await storage.getChannelById(channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // 채널 멤버인지 확인 (파라미터 순서: userId, channelId)
    const isMember = await storage.isChannelMember(req.user.id, channelId);
    if (!isMember && channel.isPrivate) {
      return res.status(403).json({ error: 'Not authorized to view this channel' });
    }

    res.json(channel);
  } catch (error) {
    console.error('채널 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// ============================================
// 채널 생성
// ============================================
// POST /api/channels
// 새 그룹 채널을 생성합니다.
router.post('/channels', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, isPrivate, memberIds } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const channel = await storage.createChannel({
      name: name.trim(),
      description: description || null,
      ownerId: req.user.id,
      isPrivate: isPrivate || false,
      type: 'group',
    });

    // 생성자를 멤버로 추가
    await storage.addChannelMember(channel.id, req.user.id, 'owner');

    // 추가 멤버 초대
    if (memberIds && Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        await storage.addChannelMember(channel.id, memberId, 'member');
      }
    }

    res.status(201).json(channel);
  } catch (error) {
    console.error('채널 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// ============================================
// 채널 멤버 추가
// ============================================
// POST /api/channels/:id/members
// 채널에 새 멤버를 추가합니다.
router.post('/channels/:id/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.id);
    const { userId } = req.body;

    // 채널 소유자/관리자 확인 (getChannelById 사용)
    const channel = await storage.getChannelById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // 권한 확인: 채널 소유자만 멤버 추가 가능
    if (channel.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add members' });
    }

    await storage.addChannelMember(channelId, userId, 'member');
    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('채널 멤버 추가 오류:', error);
    res.status(500).json({ error: 'Failed to add channel member' });
  }
});

// ============================================
// 채널 멤버 제거
// ============================================
// DELETE /api/channels/:id/members/:userId
// 채널에서 멤버를 제거합니다.
router.delete('/channels/:id/members/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.id);
    const targetUserId = req.params.userId;

    // 본인 나가기 또는 권한자가 타인 제거
    const channel = await storage.getChannelById(channelId);
    
    if (targetUserId !== req.user.id) {
      // 타인 제거는 채널 소유자만 가능
      if (!channel || channel.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to remove members' });
      }
    }

    await storage.removeChannelMember(channelId, targetUserId);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('채널 멤버 제거 오류:', error);
    res.status(500).json({ error: 'Failed to remove channel member' });
  }
});

// ============================================
// 채널 메시지 목록 조회
// ============================================
// GET /api/channels/:id/messages
// 채널의 메시지 목록을 조회합니다.
// 페이지네이션: before, limit 파라미터 지원
router.get('/channels/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? parseInt(req.query.before as string) : undefined;

    // 채널 멤버 확인 (파라미터 순서: userId, channelId)
    const isMember = await storage.isChannelMember(req.user.id, channelId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a channel member' });
    }

    // getMessagesByChannel 메서드 사용
    const messages = await storage.getMessagesByChannel(channelId, limit, 0);
    res.json(messages);
  } catch (error) {
    console.error('채널 메시지 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch channel messages' });
  }
});

// ============================================
// 채널 메시지 전송
// ============================================
// POST /api/channels/:id/messages
// 채널에 메시지를 전송합니다.
router.post('/channels/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channelId = parseInt(req.params.id);
    const { content, parentMessageId, messageType } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // 채널 멤버 확인 (파라미터 순서: userId, channelId)
    const isMember = await storage.isChannelMember(req.user.id, channelId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a channel member' });
    }

    const message = await storage.createChannelMessage({
      channelId,
      senderId: req.user.id,
      content: content.trim(),
      parentMessageId: parentMessageId || null,
      messageType: messageType || 'text',
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================
// 스레드 메시지 조회
// ============================================
// GET /api/messages/:id/thread
// 특정 메시지의 스레드(답글)를 조회합니다.
router.get('/messages/:id/thread', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.id);
    const thread = await storage.getMessageThread(messageId);
    res.json(thread);
  } catch (error) {
    console.error('스레드 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// ============================================
// 메시지 번역
// ============================================
// POST /api/messages/:messageId/translate
// 메시지를 지정된 언어로 번역합니다.
// AI 사용량 제한 적용
router.post('/messages/:messageId/translate', authenticateHybrid, checkAiUsage('translation'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = parseInt(req.params.messageId);
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language is required' });
    }

    // 메시지 조회
    const message = await storage.getMessage(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // 번역 실행
    const { translateText, isTranslationEnabled } = await import('../translate');
    
    if (!isTranslationEnabled()) {
      return res.status(503).json({ error: 'Translation service is not available' });
    }

    const translatedText = await translateText(message.content, targetLanguage);

    res.json({
      original: message.content,
      translated: translatedText,
      targetLanguage,
    });
  } catch (error) {
    console.error('메시지 번역 오류:', error);
    res.status(500).json({ error: 'Failed to translate message' });
  }
});

export const chatRouter = router;
