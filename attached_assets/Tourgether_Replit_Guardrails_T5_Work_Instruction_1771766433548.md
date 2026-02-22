# Tourgether — Replit 작업지시서 (Guardrails T5)
작업명: **T5 — Auth 라우트 모듈화(1차) + routes.ts 비만 제거 (안전 패치)**  
목적: `server/routes.ts`에 박혀있는 **/api/auth (register/login/demo-login)** 구현을 제거하고, 이미 존재하는 모듈 `server/routes/auth.ts`의 `authRouter`로 교체하여 **routes.ts 라인 수를 줄이고(Guardrails: 250~400 초과 시 분리)**, Replit이 “한 번에 크게 건드려서 망가뜨리는” 위험을 낮춘다.

---

## 0) 이번 티켓의 범위(중요)
### ✅ 이번에 “교체”하는 엔드포인트(3개)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/demo-login`

### ❌ 이번 티켓에서 건드리지 않는 것(다음 티켓)
- `GET /api/auth/me`
- `GET /api/auth/user`
- `POST /api/auth/generate-token`
- `POST /api/auth/onboarding`
- 기타 모든 API

---

## 1) Replit Agent에게 줄 “실행 지시문”(그대로 복붙)
아래 블록을 **Replit Agent(코드 어시스턴트)** 에 그대로 붙여넣고 실행.

```text
[SAFE PATCH MODE - T5 Auth Router Swap]

Goal:
- In server/routes.ts, replace inline /api/auth/register, /api/auth/login, /api/auth/demo-login with authRouter from server/routes/auth.ts.
- Keep all other routes unchanged.

Allowed files (ONLY):
- server/routes.ts

Forbidden:
- No other files touched.
- No refactors, no formatting, no reordering unrelated code.
- Do NOT change package.json, tsconfig, or dependencies.
- Keep patch small and localized.

Output:
- Provide a unified diff patch ONLY.

Stop rules:
- If you cannot find the exact blocks by the markers, STOP and ask me.

Verify:
- After patch, I will run npm run dev and test:
  POST /api/auth/demo-login -> returns token
  GET /api/auth/me with Bearer token -> returns user
```

---

## 2) 수동 적용(Agent 없이 직접 수정할 때) — 정확한 편집 지점
> **수정 파일:** `server/routes.ts` (이 파일만)

### Step A) import 추가
`server/routes.ts` 상단 import 구간에서, 이미 있는 아래 줄을 찾는다:

```ts
import { tripsRouter } from './routes/trips';
```

그 바로 아래에 **1줄 추가**:

```ts
import { authRouter } from './routes/auth';
```

---

### Step B) auth helper import 정리(ESLint no-unused-vars 방지)
`server/routes.ts` 상단에서 `from './auth'` import 블록을 찾는다(대략 이런 형태):

```ts
import {
  authenticateToken,
  authenticateHybrid,
  requireAdmin,
  generateToken,
  hashPassword,
  comparePassword,
  isValidEmail,
  isValidPassword,
  generateUserId,
  verifyToken,
  AuthRequest,
} from './auth';
```

여기서 아래 항목을 **삭제**해서, import가 이렇게 되게 만든다:

✅ 남겨야 하는 것(이번 티켓 기준)
- `authenticateToken`
- `authenticateHybrid`
- `requireAdmin`
- `generateToken`
- `verifyToken`
- `AuthRequest`

❌ 제거할 것(이번 티켓에서 더 이상 사용 안 함)
- `hashPassword`
- `comparePassword`
- `isValidEmail`
- `isValidPassword`
- `generateUserId`

---

### Step C) Login/Register 스키마 import 정리(ESLint no-unused-vars 방지)
`from '@shared/api/schema'` import 블록에서 아래 2개를 **삭제**:
- `LoginSchema`
- `RegisterSchema`

> `OnboardingSchema`는 이번 티켓에서 onboarding을 건드리지 않으므로 그대로 둔다.

---

### Step D) `authLimiter` 제거(더 이상 사용 안 하므로)
`server/routes.ts` 상단에 있는 아래 블록을 찾아 **통째로 삭제**:

- 시작 마커: `const authLimiter = rateLimit({`
- 끝 마커: `});`

> 주의: uploadLimiter / apiLimiter 등 다른 limiter는 삭제하면 안 됨.  
> **오직 authLimiter만 삭제**.

---

### Step E) authRouter 마운트 1줄 추가
`registerRoutes` 함수 내부에서 아래 줄을 찾는다:

```ts
setupGoogleAuth(app);
```

그 바로 아래에 아래 2줄을 추가:

```ts
  // Auth routes moved to server/routes/auth.ts
  app.use('/api/auth', authRouter);
```

---

### Step F) inline auth 라우트 3개 삭제(핵심)
`server/routes.ts`에서 아래 3개 블록을 각각 찾아 **통째로 삭제**한다.

#### (1) register 블록 삭제
- 시작 마커: `// 이메일/비밀번호 회원가입`
- 끝 마커: 바로 다음의 `// 이메일/비밀번호 로그인` 직전까지

삭제 대상 안에는 반드시 아래 줄이 포함돼야 한다:
- `app.post('/api/auth/register'`

#### (2) login 블록 삭제
- 시작 마커: `// 이메일/비밀번호 로그인`
- 끝 마커: `// 데모 로그인 - TEST 계정으로 비밀번호 없이 로그인` 직전까지

삭제 대상 안에는 반드시 아래 줄이 포함돼야 한다:
- `app.post('/api/auth/login'`

#### (3) demo-login 블록 삭제
- 시작 마커: `app.post('/api/auth/demo-login'`
- 끝 마커: 바로 다음의 `// 프로필 만남 상태 업데이트` 직전까지

---

## 3) 적용 후 검증(반드시)
### A) 서버 실행
Replit Shell에서:

```bash
npm run dev
```

서버가 **기본 포트 5000**으로 뜬다(로그에 `serving on port 5000`).

### B) 기능 확인(가장 쉬운 방법)
- 앱 UI에서 **로그인/회원가입/데모 로그인**이 이전처럼 되는지 확인

### C) (선택) curl로 빠른 체크
Replit Shell에서:

```bash
curl -s -X POST http://127.0.0.1:5000/api/auth/demo-login -H "Content-Type: application/json" -d "{}"
```

- 정상이라면 `token`이 포함된 JSON이 와야 한다.

---

## 4) 완료 기준(완료라고 말할 수 있는 조건)
- `server/routes.ts`에서 **inline register/login/demo-login 블록이 제거**되어 있다.
- `app.use('/api/auth', authRouter);`가 추가되어 있다.
- `npm run dev`가 에러 없이 실행된다.
- UI 로그인/회원가입/데모 로그인이 정상 동작한다.

---

## 5) 롤백(문제 생기면 즉시 되돌리기)
- 가장 빠른 롤백: `server/routes.ts`에서
  - `app.use('/api/auth', authRouter);` 삭제
  - 삭제했던 3개 블록을 원복(또는 Git에서 되돌리기)

---

## 6) 다음 티켓 예고(T6)
이번 티켓은 /api/auth 3개만 교체했다.  
다음은 남은 auth 관련 엔드포인트(/me, /user, /generate-token, /onboarding)를 **순서대로** authRouter로 이동시키며 `routes.ts`를 더 줄이는 티켓(T6)로 간다.
