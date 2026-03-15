// @ts-nocheck
// 피드 저장소 (Feed Repository) — 포스트, 해시태그, 스마트 피드와 관련된 DB 접근 로직을 담당한다.
import {
  posts,
  postMedia,
  hashtags,
  hashtagTranslations,
  postHashtags,
  hashtagFollows,
  hashtagMetricsDaily,
  postSaves,
  userEngagementEvents,
  userFeedPreferences,
  feedAlgorithmWeights,
  follows,
  timelines,
  trips,
  type Post,
  type InsertPost,
  type PostMedia,
  type InsertPostMedia,
  type Hashtag,
  type InsertHashtag,
  type HashtagTranslation,
  type InsertHashtagTranslation,
  type PostHashtag,
  type InsertPostHashtag,
  type HashtagFollow,
  type PostSave,
  type UserEngagementEvent,
  type InsertUserEngagementEvent,
  type UserFeedPreferences,
  type InsertUserFeedPreferences,
  type FeedAlgorithmWeights,
  type InsertFeedAlgorithmWeights,
  type Timeline,
  type InsertTimeline,
  type Trip,
  type InsertTrip,
} from '@shared/schema';
import { db } from '../db';
import { eq, desc, and, gte, sql, like, inArray } from 'drizzle-orm';

// Post operations
export async function createPost(post: InsertPost): Promise<Post> {
  const [newPost] = await db.insert(posts).values(post).returning();
  return newPost;
}

export async function getPosts(limit: number = 20, offset: number = 0): Promise<Post[]> {
  return db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);
}

export async function getPostsByUser(userId: string): Promise<Post[]> {
  return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
}

export async function getPostsByUserWithTakenAt(userId: string): Promise<Post[]> {
  return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.takenAt));
}

// PostMedia operations
export async function createPostMedia(media: InsertPostMedia): Promise<PostMedia> {
  const [newMedia] = await db.insert(postMedia).values(media).returning();
  return newMedia;
}

export async function createPostMediaBatch(mediaList: InsertPostMedia[]): Promise<PostMedia[]> {
  return db.insert(postMedia).values(mediaList).returning();
}

export async function getPostMediaByPostId(postId: number): Promise<PostMedia[]> {
  return db.select().from(postMedia).where(eq(postMedia.postId, postId)).orderBy(desc(postMedia.orderIndex));
}

// Timeline operations
export async function createTimeline(timeline: InsertTimeline): Promise<Timeline> {
  const [newTimeline] = await db.insert(timelines).values(timeline).returning();
  return newTimeline;
}

export async function getTimelinesByUser(userId: string): Promise<Timeline[]> {
  return db.select().from(timelines).where(eq(timelines.userId, userId)).orderBy(desc(timelines.createdAt));
}

export async function getTimelineById(id: number): Promise<Timeline | undefined> {
  const [timeline] = await db.select().from(timelines).where(eq(timelines.id, id));
  return timeline;
}

export async function updateTimeline(id: number, updates: Partial<InsertTimeline>): Promise<Timeline | undefined> {
  const [updated] = await db.update(timelines).set(updates).where(eq(timelines.id, id)).returning();
  return updated;
}

export async function deleteTimeline(id: number): Promise<boolean> {
  const result = await db.delete(timelines).where(eq(timelines.id, id));
  return true;
}

export async function getTimelineWithPosts(id: number): Promise<(Timeline & { posts: Post[] }) | undefined> {
  const timeline = await getTimelineById(id);
  if (!timeline) return undefined;

  const timelinePosts = await db.select().from(posts).where(eq(posts.timelineId, id)).orderBy(desc(posts.createdAt));
  return { ...timeline, posts: timelinePosts };
}

// Trip operations
export async function createTrip(trip: InsertTrip): Promise<Trip> {
  const [newTrip] = await db.insert(trips).values(trip).returning();
  return newTrip;
}

export async function getTripsByUser(userId: string): Promise<Trip[]> {
  return db.select().from(trips).where(eq(trips.userId, userId)).orderBy(desc(trips.startDate));
}

export async function updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip | undefined> {
  const [updated] = await db.update(trips).set(updates).where(eq(trips.id, id)).returning();
  return updated;
}

// Smart Feed & Hashtag System 메서드
// ==========================================

export async function createHashtag(hashtag: InsertHashtag): Promise<Hashtag> {
  const [newHashtag] = await db.insert(hashtags).values(hashtag).returning();
  return newHashtag;
}

