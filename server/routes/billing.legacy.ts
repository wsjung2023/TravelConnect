// 결제·구독 라우터 — Billing Plans 시딩, 구독 조회/생성/해지, AI 사용량 조회, Trip Pass(AI 크레딧) 잔액·구매·내역, 스케줄러 관리(관리자) 엔드포인트를 담당한다.
import type { Express } from 'express';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyBillingRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any; requirePaymentEnv: any; requireAdmin: any; checkAiUsage: any }
) {
  const { storage, authenticateToken, authenticateHybrid, requirePaymentEnv, requireAdmin, checkAiUsage } = deps;

  // Billing Plans API (Phase 1)
  // ==========================================

  // 빌링 플랜 목록 조회
  app.get('/api/billing/plans', async (req: Request, res: Response) => {
    try {
      const target = req.query.target as 'traveler' | 'host' | undefined;
      const type = req.query.type as 'subscription' | 'one_time' | undefined;
      const lang = (req.query.lang as string) || 'en';
      
      const plans = await storage.getBillingPlans(target, type);
      
      const localizedPlans = plans.map(plan => ({
        ...plan,
        name: (plan as Record<string, unknown>)[`name${lang.charAt(0).toUpperCase()}${lang.slice(1)}` as keyof typeof plan] || plan.name,
        description: (plan as Record<string, unknown>)[`description${lang.charAt(0).toUpperCase()}${lang.slice(1)}` as keyof typeof plan] || plan.description,
      }));
      
      res.json({ plans: localizedPlans });
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      res.status(500).json({ message: 'Failed to fetch billing plans' });
    }
  });

  // 특정 빌링 플랜 조회
  app.get('/api/billing/plans/:id', async (req: Request, res: Response) => {
    try {
      const plan = await storage.getBillingPlanById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      res.json({ plan });
    } catch (error) {
      console.error('Error fetching billing plan:', error);
      res.status(500).json({ message: 'Failed to fetch billing plan' });
    }
  });

  // 빌링 플랜 시드 데이터 생성 (관리자 전용)
  app.post('/api/billing/seed', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { seedBillingPlans } = await import('../services/billingService');
      const result = await seedBillingPlans();
      res.json({ 
        message: 'Billing plans seeded successfully',
        ...result
      });
    } catch (error) {
      console.error('Error seeding billing plans:', error);
      res.status(500).json({ message: 'Failed to seed billing plans' });
    }
  });

  // ============================================
  // 구독 관련 API
  // ============================================
  
  // 사용자 구독 상태 조회
  app.get('/api/billing/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const subscription = await storage.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.json({ subscription: null, message: 'No active subscription' });
      }
      
      res.json({ subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ message: 'Failed to fetch subscription' });
    }
  });

  // 구독 신청 (빌링키는 프론트엔드 SDK에서 발급)
  app.post('/api/billing/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { planId, billingKeyId } = req.body;
      if (!planId || !billingKeyId) {
        return res.status(400).json({ message: 'Plan ID and billing key are required' });
      }
      
      const plan = await storage.getBillingPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      
      if (plan.type !== 'subscription') {
        return res.status(400).json({ message: 'This plan is not a subscription' });
      }
      
      const { portoneClient } = await import('../services/portoneClient');
      const billingResult = await portoneClient.getBillingKey(billingKeyId);
      
      if (!billingResult.success) {
        return res.status(400).json({ 
          message: 'Invalid billing key',
          error: billingResult.error 
        });
      }
      
      const priceMonthlyUsd = parseFloat(plan.priceMonthlyUsd || '0');
      if (priceMonthlyUsd > 0) {
        const paymentId = `sub_${req.user.id}_${Date.now()}`;
        const paymentResult = await portoneClient.createPaymentWithBillingKey({
          paymentId,
          billingKey: billingKeyId,
          orderName: plan.name,
          amount: Math.round(priceMonthlyUsd * 100), // USD cents
          currency: 'USD',
          customer: { id: req.user.id },
        });
        
        if (!paymentResult.success) {
          return res.status(400).json({ 
            message: 'Initial payment failed',
            error: paymentResult.error 
          });
        }
      }
      
      const subscription = await storage.createUserSubscription({
        userId: req.user.id,
        planId: plan.id,
        target: plan.target,
        billingKeyId,
        status: 'active',
        startedAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      
      res.json({ 
        success: true,
        subscription,
        message: 'Subscription created successfully'
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ message: 'Failed to create subscription' });
    }
  });

  // 구독 취소
  app.delete('/api/billing/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const subscription = await storage.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.status(404).json({ message: 'No active subscription found' });
      }
      
      await storage.cancelUserSubscription(subscription.id);
      
      res.json({ 
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  });

  // AI 사용량 조회 (Trip Pass 또는 Free tier)
  app.get('/api/billing/usage', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const usageStats = await getUserAiUsageStats(req.user.id);
      res.json(usageStats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({ message: 'Failed to fetch usage stats' });
    }
  });

  // ============================================
  // 배치 스케줄러 관리 API (관리자 전용)
  // ============================================

  app.get('/api/admin/schedulers', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getSchedulerHandles } = await import('./index');
      const { getConfigsByCategory } = await import('../services/configService');
      const handles = getSchedulerHandles();
      const dbConfigs = await getConfigsByCategory('scheduler');

      res.json({
        schedulers: handles.map((h: any) => ({
          ...h,
          dbEnabled: dbConfigs[`${h.key}_enabled`] ?? false,
          dbIntervalMinutes: dbConfigs[`${h.key}_interval_minutes`] ?? h.intervalMinutes,
        })),
      });
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
      res.status(500).json({ message: 'Failed to fetch scheduler status' });
    }
  });

  // ============================================
  // 구독 스케줄러 API (관리자 전용)
  // ============================================
  
  // 스케줄러 수동 실행 (테스트/관리자용)
  app.post('/api/admin/scheduler/run', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // 관리자 권한 확인
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      // 동적 import로 순환 참조 방지
      const { subscriptionScheduler } = await import('../services/subscriptionScheduler');
      const stats = await subscriptionScheduler.runDailyScheduler();
      
      res.json({
        success: true,
        message: '스케줄러 실행 완료',
        stats
      });
    } catch (error) {
      console.error('Error running scheduler:', error);
      res.status(500).json({ message: 'Failed to run scheduler' });
    }
  });

  // 단일 구독 수동 갱신 (테스트/관리자용)
  app.post('/api/admin/subscription/:id/renew', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // 관리자 권한 확인
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const subscriptionId = parseInt(req.params.id);
      if (isNaN(subscriptionId)) {
        return res.status(400).json({ message: 'Invalid subscription ID' });
      }
      
      const { subscriptionScheduler } = await import('../services/subscriptionScheduler');
      const result = await subscriptionScheduler.manualRenew(subscriptionId);
      
      res.json({
        success: result.success,
        result
      });
    } catch (error) {
      console.error('Error renewing subscription:', error);
      res.status(500).json({ message: 'Failed to renew subscription' });
    }
  });

  // 만료 예정 알림 발송 (테스트/관리자용)
  app.post('/api/admin/scheduler/send-reminders', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // 관리자 권한 확인
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { subscriptionScheduler } = await import('../services/subscriptionScheduler');
      const sentCount = await subscriptionScheduler.sendExpirationReminders();
      
      res.json({
        success: true,
        message: `만료 예정 알림 ${sentCount}개 발송 완료`,
        sentCount
      });
    } catch (error) {
      console.error('Error sending reminders:', error);
      res.status(500).json({ message: 'Failed to send reminders' });
    }
  });

  // 관리자 환경 변수 상태 조회
  app.get('/api/admin/env-status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const status = getEnvStatus();
      res.json({
        success: true,
        environment: process.env.NODE_ENV || 'development',
        status
      });
    } catch (error) {
      console.error('Error fetching env status:', error);
      res.status(500).json({ message: 'Failed to fetch environment status' });
    }
  });

  // ============================================
  // Trip Pass (AI 크레딧) 관련 API
  // ============================================
  
  // Trip Pass 잔액 조회
  app.get('/api/billing/trip-pass', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const activeTripPass = await storage.getActiveTripPass(req.user.id);
      if (!activeTripPass) {
        return res.json({ 
          tripPass: null,
          message: 'No active Trip Pass',
          usage: { ai_message: 0, translation: 0, concierge: 0 }
        });
      }
      
      res.json({ 
        tripPass: activeTripPass,
        usage: {
          ai_message: activeTripPass.aiMessageUsed || 0,
          translation: activeTripPass.translationUsed || 0,
          concierge: activeTripPass.conciergeCallsUsed || 0,
        },
        limits: {
          ai_message: activeTripPass.aiMessageLimit,
          translation: activeTripPass.translationLimit,
          concierge: activeTripPass.conciergeCallsLimit,
        }
      });
    } catch (error) {
      console.error('Error fetching Trip Pass:', error);
      res.status(500).json({ message: 'Failed to fetch Trip Pass' });
    }
  });

  // Trip Pass 구매 (일회성 결제)
  app.post('/api/billing/trip-pass/purchase', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ message: 'Plan ID is required' });
      }
      
      const plan = await storage.getBillingPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
      
      if (plan.type !== 'one_time' || plan.target !== 'traveler') {
        return res.status(400).json({ message: 'This plan is not a valid Trip Pass' });
      }
      
      const features = plan.features as { 
        ai_limit?: number; 
        translation_limit?: number; 
        concierge_limit?: number;
        valid_days?: number;
      } | null;
      const validDays = features?.valid_days || 365;
      
      const tripPass = await storage.createUserTripPass({
        userId: req.user.id,
        planId: plan.id,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
        aiMessageLimit: features?.ai_limit || 0,
        translationLimit: features?.translation_limit || 0,
        conciergeCallsLimit: features?.concierge_limit || 0,
      });
      
      res.json({ 
        success: true,
        tripPass,
        message: 'Trip Pass purchased successfully'
      });
    } catch (error) {
      console.error('Error purchasing Trip Pass:', error);
      res.status(500).json({ message: 'Failed to purchase Trip Pass' });
    }
  });

  // Trip Pass 사용 내역
  app.get('/api/billing/trip-pass/history', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const tripPasses = await storage.getUserTripPasses(req.user.id);
      res.json({ tripPasses });
    } catch (error) {
      console.error('Error fetching Trip Pass history:', error);
      res.status(500).json({ message: 'Failed to fetch Trip Pass history' });
    }
  });

  // 결제 설정 정보 (프론트엔드용)
  app.get('/api/billing/config', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      res.json({
        storeId: process.env.PORTONE_STORE_ID || 'store_test',
        channelKey: process.env.PORTONE_CHANNEL_KEY || 'channel_test',
      });
    } catch (error) {
      console.error('Error fetching billing config:', error);
      res.status(500).json({ message: 'Failed to fetch billing config' });
    }
  });

  // 결제 준비 (paymentId 생성)
  app.post('/api/billing/prepare-payment', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { type, planId, tripPassId, contractId, stageId, amount, payMethod } = req.body;
      
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let channelKey = process.env.PORTONE_CHANNEL_KEY || 'channel_test';
      if (payMethod === 'KAKAO') {
        channelKey = process.env.PORTONE_KAKAOPAY_CHANNEL_KEY || channelKey;
      } else if (payMethod === 'PAYPAL') {
        channelKey = process.env.PORTONE_PAYPAL_CHANNEL_KEY || channelKey;
      }
      
      res.json({
        paymentId,
        storeId: process.env.PORTONE_STORE_ID || 'store_test',
        channelKey,
      });
    } catch (error) {
      console.error('Error preparing payment:', error);
      res.status(500).json({ message: 'Failed to prepare payment' });
    }
  });

  // 결제 확인 (PortOne 결제 완료 후)
  app.post('/api/billing/confirm-payment', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { paymentId, txId, type, contractId, stageId } = req.body;
      
      if (type === 'trip_pass') {
        res.json({ 
          success: true, 
          message: 'Trip Pass payment confirmed'
        });
      } else if (type === 'subscription') {
        res.json({ 
          success: true, 
          message: 'Subscription payment confirmed'
        });
      } else if (type === 'contract' && contractId && stageId) {
        const { escrowService } = await import('../services/escrowService');
        const result = await escrowService.handlePaymentComplete({
          contractId,
          stageId,
          portonePaymentId: paymentId,
          paidAmount: 0,
        });
        
        if (!result.success) {
          return res.status(400).json({ message: result.error });
        }
        
        res.json({ 
          success: true, 
          message: 'Contract payment confirmed'
        });
      } else {
        res.status(400).json({ message: 'Invalid payment type' });
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // 빌링키 목록 조회 (Phase 8 - DB 연동)
  app.get('/api/billing/billing-keys', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const billingKeyList = await storage.getBillingKeysByUserId(req.user.id);
      
      // 빌링키를 마스킹해서 반환 (보안)
      const maskedList = billingKeyList.map(key => ({
        ...key,
        billingKey: key.billingKey ? `${key.billingKey.slice(0, 8)}...${key.billingKey.slice(-4)}` : null,
      }));
      
      res.json(maskedList);
    } catch (error) {
      console.error('Error fetching billing keys:', error);
      res.status(500).json({ message: 'Failed to fetch billing keys' });
    }
  });

  // 빌링키 등록 (Phase 8 - DB 연동)
  app.post('/api/billing/billing-key', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { billingKey, cardName, cardNumber, cardType } = req.body;
      
      if (!billingKey) {
        return res.status(400).json({ message: 'Billing key is required' });
      }
      
      // 카드번호는 마스킹된 형태만 허용 (예: ****-****-****-1234)
      // 전체 카드번호(16자리 숫자)가 전달된 경우 거부
      if (cardNumber && /^\d{13,19}$/.test(cardNumber.replace(/[-\s]/g, ''))) {
        return res.status(400).json({ 
          message: '전체 카드번호는 저장할 수 없습니다. 마스킹된 형태로 전달해주세요.' 
        });
      }
      
      const created = await storage.createBillingKey({
        userId: req.user.id,
        billingKey,
        cardName: cardName || null,
        cardNumber: cardNumber || null,
        cardType: cardType || null,
      });
      
      // 응답에서도 빌링키 마스킹
      const maskedResponse = {
        ...created,
        billingKey: created.billingKey ? `${created.billingKey.slice(0, 8)}...${created.billingKey.slice(-4)}` : null,
      };
      
      res.json({ 
        success: true,
        billingKey: maskedResponse,
        message: '결제 수단이 등록되었습니다'
      });
    } catch (error) {
      console.error('Error registering billing key:', error);
      res.status(500).json({ message: 'Failed to register billing key' });
    }
  });

  // 빌링키 삭제 (Phase 8 - DB 연동)
  app.delete('/api/billing/billing-keys/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid billing key ID' });
      }
      
      const deleted = await storage.deleteBillingKey(id, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Billing key not found or unauthorized' });
      }
      
      res.json({ 
        success: true,
        message: '결제 수단이 삭제되었습니다'
      });
    } catch (error) {
      console.error('Error deleting billing key:', error);
      res.status(500).json({ message: 'Failed to delete billing key' });
    }
  });

  // 기본 빌링키 설정 (Phase 8 - DB 연동)
  app.put('/api/billing/billing-keys/:id/default', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid billing key ID' });
      }
      
      const updated = await storage.setDefaultBillingKey(id, req.user.id);
      
      if (!updated) {
        return res.status(404).json({ message: 'Billing key not found or unauthorized' });
      }
      
      res.json({ 
        success: true,
        message: '기본 결제 수단이 변경되었습니다'
      });
    } catch (error) {
      console.error('Error setting default billing key:', error);
      res.status(500).json({ message: 'Failed to set default billing key' });
    }
  });

  // 사용자 Trip Pass 목록
  app.get('/api/billing/trip-passes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const tripPasses = await storage.getUserTripPasses(req.user.id);
      res.json(tripPasses || []);
    } catch (error) {
      console.error('Error fetching user trip passes:', error);
      res.status(500).json({ message: 'Failed to fetch trip passes' });
    }
  });

  // 결제 내역 조회 (Phase 7 스텁 - PaymentTransactions 테이블 사용)
  app.get('/api/billing/history', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const transactions = await storage.getPaymentTransactions(req.user.id);
      const history = transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        status: tx.status,
        createdAt: tx.createdAt,
        description: tx.description || `${tx.type} 결제`,
      }));
      res.json(history);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({ message: 'Failed to fetch payment history' });
    }
  });

}
