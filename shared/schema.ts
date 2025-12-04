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
import { relations, sql } from 'drizzle-orm';
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
  // 업그레이드용 새 컬럼들
  userType: varchar('user_type', { length: 20 }).default('traveler'), // 'traveler', 'influencer', 'host'
  interests: text('interests').array(),
  languages: text('languages').array().default(sql`'{"ko"}'`),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('ko'), // 번역 선호 언어
  timezone: varchar('timezone', { length: 50 }).default('Asia/Seoul'),
  publicProfileUrl: varchar('public_profile_url', { length: 200 }), // link-in-bio URL
  portfolioMode: boolean('portfolio_mode').default(false),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  // Serendipity Protocol 관련 컬럼
  serendipityEnabled: boolean('serendipity_enabled').default(true),
  lastLatitude: decimal('last_latitude', { precision: 10, scale: 8 }),
  lastLongitude: decimal('last_longitude', { precision: 11, scale: 8 }),
  lastLocationUpdatedAt: timestamp('last_location_updated_at'),
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
  // 업그레이드용 새 컬럼들
  templateType: varchar('template_type', { length: 50 }), // 'custom_planning', 'food_guide', 'photo_companion'
  isTemplate: boolean('is_template').default(false),
  deliveryMethod: varchar('delivery_method', { length: 30 }).default('in_person'), // 'in_person', 'digital', 'hybrid'
  quickBookEnabled: boolean('quick_book_enabled').default(true),
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

export const postMedia = pgTable('post_media', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  url: varchar('url').notNull(),
  type: varchar('type').notNull(), // 'image' or 'video'
  orderIndex: integer('order_index').default(0),
  exifDatetime: timestamp('exif_datetime'),
  exifLatitude: decimal('exif_latitude', { precision: 10, scale: 8 }),
  exifLongitude: decimal('exif_longitude', { precision: 11, scale: 8 }),
  exifMetadata: jsonb('exif_metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_post_media_post_id').on(table.postId),
]);

export const cinemapJobs = pgTable('cinemap_jobs', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  timelineId: integer('timeline_id')
    .references(() => timelines.id),
  status: varchar('status').default('pending'), // pending, processing, completed, failed
  resultVideoUrl: varchar('result_video_url'),
  storyboard: jsonb('storyboard'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_cinemap_jobs_user_id').on(table.userId),
  index('IDX_cinemap_jobs_timeline_id').on(table.timelineId),
  index('IDX_cinemap_jobs_status').on(table.status),
]);

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  experienceId: integer('experience_id')
    .references(() => experiences.id),
  slotId: integer('slot_id')
    .references(() => slots.id),
  guestId: varchar('guest_id')
    .notNull()
    .references(() => users.id),
  hostId: varchar('host_id')
    .notNull()
    .references(() => users.id),
  date: timestamp('date').notNull(),
  participants: integer('participants').notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status').default('pending'), // pending, confirmed, completed, cancelled, declined
  specialRequests: text('special_requests'),
  // 커머스 확장 필드
  paymentStatus: varchar('payment_status').default('pending'), // pending, paid, failed, refunded
  expiresAt: timestamp('expires_at'), // 결제 대기 만료 시간
  cancelReason: text('cancel_reason'),
  cancelledAt: timestamp('cancelled_at'),
  confirmedAt: timestamp('confirmed_at'),
  completedAt: timestamp('completed_at'),
  declinedAt: timestamp('declined_at'),
  // 추가 필드
  guestName: varchar('guest_name'), // 예약자 이름 (비회원 예약 지원)
  guestEmail: varchar('guest_email'), // 예약자 이메일
  guestPhone: varchar('guest_phone'), // 예약자 연락처
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_bookings_slot_id').on(table.slotId),
  index('IDX_bookings_guest_id').on(table.guestId),
  index('IDX_bookings_host_id').on(table.hostId),
  index('IDX_bookings_status').on(table.status),
  index('IDX_bookings_date').on(table.date),
]);

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
    .references(() => users.id),
  content: text('content').notNull(),
  messageType: varchar('message_type').default('text'), // text, image, booking, thread
  parentMessageId: integer('parent_message_id'), // 스레드 지원 - self reference
  metadata: jsonb('metadata'), // for booking requests, image urls, etc
  detectedLanguage: varchar('detected_language', { length: 10 }), // 자동 감지된 언어 코드
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_messages_conversation_id').on(table.conversationId),
  index('IDX_messages_channel_id').on(table.channelId),
  index('IDX_messages_parent_message_id').on(table.parentMessageId),
]);

// 메시지 번역 캐시 테이블
export const messageTranslations = pgTable('message_translations', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  targetLanguage: varchar('target_language', { length: 10 }).notNull(),
  translatedText: text('translated_text').notNull(),
  provider: varchar('provider', { length: 50 }).default('google'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_message_translations_message_id').on(table.messageId),
  index('IDX_message_translations_message_lang').on(table.messageId, table.targetLanguage),
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
  // 업그레이드용 새 컬럼들
  verifiedBooking: boolean('verified_booking').default(false),
  weightFactor: decimal('weight_factor', { precision: 3, scale: 2 }).default('1.0'),
  helpfulnessScore: integer('helpfulness_score').default(0),
  responseFromHost: text('response_from_host'),
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
  media: many(postMedia),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, { fields: [postMedia.postId], references: [posts.id] }),
}));

export const timelineRelations = relations(timelines, ({ one, many }) => ({
  user: one(users, { fields: [timelines.userId], references: [users.id] }),
  posts: many(posts),
  cinemapJobs: many(cinemapJobs),
}));

