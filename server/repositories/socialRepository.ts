// socialRepository: 포스트, 댓글, 좋아요 및 알림 등 소셜 기능과 관련된 데이터베이스 작업을 담당합니다.
import { db } from '../db';
import { 
  posts, 
  likes, 
  users, 
  comments, 
  postMedia,
  experiences,
  type Post, 
  type InsertPost, 
  type InsertComment, 
  type Comment,
  type InsertPostMedia,
  type PostMedia,
  type Experience
} from '@shared/schema';
import { eq, desc, and, or, sql, ilike } from 'drizzle-orm';
import { createNotification } from './notificationRepository';

// Post operations
export async function createPost(post: InsertPost): Promise<Post> {
  const [newPost] = await db.insert(posts).values(post).returning();
  return newPost;
}

export async function getPosts(limit: number = 20, offset: number = 0): Promise<Post[]> {
  return await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt), desc(posts.id)) // ID로 2차 정렬 추가
    .limit(limit)
    .offset(offset);
}

// ============================================
// 우선 매칭 적용 포스트 조회
// ============================================
// 유료 구독자(priority_matching=true)의 포스트를 상단에 노출
// 정렬: 1) 우선순위 (유료 > 무료), 2) 생성시간, 3) ID
export async function getPostsWithPriority(limit: number = 20, offset: number = 0): Promise<Post[]> {
  // 포스트 + 사용자 구독 정보 + 플랜 features 조인
  const result = await db.execute(sql`
    WITH user_priority AS (
      SELECT 
        u.id as user_id,
        CASE 
          WHEN us.status = 'active' 
            AND us.current_period_end > NOW()
            AND bp.features->>'priority_matching' = 'true'
          THEN 1
          ELSE 0
        END as has_priority
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
      LEFT JOIN billing_plans bp ON us.plan_id = bp.id
    )
    SELECT p.*
    FROM posts p
    LEFT JOIN user_priority up ON p.user_id = up.user_id
    ORDER BY 
      COALESCE(up.has_priority, 0) DESC,
      p.created_at DESC,
      p.id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  
  return result.rows as Post[];
}

// ============================================
// 포스트 검색 (ILIKE 패턴 매칭)
// ============================================
// 제목, 내용, 위치에서 검색어 매칭
// 유료 구독자 우선 정렬 적용
export async function searchPosts(
  term: string,
  options: { location?: string; limit?: number; offset?: number } = {}
): Promise<Post[]> {
  const { location, limit = 20, offset = 0 } = options;
  const searchPattern = `%${term}%`;
  
  // 검색 조건 + 우선 매칭 + 정렬
  const result = await db.execute(sql`
    WITH user_priority AS (
      SELECT 
        u.id as user_id,
        CASE 
          WHEN us.status = 'active' 
            AND us.current_period_end > NOW()
            AND bp.features->>'priority_matching' = 'true'
          THEN 1
          ELSE 0
        END as has_priority
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
      LEFT JOIN billing_plans bp ON us.plan_id = bp.id
    )
    SELECT p.*
    FROM posts p
    LEFT JOIN user_priority up ON p.user_id = up.user_id
    WHERE (
      p.title ILIKE ${searchPattern}
      OR p.content ILIKE ${searchPattern}
      OR p.location ILIKE ${searchPattern}
    )
    ${location ? sql`AND p.location ILIKE ${'%' + location + '%'}` : sql``}
    ORDER BY 
      COALESCE(up.has_priority, 0) DESC,
      p.created_at DESC,
      p.id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);
  
  return result.rows as Post[];
}

