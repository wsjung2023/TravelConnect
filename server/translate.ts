import type { Request, Response } from 'express';

const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const MAX_TRANSLATION_LENGTH = 500;

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export interface TranslationError {
  error: string;
  code?: string;
}

function getApiKey(): string | null {
  return process.env.GOOGLE_TRANSLATE_API_KEY || null;
}

export async function detectLanguage(text: string): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Google Translate API key not configured');
  }

  const truncatedText = text.slice(0, 100);

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_API_URL}/detect?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: truncatedText,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Language detection failed:', errorData);
      return 'en';
    }

    const data = await response.json();
    const detectedLang = data.data?.detections?.[0]?.[0]?.language || 'en';
    return detectedLang;
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Google Translate API key not configured');
  }

  if (text.length > MAX_TRANSLATION_LENGTH) {
    text = text.slice(0, MAX_TRANSLATION_LENGTH);
  }

  const requestBody: any = {
    q: text,
    target: targetLanguage,
    format: 'text',
  };

  if (sourceLanguage) {
    requestBody.source = sourceLanguage;
  }

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_API_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Translation API error:', errorData);
      
      if (response.status === 403 || response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }
      
      throw new Error('TRANSLATION_FAILED');
    }

    const data = await response.json();
    const translation = data.data?.translations?.[0];

    if (!translation) {
      throw new Error('TRANSLATION_FAILED');
    }

    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage,
    };
  } catch (error: any) {
    console.error('Translation error:', error);
    
    if (error.message === 'QUOTA_EXCEEDED') {
      throw error;
    }
    
    throw new Error('TRANSLATION_FAILED');
  }
}

export function isTranslationEnabled(): boolean {
  return !!getApiKey();
}

export function getTranslationStatus() {
  return {
    enabled: isTranslationEnabled(),
    maxLength: MAX_TRANSLATION_LENGTH,
  };
}
