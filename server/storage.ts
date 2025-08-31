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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, like } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Experience operations
  createExperience(experience: InsertExperience): Promise<Experience>;
  getExperiences(location?: string, category?: string): Promise<Experience[]>;
  getExperienceById(id: number): Promise<Experience | undefined>;
  getExperiencesByHost(hostId: string): Promise<Experience[]>;
  updateExperience(id: number, updates: Partial<InsertExperience>): Promise<Experience | undefined>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  getPostsByUser(userId: string): Promise<Post[]>;
  toggleLike(userId: string, postId: number): Promise<boolean>;
  
  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getBookingsByHost(hostId: string): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  
  // Chat operations
  getOrCreateConversation(participant1Id: string, participant2Id: string): Promise<Conversation>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  
  // Timeline operations
  createTimeline(timeline: InsertTimeline): Promise<Timeline>;
  getTimelinesByUser(userId: string): Promise<Timeline[]>;
  getTimelineById(id: number): Promise<Timeline | undefined>;
  updateTimeline(id: number, updates: Partial<InsertTimeline>): Promise<Timeline | undefined>;
  deleteTimeline(id: number): Promise<boolean>;
  getTimelineWithPosts(id: number): Promise<Timeline & { posts: Post[] } | undefined>;
  
  // Trip operations
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripsByUser(userId: string): Promise<Trip[]>;
  updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip | undefined>;
  
  // Review operations
  createReview(review: { experienceId: number; guestId: string; hostId: string; rating: number; comment?: string }): Promise<Review>;
  getReviewsByExperience(experienceId: number): Promise<Review[]>;
  
  // System Settings operations
  getSystemSetting(category: string, key: string): Promise<string | undefined>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getAllSystemSettings(category?: string): Promise<SystemSetting[]>;
  updateSystemSetting(id: string, updates: Partial<InsertSystemSetting>): Promise<SystemSetting | undefined>;
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
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
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

  // Experience operations
  async createExperience(experience: InsertExperience): Promise<Experience> {
    const [newExperience] = await db
      .insert(experiences)
      .values(experience)
      .returning();
    return newExperience;
  }

  async getExperiences(location?: string, category?: string): Promise<Experience[]> {
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

  async updateExperience(id: number, updates: Partial<InsertExperience>): Promise<Experience | undefined> {
    const [experience] = await db
      .update(experiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(experiences.id, id))
      .returning();
    return experience;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values(post)
      .returning();
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
      await db
        .insert(likes)
        .values({ userId, postId });
      
      await db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));
      
      return true;
    }
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values(booking)
      .returning();
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

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Chat operations
  async getOrCreateConversation(participant1Id: string, participant2Id: string): Promise<Conversation> {
    // Look for existing conversation
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participant1Id, participant1Id), eq(conversations.participant2Id, participant2Id)),
          and(eq(conversations.participant1Id, participant2Id), eq(conversations.participant2Id, participant1Id))
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
      .where(or(eq(conversations.participant1Id, userId), eq(conversations.participant2Id, userId)))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    // Update conversation last message
    await db
      .update(conversations)
      .set({ 
        lastMessageId: newMessage.id,
        lastMessageAt: new Date()
      })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
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

  async updateTimeline(id: number, updates: Partial<InsertTimeline>): Promise<Timeline | undefined> {
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

  async getTimelineWithPosts(id: number): Promise<Timeline & { posts: Post[] } | undefined> {
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
    const [newTrip] = await db
      .insert(trips)
      .values(trip)
      .returning();
    return newTrip;
  }

  async getTripsByUser(userId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.userId, userId))
      .orderBy(desc(trips.startDate));
  }

  async updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [trip] = await db
      .update(trips)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(trips.id, id))
      .returning();
    return trip;
  }

  // Review operations
  async createReview(review: { experienceId: number; guestId: string; hostId: string; rating: number; comment?: string }): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values(review)
      .returning();

    // Update experience rating
    const avgRating = await db
      .select({ avg: sql<number>`avg(${reviews.rating})`, count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.experienceId, review.experienceId));

    if (avgRating[0]) {
      await db
        .update(experiences)
        .set({ 
          rating: avgRating[0].avg.toFixed(2),
          reviewCount: avgRating[0].count
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
  async getSystemSetting(category: string, key: string): Promise<string | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.category, category),
        eq(systemSettings.key, key),
        eq(systemSettings.isActive, true)
      ));
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

  async updateSystemSetting(id: string, updates: Partial<InsertSystemSetting>): Promise<SystemSetting | undefined> {
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
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      throw new Error(`SQL 실행 오류: ${error.message}`);
    }
  }
}

export const storage = new DatabaseStorage();
