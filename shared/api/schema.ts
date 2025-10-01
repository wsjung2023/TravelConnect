import { z } from 'zod';

// 공통 스키마
export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// 인증 관련 스키마
export const LoginSchema = z.object({
  email: z.string().email('유효하지 않은 이메일 형식입니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});

export const RegisterSchema = z.object({
  email: z.string().email('유효하지 않은 이메일 형식입니다'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  firstName: z.string().min(1, '이름을 입력해주세요').optional(),
  lastName: z.string().min(1, '성을 입력해주세요').optional(),
});

export const OnboardingSchema = z.object({
  userType: z.enum(['traveler', 'influencer', 'host']).optional(),
  interests: z.array(z.string()).default([]),
  languages: z.array(z.string()).default(['ko']),
  timezone: z.string().default('Asia/Seoul'),
});

// 포스트 관련 스키마
export const CreatePostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  content: z.string().min(1, '내용을 입력해주세요').max(1000, '내용은 1000자 이하여야 합니다'),
  location: z.string().min(1, '위치를 입력해주세요').max(100, '위치는 100자 이하여야 합니다'),
  latitude: z.string().regex(/^-?\d+\.?\d*$/, '유효하지 않은 위도 값입니다'),
  longitude: z.string().regex(/^-?\d+\.?\d*$/, '유효하지 않은 경도 값입니다'),
  theme: z.string().min(1, '테마를 선택해주세요'),
  mediaUrls: z.array(z.string().url('유효하지 않은 URL입니다')).optional().default([]),
});

export const UpdatePostSchema = CreatePostSchema.partial();

// 타임라인 관련 스키마
export const CreateTimelineSchema = z.object({
  title: z.string().min(1, '타임라인 제목은 필수입니다').max(100, '제목은 최대 100글자입니다'),
  description: z.string().max(300, '설명은 최대 300글자입니다').optional(),
  startDate: z.union([z.string(), z.date()]).transform((val) => (typeof val === 'string' ? new Date(val) : val)),
  endDate: z.union([z.string(), z.date(), z.null()]).transform((val) =>
    val === null ? null : typeof val === 'string' ? new Date(val) : val
  ).optional(),
  totalDays: z.number().min(1).max(999).optional(),
});

export const UpdateTimelineSchema = CreateTimelineSchema.partial();

export const AddPostToTimelineSchema = z.object({
  postId: z.number().int().positive('유효하지 않은 포스트 ID입니다'),
  order: z.number().int().min(0).optional(),
});

// 팔로우 관련 스키마
export const FollowUserSchema = z.object({
  targetUserId: z.string().min(1, '팔로우할 사용자 ID를 입력해주세요'),
});

// 메시지 관련 스키마
export const SendMessageSchema = z.object({
  recipientId: z.string().min(1, '수신자 ID를 입력해주세요'),
  content: z.string().min(1, '메시지 내용을 입력해주세요').max(500, '메시지는 500자 이하여야 합니다'),
});

export const CreateConversationSchema = z.object({
  participant2Id: z.string().min(1, '대화 상대방 ID를 입력해주세요'),
});

// 이벤트 관련 스키마
export const CreateEventSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  description: z.string().max(1000, '설명은 1000자 이하여야 합니다').optional(),
  location: z.string().min(1, '위치를 입력해주세요').max(100, '위치는 100자 이하여야 합니다'),
  startTime: z.string().datetime('유효하지 않은 날짜 형식입니다'),
  endTime: z.string().datetime('유효하지 않은 날짜 형식입니다'),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  price: z.number().min(0).optional().default(0),
  category: z.enum(['tour', 'food', 'activity', 'cultural', 'nature', 'nightlife'], {
    errorMap: () => ({ message: '유효하지 않은 카테고리입니다' })
  }),
});

export const UpdateEventSchema = CreateEventSchema.partial();

// 예약 관련 스키마 (슬롯 기반)
export const CreateBookingSchema = z.object({
  slotId: z.number().int().positive('유효하지 않은 슬롯 ID입니다'),
  participants: z.number().int().min(1, '참가자 수는 최소 1명 이상이어야 합니다'),
  specialRequests: z.string().max(500, '특별 요청은 500자 이하여야 합니다').optional(),
  
  // 예약자 정보 (비회원 예약 지원)
  guestName: z.string().min(1, '예약자 이름을 입력해주세요').max(50, '이름은 50자 이하여야 합니다').optional(),
  guestEmail: z.string().email('올바른 이메일 주소를 입력해주세요').optional(),
  guestPhone: z.string().max(20, '연락처는 20자 이하여야 합니다').optional(),
});

export const UpdateBookingStatusSchema = z.object({
  bookingId: z.number().int().positive('유효하지 않은 예약 ID입니다'),
  status: z.enum(['confirmed', 'declined', 'cancelled', 'completed'], {
    required_error: '예약 상태를 선택해주세요',
  }),
  cancelReason: z.string().max(200, '취소 사유는 200자 이하여야 합니다').optional(),
});

