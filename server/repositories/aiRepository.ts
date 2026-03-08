// AI 서비스 저장소 (AI Repository) — CineMap, Mini Concierge, Serendipity Protocol 및 AI 프롬프트 관리 로직을 담당한다.
import {
  db
} from '../db';
import { eq, desc, and, sql, gte, asc, lte } from 'drizzle-orm';
import {
  type Channel,
  type Experience,
  type Post,
  type Slot,
  type MiniPlan,
  type InsertMiniPlan,
  type MiniPlanSpot,
  type InsertMiniPlanSpot,
  type MiniPlanCheckin,
  type InsertMiniPlanCheckin,
  type CinemapJob,
  type InsertCinemapJob,
  type Quest,
  type InsertQuest,
  type QuestParticipant,
  type InsertQuestParticipant,
  type QuestHighlight,
  type InsertQuestHighlight,
  type AiPromptTemplate,
  type InsertAiPromptTemplate,
  type User,
  channels,
  channelMembers,
  experiences,
  posts,
  slots,
  miniPlans,
  miniPlanSpots,
  miniPlanCheckins,
  cinemapJobs,
  quests,
  questParticipants,
  questHighlights,
  aiPromptTemplates,
  users,
} from '@shared/schema';
import { getUser } from './userRepository';

// AI Concierge operations
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

export async function getNearbyExperiences(userId: string, radiusKm: number = 20): Promise<Experience[]> {
  const user = await getUser(userId);
  if (!user || !user.location) {
    return await db
      .select()
      .from(experiences)
      .where(eq(experiences.isActive, true))
      .limit(10);
  }

  const allExperiences = await db
    .select()
    .from(experiences)
    .where(eq(experiences.isActive, true));

  const userLocationStr = user.location.toLowerCase();
  const nearby = allExperiences.filter(exp => {
    if (!exp.location) return false;
    const expLocation = exp.location.toLowerCase();
    return expLocation.includes(userLocationStr) || userLocationStr.includes(expLocation);
  });

  return nearby.slice(0, 10);
}

export async function getRecentPostsByUser(userId: string, limit: number = 5): Promise<Post[]> {
  const recentPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return recentPosts;
}

export async function getUpcomingSlotsByLocation(location: string, limit: number = 5): Promise<Slot[]> {
  const today = new Date().toISOString().split('T')[0];

  const upcomingSlots = await db
    .select()
    .from(slots)
    .where(
      and(
        gte(slots.date, today),
        eq(slots.isAvailable, true)
      )
    )
    .orderBy(asc(slots.date))
    .limit(limit);

  return upcomingSlots;
}

// Mini Concierge operations
export async function createMiniPlan(plan: InsertMiniPlan): Promise<MiniPlan> {
  const [newPlan] = await db.insert(miniPlans).values(plan).returning();
  return newPlan;
}

export async function createMiniPlanSpots(spots: InsertMiniPlanSpot[]): Promise<MiniPlanSpot[]> {
  if (spots.length === 0) return [];
  const newSpots = await db.insert(miniPlanSpots).values(spots).returning();
  return newSpots;
}

export async function getMiniPlanById(id: number): Promise<(MiniPlan & { spots: MiniPlanSpot[] }) | undefined> {
  const plan = await db.query.miniPlans.findFirst({
    where: eq(miniPlans.id, id),
    with: {
      spots: {
        orderBy: asc(miniPlanSpots.orderIndex),
      },
    },
  });
  return plan;
}

export async function getMiniPlansByUser(userId: string, limit: number = 10): Promise<(MiniPlan & { spots: MiniPlanSpot[] })[]> {
  const plans = await db.query.miniPlans.findMany({
    where: eq(miniPlans.userId, userId),
    with: {
      spots: {
        orderBy: asc(miniPlanSpots.orderIndex),
      },
    },
    orderBy: desc(miniPlans.createdAt),
    limit,
  });
  return plans;
}

export async function startMiniPlan(planId: number): Promise<MiniPlan | undefined> {
  const [updated] = await db
    .update(miniPlans)
    .set({ 
      status: 'started',
      startedAt: new Date(),
    })
    .where(eq(miniPlans.id, planId))
    .returning();
  return updated;
}

