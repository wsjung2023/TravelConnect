/**
 * ============================================
 * 저장소 서브 인터페이스 정의
 * Repository Sub-interfaces
 * ============================================
 * 
 * 이 파일은 storage.ts의 IStorage 인터페이스를 도메인별로 분리합니다.
 * 점진적 마이그레이션을 위해 설계되었습니다.
 * 
 * 아키텍처:
 * - 각 도메인은 독립적인 인터페이스로 분리
 * - IStorage는 모든 서브 인터페이스를 상속
 * - 기존 코드와의 하위 호환성 유지
 * 
 * 도메인 분류:
 * 1. IUserRepository - 사용자 CRUD 및 프로필 관리
 * 2. ISocialRepository - 소셜 기능 (팔로우, 좋아요, 댓글, 알림)
 * 3. IPaymentsRepository - 결제 및 구독 관리
 * 4. IBookingRepository - 예약 및 경험 관리
 * 5. IChatRepository - 채팅 및 메시징
 * 6. IAIRepository - AI 관련 기능 (CineMap, Mini Concierge)
 * 7. IAdminRepository - 관리자 기능 및 시스템 설정
 * 8. IFeedRepository - 피드 및 해시태그 시스템
 * 
 * 마이그레이션 가이드:
 * 1. 새로운 라우터에서 필요한 서브 인터페이스만 의존
 * 2. 기존 storage 객체는 그대로 사용 가능
 * 3. 테스트 시 각 서브 인터페이스 단위로 모킹 가능
 */

import type {
  User,
  UpsertUser,
  Experience,
  InsertExperience,
  Post,
  InsertPost,
  PostMedia,
  InsertPostMedia,
  Comment,
  InsertComment,
  Booking,
  InsertBooking,
  Conversation,
  Message,
  InsertMessage,
  MessageTranslation,
  InsertMessageTranslation,
  Trip,
  InsertTrip,
  Timeline,
  InsertTimeline,
  Review,
  InsertReview,
  Notification,
  InsertNotification,
  Follow,
  InsertFollow,
  Channel,
  InsertChannel,
  ChannelMember,
  InsertChannelMember,
  CinemapJob,
  InsertCinemapJob,
  MiniPlan,
  InsertMiniPlan,
  MiniPlanSpot,
  InsertMiniPlanSpot,
  MiniPlanCheckin,
  InsertMiniPlanCheckin,
  Quest,
  InsertQuest,
  QuestParticipant,
  InsertQuestParticipant,
  QuestHighlight,
  InsertQuestHighlight,
  MiniMeet,
  InsertMiniMeet,
  MiniMeetAttendee,
  Slot,
  InsertSlot,
  Payment,
  SystemSetting,
  InsertSystemSetting,
  BillingPlan,
  InsertBillingPlan,
  UserSubscription,
  InsertUserSubscription,
  UserUsage,
  InsertUserUsage,
  UserTripPass,
  InsertUserTripPass,
  ContractStage,
  InsertContractStage,
  EscrowAccount,
  InsertEscrowAccount,
  Payout,
  InsertPayout,
  PaymentTransaction,
  InsertPaymentTransaction,
  BillingKey,
  InsertBillingKey,
  PaymentLog,
  InsertPaymentLog,
  Hashtag,
  InsertHashtag,
  HashtagTranslation,
  InsertHashtagTranslation,
  PostHashtag,
  InsertPostHashtag,
  HashtagFollow,
  PostSave,
  InsertPostSave,
  UserEngagementEvent,
  InsertUserEngagementEvent,
  UserFeedPreferences,
  InsertUserFeedPreferences,
  FeedAlgorithmWeights,
  InsertFeedAlgorithmWeights,
  PurchaseRequest,
  InsertPurchaseRequest,
  PurchaseQuote,
  InsertPurchaseQuote,
  PurchaseOrder,
  InsertPurchaseOrder,
  HelpRequest,
  InsertHelpRequest,
  RequestResponse,
  InsertRequestResponse,
  ServiceTemplate,
  InsertServiceTemplate,
  ServicePackage,
  InsertServicePackage,
  PackageItem,
  InsertPackageItem,
} from '@shared/schema';