// ============================================
// 체험 검색 (ILIKE 패턴 매칭)
// ============================================
// 제목, 설명, 위치, 카테고리에서 검색어 매칭
export async function searchExperiences(
  term: string,
  options: { category?: string; location?: string; limit?: number; offset?: number } = {}
): Promise<Experience[]> {
  const { category, location, limit = 20, offset = 0 } = options;
  const searchPattern = `%${term}%`;
  
  // 검색 조건 동적 구성
  let conditions = [
    eq(experiences.isActive, true),
    or(
      ilike(experiences.title, searchPattern),
      ilike(experiences.description, searchPattern),
      ilike(experiences.location, searchPattern)
    )
  ];
  
  if (category) {
    conditions.push(eq(experiences.category, category));
  }
  
  if (location) {
    conditions.push(ilike(experiences.location, `%${location}%`));
  }
  
  return await db
    .select()
    .from(experiences)
    .where(and(...conditions))
    .orderBy(desc(experiences.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getPostsByUser(userId: string): Promise<Post[]> {
  return await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt));
}

export async function getPostsByUserWithTakenAt(userId: string): Promise<Post[]> {
  return await db
    .select()
    .from(posts)
    .where(and(eq(posts.userId, userId), sql`${posts.takenAt} IS NOT NULL`))
    .orderBy(posts.takenAt);
}

export async function getPostById(postId: number): Promise<Post | null> {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return post || null;
}

export async function updatePost(postId: number, data: Partial<InsertPost>): Promise<Post | null> {
  try {
    const [updatedPost] = await db
      .update(posts)
      .set(data)
      .where(eq(posts.id, postId))
      .returning();
    return updatedPost || null;
  } catch (error) {
    console.error('Error updating post:', error);
    return null;
  }
}

export async function deletePost(postId: number): Promise<boolean> {
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

export async function toggleLike(userId: string, postId: number): Promise<boolean> {
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
    await db.insert(likes).values({ userId, postId });

    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));

    // 포스트 정보 조회하여 알림 생성
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (post && post.userId !== userId) {
      // 자신의 포스트가 아닐 때만 알림 생성
      const [liker] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      await createNotification({
        userId: post.userId,
        type: 'reaction',
        title: '새로운 좋아요',
        message: `${liker?.firstName || '익명의 사용자'}님이 회원님의 포스트를 좋아합니다`,
        relatedUserId: userId,
        relatedPostId: postId,
      });
    }

    return true;
  }
}

// PostMedia operations
export async function createPostMedia(media: InsertPostMedia): Promise<PostMedia> {
  const [newMedia] = await db.insert(postMedia).values(media).returning();
  return newMedia;
}

export async function createPostMediaBatch(mediaList: InsertPostMedia[]): Promise<PostMedia[]> {
  if (mediaList.length === 0) return [];
  return await db.insert(postMedia).values(mediaList).returning();
}

export async function getPostMediaByPostId(postId: number): Promise<PostMedia[]> {
  return await db
    .select()
    .from(postMedia)
    .where(eq(postMedia.postId, postId))
    .orderBy(postMedia.orderIndex);
}

// Comment operations
export async function createComment(comment: InsertComment): Promise<Comment> {
  // Create comment
  const [newComment] = await db.insert(comments).values(comment).returning();
  
  // Update comments count
  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, comment.postId));

  // 포스트 정보 조회하여 알림 생성
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, comment.postId))
    .limit(1);

  if (post && post.userId !== comment.userId) {
    // 자신의 포스트가 아닐 때만 알림 생성
    const [commenter] = await db
      .select()
      .from(users)
      .where(eq(users.id, comment.userId))
      .limit(1);

    await createNotification({
      userId: post.userId,
      type: 'comment',
      title: '새로운 댓글',
      message: `${commenter?.firstName || '익명의 사용자'}님이 회원님의 포스트에 댓글을 남겼습니다`,
      relatedUserId: comment.userId,
      relatedPostId: comment.postId,
    });
  }

  return newComment;
}

export async function getCommentsByPost(postId: number): Promise<Comment[]> {
  try {
    const result = await db.execute(sql`
      SELECT id, post_id as "postId", user_id as "userId", content, 
             parent_id as "parentId", is_offer as "isOffer", 
             offer_price as "offerPrice", offer_description as "offerDescription",
             offer_duration as "offerDuration", offer_status as "offerStatus",
             created_at as "createdAt"
      FROM comments 
      WHERE post_id = ${postId} 
      ORDER BY created_at ASC
    `);
    return result.rows as any[];
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return [];
  }
}

export async function getCommentReplies(parentId: number): Promise<Comment[]> {
  try {
    const result = await db.execute(sql`
      SELECT id, post_id as "postId", user_id as "userId", content, 
             parent_id as "parentId", is_offer as "isOffer", 
             offer_price as "offerPrice", offer_description as "offerDescription",
             offer_duration as "offerDuration", offer_status as "offerStatus",
             created_at as "createdAt"
      FROM comments 
      WHERE parent_id = ${parentId} 
      ORDER BY created_at ASC
    `);
    return result.rows as any[];
  } catch (error) {
    console.error('답글 조회 오류:', error);
    return [];
  }
}

export async function updateOfferStatus(commentId: number, status: string): Promise<Comment | undefined> {
  try {
    const [updated] = await db
      .update(comments)
      .set({ offerStatus: status })
      .where(eq(comments.id, commentId))
      .returning();
    return updated;
  } catch (error) {
    console.error('오퍼 상태 업데이트 오류:', error);
    return undefined;
  }
}

export async function deleteComment(commentId: number, userId: string): Promise<boolean> {
  try {
    // Get comment to check ownership and postId
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment || comment.userId !== userId) {
      return false; // Comment not found or not owned by user
    }

    // Delete comment
    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    // Update comments count
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} - 1` })
      .where(eq(posts.id, comment.postId));

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}
