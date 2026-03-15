import type { Express } from 'express';
import { registerLegacyNotificationRoutes } from './notifications.legacy';
import { registerLegacyFollowRoutes } from './follow.legacy';
import { registerLegacyTranslationRoutes } from './translation.legacy';
import { registerLegacySlotsBookingsRoutes } from './slots-bookings.legacy';
import { registerLegacyRequestsTemplatesRoutes } from './requests-templates.legacy';
import { registerLegacyShoppingRoutes } from './shopping.legacy';
import { registerLegacyHostReviewsRoutes } from './host-reviews.legacy';
import { registerLegacyChannelRoutes } from './channel.legacy';
import { registerLegacyTripLegalRoutes } from './trip-legal.legacy';
import { registerLegacyMiniMeetRoutes } from './minimeet.legacy';
import { registerLegacyAIFeaturesRoutes } from './ai-features.legacy';
import { registerLegacyPOISmartFeedRoutes } from './poi-smartfeed.legacy';
import { registerLegacyBillingRoutes } from './billing.legacy';
import { registerLegacyContractRoutes } from './contract.legacy';
import { registerLegacyWebhookSettlementRoutes } from './webhook-settlement.legacy';
import { registerLegacyDisputeRoutes } from './dispute.legacy';
import { registerLegacyAnalyticsSearchRoutes } from './analytics-search.legacy';
import { insertMiniMeetSchema, insertNotificationSchema } from '@shared/schema';
import {
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  CreateMiniMeetSchema,
  CreateSlotSchema,
  UpdateSlotSchema,
  SlotSearchSchema,
  BulkCreateSlotsSchema,
  UpdateSlotAvailabilitySchema,
  BookingSearchSchema,
  CheckSlotAvailabilitySchema,
} from '@shared/api/schema';

interface LegacyDeps {
  [key: string]: any;
}

export function registerLegacyModules(app: Express, deps: LegacyDeps) {
  const {
    storage,
    authenticateToken,
    authenticateHybrid,
    requireAdmin,
    apiLimiter,
    validateSchema,
    checkAiUsage,
    requireAiEnv,
    requirePaymentEnv,
  } = deps;

  const registerModules = [
    () => registerLegacyNotificationRoutes(app, { storage, authenticateToken, insertNotificationSchema }),
    () => registerLegacyFollowRoutes(app, { storage, authenticateToken }),
    () => registerLegacyMiniMeetRoutes(app, { storage, authenticateToken, apiLimiter, validateSchema, insertMiniMeetSchema, CreateMiniMeetSchema }),
    () => registerLegacyTripLegalRoutes(app, { storage, authenticateToken, apiLimiter, requireAdmin }),
    () => registerLegacyChannelRoutes(app, { storage, authenticateToken, authenticateHybrid }),
    () => registerLegacyHostReviewsRoutes(app, { storage, authenticateHybrid, requireAdmin }),
    () => registerLegacyShoppingRoutes(app, { storage, authenticateHybrid }),
    () => registerLegacyRequestsTemplatesRoutes(app, { storage, authenticateHybrid }),
    () => registerLegacySlotsBookingsRoutes(app, { storage, authenticateHybrid, validateSchema, CreateSlotSchema, SlotSearchSchema, UpdateSlotSchema, BulkCreateSlotsSchema, UpdateSlotAvailabilitySchema, CheckSlotAvailabilitySchema, CreateBookingSchema, BookingSearchSchema, UpdateBookingStatusSchema }),
    () => registerLegacyTranslationRoutes(app, { storage, authenticateHybrid, checkAiUsage }),
    () => registerLegacyAIFeaturesRoutes(app, { storage, authenticateToken, authenticateHybrid, checkAiUsage, requireAiEnv }),
    () => registerLegacyPOISmartFeedRoutes(app, { storage, authenticateToken, authenticateHybrid }),
    () => registerLegacyBillingRoutes(app, { storage, authenticateToken, authenticateHybrid, requirePaymentEnv, requireAdmin, checkAiUsage }),
    () => registerLegacyContractRoutes(app, { storage, authenticateToken, authenticateHybrid, requirePaymentEnv }),
    () => registerLegacyWebhookSettlementRoutes(app, { storage, authenticateToken, authenticateHybrid, requireAdmin, requirePaymentEnv }),
    () => registerLegacyDisputeRoutes(app, { storage, authenticateToken, authenticateHybrid, requireAdmin }),
    () => registerLegacyAnalyticsSearchRoutes(app, { storage, authenticateToken, authenticateHybrid, requireAdmin }),
  ];

  registerModules.forEach((register) => register());
}
