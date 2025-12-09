/**
 * ============================================
 * 소셜 라우터 (Social Router)
 * ============================================
 * 
 * 이 모듈은 SNS 핵심 기능인 소셜 상호작용 API를 관리합니다.
 * 
 * 주요 기능:
 * - 포스트 CRUD (생성, 조회, 수정, 삭제)
 * - 좋아요 (Like) 토글
 * - 댓글 (Comment) 관리
 * - 팔로우/언팔로우
 * - 피드 조회
 * - 해시태그 관리
 * - 포스트 저장 (북마크)
 * - 피드 설정
 * 
 * 비즈니스 규칙:
 * - 본인 게시물만 수정/삭제 가능
 * - 좋아요는 토글 방식 (중복 좋아요 시 취소)
 * - 댓글 삭제는 작성자만 가능
 * - 팔로우/팔로잉 수는 별도 API로 조회
 * 
 * 성능 고려사항:
 * - 피드 조회 시 페이지네이션 적용 (기본 20개)
 * - 트렌딩 점수 기반 정렬 지원
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import {
  authenticateToken,
  authenticateHybrid,
  AuthRequest,
} from '../auth';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// API Rate Limiter (분당 100회)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
});

// ============================================
// 포스트 목록 조회
// ============================================
// GET /api/posts
// 모든 공개 포스트를 조회합니다.
// 쿼리 파라미터: limit, offset
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId as string | undefined;

    // 특정 사용자의 포스트만 조회
    if (userId) {
      const posts = await storage.getPostsByUser(userId);
      res.json(posts);
      return;
    }

    // 전체 포스트 조회 (우선 매칭 적용 - 유료 구독자 우선)
    const posts = await storage.getPostsWithPriority(limit, offset);
    res.json(posts);
  } catch (error) {
    console.error('포스트 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ============================================
// 포스트 상세 조회
// ============================================
// GET /api/posts/:id
// 특정 포스트의 상세 정보를 조회합니다.
router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    
    const post = await storage.getPostById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error('포스트 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// ============================================
// 포스트 생성
// ============================================
// POST /api/posts
// 새 포스트를 생성합니다.
// 필수: content 또는 mediaUrls (하나 이상 필수)
router.post('/posts', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, location, latitude, longitude, timelineId, theme, visibility } = req.body;

    // 콘텐츠 필수
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await storage.createPost({
      userId: req.user.id,
      content: content || '',
      location: location || null,
      latitude: latitude?.toString() || null,
      longitude: longitude?.toString() || null,
      timelineId: timelineId || null,
      theme: theme || null,
      visibility: visibility || 'public',
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('포스트 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ============================================
// 포스트 수정
// ============================================
// PATCH /api/posts/:id
// 본인의 포스트를 수정합니다.
router.patch('/posts/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await storage.getPostById(postId);

    // 존재 여부 확인
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // 소유권 확인 (본인만 수정 가능)
    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this post' });
    }

    const updatedPost = await storage.updatePost(postId, req.body);
    res.json(updatedPost);
  } catch (error) {
    console.error('포스트 수정 오류:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// ============================================
// 포스트 삭제
// ============================================
// DELETE /api/posts/:id
// 본인의 포스트를 삭제합니다.
router.delete('/posts/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await storage.getPostById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // 소유권 확인
    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await storage.deletePost(postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('포스트 삭제 오류:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ============================================
// 좋아요 토글
// ============================================
// POST /api/posts/:id/like
// 포스트에 좋아요를 누르거나 취소합니다.
// 이미 좋아요한 경우 취소, 아닌 경우 좋아요 추가
router.post('/posts/:id/like', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    // toggleLike는 (userId, postId) 순서로 받음
    const liked = await storage.toggleLike(req.user.id, postId);
    
    // 현재 포스트의 좋아요 수 가져오기
    const post = await storage.getPostById(postId);
    
    res.json({
      liked,
      likesCount: post?.likesCount || 0,
    });
  } catch (error) {
    console.error('좋아요 토글 오류:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ============================================
// 댓글 작성
// ============================================
// POST /api/posts/:id/comments
// 포스트에 댓글을 작성합니다.
router.post('/posts/:id/comments', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const comment = await storage.createComment({
      postId,
      userId: req.user.id,
      content: content.trim(),
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// ============================================
// 댓글 목록 조회
// ============================================
// GET /api/posts/:id/comments
// 포스트의 모든 댓글을 조회합니다.
router.get('/posts/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    
    // getCommentsByPost 메서드 사용
    const comments = await storage.getCommentsByPost(postId);
    res.json(comments);
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// ============================================
// 댓글 삭제
// ============================================
// DELETE /api/comments/:id
// 본인의 댓글을 삭제합니다.
router.delete('/comments/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const commentId = parseInt(req.params.id);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    // deleteComment은 (commentId, userId)를 받아서 내부에서 소유권 확인
    const deleted = await storage.deleteComment(commentId, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ============================================
// 팔로우
// ============================================
// POST /api/users/:id/follow
// 특정 사용자를 팔로우합니다.
// 자기 자신은 팔로우할 수 없습니다.
router.post('/users/:id/follow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUserId = req.params.id;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    // 자기 자신 팔로우 방지
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // 대상 사용자 존재 확인
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await storage.followUser(req.user.id, targetUserId);
    res.json({ message: 'Followed successfully' });
  } catch (error) {
    console.error('팔로우 오류:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// ============================================
// 언팔로우
// ============================================
// DELETE /api/users/:id/follow
// 특정 사용자 팔로우를 취소합니다.
router.delete('/users/:id/follow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUserId = req.params.id;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    await storage.unfollowUser(req.user.id, targetUserId);
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('언팔로우 오류:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// ============================================
// 팔로우 상태 확인
// ============================================
// GET /api/users/:id/following-status
// 현재 사용자가 특정 사용자를 팔로우하는지 확인합니다.
router.get('/users/:id/following-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetUserId = req.params.id;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    const isFollowing = await storage.isFollowing(req.user.id, targetUserId);
    res.json({ isFollowing });
  } catch (error) {
    console.error('팔로우 상태 확인 오류:', error);
    res.status(500).json({ error: 'Failed to check following status' });
  }
});

// ============================================
// 팔로워 목록 조회
// ============================================
// GET /api/users/:id/followers
// 특정 사용자의 팔로워 목록을 조회합니다.
router.get('/users/:id/followers', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const followers = await storage.getFollowers(userId);
    res.json(followers);
  } catch (error) {
    console.error('팔로워 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// ============================================
// 팔로잉 목록 조회
// ============================================
// GET /api/users/:id/following
// 특정 사용자가 팔로우하는 사용자 목록을 조회합니다.
router.get('/users/:id/following', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const following = await storage.getFollowing(userId);
    res.json(following);
  } catch (error) {
    console.error('팔로잉 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// ============================================
// 팔로우/팔로잉 수 조회
// ============================================
// GET /api/users/:id/follow-counts
// 특정 사용자의 팔로워/팔로잉 수를 조회합니다.
router.get('/users/:id/follow-counts', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const counts = await storage.getFollowCounts(userId);
    res.json({
      followersCount: counts.followers,
      followingCount: counts.following,
    });
  } catch (error) {
    console.error('팔로우 수 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch follow counts' });
  }
});

// ============================================
// 피드 조회
// ============================================
// GET /api/feed
// 개인화된 피드를 조회합니다.
// 팔로우하는 사용자와 트렌딩 포스트를 포함합니다.
router.get('/feed', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // 피드 조회 (우선 매칭 적용 - 유료 구독자 우선)
    const posts = await storage.getPostsWithPriority(limit, offset);
    res.json(posts);
  } catch (error) {
    console.error('피드 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// ============================================
// 저장된 포스트 목록 조회
// ============================================
// GET /api/me/saved-posts
// 내가 저장한 포스트 목록을 조회합니다.
// TODO: 포스트 저장 기능은 별도 구현 필요
router.get('/me/saved-posts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 저장된 포스트 기능은 storage에서 구현 필요
    res.json([]);
  } catch (error) {
    console.error('저장된 포스트 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch saved posts' });
  }
});

export const socialRouter = router;
