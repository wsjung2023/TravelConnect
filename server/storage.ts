import {
  users,
  experiences,
  posts,
  bookings,
  comments,
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
  channels,
  channelMembers,
  payments,
  type User,
  type UpsertUser,
  type InsertExperience,
  type Experience,
  type InsertPost,
  type Post,
  type InsertBooking,
  type Booking,
  type InsertComment,
  type Comment,
  type InsertMessage,
  type Message,
  type Conversation,
  type InsertTrip,
  type Trip,
  type InsertTimeline,
  type Timeline,
  type InsertReview,
  type Review,
  type SystemSetting,
  type InsertSystemSetting,
  type Notification,
  type InsertNotification,
  type Follow,
  type InsertFollow,
  type MiniMeet,
  type MiniMeetAttendee,
  type Payment,
  type InsertMiniMeet,
  type Channel,
  type InsertChannel,
  type ChannelMember,
  type InsertChannelMember,
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

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<Comment[]>;
  deleteComment(commentId: number, userId: string): Promise<boolean>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingById(id: number): Promise<Booking | undefined>;
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
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByExperience(experienceId: number): Promise<Review[]>;
  getReviewsByHost(hostId: string): Promise<Review[]>;

  // Guide Profile operations
  getGuideProfile(guideId: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    bio?: string;
    location?: string;
    isHost: boolean;
    totalExperiences: number;
    totalReviews: number;
    averageRating: number;
    responseRate: number;
    joinedAt: string;
  } | undefined>;

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
  createMiniMeet(data: InsertMiniMeet): Promise<MiniMeet>;
  getMiniMeetsNearby(latitude: number, longitude: number, radius: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] })[]>;
  joinMiniMeet(meetId: number, userId: string): Promise<MiniMeetAttendee>;
  leaveMiniMeet(meetId: number, userId: string): Promise<void>;
  getMiniMeetAttendees(meetId: number): Promise<(MiniMeetAttendee & { user: User })[]>;
  getMiniMeetById(id: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] }) | undefined>;

  // Channel operations (새로운 채널 시스템)
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannelsByUser(userId: string): Promise<Channel[]>;
  getChannelById(id: number): Promise<Channel | undefined>;
  addChannelMember(channelId: number, userId: string, role?: string): Promise<ChannelMember>;
  removeChannelMember(channelId: number, userId: string): Promise<void>;
  getChannelMembers(channelId: number): Promise<(ChannelMember & { user: User })[]>;
  
  // Message operations (기존 + 채널 지원)
  createChannelMessage(message: Omit<InsertMessage, 'conversationId'> & { channelId: number }): Promise<Message>;
  getMessagesByChannel(channelId: number, limit?: number, offset?: number): Promise<Message[]>;
  getThreadMessages(parentMessageId: number): Promise<Message[]>;

  // Admin Commerce operations
  getCommerceStats(): Promise<{
    totalExperiences: number;
    totalBookings: number;
    totalRevenue: number;
    totalHosts: number;
    averageRating: number;
    pendingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
  }>;
  getExperiencesWithHosts(): Promise<(Experience & { host?: { firstName?: string; lastName?: string } })[]>;
  getBookingsWithDetails(): Promise<(Booking & { 
    experienceTitle: string; 
    guestName: string; 
    hostName: string; 
  })[]>;
  getAllPayments(): Promise<Payment[]>;
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
      .select({
        id: experiences.id,
        hostId: experiences.hostId,
        title: experiences.title,
        description: experiences.description,
        price: experiences.price,
        currency: experiences.currency,
        location: experiences.location,
        latitude: experiences.latitude,
        longitude: experiences.longitude,
        category: experiences.category,
        duration: experiences.duration,
        maxParticipants: experiences.maxParticipants,
        images: experiences.images,
        included: experiences.included,
        requirements: experiences.requirements,
        rating: experiences.rating,
        reviewCount: experiences.reviewCount,
        isActive: experiences.isActive,
        createdAt: experiences.createdAt,
        updatedAt: experiences.updatedAt,
      })
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
      .orderBy(desc(posts.createdAt), desc(posts.id)) // ID로 2차 정렬 추가
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

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    // Create comment
    const [newComment] = await db.insert(comments).values(comment).returning();
    
    // Update comments count
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, comment.postId));

    // 포스트 정보 조회하여 알림 생성
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, comment.postId))
      .limit(1);

    if (post && post.userId !== comment.userId) {
      // 자신의 포스트가 아닐 때만 알림 생성
      const [commenter] = await db
        .select()
        .from(users)
        .where(eq(users.id, comment.userId))
        .limit(1);

      await this.createNotification({
        userId: post.userId,
        type: 'comment',
        title: '새로운 댓글',
        message: `${commenter?.firstName || '익명의 사용자'}님이 회원님의 포스트에 댓글을 남겼습니다`,
        relatedUserId: comment.userId,
        relatedPostId: comment.postId,
      });
    }

    return newComment;
  }

  async getCommentsByPost(postId: number): Promise<Comment[]> {
    try {
      // Raw SQL을 사용하여 Drizzle ORM 오류 회피
      const result = await db.execute(sql`
        SELECT id, post_id as "postId", user_id as "userId", content, created_at as "createdAt"
        FROM comments 
        WHERE post_id = ${postId} 
        ORDER BY created_at DESC
      `);
      return result.rows as any[];
    } catch (error) {
      console.error('댓글 조회 오류:', error);
      return [];
    }
  }

  async deleteComment(commentId: number, userId: string): Promise<boolean> {
    try {
      // Get comment to check ownership and postId
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!comment || comment.userId !== userId) {
        return false; // Comment not found or not owned by user
      }

      // Delete comment
      await db
        .delete(comments)
        .where(eq(comments.id, commentId));

      // Update comments count
      await db
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} - 1` })
        .where(eq(posts.id, comment.postId));

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    // 실제 존재하는 데이터베이스 컬럼만 사용하여 삽입
    const existingColumns = {
      experienceId: booking.experienceId,
      guestId: booking.guestId,
      hostId: booking.hostId,
      date: booking.date,
      participants: booking.participants,
      totalPrice: booking.totalPrice,
      status: booking.status || 'pending',
      specialRequests: booking.specialRequests,
    };
    
    const [newBooking] = await db.insert(bookings).values(existingColumns).returning();
    return newBooking;
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.guestId, guestId))
      .orderBy(desc(bookings.createdAt));
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    return booking;
  }

  async getBookingsByHost(hostId: string): Promise<Booking[]> {
    return await db
      .select({
        id: bookings.id,
        experienceId: bookings.experienceId,
        guestId: bookings.guestId,
        hostId: bookings.hostId,
        date: bookings.date,
        participants: bookings.participants,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        specialRequests: bookings.specialRequests,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
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
  async createReview(review: InsertReview): Promise<Review> {
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
          rating: Number(avgRating[0].avg.toFixed(2)),
          reviewCount: Number(avgRating[0].count),
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

  async getReviewsByHost(hostId: string): Promise<Review[]> {
    return await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        reviewerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        experienceTitle: experiences.title,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(experiences, eq(reviews.experienceId, experiences.id))
      .innerJoin(users, eq(sql`reviews.guest_id`, users.id))
      .where(eq(experiences.hostId, hostId))
      .orderBy(desc(reviews.createdAt));
  }

  async getGuideProfile(guideId: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    bio?: string;
    location?: string;
    isHost: boolean;
    totalExperiences: number;
    totalReviews: number;
    averageRating: number;
    responseRate: number;
    joinedAt: string;
  } | undefined> {
    // 기본 사용자 정보
    const user = await this.getUser(guideId);
    if (!user || !user.isHost) {
      return undefined;
    }

    // 경험 개수
    const experienceCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(experiences)
      .where(and(eq(experiences.hostId, guideId), eq(experiences.isActive, true)));

    // 후기 통계
    const reviewStats = await db
      .select({
        count: sql<number>`count(*)`,
        avgRating: sql<number>`avg(${reviews.rating})`,
      })
      .from(reviews)
      .innerJoin(experiences, eq(reviews.experienceId, experiences.id))
      .where(eq(experiences.hostId, guideId));

    // 응답률 계산 (간단히 95%로 설정, 실제로는 메시지 응답 시간을 계산해야 함)
    const responseRate = 95;

    return {
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      profileImageUrl: user.profileImageUrl || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
      isHost: user.isHost,
      totalExperiences: experienceCount[0]?.count || 0,
      totalReviews: reviewStats[0]?.count || 0,
      averageRating: Number(reviewStats[0]?.avgRating?.toFixed(1)) || 0,
      responseRate,
      joinedAt: user.createdAt?.toISOString() || new Date().toISOString(),
    };
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
        hostFirstName: users.firstName,
        hostLastName: users.lastName,
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
            firstName: meet.hostFirstName,
            lastName: meet.hostLastName,
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
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
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
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
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

  // 여행 ID로 조회
  async getTripById(tripId: number): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, tripId))
      .limit(1);
    
    return trip;
  }

  // 여행 복제 메서드
  async cloneTrip(originalTripId: number, newOwnerId: string, selectedDays?: number[]): Promise<Trip> {
    const originalTrip = await this.getTripById(originalTripId);
    if (!originalTrip) {
      throw new Error('원본 여행을 찾을 수 없습니다');
    }

    // 원본 일정에서 선택한 날짜의 itinerary만 추출
    let clonedItinerary = originalTrip.itinerary;
    if (selectedDays && selectedDays.length > 0) {
      if (Array.isArray(originalTrip.itinerary)) {
        clonedItinerary = originalTrip.itinerary.filter((dayPlan: any, index: number) => {
          return selectedDays.includes(index + 1); // 1-based index
        });
      }
    }

    const clonedTripData = {
      userId: newOwnerId,
      title: `${originalTrip.title} (복제본)`,
      destination: originalTrip.destination,
      startDate: new Date(), // 오늘 날짜로 설정
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1주일 후
      description: `원본: ${originalTrip.title} (${originalTrip.user?.firstName} ${originalTrip.user?.lastName})`,
      itinerary: clonedItinerary,
      isPublic: false, // 복제본은 기본적으로 비공개
    };

    const [newTrip] = await db.insert(trips).values(clonedTripData).returning();
    return newTrip;
  }

  // Channel operations implementation
  async createChannel(channel: InsertChannel): Promise<Channel> {
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
      await this.addChannelMember(newChannel.id, channel.ownerId, 'owner');
    }
    
    return newChannel;
  }

  async getChannelsByUser(userId: string): Promise<Channel[]> {
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

  async getChannelById(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async addChannelMember(channelId: number, userId: string, role: string = 'member'): Promise<ChannelMember> {
    const [member] = await db
      .insert(channelMembers)
      .values({ channelId, userId, role })
      .returning();
    return member;
  }

  async removeChannelMember(channelId: number, userId: string): Promise<void> {
    await db
      .delete(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, userId)
        )
      );
  }

  async getChannelMembers(channelId: number): Promise<(ChannelMember & { user: User })[]> {
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
      user: m.user,
    }));
  }

  // Message operations (채널 지원)
  async createChannelMessage(message: Omit<InsertMessage, 'conversationId'> & { channelId: number }): Promise<Message> {
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

  async getMessagesByChannel(channelId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const channelMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return channelMessages.reverse(); // 최신 메시지가 아래에 오도록
  }

  async getThreadMessages(parentMessageId: number): Promise<Message[]> {
    const threadMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.parentMessageId, parentMessageId))
      .orderBy(asc(messages.createdAt));

    return threadMessages;
  }

  // Admin Commerce operations
  async getCommerceStats(): Promise<{
    totalExperiences: number;
    totalBookings: number;
    totalRevenue: number;
    totalHosts: number;
    averageRating: number;
    pendingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
  }> {
    // 경험 총 개수
    const totalExperiencesResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(experiences);
    const totalExperiences = totalExperiencesResult[0]?.count || 0;

    // 예약 총 개수
    const totalBookingsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings);
    const totalBookings = totalBookingsResult[0]?.count || 0;

    // 예약 상태별 개수
    const bookingStatsResult = await db
      .select({
        status: bookings.status,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .groupBy(bookings.status);
    
    const pendingBookings = bookingStatsResult.find(s => s.status === 'pending')?.count || 0;
    const completedBookings = bookingStatsResult.find(s => s.status === 'completed')?.count || 0;
    const cancelledBookings = bookingStatsResult.find(s => s.status === 'cancelled')?.count || 0;

    // 총 매출 (성공한 결제 기준)
    const totalRevenueResult = await db
      .select({ sum: sql<number>`COALESCE(SUM(CAST(amount AS INTEGER)), 0)::int` })
      .from(payments)
      .where(eq(payments.status, 'captured'));
    const totalRevenue = totalRevenueResult[0]?.sum || 0;

    // 활성 호스트 수 (경험을 등록한 사용자)
    const totalHostsResult = await db
      .select({ count: sql<number>`count(distinct host_id)::int` })
      .from(experiences);
    const totalHosts = totalHostsResult[0]?.count || 0;

    // 평균 평점
    const averageRatingResult = await db
      .select({ avg: sql<number>`COALESCE(AVG(CAST(rating AS FLOAT)), 0)` })
      .from(reviews);
    const averageRating = averageRatingResult[0]?.avg || 0;

    // 결제 총 개수
    const totalPaymentsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments);
    const totalPayments = totalPaymentsResult[0]?.count || 0;

    // 결제 상태별 개수
    const paymentStatsResult = await db
      .select({
        status: payments.status,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .groupBy(payments.status);
    
    const successfulPayments = paymentStatsResult.find(s => s.status === 'captured')?.count || 0;
    const failedPayments = paymentStatsResult.find(s => s.status === 'failed')?.count || 0;
    const pendingPayments = paymentStatsResult.find(s => s.status === 'pending')?.count || 0;

    return {
      totalExperiences,
      totalBookings,
      totalRevenue,
      totalHosts,
      averageRating,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
    };
  }

  async getExperiencesWithHosts(): Promise<(Experience & { host?: { firstName?: string; lastName?: string } })[]> {
    const experiencesWithHosts = await db
      .select({
        id: experiences.id,
        hostId: experiences.hostId,
        title: experiences.title,
        description: experiences.description,
        category: experiences.category,
        location: experiences.location,
        latitude: experiences.latitude,
        longitude: experiences.longitude,
        price: experiences.price,
        currency: experiences.currency,
        duration: experiences.duration,
        maxParticipants: experiences.maxParticipants,
        availableDates: experiences.availableDates,
        images: experiences.images,
        amenities: experiences.amenities,
        rating: experiences.rating,
        reviewCount: experiences.reviewCount,
        isActive: experiences.isActive,
        createdAt: experiences.createdAt,
        updatedAt: experiences.updatedAt,
        host: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(experiences)
      .leftJoin(users, eq(experiences.hostId, users.id))
      .orderBy(desc(experiences.createdAt));

    return experiencesWithHosts;
  }

  async getBookingsWithDetails(): Promise<(Booking & { 
    experienceTitle: string; 
    guestName: string; 
    hostName: string; 
  })[]> {
    const bookingsWithDetails = await db
      .select({
        id: bookings.id,
        experienceId: bookings.experienceId,
        guestId: bookings.guestId,
        hostId: bookings.hostId,
        date: bookings.date,
        participants: bookings.participants,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        experienceTitle: experiences.title,
        guestName: sql<string>`guest.first_name || ' ' || guest.last_name`,
        hostName: sql<string>`host.first_name || ' ' || host.last_name`,
      })
      .from(bookings)
      .leftJoin(experiences, eq(bookings.experienceId, experiences.id))
      .leftJoin(sql`users guest`, eq(bookings.guestId, sql`guest.id`))
      .leftJoin(sql`users host`, eq(bookings.hostId, sql`host.id`))
      .orderBy(desc(bookings.createdAt));

    return bookingsWithDetails;
  }

  async getAllPayments(): Promise<Payment[]> {
    const allPayments = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));

    return allPayments;
  }
}

export const storage = new DatabaseStorage();
