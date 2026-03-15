// @ts-nocheck
// 웹훅·정산 라우터 — PortOne V2 결제 완료/취소/빌링키 웹훅 처리, 관리자용 결제 내역 조회·환불, 호스트 정산 상태·실행·목록·재시도 엔드포인트를 담당한다.
import type { Express } from 'express';
import express, { type Request, type Response } from 'express';
import type { AuthRequest } from '../auth';

export function registerLegacyWebhookSettlementRoutes(
  app: Express,
  deps: { storage: any; authenticateToken: any; authenticateHybrid: any; requireAdmin: any; requirePaymentEnv: any }
) {
  const { storage, authenticateToken, authenticateHybrid, requireAdmin, requirePaymentEnv } = deps;

  // PortOne 웹훅 처리
  // ============================================
  
  // Webhook idempotency cache (10-minute TTL for replay protection)
  const processedWebhooks = new Map<string, number>();
  const WEBHOOK_TTL_MS = 10 * 60 * 1000; // 10 minutes
  
  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > WEBHOOK_TTL_MS) {
        processedWebhooks.delete(id);
      }
    }
  }, 60 * 1000); // Every minute

  // PortOne V2 웹훅 처리 (결제 완료, 취소, 빌링키 등)
  // Raw body capture middleware for proper HMAC verification
  app.post('/api/webhooks/portone', express.text({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
      const { portoneClient } = await import('../services/portoneClient');
      const { escrowService } = await import('../services/escrowService');
      
      const signature = req.headers['x-portone-signature'] as string;
      const webhookId = req.headers['x-portone-webhook-id'] as string;
      const timestamp = req.headers['x-portone-timestamp'] as string;
      
      if (!signature || !webhookId || !timestamp) {
        console.error('[Webhook] Missing required headers');
        return res.status(400).json({ message: 'Missing required webhook headers' });
      }
      
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      const verifyResult = portoneClient.verifyWebhookSignature(
        rawBody, 
        signature,
        webhookId,
        timestamp
      );
      
      if (!verifyResult.valid) {
        console.error(`[Webhook] Signature verification failed: ${verifyResult.error}`);
        return res.status(401).json({ message: verifyResult.error || 'Invalid webhook signature' });
      }
      
      if (processedWebhooks.has(webhookId)) {
        console.warn(`[Webhook] Duplicate webhook detected: ${webhookId}`);
        return res.status(200).json({ received: true, duplicate: true });
      }
      
      processedWebhooks.set(webhookId, Date.now());
      
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      const { type, data } = body;
      console.log(`[Webhook] Received event: ${type}`);
      
      // 웹훅 이벤트 로그 기록 (공통)
      const logWebhookEvent = async (
        paymentId: string, 
        eventType: string, 
        eventData: any, 
        amount?: number, 
        status?: string,
        errorMessage?: string,
        userId?: string
      ) => {
        try {
          await storage.createPaymentLog({
            paymentId,
            userId: userId || null,
            eventType,
            eventData: JSON.stringify(eventData),
            amount: amount || null,
            status: status || null,
            errorMessage: errorMessage || null,
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || null,
            userAgent: req.headers['user-agent'] || null,
          });
        } catch (logError) {
          console.error('[Webhook] Failed to save payment log:', logError);
        }
      };
      
      switch (type) {
        case 'Transaction.Paid': {
          const { paymentId, amount, customData } = data;
          console.log(`[Webhook] Payment confirmed: ${paymentId}, Amount: ${amount?.total}`);
          
          // 결제 성공 로그 기록
          await logWebhookEvent(
            paymentId,
            'WEBHOOK_PAYMENT_PAID',
            data,
            amount?.total,
            'PAID',
            null,
            customData?.userId
          );
          
          if (customData?.contractId && customData?.stageId) {
            const result = await escrowService.handlePaymentComplete(
              customData.contractId,
              customData.stageId,
              paymentId,
              amount.total
            );
            if (!result.success) {
              console.error(`[Webhook] Failed to update contract: ${result.error}`);
            }
          }
          
          if (customData?.type === 'subscription' && customData?.userId) {
            const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            console.log(`[Webhook] Subscription payment for user ${customData.userId}, next billing: ${nextBillingDate}`);
          }
          break;
        }
        
        case 'Transaction.Cancelled': {
          const { paymentId, cancelledAmount, customData } = data;
          console.log(`[Webhook] Payment cancelled: ${paymentId}, Refunded: ${cancelledAmount?.total}`);
          
          // 결제 취소 로그 기록
          await logWebhookEvent(
            paymentId,
            'WEBHOOK_PAYMENT_CANCELLED',
            data,
            cancelledAmount?.total,
            'CANCELLED',
            null,
            customData?.userId
          );
          break;
        }
        
        case 'Transaction.Failed': {
          const { paymentId, failReason, customData } = data;
          console.error(`[Webhook] Payment failed: ${paymentId}, Reason: ${failReason}`);
          
          // 결제 실패 로그 기록
          await logWebhookEvent(
            paymentId,
            'WEBHOOK_PAYMENT_FAILED',
            data,
            null,
            'FAILED',
            failReason,
            customData?.userId
          );
          break;
        }
        
        case 'BillingKey.Issued': {
          const { billingKey, customerId } = data;
          console.log(`[Webhook] Billing key issued: ${billingKey?.substring(0, 20)}... for ${customerId}`);
          
          // 빌링키 발급 로그 기록
          await logWebhookEvent(
            `billing_${customerId}_${Date.now()}`,
            'WEBHOOK_BILLINGKEY_ISSUED',
            { billingKeyPrefix: billingKey?.substring(0, 8), customerId },
            null,
            'ISSUED',
            null,
            customerId
          );
          break;
        }
        
        case 'BillingKey.Deleted': {
          const { billingKey, customerId } = data;
          console.log(`[Webhook] Billing key deleted for customer: ${customerId}`);
          
          // 빌링키 삭제 로그 기록
          await logWebhookEvent(
            `billing_${customerId}_${Date.now()}`,
            'WEBHOOK_BILLINGKEY_DELETED',
            { customerId },
            null,
            'DELETED',
            null,
            customerId
          );
          break;
        }
        
        default:
          console.log(`[Webhook] Unhandled event type: ${type}`);
          
          // 미처리 이벤트도 로그 기록
          await logWebhookEvent(
            `unknown_${Date.now()}`,
            `WEBHOOK_${type}`,
            data,
            null,
            'RECEIVED',
            null,
            null
          );
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('[Webhook] Processing error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // ============================================
  // 결제 내역 조회 (관리자)
  // ============================================
  
  app.get('/api/admin/billing/transactions', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { userId, limit = 50 } = req.query;
      const transactions = await storage.getPaymentTransactions(
        userId as string || '',
        parseInt(limit as string)
      );
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // 환불 처리 (관리자)
  app.post('/api/admin/billing/refund', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { contractId, refundAmount, reason } = req.body;
      if (!contractId || !refundAmount || !reason) {
        return res.status(400).json({ message: 'Contract ID, refund amount, and reason are required' });
      }
      
      const { escrowService } = await import('../services/escrowService');
      const result = await escrowService.processRefund(contractId, refundAmount, reason);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        contractId: result.contractId,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  });

  // ============================================
  // 호스트 정산 API (Phase 12)
  // ============================================

  // 정산 스케줄러 상태 조회 (관리자)
  app.get('/api/admin/settlements/status', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { getSchedulerStatus } = await import('./jobs/settlementBatch');
      const { settlementService } = await import('../services/settlementService');
      
      const schedulerStatus = getSchedulerStatus();
      const stats = await settlementService.getSettlementStats();
      
      res.json({
        scheduler: schedulerStatus,
        stats,
      });
    } catch (error) {
      console.error('Error fetching settlement status:', error);
      res.status(500).json({ message: 'Failed to fetch settlement status' });
    }
  });

  // 수동 정산 실행 (관리자)
  app.post('/api/admin/settlements/run', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { runManualSettlement } = await import('./jobs/settlementBatch');
      const result = await runManualSettlement();
      
      res.json({
        success: result.success,
        summary: result,
      });
    } catch (error) {
      console.error('Error running manual settlement:', error);
      res.status(500).json({ message: 'Failed to run settlement' });
    }
  });

  // 최근 정산 목록 조회 (관리자)
  app.get('/api/admin/settlements', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { settlementService } = await import('../services/settlementService');
      const limit = parseInt(req.query.limit as string) || 50;
      const payouts = await settlementService.getRecentPayouts(limit);
      
      res.json({ payouts });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  // 실패한 정산 재시도 (관리자)
  app.post('/api/admin/settlements/:id/retry', authenticateHybrid, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const payoutId = parseInt(req.params.id);
      if (isNaN(payoutId)) {
        return res.status(400).json({ message: 'Invalid payout ID' });
      }
      
      const { settlementService } = await import('../services/settlementService');
      const result = await settlementService.retryFailedPayout(payoutId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({
        success: true,
        message: 'Payout retried successfully',
      });
    } catch (error) {
      console.error('Error retrying payout:', error);
      res.status(500).json({ message: 'Failed to retry payout' });
    }
  });

  // 호스트 정산 내역 조회 (호스트 본인)
  app.get('/api/host/payouts', authenticateHybrid, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { settlementService } = await import('../services/settlementService');
      const payouts = await settlementService.getHostPayouts(userId);
      
      res.json({ payouts });
    } catch (error) {
      console.error('Error fetching host payouts:', error);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

}
