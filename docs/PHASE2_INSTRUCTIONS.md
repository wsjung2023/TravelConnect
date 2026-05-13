# 📑 Phase 2 작업 지시서: 아키텍처 모듈화 및 파일 분리

본 지시서는 거대해진 소스 코드를 체계적으로 분리하여 분석 효율성을 높이기 위한 작업 단계를 정의합니다.

## 1. DB 스키마 파일 분리 (`shared/schema.ts`)
### 1.1 도메인별 분할
- **대상**: 3,800라인의 `shared/schema.ts`
- **작업 내용**: 
    - `shared/schema/` 디렉터리 생성.
    - `user.ts`, `experience.ts`, `booking.ts`, `chat.ts`, `social.ts`, `geo.ts` 등으로 테이블 정의 분리.
    - 테이블 간의 관계(`relations`)와 Zod 스키마(`insertUserSchema` 등)도 해당 파일로 이동.
- **의도 보존**: 프론트/백엔드에서 `@shared/schema`를 통해 타입을 공유하는 구조를 깨뜨리지 않음.
- **리스크**: 순환 참조를 방지하기 위해 파일 간 `import` 구조를 세밀하게 설계.

### 1.2 통합 Entry Point 작성
- **작업 내용**: 
    - `shared/schema.ts`를 수정하여 분리된 파일들을 다시 `export *` 하도록 변경.
    - 기존 모든 파일에서의 `import` 문이 수정 없이 작동하도록 호환성 보장.

## 2. 라우터 로직 분할 (`server/routes.ts`)
### 2.1 도메인별 라우터 모듈 생성
- **대상**: 2,500라인의 `server/routes.ts`
- **작업 내용**: 
    - `server/routes/` 하위에 `auth.ts`, `chat.ts`, `experiences.ts`, `posts.ts`, `admin.ts` 등 생성.
    - 각 파일에 `express.Router()`를 정의하고 로직을 이동.
- **의도 보존**: Replit Auth와 연동된 `authenticateHybrid` 미들웨어와의 결합도를 유지하면서 코드 위치만 이동.

### 2.2 메인 라우터 등록부 정비
- **작업 내용**: 
    - `server/routes.ts`의 `registerRoutes` 함수에서는 각 모듈별 라우터를 `app.use('/api/...', router)` 형태로 등록.
- **리스크**: 라우터 분리 시 미들웨어 적용 순서가 바뀌지 않도록 철저히 검증.

## 3. 세션 저장소 개선 (`server/auth.ts`)
- **작업 내용**: 
    - `global.loggedOutSessions` 대신 `memorystore`를 세션 저장소로 공식 지정.
    - 서버 재시작 시에도 일정 시간 세션이 유지되도록 설정.
- **Replit 최적화**: Replit의 단일 인스턴스 특성을 고려하여 가벼운 인메모리 저장소 활용.

---

## 📅 작업 대기
이 작업은 Phase 1 완료 후 승인을 거쳐 진행됩니다.
