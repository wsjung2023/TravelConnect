# API Route Inventory (Phase 2 / T14)

## Active modular routes (default target)
- Primary modular mount: `server/routes/index.ts`
- Feature routers:
  - `authRouter` (`/api/auth/*`)
  - `adminRouter` (`/api/admin/*`)
  - `billingRouter` (`/api/billing/*`)
  - `contractsRouter` (`/api/contracts/*`)
  - `notificationRouter` (`/api/notifications/*`)
  - `timelineRouter` (`/api/timelines/*`)
  - `tripsRouter` (`/api/trips/*`)
  - `aiRouter` (`/api/mini-concierge/*`, `/api/cinemap/*`)
  - `socialRouter` (`/api/posts/*`, `/api/users/*`, `/api/feed`)
  - `profileRouter` (`/api/profile/*`, `/api/portfolio/*`)
  - `chatRouter` (`/api/conversations/*`, `/api/channels/*`, `/api/messages/*`)
  - `experienceRouter` (`/api/experiences/*`, `/api/guide/*`, `/api/host/*`)

## Legacy giant entrypoint status
- `server/routes.ts` remains a compatibility entrypoint, but legacy registration orchestration was extracted to `server/routes/legacyRegistrations.ts`.
- 신규 엔드포인트는 **반드시** `server/routes/*.ts` 모듈에 추가한다.
- `server/routes.ts`의 legacy 등록 섹션은 T14 기준으로 "점진 축소 대상"으로 유지한다.

## Duplicate-risk endpoint areas (watchlist)
1. Billing/Payment
   - Modular: `server/routes/billing.ts`
   - Legacy: `server/routes/billing.legacy.ts`
2. Notification
   - Modular: `server/routes/notification.ts`
   - Legacy: `server/routes/notifications.legacy.ts`
3. Chat/Channel
   - Modular: `server/routes/chat.ts`
   - Legacy: `server/routes/channel.legacy.ts`
4. AI / CineMap / Mini Concierge
   - Modular: `server/routes/ai.ts`
   - Legacy: `server/routes/ai-features.legacy.ts`
5. Contracts / Settlement / Dispute
   - Modular: `server/routes/contracts.ts`
   - Legacy: `server/routes/contract.legacy.ts`, `server/routes/webhook-settlement.legacy.ts`, `server/routes/dispute.legacy.ts`

## T14 step-down policy
1. Preserve existing API contracts (no abrupt deletion).
2. New/changed business logic goes to modular routers only.
3. If legacy and modular overlap, annotate in this inventory first.
4. Reduce `server/routes.ts` to a thin entrypoint incrementally by removing legacy registrations after parity checks.
