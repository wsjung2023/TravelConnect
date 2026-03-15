#!/usr/bin/env node
import fs from 'node:fs';

const requiredCoreFiles = [
  'server/index.ts',
  'server/db.ts',
  'server/auth.ts',
  'server/scheduler.ts',
  'server/routes.ts',
  'server/routes/index.ts',
];

const requiredModularRoutes = [
  'admin.ts',
  'ai.ts',
  'auth.ts',
  'billing.ts',
  'chat.ts',
  'contracts.ts',
  'experience.ts',
  'notification.ts',
  'profile.ts',
  'social.ts',
  'timeline.ts',
  'trips.ts',
  'legacyRegistrations.ts',
];

const requiredLegacyRoutes = [
  'ai-features.legacy.ts',
  'analytics-search.legacy.ts',
  'billing.legacy.ts',
  'channel.legacy.ts',
  'contract.legacy.ts',
  'dispute.legacy.ts',
  'follow.legacy.ts',
  'host-reviews.legacy.ts',
  'minimeet.legacy.ts',
  'notifications.legacy.ts',
  'poi-smartfeed.legacy.ts',
  'requests-templates.legacy.ts',
  'shopping.legacy.ts',
  'slots-bookings.legacy.ts',
  'translation.legacy.ts',
  'trip-legal.legacy.ts',
  'webhook-settlement.legacy.ts',
];

const requiredRepositories = [
  'userRepository.ts',
  'contentRepository.ts',
  'feedRepository.ts',
  'notificationRepository.ts',
  'bookingRepository.ts',
  'aiRepository.ts',
  'socialRepository.ts',
  'billingRepository.ts',
  'commerceRepository.ts',
  'chatRepository.ts',
  'adminRepository.ts',
];

const requiredServices = [
  'configService.ts',
  'cache.ts',
  'billingService.ts',
  'escrowService.ts',
  'disputeService.ts',
  'settlementService.ts',
  'splitPaymentService.ts',
  'feedScoringService.ts',
  'objectStorageService.ts',
  'portoneClient.ts',
  'analyticsETLService.ts',
];

const requiredMiddlewares = [
  'rateLimiter.ts',
  'checkAiUsage.ts',
  'validation.ts',
  'envCheck.ts',
];

const requiredAIEngines = [
  'cinemap.ts',
  'concierge.ts',
  'miniConcierge.ts',
];

const requiredReplitIntegrationFiles = [
  'server/replit_integrations/object_storage/objectStorage.ts',
];

function assertFilesExist(label, files, prefix = '') {
  const missing = files.filter((name) => !fs.existsSync(prefix ? `${prefix}/${name}` : name));
  if (missing.length > 0) {
    console.error(`❌ ${label} missing:\n- ${missing.join('\n- ')}`);
    return false;
  }
  console.log(`✅ ${label}: ${files.length} files present`);
  return true;
}

function assertTextContains(label, file, snippets) {
  const source = fs.readFileSync(file, 'utf8');
  const missing = snippets.filter((snippet) => !source.includes(snippet));
  if (missing.length > 0) {
    console.error(`❌ ${label} missing runtime hooks in ${file}:\n- ${missing.join('\n- ')}`);
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
}

function assertTextNotContains(label, file, snippets) {
  const source = fs.readFileSync(file, 'utf8');
  const present = snippets.filter((snippet) => source.includes(snippet));
  if (present.length > 0) {
    console.error(`❌ ${label} has forbidden patterns in ${file}:\n- ${present.join('\n- ')}`);
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
}

const checks = [
  assertFilesExist('Core backend entrypoints', requiredCoreFiles),
  assertFilesExist('Modular routes', requiredModularRoutes, 'server/routes'),
  assertFilesExist('Legacy routes', requiredLegacyRoutes, 'server/routes'),
  assertFilesExist('Repositories', requiredRepositories, 'server/repositories'),
  assertFilesExist('Services', requiredServices, 'server/services'),
  assertFilesExist('Middlewares', requiredMiddlewares, 'server/middleware'),
  assertFilesExist('AI engines', requiredAIEngines, 'server/ai'),
  assertFilesExist('Replit integration files', requiredReplitIntegrationFiles),
  assertTextContains('Startup wiring (translations/system config/scheduler/env validation)', 'server/index.ts', [
    'syncTranslations',
    'seedSystemConfig',
    'startBookingScheduler(storage)',
    'validateStartupEnv',
    'logEnvStatus',
    'STARTUP_SYNC_MODE',
    'shouldRunStartupSync()',
  ]),
  assertTextContains('Google OAuth optional dynamic loading', 'server/routes.ts', [
    "await import('./googleAuth')",
    'setupGoogleAuth(app)',
  ]),
  assertTextNotContains('No hard googleAuth static import', 'server/routes.ts', [
    "import { setupGoogleAuth } from './googleAuth';",
  ]),
  assertTextContains('Legacy route registration orchestration', 'server/routes.ts', [
    'registerLegacyModules(app, {',
  ]),
  assertTextContains('Legacy route registration module', 'server/routes/legacyRegistrations.ts', [
    'const registerModules = [',
    'registerModules.forEach((register) => register())',
  ]),
];

if (checks.some((v) => !v)) {
  process.exit(1);
}

console.log('✅ Backend structure and runtime contract verification passed');
