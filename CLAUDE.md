# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 작업 기록

### Paddle 결제 연동 (2026-06-12)

**환경변수 구조 (sandbox/live 분리)**
```
PAYMENT_PROVIDER=paddle          # paddle 또는 portone
PADDLE_ENVIRONMENT=sandbox       # sandbox 또는 production
VITE_PADDLE_ENVIRONMENT=sandbox  # 클라이언트(Vite)용 별도 필요

PADDLE_SANDBOX_API_KEY
PADDLE_SANDBOX_CLIENT_TOKEN
PADDLE_SANDBOX_WEBHOOK_SECRET

PADDLE_LIVE_API_KEY
PADDLE_LIVE_CLIENT_TOKEN
PADDLE_LIVE_WEBHOOK_SECRET
```

**주의: 이중 라우트 함정**
- `server/routes/billing.ts` (billingRouter) — 현재 `mountRouters()`가 호출되지 않아 **미사용**
- `server/routes/billing.legacy.ts` — `registerLegacyBillingRoutes()`로 실제 동작 중
- 결제 관련 수정은 **반드시 billing.legacy.ts도 함께** 수정해야 함

**테스트 계정**
- email: test@paddle.com / password: TestPass123!