// ============================================
// 1. 사용자 저장소 (User Repository)
// ============================================
// 사용자 계정 CRUD, 프로필, 가이드 정보 관리
export interface IUserRepository {
  // 사용자 조회
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPublicProfileUrl(url: string): Promise<User | undefined>;
  getOpenUsers(): Promise<User[]>;
  
  // 사용자 생성/수정
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  
  // 가이드 프로필 (호스트 상세 정보)
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
}

// ============================================
// 2. 소셜 저장소 (Social Repository)
// ============================================
// 팔로우, 좋아요, 댓글, 알림 등 SNS 핵심 기능
export interface ISocialRepository {
  // 팔로우
  follow(followerId: string, followingId: string): Promise<Follow | null>;
  unfollow(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowStats(userId: string): Promise<{ followers: number; following: number }>;
  
  // 좋아요 (IStorage와 일치 - toggleLike만 존재)
  toggleLike(userId: string, postId: number): Promise<boolean>;
  
  // 댓글
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<Comment[]>;
  deleteComment(commentId: number, userId: string): Promise<boolean>;
  
  // 알림
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: number): Promise<boolean>;
}

// ============================================
// 3. 결제 저장소 (Payments Repository)
// ============================================
// 구독, Trip Pass, 에스크로, 정산 등 결제 관련 기능
export interface IPaymentsRepository {
  // 요금제 (Billing Plans)
  getBillingPlans(target?: 'traveler' | 'host', type?: 'subscription' | 'one_time'): Promise<BillingPlan[]>;
  getBillingPlanById(id: string): Promise<BillingPlan | undefined>;
  createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan>;
  updateBillingPlan(id: string, updates: Partial<InsertBillingPlan>): Promise<BillingPlan | undefined>;
  
  // 구독 (Subscriptions)
  getUserSubscription(userId: string, target?: 'traveler' | 'host'): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, updates: Partial<InsertUserSubscription>): Promise<UserSubscription | undefined>;
  cancelUserSubscription(id: number): Promise<UserSubscription | undefined>;
  
  // 사용량 추적 (Usage Tracking)
  getUserUsage(userId: string, usageKey: string): Promise<UserUsage | undefined>;
  createUserUsage(usage: InsertUserUsage): Promise<UserUsage>;
  incrementUserUsage(userId: string, usageKey: string): Promise<UserUsage | undefined>;
  resetUserUsagePeriod(userId: string, usageKey: string, newPeriodEnd: Date): Promise<UserUsage | undefined>;
  
  // Trip Pass (시그니처는 IStorage와 일치해야 함)
  getActiveTripPass(userId: string): Promise<UserTripPass | undefined>;
  getUserTripPasses(userId: string): Promise<UserTripPass[]>;
  createUserTripPass(tripPass: InsertUserTripPass): Promise<UserTripPass>;
  incrementTripPassUsage(id: number, usageKey: 'ai_message' | 'translation' | 'concierge'): Promise<UserTripPass | undefined>;
  
  // 계약 단계 (Contract Stages)
  getContractStages(contractId: number): Promise<ContractStage[]>;
  createContractStage(stage: InsertContractStage): Promise<ContractStage>;
  updateContractStageStatus(id: number, status: string, paymentId?: number): Promise<ContractStage | undefined>;
  
  // 에스크로 계좌 (Escrow Accounts)
  getEscrowAccount(userId: string): Promise<EscrowAccount | undefined>;
  createEscrowAccount(account: InsertEscrowAccount): Promise<EscrowAccount>;
  updateEscrowBalance(userId: string, balanceUpdates: { pending?: string; available?: string; withdrawable?: string }): Promise<EscrowAccount | undefined>;
  
  // 정산 (Payouts)
  getPayouts(hostId: string, limit?: number): Promise<Payout[]>;
  createPayout(payout: InsertPayout): Promise<Payout>;
  updatePayoutStatus(id: number, status: string, transferId?: string): Promise<Payout | undefined>;
  
  // 결제 거래 (Payment Transactions)
  getPaymentTransactions(userId: string, limit?: number): Promise<PaymentTransaction[]>;
  getPaymentTransactionByPortoneId(portonePaymentId: string): Promise<PaymentTransaction | undefined>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransactionStatus(id: number, status: string, portonePaymentId?: string): Promise<PaymentTransaction | undefined>;
  
  // 빌링키 (Billing Keys - 정기결제용)
  getBillingKeysByUserId(userId: string): Promise<BillingKey[]>;
  getBillingKeyById(id: number): Promise<BillingKey | undefined>;
  createBillingKey(data: InsertBillingKey): Promise<BillingKey>;
  deleteBillingKey(id: number, userId: string): Promise<boolean>;
  setDefaultBillingKey(id: number, userId: string): Promise<boolean>;
  
  // 결제 로그 (Payment Logs)
  createPaymentLog(data: InsertPaymentLog): Promise<PaymentLog>;
  getPaymentLogsByPaymentId(paymentId: string): Promise<PaymentLog[]>;
  getPaymentLogsByUserId(userId: string, limit?: number): Promise<PaymentLog[]>;
}

