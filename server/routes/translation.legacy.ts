// DM 번역 라우터 — Google Translate API를 사용해 채널 메시지를 지정 언어로 번역하고, 번역 결과를 캐싱하는 엔드포인트를 담당한다.
import type { Express } from 'express';
import { translateText, isTranslationEnabled } from '../translate';

export function registerLegacyTranslationRoutes(
  app: Express,
  deps: { storage: any; authenticateHybrid: any; checkAiUsage: any }
) {
  const { storage, authenticateHybrid, checkAiUsage } = deps;

  // Translation API endpoints
  app.get('/api/translation/status', (req, res) => {
    res.json({
      enabled: isTranslationEnabled(),
      maxLength: 500,
    });
  });

  app.post('/api/messages/:messageId/translate', authenticateHybrid, checkAiUsage('translation'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const messageId = parseInt(req.params.messageId);
      const { targetLanguage } = req.body;

      if (isNaN(messageId)) {
        return res.status(400).json({ message: 'Valid message ID is required' });
      }

      if (!targetLanguage) {
        return res.status(400).json({ message: 'Target language is required' });
      }

      if (!isTranslationEnabled()) {
        return res.status(503).json({ message: 'Translation service not available' });
      }

      // Get the message
      const message = await storage.getMessageById(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Check if translation already exists in cache
      const cachedTranslation = await storage.getTranslation(messageId, targetLanguage);
      if (cachedTranslation) {
        return res.json({
          translatedText: cachedTranslation.translatedText,
          cached: true,
        });
      }

      // Translate the message
      const result = await translateText(message.content, targetLanguage);

      // Save the detected language if not already set
      if (result.detectedSourceLanguage && !message.detectedLanguage) {
        await storage.updateMessageLanguage(messageId, result.detectedSourceLanguage);
      }

      // Cache the translation
      await storage.createTranslation({
        messageId,
        targetLanguage,
        translatedText: result.translatedText,
      });

      res.json({
        translatedText: result.translatedText,
        cached: false,
      });
    } catch (error: any) {
      console.error('Translation error:', error);
      
      if (error.message === 'QUOTA_EXCEEDED') {
        return res.status(429).json({ message: 'Translation quota exceeded. Please try again later.' });
      }
      
      res.status(500).json({ message: 'Translation failed' });
    }
  });

  app.put('/api/user/preferred-language', authenticateHybrid, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { language } = req.body;

      if (!language) {
        return res.status(400).json({ message: 'Language is required' });
      }

      const validLanguages = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ message: 'Invalid language code' });
      }

      await storage.updateUserPreferredLanguage(req.user.id, language);

      res.json({ message: 'Preferred language updated successfully' });
    } catch (error) {
      console.error('Error updating preferred language:', error);
      res.status(500).json({ message: 'Failed to update preferred language' });
    }
  });
}
