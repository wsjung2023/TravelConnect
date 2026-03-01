// AI 기능 라우터 — AI Concierge(대화형 여행 도우미), Mini Concierge(1시간 액티비티 플래너), CineMap(사진 기반 여행 스토리보드 생성) 엔드포인트 및 AI 모델 설정 테스트 API를 담당한다.
import type { Express } from 'express';
import { generateConciergeResponse, isConciergeEnabled, type ConciergeContext } from '../ai/concierge';
import { generateMiniPlans, isMiniConciergeEnabled, type MiniPlanContext } from '../ai/miniConcierge';
import { generateStoryboard, type PhotoWithExif } from '../ai/cinemap';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyAIFeaturesRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any; checkAiUsage: any; requireAiEnv: any }
) {
  const { storage, authenticateToken, authenticateHybrid, checkAiUsage, requireAiEnv } = deps;

  // AI Concierge API endpoints
  app.get('/api/ai/concierge/status', (req, res) => {
    res.json({
      enabled: isConciergeEnabled(),
    });
  });

  app.post('/api/ai/concierge/message', authenticateToken, requireAiEnv, checkAiUsage('ai_message'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { message: userMessage, channelId } = req.body;

      if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }

      if (!channelId || isNaN(parseInt(channelId))) {
        return res.status(400).json({ message: 'Valid channel ID is required' });
      }

      if (!isConciergeEnabled()) {
        return res.status(503).json({ message: 'AI Concierge service not available' });
      }

      const userId = req.user.id;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const nearbyExperiences = await storage.getNearbyExperiences(userId);
      const recentPosts = await storage.getRecentPostsByUser(userId);
      const upcomingSlots = user.location 
        ? await storage.getUpcomingSlotsByLocation(user.location) 
        : [];

      const context: ConciergeContext = {
        userId,
        userProfile: {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          location: user.location || undefined,
          interests: user.interests || undefined,
          languages: user.languages || undefined,
          preferredLanguage: user.preferredLanguage || 'en',
          timezone: user.timezone || undefined,
        },
        nearbyExperiences: nearbyExperiences.map(exp => ({
          id: exp.id,
          title: exp.title,
          category: exp.category,
          location: exp.location,
          price: `${exp.price} ${exp.currency}`,
        })),
        recentPosts: recentPosts.map(post => ({
          id: post.id,
          title: post.title || undefined,
          location: post.location || undefined,
          theme: post.theme || undefined,
        })),
        upcomingSlots: upcomingSlots.map(slot => ({
          id: slot.id,
          title: slot.title || 'Untitled',
          date: slot.date,
          category: slot.category || 'general',
        })),
      };

      const previousMessages = await storage.getMessagesByChannel(parseInt(channelId), 10);
      const conversationHistory = previousMessages
        .filter(msg => msg.senderId === userId || msg.senderId === null)
        .map(msg => ({
          role: msg.senderId === userId ? 'user' : 'assistant',
          content: msg.content,
        }));

      const aiResponse = await generateConciergeResponse(
        userMessage.trim(),
        context,
        conversationHistory
      );

      const aiMessage = await storage.createChannelMessage({
        channelId: parseInt(channelId),
        senderId: null,
        content: aiResponse,
        messageType: 'text',
      });

      res.json({
        message: aiMessage,
        aiResponse,
      });
    } catch (error: any) {
      console.error('AI Concierge error:', error);
      
      if (error.message?.includes('OpenAI API')) {
        return res.status(503).json({ message: 'AI service temporarily unavailable' });
      }
      
      res.status(500).json({ message: 'Failed to get AI response' });
    }
  });

  // Mini Concierge API endpoints
  app.get('/api/mini-concierge/status', (req, res) => {
    res.json({
      enabled: isMiniConciergeEnabled(),
    });
  });

  app.post('/api/mini-concierge/generate', authenticateToken, requireAiEnv, checkAiUsage('concierge'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!isMiniConciergeEnabled()) {
        return res.status(503).json({ message: 'Mini Concierge service not available' });
      }

      const { location, timeMinutes, budgetLevel, mood, companions } = req.body;

      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return res.status(400).json({ message: 'Valid location is required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const context: MiniPlanContext = {
        userId: req.user.id,
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        timeMinutes: timeMinutes || 60,
        budgetLevel: budgetLevel || 'mid',
        mood: mood || 'anything',
        companions: companions || 'solo',
        userLanguage: user.preferredLanguage || 'en',
      };

      const result = await generateMiniPlans(context);

      const savedPlans = [];
      for (const plan of result.plans) {
        const newPlan = await storage.createMiniPlan({
          userId: req.user.id,
          title: plan.title,
          summary: plan.summary,
          estimatedDurationMin: plan.estimatedDurationMin,
          estimatedDistanceM: plan.estimatedDistanceM,
          tags: plan.tags,
        });

        const spotsToInsert = plan.spots.map((spot, idx) => ({
          miniPlanId: newPlan.id,
          orderIndex: idx,
          poiId: spot.poiId,
          name: spot.name,
          latitude: spot.lat.toString(),
          longitude: spot.lng.toString(),
          stayMin: spot.stayMin,
          metaJson: {
            reason: spot.reason,
            recommendedMenu: spot.recommendedMenu,
            priceRange: spot.priceRange,
            photoHint: spot.photoHint,
            expectedPrice: spot.expectedPrice,
          },
        }));

        const spots = await storage.createMiniPlanSpots(spotsToInsert);

        savedPlans.push({
          ...newPlan,
          spots,
        });
      }

      res.json({
        plans: savedPlans,
      });
    } catch (error: any) {
      console.error('Mini Concierge generate error:', error);
      
      // Handle OpenAI API errors
      if (error.message?.includes('OpenAI API')) {
        return res.status(503).json({ 
          message: 'AI service temporarily unavailable',
          error: 'SERVICE_UNAVAILABLE',
        });
      }
      
      // Handle validation errors (malformed AI response)
      if (error.message?.includes('Invalid response') || 
          error.message?.includes('Invalid plan') || 
          error.message?.includes('Invalid spot') ||
          error.message?.includes('expected 3')) {
        return res.status(502).json({ 
          message: 'Failed to generate valid plans. Please try again.',
          error: 'VALIDATION_FAILED',
          details: error.message,
        });
      }
      
      // Handle other errors
      res.status(500).json({ 
        message: 'Failed to generate mini plans',
        error: 'INTERNAL_ERROR',
      });
    }
  });

  app.get('/api/mini-concierge/plans', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const plans = await storage.getMiniPlansByUser(req.user.id, limit);

      res.json({ plans });
    } catch (error) {
      console.error('Error fetching mini plans:', error);
      res.status(500).json({ message: 'Failed to fetch mini plans' });
    }
  });

  app.get('/api/mini-concierge/plans/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const planId = parseInt(req.params.id!);
      if (isNaN(planId)) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const plan = await storage.getMiniPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const checkins = await storage.getCheckinsByPlan(planId);

      res.json({ 
        plan,
        checkins,
      });
    } catch (error) {
      console.error('Error fetching mini plan:', error);
      res.status(500).json({ message: 'Failed to fetch mini plan' });
    }
  });

  app.post('/api/mini-concierge/plans/:id/start', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const planId = parseInt(req.params.id!);
      if (isNaN(planId)) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const plan = await storage.getMiniPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updated = await storage.startMiniPlan(planId);
      
      res.json({ plan: updated });
    } catch (error) {
      console.error('Error starting mini plan:', error);
      res.status(500).json({ message: 'Failed to start mini plan' });
    }
  });

  app.post('/api/mini-concierge/plans/:id/complete', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const planId = parseInt(req.params.id!);
      if (isNaN(planId)) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      const plan = await storage.getMiniPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updated = await storage.completeMiniPlan(planId);
      
      res.json({ plan: updated });
    } catch (error) {
      console.error('Error completing mini plan:', error);
      res.status(500).json({ message: 'Failed to complete mini plan' });
    }
  });

  app.post('/api/mini-concierge/spots/:spotId/checkin', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const spotId = parseInt(req.params.spotId!);
      if (isNaN(spotId)) {
        return res.status(400).json({ message: 'Invalid spot ID' });
      }

      const { planId, photos, notes } = req.body;

      if (!planId || isNaN(parseInt(planId))) {
        return res.status(400).json({ message: 'Valid plan ID is required' });
      }

      const plan = await storage.getMiniPlanById(parseInt(planId));
      
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      if (plan.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const checkin = await storage.checkInSpot({
        miniPlanId: parseInt(planId),
        spotId: spotId,
        userId: req.user.id,
        photos: photos || [],
        notes: notes || null,
      });

      res.json({ checkin });
    } catch (error) {
      console.error('Error checking in spot:', error);
      res.status(500).json({ message: 'Failed to check in spot' });
    }
  });

  // CineMap API routes
  app.get('/api/timelines/:id/media', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const timelineId = parseInt(req.params.id!);
      if (isNaN(timelineId)) {
        return res.status(400).json({ message: 'Invalid timeline ID' });
      }

      const timeline = await storage.getTimelineWithPosts(timelineId);
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      const postsWithMedia = await Promise.all(
        (timeline.posts || []).map(async (post) => {
          const media = await storage.getPostMediaByPostId(post.id);
          return { ...post, media };
        })
      );

      res.json({
        timeline,
        posts: postsWithMedia,
      });
    } catch (error) {
      console.error('Error fetching timeline media:', error);
      res.status(500).json({ message: 'Failed to fetch timeline media' });
    }
  });

  app.post('/api/cinemap/jobs', authenticateToken, requireAiEnv, checkAiUsage('ai_message'), async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { timelineId, config } = req.body;

      if (!timelineId || isNaN(parseInt(timelineId))) {
        return res.status(400).json({ message: 'Valid timeline ID is required' });
      }

      const timeline = await storage.getTimelineById(parseInt(timelineId));
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      if (timeline.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied - not timeline owner' });
      }

      // Create job as 'pending'
      const job = await storage.createCinemapJob({
        userId: req.user.id,
        timelineId: parseInt(timelineId),
        status: 'pending',
      });

      // Respond immediately with pending job
      res.status(201).json({ job });

      // Process storyboard generation asynchronously
      (async () => {
        try {
          console.log(`[CineMap] Starting storyboard generation for job ${job.id}, timeline ${timelineId}`);
          
          // Update status to processing
          await storage.updateCinemapJob(job.id, { status: 'processing' });

          // Fetch timeline with all media
          const timelineWithPosts = await storage.getTimelineWithPosts(parseInt(timelineId));
          if (!timelineWithPosts || !timelineWithPosts.posts) {
            throw new Error('Timeline has no posts');
          }

          // Collect all media with EXIF data from all posts
          const allPhotos: PhotoWithExif[] = [];
          for (const post of timelineWithPosts.posts) {
            const media = await storage.getPostMediaByPostId(post.id);
            for (const m of media) {
              if (m.exifDatetime && m.exifLatitude && m.exifLongitude) {
                allPhotos.push({
                  id: m.id,
                  url: m.url,
                  datetime: new Date(m.exifDatetime),
                  latitude: parseFloat(m.exifLatitude),
                  longitude: parseFloat(m.exifLongitude),
                  metadata: m.exifMetadata,
                });
              }
            }
          }

          if (allPhotos.length === 0) {
            throw new Error('No photos with EXIF data found in timeline');
          }

          console.log(`[CineMap] Found ${allPhotos.length} photos with EXIF data`);

          // Generate storyboard using AI
          const storyboard = await generateStoryboard(
            timeline.title,
            allPhotos,
            req.user.preferredLanguage || 'en'
          );

          console.log(`[CineMap] Storyboard generated successfully for job ${job.id}`);

          // Update job with completed storyboard
          await storage.updateCinemapJob(job.id, {
            status: 'completed',
            storyboard: storyboard as any,
            // resultVideoUrl would be set by actual video rendering service
            resultVideoUrl: null, // Placeholder - actual video rendering not implemented yet
          });

          console.log(`[CineMap] Job ${job.id} completed successfully`);
        } catch (error: any) {
          console.error(`[CineMap] Error generating storyboard for job ${job.id}:`, error);
          await storage.updateCinemapJob(job.id, {
            status: 'failed',
            errorMessage: error.message || 'Failed to generate storyboard',
          });
        }
      })();

    } catch (error) {
      console.error('Error creating CineMap job:', error);
      res.status(500).json({ message: 'Failed to create CineMap job' });
    }
  });

  app.get('/api/cinemap/jobs/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const jobId = parseInt(req.params.id!);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      const job = await storage.getCinemapJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ job });
    } catch (error) {
      console.error('Error fetching CineMap job:', error);
      res.status(500).json({ message: 'Failed to fetch CineMap job' });
    }
  });

  app.get('/api/cinemap/jobs/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const userId = req.params.userId!;
      if (userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const jobs = await storage.getCinemapJobsByUser(userId);
      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching user CineMap jobs:', error);
      res.status(500).json({ message: 'Failed to fetch user CineMap jobs' });
    }
  });

  app.get('/api/cinemap/jobs/timeline/:timelineId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const timelineId = parseInt(req.params.timelineId!);
      if (isNaN(timelineId)) {
        return res.status(400).json({ message: 'Invalid timeline ID' });
      }

      const timeline = await storage.getTimelineById(timelineId);
      if (!timeline) {
        return res.status(404).json({ message: 'Timeline not found' });
      }

      if (timeline.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const jobs = await storage.getCinemapJobsByTimeline(timelineId);
      res.json({ jobs });
    } catch (error) {
      console.error('Error fetching timeline CineMap jobs:', error);
      res.status(500).json({ message: 'Failed to fetch timeline CineMap jobs' });
    }
  });

  // 예약 시스템 자동화 작업 API (내부 시스템 전용 - 인증 필요)
  app.post('/api/admin/process-expired-bookings', authenticateToken, async (req: any, res) => {
    // 관리자 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const processedCount = await storage.processExpiredBookings();
      res.json({ 
        message: `Processed ${processedCount} expired bookings`,
        processedCount 
      });
    } catch (error) {
      console.error('Error processing expired bookings:', error);
      res.status(500).json({ message: 'Failed to process expired bookings' });
    }
  });

  app.post('/api/admin/process-completed-experiences', authenticateToken, async (req: any, res) => {
    // 관리자 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const processedCount = await storage.processCompletedExperiences();
      res.json({ 
        message: `Processed ${processedCount} completed experiences`,
        processedCount 
      });
    } catch (error) {
      console.error('Error processing completed experiences:', error);
      res.status(500).json({ message: 'Failed to process completed experiences' });
    }
  });

  app.post('/api/admin/recalculate-slot-availability', authenticateToken, async (req: any, res) => {
    // 관리자 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      const { slotId } = req.body;
      await storage.recalculateSlotAvailability(slotId);
      res.json({ 
        message: slotId 
          ? `Recalculated availability for slot ${slotId}`
          : 'Recalculated availability for all slots'
      });
    } catch (error) {
      console.error('Error recalculating slot availability:', error);
      res.status(500).json({ message: 'Failed to recalculate slot availability' });
    }
  });

  // AI Model Configuration Test Endpoint
  app.get('/api/admin/ai-models', (req, res) => {
    res.json({
      cinemap: {
        CINEMAP_AI_MODEL: process.env.CINEMAP_AI_MODEL || 'not set',
        AI_MODEL: process.env.AI_MODEL || 'not set',
        effectiveModel: process.env.CINEMAP_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest'
      },
      miniConcierge: {
        MINI_CONCIERGE_AI_MODEL: process.env.MINI_CONCIERGE_AI_MODEL || 'not set',
        AI_MODEL: process.env.AI_MODEL || 'not set',
        effectiveModel: process.env.MINI_CONCIERGE_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest'
      },
      concierge: {
        CONCIERGE_AI_MODEL: process.env.CONCIERGE_AI_MODEL || 'not set',
        AI_MODEL: process.env.AI_MODEL || 'not set',
        effectiveModel: process.env.CONCIERGE_AI_MODEL || process.env.AI_MODEL || 'gpt-5.1-chat-latest'
      }
    });
  });

  // ============================================
  // Serendipity Protocol API Routes
  // ============================================

  // 위치 업데이트 (serendipity 매칭을 위한)
  app.put('/api/serendipity/location', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
      }

      await storage.updateUser(req.user.id, {
        lastLatitude: latitude.toString(),
        lastLongitude: longitude.toString(),
        lastLocationUpdatedAt: new Date(),
      });

      res.json({ message: 'Location updated' });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: 'Failed to update location' });
    }
  });

  // Serendipity 설정 토글
  app.put('/api/serendipity/toggle', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'Enabled must be a boolean' });
      }

      await storage.updateUser(req.user.id, {
        serendipityEnabled: enabled,
      });

      res.json({ message: `Serendipity ${enabled ? 'enabled' : 'disabled'}`, enabled });
    } catch (error) {
      console.error('Error toggling serendipity:', error);
      res.status(500).json({ message: 'Failed to toggle serendipity' });
    }
  });

  // 근접 매칭 확인 (같은 플랜 or 유사 태그)
  app.post('/api/serendipity/check', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { latitude, longitude, planId, tags, radiusM = 150 } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Location is required' });
      }

      // 위치 업데이트
      await storage.updateUser(req.user.id, {
        lastLatitude: latitude.toString(),
        lastLongitude: longitude.toString(),
        lastLocationUpdatedAt: new Date(),
      });

      let nearbyUsers: any[] = [];

      // 같은 플랜을 선택한 근처 사용자 찾기
      if (planId) {
        nearbyUsers = await storage.findNearbyUsersWithSamePlan(
          planId,
          req.user.id,
          latitude,
          longitude,
          radiusM
        );
      }

      // 유사 태그를 가진 근처 사용자 찾기
      if (tags && tags.length > 0 && nearbyUsers.length === 0) {
        nearbyUsers = await storage.findNearbyUsersWithSimilarTags(
          tags,
          req.user.id,
          latitude,
          longitude,
          radiusM
        );
      }

      // 근처에 매칭 가능한 사용자가 있으면 퀘스트 제안
      if (nearbyUsers.length > 0) {
        // 이미 활성 퀘스트가 있는지 확인
        const existingQuests = await storage.getActiveQuests(latitude, longitude, radiusM);
        const userInQuest = existingQuests.some(q => 
          q.status === 'active' || q.status === 'in_progress'
        );

        if (!userInQuest) {
          // 퀘스트 템플릿 선택 (랜덤)
          const questTemplates = [
            {
              title: '야경 인생샷 3컷 미션',
              description: '근처 여행자와 함께 서로 한 장씩 사진을 찍어주세요.',
              durationMin: 5,
              rewardType: 'highlight',
              rewardDetail: '공동 하이라이트 클립 자동 생성',
              requiredActions: [{ type: 'photo_upload', count: 2, note: '각자 1장 이상 업로드' }],
            },
            {
              title: '숨은 맛집 공유 미션',
              description: '서로의 추천 메뉴를 한 개씩 추천해보세요.',
              durationMin: 3,
              rewardType: 'badge',
              rewardDetail: '로컬 푸드 탐험가 뱃지',
              requiredActions: [{ type: 'recommendation', count: 1, note: '메뉴 추천' }],
            },
            {
              title: '포토스팟 교환 미션',
              description: '서로가 발견한 좋은 사진 스팟을 공유해보세요.',
              durationMin: 5,
              rewardType: 'highlight',
              rewardDetail: '공동 포토 하이라이트',
              requiredActions: [{ type: 'location_share', count: 1, note: '포토스팟 위치 공유' }],
            },
          ];

          const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];

          // 새 퀘스트 생성
          const newQuest = await storage.createQuest({
            type: 'serendipity',
            title: template.title,
            description: template.description,
            durationMin: template.durationMin,
            rewardType: template.rewardType,
            rewardDetail: template.rewardDetail,
            requiredActions: template.requiredActions,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            radiusM,
            status: 'active',
            matchedMiniPlanId: planId || null,
            matchedTags: tags || null,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10분 후 만료
          });

          // 현재 사용자를 참가자로 추가 (초대 상태)
          await storage.addQuestParticipant({
            questId: newQuest.id,
            userId: req.user.id,
            status: 'invited',
          });

          // 근처 사용자들도 초대
          for (const nearbyUser of nearbyUsers.slice(0, 3)) { // 최대 3명
            await storage.addQuestParticipant({
              questId: newQuest.id,
              userId: nearbyUser.id,
              status: 'invited',
            });

            // 알림 생성
            await storage.createNotification({
              userId: nearbyUser.id,
              type: 'serendipity',
              title: '🍀 근처에 비슷한 여행자 발견!',
              message: `${template.title} - 참여하시겠습니까?`,
              relatedUserId: req.user.id,
            });
          }

          return res.json({
            matched: true,
            quest: newQuest,
            nearbyUsers: nearbyUsers.map(u => ({
              id: u.id,
              firstName: u.firstName,
              profileImageUrl: u.profileImageUrl,
            })),
          });
        }
      }

      res.json({ matched: false, nearbyUsers: [] });
    } catch (error) {
      console.error('Error checking serendipity:', error);
      res.status(500).json({ message: 'Failed to check serendipity' });
    }
  });

  // 퀘스트 수락
  app.post('/api/serendipity/quest/:questId/accept', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      const quest = await storage.getQuestById(questId);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }

      if (quest.status === 'expired' || quest.status === 'cancelled') {
        return res.status(400).json({ message: 'Quest is no longer available' });
      }

      // 참가자 상태 업데이트
      const participant = await storage.updateQuestParticipantStatus(
        questId,
        req.user.id,
        'accepted'
      );

      if (!participant) {
        return res.status(400).json({ message: 'You are not invited to this quest' });
      }

      // 모든 참가자가 수락했는지 확인
      const allParticipants = await storage.getQuestParticipants(questId);
      const allAccepted = allParticipants.every(p => p.status === 'accepted');

      if (allAccepted && allParticipants.length >= 2) {
        // 퀘스트 시작
        await storage.updateQuestStatus(questId, 'in_progress');
      }

      res.json({ message: 'Quest accepted', participant, quest });
    } catch (error) {
      console.error('Error accepting quest:', error);
      res.status(500).json({ message: 'Failed to accept quest' });
    }
  });

  // 퀘스트 거절
  app.post('/api/serendipity/quest/:questId/decline', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      await storage.updateQuestParticipantStatus(questId, req.user.id, 'declined');

      res.json({ message: 'Quest declined' });
    } catch (error) {
      console.error('Error declining quest:', error);
      res.status(500).json({ message: 'Failed to decline quest' });
    }
  });

  // 퀘스트 완료 (결과 제출)
  app.post('/api/serendipity/quest/:questId/complete', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      const { photos, notes } = req.body;

      const quest = await storage.getQuestById(questId);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }

      // 참가자 결과 업데이트
      const participant = await storage.updateQuestParticipantStatus(
        questId,
        req.user.id,
        'completed',
        { photos: photos || [], notes: notes || '' }
      );

      if (!participant) {
        return res.status(400).json({ message: 'You are not part of this quest' });
      }

      // 모든 참가자가 완료했는지 확인
      const allParticipants = await storage.getQuestParticipants(questId);
      const allCompleted = allParticipants.every(p => p.status === 'completed');

      if (allCompleted) {
        // 퀘스트 완료 및 하이라이트 생성
        await storage.updateQuestStatus(questId, 'completed');

        // 공동 하이라이트 생성
        const allPhotos = allParticipants.flatMap(p => {
          const result = p.resultJson as any;
          return result?.photos || [];
        });

        if (allPhotos.length > 0) {
          await storage.createQuestHighlight({
            questId,
            highlightMediaUrl: allPhotos[0], // 첫 번째 사진을 대표로
            thumbnailUrl: allPhotos[0],
            metaJson: {
              participants: allParticipants.map(p => ({
                id: p.userId,
                firstName: p.user?.firstName,
              })),
              photos: allPhotos,
              location: { lat: quest.latitude, lng: quest.longitude },
            },
          });
        }

        // 참가자들에게 알림
        for (const p of allParticipants) {
          await storage.createNotification({
            userId: p.userId,
            type: 'serendipity',
            title: '🎉 퀘스트 완료!',
            message: `${quest.title} 미션을 성공적으로 완료했습니다!`,
          });
        }
      }

      res.json({ 
        message: allCompleted ? 'Quest completed! Highlight created.' : 'Your result submitted',
        completed: allCompleted,
        participant 
      });
    } catch (error) {
      console.error('Error completing quest:', error);
      res.status(500).json({ message: 'Failed to complete quest' });
    }
  });

  // 내 퀘스트 목록
  app.get('/api/serendipity/quests', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const quests = await storage.getQuestsByUser(req.user.id);
      res.json({ quests });
    } catch (error) {
      console.error('Error fetching quests:', error);
      res.status(500).json({ message: 'Failed to fetch quests' });
    }
  });

  // 퀘스트 상세
  app.get('/api/serendipity/quest/:questId', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const questId = parseInt(req.params.questId);
      if (isNaN(questId)) {
        return res.status(400).json({ message: 'Invalid quest ID' });
      }

      const quest = await storage.getQuestById(questId);
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }

      const participants = await storage.getQuestParticipants(questId);
      const highlights = await storage.getQuestHighlights(questId);

      res.json({ quest, participants, highlights });
    } catch (error) {
      console.error('Error fetching quest:', error);
      res.status(500).json({ message: 'Failed to fetch quest' });
    }
  });

  // 퀘스트 하이라이트 조회
  app.get('/api/serendipity/highlights', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const quests = await storage.getQuestsByUser(req.user.id);
      const highlights: any[] = [];

      for (const quest of quests) {
        if (quest.status === 'completed') {
          const questHighlights = await storage.getQuestHighlights(quest.id);
          highlights.push(...questHighlights.map(h => ({
            ...h,
            quest: { id: quest.id, title: quest.title },
          })));
        }
      }

      res.json({ highlights });
    } catch (error) {
      console.error('Error fetching highlights:', error);
      res.status(500).json({ message: 'Failed to fetch highlights' });
    }
  });

}
