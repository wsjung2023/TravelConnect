// @ts-nocheck
/**
 * 채팅 및 메시징 저장소 (Chat Repository)
 * 1:1 대화, 채널, 메시지, 번역 관련 DB 접근 로직을 담당한다.
 */
import { db } from '../db';
import { 
  conversations, 
  messages, 
  users, 
  notifications, 
  messageTranslations,
  channels,
  channelMembers,
  type Conversation,
  type Message,
  type InsertMessage,
  type MessageTranslation,
  type InsertMessageTranslation,
  type Channel,
  type InsertChannel,
  type ChannelMember,
  type User
} from '@shared/schema';
import { eq, or, and, desc, asc } from 'drizzle-orm';
import { createNotification } from './notificationRepository';

// 1:1 대화 (Conversations)
export async function getOrCreateConversation(
  participant1Id: string,
  participant2Id: string
): Promise<Conversation> {
  // Look for existing conversation
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      or(
        and(
          eq(conversations.participant1Id, participant1Id),
          eq(conversations.participant2Id, participant2Id)
        ),
        and(
          eq(conversations.participant1Id, participant2Id),
          eq(conversations.participant2Id, participant1Id)
        )
      )
    );

  if (existing) {
    return existing;
  }

  // Create new conversation
  const [newConversation] = await db
    .insert(conversations)
    .values({ participant1Id, participant2Id })
    .returning();

  return newConversation;
}

export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  return await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId)
      )
    )
    .orderBy(desc(conversations.lastMessageAt));
}

// 메시지 (Messages)
export async function createMessage(message: InsertMessage): Promise<Message> {
  const [newMessage] = await db.insert(messages).values(message).returning();

  // Update conversation last message
  await db
    .update(conversations)
    .set({
      lastMessageId: newMessage!.id,
      lastMessageAt: new Date(),
    })
    .where(eq(conversations.id, message.conversationId!));

  // 대화상대에게 알림 생성
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, message.conversationId!))
    .limit(1);

  if (conversation) {
    const recipientId = conversation.participant1Id === message.senderId 
      ? conversation.participant2Id 
      : conversation.participant1Id;

    const [sender] = await db
      .select()
      .from(users)
      .where(eq(users.id, message.senderId!))
      .limit(1);

    await createNotification({
      userId: recipientId,
      type: 'chat',
      title: '새 메시지',
      message: `${sender?.firstName || '익명의 사용자'}님이 메시지를 보냈습니다`,
      relatedUserId: message.senderId,
      relatedConversationId: message.conversationId,
    });
  }

  return newMessage!;
}

export async function getMessagesByConversation(conversationId: number): Promise<Message[]> {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getMessageById(messageId: number): Promise<Message | undefined> {
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  return message;
}

export async function updateMessageLanguage(messageId: number, language: string): Promise<void> {
  await db
    .update(messages)
    .set({ detectedLanguage: language })
    .where(eq(messages.id, messageId));
}

export async function getTranslation(
  messageId: number,
  targetLanguage: string
): Promise<MessageTranslation | undefined> {
  const [translation] = await db
    .select()
    .from(messageTranslations)
    .where(
      and(
        eq(messageTranslations.messageId, messageId),
        eq(messageTranslations.targetLanguage, targetLanguage)
      )
    )
    .limit(1);
  return translation;
}

export async function createTranslation(
  translation: InsertMessageTranslation
): Promise<MessageTranslation> {
  const [newTranslation] = await db
    .insert(messageTranslations)
    .values(translation)
    .returning();
  return newTranslation!;
}

export async function updateUserPreferredLanguage(userId: string, language: string): Promise<void> {
  await db
    .update(users)
    .set({ preferredLanguage: language })
    .where(eq(users.id, userId));
}

// 채널 (Channels - 그룹 채팅)
export async function createChannel(channel: InsertChannel): Promise<Channel> {
  // 실제 존재하는 데이터베이스 컬럼만 사용하여 삽입
  const existingColumns = {
    type: channel.type || 'dm',
    name: channel.name,
    description: channel.description,
    ownerId: channel.ownerId,
    isPrivate: channel.isPrivate || false,
    lastMessageId: channel.lastMessageId,
    lastMessageAt: channel.lastMessageAt,
  };
  
  const [newChannel] = await db.insert(channels).values(existingColumns).returning();
  
  // 채널 생성자를 owner로 자동 추가
  if (channel.ownerId) {
    await addChannelMember(newChannel.id, channel.ownerId, 'owner');
  }
  
  return newChannel;
}

export async function getChannelsByUser(userId: string): Promise<Channel[]> {
  const userChannels = await db
    .select({
      id: channels.id,
      type: channels.type,
      name: channels.name,
      description: channels.description,
      ownerId: channels.ownerId,
      isPrivate: channels.isPrivate,
      lastMessageId: channels.lastMessageId,
      lastMessageAt: channels.lastMessageAt,
      createdAt: channels.createdAt,
      updatedAt: channels.updatedAt,
    })
    .from(channels)
    .innerJoin(channelMembers, eq(channels.id, channelMembers.channelId))
    .where(eq(channelMembers.userId, userId))
    .orderBy(desc(channels.lastMessageAt));

  return userChannels;
}

export async function getChannelById(id: number): Promise<Channel | undefined> {
  const [channel] = await db.select().from(channels).where(eq(channels.id, id));
  return channel;
}

export async function addChannelMember(channelId: number, userId: string, role: string = 'member'): Promise<ChannelMember> {
  const [member] = await db
    .insert(channelMembers)
    .values({ channelId, userId, role })
    .returning();
  return member;
}

export async function removeChannelMember(channelId: number, userId: string): Promise<void> {
  await db
    .delete(channelMembers)
    .where(
      and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      )
    );
}

