// @ts-nocheck
import {
  users,
  experiences,
  posts,
  postMedia,
  cinemapJobs,
  bookings,
  comments,
  conversations,
  messages,
  messageTranslations,
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
  purchaseRequests,
  purchaseQuotes,
  purchaseOrders,
  helpRequests,
  requestResponses,
  serviceTemplates,
  servicePackages,
  packageItems,
  slots,
  systemConfig,
  configAuditLogs,
  aiPromptTemplates,
  userSessions,
  userEvents,
  userDailyMetrics,
  platformDailyMetrics,
  funnelDefinitions,
  funnelSteps,
  type User,
  type UpsertUser,
  type InsertExperience,
  type Experience,
  type InsertPost,
  type Post,
  type InsertPostMedia,
  type PostMedia,
  type InsertCinemapJob,
  type CinemapJob,
  type InsertBooking,
  type Booking,
  type InsertComment,
  type Comment,
  type InsertMessage,
  type Message,
  type InsertMessageTranslation,
  type MessageTranslation,
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
  type PurchaseRequest,
  type InsertPurchaseRequest,
  type PurchaseQuote,
  type InsertPurchaseQuote,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type HelpRequest,
  type InsertHelpRequest,
  type RequestResponse,
  type InsertRequestResponse,
  type ServiceTemplate,
  type InsertServiceTemplate,
  type ServicePackage,
  type InsertServicePackage,
  type Slot,
  type InsertSlot,
  type PackageItem,
  type InsertPackageItem,
  type SystemConfig,
  type InsertSystemConfig,
  type ConfigAuditLog,
  type AiPromptTemplate,
  type InsertAiPromptTemplate,
  type UserSession,
  type UserEvent,
  type InsertUserEvent,
  type UserDailyMetric,
  miniPlans,
  miniPlanSpots,
  miniPlanCheckins,
  type MiniPlan,
  type InsertMiniPlan,
  type MiniPlanSpot,
  type InsertMiniPlanSpot,
  type MiniPlanCheckin,
  type InsertMiniPlanCheckin,
  type Quest,
  type InsertQuest,
  type QuestParticipant,
  type InsertQuestParticipant,
  type QuestHighlight,
  type InsertQuestHighlight,
  quests,
  questParticipants,
  questHighlights,
  poiCategories,
  poiTypes,
  poiCategoryTranslations,
  poiTypeTranslations,
  type PoiCategory,
  type InsertPoiCategory,
  type PoiType,
  type InsertPoiType,
  type PoiCategoryTranslation,
  type InsertPoiCategoryTranslation,
  type PoiTypeTranslation,
  type InsertPoiTypeTranslation,
  hashtags,
  hashtagTranslations,
  postHashtags,
  hashtagFollows,
  hashtagMetricsDaily,
  postSaves,
  userEngagementEvents,
  userFeedPreferences,
  feedAlgorithmWeights,
  type Hashtag,
  type InsertHashtag,
  type HashtagTranslation,
  type InsertHashtagTranslation,
  type PostHashtag,
  type InsertPostHashtag,
  type HashtagFollow,
  type InsertHashtagFollow,
  type HashtagMetricDaily,
  type PostSave,
  type InsertPostSave,
  type UserEngagementEvent,
  type InsertUserEngagementEvent,
  type UserFeedPreferences,
  type InsertUserFeedPreferences,
  type FeedAlgorithmWeights,
  type InsertFeedAlgorithmWeights,
  billingPlans,
  userSubscriptions,
  userUsage,
  userTripPasses,
  contractStages,
  escrowAccounts,
  payouts,
  paymentTransactions,
  billingKeys,
  paymentLogs,
  type BillingPlan,
  type InsertBillingPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type UserUsage,
  type InsertUserUsage,
  type UserTripPass,
  type InsertUserTripPass,
  type ContractStage,
  type InsertContractStage,
  type EscrowAccount,
  type InsertEscrowAccount,
  type Payout,
  type InsertPayout,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type BillingKey,
  type InsertBillingKey,
  type PaymentLog,
  type InsertPaymentLog,
  translations,
} from '@shared/schema';

