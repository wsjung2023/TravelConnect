# Tourgether — Replit 작업지시서 (Guardrails T6)
작업명: **T6 — Auth 라우트 “완전 통합” (/me, /user, /generate-token, /onboarding) + 응답/스키마 정합성 보정**  
목적: `server/routes.ts`에 남아있는 auth 관련 엔드포인트를 제거하고, `server/routes/auth.ts(authRouter)`가 **단일 진실 소스**가 되도록 만든다.  
원칙(Guardrails): **허용 파일만 수정**, **리팩토링 금지**, **작게 패치**, **검증 후에만 완료**.

---

## 0) 사전 조건(중요)
- **T5가 적용되어 있어야 함**
  - `server/routes.ts` 안에 `app.use('/api/auth', authRouter);`가 이미 있어야 한다.
  - `/api/auth/register`, `/api/auth/login`, `/api/auth/demo-login`이 routes.ts에서 제거되어 있어야 한다.

> 만약 T5가 아직이면, **먼저 T5부터** 실행한다.

---

## 1) 이번 티켓에서 바꾸는 것(정확히)
### ✅ 제거(=routes.ts에서 삭제)
- `GET /api/auth/me`
- `GET /api/auth/user`
- `POST /api/auth/generate-token`
- `POST /api/auth/onboarding`

### ✅ 보정(=authRouter에서 수정)
- `/me` 응답에 `serendipityEnabled` 포함(기존 routes.ts와 응답 정합)
- `/onboarding`에서 **timezone 업데이트 누락** 해결 + **location/bio를 null로 덮어쓰기 금지**(스키마 정합)

---

## 2) Replit Agent에게 줄 “실행 지시문”(그대로 복붙)
아래 블록을 Replit Agent에 그대로 붙여넣고 실행.

```text
[SAFE PATCH MODE - T6 Auth Full Consolidation]

Goal:
1) In server/routes/auth.ts:
   - Add serendipityEnabled to GET /me response (match legacy routes.ts).
   - Fix POST /onboarding to update timezone and NOT overwrite location/bio with null.
2) In server/routes.ts:
   - Remove inline handlers for:
     GET /api/auth/me
     GET /api/auth/user
     POST /api/auth/generate-token
     POST /api/auth/onboarding
   - Remove unused import OnboardingSchema from @shared/api/schema if no longer used.

Allowed files (ONLY):
- server/routes/auth.ts
- server/routes.ts

Forbidden:
- No other files touched.
- No refactors, no formatting, no reordering unrelated code.
- Do NOT change package.json, dependencies, configs.
- Keep patch minimal and localized.

Output:
- Provide a unified diff patch ONLY.

Stop rules:
- If you cannot find the exact blocks by the path markers, STOP and ask me.

Verify:
- After patch, I will run npm run dev and test:
  POST /api/auth/demo-login -> returns token
  GET /api/auth/me with Bearer token -> includes serendipityEnabled field
  POST /api/auth/onboarding -> updates timezone (send timezone value, then read /me)
```

---

## 3) 수동 적용(Agent 없이 직접 수정할 때)

### A) `server/routes/auth.ts` 수정 (2군데만)
#### A-1) `/me` 응답에 `serendipityEnabled` 추가
파일에서 `router.get('/me' ... )` 안의 `res.json({ ... })`에 아래 1줄 추가:

```ts
serendipityEnabled: user.serendipityEnabled ?? false,
```

> 넣는 위치 추천: `publicProfileUrl` 아래(혹은 마지막)

#### A-2) `/onboarding` 로직을 스키마에 맞게 교체 (timezone 반영 + location/bio 덮어쓰기 금지)
현재 코드는 `location`, `bio`를 꺼내서 `null`로 저장할 수 있음. **이걸 금지**하고, 스키마(`OnboardingSchema`)에 있는 필드만 업데이트.

`router.post('/onboarding' ... )` 블록 내부에서 아래처럼 바꾼다:

- **기존:** `const { userType, interests, languages, location, bio } = ...`
- **변경:** 아래로 교체