// ============================================
// 4. 예약 저장소 (Booking Repository)
// ============================================
// 경험 상품, 슬롯, 예약 관리
export interface IBookingRepository {
  // 경험 (Experiences)
  createExperience(experience: InsertExperience): Promise<Experience>;
  getExperiences(location?: string, category?: string): Promise<Experience[]>;
  getExperienceById(id: number): Promise<Experience | undefined>;
  getExperiencesByHost(hostId: string): Promise<Experience[]>;
  updateExperience(id: number, updates: Partial<InsertExperience>): Promise<Experience | undefined>;
  
  // 슬롯 (Slots)
  createSlot(slot: InsertSlot): Promise<Slot>;
  getSlotsByHost(hostId: string): Promise<Slot[]>;
  getSlotById(id: number): Promise<Slot | undefined>;
  updateSlot(id: number, updates: Partial<InsertSlot>): Promise<Slot | undefined>;
  deleteSlot(id: number): Promise<boolean>;
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
  bulkCreateSlots(template: Omit<InsertSlot, 'date'>, dates: string[]): Promise<Slot[]>;
  getAvailableSlots(hostId: string, startDate: string, endDate: string): Promise<Slot[]>;
  
  // 예약 (Bookings)
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getBookingsByHost(hostId: string): Promise<Booking[]>;
  getBookingsByUser(userId: string, role: 'guest' | 'host'): Promise<Booking[]>;
  getBookingsBySlot(slotId: number): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string, cancelReason?: string): Promise<Booking | undefined>;
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
  
  // 자동화 비즈니스 로직
  processExpiredBookings(): Promise<number>;
  processCompletedExperiences(): Promise<number>;
  recalculateSlotAvailability(slotId?: number): Promise<void>;
  
  // 리뷰 (Reviews)
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByExperience(experienceId: number): Promise<Review[]>;
  getReviewsByHost(hostId: string): Promise<Review[]>;
}

// ============================================
// 5. 채팅 저장소 (Chat Repository)
// ============================================
// 1:1 대화, 채널, 메시지, 번역
export interface IChatRepository {
  // 1:1 대화 (Conversations)
  getOrCreateConversation(participant1Id: string, participant2Id: string): Promise<Conversation>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  
  // 메시지 (Messages)
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  
  // 채널 (Channels - 그룹 채팅)
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannelsByUser(userId: string): Promise<Channel[]>;
  getChannelById(id: number): Promise<Channel | undefined>;
  addChannelMember(channelId: number, userId: string, role?: string): Promise<ChannelMember>;
  removeChannelMember(channelId: number, userId: string): Promise<void>;
  getChannelMembers(channelId: number): Promise<(ChannelMember & { user: User })[]>;
  
  // 채널 메시지
  createChannelMessage(message: Omit<InsertMessage, 'conversationId'> & { channelId: number }): Promise<Message>;
  getMessagesByChannel(channelId: number, limit?: number, offset?: number): Promise<Message[]>;
  getThreadMessages(parentMessageId: number): Promise<Message[]>;
  
  // AI Concierge 채널
  getOrCreateAIConciergeChannel(userId: string): Promise<Channel>;
}

// ============================================
// 6. AI 저장소 (AI Repository)
// ============================================
// CineMap, Mini Concierge, Serendipity Protocol
export interface IAIRepository {
  // CineMap
  createCinemapJob(job: InsertCinemapJob): Promise<CinemapJob>;
  getCinemapJobById(id: number): Promise<CinemapJob | undefined>;
  getCinemapJobsByUser(userId: string): Promise<CinemapJob[]>;
  getCinemapJobsByTimeline(timelineId: number): Promise<CinemapJob[]>;
  updateCinemapJob(id: number, updates: Partial<InsertCinemapJob>): Promise<CinemapJob | undefined>;
  