// 예약 검색 스키마
export const BookingSearchSchema = z.object({
  // 기간 필터
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // 상태 필터
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'declined']).optional(),
  
  // 역할별 필터
  role: z.enum(['guest', 'host']).optional(), // 요청자가 게스트인지 호스트인지
  
  // 페이지네이션
  ...PaginationSchema.shape,
});

// 슬롯 예약 가능성 확인 스키마
export const CheckSlotAvailabilitySchema = z.object({
  slotId: z.number().int().positive('유효하지 않은 슬롯 ID입니다'),
  participants: z.number().int().min(1, '최소 1명 이상이어야 합니다'),
});

// 파일 업로드 검증 스키마
export const FileUploadValidationSchema = z.object({
  files: z.array(z.object({
    mimetype: z.string().refine(
      (type) => ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime'].includes(type),
      '허용되지 않는 파일 형식입니다'
    ),
    size: z.number().max(15 * 1024 * 1024, '파일 크기가 15MB를 초과합니다'),
  })).min(1, '최소 1개의 파일이 필요합니다').max(10, '최대 10개의 파일까지 업로드 가능합니다'),
});

// 알림 관련 스키마
export const CreateNotificationSchema = z.object({
  userId: z.string().min(1, '사용자 ID를 입력해주세요'),
  type: z.enum(['follow', 'chat', 'feed', 'reaction', 'help', 'promotion'], {
    errorMap: () => ({ message: '유효하지 않은 알림 타입입니다' })
  }),
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  message: z.string().max(500, '메시지는 500자 이하여야 합니다').optional(),
  relatedId: z.string().optional(),
});

// 관리자 관련 스키마
export const AdminActionSchema = z.object({
  action: z.enum(['delete_post', 'ban_user', 'unban_user', 'delete_user'], {
    errorMap: () => ({ message: '유효하지 않은 관리자 액션입니다' })
  }),
  targetId: z.string().min(1, '대상 ID를 입력해주세요'),
  reason: z.string().max(500, '사유는 500자 이하여야 합니다').optional(),
});

// 프로필 업데이트 스키마
export const UpdateProfileOpenSchema = z.object({
  open: z.boolean(),
  region: z.string().min(1, '지역 코드를 입력해주세요').optional(),
  hours: z.number().min(1).max(168).default(12), // 기본값 12시간
}).refine((data) => {
  // open이 true일 때는 hours가 필요하지만 기본값으로 처리됨
  return true;
}, {
  message: "만나요 활성화 시 시간 설정이 필요합니다"
});

// Portfolio Mode 스키마
export const PortfolioModeSchema = z.object({
  portfolioMode: z.boolean(),
  publicProfileUrl: z.string().min(3, '프로필 URL은 최소 3자 이상이어야 합니다')
    .max(50, 'URL은 최대 50자까지 가능합니다')
    .regex(/^[a-zA-Z0-9_-]+$/, 'URL은 영문, 숫자, _, - 만 사용 가능합니다')
    .optional(),
});

// Type inference
export type LoginData = z.infer<typeof LoginSchema>;
export type RegisterData = z.infer<typeof RegisterSchema>;
export type CreatePostData = z.infer<typeof CreatePostSchema>;
export type UpdatePostData = z.infer<typeof UpdatePostSchema>;
export type CreateTimelineData = z.infer<typeof CreateTimelineSchema>;
export type UpdateTimelineData = z.infer<typeof UpdateTimelineSchema>;
export type AddPostToTimelineData = z.infer<typeof AddPostToTimelineSchema>;
export type FollowUserData = z.infer<typeof FollowUserSchema>;
export type SendMessageData = z.infer<typeof SendMessageSchema>;
export type CreateConversationData = z.infer<typeof CreateConversationSchema>;
export type CreateEventData = z.infer<typeof CreateEventSchema>;
export type UpdateEventData = z.infer<typeof UpdateEventSchema>;
export type CreateBookingData = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatusData = z.infer<typeof UpdateBookingStatusSchema>;
export type CreateNotificationData = z.infer<typeof CreateNotificationSchema>;
export type AdminActionData = z.infer<typeof AdminActionSchema>;
export type UpdateProfileOpenData = z.infer<typeof UpdateProfileOpenSchema>;
export type PortfolioModeData = z.infer<typeof PortfolioModeSchema>;
export type PaginationData = z.infer<typeof PaginationSchema>;

// MiniMeet Schemas
export const CreateMiniMeetSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(50, '제목은 50자 이하로 입력해주세요'),
  placeName: z.string().min(1, '장소명을 입력해주세요').max(100, '장소명은 100자 이하로 입력해주세요'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  startAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: '올바른 날짜 형식이 아닙니다',
  }),
  maxPeople: z.number().min(2).max(10).default(6),
  visibility: z.enum(['public', 'friends']).default('public'),
});

