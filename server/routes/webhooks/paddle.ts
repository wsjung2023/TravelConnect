// server/routes/webhooks/paddle.ts
import { Router, Request, Response } from 'express';
import { getPaymentService } from '../../services/payment/PaymentService';
import { storage } from '../../storage';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody as string | undefined;
  if (!rawBody) {
    return res.status(400).json({ error: 'Missing raw body' });
  }

  const payment = getPaymentService();
  const valid = payment.verifyWebhook(rawBody, req.headers as Record<string, string>);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = payment.parseWebhookEvent(rawBody);
  } catch {
    return res.status(400).json({ error: 'Failed to parse webhook event' });
  }

  try {
    switch (event.type) {
      case 'subscription.created': {
        const meta = event.metadata || {};
        if (meta.userId) {
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await storage.createUserSubscription({
            userId: meta.userId,
            planId: meta.planId || 'premium',
            target: 'host',
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            renewsAt: periodEnd,
          });
        }
        break;
      }

      case 'subscription.canceled': {
        const meta = event.metadata || {};
        if (meta.userId) {
          const sub = await storage.getUserSubscription(meta.userId);
          if (sub) await storage.cancelUserSubscription(sub.id);
        }
        break;
      }

      case 'subscription.payment.succeeded': {
        console.log('[PaddleWebhook] subscription.payment.succeeded', event.subscriptionId);
        break;
      }

      case 'payment.completed': {
        console.log('[PaddleWebhook] payment.completed', event.transactionId);
        break;
      }

      default:
        console.log('[PaddleWebhook] unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[PaddleWebhook] handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
