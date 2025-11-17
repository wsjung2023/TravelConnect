const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = process.env.CINEMAP_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest';
const MAX_TOKENS = 2000;

// Haversine distance calculation in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export interface PhotoWithExif {
  id: number;
  url: string;
  datetime: Date;
  latitude: number;
  longitude: number;
  metadata?: any;
}

export interface PhotoCluster {
  lat: number;
  lng: number;
  photos: PhotoWithExif[];
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface StoryboardStop {
  title: string;
  description: string;
  caption: string;
  lat: number;
  lng: number;
  arrivalTime: Date;
  departureTime: Date;
  photos: {
    id: number;
    url: string;
    datetime: Date;
    isBestShot: boolean;
  }[];
  tags: string[];
}

export interface Storyboard {
  title: string;
  summary: string;
  intro: string;
  outro: string;
  totalDurationMinutes: number;
  totalDistanceMeters: number;
  stops: StoryboardStop[];
  route: {
    lat: number;
    lng: number;
  }[];
}

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

/**
 * Clusters photos by location and time to identify "stops"
 * Uses DBSCAN-like algorithm: photos within LOCATION_THRESHOLD meters and TIME_THRESHOLD minutes are grouped
 */
export function clusterPhotos(photos: PhotoWithExif[]): PhotoCluster[] {
  const LOCATION_THRESHOLD = 200; // meters - photos within 200m are considered same location
  const TIME_THRESHOLD = 60; // minutes - photos within 60 min are considered same visit
  
  if (photos.length === 0) return [];
  
  // Sort by time
  const sorted = [...photos].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
  
  const clusters: PhotoCluster[] = [];
  const firstPhoto = sorted[0];
  if (!firstPhoto) return [];
  
  let currentCluster: PhotoWithExif[] = [firstPhoto];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    if (!prev || !curr) continue;
    
    const distance = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
    
    const timeDiffMinutes = (curr.datetime.getTime() - prev.datetime.getTime()) / (1000 * 60);
    
    // If within threshold, add to current cluster
    if (distance < LOCATION_THRESHOLD && timeDiffMinutes < TIME_THRESHOLD) {
      currentCluster.push(curr);
    } else {
      // Finalize current cluster
      if (currentCluster.length > 0) {
        clusters.push(createCluster(currentCluster));
      }
      currentCluster = [curr];
    }
  }
  
  // Don't forget the last cluster
  if (currentCluster.length > 0) {
    clusters.push(createCluster(currentCluster));
  }
  
  return clusters;
}

function createCluster(photos: PhotoWithExif[]): PhotoCluster {
  // Calculate centroid
  const avgLat = photos.reduce((sum, p) => sum + p.latitude, 0) / photos.length;
  const avgLng = photos.reduce((sum, p) => sum + p.longitude, 0) / photos.length;
  
  const times = photos.map(p => p.datetime.getTime());
  const startTime = new Date(Math.min(...times));
  const endTime = new Date(Math.max(...times));
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  
  return {
    lat: avgLat,
    lng: avgLng,
    photos,
    startTime,
    endTime,
    durationMinutes,
  };
}

/**
 * Generates storyboard using OpenAI GPT-4o-mini
 */
