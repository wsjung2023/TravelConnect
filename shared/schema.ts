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
  date,
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
  category: varchar('category').notNull(), // tour, food, activity, tip, shopping
  duration: integer('duration'), // in minutes
  maxParticipants: integer('max_participants'),
  images: text('images').array(),
  included: text('included').array(),
  requirements: text('requirements').array(),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  reviewCount: integer('review_count').default(0),
  isActive: boolean('is_active').default(true),
  // 커머스 확장 필드
  cancelPolicy: varchar('cancel_policy').default('flexible'), // flexible, moderate, strict
  minLeadHours: integer('min_lead_hours').default(24), // 최소 예약 시간 (시간 단위)
  meetingPoint: varchar('meeting_point'), // 만날 장소
  contactPhone: varchar('contact_phone'), // 연락처
  autoConfirm: boolean('auto_confirm').default(true), // 자동 승인 여부
  // 구매대행 전용 필드들
  specialtyAreas: text('specialty_areas').array(), // 전문 분야: ['cosmetics', 'clothing', 'food', 'souvenirs']
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }), // 수수료율 (%)
  shippingInfo: text('shipping_info'), // 배송 정보
  supportedCountries: text('supported_countries').array(), // 지원 국가들
  processingTime: varchar('processing_time'), // 처리 시간 (예: "1-3 days")
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
  // 커머스 확장 필드
  // slotId: integer('slot_id').references(() => experienceSlots.id), // 주석처리 - DB에 컬럼 없음
  paymentStatus: varchar('payment_status').default('pending'), // pending, paid, failed, refunded
  expiresAt: timestamp('expires_at'), // 결제 대기 만료 시간
  cancelReason: text('cancel_reason'),
  cancelledAt: timestamp('cancelled_at'),
  confirmedAt: timestamp('confirmed_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 커머스 테이블들

// 경험 시간 슬롯 관리
export const experienceSlots = pgTable('experience_slots', {
  id: serial('id').primaryKey(),
  experienceId: integer('experience_id')
    .notNull()
    .references(() => experiences.id),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  capacity: integer('capacity').notNull(),
  priceOverride: decimal('price_override', { precision: 10, scale: 2 }), // null이면 기본 가격 사용
  currency: varchar('currency').default('KRW'),
  remaining: integer('remaining').notNull(), // 남은 자리
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_experience_slots_experience_id').on(table.experienceId),
  index('IDX_experience_slots_start_at').on(table.startAt),
]);

// 결제 정보
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id),
  provider: varchar('provider').notNull(), // 'paypal', 'toss', 'mock'
  intentId: varchar('intent_id'), // 결제 프로바이더의 결제 Intent ID
  chargeId: varchar('charge_id'), // 실제 차지 ID
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency').default('KRW'),
  status: varchar('status').default('pending'), // pending, authorized, captured, failed, refunded
  receiptUrl: varchar('receipt_url'), // 영수증 URL
  metadata: jsonb('metadata'), // 프로바이더별 추가 정보
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_payments_booking_id').on(table.bookingId),
  index('IDX_payments_status').on(table.status),
]);


// 환불 기록
export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id')
    .notNull()
    .references(() => payments.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  reason: varchar('reason'), // customer_request, cancellation, etc
  status: varchar('status').default('pending'), // pending, processed, failed
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_refunds_payment_id').on(table.paymentId),
]);

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

// 채널 시스템 - 그룹 채팅, 토픽 채널, DM 통합 관리
export const channels = pgTable('channels', {
  id: serial('id').primaryKey(),
  type: varchar('type', { enum: ['dm', 'group', 'topic'] }).notNull().default('dm'),
  name: varchar('name'), // 그룹/토픽 채널명 (DM은 null)
  description: text('description'), // 채널 설명
  ownerId: varchar('owner_id').references(() => users.id),
  isPrivate: boolean('is_private').default(false),
  // bookingId: integer('booking_id').references(() => bookings.id), // 예약 관련 채팅 - 주석처리 (DB에 컬럼 없음)
  lastMessageId: integer('last_message_id'),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 채널 멤버십 관리
export const channelMembers = pgTable('channel_members', {
  id: serial('id').primaryKey(),
  channelId: integer('channel_id')
    .notNull()
    .references(() => channels.id),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  role: varchar('role').default('member'), // owner, admin, member
  joinedAt: timestamp('joined_at').defaultNow(),
  lastReadAt: timestamp('last_read_at').defaultNow(),
}, (table) => [
  index('IDX_channel_members_channel_id').on(table.channelId),
  index('IDX_channel_members_user_id').on(table.userId),
]);

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .references(() => conversations.id), // 기존 1:1 DM용 (하위 호환)
  channelId: integer('channel_id')
    .references(() => channels.id), // 새로운 채널 시스템용
  senderId: varchar('sender_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  messageType: varchar('message_type').default('text'), // text, image, booking, thread
  parentMessageId: integer('parent_message_id'), // 스레드 지원 - self reference
  metadata: jsonb('metadata'), // for booking requests, image urls, etc
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_messages_conversation_id').on(table.conversationId),
  index('IDX_messages_channel_id').on(table.channelId),
  index('IDX_messages_parent_message_id').on(table.parentMessageId),
]);

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
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_reviews_experience_id').on(table.experienceId),
  index('IDX_reviews_guest_id').on(table.guestId),
]);

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
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  parentMessage: one(messages, {
    fields: [messages.parentMessageId],
    references: [messages.id],
  }),
}));