export const cinemapJobRelations = relations(cinemapJobs, ({ one }) => ({
  user: one(users, { fields: [cinemapJobs.userId], references: [users.id] }),
  timeline: one(timelines, {
    fields: [cinemapJobs.timelineId],
    references: [timelines.id],
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

export const messageRelations = relations(messages, ({ one, many }) => ({
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
  translations: many(messageTranslations),
}));

export const messageTranslationRelations = relations(messageTranslations, ({ one }) => ({
  message: one(messages, {
    fields: [messageTranslations.messageId],
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

export const insertPostMediaSchema = createInsertSchema(postMedia).omit({
  id: true,
  createdAt: true,
});

export const insertCinemapJobSchema = createInsertSchema(cinemapJobs).omit({
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

export const insertMessageTranslationSchema = createInsertSchema(messageTranslations).omit({
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
}).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type Experience = typeof experiences.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPostMedia = z.infer<typeof insertPostMediaSchema>;
export type PostMedia = typeof postMedia.$inferSelect;
export type InsertCinemapJob = z.infer<typeof insertCinemapJobSchema>;
export type CinemapJob = typeof cinemapJobs.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessageTranslation = z.infer<typeof insertMessageTranslationSchema>;
export type MessageTranslation = typeof messageTranslations.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertTimeline = z.infer<typeof insertTimelineSchema>;
export type Timeline = typeof timelines.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// 새로운 테이블들 - 업그레이드용

// 여행자 도움 요청 시스템
export const helpRequests = pgTable('help_requests', {
  id: serial('id').primaryKey(),
  requesterId: varchar('requester_id').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'local_tip', 'custom_planning', 'urgent_help', 'product_purchase'
  location: varchar('location', { length: 200 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  budgetMin: decimal('budget_min', { precision: 10, scale: 2 }),
  budgetMax: decimal('budget_max', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  deadline: timestamp('deadline'),
  urgencyLevel: varchar('urgency_level', { length: 20 }).default('normal'), // 'urgent', 'normal', 'flexible'
  status: varchar('status', { length: 20 }).default('open'), // 'open', 'assigned', 'completed', 'cancelled'
  responseCount: integer('response_count').default(0),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('ko'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 요청에 대한 답변/오퍼
export const requestResponses = pgTable('request_responses', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => helpRequests.id),
  responderId: varchar('responder_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  offeredPrice: decimal('offered_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  estimatedCompletionTime: varchar('estimated_completion_time', { length: 50 }),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'accepted', 'rejected', 'withdrawn'
  attachments: text('attachments').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 인플루언서 서비스 템플릿
export const serviceTemplates = pgTable('service_templates', {
  id: serial('id').primaryKey(),
  creatorId: varchar('creator_id').notNull().references(() => users.id),
  templateType: varchar('template_type', { length: 50 }).notNull(), // 'custom_planning', 'food_list', 'photo_companion', 'translation', 'shopping_guide'
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  durationHours: integer('duration_hours'),
  maxParticipants: integer('max_participants').default(1),
  includes: text('includes').array(),
  requirements: text('requirements').array(),
  sampleDeliverables: text('sample_deliverables').array(),
  isActive: boolean('is_active').default(true),
  orderCount: integer('order_count').default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 서비스 패키지/번들
export const servicePackages = pgTable('service_packages', {
  id: serial('id').primaryKey(),
  creatorId: varchar('creator_id').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  discountPercentage: integer('discount_percentage').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 패키지 구성 요소
export const packageItems = pgTable('package_items', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id').notNull().references(() => servicePackages.id),
  itemType: varchar('item_type', { length: 20 }).notNull(), // 'experience', 'template'
  itemId: integer('item_id').notNull(), // references experiences.id or service_templates.id
  quantity: integer('quantity').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// 사용자 신뢰도 시스템
export const userTrustLevels = pgTable('user_trust_levels', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id).unique(),
  trustLevel: integer('trust_level').default(1), // 1-5 신뢰 단계
  totalTransactions: integer('total_transactions').default(0),
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).default('0'), // 완료율 %
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).default('0'),
  kycVerified: boolean('kyc_verified').default(false),
  phoneVerified: boolean('phone_verified').default(false),
  idVerified: boolean('id_verified').default(false),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  trustScore: integer('trust_score').default(0), // 종합 신뢰 점수
  badges: text('badges').array(), // ['verified_host', 'quick_responder', 'top_rated']
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 분쟁 관리 시스템
export const disputeCases = pgTable('dispute_cases', {
  id: serial('id').primaryKey(),
  caseNumber: varchar('case_number', { length: 50 }).notNull().unique(),
  complainantId: varchar('complainant_id').notNull().references(() => users.id),
  respondentId: varchar('respondent_id').notNull().references(() => users.id),
  relatedBookingId: integer('related_booking_id').references(() => bookings.id),
  relatedRequestId: integer('related_request_id').references(() => helpRequests.id),
  disputeType: varchar('dispute_type', { length: 50 }).notNull(), // 'payment', 'service_quality', 'no_show', 'refund', 'communication'
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  evidenceFiles: text('evidence_files').array(),
  status: varchar('status', { length: 30 }).default('open'), // 'open', 'under_review', 'resolved', 'escalated', 'closed'
  priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  assignedAdminId: varchar('assigned_admin_id').references(() => users.id),
  resolutionSummary: text('resolution_summary'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

// 온보딩 진행상황
export const onboardingProgress = pgTable('onboarding_progress', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id).unique(),
  completedSteps: text('completed_steps').array().default(sql`'{}'`),
  currentStep: varchar('current_step', { length: 50 }).default('welcome'),
  userType: varchar('user_type', { length: 20 }), // 'traveler', 'influencer', 'host'
  interests: text('interests').array(),
  preferredDestinations: text('preferred_destinations').array(),
  travelStyle: varchar('travel_style', { length: 50 }),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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

// 새로운 테이블들의 스키마 및 타입
export const insertHelpRequestSchema = createInsertSchema(helpRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // 숫자를 문자열로 변환하여 decimal 타입 호환성 확보
  budgetMin: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null) return undefined;
    return typeof val === 'number' ? val.toString() : val;
  }),
  budgetMax: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null) return undefined;
    return typeof val === 'number' ? val.toString() : val;
  }),
});

export const insertRequestResponseSchema = createInsertSchema(requestResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServicePackageSchema = createInsertSchema(servicePackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPackageItemSchema = createInsertSchema(packageItems).omit({
  id: true,
  createdAt: true,
});

export const insertUserTrustLevelSchema = createInsertSchema(userTrustLevels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDisputeCaseSchema = createInsertSchema(disputeCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 타입 정의들
export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;
export type RequestResponse = typeof requestResponses.$inferSelect;
export type InsertRequestResponse = z.infer<typeof insertRequestResponseSchema>;
export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;
export type ServicePackage = typeof servicePackages.$inferSelect;
export type InsertServicePackage = z.infer<typeof insertServicePackageSchema>;
export type PackageItem = typeof packageItems.$inferSelect;
export type InsertPackageItem = z.infer<typeof insertPackageItemSchema>;
export type UserTrustLevel = typeof userTrustLevels.$inferSelect;
export type InsertUserTrustLevel = z.infer<typeof insertUserTrustLevelSchema>;
export type DisputeCase = typeof disputeCases.$inferSelect;
export type InsertDisputeCase = z.infer<typeof insertDisputeCaseSchema>;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;

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
  slot: one(slots, {
    fields: [bookings.slotId],
    references: [slots.id],
  }),
  guest: one(users, {
    fields: [bookings.guestId],
    references: [users.id],
    relationName: 'bookingGuest',
  }),
  host: one(users, {
    fields: [bookings.hostId],
    references: [users.id],
    relationName: 'bookingHost',
  }),
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

// 로컬 가이드 슬롯 관리 테이블
export const slots = pgTable('slots', {
  id: serial('id').primaryKey(),
  hostId: varchar('host_id')
    .notNull()
    .references(() => users.id),
  experienceId: integer('experience_id')
    .references(() => experiences.id), // 옵션: 특정 경험과 연결된 슬롯
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  
  // 시간 관리
  date: date('date').notNull(), // 슬롯 날짜
  startTime: varchar('start_time', { length: 8 }).notNull(), // "09:00" 형식
  endTime: varchar('end_time', { length: 8 }).notNull(), // "12:00" 형식
  timezone: varchar('timezone', { length: 50 }).default('Asia/Seoul'),
  
  // 가격 관리
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  peakPrice: decimal('peak_price', { precision: 10, scale: 2 }), // 피크 시간 가격
  currency: varchar('currency', { length: 3 }).default('KRW'),
  isPeakSlot: boolean('is_peak_slot').default(false),
  
  // 반복 설정
  isRecurring: boolean('is_recurring').default(false),
  recurringPattern: varchar('recurring_pattern'), // 'weekly', 'monthly', 'daily'
  recurringEndDate: date('recurring_end_date'), // 반복 종료일
  
  // 예약 관리
  maxParticipants: integer('max_participants').default(1),
  currentBookings: integer('current_bookings').default(0),
  isAvailable: boolean('is_available').default(true),
  
  // 위치 정보
  location: varchar('location'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  
  // 서비스 분류
  category: varchar('category'), // 'tour', 'food', 'activity', 'consultation', 'custom'
  serviceType: varchar('service_type'), // 'group', 'private', 'consultation'
  
  // 요구사항 및 제약
  requirements: text('requirements').array(),
  cancellationPolicy: varchar('cancellation_policy').default('flexible'), // 'flexible', 'moderate', 'strict'
  minAdvanceBooking: integer('min_advance_booking').default(24), // 최소 예약 시간 (시간 단위)
  
  // 상태 관리
  isActive: boolean('is_active').default(true),
  notes: text('notes'), // 가이드 전용 메모
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_slots_host_id').on(table.hostId),
  index('IDX_slots_date').on(table.date),
  index('IDX_slots_date_time').on(table.date, table.startTime),
  index('IDX_slots_location').on(table.latitude, table.longitude),
  index('IDX_slots_active').on(table.isActive, table.isAvailable),
]);

// 슬롯 관계 설정
export const slotsRelations = relations(slots, ({ one, many }) => ({
  host: one(users, {
    fields: [slots.hostId],
    references: [users.id],
  }),
  experience: one(experiences, {
    fields: [slots.experienceId],
    references: [experiences.id],
  }),
  bookings: many(bookings),
}));

// 슬롯 Zod 스키마
export const insertSlotSchema = createInsertSchema(slots).omit({
  id: true,
  currentBookings: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // 클라이언트 검증 강화
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)'),
  basePrice: z.number().min(0, '가격은 0 이상이어야 합니다'),
  maxParticipants: z.number().min(1, '최소 1명 이상이어야 합니다'),
});

export type Slot = typeof slots.$inferSelect;
export type InsertSlot = z.infer<typeof insertSlotSchema>;

// 미니 컨시어지 + 세렌디피티 테이블들
export const miniPlans = pgTable('mini_plans', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  summary: text('summary').notNull(),
  estimatedDurationMin: integer('estimated_duration_min').notNull(),
  estimatedDistanceM: integer('estimated_distance_m').notNull(),
  tags: text('tags').array(),
  status: varchar('status', { length: 20 }).default('generated'), // generated, started, completed, cancelled
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_mini_plans_user_id').on(table.userId),
  index('IDX_mini_plans_status').on(table.status),
]);

export const miniPlanSpots = pgTable('mini_plan_spots', {
  id: serial('id').primaryKey(),
  miniPlanId: integer('mini_plan_id')
    .notNull()
    .references(() => miniPlans.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(), // 0, 1, 2 (스팟 순서)
  poiId: varchar('poi_id'), // Google Places ID or internal ID (nullable)
  name: varchar('name', { length: 200 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  stayMin: integer('stay_min').notNull(), // 예상 체류 시간
  metaJson: jsonb('meta_json'), // { reason, recommendedMenu, priceRange, photoHint, etc }
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_mini_plan_spots_plan_id').on(table.miniPlanId),
]);

export const miniPlanCheckins = pgTable('mini_plan_checkins', {
  id: serial('id').primaryKey(),
  miniPlanId: integer('mini_plan_id')
    .notNull()
    .references(() => miniPlans.id, { onDelete: 'cascade' }),
  spotId: integer('spot_id')
    .notNull()
    .references(() => miniPlanSpots.id, { onDelete: 'cascade' }),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  photos: text('photos').array(), // 체크인 시 업로드한 사진들
  notes: text('notes'), // 사용자 메모
  checkedInAt: timestamp('checked_in_at').defaultNow(),
}, (table) => [
  index('IDX_mini_plan_checkins_plan_id').on(table.miniPlanId),
  index('IDX_mini_plan_checkins_user_id').on(table.userId),
]);

// Zod 스키마
export const insertMiniPlanSchema = createInsertSchema(miniPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMiniPlanSpotSchema = createInsertSchema(miniPlanSpots).omit({
  id: true,
  createdAt: true,
});

export const insertMiniPlanCheckinSchema = createInsertSchema(miniPlanCheckins).omit({
  id: true,
  checkedInAt: true,
});

// 타입 정의
export type MiniPlan = typeof miniPlans.$inferSelect;
export type InsertMiniPlan = z.infer<typeof insertMiniPlanSchema>;
export type MiniPlanSpot = typeof miniPlanSpots.$inferSelect;
export type InsertMiniPlanSpot = z.infer<typeof insertMiniPlanSpotSchema>;
export type MiniPlanCheckin = typeof miniPlanCheckins.$inferSelect;
export type InsertMiniPlanCheckin = z.infer<typeof insertMiniPlanCheckinSchema>;

// 관계 정의
export const miniPlansRelations = relations(miniPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [miniPlans.userId],
    references: [users.id],
  }),
  spots: many(miniPlanSpots),
  checkins: many(miniPlanCheckins),
}));

export const miniPlanSpotsRelations = relations(miniPlanSpots, ({ one, many }) => ({
  plan: one(miniPlans, {
    fields: [miniPlanSpots.miniPlanId],
    references: [miniPlans.id],
  }),
  checkins: many(miniPlanCheckins),
}));

export const miniPlanCheckinsRelations = relations(miniPlanCheckins, ({ one }) => ({
  plan: one(miniPlans, {
    fields: [miniPlanCheckins.miniPlanId],
    references: [miniPlans.id],
  }),
  spot: one(miniPlanSpots, {
    fields: [miniPlanCheckins.spotId],
    references: [miniPlanSpots.id],
  }),
  user: one(users, {
    fields: [miniPlanCheckins.userId],
    references: [users.id],
  }),
}));

// ============================================
// Serendipity Protocol 테이블들
// ============================================

// 퀘스트 (근접 사용자 공동 미션)
export const quests = pgTable('quests', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 30 }).notNull().default('serendipity'), // serendipity, sponsor
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  durationMin: integer('duration_min').notNull().default(5),
  rewardType: varchar('reward_type', { length: 50 }).default('highlight'), // highlight, badge, points
  rewardDetail: text('reward_detail'),
  requiredActions: jsonb('required_actions'), // [{ type: 'photo_upload', count: 2, note: '...' }]
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  radiusM: integer('radius_m').default(80),
  status: varchar('status', { length: 20 }).default('active'), // active, in_progress, completed, expired, cancelled
  matchedMiniPlanId: integer('matched_mini_plan_id').references(() => miniPlans.id), // 같은 플랜 선택 시
  matchedTags: text('matched_tags').array(), // 태그 기반 매칭 시
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_quests_status').on(table.status),
  index('IDX_quests_location').on(table.latitude, table.longitude),
]);

// 퀘스트 참가자
export const questParticipants = pgTable('quest_participants', {
  id: serial('id').primaryKey(),
  questId: integer('quest_id')
    .notNull()
    .references(() => quests.id, { onDelete: 'cascade' }),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  status: varchar('status', { length: 20 }).default('invited'), // invited, accepted, declined, completed
  joinedAt: timestamp('joined_at'),
  completedAt: timestamp('completed_at'),
  resultJson: jsonb('result_json'), // { photos: [...], checkins: [...] }
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_quest_participants_quest_id').on(table.questId),
  index('IDX_quest_participants_user_id').on(table.userId),
]);

// 퀘스트 하이라이트 (공동 생성 결과물)
export const questHighlights = pgTable('quest_highlights', {
  id: serial('id').primaryKey(),
  questId: integer('quest_id')
    .notNull()
    .references(() => quests.id, { onDelete: 'cascade' }),
  highlightMediaUrl: text('highlight_media_url'),
  thumbnailUrl: text('thumbnail_url'),
  metaJson: jsonb('meta_json'), // { participants: [...], photos: [...], location: {...} }
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_quest_highlights_quest_id').on(table.questId),
]);

// Zod 스키마
export const insertQuestSchema = createInsertSchema(quests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuestParticipantSchema = createInsertSchema(questParticipants).omit({
  id: true,
  createdAt: true,
});

export const insertQuestHighlightSchema = createInsertSchema(questHighlights).omit({
  id: true,
  createdAt: true,
});

// 타입 정의
export type Quest = typeof quests.$inferSelect;
export type InsertQuest = z.infer<typeof insertQuestSchema>;
export type QuestParticipant = typeof questParticipants.$inferSelect;
export type InsertQuestParticipant = z.infer<typeof insertQuestParticipantSchema>;
export type QuestHighlight = typeof questHighlights.$inferSelect;
export type InsertQuestHighlight = z.infer<typeof insertQuestHighlightSchema>;

// 관계 정의
export const questsRelations = relations(quests, ({ one, many }) => ({
  matchedMiniPlan: one(miniPlans, {
    fields: [quests.matchedMiniPlanId],
    references: [miniPlans.id],
  }),
  participants: many(questParticipants),
  highlights: many(questHighlights),
}));

export const questParticipantsRelations = relations(questParticipants, ({ one }) => ({
  quest: one(quests, {
    fields: [questParticipants.questId],
    references: [quests.id],
  }),
  user: one(users, {
    fields: [questParticipants.userId],
    references: [users.id],
  }),
}));

export const questHighlightsRelations = relations(questHighlights, ({ one }) => ({
  quest: one(quests, {
    fields: [questHighlights.questId],
    references: [quests.id],
  }),
}));

// ==========================================
// POI (Point of Interest) 시스템 - DB 기반
// ==========================================

// POI 카테고리 (대분류: 음식&음료, 숙박, 문화 등)
export const poiCategories = pgTable('poi_categories', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // food_drink, lodging, culture 등
  icon: varchar('icon', { length: 10 }).notNull(), // 🍽️, 🏨, 🎭 등
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  isSystem: boolean('is_system').default(false), // 시스템 기본 카테고리 (만남활성화, 세렌디피티)
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_poi_categories_code').on(table.code),
]);

// POI 타입 (세부: restaurant, cafe, hotel 등 - Google Places API 타입과 매핑)
export const poiTypes = pgTable('poi_types', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => poiCategories.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull().unique(), // Google Places API 타입명
  googlePlaceType: varchar('google_place_type', { length: 100 }), // Google Places API 검색 타입
  icon: varchar('icon', { length: 10 }), // 개별 아이콘 (없으면 카테고리 아이콘 사용)
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_poi_types_category_id').on(table.categoryId),
  index('IDX_poi_types_code').on(table.code),
]);

// POI 카테고리 번역 (6개 언어)
export const poiCategoryTranslations = pgTable('poi_category_translations', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => poiCategories.id, { onDelete: 'cascade' }),
  languageCode: varchar('language_code', { length: 10 }).notNull(), // en, ko, ja, zh, fr, es
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }),
}, (table) => [
  index('IDX_poi_category_translations_category_lang').on(table.categoryId, table.languageCode),
]);

// POI 타입 번역 (6개 언어)
export const poiTypeTranslations = pgTable('poi_type_translations', {
  id: serial('id').primaryKey(),
  typeId: integer('type_id')
    .notNull()
    .references(() => poiTypes.id, { onDelete: 'cascade' }),
  languageCode: varchar('language_code', { length: 10 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
}, (table) => [
  index('IDX_poi_type_translations_type_lang').on(table.typeId, table.languageCode),
]);

// POI Zod 스키마
export const insertPoiCategorySchema = createInsertSchema(poiCategories).omit({
  id: true,
  createdAt: true,
});

export const insertPoiTypeSchema = createInsertSchema(poiTypes).omit({
  id: true,
  createdAt: true,
});

export const insertPoiCategoryTranslationSchema = createInsertSchema(poiCategoryTranslations).omit({
  id: true,
});

export const insertPoiTypeTranslationSchema = createInsertSchema(poiTypeTranslations).omit({
  id: true,
});

// POI 타입 정의
export type PoiCategory = typeof poiCategories.$inferSelect;
export type InsertPoiCategory = z.infer<typeof insertPoiCategorySchema>;
export type PoiType = typeof poiTypes.$inferSelect;
export type InsertPoiType = z.infer<typeof insertPoiTypeSchema>;
export type PoiCategoryTranslation = typeof poiCategoryTranslations.$inferSelect;
export type InsertPoiCategoryTranslation = z.infer<typeof insertPoiCategoryTranslationSchema>;
export type PoiTypeTranslation = typeof poiTypeTranslations.$inferSelect;
export type InsertPoiTypeTranslation = z.infer<typeof insertPoiTypeTranslationSchema>;

// POI 관계 정의
export const poiCategoriesRelations = relations(poiCategories, ({ many }) => ({
  types: many(poiTypes),
  translations: many(poiCategoryTranslations),
}));

export const poiTypesRelations = relations(poiTypes, ({ one, many }) => ({
  category: one(poiCategories, {
    fields: [poiTypes.categoryId],
    references: [poiCategories.id],
  }),
  translations: many(poiTypeTranslations),
}));

export const poiCategoryTranslationsRelations = relations(poiCategoryTranslations, ({ one }) => ({
  category: one(poiCategories, {
    fields: [poiCategoryTranslations.categoryId],
    references: [poiCategories.id],
  }),
}));

export const poiTypeTranslationsRelations = relations(poiTypeTranslations, ({ one }) => ({
  type: one(poiTypes, {
    fields: [poiTypeTranslations.typeId],
    references: [poiTypes.id],
  }),
}));

// =====================================================
// Smart Feed & Hashtag System
// =====================================================

// 해시태그 마스터 테이블
export const hashtags = pgTable('hashtags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  postCount: integer('post_count').default(0),
  followerCount: integer('follower_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('IDX_hashtags_name').on(table.name),
  index('IDX_hashtags_post_count').on(table.postCount),
]);

// 해시태그 다국어 번역 (6개 언어)
export const hashtagTranslations = pgTable('hashtag_translations', {
  id: serial('id').primaryKey(),
  hashtagId: integer('hashtag_id')
    .notNull()
    .references(() => hashtags.id, { onDelete: 'cascade' }),
  languageCode: varchar('language_code', { length: 10 }).notNull(),
  translatedName: varchar('translated_name', { length: 100 }).notNull(),
}, (table) => [
  index('IDX_hashtag_translations_hashtag_lang').on(table.hashtagId, table.languageCode),
]);

// 게시물-해시태그 연결 테이블
export const postHashtags = pgTable('post_hashtags', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  hashtagId: integer('hashtag_id')
    .notNull()
    .references(() => hashtags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_post_hashtags_post').on(table.postId),
  index('IDX_post_hashtags_hashtag').on(table.hashtagId),
]);

// 해시태그 팔로우
export const hashtagFollows = pgTable('hashtag_follows', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  hashtagId: integer('hashtag_id')
    .notNull()
    .references(() => hashtags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_hashtag_follows_user').on(table.userId),
  index('IDX_hashtag_follows_hashtag').on(table.hashtagId),
]);

// 해시태그 일별 메트릭 (트렌딩 계산용)
export const hashtagMetricsDaily = pgTable('hashtag_metrics_daily', {
  id: serial('id').primaryKey(),
  hashtagId: integer('hashtag_id')
    .notNull()
    .references(() => hashtags.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  usageCount: integer('usage_count').default(0),
  growthRate: decimal('growth_rate', { precision: 5, scale: 2 }).default('0'),
  calculatedAt: timestamp('calculated_at').defaultNow(),
}, (table) => [
  index('IDX_hashtag_metrics_hashtag_date').on(table.hashtagId, table.date),
]);

// 게시물 저장 (북마크)
export const postSaves = pgTable('post_saves', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_post_saves_user').on(table.userId),
  index('IDX_post_saves_post').on(table.postId),
]);

// 사용자 참여 이벤트 (피드 속도 계산용)
export const userEngagementEvents = pgTable('user_engagement_events', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 20 }).notNull(), // like, comment, save, view
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('IDX_engagement_events_post').on(table.postId),
  index('IDX_engagement_events_created').on(table.createdAt),
]);

// 사용자 피드 설정
export const userFeedPreferences = pgTable('user_feed_preferences', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  engagementWeight: decimal('engagement_weight', { precision: 3, scale: 2 }).default('0.22'),
  affinityWeight: decimal('affinity_weight', { precision: 3, scale: 2 }).default('0.20'),
  interestWeight: decimal('interest_weight', { precision: 3, scale: 2 }).default('0.15'),
  hashtagWeight: decimal('hashtag_weight', { precision: 3, scale: 2 }).default('0.12'),
  locationWeight: decimal('location_weight', { precision: 3, scale: 2 }).default('0.12'),
  recencyWeight: decimal('recency_weight', { precision: 3, scale: 2 }).default('0.11'),
  velocityWeight: decimal('velocity_weight', { precision: 3, scale: 2 }).default('0.08'),
  preferredMode: varchar('preferred_mode', { length: 20 }).default('smart'), // smart, latest, nearby, popular, hashtag
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 피드 알고리즘 가중치 (시스템 설정 - DB 기반)
export const feedAlgorithmWeights = pgTable('feed_algorithm_weights', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  engagementWeight: decimal('engagement_weight', { precision: 3, scale: 2 }).default('0.22'),
  affinityWeight: decimal('affinity_weight', { precision: 3, scale: 2 }).default('0.20'),
  interestWeight: decimal('interest_weight', { precision: 3, scale: 2 }).default('0.15'),
  hashtagWeight: decimal('hashtag_weight', { precision: 3, scale: 2 }).default('0.12'),
  locationWeight: decimal('location_weight', { precision: 3, scale: 2 }).default('0.12'),
  recencyWeight: decimal('recency_weight', { precision: 3, scale: 2 }).default('0.11'),
  velocityWeight: decimal('velocity_weight', { precision: 3, scale: 2 }).default('0.08'),
  recencyDecayHours: integer('recency_decay_hours').default(24),
  velocityWindowMinutes: integer('velocity_window_minutes').default(120),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Hashtag Zod 스키마
export const insertHashtagSchema = createInsertSchema(hashtags).omit({
  id: true,
  postCount: true,
  followerCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHashtagTranslationSchema = createInsertSchema(hashtagTranslations).omit({
  id: true,
});

export const insertPostHashtagSchema = createInsertSchema(postHashtags).omit({
  id: true,
  createdAt: true,
});

export const insertHashtagFollowSchema = createInsertSchema(hashtagFollows).omit({
  id: true,
  createdAt: true,
});

export const insertPostSaveSchema = createInsertSchema(postSaves).omit({
  id: true,
  createdAt: true,
});

export const insertUserEngagementEventSchema = createInsertSchema(userEngagementEvents).omit({
  id: true,
  createdAt: true,
});

export const insertUserFeedPreferencesSchema = createInsertSchema(userFeedPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertFeedAlgorithmWeightsSchema = createInsertSchema(feedAlgorithmWeights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Hashtag & Feed 타입 정의
export type Hashtag = typeof hashtags.$inferSelect;
export type InsertHashtag = z.infer<typeof insertHashtagSchema>;
export type HashtagTranslation = typeof hashtagTranslations.$inferSelect;
export type InsertHashtagTranslation = z.infer<typeof insertHashtagTranslationSchema>;
export type PostHashtag = typeof postHashtags.$inferSelect;
export type InsertPostHashtag = z.infer<typeof insertPostHashtagSchema>;
export type HashtagFollow = typeof hashtagFollows.$inferSelect;
export type InsertHashtagFollow = z.infer<typeof insertHashtagFollowSchema>;
export type HashtagMetricDaily = typeof hashtagMetricsDaily.$inferSelect;
export type PostSave = typeof postSaves.$inferSelect;
export type InsertPostSave = z.infer<typeof insertPostSaveSchema>;
export type UserEngagementEvent = typeof userEngagementEvents.$inferSelect;
export type InsertUserEngagementEvent = z.infer<typeof insertUserEngagementEventSchema>;
export type UserFeedPreferences = typeof userFeedPreferences.$inferSelect;
export type InsertUserFeedPreferences = z.infer<typeof insertUserFeedPreferencesSchema>;
export type FeedAlgorithmWeights = typeof feedAlgorithmWeights.$inferSelect;
export type InsertFeedAlgorithmWeights = z.infer<typeof insertFeedAlgorithmWeightsSchema>;

// Hashtag 관계 정의
export const hashtagsRelations = relations(hashtags, ({ many }) => ({
  translations: many(hashtagTranslations),
  postHashtags: many(postHashtags),
  followers: many(hashtagFollows),
  metrics: many(hashtagMetricsDaily),
}));

export const hashtagTranslationsRelations = relations(hashtagTranslations, ({ one }) => ({
  hashtag: one(hashtags, {
    fields: [hashtagTranslations.hashtagId],
    references: [hashtags.id],
  }),
}));

export const postHashtagsRelations = relations(postHashtags, ({ one }) => ({
  post: one(posts, {
    fields: [postHashtags.postId],
    references: [posts.id],
  }),
  hashtag: one(hashtags, {
    fields: [postHashtags.hashtagId],
    references: [hashtags.id],
  }),
}));

export const hashtagFollowsRelations = relations(hashtagFollows, ({ one }) => ({
  user: one(users, {
    fields: [hashtagFollows.userId],
    references: [users.id],
  }),
  hashtag: one(hashtags, {
    fields: [hashtagFollows.hashtagId],
    references: [hashtags.id],
  }),
}));

export const postSavesRelations = relations(postSaves, ({ one }) => ({
  user: one(users, {
    fields: [postSaves.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [postSaves.postId],
    references: [posts.id],
  }),
}));

export const userEngagementEventsRelations = relations(userEngagementEvents, ({ one }) => ({
  user: one(users, {
    fields: [userEngagementEvents.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [userEngagementEvents.postId],
    references: [posts.id],
  }),
}));

export const userFeedPreferencesRelations = relations(userFeedPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userFeedPreferences.userId],
    references: [users.id],
  }),
}));

// =====================================================
// 📌 DB 기반 i18n 시스템 (글로벌 10억+ 사용자 확장성)
// =====================================================

// 번역 테이블 - 모든 사용자 대면 텍스트의 DB 기반 관리
export const translations = pgTable('translations', {
  id: serial('id').primaryKey(),
  namespace: varchar('namespace', { length: 50 }).notNull().default('common'), // common, ui, validation, toast, server
  key: varchar('key', { length: 255 }).notNull(), // 번역 키 (예: 'feed.title', 'button.submit')
  locale: varchar('locale', { length: 10 }).notNull(), // en, ko, ja, zh, fr, es
  value: text('value').notNull(), // 번역된 텍스트
  isReviewed: boolean('is_reviewed').default(false), // 검토 완료 여부
  version: integer('version').default(1), // 버전 관리
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_translations_namespace_locale').on(table.namespace, table.locale),
  index('idx_translations_key').on(table.key),
]);

// 지원 언어 목록
export const supportedLocales = pgTable('supported_locales', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 10 }).notNull().unique(), // en, ko, ja, zh, fr, es
  name: varchar('name', { length: 100 }).notNull(), // English, 한국어, 日本語
  nativeName: varchar('native_name', { length: 100 }).notNull(), // English, 한국어, 日本語
  isActive: boolean('is_active').default(true),
  isRTL: boolean('is_rtl').default(false), // 오른쪽에서 왼쪽 언어 (아랍어, 히브리어 등)
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// =====================================================
// 📊 분석 시스템 (빅데이터 기반 의사결정)
// =====================================================

// 사용자 행동 이벤트 (실시간 수집)
export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 100 }),
  userId: varchar('user_id').references(() => users.id),
  eventType: varchar('event_type', { length: 50 }).notNull(), // page_view, click, scroll, engagement
  eventCategory: varchar('event_category', { length: 50 }).notNull(), // feed, map, dm, profile, contract
  eventAction: varchar('event_action', { length: 100 }).notNull(), // post_view, like, comment, proposal_send
  eventLabel: varchar('event_label', { length: 255 }), // 추가 컨텍스트
  eventValue: decimal('event_value', { precision: 10, scale: 2 }), // 수치 값 (예: 계약 금액)
  referenceId: integer('reference_id'), // 관련 엔티티 ID (post_id, contract_id 등)
  referenceType: varchar('reference_type', { length: 50 }), // post, contract, proposal
  metadata: jsonb('metadata'), // 추가 데이터 (디바이스, 위치 등)
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_analytics_events_user').on(table.userId),
  index('idx_analytics_events_session').on(table.sessionId),
  index('idx_analytics_events_type').on(table.eventType),
  index('idx_analytics_events_category').on(table.eventCategory),
  index('idx_analytics_events_created').on(table.createdAt),
]);

// 사용자 세션 (방문 추적)
export const analyticsSessions = pgTable('analytics_sessions', {
  id: varchar('id', { length: 100 }).primaryKey(), // 세션 ID
  userId: varchar('user_id').references(() => users.id),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  pageViews: integer('page_views').default(0),
  interactions: integer('interactions').default(0),
  deviceType: varchar('device_type', { length: 20 }), // mobile, tablet, desktop
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),
  referrer: varchar('referrer', { length: 500 }),
  landingPage: varchar('landing_page', { length: 255 }),
  exitPage: varchar('exit_page', { length: 255 }),
  isNewUser: boolean('is_new_user').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_analytics_sessions_user').on(table.userId),
  index('idx_analytics_sessions_started').on(table.startedAt),
]);

// 일별 집계 (배치 처리)
export const analyticsDailyRollups = pgTable('analytics_daily_rollups', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // dau, sessions, posts, contracts, revenue
  metricValue: decimal('metric_value', { precision: 15, scale: 2 }).notNull(),
  dimension: varchar('dimension', { length: 50 }), // 분석 차원 (country, device, category)
  dimensionValue: varchar('dimension_value', { length: 100 }), // 차원 값 (KR, mobile, tour)
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_analytics_rollups_date').on(table.date),
  index('idx_analytics_rollups_type').on(table.metricType),
]);

// =====================================================
// 🔄 공유경제 플로우 (피드 기반 제안/계약 시스템)
// =====================================================

// 여행자 요구사항 (피드 확장) - "이런 여행 하고싶어요"
export const travelRequests = pgTable('travel_requests', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  postId: integer('post_id').references(() => posts.id), // 피드 포스트와 연결
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  destination: varchar('destination', { length: 255 }),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  budgetMin: decimal('budget_min', { precision: 10, scale: 2 }),
  budgetMax: decimal('budget_max', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  serviceTypes: text('service_types').array(), // ['guide', 'transport', 'shopping']
  languages: text('languages').array(), // 원하는 가이드 언어
  groupSize: integer('group_size').default(1),
  status: varchar('status', { length: 20 }).default('open'), // open, matched, closed, expired
  proposalCount: integer('proposal_count').default(0),
  viewCount: integer('view_count').default(0),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_travel_requests_user').on(table.userId),
  index('idx_travel_requests_status').on(table.status),
  index('idx_travel_requests_destination').on(table.destination),
]);

// 로컬가이드 제안 응답 - 맞춤 플랜 제안
export const proposals = pgTable('proposals', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').references(() => travelRequests.id),
  experienceId: integer('experience_id').references(() => experiences.id), // 기존 서비스 연결 (선택)
  guideId: varchar('guide_id').notNull().references(() => users.id), // 제안하는 로컬가이드
  travelerId: varchar('traveler_id').notNull().references(() => users.id), // 요청한 여행자
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  proposedPrice: decimal('proposed_price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  includesItems: text('includes_items').array(), // 포함 사항
  duration: integer('duration'), // 분 단위
  availableDates: date('available_dates').array(),
  meetingPoint: varchar('meeting_point', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending'), // pending, accepted, rejected, withdrawn
  messageThread: varchar('message_thread', { length: 100 }), // DM 대화 연결
  viewedAt: timestamp('viewed_at'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_proposals_request').on(table.requestId),
  index('idx_proposals_guide').on(table.guideId),
  index('idx_proposals_status').on(table.status),
]);

// 계약 (양자 합의 기반) - DM 협의 후 체결
export const contracts = pgTable('contracts', {
  id: serial('id').primaryKey(),
  proposalId: integer('proposal_id').references(() => proposals.id),
  travelerId: varchar('traveler_id').notNull().references(() => users.id),
  guideId: varchar('guide_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  platformFeeRate: decimal('platform_fee_rate', { precision: 5, scale: 2 }).default('12.00'), // 12%
  platformFeeAmount: decimal('platform_fee_amount', { precision: 10, scale: 2 }),
  guidePayoutAmount: decimal('guide_payout_amount', { precision: 10, scale: 2 }),
  serviceDate: date('service_date'),
  serviceStartTime: varchar('service_start_time', { length: 10 }),
  serviceEndTime: varchar('service_end_time', { length: 10 }),
  meetingPoint: varchar('meeting_point', { length: 255 }),
  meetingLatitude: decimal('meeting_latitude', { precision: 10, scale: 8 }),
  meetingLongitude: decimal('meeting_longitude', { precision: 11, scale: 8 }),
  cancelPolicy: varchar('cancel_policy', { length: 20 }).default('moderate'), // flexible, moderate, strict
  status: varchar('status', { length: 20 }).default('pending'), // pending, confirmed, in_progress, completed, cancelled, disputed
  termsAcceptedByTraveler: boolean('terms_accepted_by_traveler').default(false),
  termsAcceptedByGuide: boolean('terms_accepted_by_guide').default(false),
  confirmedAt: timestamp('confirmed_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_contracts_traveler').on(table.travelerId),
  index('idx_contracts_guide').on(table.guideId),
  index('idx_contracts_status').on(table.status),
  index('idx_contracts_service_date').on(table.serviceDate),
]);

// 에스크로 거래 (마일스톤 결제)
export const escrowTransactions = pgTable('escrow_transactions', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').notNull().references(() => contracts.id),
  milestoneType: varchar('milestone_type', { length: 20 }).notNull(), // deposit (계약금), midterm (중도금), final (잔금)
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('KRW'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, funded, released, refunded, disputed
  paymentMethod: varchar('payment_method', { length: 50 }), // card, bank_transfer
  paymentId: varchar('payment_id', { length: 100 }), // 외부 결제 ID (PortOne 등)
  fundedAt: timestamp('funded_at'),
  releasedAt: timestamp('released_at'),
  refundedAt: timestamp('refunded_at'),
  refundReason: text('refund_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_escrow_contract').on(table.contractId),
  index('idx_escrow_status').on(table.status),
]);

// 분쟁 기록
export const disputes = pgTable('disputes', {
  id: serial('id').primaryKey(),
  contractId: integer('contract_id').notNull().references(() => contracts.id),
  raisedBy: varchar('raised_by').notNull().references(() => users.id),
  reason: varchar('reason', { length: 50 }).notNull(), // no_show, quality, safety, other
  description: text('description').notNull(),
  evidence: text('evidence').array(), // 증거 이미지/파일 URL
  status: varchar('status', { length: 20 }).default('open'), // open, investigating, resolved, escalated
  resolution: text('resolution'),
  resolvedBy: varchar('resolved_by').references(() => users.id), // 관리자
  refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_disputes_contract').on(table.contractId),
  index('idx_disputes_status').on(table.status),
]);

// =====================================================
// Zod 스키마 및 타입 정의 (새 테이블들)
// =====================================================

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportedLocaleSchema = createInsertSchema(supportedLocales).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({
  createdAt: true,
});

export const insertTravelRequestSchema = createInsertSchema(travelRequests).omit({
  id: true,
  proposalCount: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  viewedAt: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  platformFeeAmount: true,
  guidePayoutAmount: true,
  confirmedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  fundedAt: true,
  releasedAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
});

// 타입 정의
export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type SupportedLocale = typeof supportedLocales.$inferSelect;
export type InsertSupportedLocale = z.infer<typeof insertSupportedLocaleSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type InsertAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;
export type AnalyticsDailyRollup = typeof analyticsDailyRollups.$inferSelect;
export type TravelRequest = typeof travelRequests.$inferSelect;
export type InsertTravelRequest = z.infer<typeof insertTravelRequestSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = z.infer<typeof insertEscrowTransactionSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;

// 관계 정의
export const travelRequestsRelations = relations(travelRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [travelRequests.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [travelRequests.postId],
    references: [posts.id],
  }),
  proposals: many(proposals),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  request: one(travelRequests, {
    fields: [proposals.requestId],
    references: [travelRequests.id],
  }),
  experience: one(experiences, {
    fields: [proposals.experienceId],
    references: [experiences.id],
  }),
  guide: one(users, {
    fields: [proposals.guideId],
    references: [users.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  proposal: one(proposals, {
    fields: [contracts.proposalId],
    references: [proposals.id],
  }),
  traveler: one(users, {
    fields: [contracts.travelerId],
    references: [users.id],
  }),
  guide: one(users, {
    fields: [contracts.guideId],
    references: [users.id],
  }),
  escrowTransactions: many(escrowTransactions),
  disputes: many(disputes),
}));

export const escrowTransactionsRelations = relations(escrowTransactions, ({ one }) => ({
  contract: one(contracts, {
    fields: [escrowTransactions.contractId],
    references: [contracts.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  contract: one(contracts, {
    fields: [disputes.contractId],
    references: [contracts.id],
  }),
  raisedByUser: one(users, {
    fields: [disputes.raisedBy],
    references: [users.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

export const analyticsSessionsRelations = relations(analyticsSessions, ({ one }) => ({
  user: one(users, {
    fields: [analyticsSessions.userId],
    references: [users.id],
  }),
}));