export async function generateStoryboard(
  timelineTitle: string,
  photos: PhotoWithExif[],
  language: string = 'en'
): Promise<Storyboard> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  if (photos.length === 0) {
    throw new Error('No photos provided for storyboard generation');
  }
  
  // Cluster photos by location and time
  const clusters = clusterPhotos(photos);
  
  if (clusters.length === 0) {
    throw new Error('Failed to cluster photos');
  }
  
  // Build context for AI
  const clusterContext = clusters.map((cluster, idx) => ({
    stopNumber: idx + 1,
    lat: cluster.lat,
    lng: cluster.lng,
    photoCount: cluster.photos.length,
    arrivalTime: cluster.startTime.toISOString(),
    departureTime: cluster.endTime.toISOString(),
    durationMinutes: Math.round(cluster.durationMinutes),
  }));
  
  const totalDistance = calculateTotalDistance(clusters);
  const firstCluster = clusters[0];
  const lastCluster = clusters[clusters.length - 1];
  if (!firstCluster || !lastCluster) {
    throw new Error('Invalid cluster data');
  }
  const totalDuration = (lastCluster.endTime.getTime() - firstCluster.startTime.getTime()) / (1000 * 60);
  
  const systemPrompt = buildStoryboardPrompt(
    timelineTitle,
    clusterContext,
    totalDistance,
    totalDuration,
    language
  );
  
  const userPrompt = language === 'ko' 
    ? `주어진 여행 데이터를 바탕으로 영화 같은 여행 스토리보드를 생성해주세요.`
    : `Generate a cinematic travel storyboard based on the provided travel data.`;
  
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    const aiStoryboard = JSON.parse(content);
    
    // Validate and merge with actual photo data
    const storyboard = validateAndMergeStoryboard(aiStoryboard, clusters, totalDistance, totalDuration);
    
    return storyboard;
    
  } catch (error: any) {
    console.error('Storyboard generation error:', error);
    throw new Error(`Failed to generate storyboard: ${error.message}`);
  }
}

function buildStoryboardPrompt(
  timelineTitle: string,
  clusters: any[],
  totalDistanceM: number,
  totalDurationMin: number,
  language: string
): string {
  if (language === 'ko') {
    return `너는 영화 감독이자 여행 스토리텔러다. 사용자의 여행 사진 EXIF 데이터를 분석하여 시네마틱한 여행 영상의 스토리보드를 생성하라.

**여행 정보:**
- 타임라인 제목: "${timelineTitle}"
- 총 ${clusters.length}개의 장소 방문
- 총 이동 거리: ${Math.round(totalDistanceM)}m
- 총 소요 시간: ${Math.round(totalDurationMin)}분

**장소 데이터:**
${clusters.map(c => `Stop ${c.stopNumber}: (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}) - ${c.photoCount}장의 사진, ${c.durationMinutes}분 체류, ${new Date(c.arrivalTime).toLocaleString('ko-KR')}`).join('\n')}

**출력 형식 (JSON):**
반드시 다음 JSON 스키마에 맞춰서 답변하라:
{
  "title": "여행 영상의 제목 (예: '서울의 하루, 북촌에서 남산까지')",
  "summary": "여행의 전체 요약 (1-2문장)",
  "intro": "영상 오프닝 나레이션 (감성적이고 흥미를 끄는 문장)",
  "outro": "영상 엔딩 나레이션 (여운을 남기는 마무리 문장)",
  "stops": [
    {
      "title": "첫 번째 장소 이름 (예: '북촌 한옥마을의 아침')",
      "description": "장소에 대한 설명 (2-3문장)",
      "caption": "영상 자막으로 사용될 짧은 캡션 (예: '고즈넉한 돌담길을 따라 걷다')",
      "tags": ["한옥", "전통", "아침"]
    },
    {
      "title": "두 번째 장소 이름",
      "description": "장소 설명",
      "caption": "영상 자막",
      "tags": ["카페", "휴식"]
    }
  ]
}

**요구사항:**
- stops 배열은 정확히 ${clusters.length}개여야 함
- 각 stop의 title, description, caption은 모두 감성적이고 시네마틱해야 함
- tags는 각 장소의 분위기를 나타내는 3개 이하의 키워드
- intro와 outro는 영화 나레이션처럼 서정적이고 몰입감 있게 작성
- 모든 텍스트는 한국어로 작성`;
  } else {
    return `You are a film director and travel storyteller. Analyze the user's travel photo EXIF data to create a cinematic travel video storyboard.

**Travel Information:**
- Timeline title: "${timelineTitle}"
- ${clusters.length} locations visited
- Total distance: ${Math.round(totalDistanceM)}m
- Total duration: ${Math.round(totalDurationMin)} minutes

**Location Data:**
${clusters.map(c => `Stop ${c.stopNumber}: (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}) - ${c.photoCount} photos, ${c.durationMinutes}min stay, ${new Date(c.arrivalTime).toLocaleString('en-US')}`).join('\n')}

**Output Format (JSON):**
You must respond with the following JSON schema:
{
  "title": "Video title (e.g., 'A Day in Seoul: From Bukchon to Namsan')",
  "summary": "Overall travel summary (1-2 sentences)",
  "intro": "Opening narration for the video (engaging and emotional)",
  "outro": "Closing narration for the video (reflective and memorable)",
  "stops": [
    {
      "title": "First location name (e.g., 'Morning at Bukchon Hanok Village')",
      "description": "Description of the location (2-3 sentences)",
      "caption": "Short caption for video subtitle (e.g., 'Walking along the quiet stone paths')",
      "tags": ["hanok", "traditional", "morning"]
    },
    {
      "title": "Second location name",
      "description": "Location description",
      "caption": "Video caption",
      "tags": ["cafe", "rest"]
    }
  ]
}

**Requirements:**
- The stops array must have exactly ${clusters.length} items
- Each stop's title, description, and caption should be emotional and cinematic
- tags should be 3 or fewer keywords representing the atmosphere
- intro and outro should be poetic and immersive like film narration
- All text must be in English`;
  }
}

