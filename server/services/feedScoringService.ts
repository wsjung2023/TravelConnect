import { cacheService } from './cache';

export interface FeedWeights {
  engagement: number;
  affinity: number;
  interest: number;
  hashtag: number;
  location: number;
  recency: number;
  velocity: number;
}

export const DEFAULT_WEIGHTS: FeedWeights = {
  engagement: 0.22,
  affinity: 0.20,
  interest: 0.15,
  hashtag: 0.12,
  location: 0.12,
  recency: 0.11,
  velocity: 0.08,
};

export interface PostScoreInput {
  postId: number;
  likesCount: number;
  commentsCount: number;
  createdAt: Date | string;
  userId: string;
  hashtags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  theme?: string | null;
}

export interface UserContext {
  userId?: string;
  interests?: string[];
  followedHashtags?: string[];
  followedUsers?: string[];
  latitude?: number;
  longitude?: number;
  recentLikedPostIds?: number[];
  recentViewedPostIds?: number[];
}

const calculateEngagementScore = (likesCount: number, commentsCount: number): number => {
  const likes = Math.log10(likesCount + 1) / Math.log10(1000);
  const comments = Math.log10(commentsCount + 1) / Math.log10(100);
  return Math.min(1, (likes * 0.6 + comments * 0.4));
};

const calculateRecencyScore = (createdAt: Date | string): number => {
  const now = Date.now();
  const postTime = new Date(createdAt).getTime();
  const hoursOld = (now - postTime) / (1000 * 60 * 60);
  
  if (hoursOld < 1) return 1.0;
  if (hoursOld < 6) return 0.9;
  if (hoursOld < 24) return 0.7;
  if (hoursOld < 72) return 0.5;
  if (hoursOld < 168) return 0.3;
  return Math.max(0.1, 0.3 - (hoursOld - 168) / 1000);
};

const calculateVelocityScore = (
  likesCount: number, 
  commentsCount: number, 
  createdAt: Date | string
): number => {
  const hoursOld = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  const engagementRate = (likesCount + commentsCount * 2) / hoursOld;
  return Math.min(1, engagementRate / 10);
};

const calculateAffinityScore = (
  postUserId: string,
  userContext: UserContext
): number => {
  if (!userContext.userId) return 0.5;
  
  if (userContext.followedUsers?.includes(postUserId)) {
    return 1.0;
  }
  
  return 0.3;
};

const calculateInterestScore = (
  postTheme: string | null | undefined,
  userContext: UserContext
): number => {
  if (!postTheme || !userContext.interests?.length) return 0.5;
  
  if (userContext.interests.includes(postTheme)) {
    return 1.0;
  }
  
  return 0.3;
};

const calculateHashtagScore = (
  postHashtags: string[] | undefined,
  userContext: UserContext
): number => {
  if (!postHashtags?.length || !userContext.followedHashtags?.length) return 0.5;
  
  const matchCount = postHashtags.filter(tag => 
    userContext.followedHashtags?.includes(tag)
  ).length;
  
  if (matchCount === 0) return 0.3;
  
  return Math.min(1, 0.5 + (matchCount / Math.max(postHashtags.length, 1)) * 0.5);
};

const calculateLocationScore = (
  postLat: number | null | undefined,
  postLng: number | null | undefined,
  userContext: UserContext
): number => {
  if (!postLat || !postLng || !userContext.latitude || !userContext.longitude) {
    return 0.5;
  }
  
  const distance = haversineDistance(
    userContext.latitude,
    userContext.longitude,
    postLat,
    postLng
  );
  
  if (distance < 5) return 1.0;
  if (distance < 20) return 0.8;
  if (distance < 50) return 0.6;
  if (distance < 100) return 0.4;
  return 0.2;
};

const haversineDistance = (
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const calculatePostScore = (
  post: PostScoreInput,
  userContext: UserContext,
  weights: FeedWeights = DEFAULT_WEIGHTS
): number => {
  const cached = cacheService.feedScore.get(post.postId, userContext.userId);
  if (cached !== undefined) {
    return cached;
  }

  const scores = {
    engagement: calculateEngagementScore(post.likesCount, post.commentsCount),
    recency: calculateRecencyScore(post.createdAt),
    velocity: calculateVelocityScore(post.likesCount, post.commentsCount, post.createdAt),
    affinity: calculateAffinityScore(post.userId, userContext),
    interest: calculateInterestScore(post.theme, userContext),
    hashtag: calculateHashtagScore(post.hashtags, userContext),
    location: calculateLocationScore(post.latitude, post.longitude, userContext),
  };

  const totalScore = 
    scores.engagement * weights.engagement +
    scores.recency * weights.recency +
    scores.velocity * weights.velocity +
    scores.affinity * weights.affinity +
    scores.interest * weights.interest +
    scores.hashtag * weights.hashtag +
    scores.location * weights.location;

  cacheService.feedScore.set(post.postId, userContext.userId, totalScore);

  return totalScore;
};

export const rankPosts = <T extends PostScoreInput>(
  posts: T[],
  userContext: UserContext,
  weights: FeedWeights = DEFAULT_WEIGHTS
): T[] => {
  const postsWithScores = posts.map(post => ({
    post,
    score: calculatePostScore(post, userContext, weights)
  }));

  postsWithScores.sort((a, b) => b.score - a.score);

  return postsWithScores.map(item => item.post);
};

export const batchCalculateScores = (
  posts: PostScoreInput[],
  userContext: UserContext,
  weights: FeedWeights = DEFAULT_WEIGHTS
): Map<number, number> => {
  const scores = new Map<number, number>();
  
  for (const post of posts) {
    scores.set(post.postId, calculatePostScore(post, userContext, weights));
  }
  
  return scores;
};

export default {
  calculatePostScore,
  rankPosts,
  batchCalculateScores,
  DEFAULT_WEIGHTS,
};