export async function completeMiniPlan(planId: number): Promise<MiniPlan | undefined> {
  const [updated] = await db
    .update(miniPlans)
    .set({ 
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(miniPlans.id, planId))
    .returning();
  return updated;
}

export async function checkInSpot(checkin: InsertMiniPlanCheckin): Promise<MiniPlanCheckin> {
  const [newCheckin] = await db.insert(miniPlanCheckins).values(checkin).returning();
  return newCheckin;
}

export async function getCheckinsByPlan(planId: number): Promise<MiniPlanCheckin[]> {
  const checkins = await db
    .select()
    .from(miniPlanCheckins)
    .where(eq(miniPlanCheckins.miniPlanId, planId))
    .orderBy(desc(miniPlanCheckins.checkedInAt));
  return checkins;
}

export async function getNearbyPOIs(latitude: number, longitude: number, radiusM: number = 2000): Promise<any[]> {
  return [];
}

// CineMap operations
export async function createCinemapJob(job: InsertCinemapJob): Promise<CinemapJob> {
  const [newJob] = await db.insert(cinemapJobs).values(job).returning();
  return newJob;
}

export async function getCinemapJobById(id: number): Promise<CinemapJob | undefined> {
  const [job] = await db
    .select()
    .from(cinemapJobs)
    .where(eq(cinemapJobs.id, id))
    .limit(1);
  return job;
}

export async function getCinemapJobsByUser(userId: string): Promise<CinemapJob[]> {
  return await db
    .select()
    .from(cinemapJobs)
    .where(eq(cinemapJobs.userId, userId))
    .orderBy(desc(cinemapJobs.createdAt));
}

export async function getCinemapJobsByTimeline(timelineId: number): Promise<CinemapJob[]> {
  return await db
    .select()
    .from(cinemapJobs)
    .where(eq(cinemapJobs.timelineId, timelineId))
    .orderBy(desc(cinemapJobs.createdAt));
}

export async function updateCinemapJob(
  id: number,
  updates: Partial<InsertCinemapJob>
): Promise<CinemapJob | undefined> {
  const [updated] = await db
    .update(cinemapJobs)
    .set(updates)
    .where(eq(cinemapJobs.id, id))
    .returning();
  return updated;
}

// Serendipity Protocol operations
export async function createQuest(quest: InsertQuest): Promise<Quest> {
  const [newQuest] = await db.insert(quests).values(quest).returning();
  return newQuest;
}

export async function getQuestById(id: number): Promise<Quest | undefined> {
  const quest = await db.query.quests.findFirst({
    where: eq(quests.id, id),
  });
  return quest;
}

export async function getActiveQuests(latitude: number, longitude: number, radiusM: number = 500): Promise<Quest[]> {
  const radiusDegrees = radiusM / 111000;
  const activeQuests = await db.query.quests.findMany({
    where: and(
      eq(quests.status, 'active'),
      sql`${quests.latitude}::numeric BETWEEN ${latitude - radiusDegrees} AND ${latitude + radiusDegrees}`,
      sql`${quests.longitude}::numeric BETWEEN ${longitude - radiusDegrees} AND ${longitude + radiusDegrees}`
    ),
    orderBy: [desc(quests.createdAt)],
  });
  return activeQuests;
}

export async function getQuestsByUser(userId: string, limit: number = 20): Promise<(Quest & { participants: QuestParticipant[] })[]> {
  const participantRecords = await db.query.questParticipants.findMany({
    where: eq(questParticipants.userId, userId),
    orderBy: [desc(questParticipants.createdAt)],
    limit,
  });

  const questIds = participantRecords.map(p => p.questId);
  if (questIds.length === 0) return [];

  const userQuests = await db.query.quests.findMany({
    where: sql`${quests.id} IN (${sql.join(questIds.map(id => sql`${id}`), sql`, `)})`,
    with: {
      participants: true,
    },
  });
  return userQuests as (Quest & { participants: QuestParticipant[] })[];
}

export async function updateQuestStatus(id: number, status: string): Promise<Quest | undefined> {
  const [updated] = await db
    .update(quests)
    .set({ status, updatedAt: new Date() })
    .where(eq(quests.id, id))
    .returning();
  return updated;
}

export async function addQuestParticipant(participant: InsertQuestParticipant): Promise<QuestParticipant> {
  const [newParticipant] = await db.insert(questParticipants).values(participant).returning();
  return newParticipant;
}

export async function updateQuestParticipantStatus(
  questId: number,
  userId: string,
  status: string,
  resultJson?: any
): Promise<QuestParticipant | undefined> {
  const updates: any = { status };
  if (status === 'accepted') {
    updates.joinedAt = new Date();
  }
  if (status === 'completed') {
    updates.completedAt = new Date();
  }
  if (resultJson) {
    updates.resultJson = resultJson;
  }

  const [updated] = await db
    .update(questParticipants)
    .set(updates)
    .where(and(eq(questParticipants.questId, questId), eq(questParticipants.userId, userId)))
    .returning();
  return updated;
}

export async function getQuestParticipants(questId: number): Promise<(QuestParticipant & { user: User })[]> {
  const participants = await db.query.questParticipants.findMany({
    where: eq(questParticipants.questId, questId),
    with: {
      user: true,
    },
  });
  return participants as (QuestParticipant & { user: User })[];
}

export async function createQuestHighlight(highlight: InsertQuestHighlight): Promise<QuestHighlight> {
  const [newHighlight] = await db.insert(questHighlights).values(highlight).returning();
  return newHighlight;
}

export async function getQuestHighlights(questId: number): Promise<QuestHighlight[]> {
  const highlights = await db.query.questHighlights.findMany({
    where: eq(questHighlights.questId, questId),
    orderBy: [desc(questHighlights.createdAt)],
  });
  return highlights;
}

export async function findNearbyUsersWithSamePlan(
  planId: number,
  userId: string,
  latitude: number,
  longitude: number,
  radiusM: number
): Promise<User[]> {
  const radiusDegrees = radiusM / 111000;
  const usersWithSamePlan = await db.query.miniPlans.findMany({
    where: and(
      eq(miniPlans.id, planId),
      sql`${miniPlans.userId} != ${userId}`,
      eq(miniPlans.status, 'started')
    ),
    with: {
      user: true,
    },
  });

  const nearbyUsers = usersWithSamePlan
    .filter(plan => {
      const user = plan.user;
      if (!user || !user.lastLatitude || !user.lastLongitude) return false;
      const lat = parseFloat(user.lastLatitude);
      const lng = parseFloat(user.lastLongitude);
      return (
        Math.abs(lat - latitude) <= radiusDegrees &&
        Math.abs(lng - longitude) <= radiusDegrees
      );
    })
    .map(plan => plan.user as User);

  return nearbyUsers;
}

export async function findNearbyUsersWithSimilarTags(
  tags: string[],
  userId: string,
  latitude: number,
  longitude: number,
  radiusM: number
): Promise<User[]> {
  if (tags.length === 0) return [];

  const radiusDegrees = radiusM / 111000;
  const allUsers = await db.query.users.findMany({
    where: and(
      sql`${users.id} != ${userId}`,
      sql`${users.serendipityEnabled} = true`,
      sql`${users.lastLatitude}::numeric BETWEEN ${latitude - radiusDegrees} AND ${latitude + radiusDegrees}`,
      sql`${users.lastLongitude}::numeric BETWEEN ${longitude - radiusDegrees} AND ${longitude + radiusDegrees}`
    ),
  });

  const nearbyUsersWithTags = allUsers.filter(user => {
    if (!user.interests) return false;
    const userTags = Array.isArray(user.interests) ? user.interests : [];
    return tags.some(tag => userTags.includes(tag));
  });

  return nearbyUsersWithTags;
}

// AI Prompt Templates (AI 프롬프트 템플릿)
export async function getAiPromptTemplate(templateKey: string, locale: string = 'en'): Promise<AiPromptTemplate | undefined> {
  // 먼저 해당 로케일로 검색
  let [template] = await db
    .select()
    .from(aiPromptTemplates)
    .where(and(
      eq(aiPromptTemplates.templateKey, templateKey),
      eq(aiPromptTemplates.locale, locale),
      eq(aiPromptTemplates.isActive, true)
    ))
    .orderBy(desc(aiPromptTemplates.version))
    .limit(1);
  
  // 없으면 영어로 폴백
  if (!template && locale !== 'en') {
    [template] = await db
      .select()
      .from(aiPromptTemplates)
      .where(and(
        eq(aiPromptTemplates.templateKey, templateKey),
        eq(aiPromptTemplates.locale, 'en'),
        eq(aiPromptTemplates.isActive, true)
      ))
      .orderBy(desc(aiPromptTemplates.version))
      .limit(1);
  }
  
  return template;
}

export async function getAiPromptTemplatesByCategory(category: string): Promise<AiPromptTemplate[]> {
  return await db
    .select()
    .from(aiPromptTemplates)
    .where(and(
      eq(aiPromptTemplates.category, category),
      eq(aiPromptTemplates.isActive, true)
    ))
    .orderBy(asc(aiPromptTemplates.templateKey), desc(aiPromptTemplates.version));
}

export async function getAllAiPromptTemplates(): Promise<AiPromptTemplate[]> {
  return await db
    .select()
    .from(aiPromptTemplates)
    .where(eq(aiPromptTemplates.isActive, true))
    .orderBy(asc(aiPromptTemplates.category), asc(aiPromptTemplates.templateKey));
}

export async function createAiPromptTemplate(template: InsertAiPromptTemplate): Promise<AiPromptTemplate> {
  const [created] = await db
    .insert(aiPromptTemplates)
    .values(template)
    .returning();
  return created;
}

export async function updateAiPromptTemplate(id: number, updates: Partial<InsertAiPromptTemplate>, updatedBy?: string): Promise<AiPromptTemplate | undefined> {
  const [updated] = await db
    .update(aiPromptTemplates)
    .set({ ...updates, updatedAt: new Date(), updatedBy })
    .where(eq(aiPromptTemplates.id, id))
    .returning();
  return updated;
}