function validateAndMergeStoryboard(
  aiStoryboard: any,
  clusters: PhotoCluster[],
  totalDistanceM: number,
  totalDurationMin: number
): Storyboard {
  // Validate required fields
  if (!aiStoryboard.title || typeof aiStoryboard.title !== 'string') {
    throw new Error('Invalid AI response: missing or invalid title');
  }
  
  if (!aiStoryboard.summary || typeof aiStoryboard.summary !== 'string') {
    throw new Error('Invalid AI response: missing or invalid summary');
  }
  
  if (!Array.isArray(aiStoryboard.stops) || aiStoryboard.stops.length !== clusters.length) {
    throw new Error(`Invalid AI response: stops array must have ${clusters.length} items`);
  }
  
  // Merge AI-generated content with actual photo data
  const stops: StoryboardStop[] = clusters.map((cluster, idx) => {
    const aiStop = aiStoryboard.stops[idx];
    
    if (!aiStop.title || !aiStop.description || !aiStop.caption) {
      throw new Error(`Invalid AI response: stop ${idx} missing required fields`);
    }
    
    // Select best shot (middle photo or first photo)
    const bestShotIndex = Math.floor(cluster.photos.length / 2);
    
    return {
      title: aiStop.title,
      description: aiStop.description,
      caption: aiStop.caption,
      lat: cluster.lat,
      lng: cluster.lng,
      arrivalTime: cluster.startTime,
      departureTime: cluster.endTime,
      photos: cluster.photos.map((photo, photoIdx) => ({
        id: photo.id,
        url: photo.url,
        datetime: photo.datetime,
        isBestShot: photoIdx === bestShotIndex,
      })),
      tags: Array.isArray(aiStop.tags) ? aiStop.tags : [],
    };
  });
  
  // Generate route polyline
  const route = clusters.map(c => ({ lat: c.lat, lng: c.lng }));
  
  return {
    title: aiStoryboard.title,
    summary: aiStoryboard.summary,
    intro: aiStoryboard.intro || '',
    outro: aiStoryboard.outro || '',
    totalDurationMinutes: Math.round(totalDurationMin),
    totalDistanceMeters: Math.round(totalDistanceM),
    stops,
    route,
  };
}

function calculateTotalDistance(clusters: PhotoCluster[]): number {
  let total = 0;
  for (let i = 1; i < clusters.length; i++) {
    const prev = clusters[i - 1];
    const curr = clusters[i];
    if (!prev || !curr) continue;
    total += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
  }
  return total;
}
