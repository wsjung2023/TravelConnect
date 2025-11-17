import type { Request, Response } from 'express';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = 'gpt-5.1-chat-latest';
const MAX_TOKENS = 500;

export interface ConciergeContext {
  userId: string;
  userProfile?: {
    firstName?: string;
    lastName?: string;
    location?: string;
    interests?: string[];
    languages?: string[];
    preferredLanguage?: string;
    timezone?: string;
  };
  nearbyExperiences?: Array<{
    id: number;
    title: string;
    category: string;
    location: string;
    price: string;
  }>;
  upcomingSlots?: Array<{
    id: number;
    title: string;
    date: string;
    category: string;
  }>;
  recentPosts?: Array<{
    id: number;
    title?: string;
    location?: string;
    theme?: string;
  }>;
}

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null;
}

function buildSystemPrompt(context: ConciergeContext, userLanguage: string): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    ko: 'Korean',
    ja: 'Japanese',
    zh: 'Chinese',
    fr: 'French',
    es: 'Spanish',
  };

  const responseLang = languageNames[userLanguage] || 'English';
  
  let prompt = `You are Tourgether AI Concierge, a helpful travel assistant. Always respond in ${responseLang}.

Your role:
- Help users discover local experiences and activities
- Provide personalized recommendations based on their interests
- Answer questions about nearby places, food, and activities
- Assist with trip planning and itineraries

User Context:`;

  if (context.userProfile) {
    const profile = context.userProfile;
    if (profile.firstName) {
      prompt += `\n- Name: ${profile.firstName}`;
    }
    if (profile.location) {
      prompt += `\n- Current Location: ${profile.location}`;
    }
    if (profile.interests && profile.interests.length > 0) {
      prompt += `\n- Interests: ${profile.interests.join(', ')}`;
    }
    if (profile.timezone) {
      prompt += `\n- Timezone: ${profile.timezone}`;
    }
  }

  if (context.nearbyExperiences && context.nearbyExperiences.length > 0) {
    prompt += `\n\nNearby Experiences Available:`;
    context.nearbyExperiences.slice(0, 5).forEach((exp) => {
      prompt += `\n- ${exp.title} (${exp.category}) at ${exp.location} - ${exp.price}`;
    });
  }

  if (context.upcomingSlots && context.upcomingSlots.length > 0) {
    prompt += `\n\nUpcoming Available Slots:`;
    context.upcomingSlots.slice(0, 3).forEach((slot) => {
      prompt += `\n- ${slot.title} on ${slot.date} (${slot.category})`;
    });
  }

  prompt += `\n\nGuidelines:
- Be friendly, helpful, and concise
- Recommend experiences from the available list when relevant
- If user asks about specific places, provide accurate information
- Always respond in ${responseLang}
- Keep responses under 3 paragraphs unless asked for details`;

  return prompt;
}

export async function generateConciergeResponse(
  userMessage: string,
  context: ConciergeContext,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const userLanguage = context.userProfile?.preferredLanguage || 'en';
  const systemPrompt = buildSystemPrompt(context, userLanguage);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
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

    return aiResponse;
  } catch (error: any) {
    console.error('Concierge AI error:', error);
    throw error;
  }
}

export async function generateConciergeResponseStream(
  userMessage: string,
  context: ConciergeContext,
  conversationHistory: Array<{ role: string; content: string }> = [],
  onChunk: (chunk: string) => void
): Promise<void> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const userLanguage = context.userProfile?.preferredLanguage || 'en';
  const systemPrompt = buildSystemPrompt(context, userLanguage);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Concierge AI streaming error:', error);
    throw error;
  }
}

export function isConciergeEnabled(): boolean {
  return !!getApiKey();
}
