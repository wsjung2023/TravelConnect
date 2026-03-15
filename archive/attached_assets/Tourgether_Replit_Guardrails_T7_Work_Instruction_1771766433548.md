# Tourgether — Replit 작업지시서 (Guardrails T7)
작업명: **T7 — 폴더별 GUIDE.md “필수 규칙” 완성(최소 세트)**  
목적: Guardrails 3번(각 폴더에 GUIDE.md) 규칙을 “말”이 아니라 “파일”로 고정한다.  
특징: **코드 로직 변경 없음(0리스크)**, Replit이 자빠뜨릴 가능성이 가장 낮은 티켓.

---

## 1) 이번 티켓에서 추가하는 GUIDE.md (정확히 6개)
- `server/routes/GUIDE.md`
- `server/services/GUIDE.md`
- `server/middleware/GUIDE.md`
- `client/src/pages/GUIDE.md`
- `client/src/components/GUIDE.md`
- `client/src/features/GUIDE.md`

> 이미 루트 수준의 `server/GUIDE.md`, `client/GUIDE.md`가 있더라도,  
> “하위 폴더별” GUIDE가 있어야 Replit Agent가 엉뚱한 곳에 파일을 만들 확률이 줄어든다.

---

## 2) Replit Agent에게 줄 실행 지시문(그대로 복붙)
```text
[SAFE DOC PATCH MODE - T7 GUIDE.md completion]

Goal:
- Create GUIDE.md in these folders:
  server/routes, server/services, server/middleware
  client/src/pages, client/src/components, client/src/features

Allowed files (ONLY):
- server/routes/GUIDE.md
- server/services/GUIDE.md
- server/middleware/GUIDE.md
- client/src/pages/GUIDE.md
- client/src/components/GUIDE.md
- client/src/features/GUIDE.md

Forbidden:
- Do not touch any other files. No code changes.

Output:
- Just create the files with the exact contents I provide below (no extra).

Stop:
- If any folder does not exist, create the folder and continue.
```

---

## 3) 각 GUIDE.md 내용(복붙)
아래를 각 경로에 그대로 붙여넣기.

### 3-1) `server/routes/GUIDE.md`
```md
# server/routes — GUIDE

- 이 폴더는 기능별 Router 모듈만 둔다. (auth/admin/chat 등)
- 규칙:
  - 라우터 파일은 가능한 250줄 이하 유지. 400줄 초과 금지.
  - 새 파일 상단에 1줄 설명(// 또는 /** */) 필수.
  - routes.ts(레거시 거대 파일)에서 새 엔드포인트를 추가하지 말고, 여기로 만든다.
- 테스트:
  - npm run dev 후 해당 API 호출로 검증.
```

### 3-2) `server/services/GUIDE.md`
```md
# server/services — GUIDE

- 이 폴더는 "외부 연동/비즈니스 서비스" 로직만 둔다. (결제, 정산, AI 등)
- 규칙:
  - 네트워크/결제/외부 API는 반드시 try/catch + 로깅.
  - 실패 시 기본 정책(재시도/에러 반환)을 문서로 남긴다.
  - 함수는 작은 단위로 분리하고, 단일 책임 유지.
```

### 3-3) `server/middleware/GUIDE.md`
```md
# server/middleware — GUIDE

- 이 폴더는 Express middleware만 둔다.
- 규칙:
  - 미들웨어는 side-effect 최소화.
  - 인증/권한/요금제/AI 사용량 같은 cross-cutting concern만.
  - 에러는 next(err) 또는 통일된 에러 응답으로 처리.
```

### 3-4) `client/src/pages/GUIDE.md`
```md
# client/src/pages — GUIDE

- 이 폴더는 라우팅 단위 "페이지"만 둔다.
- 규칙:
  - 페이지 파일은 UI 조립만. 복잡한 로직은 hooks/features로 이동.
  - 250줄 초과 시 컴포넌트/features로 분리.
```

### 3-5) `client/src/components/GUIDE.md`
```md
# client/src/components — GUIDE

- 이 폴더는 재사용 UI 컴포넌트만 둔다.
- 규칙:
  - 화면 비즈니스 로직은 pages/features로 보낸다.
  - 컴포넌트는 가능한 props로만 제어.
  - 250줄 초과 시 하위 컴포넌트로 분리.
```

### 3-6) `client/src/features/GUIDE.md`
```md
# client/src/features — GUIDE

- 이 폴더는 기능 단위(예: map, feed, chat, profile)의 로직/컴포넌트 묶음을 둔다.
- 규칙:
  - feature 안에서 UI+hooks+api를 모듈화.
  - 한 기능이 커지면 feature 하위 폴더로 쪼갠다.
```

---

## 4) 완료 기준
- 위 6개 파일이 정확한 경로에 존재한다.
- 코드 변경은 없다(빌드/실행 영향 없음).

---

## 5) 메모 기록(권장)
`docs/AI_MEMO.md`에 “T7: GUIDE.md 최소 세트 추가” 기록.
