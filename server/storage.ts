import {
  users,
  experiences,
  posts,
  bookings,
  conversations,
  messages,
  reviews,
  likes,
  trips,
  timelines,
  systemSettings,
  notifications,
  follows,
  miniMeets,
  miniMeetAttendees,
  type User,
  type UpsertUser,
  type InsertExperience,
  type Experience,
  type InsertPost,
  type Post,
  type InsertBooking,
  type Booking,
  type InsertMessage,
  type Message,
  type Conversation,
  type InsertTrip,
  type Trip,
  type InsertTimeline,
  type Timeline,
  type Review,
  type SystemSetting,
  type InsertSystemSetting,
  type Notification,
  type InsertNotification,
  type Follow,
  type InsertFollow,
  type MiniMeet,
  type MiniMeetAttendee,
  type InsertMiniMeet,
} from '@shared/schema';
import { db } from './db';
import { eq, desc, and, or, sql, like } from 'drizzle-orm';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  getOpenUsers(): Promise<User[]>;

  // Experience operations
  createExperience(experience: InsertExperience): Promise<Experience>;
  getExperiences(location?: string, category?: string): Promise<Experience[]>;
  getExperienceById(id: number): Promise<Experience | undefined>;
  getExperiencesByHost(hostId: string): Promise<Experience[]>;
  updateExperience(
    id: number,
    updates: Partial<InsertExperience>
  ): Promise<Experience | undefined>;

  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  getPostsByUser(userId: string): Promise<Post[]>;
  getPostsByUserWithTakenAt(userId: string): Promise<Post[]>;
  toggleLike(userId: string, postId: number): Promise<boolean>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getBookingsByHost(hostId: string): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;

  // Chat operations
  getOrCreateConversation(
    participant1Id: string,
    participant2Id: string
  ): Promise<Conversation>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;

  // Timeline operations
  createTimeline(timeline: InsertTimeline): Promise<Timeline>;
  getTimelinesByUser(userId: string): Promise<Timeline[]>;
  getTimelineById(id: number): Promise<Timeline | undefined>;
  updateTimeline(
    id: number,
    updates: Partial<InsertTimeline>
  ): Promise<Timeline | undefined>;
  deleteTimeline(id: number): Promise<boolean>;
  getTimelineWithPosts(
    id: number
  ): Promise<(Timeline & { posts: Post[] }) | undefined>;

  // Trip operations
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripsByUser(userId: string): Promise<Trip[]>;
  updateTrip(
    id: number,
    updates: Partial<InsertTrip>
  ): Promise<Trip | undefined>;

  // Review operations
  createReview(review: {
    experienceId: number;
    guestId: string;
    hostId: string;
    rating: number;
    comment?: string;
  }): Promise<Review>;
  getReviewsByExperience(experienceId: number): Promise<Review[]>;

  // System Settings operations
  getSystemSetting(category: string, key: string): Promise<string | undefined>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getAllSystemSettings(category?: string): Promise<SystemSetting[]>;
  updateSystemSetting(
    id: string,
    updates: Partial<InsertSystemSetting>
  ): Promise<SystemSetting | undefined>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;

  // MiniMeets
  async createMiniMeet(data: InsertMiniMeet): Promise<MiniMeet>;
  async getMiniMeetsNearby(latitude: number, longitude: number, radius: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] })[]>;
  async joinMiniMeet(meetId: number, userId: string): Promise<MiniMeetAttendee>;
  async leaveMiniMeet(meetId: number, userId: string): Promise<void>;
  async getMiniMeetAttendees(meetId: number): Promise<(MiniMeetAttendee & { user: User })[]>;
  async getMiniMeetById(id: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] }) | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getOpenUsers(): Promise<User[]> {
    const openUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.openToMeet, true),
          sql`${users.openUntil} > NOW()`
        )
      );
    return openUsers;
  }

  // Experience operations
  async createExperience(experience: InsertExperience): Promise<Experience> {
    const [newExperience] = await db
      .insert(experiences)
      .values(experience)
      .returning();
    return newExperience;
  }

  async getExperiences(
    location?: string,
    category?: string
  ): Promise<Experience[]> {
    let conditions = [eq(experiences.isActive, true)];

    if (location) {
      conditions.push(like(experiences.location, `%${location}%`));
    }

    if (category) {
      conditions.push(eq(experiences.category, category));
    }

    return await db
      .select()
      .from(experiences)
      .where(and(...conditions))
      .orderBy(desc(experiences.createdAt));
  }

  async getExperienceById(id: number): Promise<Experience | undefined> {
    const [experience] = await db
      .select()
      .from(experiences)
      .where(and(eq(experiences.id, id), eq(experiences.isActive, true)));
    return experience;
  }

  async getExperiencesByHost(hostId: string): Promise<Experience[]> {
    return await db
      .select()
      .from(experiences)
      .where(eq(experiences.hostId, hostId))
      .orderBy(desc(experiences.createdAt));
  }

  async updateExperience(
    id: number,
    updates: Partial<InsertExperience>
  ): Promise<Experience | undefined> {
    const [experience] = await db
      .update(experiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(experiences.id, id))
      .returning();
    return experience;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getPosts(limit: number = 20, offset: number = 0): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPostsByUser(userId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsByUserWithTakenAt(userId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), sql`${posts.takenAt} IS NOT NULL`))
      .orderBy(posts.takenAt);
  }

  async deletePost(postId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(posts)
        .where(eq(posts.id, postId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  async toggleLike(userId: string, postId: number): Promise<boolean> {
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike
      await db
        .delete(likes)
        .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));

      await db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} - 1` })
        .where(eq(posts.id, postId));

      return false;
    } else {
      // Like
      await db.insert(likes).values({ userId, postId });

      await db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));

      // 포스트 정보 조회하여 알림 생성
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post && post.userId !== userId) {
        // 자신의 포스트가 아닐 때만 알림 생성
        const [liker] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        await this.createNotification({
          userId: post.userId,
          type: 'reaction',
          title: '새로운 좋아요',
          message: `${liker?.firstName || '익명의 사용자'}님이 회원님의 포스트를 좋아합니다`,
          relatedUserId: userId,
          relatedPostId: postId,
        });
      }

      return true;
    }
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.guestId, guestId))
      .orderBy(desc(bookings.createdAt));
  }

  async getBookingsByHost(hostId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.hostId, hostId))
      .orderBy(desc(bookings.createdAt));
  }

  async updateBookingStatus(
    id: number,
    status: string
  ): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Chat operations
  async getOrCreateConversation(
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

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
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

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();

    // Update conversation last message
    await db
      .update(conversations)
      .set({
        lastMessageId: newMessage!.id,
        lastMessageAt: new Date(),
      })
      .where(eq(conversations.id, message.conversationId));

    // 대화상대에게 알림 생성
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, message.conversationId))
      .limit(1);

    if (conversation) {
      const recipientId = conversation.participant1Id === message.senderId 
        ? conversation.participant2Id 
        : conversation.participant1Id;

      const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.id, message.senderId))
        .limit(1);

      await this.createNotification({
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

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // Timeline operations
  async createTimeline(timeline: InsertTimeline): Promise<Timeline> {
    const [newTimeline] = await db
      .insert(timelines)
      .values(timeline)
      .returning();
    return newTimeline;
  }

  async getTimelinesByUser(userId: string): Promise<Timeline[]> {
    return await db
      .select()
      .from(timelines)
      .where(eq(timelines.userId, userId))
      .orderBy(desc(timelines.createdAt));
  }

  async getTimelineById(id: number): Promise<Timeline | undefined> {
    const [timeline] = await db
      .select()
      .from(timelines)
      .where(eq(timelines.id, id));
    return timeline;
  }

  async updateTimeline(
    id: number,
    updates: Partial<InsertTimeline>
  ): Promise<Timeline | undefined> {
    const [timeline] = await db
      .update(timelines)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timelines.id, id))
      .returning();
    return timeline;
  }

  async deleteTimeline(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(timelines)
        .where(eq(timelines.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting timeline:', error);
      return false;
    }
  }

  async getTimelineWithPosts(
    id: number
  ): Promise<(Timeline & { posts: Post[] }) | undefined> {
    const timeline = await this.getTimelineById(id);
    if (!timeline) return undefined;

    const timelinePosts = await db
      .select()
      .from(posts)
      .where(eq(posts.timelineId, id))
      .orderBy(posts.day, posts.createdAt);

    return { ...timeline, posts: timelinePosts };
  }

  // Trip operations
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    return newTrip;
  }

  async getTripsByUser(userId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.startDate));
  }

  async updateTrip(
    id: number,
    updates: Partial<InsertTrip>
  ): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trips.id, id))
      .returning();
    return trip;
  }

  // Review operations
  async createReview(review: {
    experienceId: number;
    guestId: string;
    hostId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();

    // Update experience rating
    const avgRating = await db
      .select({
        avg: sql<number>`avg(${reviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(eq(reviews.experienceId, review.experienceId));

    if (avgRating[0]) {
      await db
        .update(experiences)
        .set({
          rating: avgRating[0].avg.toFixed(2),
          reviewCount: avgRating[0].count,
        })
        .where(eq(experiences.id, review.experienceId));
    }

    return newReview;
  }

  async getReviewsByExperience(experienceId: number): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.experienceId, experienceId))
      .orderBy(desc(reviews.createdAt));
  }

  // System Settings operations
  async getSystemSetting(
    category: string,
    key: string
  ): Promise<string | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.category, category),
          eq(systemSettings.key, key),
          eq(systemSettings.isActive, true)
        )
      );
    return setting?.value;
  }

  async setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const [newSetting] = await db
      .insert(systemSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: [systemSettings.category, systemSettings.key],
        set: {
          value: setting.value,
          description: setting.description,
          isActive: setting.isActive,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newSetting;
  }

  async getAllSystemSettings(category?: string): Promise<SystemSetting[]> {
    const query = db.select().from(systemSettings);
    if (category) {
      return await query.where(eq(systemSettings.category, category));
    }
    return await query;
  }

  async updateSystemSetting(
    id: string,
    updates: Partial<InsertSystemSetting>
  ): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .update(systemSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systemSettings.id, id))
      .returning();
    return setting;
  }

  // SQL 실행 함수 (DB Admin용)
  async executeSQL(query: string): Promise<any> {
    try {
      const result = await db.execute(sql.raw(query));
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      throw new Error(`SQL 실행 오류: ${error.message}`);
    }
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50); // 최근 50개만
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: number): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  // Follow operations
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const [follow] = await db
      .insert(follows)
      .values({ followerId, followingId })
      .returning();
    
    // 팔로우 알림 생성
    const [follower] = await db
      .select()
      .from(users)
      .where(eq(users.id, followerId))
      .limit(1);

    await this.createNotification({
      userId: followingId,
      type: 'follow',
      title: '새로운 팔로워',
      message: `${follower?.firstName || '익명의 사용자'}님이 회원님을 팔로우하기 시작했습니다`,
      relatedUserId: followerId,
    });

    return follow!;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      );
    return result.rowCount! > 0;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )
      .limit(1);
    return !!follow;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        location: users.location,
        createdAt: users.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .orderBy(desc(follows.createdAt));

    return result as User[];
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        bio: users.bio,
        location: users.location,
        createdAt: users.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .orderBy(desc(follows.createdAt));

    return result as User[];
  }

  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const [followingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return {
      followers: followersCount?.count || 0,
      following: followingCount?.count || 0,
    };
  }

  // MiniMeet operations
  async createMiniMeet(data: InsertMiniMeet): Promise<MiniMeet> {
    const [newMiniMeet] = await db.insert(miniMeets).values(data).returning();
    return newMiniMeet;
  }

  async getMiniMeetsNearby(
    latitude: number, 
    longitude: number, 
    radius: number
  ): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] })[]> {
    // 기본 반경 내 모임 조회 (Haversine 공식 사용)
    const nearbyMeets = await db
      .select({
        id: miniMeets.id,
        hostId: miniMeets.hostId,
        title: miniMeets.title,
        placeName: miniMeets.placeName,
        latitude: miniMeets.latitude,
        longitude: miniMeets.longitude,
        startAt: miniMeets.startAt,
        maxPeople: miniMeets.maxPeople,
        visibility: miniMeets.visibility,
        createdAt: miniMeets.createdAt,
        updatedAt: miniMeets.updatedAt,
        hostName: users.name,
        hostEmail: users.email,
      })
      .from(miniMeets)
      .innerJoin(users, eq(miniMeets.hostId, users.id))
      .where(
        and(
          eq(miniMeets.visibility, 'public'),
          sql`${miniMeets.startAt} > NOW()`,
          sql`
            (6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(CAST(${miniMeets.latitude} AS FLOAT))) * 
              cos(radians(CAST(${miniMeets.longitude} AS FLOAT)) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(CAST(${miniMeets.latitude} AS FLOAT)))
            )) <= ${radius}
          `
        )
      )
      .orderBy(miniMeets.startAt);

    // 각 모임의 참석자 정보 추가
    const meetsWithData = await Promise.all(
      nearbyMeets.map(async (meet) => {
        const attendees = await this.getMiniMeetAttendees(meet.id);
        
        return {
          id: meet.id,
          hostId: meet.hostId,
          title: meet.title,
          placeName: meet.placeName,
          latitude: meet.latitude,
          longitude: meet.longitude,
          startAt: meet.startAt,
          maxPeople: meet.maxPeople,
          visibility: meet.visibility,
          createdAt: meet.createdAt,
          updatedAt: meet.updatedAt,
          host: {
            id: meet.hostId,
            name: meet.hostName,
            email: meet.hostEmail,
          } as User,
          attendees: attendees as MiniMeetAttendee[]
        };
      })
    );

    return meetsWithData;
  }

  async joinMiniMeet(meetId: number, userId: string): Promise<MiniMeetAttendee> {
    // 중복 참여 체크
    const existing = await db
      .select()
      .from(miniMeetAttendees)
      .where(
        and(
          eq(miniMeetAttendees.meetId, meetId),
          eq(miniMeetAttendees.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('이미 참여한 모임입니다');
    }

    // 정원 체크
    const [attendeesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(miniMeetAttendees)
      .where(eq(miniMeetAttendees.meetId, meetId));

    const [meet] = await db
      .select()
      .from(miniMeets)
      .where(eq(miniMeets.id, meetId))
      .limit(1);

    if (!meet) {
      throw new Error('존재하지 않는 모임입니다');
    }

    const currentCount = attendeesCount?.count || 0;
    const maxPeople = meet.maxPeople || 6;

    if (currentCount >= maxPeople) {
      throw new Error('정원이 가득 찼습니다');
    }

    // 참여 등록
    const [attendee] = await db
      .insert(miniMeetAttendees)
      .values({
        meetId,
        userId,
        status: 'going'
      })
      .returning();

    return attendee;
  }

  async leaveMiniMeet(meetId: number, userId: string): Promise<void> {
    await db
      .delete(miniMeetAttendees)
      .where(
        and(
          eq(miniMeetAttendees.meetId, meetId),
          eq(miniMeetAttendees.userId, userId)
        )
      );
  }

  async getMiniMeetAttendees(meetId: number): Promise<(MiniMeetAttendee & { user: User })[]> {
    const result = await db
      .select({
        id: miniMeetAttendees.id,
        meetId: miniMeetAttendees.meetId,
        userId: miniMeetAttendees.userId,
        joinedAt: miniMeetAttendees.joinedAt,
        status: miniMeetAttendees.status,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          profilePicture: users.profilePicture,
        }
      })
      .from(miniMeetAttendees)
      .innerJoin(users, eq(miniMeetAttendees.userId, users.id))
      .where(eq(miniMeetAttendees.meetId, meetId));

    return result.map(item => ({
      id: item.id,
      meetId: item.meetId,
      userId: item.userId,
      joinedAt: item.joinedAt,
      status: item.status,
      user: item.user as User
    }));
  }

  async getMiniMeetById(id: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] }) | undefined> {
    const [meet] = await db
      .select({
        id: miniMeets.id,
        hostId: miniMeets.hostId,
        title: miniMeets.title,
        placeName: miniMeets.placeName,
        latitude: miniMeets.latitude,
        longitude: miniMeets.longitude,
        startAt: miniMeets.startAt,
        maxPeople: miniMeets.maxPeople,
        visibility: miniMeets.visibility,
        createdAt: miniMeets.createdAt,
        updatedAt: miniMeets.updatedAt,
        host: {
          id: users.id,
          name: users.name,
          email: users.email,
          profilePicture: users.profilePicture,
        }
      })
      .from(miniMeets)
      .innerJoin(users, eq(miniMeets.hostId, users.id))
      .where(eq(miniMeets.id, id))
      .limit(1);

    if (!meet) return undefined;

    const attendees = await this.getMiniMeetAttendees(id);

    return {
      ...meet,
      host: meet.host as User,
      attendees: attendees as MiniMeetAttendee[]
    };
  }
}

export const storage = new DatabaseStorage();