export const JoinMiniMeetSchema = z.object({
  meetId: z.number().min(1),
});

export const GetMiniMeetsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(0.1).max(50).default(5), // 기본 5km 반경
});

// Type inference for MiniMeet schemas
export type CreateMiniMeetData = z.infer<typeof CreateMiniMeetSchema>;
export type JoinMiniMeetData = z.infer<typeof JoinMiniMeetSchema>;
export type GetMiniMeetsData = z.infer<typeof GetMiniMeetsSchema>;

// 슬롯 관리 스키마
export const CreateSlotSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하여야 합니다'),
  description: z.string().max(1000, '설명은 1000자 이하여야 합니다').optional(),
  experienceId: z.number().int().positive().optional(),
  
  // 시간 관리
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)'),
  timezone: z.string().optional().default('Asia/Seoul'),
  
  // 가격 관리
  basePrice: z.number().min(0, '가격은 0 이상이어야 합니다'),
  peakPrice: z.number().min(0, '피크 가격은 0 이상이어야 합니다').optional(),
  currency: z.string().length(3, '통화 코드는 3자리여야 합니다').default('KRW'),
  isPeakSlot: z.boolean().default(false),
  
  // 반복 설정
  isRecurring: z.boolean().default(false),
  recurringPattern: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurringEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '종료 날짜 형식이 올바르지 않습니다').optional(),
  
  // 예약 관리
  maxParticipants: z.number().int().min(1, '최소 1명 이상이어야 합니다').max(50, '최대 50명까지 가능합니다').default(1),
  
  // 위치 정보
  location: z.string().max(200, '위치는 200자 이하여야 합니다').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  
  // 서비스 분류
  category: z.enum(['tour', 'food', 'activity', 'consultation', 'custom']).optional(),
  serviceType: z.enum(['group', 'private', 'consultation']).optional(),
  
  // 요구사항 및 제약
  requirements: z.array(z.string()).default([]),
  cancellationPolicy: z.enum(['flexible', 'moderate', 'strict']).default('flexible'),
  minAdvanceBooking: z.number().int().min(1, '최소 1시간 전 예약 필요').default(24),
  
  // 메모
  notes: z.string().max(500, '메모는 500자 이하여야 합니다').optional(),
});

export const UpdateSlotSchema = CreateSlotSchema.partial().extend({
  id: z.number().int().positive('유효하지 않은 슬롯 ID입니다'),
});

// 벌크 생성 스키마 (반복 패턴 지원)
export const BulkCreateSlotsSchema = z.object({
  template: CreateSlotSchema.omit({ date: true, isRecurring: true, recurringPattern: true, recurringEndDate: true }),
  
  // 날짜 범위
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '시작 날짜 형식이 올바르지 않습니다'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '종료 날짜 형식이 올바르지 않습니다'),
  
  // 반복 패턴
  pattern: z.enum(['daily', 'weekly', 'monthly']),
  
  // 요일 선택 (주간 반복 시)
  weekDays: z.array(z.number().int().min(0).max(6)).optional(), // 0=일요일, 6=토요일
  
  // 제외할 날짜들
  excludeDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
});

// 슬롯 검색 스키마
export const SlotSearchSchema = z.object({
  // 호스트 필터
  hostId: z.string().optional(),
  
  // 날짜 범위
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // 위치 기반 검색
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(0.1).max(100).optional(), // km 단위
  
  // 서비스 필터
  category: z.enum(['tour', 'food', 'activity', 'consultation', 'custom']).optional(),
  serviceType: z.enum(['group', 'private', 'consultation']).optional(),
  
  // 가격 범위
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  
  // 예약 가능성
  availableOnly: z.boolean().default(true),
  minParticipants: z.number().int().min(1).optional(),
  
  // 페이지네이션
  ...PaginationSchema.shape,
});

// 슬롯 가용성 업데이트 스키마
export const UpdateSlotAvailabilitySchema = z.object({
  slotId: z.number().int().positive('유효하지 않은 슬롯 ID입니다'),
  isAvailable: z.boolean(),
  reason: z.string().max(200, '사유는 200자 이하여야 합니다').optional(),
});

// Type inference for Slot schemas
export type CreateSlotData = z.infer<typeof CreateSlotSchema>;
export type UpdateSlotData = z.infer<typeof UpdateSlotSchema>;
export type BulkCreateSlotsData = z.infer<typeof BulkCreateSlotsSchema>;
export type SlotSearchData = z.infer<typeof SlotSearchSchema>;
export type UpdateSlotAvailabilityData = z.infer<typeof UpdateSlotAvailabilitySchema>;

// 예약 관련 타입 정의
export type CreateBookingData = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatusData = z.infer<typeof UpdateBookingStatusSchema>;
export type BookingSearchData = z.infer<typeof BookingSearchSchema>;
export type CheckSlotAvailabilityData = z.infer<typeof CheckSlotAvailabilitySchema>;