// 채널 관계 정의
export const channelRelations = relations(channels, ({ one, many }) => ({
  owner: one(users, {
    fields: [channels.ownerId],
    references: [users.id],
  }),
  // booking: one(bookings, {
  //   fields: [channels.bookingId],
  //   references: [bookings.id],
  // }), // 주석처리 - bookingId 필드가 DB에 없음
  members: many(channelMembers),
  messages: many(messages),
}));

export const channelMemberRelations = relations(channelMembers, ({ one }) => ({
  channel: one(channels, {
    fields: [channelMembers.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [channelMembers.userId],
    references: [users.id],
  }),
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
}).extend({
  date: z.coerce.date(), // 문자열을 Date 객체로 자동 변환
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

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().min(1, '평점은 1점 이상이어야 합니다').max(5, '평점은 5점 이하여야 합니다'),
  comment: z.string().min(10, '후기는 최소 10글자 이상 작성해주세요').max(500, '후기는 최대 500글자까지 작성 가능합니다').optional(),
  images: z.array(z.string()).max(5, '이미지는 최대 5개까지 업로드 가능합니다').optional(),
}).omit({
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
export type InsertReview = z.infer<typeof insertReviewSchema>;
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

// 채널 시스템 스키마 및 타입
export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChannelMemberSchema = createInsertSchema(channelMembers).omit({
  id: true,
  joinedAt: true,
});

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;

// 관계 정의
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  experiences: many(experiences),
  bookings: many(bookings),
  reviews: many(reviews),
  notifications: many(notifications),
  followers: many(follows, { relationName: 'userFollowers' }),
  following: many(follows, { relationName: 'userFollowing' }),
  ownedChannels: many(channels),
  channelMemberships: many(channelMembers),
}));

// 커머스 관계 설정
export const experiencesRelations = relations(experiences, ({ one, many }) => ({
  host: one(users, {
    fields: [experiences.hostId],
    references: [users.id],
  }),
  slots: many(experienceSlots),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const experienceSlotsRelations = relations(experienceSlots, ({ one }) => ({
  experience: one(experiences, {
    fields: [experienceSlots.experienceId],
    references: [experiences.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  experience: one(experiences, {
    fields: [bookings.experienceId],
    references: [experiences.id],
  }),
  guest: one(users, {
    fields: [bookings.guestId],
    references: [users.id],
  }),
  host: one(users, {
    fields: [bookings.hostId],
    references: [users.id],
  }),
  // slot: one(experienceSlots, {
  //   fields: [bookings.slotId],
  //   references: [experienceSlots.id],
  // }), // 주석처리 - slotId 필드가 DB에 없음
  payments: many(payments),
  reviews: many(reviews),
  channels: many(channels),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  refunds: many(refunds),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  experience: one(experiences, {
    fields: [reviews.experienceId],
    references: [experiences.id],
  }),
  guest: one(users, {
    fields: [reviews.guestId],
    references: [users.id],
    relationName: 'reviewGuest',
  }),
  host: one(users, {
    fields: [reviews.hostId],
    references: [users.id],
    relationName: 'reviewHost',
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
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

// 구매대행 서비스 테이블들
export const purchaseRequests = pgTable('purchase_requests', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id')
    .notNull()
    .references(() => experiences.id), // shopping 카테고리 경험 참조
  buyerId: varchar('buyer_id')
    .notNull()
    .references(() => users.id),
  sellerId: varchar('seller_id')
    .notNull()
    .references(() => users.id),
  productName: varchar('product_name').notNull(),
  productDescription: text('product_description'),
  productUrl: text('product_url'), // 상품 링크
  productImages: text('product_images').array(),
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  currency: varchar('currency').default('KRW'),
  quantity: integer('quantity').default(1),
  urgency: varchar('urgency').default('normal'), // urgent, normal, flexible
  deliveryAddress: text('delivery_address'),
  specialInstructions: text('special_instructions'),
  status: varchar('status').default('pending'), // pending, quoted, accepted, purchased, shipped, completed, cancelled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const purchaseQuotes = pgTable('purchase_quotes', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id')
    .notNull()
    .references(() => purchaseRequests.id),
  sellerId: varchar('seller_id')
    .notNull()
    .references(() => users.id),
  productPrice: decimal('product_price', { precision: 10, scale: 2 }).notNull(),
  commissionFee: decimal('commission_fee', { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  estimatedDelivery: varchar('estimated_delivery'), // "3-5 days"
  paymentMethod: varchar('payment_method'), // paypal, bank_transfer, etc
  notes: text('notes'),
  validUntil: timestamp('valid_until'),
  status: varchar('status').default('pending'), // pending, accepted, rejected, expired
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id')
    .notNull()
    .references(() => purchaseRequests.id),
  quoteId: integer('quote_id')
    .notNull()
    .references(() => purchaseQuotes.id),
  buyerId: varchar('buyer_id')
    .notNull()
    .references(() => users.id),
  sellerId: varchar('seller_id')
    .notNull()
    .references(() => users.id),
  orderNumber: varchar('order_number').notNull().unique(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar('payment_status').default('pending'), // pending, paid, refunded
  orderStatus: varchar('order_status').default('confirmed'), // confirmed, purchased, shipped, delivered, completed
  purchaseProof: text('purchase_proof').array(), // 구매 인증샷
  qualityCheckImages: text('quality_check_images').array(), // 품질 확인 사진
  trackingNumber: varchar('tracking_number'), // 배송 추적번호
  shippingMethod: varchar('shipping_method'), // international_shipping, direct_delivery
  estimatedDelivery: date('estimated_delivery'),
  actualDelivery: date('actual_delivery'),
  buyerNotes: text('buyer_notes'),
  sellerNotes: text('seller_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_purchase_orders_buyer_id').on(table.buyerId),
  index('IDX_purchase_orders_seller_id').on(table.sellerId),
  index('IDX_purchase_orders_status').on(table.orderStatus),
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

// 커머스 테이블 Zod 스키마
export const insertExperienceSlotSchema = createInsertSchema(experienceSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
});

// 커머스 타입 정의
export type ExperienceSlot = typeof experienceSlots.$inferSelect;
export type InsertExperienceSlot = z.infer<typeof insertExperienceSlotSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;

// 구매대행 서비스 Zod 스키마
export const insertPurchaseRequestSchema = createInsertSchema(purchaseRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseQuoteSchema = createInsertSchema(purchaseQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 구매대행 서비스 타입 정의
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = z.infer<typeof insertPurchaseRequestSchema>;
export type PurchaseQuote = typeof purchaseQuotes.$inferSelect;
export type InsertPurchaseQuote = z.infer<typeof insertPurchaseQuoteSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

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

// 구매대행 서비스 관계 설정
export const purchaseRequestsRelations = relations(purchaseRequests, ({ one, many }) => ({
  service: one(experiences, {
    fields: [purchaseRequests.serviceId],
    references: [experiences.id],
  }),
  buyer: one(users, {
    fields: [purchaseRequests.buyerId],
    references: [users.id],
    relationName: 'purchaseRequestBuyer',
  }),
  seller: one(users, {
    fields: [purchaseRequests.sellerId],
    references: [users.id],
    relationName: 'purchaseRequestSeller',
  }),
  quotes: many(purchaseQuotes),
  orders: many(purchaseOrders),
}));

export const purchaseQuotesRelations = relations(purchaseQuotes, ({ one }) => ({
  request: one(purchaseRequests, {
    fields: [purchaseQuotes.requestId],
    references: [purchaseRequests.id],
  }),
  seller: one(users, {
    fields: [purchaseQuotes.sellerId],
    references: [users.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  request: one(purchaseRequests, {
    fields: [purchaseOrders.requestId],
    references: [purchaseRequests.id],
  }),
  quote: one(purchaseQuotes, {
    fields: [purchaseOrders.quoteId],
    references: [purchaseQuotes.id],
  }),
  buyer: one(users, {
    fields: [purchaseOrders.buyerId],
    references: [users.id],
    relationName: 'purchaseOrderBuyer',
  }),
  seller: one(users, {
    fields: [purchaseOrders.sellerId],
    references: [users.id],
    relationName: 'purchaseOrderSeller',
  }),
}));