export async function getChannelMembers(channelId: number): Promise<(ChannelMember & { user: User })[]> {
  const members = await db
    .select({
      id: channelMembers.id,
      channelId: channelMembers.channelId,
      userId: channelMembers.userId,
      role: channelMembers.role,
      joinedAt: channelMembers.joinedAt,
      lastReadAt: channelMembers.lastReadAt,
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        location: users.location,
        role: users.role,
        isHost: users.isHost,
        authProvider: users.authProvider,
        openToMeet: users.openToMeet,
        regionCode: users.regionCode,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      },
    })
    .from(channelMembers)
    .innerJoin(users, eq(channelMembers.userId, users.id))
    .where(eq(channelMembers.channelId, channelId));

  return members.map((m) => ({
    id: m.id,
    channelId: m.channelId,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    lastReadAt: m.lastReadAt,
    user: m.user as User,
  }));
}

export async function isChannelMember(userId: string, channelId: number): Promise<boolean> {
  const member = await db
    .select()
    .from(channelMembers)
    .where(
      and(
        eq(channelMembers.userId, userId),
        eq(channelMembers.channelId, channelId)
      )
    )
    .limit(1);
  
  return member.length > 0;
}

// 채널 메시지
export async function createChannelMessage(message: Omit<InsertMessage, 'conversationId'> & { channelId: number }): Promise<Message> {
  const [newMessage] = await db.insert(messages).values(message).returning();
  
  // 채널의 마지막 메시지 정보 업데이트
  await db
    .update(channels)
    .set({
      lastMessageId: newMessage.id,
      lastMessageAt: newMessage.createdAt,
      updatedAt: new Date(),
    })
    .where(eq(channels.id, message.channelId));

  return newMessage;
}

export async function getMessagesByChannel(channelId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
  const channelMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  return channelMessages.reverse(); // 최신 메시지가 아래에 오도록
}

export async function getThreadMessages(parentMessageId: number): Promise<Message[]> {
  const threadMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.parentMessageId, parentMessageId))
    .orderBy(asc(messages.createdAt));

  return threadMessages;
}

// AI Concierge 채널
export async function getOrCreateAIConciergeChannel(userId: string): Promise<Channel> {
  const existingChannels = await db
    .select()
    .from(channels)
    .innerJoin(channelMembers, eq(channels.id, channelMembers.channelId))
    .where(
      and(
        eq(channels.type, 'topic'),
        eq(channels.name, 'AI Concierge'),
        eq(channelMembers.userId, userId)
      )
    )
    .limit(1);

  if (existingChannels.length > 0) {
    return existingChannels[0].channels;
  }

  const [newChannel] = await db
    .insert(channels)
    .values({
      type: 'topic',
      name: 'AI Concierge',
      description: 'Your personal travel assistant',
      ownerId: null,
      isPrivate: true,
    })
    .returning();

  await db.insert(channelMembers).values({
    channelId: newChannel.id,
    userId: userId,
    role: 'member',
  });

  return newChannel;
}
