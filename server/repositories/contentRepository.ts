// contentRepository: 타임라인(Timeline), 여행(Trip), 리뷰(Review), 가이드 프로필(Guide Profile), 미니밋(MiniMeet), CineMap 작업을 담당하는 리포지토리입니다.
import { db } from '../db';
import { 
  timelines, trips, reviews, experiences, users, posts, miniMeets, miniMeetAttendees, cinemapJobs,
  type Timeline, type InsertTimeline, type Trip, type InsertTrip, type Review, type InsertReview,
  type User, type MiniMeet, type InsertMiniMeet, type MiniMeetAttendee, type CinemapJob, type InsertCinemapJob,
  type Post
} from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getUser } from './userRepository';

// Timeline operations
export async function createTimeline(timeline: InsertTimeline): Promise<Timeline> {
  const [newTimeline] = await db
    .insert(timelines)
    .values(timeline)
    .returning();
  return newTimeline;
}

export async function getTimelinesByUser(userId: string): Promise<Timeline[]> {
  return await db
    .select()
    .from(timelines)
    .where(eq(timelines.userId, userId))
    .orderBy(desc(timelines.createdAt));
}

export async function getTimelineById(id: number): Promise<Timeline | undefined> {
  const [timeline] = await db
    .select()
    .from(timelines)
    .where(eq(timelines.id, id));
  return timeline;
}

export async function updateTimeline(
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

export async function deleteTimeline(id: number): Promise<boolean> {
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

export async function getTimelineWithPosts(
  id: number
): Promise<(Timeline & { posts: Post[] }) | undefined> {
  const timeline = await getTimelineById(id);
  if (!timeline) return undefined;

  const timelinePosts = await db
    .select()
    .from(posts)
    .where(eq(posts.timelineId, id))
    .orderBy(posts.day, posts.createdAt);

  return { ...timeline, posts: timelinePosts };
}

// Trip operations
export async function createTrip(trip: InsertTrip): Promise<Trip> {
  const [newTrip] = await db.insert(trips).values(trip).returning();
  return newTrip;
}

export async function getTripsByUser(userId: string): Promise<Trip[]> {
  return await db
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.startDate));
}

export async function updateTrip(
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
export async function createReview(review: InsertReview): Promise<Review> {
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

export async function getReviewsByExperience(experienceId: number): Promise<Review[]> {
  return await db
    .select()
    .from(reviews)
    .where(eq(reviews.experienceId, experienceId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewsByHost(hostId: string): Promise<Review[]> {
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

// Guide Profile operations
export async function getGuideProfile(guideId: string): Promise<{
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
  const user = await getUser(guideId);
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

// MiniMeet operations
export async function createMiniMeet(data: InsertMiniMeet): Promise<MiniMeet> {
  const [newMiniMeet] = await db.insert(miniMeets).values(data).returning();
  return newMiniMeet;
}

export async function getMiniMeetAttendees(meetId: number): Promise<(MiniMeetAttendee & { user: User })[]> {
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

export async function getMiniMeetsNearby(
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
      const attendees = await getMiniMeetAttendees(meet.id);
      
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

export async function joinMiniMeet(meetId: number, userId: string): Promise<MiniMeetAttendee> {
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

export async function leaveMiniMeet(meetId: number, userId: string): Promise<void> {
  await db
    .delete(miniMeetAttendees)
    .where(
      and(
        eq(miniMeetAttendees.meetId, meetId),
        eq(miniMeetAttendees.userId, userId)
      )
    );
}

export async function getMiniMeetById(id: number): Promise<(MiniMeet & { host: User; attendees: MiniMeetAttendee[] }) | undefined> {
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

  const attendees = await getMiniMeetAttendees(id);

  return {
    ...meet,
    host: meet.host as User,
    attendees: attendees as MiniMeetAttendee[]
  };
}

// 여행 ID로 조회
export async function getTripById(tripId: number): Promise<Trip | undefined> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);
  
  return trip;
}

// 여행 복제 메서드
export async function cloneTrip(originalTripId: number, newOwnerId: string, selectedDays?: number[]): Promise<Trip> {
  const originalTrip = await getTripById(originalTripId);
  if (!originalTrip) {
    throw new Error('원본 여행을 찾을 수 없습니다');
  }

  // 원본 일정에서 선택한 날짜의 itinerary만 추출
  let clonedItinerary = originalTrip.itinerary;
  if (selectedDays && selectedDays.length > 0) {
    if (Array.isArray(originalTrip.itinerary)) {
      clonedItinerary = (originalTrip.itinerary as any[]).filter((dayPlan: any, index: number) => {
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
    description: `원본: ${originalTrip.title}`,
    itinerary: clonedItinerary,
    isPublic: false, // 복제본은 기본적으로 비공개
  };

  const [newTrip] = await db.insert(trips).values(clonedTripData).returning();
  return newTrip;
}

// CineMap operations
export async function createCinemapJob(job: InsertCinemapJob): Promise<CinemapJob> {
  const [newJob] = await db.insert(cinemapJobs).values(job).returning();
  return newJob;
}

export async function getCinemapJobById(id: number): Promise<CinemapJob | undefined> {
  const [job] = await db
    .select()
    .from(cinemapJobs)
    .where(eq(cinemapJobs.id, id))
    .limit(1);
  return job;
}

export async function getCinemapJobsByUser(userId: string): Promise<CinemapJob[]> {
  return await db
    .select()
    .from(cinemapJobs)
    .where(eq(cinemapJobs.userId, userId))
    .orderBy(desc(cinemapJobs.createdAt));
}

export async function getCinemapJobsByTimeline(timelineId: number): Promise<CinemapJob[]> {
  return await db
    .select()
    .from(cinemapJobs)
    .where(eq(cinemapJobs.timelineId, timelineId))
    .orderBy(desc(cinemapJobs.createdAt));
}

export async function updateCinemapJob(
  id: number,
  updates: Partial<InsertCinemapJob>
): Promise<CinemapJob | undefined> {
  const [updated] = await db
    .update(cinemapJobs)
    .set(updates)
    .where(eq(cinemapJobs.id, id))
    .returning();
  return updated;
}
