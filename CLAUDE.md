# Tourgether — AI Agent Instructions

## 프로젝트 개요

Tourgether는 여행 중심의 SNS + 공유경제 플랫폼이다. 여행자와 현지 가이드가 서로 서비스를 사고팔 수 있으며, 핵심은 **사용자 간 여행 경험 거래/계약(에스크로)**이다. 구독은 부가 기능이며 나중에 제거될 수 있다.

공유경제 흐름: 여행자 요청 → 가이드 제안 → DM 협상 → 계약 서명 → 서비스 제공 → 정산

---

## User Preferences

- 커뮤니케이션: 쉽고 일상적인 언어 사용
- 새 기능은 설명 후 승인받고 구현
- 기존 기능을 절대 망가뜨리지 말 것
- 새 화면은 버튼으로 접근 가능해야 함 (URL 직접 입력 불가)
- 모든 텍스트는 `translations` DB 테이블을 통한 i18n으로 구현
- 마스터 데이터는 DB에 저장, 하드코딩 금지

---

## 시스템 아키텍처

### Frontend
- React + TypeScript, Wouter(라우팅), TanStack React Query, Radix UI + shadcn/ui, Tailwind CSS, Vite

### Backend
- Node.js + Express.js, TypeScript ES modules
- 인증: Replit Auth(OpenID Connect) + JWT 이메일/패스워드
- 실시간: WebSocket(채팅), RESTful API

### Data Storage
- PostgreSQL (Neon serverless), Drizzle ORM
- 파일: Replit Object Storage(GCS) — `server/services/objectStorageService.ts`
  - 업로드: `POST /api/upload` → `public/uploads/{uuid}.ext`
  - 조회: `GET /api/files/:filename` → signed URL 302 redirect

### 핵심 기능
- SNS 피드, 지도(Google Maps), AI 기능(CineMap/Concierge/Mini), DM 번역
- P2P 에스크로 계약, 분할 결제(선수금/잔금), 정산
- i18n: translations 테이블, 6개 언어, ~10,075개 항목
- DB 기반 시스템 설정(system_config), 스케줄러, AI 프롬프트 템플릿

---

## 결제 시스템 (Paddle)

**현재 상태**: PortOne → Paddle 마이그레이션 진행 중 (2026-06-12~)

### 환경변수 구조
```
PAYMENT_PROVIDER=paddle
PADDLE_ENVIRONMENT=sandbox        # sandbox 또는 production
VITE_PADDLE_ENVIRONMENT=sandbox   # 클라이언트(Vite)용 별도 필요

PADDLE_SANDBOX_API_KEY
PADDLE_SANDBOX_CLIENT_TOKEN
PADDLE_SANDBOX_WEBHOOK_SECRET
PADDLE_SANDBOX_CONTRACT_PRICE_ID  # pri_01ktz4wkwrax5vyq52k5ykcr92

PADDLE_LIVE_API_KEY
PADDLE_LIVE_CLIENT_TOKEN
PADDLE_LIVE_WEBHOOK_SECRET
PADDLE_LIVE_CONTRACT_PRICE_ID     # pri_01ktz4x7wgft3gpct3jnh8j21e
```

### 계약 결제 구조
- 상품: `tourgether_contract_payment` (Standard Services, USD $0.01/unit)
- 금액 표현: quantity = amountInCents (예: $150 → quantity 15000)
- 선수금/잔금 각각 별도 Paddle 체크아웃 호출

### 이중 라우트 함정 ⚠️
- `server/routes/billing.ts` (billingRouter) — `mountRouters()` 미호출로 **실제 미사용**
- `server/routes/billing.legacy.ts` — `registerLegacyBillingRoutes()`로 실제 동작
- 결제 관련 수정 시 **billing.legacy.ts 반드시 함께 수정**
- 계약 결제: `server/routes/contract.legacy.ts` (`initiate-payment`, `confirm-payment`)

### 테스트 계정
- email: test@paddle.com / password: TestPass123!

---

## i18n 운영 절차

- 소규모: `seed-translations.json` 수정 → `node scripts/i18n-sync.mjs` → 서버 재시작
- 운영 반영: `POST /api/admin/i18n/sync` (관리자 계정)
- 대규모: `STARTUP_SYNC_MODE=safe` 설정 → 배포 → 완료 후 환경변수 삭제

---

## Guardrails — 절대 규칙

**파일 크기**
- 250줄 초과 시 분리 검토, 400줄 초과 시 반드시 분리
- `server/routes.ts`는 레거시 거대 파일 — 새 엔드포인트 추가 금지, `server/routes/` 하위 모듈로 만들 것

**서버 재시작 금지**
- `kill`, `pkill`로 서버 프로세스 종료 금지
- Replit 시작 서버에 Secrets 주입됨 — 직접 재시작 시 모든 연동 깨짐
- 재시작 필요 시 반드시 사용자에게 Replit Stop → Run 요청

**/nix 파일시스템 탐색 금지**
- `find /nix`, `find /`, `find /home/runner /nix` 등 금지
- Nix store는 수십만 파일 — 백그라운드 실행해도 수 시간 CPU/메모리 고갈로 서버 다운
- 파일 탐색은 반드시 `find .` 또는 프로젝트 경로 내에서만

**Vite 버전 상한**
- `vite`는 `^6`(현재 6.4.3) 고정
- v7/v8로 올리면 Replit 플러그인 `hot.send()` undefined → preview iframe 무한 루프
- `vite`/`@vitejs/plugin-react`/`@tailwindcss/vite`/`@replit/vite-plugin-*`는 한 세트

**기타**
- 새 파일 상단에 1줄 역할 주석 필수
- 코드 변경 후 서버 실행 확인 — 미실행 코드를 "완료"라고 보고 금지
- 허용된 파일 외 수정 금지 (포맷팅/리팩토링 등 요청 외 수정 금지)
- 로그 확인 없이 원인 단정 금지
- 사용자 확인 없이 파일 대량 생성/삭제 금지

---

## 코딩 지침

**1. 코딩 전에 생각하기**
- 가정을 명시적으로 밝힐 것. 불확실하면 질문
- 여러 해석이 가능하면 제시하고 선택 요청
- 더 단순한 방법이 있으면 말할 것

**2. 단순함 우선**
- 요청된 것만 구현. 추측성 기능 추가 금지
- 단일 사용 코드에 추상화 금지
- 200줄로 쓸 수 있으면 50줄로 쓸 것

**3. 최소 수정**
- 요청된 코드만 건드릴 것
- 관련 없는 코드 개선/리팩토링 금지
- 기존 스타일 유지

**4. 검증 후 완료**
- 성공 기준을 정의하고 확인 후 완료 선언
- 멀티 스텝 작업은 단계별 계획 제시
