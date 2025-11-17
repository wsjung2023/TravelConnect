const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = process.env.MINI_CONCIERGE_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest';
const MAX_TOKENS = 1500;

console.log(`[Mini Concierge AI] Using model: ${AI_MODEL} (MINI_CONCIERGE_AI_MODEL=${process.env.MINI_CONCIERGE_AI_MODEL}, AI_MODEL=${process.env.AI_MODEL})`);

export interface MiniPlanContext {
  userId: string;
  location: {
    lat: number;
    lng: number;
  };
  timeMinutes: number;
  budgetLevel: 'low' | 'mid' | 'high';
  mood: 'chill' | 'hip' | 'local_food' | 'photo' | 'anything';
  companions: 'solo' | 'couple' | 'friends' | 'family';
  localTime?: string;
  weather?: string;
  userLanguage?: string;
}

export interface MiniPlanSpot {
  poiId: string | null;
  name: string;
  lat: number;
  lng: number;
  stayMin: number;
  reason: string;
  recommendedMenu?: string;
  priceRange?: string;
  photoHint?: string;
  expectedPrice?: number;
}

export interface MiniPlanOutput {
  planId?: string;
  title: string;
  summary: string;
  estimatedDurationMin: number;
  estimatedDistanceM: number;
  tags: string[];
  spots: MiniPlanSpot[];
}

export interface MiniPlansResponse {
  plans: MiniPlanOutput[];
}

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function buildSystemPrompt(context: MiniPlanContext, language: string): string {
  const budgetText = {
    low: language === 'ko' ? '1만원 이하' : 'under $10',
    mid: language === 'ko' ? '3만원 정도' : 'around $30',
    high: language === 'ko' ? '5만원 이상' : '$50+',
  };

  const moodText = {
    chill: language === 'ko' ? '조용하고 차분한' : 'quiet and relaxing',
    hip: language === 'ko' ? '힙하고 트렌디한' : 'hip and trendy',
    local_food: language === 'ko' ? '로컬 맛집 위주' : 'local food focused',
    photo: language === 'ko' ? '사진 찍기 좋은' : 'photo-worthy',
    anything: language === 'ko' ? '아무거나' : 'anything',
  };

  const companionsText = {
    solo: language === 'ko' ? '혼자' : 'solo',
    couple: language === 'ko' ? '연인과' : 'with partner',
    friends: language === 'ko' ? '친구들과' : 'with friends',
    family: language === 'ko' ? '가족과' : 'with family',
  };

  if (language === 'ko') {
    return `너는 여행 전문가이자 로컬 가이드다. 사용자가 지금 있는 위치에서 ${context.timeMinutes}분 동안 즐길 수 있는 3개의 미니 플랜을 설계하라.

**요구사항:**
- 예산: ${budgetText[context.budgetLevel]}
- 분위기: ${moodText[context.mood]}
- 동행: ${companionsText[context.companions]}
- 위치: 위도 ${context.location.lat}, 경도 ${context.location.lng} 근처 (반경 1~2km)

**출력 형식 (JSON):**
반드시 다음 JSON 스키마에 맞춰서 답변하라:
{
  "plans": [
    {
      "title": "플랜 제목 (예: 경복궁 감성 산책 + 카페 + 어묵꼬치)",
      "summary": "플랜 요약 (예: 야경이 예쁜 돌담길 산책 후 따뜻한 라떼와 어묵꼬치로 마무리하는 1시간 코스)",
      "estimatedDurationMin": ${context.timeMinutes},
      "estimatedDistanceM": 800,
      "tags": ["야경", "사진", "카페", "로컬간식"],
      "spots": [
        {
          "poiId": null,
          "name": "카페 어딘가",
          "lat": 37.123,
          "lng": 126.123,
          "stayMin": 25,
          "reason": "창가석에서 고궁 야경이 잘 보이는 카페",
          "recommendedMenu": "라떼, 치즈케이크",
          "priceRange": "7000~12000"
        },
        {
          "poiId": null,
          "name": "돌담길 포토스팟",
          "lat": 37.124,
          "lng": 126.121,
          "stayMin": 15,
          "reason": "사람이 적고 조용한 인생샷 포인트",
          "photoHint": "걷는 샷 + 로우 앵글"
        },
        {
          "poiId": null,
          "name": "통인시장 어묵꼬치",
          "lat": 37.125,
          "lng": 126.120,
          "stayMin": 20,
          "reason": "현지인에게 인기 있는 간식 스팟",
          "expectedPrice": 2000
        }
      ]
    }
  ]
}

**중요:**
- 각 플랜은 정확히 3개의 스팟으로 구성 (카페/음식점 + 포토스팟 + 간식/디저트 조합 추천)
- 스팟 간 이동 거리는 도보 5~10분 이내
- 총 3개의 다른 플랜을 생성하라
- 응답은 JSON만 출력 (다른 텍스트 없음)`;
  }

  return `You are a travel expert and local guide. Design 3 mini plans for the user to enjoy ${context.timeMinutes} minutes at their current location.

**Requirements:**
- Budget: ${budgetText[context.budgetLevel]}
- Mood: ${moodText[context.mood]}
- Companions: ${companionsText[context.companions]}
- Location: Near latitude ${context.location.lat}, longitude ${context.location.lng} (within 1-2km radius)

**Output Format (JSON):**
You must respond in the following JSON schema:
{
  "plans": [
    {
      "title": "Plan title (e.g., Palace Night Walk + Cafe + Street Snack)",
      "summary": "Plan summary (e.g., A 1-hour course combining a romantic stone wall walk, warm latte, and fish cake skewers)",
      "estimatedDurationMin": ${context.timeMinutes},
      "estimatedDistanceM": 800,
      "tags": ["nightview", "photo", "cafe", "local_snack"],
      "spots": [
        {
          "poiId": null,
          "name": "Cozy Cafe Somewhere",
          "lat": 37.123,
          "lng": 126.123,
          "stayMin": 25,
          "reason": "Cafe with great palace night view from window seats",
          "recommendedMenu": "Latte, Cheesecake",
          "priceRange": "$6~$10"
        },
        {
          "poiId": null,
          "name": "Stone Wall Photo Spot",
          "lat": 37.124,
          "lng": 126.121,
          "stayMin": 15,
          "reason": "Quiet photo spot with fewer people",
          "photoHint": "Walking shot + Low angle"
        },
        {
          "poiId": null,
          "name": "Market Fish Cake Stand",
          "lat": 37.125,
          "lng": 126.120,
          "stayMin": 20,
          "reason": "Popular local snack spot",
          "expectedPrice": 2
        }
      ]
    }
  ]
}

**Important:**
- Each plan must have exactly 3 spots (recommended: cafe/restaurant + photo spot + snack/dessert)
- Walking distance between spots should be 5-10 minutes
- Generate 3 different plans
- Output JSON only (no other text)`;
}

