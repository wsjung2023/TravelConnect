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
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  description: z.string().max(500, '설명은 500자 이하여야 합니다').optional(),
  startDate: z.string().datetime('유효하지 않은 날짜 형식입니다'),
  endDate: z.string().datetime('유효하지 않은 날짜 형식입니다'),
  isPublic: z.boolean().optional().default(true),
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

// 예약 관련 스키마
export const CreateBookingSchema = z.object({
  experienceId: z.number().int().positive('유효하지 않은 체험 ID입니다'),
  participants: z.number().int().min(1, '참가자 수는 최소 1명 이상이어야 합니다'),
  bookingDate: z.string().datetime('유효하지 않은 날짜 형식입니다'),
  notes: z.string().max(500, '메모는 500자 이하여야 합니다').optional(),
});

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed'], {
    errorMap: () => ({ message: '유효하지 않은 예약 상태입니다' })
  }),
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
export type PaginationData = z.infer<typeof PaginationSchema>;