import * as userRepo from './repositories/userRepository';
import * as notificationRepo from './repositories/notificationRepository';
import * as socialRepo from './repositories/socialRepository';
import * as chatRepo from './repositories/chatRepository';
import * as contentRepo from './repositories/contentRepository';
import * as bookingRepo from './repositories/bookingRepository';
import * as feedRepo from './repositories/feedRepository';
import * as aiRepo from './repositories/aiRepository';
import * as billingRepo from './repositories/billingRepository';
import * as commerceRepo from './repositories/commerceRepository';
import * as adminRepo from './repositories/adminRepository';

// IStorage 인터페이스 유지 (하위 호환성)
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPublicProfileUrl(url: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  getOpenUsers(): Promise<User[]>;
  getNearbyUsers(latitude: number, longitude: number, radiusKm: number, limit: number): Promise<User[]>;
  getHostApplications(status?: string): Promise<User[]>;

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
  
  // PostMedia operations
  createPostMedia(media: InsertPostMedia): Promise<PostMedia>;
  createPostMediaBatch(mediaList: InsertPostMedia[]): Promise<PostMedia[]>;
  getPostMediaByPostId(postId: number): Promise<PostMedia[]>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<Comment[]>;
  getCommentReplies(parentId: number): Promise<Comment[]>;
  updateOfferStatus(commentId: number, status: string): Promise<Comment | undefined>;
  deleteComment(commentId: number, userId: string): Promise<boolean>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getBookingsByHost(hostId: string): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string, cancelReason?: string): Promise<Booking | undefined>;
  findExistingBooking(guestId: string, experienceId?: number, slotId?: number): Promise<Booking | undefined>;
  
  // 자동화 비즈니스 로직 메서드들
  processExpiredBookings(): Promise<number>;
  processCompletedExperiences(): Promise<number>;
  recalculateSlotAvailability(slotId?: number): Promise<void>;

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
  
  // CineMap operations
  createCinemapJob(job: InsertCinemapJob): Promise<CinemapJob>;
  getCinemapJobById(id: number): Promise<CinemapJob | undefined>;
  getCinemapJobsByUser(userId: string): Promise<CinemapJob[]>;
  getCinemapJobsByTimeline(timelineId: number): Promise<CinemapJob[]>;
  updateCinemapJob(
    id: number,
    updates: Partial<InsertCinemapJob>
  ): Promise<CinemapJob | undefined>;

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

  // System Settings operations (legacy)
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

  // AI Concierge operations
  getOrCreateAIConciergeChannel(userId: string): Promise<Channel>;
  getNearbyExperiences(userId: string, radiusKm?: number): Promise<Experience[]>;
  getRecentPostsByUser(userId: string, limit?: number): Promise<Post[]>;
  getUpcomingSlotsByLocation(location: string, limit?: number): Promise<Slot[]>;

  // Mini Concierge operations
  createMiniPlan(plan: InsertMiniPlan): Promise<MiniPlan>;
  createMiniPlanSpots(spots: InsertMiniPlanSpot[]): Promise<MiniPlanSpot[]>;
  getMiniPlanById(id: number): Promise<(MiniPlan & { spots: MiniPlanSpot[] }) | undefined>;
  getMiniPlansByUser(userId: string, limit?: number): Promise<(MiniPlan & { spots: MiniPlanSpot[] })[]>;
  startMiniPlan(planId: number): Promise<MiniPlan | undefined>;
  completeMiniPlan(planId: number): Promise<MiniPlan | undefined>;
  checkInSpot(checkin: InsertMiniPlanCheckin): Promise<MiniPlanCheckin>;
  getCheckinsByPlan(planId: number): Promise<MiniPlanCheckin[]>;
  getNearbyPOIs(latitude: number, longitude: number, radiusM?: number): Promise<any[]>;

  // Serendipity Protocol operations
  createQuest(quest: InsertQuest): Promise<Quest>;
  getQuestById(id: number): Promise<Quest | undefined>;
  getActiveQuests(latitude: number, longitude: number, radiusM?: number): Promise<Quest[]>;
  getQuestsByUser(userId: string, limit?: number): Promise<(Quest & { participants: QuestParticipant[] })[]>;
  updateQuestStatus(id: number, status: string): Promise<Quest | undefined>;
  addQuestParticipant(participant: InsertQuestParticipant): Promise<QuestParticipant>;
  updateQuestParticipantStatus(questId: number, userId: string, status: string, resultJson?: any): Promise<QuestParticipant | undefined>;
  getQuestParticipants(questId: number): Promise<(QuestParticipant & { user: User })[]>;
  createQuestHighlight(highlight: InsertQuestHighlight): Promise<QuestHighlight>;
  getQuestHighlights(questId: number): Promise<QuestHighlight[]>;
  findNearbyUsersWithSamePlan(planId: number, userId: string, latitude: number, longitude: number, radiusM: number): Promise<User[]>;
  findNearbyUsersWithSimilarTags(tags: string[], userId: string, latitude: number, longitude: number, radiusM: number): Promise<User[]>;

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

  // Purchase Proxy operations (구매대행 서비스)
  createPurchaseRequest(request: InsertPurchaseRequest): Promise<PurchaseRequest>;
  getPurchaseRequestById(id: number): Promise<PurchaseRequest | undefined>;
  getPurchaseRequestsByBuyer(buyerId: string): Promise<PurchaseRequest[]>;
  getPurchaseRequestsBySeller(sellerId: string): Promise<PurchaseRequest[]>;
  updatePurchaseRequestStatus(id: number, status: string): Promise<PurchaseRequest | undefined>;
  
  createPurchaseQuote(quote: InsertPurchaseQuote): Promise<PurchaseQuote>;
  getPurchaseQuotesByRequest(requestId: number): Promise<PurchaseQuote[]>;
  getPurchaseQuoteById(id: number): Promise<PurchaseQuote | undefined>;
  updatePurchaseQuoteStatus(id: number, status: string): Promise<PurchaseQuote | undefined>;
  
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined>;
  getPurchaseOrdersByBuyer(buyerId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrdersBySeller(sellerId: string): Promise<PurchaseOrder[]>;
  updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrder | undefined>;
  
  // 구매대행 서비스 검색 (shopping 카테고리 경험들)
  getShoppingServices(): Promise<Experience[]>;

  // 여행자 도움 요청 시스템
  createHelpRequest(request: InsertHelpRequest): Promise<HelpRequest>;
  getHelpRequestById(id: number): Promise<HelpRequest | undefined>;
  getHelpRequestsByRequester(requesterId: string): Promise<HelpRequest[]>;
  updateHelpRequestStatus(id: number, status: string): Promise<HelpRequest | undefined>;
  
  createHelpResponse(response: InsertRequestResponse): Promise<RequestResponse>;
  getHelpResponsesByRequest(requestId: number): Promise<RequestResponse[]>;
  updateHelpResponseStatus(id: number, status: string): Promise<RequestResponse | undefined>;
  
  // ==================== 인플루언서 기능 Operations ====================
  // Service Template operations
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  getServiceTemplatesByCreator(creatorId: string): Promise<ServiceTemplate[]>;
  getServiceTemplateById(id: number): Promise<ServiceTemplate | undefined>;
  updateServiceTemplate(id: number, updates: Partial<InsertServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;
  getActiveServiceTemplates(templateType?: string): Promise<ServiceTemplate[]>;
  
  // Service Package operations
  createServicePackage(packageData: InsertServicePackage): Promise<ServicePackage>;
  getServicePackagesByCreator(creatorId: string): Promise<ServicePackage[]>;
  getServicePackageById(id: number): Promise<ServicePackage | undefined>;
  updateServicePackage(id: number, updates: Partial<InsertServicePackage>): Promise<ServicePackage | undefined>;
  deleteServicePackage(id: number): Promise<boolean>;
  
  // Package Item operations
  createPackageItem(item: InsertPackageItem): Promise<PackageItem>;
  getPackageItemsByPackage(packageId: number): Promise<PackageItem[]>;
  deletePackageItem(id: number): Promise<boolean>;
  
  // ==================== 로컬 가이드 슬롯 관리 Operations ====================
  // Slot operations
  createSlot(slot: InsertSlot): Promise<Slot>;
  getSlotsByHost(hostId: string): Promise<Slot[]>;
  getSlotById(id: number): Promise<Slot | undefined>;
  updateSlot(id: number, updates: Partial<InsertSlot>): Promise<Slot | undefined>;
  deleteSlot(id: number): Promise<boolean>;
  
  // Slot search and availability
  searchSlots(filters: {
    hostId?: string;
    startDate?: string;
    endDate?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    category?: string;
    serviceType?: string;
    minPrice?: number;
    maxPrice?: number;
    availableOnly?: boolean;
    minParticipants?: number;
    limit?: number;
    offset?: number;
  }): Promise<Slot[]>;
  updateSlotAvailability(id: number, isAvailable: boolean, reason?: string): Promise<Slot | undefined>;
  
  // Bulk operations
  bulkCreateSlots(template: Omit<InsertSlot, 'date'>, dates: string[]): Promise<Slot[]>;
  getAvailableSlots(hostId: string, startDate: string, endDate: string): Promise<Slot[]>;
  
  // ==================== 예약 관리 Operations ====================
  // Booking operations
  getBookingsByUser(userId: string, role: 'guest' | 'host'): Promise<Booking[]>;
  getBookingsBySlot(slotId: number): Promise<Booking[]>;
  
  // Booking search and availability
  searchBookings(filters: {
    userId?: string;
    role?: 'guest' | 'host';
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Booking[]>;
  checkSlotAvailability(slotId: number, participants: number): Promise<{
    available: boolean;
    remainingCapacity: number;
    conflicts?: string[];
  }>;

  // ==================== Smart Feed & Hashtag System ====================
  // Hashtag operations
  createHashtag(hashtag: InsertHashtag): Promise<Hashtag>;
  getHashtagById(id: number): Promise<Hashtag | undefined>;
  getHashtagByName(name: string): Promise<Hashtag | undefined>;
  searchHashtags(query: string, limit?: number): Promise<Hashtag[]>;
  getTrendingHashtags(limit?: number, period?: 'day' | 'week'): Promise<(Hashtag & { growthRate: number })[]>;
  updateHashtagCounts(id: number): Promise<Hashtag | undefined>;
  
  // Hashtag translation operations
  createHashtagTranslation(translation: InsertHashtagTranslation): Promise<HashtagTranslation>;
  getHashtagTranslations(hashtagId: number): Promise<HashtagTranslation[]>;
  getHashtagWithTranslation(hashtagId: number, languageCode: string): Promise<(Hashtag & { translatedName?: string }) | undefined>;
  
  // Post-Hashtag operations
  createPostHashtag(postHashtag: InsertPostHashtag): Promise<PostHashtag>;
  getPostHashtags(postId: number): Promise<(PostHashtag & { hashtag: Hashtag })[]>;
  getPostsByHashtag(hashtagId: number, limit?: number, offset?: number): Promise<Post[]>;
  parseAndLinkHashtags(postId: number, content: string): Promise<Hashtag[]>;
  
  // Hashtag follow operations
  followHashtag(userId: string, hashtagId: number): Promise<HashtagFollow>;
  unfollowHashtag(userId: string, hashtagId: number): Promise<boolean>;
  getFollowedHashtags(userId: string): Promise<(HashtagFollow & { hashtag: Hashtag })[]>;
  isFollowingHashtag(userId: string, hashtagId: number): Promise<boolean>;
  
  // Post save (bookmark) operations
  savePost(userId: string, postId: number): Promise<PostSave>;
  unsavePost(userId: string, postId: number): Promise<boolean>;
  getSavedPosts(userId: string, limit?: number, offset?: number): Promise<Post[]>;
  isPostSaved(userId: string, postId: number): Promise<boolean>;
  
  // User engagement operations
  createEngagementEvent(event: InsertUserEngagementEvent): Promise<UserEngagementEvent>;
  getPostVelocity(postId: number, windowMinutes?: number): Promise<number>;
  
  // User feed preferences
  getUserFeedPreferences(userId: string): Promise<UserFeedPreferences | undefined>;
  setUserFeedPreferences(prefs: InsertUserFeedPreferences): Promise<UserFeedPreferences>;
  
  // Feed algorithm weights (system config)
  getActiveFeedAlgorithmWeights(): Promise<FeedAlgorithmWeights | undefined>;
  setFeedAlgorithmWeights(weights: InsertFeedAlgorithmWeights): Promise<FeedAlgorithmWeights>;
  
  // Smart Feed operations
  getSmartFeed(userId: string, options: {
    mode: 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag';
    limit?: number;
    offset?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<(Post & { score?: number })[]>;
  
  // Hashtag metrics
  updateHashtagMetrics(hashtagId: number): Promise<void>;
  seedInitialHashtags(): Promise<void>;
  
  // =====================================================
  // 빌링 시스템 (Phase 1)
  // =====================================================
  
  // Billing Plans (요금제)
  getBillingPlans(target?: 'traveler' | 'host', type?: 'subscription' | 'one_time'): Promise<BillingPlan[]>;
  getBillingPlanById(id: string): Promise<BillingPlan | undefined>;
  createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan>;
  updateBillingPlan(id: string, updates: Partial<InsertBillingPlan>): Promise<BillingPlan | undefined>;
  
  // User Subscriptions (사용자 구독)
  getUserSubscription(userId: string, target?: 'traveler' | 'host'): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;
  cancelUserSubscription(id: number): Promise<UserSubscription | undefined>;
  
  // User Usage (사용량 추적)
  getUserUsage(userId: string, usageKey: string): Promise<UserUsage | undefined>;
  createUserUsage(usage: InsertUserUsage): Promise<UserUsage>;
  incrementUserUsage(userId: string, usageKey: string): Promise<UserUsage | undefined>;
  resetUserUsagePeriod(userId: string, usageKey: string, newPeriodEnd: Date): Promise<UserUsage | undefined>;
  
  // User Trip Passes (Trip Pass)
  getActiveTripPass(userId: string): Promise<UserTripPass | undefined>;
  getUserTripPasses(userId: string): Promise<UserTripPass[]>;
  createUserTripPass(tripPass: InsertUserTripPass): Promise<UserTripPass>;
  incrementTripPassUsage(id: number, usageKey: 'ai_message' | 'translation' | 'concierge'): Promise<UserTripPass | undefined>;
  
  // Contract Stages (계약 단계)
  getContractStages(contractId: number): Promise<ContractStage[]>;
  createContractStage(stage: InsertContractStage): Promise<ContractStage>;
  updateContractStageStatus(id: number, status: string, paymentId?: number): Promise<ContractStage | undefined>;
  
  // Escrow Accounts (에스크로 계좌)
  getEscrowAccount(userId: string): Promise<EscrowAccount | undefined>;
  createEscrowAccount(account: InsertEscrowAccount): Promise<EscrowAccount>;
  updateEscrowBalance(userId: string, balanceUpdates: { pending?: string; available?: string; withdrawable?: string }): Promise<EscrowAccount | undefined>;
  
  // Payouts (호스트 정산)
  getPayouts(hostId: string, limit?: number): Promise<Payout[]>;
  createPayout(payout: InsertPayout): Promise<Payout>;
  updatePayoutStatus(id: number, status: string, transferId?: string): Promise<Payout | undefined>;
  
  // Payment Transactions (결제 거래)
  getPaymentTransactions(userId: string, limit?: number): Promise<PaymentTransaction[]>;
  getPaymentTransactionByPortoneId(portonePaymentId: string): Promise<PaymentTransaction | undefined>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransactionStatus(id: number, status: string, portonePaymentId?: string): Promise<PaymentTransaction | undefined>;
  
  // Billing Keys (빌링키 - 정기결제용)
  getBillingKeysByUserId(userId: string): Promise<BillingKey[]>;
  getBillingKeyById(id: number): Promise<BillingKey | undefined>;
  createBillingKey(data: InsertBillingKey): Promise<BillingKey>;
  deleteBillingKey(id: number, userId: string): Promise<boolean>;
  setDefaultBillingKey(id: number, userId: string): Promise<boolean>;
  
  // Payment Logs (결제 로그)
  createPaymentLog(data: InsertPaymentLog): Promise<PaymentLog>;
  getPaymentLogsByPaymentId(paymentId: string): Promise<PaymentLog[]>;
  getPaymentLogsByUserId(userId: string, limit?: number): Promise<PaymentLog[]>;

  // --- Admin Repository Methods ---
  executeSQL(query: string): Promise<any>;
  getPoiCategories(): Promise<PoiCategory[]>;
  getPoiCategoriesWithTypes(languageCode?: string): Promise<any[]>;
  createPoiCategory(category: InsertPoiCategory): Promise<PoiCategory>;
  createPoiType(type: InsertPoiType): Promise<PoiType>;
  createPoiCategoryTranslation(translation: InsertPoiCategoryTranslation): Promise<PoiCategoryTranslation>;
  createPoiTypeTranslation(translation: InsertPoiTypeTranslation): Promise<PoiTypeTranslation>;
  bulkInsertPoiCategories(categories: InsertPoiCategory[]): Promise<PoiCategory[]>;
  bulkInsertPoiTypes(types: InsertPoiType[]): Promise<PoiType[]>;
  bulkInsertPoiCategoryTranslations(translations: InsertPoiCategoryTranslation[]): Promise<PoiCategoryTranslation[]>;
  bulkInsertPoiTypeTranslations(translations: InsertPoiTypeTranslation[]): Promise<PoiTypeTranslation[]>;
  getPoiCategoryCount(): Promise<number>;
  getTranslationsByNamespace(namespace: string, locale: string): Promise<Record<string, string>>;
  getAllTranslationsForExport(): Promise<any[]>;
  getSystemConfigByKey(category: string, key: string): Promise<SystemConfig | undefined>;
  getSystemConfigsByCategory(category: string): Promise<SystemConfig[]>;
  getAllSystemConfigs(): Promise<SystemConfig[]>;
  createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
  updateSystemConfig(id: number, updates: Partial<InsertSystemConfig>, updatedBy?: string): Promise<SystemConfig | undefined>;
  deleteSystemConfig(id: number): Promise<boolean>;
  createConfigAuditLog(log: any): Promise<ConfigAuditLog>;
  getConfigAuditLogs(configId?: number, limit?: number): Promise<ConfigAuditLog[]>;
  createUserSession(session: Partial<UserSession>): Promise<UserSession>;
  updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined>;
  getUserSession(sessionId: string): Promise<UserSession | undefined>;
  createUserEvent(event: InsertUserEvent): Promise<UserEvent>;
  getUserEventsBySession(sessionId: string, limit?: number): Promise<UserEvent[]>;
  getUserDailyMetrics(userId: string, startDate: Date, endDate: Date): Promise<UserDailyMetric[]>;
  upsertUserDailyMetric(userId: string, date: Date, updates: Partial<UserDailyMetric>): Promise<UserDailyMetric>;

  // AI Prompt Templates
  getAiPromptTemplate(templateKey: string, locale?: string): Promise<AiPromptTemplate | undefined>;
  getAiPromptTemplatesByCategory(category: string): Promise<AiPromptTemplate[]>;
  getAllAiPromptTemplates(): Promise<AiPromptTemplate[]>;
  createAiPromptTemplate(template: InsertAiPromptTemplate): Promise<AiPromptTemplate>;
  updateAiPromptTemplate(id: number, updates: Partial<InsertAiPromptTemplate>, updatedBy?: string): Promise<AiPromptTemplate | undefined>;
}

// thin composer로 교체
export const storage: IStorage = {
  ...userRepo,
  ...notificationRepo,
  ...socialRepo,
  ...chatRepo,
  ...contentRepo,
  ...bookingRepo,
  ...feedRepo,
  ...aiRepo,
  ...billingRepo,
  ...commerceRepo,
  ...adminRepo,
};