```ts
const { userType, interests, languages, timezone } = req.validatedData as {
  userType?: 'traveler' | 'influencer' | 'host';
  interests: string[];
  languages: string[];
  timezone: string;
};

const finalUserType = userType || 'traveler';

const updatedUser = await storage.updateUser(userId, {
  userType: finalUserType,
  interests: interests || [],
  languages: languages || [],
  timezone: timezone || 'Asia/Seoul',
  onboardingCompleted: true,
});
```

그리고 응답 `res.json({ user: { ... }})`에 `timezone: updatedUser.timezone`를 포함시키는 것을 추천.

---

### B) `server/routes.ts`에서 inline auth 4개 삭제 + import 정리

#### B-1) inline `/api/auth/me` 삭제
`server/routes.ts`에서 아래 라인을 포함한 블록을 찾고 **통째로 삭제**:

- 포함 라인: `app.get('/api/auth/me', authenticateHybrid, ...`

삭제 범위 힌트:
- 시작: `app.get('/api/auth/me'`
- 끝: `// 프로필 만남 상태 업데이트` 바로 직전까지  
  (※ T5 이후에 `// 데모 로그인...` 같은 주석이 남아있다면, 같이 삭제해도 됨)

#### B-2) inline `/api/auth/user` 삭제
아래 라인을 포함한 블록 **통째로 삭제**:

- 포함 라인: `app.get('/api/auth/user', authenticateToken, ...`

삭제 범위 힌트:
- 시작: `// 사용자 조회` (또는 바로 `app.get('/api/auth/user'`)
- 끝: `// 구글 로그인 시작 엔드포인트` 직전까지

#### B-3) inline `/api/auth/generate-token` 삭제
아래 라인을 포함한 블록 **통째로 삭제**:

- 포함 라인: `app.post('/api/auth/generate-token', authenticateHybrid, ...`

#### B-4) inline `/api/auth/onboarding` 삭제
아래 라인을 포함한 블록 **통째로 삭제**:

- 포함 라인: `app.post('/api/auth/onboarding', authenticateHybrid, validateSchema(OnboardingSchema), ...`

#### B-5) import 정리
- `@shared/api/schema` import 리스트에서 `OnboardingSchema` 제거  
  (이제 onboarding은 authRouter에서만 처리하므로 routes.ts에 필요 없음)

---

## 4) 검증(필수)
1) 서버 실행
```bash
npm run dev
```

2) demo-login으로 토큰 획득
```bash
curl -s -X POST http://127.0.0.1:5000/api/auth/demo-login -H "Content-Type: application/json" -d "{}"
```

3) 받은 token을 넣어서 `/me` 확인(serendipityEnabled 포함 여부)
```bash
curl -s http://127.0.0.1:5000/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

4) onboarding으로 timezone 업데이트 → 다시 `/me`로 timezone이 바뀌는지 확인
```bash
curl -s -X POST http://127.0.0.1:5000/api/auth/onboarding \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userType":"traveler","interests":[],"languages":["ko"],"timezone":"Asia/Seoul"}'
```

---

## 5) 완료 기준
- routes.ts에서 auth 관련 inline 4개가 사라졌고, authRouter가 해당 경로를 처리한다.
- `/api/auth/me` 응답에 `serendipityEnabled`가 존재한다.
- `/api/auth/onboarding`이 `timezone`을 DB에 반영한다(덮어쓰기 부작용 없음).

---

## 6) 롤백(문제 생기면)
- `server/routes.ts`에서 삭제한 inline 블록을 복원하고,
- `server/routes/auth.ts`에서 변경한 부분을 되돌린다.
- (Git 사용 중이면) 직전 커밋으로 reset/checkout.

---

## 7) 메모 기록(권장)
`docs/AI_MEMO.md`에 아래를 기록:
- T6에서 `/onboarding`의 **location/bio null 덮어쓰기 위험을 제거**했다는 점
- `/me`의 `serendipityEnabled` 응답 정합을 맞췄다는 점
