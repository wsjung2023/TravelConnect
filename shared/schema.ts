import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)]
);

// User storage table - 이메일/비밀번호 로그인 지원
export const users = pgTable('users', {
  id: varchar('id').primaryKey().notNull(),
  email: varchar('email').unique().notNull(),
  password: varchar('password'), // 이메일 로그인용 해시된 비밀번호
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  bio: text('bio'),
  location: varchar('location'),
  isHost: boolean('is_host').default(false),
  role: varchar('role').default('user'), // admin, user
  authProvider: varchar('auth_provider').default('email'), // email, google, replit
  isEmailVerified: boolean('is_email_verified').default(false),
  openToMeet: boolean('open_to_meet').default(false),
  regionCode: varchar('region_code'),
  openUntil: timestamp('open_until'), // 자동 만료 시간
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const experiences = pgTable('experiences', {
  id: serial('id').primaryKey(),
  hostId: varchar('host_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title').notNull(),
  description: text('description').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency').default('KRW'),
  location: varchar('location').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  category: varchar('category').notNull(), // tour, food, activity, tip
  duration: integer('duration'), // in minutes
  maxParticipants: integer('max_participants'),
  images: text('images').array(),
  included: text('included').array(),
  requirements: text('requirements').array(),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer('review_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title'),
  content: text('content'),
  images: text('images').array(),
  videos: text('videos').array(),
  location: varchar('location'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  day: integer('day'),
  takenAt: timestamp('taken_at'), // EXIF에서 추출된 촬영 시간
  shape: varchar('shape').default('none'),
  theme: varchar('theme'),
  postDate: varchar('post_date'),
  postTime: varchar('post_time'),
  tags: text('tags').array(),
  experienceId: integer('experience_id').references(() => experiences.id),
  timelineId: integer('timeline_id').references(() => timelines.id),
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  experienceId: integer('experience_id')
    .notNull()
    .references(() => experiences.id),
  guestId: varchar('guest_id')
    .notNull()
    .references(() => users.id),
  hostId: varchar('host_id')
    .notNull()
    .references(() => users.id),
  date: timestamp('date').notNull(),
  participants: integer('participants').notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status').default('pending'), // pending, confirmed, completed, cancelled
  specialRequests: text('special_requests'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  participant1Id: varchar('participant1_id')
    .notNull()
    .references(() => users.id),
  participant2Id: varchar('participant2_id')
    .notNull()
    .references(() => users.id),
  lastMessageId: integer('last_message_id'),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => conversations.id),
  senderId: varchar('sender_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  messageType: varchar('message_type').default('text'), // text, image, booking
  metadata: jsonb('metadata'), // for booking requests, image urls, etc
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  experienceId: integer('experience_id')
    .notNull()
    .references(() => experiences.id),
  guestId: varchar('guest_id')
    .notNull()
    .references(() => users.id),
  hostId: varchar('host_id')
    .notNull()
    .references(() => users.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// 여행 타임라인 테이블 - 여행 단위 관리
export const timelines = pgTable('timelines', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title').notNull(),
  destination: varchar('destination'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  coverImage: varchar('cover_image'),
  description: text('description'),
  isPublic: boolean('is_public').default(true),
  totalDays: integer('total_days').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title').notNull(),
  destination: varchar('destination').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  description: text('description'),
  itinerary: jsonb('itinerary'), // array of day plans
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  experiences: many(experiences),
  posts: many(posts),
  bookingsAsGuest: many(bookings, { relationName: 'guestBookings' }),
  bookingsAsHost: many(bookings, { relationName: 'hostBookings' }),
  trips: many(trips),
  timelines: many(timelines),
  likes: many(likes),
  reviews: many(reviews),
}));

export const experienceRelations = relations(experiences, ({ one, many }) => ({
  host: one(users, { fields: [experiences.hostId], references: [users.id] }),
  bookings: many(bookings),
  posts: many(posts),
  reviews: many(reviews),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  experience: one(experiences, {
    fields: [posts.experienceId],
    references: [experiences.id],
  }),
  timeline: one(timelines, {
    fields: [posts.timelineId],
    references: [timelines.id],
  }),
  likes: many(likes),
}));

export const timelineRelations = relations(timelines, ({ one, many }) => ({
  user: one(users, { fields: [timelines.userId], references: [users.id] }),
  posts: many(posts),
}));

export const bookingRelations = relations(bookings, ({ one }) => ({
  experience: one(experiences, {
    fields: [bookings.experienceId],
    references: [experiences.id],
  }),
  guest: one(users, {
    fields: [bookings.guestId],
    references: [users.id],
    relationName: 'guestBookings',
  }),
  host: one(users, {
    fields: [bookings.hostId],
    references: [users.id],
    relationName: 'hostBookings',
  }),
}));

export const conversationRelations = relations(
  conversations,
  ({ one, many }) => ({
    participant1: one(users, {
      fields: [conversations.participant1Id],
      references: [users.id],
    }),
    participant2: one(users, {
      fields: [conversations.participant2Id],
      references: [users.id],
    }),
    messages: many(messages),
  })
);

export const messageRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const tripRelations = relations(trips, ({ one }) => ({
  user: one(users, { fields: [trips.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({
  id: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().max(50, '제목은 최대 50글자입니다').optional(),
  content: z.string().max(700, '설명은 최대 700글자입니다').optional(),
  day: z.number().min(1).max(999).optional(),
  images: z
    .array(z.string())
    .max(10, '이미지는 최대 10개까지 업로드 가능합니다')
    .optional(),
  videos: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  timelineId: z.number().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTimelineSchema = createInsertSchema(timelines, {
  startDate: z
    .union([z.string(), z.date()])
    .transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  endDate: z
    .union([z.string(), z.date(), z.null()])
    .transform((val) =>
      val === null ? null : typeof val === 'string' ? new Date(val) : val
    )
    .optional(),
  title: z
    .string()
    .min(1, '타임라인 제목은 필수입니다')
    .max(100, '제목은 최대 100글자입니다'),
  description: z.string().max(300, '설명은 최대 300글자입니다').optional(),
  totalDays: z.number().min(1).max(999).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type Experience = typeof experiences.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertTimeline = z.infer<typeof insertTimelineSchema>;
export type Timeline = typeof timelines.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type Review = typeof reviews.$inferSelect;

// 시스템 설정값 관리 테이블 - 하드코딩 대신 DB로 관리
export const systemSettings = pgTable('system_settings', {
  id: varchar('id').primaryKey(),
  category: varchar('category').notNull(), // 예: 'oauth', 'api', 'ui', 'business'
  key: varchar('key').notNull(),
  value: varchar('value').notNull(),
  description: varchar('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertSystemSettingSchema = createInsertSchema(
  systemSettings
).omit({
  createdAt: true,
  updatedAt: true,
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// 알림 시스템
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  type: varchar('type', { enum: ['feed', 'help', 'chat', 'follow', 'reaction', 'promotion', 'comment'] })
    .notNull(),
  title: varchar('title').notNull(),
  message: text('message').notNull(),
  location: varchar('location'),
  isRead: boolean('is_read').default(false),
  relatedUserId: varchar('related_user_id').references(() => users.id), // 알림과 관련된 사용자 (좋아요를 한 사람, 메시지를 보낸 사람 등)
  relatedPostId: integer('related_post_id').references(() => posts.id), // 관련된 포스트
  relatedConversationId: integer('related_conversation_id').references(() => conversations.id), // 관련된 대화
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// 팔로우/팔로잉 시스템
export const follows = pgTable('follows', {
  id: serial('id').primaryKey(),
  followerId: varchar('follower_id')
    .notNull()
    .references(() => users.id), // 팔로우하는 사용자
  followingId: varchar('following_id')
    .notNull()
    .references(() => users.id), // 팔로우당하는 사용자
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

// 관계 정의
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  experiences: many(experiences),
  bookings: many(bookings),
  reviews: many(reviews),
  notifications: many(notifications),
  followers: many(follows, { relationName: 'userFollowers' }),
  following: many(follows, { relationName: 'userFollowing' }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'userFollowers',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id], 
    relationName: 'userFollowing',
  }),
}));

// MiniMeet 테이블 - 경량 모임
export const miniMeets = pgTable('mini_meets', {
  id: serial('id').primaryKey(),
  hostId: varchar('host_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title').notNull(),
  placeName: varchar('place_name').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  startAt: timestamp('start_at').notNull(),
  maxPeople: integer('max_people').default(6),
  visibility: varchar('visibility').default('public'), // 'public', 'friends'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// MiniMeet 참석자 테이블
export const miniMeetAttendees = pgTable('mini_meet_attendees', {
  id: serial('id').primaryKey(),
  meetId: integer('meet_id')
    .notNull()
    .references(() => miniMeets.id),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow(),
  status: varchar('status').default('going'), // 'going', 'wait'
}, (table) => [
  index('IDX_mini_meet_attendees_meet_id').on(table.meetId),
  index('IDX_mini_meet_attendees_user_id').on(table.userId),
]);


// Zod 스키마
export const insertMiniMeetSchema = createInsertSchema(miniMeets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMiniMeetAttendeeSchema = createInsertSchema(miniMeetAttendees).omit({
  id: true,
  joinedAt: true,
});

// 타입 정의
export type MiniMeet = typeof miniMeets.$inferSelect;
export type InsertMiniMeet = z.infer<typeof insertMiniMeetSchema>;
export type MiniMeetAttendee = typeof miniMeetAttendees.$inferSelect;
export type InsertMiniMeetAttendee = z.infer<typeof insertMiniMeetAttendeeSchema>;

// MiniMeet 관계 설정
export const miniMeetsRelations = relations(miniMeets, ({ one, many }) => ({
  host: one(users, {
    fields: [miniMeets.hostId],
    references: [users.id],
  }),
  attendees: many(miniMeetAttendees),
}));

export const miniMeetAttendeesRelations = relations(miniMeetAttendees, ({ one }) => ({
  meet: one(miniMeets, {
    fields: [miniMeetAttendees.meetId],
    references: [miniMeets.id],
  }),
  user: one(users, {
    fields: [miniMeetAttendees.userId],
    references: [users.id],
  }),
}));