export async function generateMiniPlans(context: MiniPlanContext): Promise<MiniPlansResponse> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const userLanguage = context.userLanguage || 'en';
  const systemPrompt = buildSystemPrompt(context, userLanguage);

  const userPrompt = userLanguage === 'ko' 
    ? `지금 ${context.location.lat}, ${context.location.lng} 근처에 있어. ${context.timeMinutes}분 동안 ${context.mood} 분위기로 ${context.companions} 즐길 수 있는 3개 플랜 만들어줘. 예산은 ${context.budgetLevel}.`
    : `I'm near ${context.location.lat}, ${context.location.lng}. Create 3 plans for ${context.timeMinutes} minutes with ${context.mood} mood, ${context.companions} travel. Budget: ${context.budgetLevel}.`;

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
        max_completion_tokens: MAX_TOKENS,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    const parsedResponse = JSON.parse(aiResponse) as MiniPlansResponse;
    
    // Validate AI response structure
    validateAIResponse(parsedResponse);

    return parsedResponse;
  } catch (error: any) {
    console.error('Mini Concierge AI error:', error);
    throw error;
  }
}

function validateAIResponse(response: MiniPlansResponse): void {
  if (!response.plans || !Array.isArray(response.plans)) {
    throw new Error('Invalid response format: plans array missing');
  }

  if (response.plans.length !== 3) {
    throw new Error(`Invalid response: expected 3 plans, got ${response.plans.length}`);
  }

  response.plans.forEach((plan, planIndex) => {
    if (!plan.title || !plan.summary) {
      throw new Error(`Invalid plan ${planIndex}: missing title or summary`);
    }

    if (!plan.spots || !Array.isArray(plan.spots)) {
      throw new Error(`Invalid plan ${planIndex}: spots array missing`);
    }

    if (plan.spots.length !== 3) {
      throw new Error(`Invalid plan ${planIndex}: expected 3 spots, got ${plan.spots.length}`);
    }

    plan.spots.forEach((spot, spotIndex) => {
      // Check for required fields with explicit null/undefined checks
      if (!spot.name || !spot.reason) {
        throw new Error(`Invalid spot ${spotIndex} in plan ${planIndex}: missing name or reason`);
      }

      // Validate coordinates (must be numbers, including 0)
      if (spot.lat === undefined || spot.lat === null || 
          typeof spot.lat !== 'number' || !Number.isFinite(spot.lat)) {
        throw new Error(`Invalid spot ${spotIndex} in plan ${planIndex}: invalid latitude`);
      }

      if (spot.lng === undefined || spot.lng === null || 
          typeof spot.lng !== 'number' || !Number.isFinite(spot.lng)) {
        throw new Error(`Invalid spot ${spotIndex} in plan ${planIndex}: invalid longitude`);
      }

      // Validate stayMin (must be a valid positive number)
      if (spot.stayMin === undefined || spot.stayMin === null || 
          typeof spot.stayMin !== 'number' || !Number.isFinite(spot.stayMin)) {
        throw new Error(`Invalid spot ${spotIndex} in plan ${planIndex}: stayMin must be a number`);
      }

      if (spot.stayMin <= 0 || spot.stayMin > 120) {
        throw new Error(`Invalid spot ${spotIndex} in plan ${planIndex}: stayMin must be between 1 and 120 minutes`);
      }
    });
  });
}

export function isMiniConciergeEnabled(): boolean {
  return !!getApiKey();
}
