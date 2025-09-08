// 포스트 그룹핑 유틸리티 - 비슷한 시간·장소 포스트를 패치워크 카드로 묶기
import { Post } from '@shared/schema';

interface PostGroup {
  id: string;
  posts: Post[];
  primaryPost: Post;
  location: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  coordinates: {
    lat: number;
    lng: number;
  } | null;
}

// 두 좌표 간의 거리 계산 (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 시간 차이 계산 (시간 단위)
function calculateTimeDifference(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
}

// 포스트들을 그룹핑
export function groupSimilarPosts(posts: Post[]): PostGroup[] {
  const groups: PostGroup[] = [];
  const processed = new Set<number>();

  // 시간 순으로 정렬 (takenAt 우선, 없으면 createdAt)
  const sortedPosts = [...posts].sort((a, b) => {
    const aTime = a.takenAt ? new Date(a.takenAt) : new Date(a.createdAt);
    const bTime = b.takenAt ? new Date(b.takenAt) : new Date(b.createdAt);
    return aTime.getTime() - bTime.getTime();
  });

  for (const post of sortedPosts) {
    if (processed.has(post.id)) continue;

    const postTime = new Date(post.takenAt || post.createdAt);
    const postLat = post.latitude ? parseFloat(post.latitude) : null;
    const postLng = post.longitude ? parseFloat(post.longitude) : null;

    const similarPosts: Post[] = [post];
    processed.add(post.id);

    // 비슷한 포스트 찾기
    for (const otherPost of sortedPosts) {
      if (processed.has(otherPost.id)) continue;

      const otherTime = new Date(otherPost.takenAt || otherPost.createdAt);
      const otherLat = otherPost.latitude ? parseFloat(otherPost.latitude) : null;
      const otherLng = otherPost.longitude ? parseFloat(otherPost.longitude) : null;

      // 시간 차이 검사 (2시간 이내)
      const timeDiff = calculateTimeDifference(postTime, otherTime);
      if (timeDiff > 2) continue;

      // 위치 검사
      let isSimilarLocation = false;
      
      if (postLat && postLng && otherLat && otherLng) {
        // 좌표가 있는 경우: 500m 이내
        const distance = calculateDistance(postLat, postLng, otherLat, otherLng);
        isSimilarLocation = distance <= 0.5;
      } else if (post.location && otherPost.location) {
        // 좌표가 없는 경우: 위치 이름이 비슷한지 검사
        const location1 = post.location.toLowerCase();
        const location2 = otherPost.location.toLowerCase();
        
        // 간단한 유사도 검사 (공통 단어 포함)
        const words1 = location1.split(/\s+|,|\-/);
        const words2 = location2.split(/\s+|,|\-/);
        const commonWords = words1.filter(word => words2.includes(word) && word.length > 2);
        isSimilarLocation = commonWords.length > 0;
      }

      if (isSimilarLocation) {
        similarPosts.push(otherPost);
        processed.add(otherPost.id);
      }
    }

    // 그룹 생성
    const times = similarPosts.map(p => new Date(p.takenAt || p.createdAt));
    const coordinates = postLat && postLng ? { lat: postLat, lng: postLng } : null;

    groups.push({
      id: `group-${post.id}`,
      posts: similarPosts,
      primaryPost: post,
      location: post.location || `위치 ${post.id}`,
      timeRange: {
        start: new Date(Math.min(...times.map(t => t.getTime()))),
        end: new Date(Math.max(...times.map(t => t.getTime())))
      },
      coordinates
    });
  }

  return groups;
}

// Day별로 그룹핑 (Timeline용)
export function groupPostsByDay(posts: Post[], startDate?: Date): Record<number, PostGroup[]> {
  const dayGroups: Record<number, PostGroup[]> = {};
  
  posts.forEach(post => {
    let day = post.day || 1;
    
    // startDate가 있고 takenAt이 있으면 실제 날짜 차이로 day 계산
    if (startDate && (post.takenAt || post.createdAt)) {
      const takenAt = new Date(post.takenAt || post.createdAt);
      const diffTime = takenAt.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      day = Math.max(1, diffDays);
    }
    
    if (!dayGroups[day]) {
      dayGroups[day] = [];
    }
  });

  // 각 day별로 포스트 그룹핑
  Object.keys(dayGroups).forEach(dayStr => {
    const day = parseInt(dayStr);
    const dayPosts = posts.filter(post => {
      let postDay = post.day || 1;
      if (startDate && (post.takenAt || post.createdAt)) {
        const takenAt = new Date(post.takenAt || post.createdAt);
        const diffTime = takenAt.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        postDay = Math.max(1, diffDays);
      }
      return postDay === day;
    });
    
    dayGroups[day] = groupSimilarPosts(dayPosts);
  });

  return dayGroups;
}

export type { PostGroup };