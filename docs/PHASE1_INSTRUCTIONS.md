# 📑 Phase 1 작업 지시서: 보안 및 인프라 안정화

본 지시서는 TravelConnect 프로젝트의 보안 강화 및 서버 안정성을 확보하기 위한 구체적인 작업 단계를 정의합니다.

## 1. 관리자 SQL 도구 보안 강화
### 1.1 토큰 전달 방식 변경
- **현재 상태**: `/db-admin?token=...` 형식을 사용하여 브라우저 히스토리 및 로그에 토큰 노출 위험.
- **작업 내용**: 
    - `db-admin.html` (프론트엔드)에서 로그인 시 받은 토큰을 `localStorage` 또는 `sessionStorage`에 저장하도록 수정.
    - API 요청 시 `Authorization: Bearer <token>` 헤더를 사용하여 요청하도록 수정.
    - `server/routes.ts`의 `/db-admin` 라우터에서 `req.query.token` 대신 헤더를 검증하도록 로직 변경.
- **의도 보존**: 관리자가 별도의 인증 절차 없이 기존 토큰으로 DB 관리 도구를 계속 사용할 수 있어야 함.

### 1.2 SQL 인젝션 블랙리스트 보강
- **현재 상태**: 기본적인 DDL/DCL만 차단 중.
- **작업 내용**: 
    - `server/routes.ts`의 `dangerousPatterns`에 다음 패턴 추가:
        - `pg_sleep`, `pg_read_file`, `pg_ls_dir` 등 시스템 정보 조회 함수.
        - `copy ... from program` (RCE 위험).
        - `information_schema`에 대한 과도한 접근 패턴.
- **의도 보존**: 정상적인 `SELECT`, `UPDATE` (WHERE절 포함) 등 관리용 쿼리는 차단되지 않아야 함.

## 2. 환경 변수 검증 및 에러 핸들링
### 2.1 서버 시작 시 환경 변수 체크 강화
- **현재 상태**: `JWT_SECRET` 부재 시 경고 로그만 출력하고 실행 시 에러 발생.
- **작업 내용**: 
    - `server/index.ts`에서 필수 변수(`JWT_SECRET`, `NEON_DATABASE_URL` 등) 누락 시 프로세스를 명확한 안내 메시지와 함께 종료(`process.exit(1)`).
- **Replit 최적화**: Replit Secrets 탭 사용법을 안내 메시지에 포함.

### 2.2 Global Error Handler 수정
- **현재 상태**: `app.use((err, ...))` 내부에서 `throw err`가 있어 Express 에러 처리가 중단되거나 프로세스가 예기치 않게 종료될 수 있음.
- **작업 내용**: 
    - `server/index.ts`의 에러 핸들러 미들웨어 하단에 있는 `throw err` 제거.
    - 응답은 `res.status(status).json(...)`으로 마무리.
- **체크포인트**: 비정상적인 요청이 와도 Replit 서버 인스턴스가 계속 살아있는지 확인.

---

## 📅 작업 승인 요청
Phase 1의 위 내용들을 순차적으로 진행해도 될까요? 승인해 주시면 첫 번째 항목인 "관리자 SQL 도구 보안 강화"부터 착수하겠습니다.