export async function getHashtagById(id: number): Promise<Hashtag | undefined> {
  const [hashtag] = await db.select().from(hashtags).where(eq(hashtags.id, id));
  return hashtag;
}

export async function getHashtagByName(name: string): Promise<Hashtag | undefined> {
  const normalizedName = name.toLowerCase().replace(/^#/, '');
  const [hashtag] = await db.select().from(hashtags).where(eq(hashtags.name, normalizedName));
  return hashtag;
}

export async function searchHashtags(query: string, limit: number = 10): Promise<Hashtag[]> {
  const normalizedQuery = query.toLowerCase().replace(/^#/, '');
  return db.select().from(hashtags)
    .where(like(hashtags.name, `%${normalizedQuery}%`))
    .orderBy(desc(hashtags.postCount))
    .limit(limit);
}

export async function getTrendingHashtags(limit: number = 10, period: 'day' | 'week' = 'day'): Promise<(Hashtag & { growthRate: number })[]> {
  const daysAgo = period === 'day' ? 1 : 7;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
  const dateStr = dateThreshold.toISOString().split('T')[0];

  const metricsData = await db.select({
    hashtagId: hashtagMetricsDaily.hashtagId,
    totalUsage: sql<number>`SUM(${hashtagMetricsDaily.usageCount})`,
    avgGrowth: sql<number>`AVG(CAST(${hashtagMetricsDaily.growthRate} AS NUMERIC))`,
  })
    .from(hashtagMetricsDaily)
    .where(gte(hashtagMetricsDaily.date, dateStr))
    .groupBy(hashtagMetricsDaily.hashtagId)
    .orderBy(desc(sql`AVG(CAST(${hashtagMetricsDaily.growthRate} AS NUMERIC))`))
    .limit(limit);

  const result: (Hashtag & { growthRate: number })[] = [];
  for (const metric of metricsData) {
    const hashtag = await getHashtagById(metric.hashtagId);
    if (hashtag) {
      result.push({ ...hashtag, growthRate: Number(metric.avgGrowth) || 0 });
    }
  }

  if (result.length < limit) {
    const existingIds = result.map(h => h.id);
    const fallbackHashtags = await db.select().from(hashtags)
      .where(existingIds.length > 0 ? sql`${hashtags.id} NOT IN (${existingIds.join(',')})` : sql`1=1`)
      .orderBy(desc(hashtags.postCount))
      .limit(limit - result.length);
    for (const h of fallbackHashtags) {
      result.push({ ...h, growthRate: 0 });
    }
  }

  return result;
}

export async function updateHashtagCounts(id: number): Promise<Hashtag | undefined> {
  const postCount = await db.select({ count: sql<number>`count(*)` })
    .from(postHashtags)
    .where(eq(postHashtags.hashtagId, id));
  
  const followerCount = await db.select({ count: sql<number>`count(*)` })
    .from(hashtagFollows)
    .where(eq(hashtagFollows.hashtagId, id));

  const [updated] = await db.update(hashtags)
    .set({
      postCount: Number(postCount[0]?.count || 0),
      followerCount: Number(followerCount[0]?.count || 0),
      updatedAt: new Date(),
    })
    .where(eq(hashtags.id, id))
    .returning();

  return updated;
}

export async function createHashtagTranslation(translation: InsertHashtagTranslation): Promise<HashtagTranslation> {
  const [newTranslation] = await db.insert(hashtagTranslations).values(translation).returning();
  return newTranslation;
}

export async function getHashtagTranslations(hashtagId: number): Promise<HashtagTranslation[]> {
  return db.select().from(hashtagTranslations).where(eq(hashtagTranslations.hashtagId, hashtagId));
}

export async function getHashtagWithTranslation(hashtagId: number, languageCode: string): Promise<(Hashtag & { translatedName?: string }) | undefined> {
  const hashtag = await getHashtagById(hashtagId);
  if (!hashtag) return undefined;

  const [translation] = await db.select()
    .from(hashtagTranslations)
    .where(and(
      eq(hashtagTranslations.hashtagId, hashtagId),
      eq(hashtagTranslations.languageCode, languageCode)
    ));

  return { ...hashtag, translatedName: translation?.translatedName };
}

export async function createPostHashtag(postHashtag: InsertPostHashtag): Promise<PostHashtag> {
  const [newPostHashtag] = await db.insert(postHashtags).values(postHashtag).returning();
  return newPostHashtag;
}

export async function getPostHashtags(postId: number): Promise<(PostHashtag & { hashtag: Hashtag })[]> {
  const results = await db.query.postHashtags.findMany({
    where: eq(postHashtags.postId, postId),
    with: {
      hashtag: true,
    },
  });
  return results;
}

export async function getPostsByHashtag(hashtagId: number, limit: number = 20, offset: number = 0): Promise<Post[]> {
  const postIds = await db.select({ postId: postHashtags.postId })
    .from(postHashtags)
    .where(eq(postHashtags.hashtagId, hashtagId))
    .orderBy(desc(postHashtags.createdAt))
    .limit(limit)
    .offset(offset);

  if (postIds.length === 0) return [];

  const ids = postIds.map(p => p.postId);
  return db.select().from(posts)
    .where(inArray(posts.id, ids))
    .orderBy(desc(posts.createdAt));
}

export async function parseAndLinkHashtags(postId: number, content: string): Promise<Hashtag[]> {
  const hashtagRegex = /#[\w가-힣一-龯ぁ-んァ-ン]+/g;
  const matches = content.match(hashtagRegex) || [];
  const linkedHashtags: Hashtag[] = [];

  for (const match of matches) {
    const name = match.toLowerCase().replace(/^#/, '');
    let hashtag = await getHashtagByName(name);
    
    if (!hashtag) {
      hashtag = await createHashtag({ name });
    }

    const existing = await db.select()
      .from(postHashtags)
      .where(and(
        eq(postHashtags.postId, postId),
        eq(postHashtags.hashtagId, hashtag.id)
      ));

    if (existing.length === 0) {
      await createPostHashtag({ postId, hashtagId: hashtag.id });
    }

    await updateHashtagCounts(hashtag.id);
    linkedHashtags.push(hashtag);
  }

  return linkedHashtags;
}

export async function followHashtag(userId: string, hashtagId: number): Promise<HashtagFollow> {
  const existing = await db.select()
    .from(hashtagFollows)
    .where(and(
      eq(hashtagFollows.userId, userId),
      eq(hashtagFollows.hashtagId, hashtagId)
    ));

  if (existing.length > 0) {
    return existing[0];
  }

  const [follow] = await db.insert(hashtagFollows)
    .values({ userId, hashtagId })
    .returning();

  await updateHashtagCounts(hashtagId);
  return follow;
}

export async function unfollowHashtag(userId: string, hashtagId: number): Promise<boolean> {
  const result = await db.delete(hashtagFollows)
    .where(and(
      eq(hashtagFollows.userId, userId),
      eq(hashtagFollows.hashtagId, hashtagId)
    ));

  await updateHashtagCounts(hashtagId);
  return true;
}

export async function getFollowedHashtags(userId: string): Promise<(HashtagFollow & { hashtag: Hashtag })[]> {
  return db.query.hashtagFollows.findMany({
    where: eq(hashtagFollows.userId, userId),
    with: {
      hashtag: true,
    },
  });
}

export async function isFollowingHashtag(userId: string, hashtagId: number): Promise<boolean> {
  const [follow] = await db.select()
    .from(hashtagFollows)
    .where(and(
      eq(hashtagFollows.userId, userId),
      eq(hashtagFollows.hashtagId, hashtagId)
    ));
  return !!follow;
}

export async function savePost(userId: string, postId: number): Promise<PostSave> {
  const existing = await db.select()
    .from(postSaves)
    .where(and(
      eq(postSaves.userId, userId),
      eq(postSaves.postId, postId)
    ));

  if (existing.length > 0) {
    return existing[0];
  }

  const [save] = await db.insert(postSaves)
    .values({ userId, postId })
    .returning();

  await createEngagementEvent({ userId, postId, eventType: 'save' });
  return save;
}

export async function unsavePost(userId: string, postId: number): Promise<boolean> {
  await db.delete(postSaves)
    .where(and(
      eq(postSaves.userId, userId),
      eq(postSaves.postId, postId)
    ));
  return true;
}

export async function getSavedPosts(userId: string, limit: number = 20, offset: number = 0): Promise<Post[]> {
  const savedPostIds = await db.select({ postId: postSaves.postId })
    .from(postSaves)
    .where(eq(postSaves.userId, userId))
    .orderBy(desc(postSaves.createdAt))
    .limit(limit)
    .offset(offset);

  if (savedPostIds.length === 0) return [];

  const ids = savedPostIds.map(s => s.postId);
  return db.select().from(posts)
    .where(inArray(posts.id, ids))
    .orderBy(desc(posts.createdAt));
}

export async function isPostSaved(userId: string, postId: number): Promise<boolean> {
  const [save] = await db.select()
    .from(postSaves)
    .where(and(
      eq(postSaves.userId, userId),
      eq(postSaves.postId, postId)
    ));
  return !!save;
}

export async function createEngagementEvent(event: InsertUserEngagementEvent): Promise<UserEngagementEvent> {
  const [newEvent] = await db.insert(userEngagementEvents).values(event).returning();
  return newEvent;
}

export async function getPostVelocity(postId: number, windowMinutes: number = 120): Promise<number> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  const result = await db.select({ count: sql<number>`count(*)` })
    .from(userEngagementEvents)
    .where(and(
      eq(userEngagementEvents.postId, postId),
      gte(userEngagementEvents.createdAt, windowStart)
    ));

  return Number(result[0]?.count || 0);
}

export async function getUserFeedPreferences(userId: string): Promise<UserFeedPreferences | undefined> {
  const [prefs] = await db.select()
    .from(userFeedPreferences)
    .where(eq(userFeedPreferences.userId, userId));
  return prefs;
}

export async function setUserFeedPreferences(prefs: InsertUserFeedPreferences): Promise<UserFeedPreferences> {
  const [newPrefs] = await db.insert(userFeedPreferences)
    .values(prefs)
    .onConflictDoUpdate({
      target: userFeedPreferences.userId,
      set: { ...prefs, updatedAt: new Date() },
    })
    .returning();
  return newPrefs;
}

export async function getActiveFeedAlgorithmWeights(): Promise<FeedAlgorithmWeights | undefined> {
  const [weights] = await db.select()
    .from(feedAlgorithmWeights)
    .where(eq(feedAlgorithmWeights.isActive, true))
    .limit(1);
  return weights;
}

export async function setFeedAlgorithmWeights(weights: InsertFeedAlgorithmWeights): Promise<FeedAlgorithmWeights> {
  if (weights.isActive) {
    await db.update(feedAlgorithmWeights)
      .set({ isActive: false })
      .where(eq(feedAlgorithmWeights.isActive, true));
  }

  const [newWeights] = await db.insert(feedAlgorithmWeights)
    .values(weights)
    .returning();
  return newWeights;
}

export async function getSmartFeed(userId: string, options: {
  mode: 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag';
  limit?: number;
  offset?: number;
  latitude?: number;
  longitude?: number;
}): Promise<(Post & { score?: number })[]> {
  const { mode, limit = 20, offset = 0, latitude, longitude } = options;

  switch (mode) {
    case 'latest':
      return db.select().from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

    case 'popular': {
      const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(100);
      
      if (allPosts.length === 0) return [];

      const postIds = allPosts.map(p => p.id);
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - 120);

      const velocityCounts = await db.select({
        postId: userEngagementEvents.postId,
        count: sql<number>`count(*)`
      })
        .from(userEngagementEvents)
        .where(and(
          inArray(userEngagementEvents.postId, postIds),
          gte(userEngagementEvents.createdAt, windowStart)
        ))
        .groupBy(userEngagementEvents.postId);

      const velocityMap = new Map(velocityCounts.map(v => [v.postId, Number(v.count)]));

      const scored = allPosts.map(post => {
        const velocity = velocityMap.get(post.id) || 0;
        const likeCount = Number(post.likesCount || 0); // Corrected from likeCount to likesCount
        const commentCount = Number(post.commentsCount || 0); // Corrected from commentCount to commentsCount
        const score = (likeCount * 1) + (commentCount * 2) + (velocity * 3);
        return { ...post, score };
      });

      scored.sort((a, b) => (b.score || 0) - (a.score || 0));
      return scored.slice(offset, offset + limit);
    }

    case 'nearby': {
      if (!latitude || !longitude) {
        return db.select().from(posts)
          .orderBy(desc(posts.createdAt))
          .limit(limit)
          .offset(offset);
      }
      const radiusDegrees = 50 / 111;
      const nearbyPosts = await db.select().from(posts)
        .where(and(
          sql`CAST(${posts.latitude} AS NUMERIC) BETWEEN ${latitude - radiusDegrees} AND ${latitude + radiusDegrees}`,
          sql`CAST(${posts.longitude} AS NUMERIC) BETWEEN ${longitude - radiusDegrees} AND ${longitude + radiusDegrees}`
        ))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);
      return nearbyPosts;
    }

    case 'hashtag': {
      const followedHashtags = await getFollowedHashtags(userId);
      if (followedHashtags.length === 0) {
        return db.select().from(posts)
          .orderBy(desc(posts.createdAt))
          .limit(limit)
          .offset(offset);
      }
      const hashtagIds = followedHashtags.map(f => f.hashtagId);
      const postIdsResult = await db.selectDistinct({ postId: postHashtags.postId })
        .from(postHashtags)
        .where(inArray(postHashtags.hashtagId, hashtagIds))
        .orderBy(desc(postHashtags.createdAt))
        .limit(limit)
        .offset(offset);

      if (postIdsResult.length === 0) return [];
      const ids = postIdsResult.map(p => p.postId);
      return db.select().from(posts)
        .where(inArray(posts.id, ids))
        .orderBy(desc(posts.createdAt));
    }

    case 'smart':
    default: {
      const weights = await getActiveFeedAlgorithmWeights() || {
        engagementWeight: '0.22',
        affinityWeight: '0.20',
        interestWeight: '0.15',
        hashtagWeight: '0.12',
        locationWeight: '0.12',
        recencyWeight: '0.11',
        velocityWeight: '0.08',
        recencyDecayHours: 24,
        velocityWindowMinutes: 120,
      };

      const [userPrefs, followedHashtags, followedUsers, recentPosts] = await Promise.all([
        getUserFeedPreferences(userId),
        getFollowedHashtags(userId),
        db.select({ followingId: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, userId)),
        db.select().from(posts)
          .orderBy(desc(posts.createdAt))
          .limit(100)
      ]);

      const followedUserIds = new Set(followedUsers.map(f => f.followingId));
      const followedHashtagIds = new Set(followedHashtags.map(f => f.hashtagId));

      if (recentPosts.length === 0) return [];

      const postIds = recentPosts.map(p => p.id);

      const [allPostHashtags, allVelocities] = await Promise.all([
        db.select({
          postId: postHashtags.postId,
          hashtagId: postHashtags.hashtagId,
        })
          .from(postHashtags)
          .where(inArray(postHashtags.postId, postIds)),
        
        (async () => {
          const windowStart = new Date();
          windowStart.setMinutes(windowStart.getMinutes() - Number(weights.velocityWindowMinutes));
          
          const velocityCounts = await db.select({
            postId: userEngagementEvents.postId,
            count: sql<number>`count(*)`
          })
            .from(userEngagementEvents)
            .where(and(
              inArray(userEngagementEvents.postId, postIds),
              gte(userEngagementEvents.createdAt, windowStart)
            ))
            .groupBy(userEngagementEvents.postId);
          
          return new Map(velocityCounts.map(v => [v.postId, Number(v.count)]));
        })()
      ]);

      const postHashtagMap = new Map<number, number[]>();
      for (const ph of allPostHashtags) {
        if (!postHashtagMap.has(ph.postId)) {
          postHashtagMap.set(ph.postId, []);
        }
        postHashtagMap.get(ph.postId)!.push(ph.hashtagId);
      }

      const scored: (Post & { score: number })[] = [];

      for (const post of recentPosts) {
        let score = 0;

        const likeCount = Number(post.likesCount || 0); // Corrected
        const commentCount = Number(post.commentsCount || 0); // Corrected
        const engagementScore = (likeCount * 1 + commentCount * 2) / 10;
        score += engagementScore * Number(userPrefs?.engagementWeight || weights.engagementWeight);

        if (followedUserIds.has(post.userId)) {
          score += 10 * Number(userPrefs?.affinityWeight || weights.affinityWeight);
        }

        const postHashtagIds = postHashtagMap.get(post.id) || [];
        const hasFollowedHashtag = postHashtagIds.some(hid => followedHashtagIds.has(hid));
        if (hasFollowedHashtag) {
          score += 5 * Number(userPrefs?.hashtagWeight || weights.hashtagWeight);
        }

        const hoursAgo = (Date.now() - new Date(post.createdAt || Date.now()).getTime()) / (1000 * 60 * 60);
        const recencyDecay = Math.max(0, 1 - (hoursAgo / Number(weights.recencyDecayHours)));
        score += recencyDecay * 10 * Number(userPrefs?.recencyWeight || weights.recencyWeight);

        if (latitude && longitude && post.latitude && post.longitude) {
          const distance = Math.sqrt(
            Math.pow(Number(post.latitude) - latitude, 2) +
            Math.pow(Number(post.longitude) - longitude, 2)
          );
          const locationScore = Math.max(0, 1 - (distance / 0.5));
          score += locationScore * 5 * Number(userPrefs?.locationWeight || weights.locationWeight);
        }

        const velocity = allVelocities.get(post.id) || 0;
        score += (velocity / 10) * Number(userPrefs?.velocityWeight || weights.velocityWeight);

        scored.push({ ...post, score });
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(offset, offset + limit);
    }
  }
}

export async function updateHashtagMetrics(hashtagId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  const todayUsage = await db.select({ count: sql<number>`count(*)` })
    .from(postHashtags)
    .where(and(
      eq(postHashtags.hashtagId, hashtagId),
      sql`DATE(${postHashtags.createdAt}) = ${today}`
    ));

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const [yesterdayMetric] = await db.select()
    .from(hashtagMetricsDaily)
    .where(and(
      eq(hashtagMetricsDaily.hashtagId, hashtagId),
      eq(hashtagMetricsDaily.date, yesterdayStr)
    ));

  const todayCount = Number(todayUsage[0]?.count || 0);
  const yesterdayCount = Number(yesterdayMetric?.usageCount || 0);
  const growthRate = yesterdayCount > 0 
    ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
    : (todayCount > 0 ? 100 : 0);

  await db.insert(hashtagMetricsDaily)
    .values({
      hashtagId,
      date: today,
      usageCount: todayCount,
      growthRate: growthRate.toFixed(2),
    })
    .onConflictDoNothing();
}

export async function seedInitialHashtags(): Promise<void> {
  const existingCount = await db.select({ count: sql<number>`count(*)` }).from(hashtags);
  if (Number(existingCount[0]?.count || 0) > 0) return;

  const defaultHashtags = [
    { name: 'travel', translations: { ko: '여행', ja: '旅行', zh: '旅行', fr: 'voyage', es: 'viaje' } },
    { name: 'food', translations: { ko: '음식', ja: '料理', zh: '美食', fr: 'cuisine', es: 'comida' } },
    { name: 'culture', translations: { ko: '문화', ja: '文化', zh: '文化', fr: 'culture', es: 'cultura' } },
    { name: 'seoul', translations: { ko: '서울', ja: 'ソウル', zh: '首尔', fr: 'séoul', es: 'seúl' } },
    { name: 'korea', translations: { ko: '한국', ja: '韓国', zh: '韩国', fr: 'corée', es: 'corea' } },
    { name: 'photography', translations: { ko: '사진', ja: '写真', zh: '摄影', fr: 'photographie', es: 'fotografía' } },
    { name: 'nature', translations: { ko: '자연', ja: '自然', zh: '自然', fr: 'nature', es: 'naturaleza' } },
    { name: 'cafe', translations: { ko: '카페', ja: 'カフェ', zh: '咖啡厅', fr: 'café', es: 'café' } },
    { name: 'nightlife', translations: { ko: '나이트라이프', ja: 'ナイトライフ', zh: '夜生活', fr: 'vie nocturne', es: 'vida nocturna' } },
    { name: 'streetfood', translations: { ko: '길거리음식', ja: '屋태料理', zh: '街头小吃', fr: 'street food', es: 'comida callejera' } },
  ];

  for (const tag of defaultHashtags) {
    const [hashtag] = await db.insert(hashtags).values({ name: tag.name }).returning();
    
    for (const [lang, translated] of Object.entries(tag.translations)) {
      await db.insert(hashtagTranslations).values({
        hashtagId: hashtag.id,
        languageCode: lang,
        translatedName: translated,
      });
    }
  }

  const existingPosts = await db.select().from(posts).limit(100);
  for (const post of existingPosts) {
    const content = `${post.title || ''} ${post.content || ''} ${(post.tags || []).map(t => `#${t}`).join(' ')}`;
    await parseAndLinkHashtags(post.id, content);
  }
}
