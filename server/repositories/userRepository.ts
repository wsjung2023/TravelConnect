// userRepository: 사용자(User) 및 팔로우(Follow) 관련 데이터베이스 작업을 담당하는 리포지토리입니다.
import { db } from '../db';
import { users, follows, type User, type UpsertUser, type Follow } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createNotification } from './notificationRepository';

export async function getUser(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function getUserByPublicProfileUrl(url: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.publicProfileUrl, url));
  return user;
}

export async function createUser(userData: UpsertUser): Promise<User> {
  const [user] = await db.insert(users).values(userData).returning();
  return user!;
}

export async function upsertUser(userData: UpsertUser): Promise<User> {
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
  return user!;
}

export async function updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
  const [user] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user!;
}

export async function getOpenUsers(): Promise<User[]> {
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

export async function getNearbyUsers(latitude: number, longitude: number, radiusKm: number, limit: number): Promise<User[]> {
  const nearbyUsers = await db
    .select()
    .from(users)
    .where(
      and(
        sql`${users.lastLatitude} IS NOT NULL`,
        sql`${users.lastLongitude} IS NOT NULL`,
        sql`(
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(${users.lastLatitude}::float)) *
            cos(radians(${users.lastLongitude}::float) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(${users.lastLatitude}::float))
          )
        ) < ${radiusKm}`
      )
    )
    .limit(limit);
  return nearbyUsers;
}

export async function getHostApplications(status?: string): Promise<User[]> {
  let conditions = [];
  
  if (status) {
    conditions.push(eq(users.hostStatus, status));
  } else {
    conditions.push(sql`${users.hostStatus} IS NOT NULL`);
  }
  
  const applications = await db
    .select()
    .from(users)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(users.createdAt));
  
  return applications;
}

export async function followUser(followerId: string, followingId: string): Promise<Follow> {
  const [follow] = await db
    .insert(follows)
    .values({ followerId, followingId })
    .returning();
  
  const [follower] = await db
    .select()
    .from(users)
    .where(eq(users.id, followerId))
    .limit(1);

  await createNotification({
    userId: followingId,
    type: 'follow',
    title: '새로운 팔로워',
    message: `${follower?.firstName || '익명의 사용자'}님이 회원님을 팔로우하기 시작했습니다`,
    relatedUserId: followerId,
  });

  return follow!;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
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

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
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

export async function getFollowers(userId: string): Promise<User[]> {
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

export async function getFollowing(userId: string): Promise<User[]> {
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

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
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