  // Mini Concierge
  createMiniPlan(plan: InsertMiniPlan): Promise<MiniPlan>;
  createMiniPlanSpots(spots: InsertMiniPlanSpot[]): Promise<MiniPlanSpot[]>;
  getMiniPlanById(id: number): Promise<(MiniPlan & { spots: MiniPlanSpot[] }) | undefined>;
  getMiniPlansByUser(userId: string, limit?: number): Promise<(MiniPlan & { spots: MiniPlanSpot[] })[]>;
  startMiniPlan(planId: number): Promise<MiniPlan | undefined>;
  completeMiniPlan(planId: number): Promise<MiniPlan | undefined>;
  checkInSpot(checkin: InsertMiniPlanCheckin): Promise<MiniPlanCheckin>;
  getCheckinsByPlan(planId: number): Promise<MiniPlanCheckin[]>;
  getNearbyPOIs(latitude: number, longitude: number, radiusM?: number): Promise<any[]>;
  
  // Serendipity Protocol (퀘스트)
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
  
  // AI Concierge 데이터 소스
  getNearbyExperiences(userId: string, radiusKm?: number): Promise<Experience[]>;
  getRecentPostsByUser(userId: string, limit?: number): Promise<Post[]>;
  getUpcomingSlotsByLocation(location: string, limit?: number): Promise<Slot[]>;
}

// ============================================
// 7. 관리자 저장소 (Admin Repository)
// ============================================
// 시스템 설정, 통계, 커머스 관리
export interface IAdminRepository {
  // 시스템 설정
  getSystemSetting(category: string, key: string): Promise<string | undefined>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getAllSystemSettings(category?: string): Promise<SystemSetting[]>;
  updateSystemSetting(id: string, updates: Partial<InsertSystemSetting>): Promise<SystemSetting | undefined>;
  
  // 커머스 통계
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

// ============================================
// 8. 피드 저장소 (Feed Repository)
// ============================================
// 포스트, 해시태그, 스마트 피드
export interface IFeedRepository {
  // 포스트 (Posts) - 전체 CRUD
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number, offset?: number): Promise<Post[]>;
  getPostById(postId: number): Promise<Post | null>;
  getPostsByUser(userId: string): Promise<Post[]>;
  getPostsByUserWithTakenAt(userId: string): Promise<Post[]>;
  updatePost(postId: number, data: Partial<InsertPost>): Promise<Post | null>;
  deletePost(postId: number): Promise<boolean>;
  
  // 포스트 미디어
  createPostMedia(media: InsertPostMedia): Promise<PostMedia>;
  createPostMediaBatch(mediaList: InsertPostMedia[]): Promise<PostMedia[]>;
  getPostMediaByPostId(postId: number): Promise<PostMedia[]>;
  
  // 타임라인 (Timelines)
  createTimeline(timeline: InsertTimeline): Promise<Timeline>;
  getTimelinesByUser(userId: string): Promise<Timeline[]>;
  getTimelineById(id: number): Promise<Timeline | undefined>;
  updateTimeline(id: number, updates: Partial<InsertTimeline>): Promise<Timeline | undefined>;
  deleteTimeline(id: number): Promise<boolean>;
  getTimelineWithPosts(id: number): Promise<(Timeline & { posts: Post[] }) | undefined>;
  
  // 여행 (Trips)
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripsByUser(userId: string): Promise<Trip[]>;
  updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip | undefined>;
  
  // 해시태그 (Hashtags)
  createHashtag(hashtag: InsertHashtag): Promise<Hashtag>;
  getHashtagById(id: number): Promise<Hashtag | undefined>;
  getHashtagByName(name: string): Promise<Hashtag | undefined>;
  searchHashtags(query: string, limit?: number): Promise<Hashtag[]>;
  getTrendingHashtags(limit?: number, period?: 'day' | 'week'): Promise<(Hashtag & { growthRate: number })[]>;
  updateHashtagCounts(id: number): Promise<Hashtag | undefined>;
  
  // 해시태그 번역
  createHashtagTranslation(translation: InsertHashtagTranslation): Promise<HashtagTranslation>;
  getHashtagTranslations(hashtagId: number): Promise<HashtagTranslation[]>;
  getHashtagWithTranslation(hashtagId: number, languageCode: string): Promise<(Hashtag & { translatedName?: string }) | undefined>;
  
