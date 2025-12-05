/**
 * ============================================
 * 빌링 라우터 (Billing Router)
 * ============================================
 * 
 * 이 모듈은 결제, 구독, Trip Pass 관련 API를 관리합니다.
 * 
 * 주요 기능:
 * - 요금제(Plans) 조회
 * - 구독(Subscription) 관리
 * - Trip Pass 구매 및 조회
 * - AI 사용량 조회
 * - 결제 처리 (PortOne 연동)
 * - 빌링 키 관리 (정기 결제용)
 * - 결제 내역 조회
 * 
 * 비즈니스 규칙:
 * - Free 플랜은 기본 제공 (무료)
 * - 구독은 월간/연간 단위로 관리
 * - Trip Pass는 7일간 유효
 * - AI 사용량은 플랜에 따라 제한됨
 * 
 * 결제 연동:
 * - PortOne (구 아임포트) API 사용
 * - 환경 변수: PORTONE_API_SECRET, PORTONE_STORE_ID, PORTONE_CHANNEL_KEY
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import {
  authenticateHybrid,
  AuthRequest,
} from '../auth';
import { requirePaymentEnv } from '../middleware/envCheck';

// ============================================
// 라우터 초기화
// ============================================
const router = Router();

// ============================================
// 요금제 목록 조회
// ============================================
// GET /api/billing/plans
// 사용 가능한 모든 요금제를 조회합니다.
// 인증 없이 접근 가능 (공개 API)
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await storage.getBillingPlans();
    res.json({ plans });
  } catch (error) {
    console.error('요금제 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch billing plans' });
  }
});

// ============================================
// 요금제 상세 조회
// ============================================
// GET /api/billing/plans/:id
// 특정 요금제의 상세 정보를 조회합니다.
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const planId = req.params.id;
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }
    
    // getBillingPlanById 메서드 사용
    const plan = await storage.getBillingPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json(plan);
  } catch (error) {
    console.error('요금제 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch billing plan' });
  }
});

// ============================================
// 구독 정보 조회
// ============================================
// GET /api/billing/subscription
// 현재 사용자의 활성 구독 정보를 조회합니다.
router.get('/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
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
    console.error('구독 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ============================================
// 구독 생성/변경
// ============================================
// POST /api/billing/subscription
// 새 구독을 생성하거나 기존 구독을 변경합니다.
router.post('/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { planId, paymentId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // 요금제 확인 (getBillingPlanById 사용)
    const plan = await storage.getBillingPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // 구독 생성 (createUserSubscription 사용)
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후
    const subscription = await storage.createUserSubscription({
      userId: req.user.id,
      planId,
      target: 'host', // host subscription
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      renewsAt: periodEnd,
    });

    res.status(201).json({ subscription });
  } catch (error) {
    console.error('구독 생성 오류:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ============================================
// 구독 취소
// ============================================
// DELETE /api/billing/subscription
// 현재 구독을 취소합니다.
// 결제 기간 종료 시점까지는 서비스 이용 가능
router.delete('/subscription', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 먼저 현재 구독을 조회
    const subscription = await storage.getUserSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription to cancel' });
    }
    
    // cancelUserSubscription 메서드 사용 (id 기반)
    const result = await storage.cancelUserSubscription(subscription.id);
    res.json({ message: 'Subscription cancelled', subscription: result });
  } catch (error) {
    console.error('구독 취소 오류:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ============================================
// AI 사용량 조회
// ============================================
// GET /api/billing/usage
// 현재 사용자의 AI 기능 사용량을 조회합니다.
// AI 메시지, 번역, 컨시어지 등의 사용량 포함
router.get('/usage', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { getUserAiUsageStats } = await import('../middleware/checkAiUsage');
    const usage = await getUserAiUsageStats(req.user.id);
    res.json(usage);
  } catch (error) {
    console.error('사용량 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// ============================================
// Trip Pass 정보 조회
// ============================================
// GET /api/billing/trip-pass
// 현재 사용자의 활성 Trip Pass를 조회합니다.
// Trip Pass: 7일간 AI 기능 무제한 사용 가능한 일회성 패스
router.get('/trip-pass', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tripPass = await storage.getActiveTripPass(req.user.id);
    
    if (!tripPass) {
      return res.json({ tripPass: null, message: 'No active Trip Pass', usage: { ai_message: 0, translation: 0, concierge: 0 } });
    }

    res.json({ tripPass });
  } catch (error) {
    console.error('Trip Pass 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch Trip Pass' });
  }
});

// ============================================
// Trip Pass 구매
// ============================================
// POST /api/billing/trip-pass/purchase
// Trip Pass를 구매합니다.
// 결제 완료 후 즉시 활성화됩니다.
router.post('/trip-pass/purchase', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { paymentId, tripPassType } = req.body;

    // Trip Pass 유형 확인 (7일, 14일 등)
    const tripPassDays = tripPassType === 'extended' ? 14 : 7;
    const now = new Date();
    const validUntil = new Date(now.getTime() + tripPassDays * 24 * 60 * 60 * 1000);

    // createUserTripPass 메서드 사용
    const tripPass = await storage.createUserTripPass({
      userId: req.user.id,
      planId: 'trip_pass_7d', // Default plan ID
      validFrom: now,
      validUntil,
      aiMessageLimit: 100,
      translationLimit: 100,
      conciergeCallsLimit: 10,
    });

    res.status(201).json({ tripPass });
  } catch (error) {
    console.error('Trip Pass 구매 오류:', error);
    res.status(500).json({ error: 'Failed to purchase Trip Pass' });
  }
});

// ============================================
// Trip Pass 이력 조회
// ============================================
// GET /api/billing/trip-pass/history
// Trip Pass 구매 이력을 조회합니다.
router.get('/trip-pass/history', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // getUserTripPasses 메서드 사용
    const history = await storage.getUserTripPasses(req.user.id);
    res.json({ history });
  } catch (error) {
    console.error('Trip Pass 이력 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch Trip Pass history' });
  }
});

// ============================================
// 빌링 설정 조회
// ============================================
// GET /api/billing/config
// 결제 관련 설정을 조회합니다.
// 프론트엔드에서 PortOne SDK 초기화에 사용
router.get('/config', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      storeId: process.env.PORTONE_STORE_ID || 'store_test',
      channelKey: process.env.PORTONE_CHANNEL_KEY || 'channel_test',
    });
  } catch (error) {
    console.error('빌링 설정 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch billing config' });
  }
});

// ============================================
// 결제 준비
// ============================================
// POST /api/billing/prepare-payment
// 결제를 준비하고 결제 정보를 반환합니다.
router.post('/prepare-payment', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { amount, productName, productType } = req.body;

    // 결제 ID 생성
    const paymentId = `pay_${Date.now()}_${req.user.id}`;

    res.json({
      paymentId,
      amount,
      productName,
      productType,
    });
  } catch (error) {
    console.error('결제 준비 오류:', error);
    res.status(500).json({ error: 'Failed to prepare payment' });
  }
});

// ============================================
// 결제 확인
// ============================================
// POST /api/billing/confirm-payment
// 프론트엔드에서 결제 완료 후 서버에서 검증합니다.
router.post('/confirm-payment', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { paymentId, impUid } = req.body;

    // PortOne API로 결제 검증
    // TODO: 실제 PortOne API 호출 구현
    
    res.json({ success: true, paymentId, verified: true });
  } catch (error) {
    console.error('결제 확인 오류:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// ============================================
// 빌링 키 목록 조회
// ============================================
// GET /api/billing/billing-keys
// 저장된 빌링 키(정기 결제용 카드 정보)를 조회합니다.
router.get('/billing-keys', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // getBillingKeysByUserId 메서드 사용
    const billingKeys = await storage.getBillingKeysByUserId(userId);
    res.json(billingKeys);
  } catch (error) {
    console.error('빌링 키 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch billing keys' });
  }
});

// ============================================
// 빌링 키 등록
// ============================================
// POST /api/billing/billing-key
// 새 빌링 키를 등록합니다.
router.post('/billing-key', authenticateHybrid, requirePaymentEnv, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { billingKey, cardName, cardNumber, cardType } = req.body;

    const result = await storage.createBillingKey({
      userId,
      billingKey,
      cardName: cardName || null,
      cardNumber: cardNumber || null,
      cardType: cardType || null,
      isDefault: true,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('빌링 키 등록 오류:', error);
    res.status(500).json({ error: 'Failed to create billing key' });
  }
});

// ============================================
// 빌링 키 삭제
// ============================================
// DELETE /api/billing/billing-keys/:id
// 빌링 키를 삭제합니다.
router.delete('/billing-keys/:id', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const idParam = req.params.id;
    if (!idParam) {
      return res.status(400).json({ error: 'Billing key ID is required' });
    }

    const billingKeyId = parseInt(idParam);
    if (isNaN(billingKeyId)) {
      return res.status(400).json({ error: 'Invalid billing key ID' });
    }

    await storage.deleteBillingKey(billingKeyId, userId);
    res.json({ message: 'Billing key deleted' });
  } catch (error) {
    console.error('빌링 키 삭제 오류:', error);
    res.status(500).json({ error: 'Failed to delete billing key' });
  }
});

// ============================================
// 기본 빌링 키 설정
// ============================================
// PUT /api/billing/billing-keys/:id/default
// 특정 빌링 키를 기본 결제 수단으로 설정합니다.
router.put('/billing-keys/:id/default', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const idParam = req.params.id;
    if (!idParam) {
      return res.status(400).json({ error: 'Billing key ID is required' });
    }

    const billingKeyId = parseInt(idParam);
    if (isNaN(billingKeyId)) {
      return res.status(400).json({ error: 'Invalid billing key ID' });
    }

    await storage.setDefaultBillingKey(billingKeyId, userId);
    res.json({ message: 'Default billing key updated' });
  } catch (error) {
    console.error('기본 빌링 키 설정 오류:', error);
    res.status(500).json({ error: 'Failed to set default billing key' });
  }
});

// ============================================
// Trip Pass 목록 조회
// ============================================
// GET /api/billing/trip-passes
// 모든 Trip Pass를 조회합니다.
router.get('/trip-passes', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tripPasses = await storage.getUserTripPasses(req.user.id);
    res.json(tripPasses);
  } catch (error) {
    console.error('Trip Pass 목록 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch trip passes' });
  }
});

// ============================================
// 결제 내역 조회
// ============================================
// GET /api/billing/history
// 결제 내역을 조회합니다.
router.get('/history', authenticateHybrid, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const transactions = await storage.getPaymentTransactions(req.user.id);
    const history = transactions.map(tx => ({
      id: tx.id,
      type: tx.paymentType,
      amount: parseFloat(tx.amount),
      status: tx.status,
      createdAt: tx.createdAt,
      description: `${tx.paymentType} 결제`,
    }));

    res.json(history);
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ============================================
// PortOne 통합 테스트 (개발 전용)
// ============================================
// POST /api/billing/test-payment
// PortOne API 연동을 테스트합니다 (KG이니시스, 카카오페이, 페이팔).
router.post('/test-payment', async (req: Request, res: Response) => {
  try {
    const { portoneClient } = await import('../services/portoneClient');
    
    console.log('\n===== PortOne 통합 테스트 시작 =====\n');
    
    // Step 1: 환경 변수 확인
    const envCheck = {
      PORTONE_API_SECRET: !!process.env.PORTONE_API_SECRET,
      PORTONE_STORE_ID: !!process.env.PORTONE_STORE_ID,
      PORTONE_CHANNEL_KEY: !!process.env.PORTONE_CHANNEL_KEY, // KG이니시스
      PORTONE_KAKAOPAY_CHANNEL_KEY: !!process.env.PORTONE_KAKAOPAY_CHANNEL_KEY,
      PORTONE_PAYPAL_CHANNEL_KEY: !!process.env.PORTONE_PAYPAL_CHANNEL_KEY,
    };

    console.log('[Test] 환경 변수 확인:', envCheck);

    // 채널 키 상세 정보 (앞부분만 표시)
    const channelInfo = {
      kgInicis: process.env.PORTONE_CHANNEL_KEY?.substring(0, 30) + '...',
      kakaoPay: process.env.PORTONE_KAKAOPAY_CHANNEL_KEY?.substring(0, 30) + '...',
      paypal: process.env.PORTONE_PAYPAL_CHANNEL_KEY?.substring(0, 30) + '...',
    };
    console.log('[Test] 채널 키 (앞부분):', channelInfo);

    // Step 2: PortOne 초기화
    const isConfigured = portoneClient.isConfigured();
    console.log('[Test] PortOne 초기화 상태:', isConfigured);

    if (!isConfigured) {
      return res.status(500).json({
        success: false,
        error: 'PortOne이 설정되지 않았습니다',
        envCheck,
      });
    }

    // Step 3: 공개 설정 조회
    const publicConfig = portoneClient.getPublicConfig();
    console.log('[Test] 공개 설정:', publicConfig);

    // Step 4: 테스트 결제 ID 생성
    const testPaymentId = `test_payment_${Date.now()}`;
    console.log('[Test] 테스트 결제 ID 생성:', testPaymentId);

    // Step 5: 결제 조회 API 테스트 (존재하지 않는 결제 ID로 API 연결 확인)
    console.log('[Test] 결제 조회 API 테스트 시작...');
    const getResult = await portoneClient.getPayment(testPaymentId);
    console.log('[Test] 결제 조회 결과:', getResult);

    // Step 6: 결제 취소 API 테스트 (존재하지 않는 결제 ID로 API 연결 확인)
    console.log('[Test] 결제 취소 API 테스트 시작...');
    const cancelResult = await portoneClient.cancelPayment(
      testPaymentId,
      'Test cancellation',
      1000
    );
    console.log('[Test] 결제 취소 결과:', cancelResult);

    console.log('\n===== PortOne 통합 테스트 완료 =====\n');

    // 테스트 결과 반환
    res.json({
      success: true,
      message: 'PortOne API 테스트 완료 (KG이니시스, 카카오페이, 페이팔)',
      timestamp: new Date().toISOString(),
      config: {
        envCheck,
        channelInfo,
        isConfigured,
        storeId: process.env.PORTONE_STORE_ID?.substring(0, 20) + '...',
        publicConfig,
      },
      apiTests: {
        testPaymentId,
        getPayment: {
          tested: true,
          success: getResult.success,
          error: getResult.error,
          errorCode: getResult.errorCode,
          note: '존재하지 않는 결제 ID로 API 연결 테스트. 404 에러는 정상입니다.',
        },
        cancelPayment: {
          tested: true,
          success: cancelResult.success,
          error: cancelResult.error,
          note: '존재하지 않는 결제 ID로 API 연결 테스트. 404 에러는 정상입니다.',
        },
      },
      channelStatus: {
        kgInicis: {
          configured: envCheck.PORTONE_CHANNEL_KEY,
          key: channelInfo.kgInicis,
          note: 'KG이니시스 (이니시스 테스트 키)',
        },
        kakaoPay: {
          configured: envCheck.PORTONE_KAKAOPAY_CHANNEL_KEY,
          key: channelInfo.kakaoPay,
          note: '카카오페이 (실제 키)',
        },
        paypal: {
          configured: envCheck.PORTONE_PAYPAL_CHANNEL_KEY,
          key: channelInfo.paypal,
          note: '페이팔 (실제 키)',
        },
      },
    });
  } catch (error: any) {
    console.error('[Test] PortOne 테스트 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Test failed',
      stack: error.stack,
    });
  }
});

export const billingRouter = router;