  // 포스트-해시태그 연결
  createPostHashtag(postHashtag: InsertPostHashtag): Promise<PostHashtag>;
  getPostHashtags(postId: number): Promise<(PostHashtag & { hashtag: Hashtag })[]>;
  getPostsByHashtag(hashtagId: number, limit?: number, offset?: number): Promise<Post[]>;
  parseAndLinkHashtags(postId: number, content: string): Promise<Hashtag[]>;
  
  // 해시태그 팔로우
  followHashtag(userId: string, hashtagId: number): Promise<HashtagFollow>;
  unfollowHashtag(userId: string, hashtagId: number): Promise<boolean>;
  getFollowedHashtags(userId: string): Promise<(HashtagFollow & { hashtag: Hashtag })[]>;
  isFollowingHashtag(userId: string, hashtagId: number): Promise<boolean>;
  
  // 포스트 저장 (북마크)
  savePost(userId: string, postId: number): Promise<PostSave>;
  unsavePost(userId: string, postId: number): Promise<boolean>;
  getSavedPosts(userId: string, limit?: number, offset?: number): Promise<Post[]>;
  isPostSaved(userId: string, postId: number): Promise<boolean>;
  
  // 사용자 참여도
  createEngagementEvent(event: InsertUserEngagementEvent): Promise<UserEngagementEvent>;
  getPostVelocity(postId: number, windowMinutes?: number): Promise<number>;
  
  // 피드 설정
  getUserFeedPreferences(userId: string): Promise<UserFeedPreferences | undefined>;
  setUserFeedPreferences(prefs: InsertUserFeedPreferences): Promise<UserFeedPreferences>;
  getActiveFeedAlgorithmWeights(): Promise<FeedAlgorithmWeights | undefined>;
  setFeedAlgorithmWeights(weights: InsertFeedAlgorithmWeights): Promise<FeedAlgorithmWeights>;
  
  // 스마트 피드
  getSmartFeed(userId: string, options: {
    mode: 'smart' | 'latest' | 'nearby' | 'popular' | 'hashtag';
    limit?: number;
    offset?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<(Post & { score?: number })[]>;
  
  // 해시태그 메트릭스
  updateHashtagMetrics(hashtagId: number): Promise<void>;
  seedInitialHashtags(): Promise<void>;
}

// ============================================
// 9. 부가 서비스 저장소 (Auxiliary Repository)
// ============================================
// 구매대행, 도움요청, 미니밋, 서비스 템플릿
export interface IAuxiliaryRepository {
  // MiniMeets (즉석 만남)
  createMiniMeet(data: InsertMiniMeet): Promise<MiniMeet>;
  getMiniMeetsNearby(latitude: number, longitude: number, radius: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] })[]>;
  joinMiniMeet(meetId: number, userId: string): Promise<MiniMeetAttendee>;
  leaveMiniMeet(meetId: number, userId: string): Promise<void>;
  getMiniMeetAttendees(meetId: number): Promise<(MiniMeetAttendee & { user: User })[]>;
  getMiniMeetById(id: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] }) | undefined>;
  
  // 구매대행 (Purchase Proxy)
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
  getShoppingServices(): Promise<Experience[]>;
  
  // 도움 요청 (Help Requests)
  createHelpRequest(request: InsertHelpRequest): Promise<HelpRequest>;
  getHelpRequestById(id: number): Promise<HelpRequest | undefined>;
  getHelpRequestsByRequester(requesterId: string): Promise<HelpRequest[]>;
  updateHelpRequestStatus(id: number, status: string): Promise<HelpRequest | undefined>;
  createHelpResponse(response: InsertRequestResponse): Promise<RequestResponse>;
  getHelpResponsesByRequest(requestId: number): Promise<RequestResponse[]>;
  updateHelpResponseStatus(id: number, status: string): Promise<RequestResponse | undefined>;
  
  // 서비스 템플릿 (인플루언서 기능)
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  getServiceTemplatesByCreator(creatorId: string): Promise<ServiceTemplate[]>;
  getServiceTemplateById(id: number): Promise<ServiceTemplate | undefined>;
  updateServiceTemplate(id: number, updates: Partial<InsertServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;
  getActiveServiceTemplates(templateType?: string): Promise<ServiceTemplate[]>;
  
  // 서비스 패키지
  createServicePackage(packageData: InsertServicePackage): Promise<ServicePackage>;
  getServicePackagesByCreator(creatorId: string): Promise<ServicePackage[]>;
  getServicePackageById(id: number): Promise<ServicePackage | undefined>;
  updateServicePackage(id: number, updates: Partial<InsertServicePackage>): Promise<ServicePackage | undefined>;
  deleteServicePackage(id: number): Promise<boolean>;
  
  // 패키지 아이템
  createPackageItem(item: InsertPackageItem): Promise<PackageItem>;
  getPackageItemsByPackage(packageId: number): Promise<PackageItem[]>;
  deletePackageItem(id: number): Promise<boolean>;
}

// ============================================
// 통합 인터페이스 (Unified Interface)
// ============================================
// 모든 서브 인터페이스를 상속하여 기존 IStorage와 호환
export interface IStorageUnified extends 
  IUserRepository,
  ISocialRepository,
  IPaymentsRepository,
  IBookingRepository,
  IChatRepository,
  IAIRepository,
  IAdminRepository,
  IFeedRepository,
  IAuxiliaryRepository {}

// ============================================
// 타입 가드 헬퍼
// ============================================
// 런타임에서 인터페이스 구현 여부 확인용
// 각 저장소의 필수 메서드 존재 여부로 판별

export function isUserRepository(storage: unknown): storage is IUserRepository {
  return typeof storage === 'object' && storage !== null && 
    'getUser' in storage && 
    'createUser' in storage &&
    'updateUser' in storage;
}

export function isSocialRepository(storage: unknown): storage is ISocialRepository {
  return typeof storage === 'object' && storage !== null && 
    'toggleLike' in storage && 
    'createComment' in storage &&
    'createNotification' in storage;
}

export function isPaymentsRepository(storage: unknown): storage is IPaymentsRepository {
  return typeof storage === 'object' && storage !== null && 
    'getBillingPlans' in storage && 
    'createUserTripPass' in storage &&
    'getActiveTripPass' in storage;
}

export function isBookingRepository(storage: unknown): storage is IBookingRepository {
  return typeof storage === 'object' && storage !== null && 
    'createBooking' in storage && 
    'createExperience' in storage &&
    'createSlot' in storage;
}

export function isChatRepository(storage: unknown): storage is IChatRepository {
  return typeof storage === 'object' && storage !== null && 
    'createMessage' in storage && 
    'getOrCreateConversation' in storage &&
    'createChannel' in storage;
}

export function isAIRepository(storage: unknown): storage is IAIRepository {
  return typeof storage === 'object' && storage !== null && 
    'createCinemapJob' in storage && 
    'createMiniPlan' in storage &&
    'createQuest' in storage;
}

export function isAdminRepository(storage: unknown): storage is IAdminRepository {
  return typeof storage === 'object' && storage !== null && 
    'getSystemSetting' in storage && 
    'getCommerceStats' in storage;
}

export function isFeedRepository(storage: unknown): storage is IFeedRepository {
  return typeof storage === 'object' && storage !== null && 
    'createPost' in storage && 
    'getPosts' in storage &&
    'createHashtag' in storage;
}

export function isAuxiliaryRepository(storage: unknown): storage is IAuxiliaryRepository {
  return typeof storage === 'object' && storage !== null && 
    'createMiniMeet' in storage && 
    'createPurchaseRequest' in storage;
}

// ============================================
// 마이그레이션 노트
// ============================================
// 현재 상태: 핵심 메서드 커버리지 완료 (약 95%)
// 
// IStorage와의 차이점:
// - IFeedRepository: updateHashtagMetrics, seedInitialHashtags는 관리 목적으로 IAdminRepository로 이동 고려
// - IBookingRepository: getBookingsByGuest/Host는 getBookingsByUser(userId, role)로 통합됨
// 
// 마이그레이션 방법:
// 1. 새로운 라우터에서 필요한 서브 인터페이스만 import
// 2. 기존 storage 객체를 as IUserRepository 등으로 캐스팅하여 사용
// 3. 테스트에서는 필요한 메서드만 모킹
// 
// 예시:
// import type { IUserRepository } from '@/repositories';
// const userRepo = storage as unknown as IUserRepository;
