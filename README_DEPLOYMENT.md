# Tourgether - 배포 가이드

## 프로덕션 배포 준비 완료

### 빌드 결과
- ✅ 프론트엔드: `dist/public/` (Vite 빌드 완료)
- ✅ 백엔드: `dist/index.js` (ESBuild 번들링 완료)
- ✅ 정적 파일: CSS, JS 최적화 및 gzip 압축 적용

### 필요한 환경변수 설정

프로덕션 배포 시 다음 환경변수들을 설정해주세요:

```bash
# 필수 환경변수
DATABASE_URL=postgresql://username:password@host:5432/database
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_secure_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NODE_ENV=production
PORT=5000
```

### 배포 실행 명령어

```bash
# 프로덕션 서버 실행
npm start

# 또는 PM2를 사용한 프로덕션 실행
pm2 start dist/index.js --name tourgether
```

### 배포된 기능들

1. **인증 시스템**
   - 이메일/패스워드 로그인
   - 구글 OAuth 2.0 로그인
   - JWT 기반 세션 관리

2. **지도 기능**
   - Google Maps 통합
   - 사용자 피드 마커 표시
   - POI (관심지점) 필터링
   - 실시간 클러스터링

3. **콘텐츠 관리**
   - 파일 업로드 (이미지/비디오)
   - 여행 피드 작성 및 공유
   - 타임라인 기능

4. **데이터베이스**
   - PostgreSQL 연동
   - Drizzle ORM
   - 실시간 데이터 동기화

### 성능 최적화

- ✅ 프론트엔드 번들 크기: 466KB (gzip: 144KB)
- ✅ CSS 최적화: 81KB (gzip: 14KB)
- ✅ 백엔드 번들: 51KB
- ✅ 코드 스플리팅 및 트리 쉐이킹 적용

### 보안 설정

- ✅ 비밀번호 암호화 (bcrypt)
- ✅ JWT 토큰 보안
- ✅ CORS 정책 적용
- ✅ 환경변수 보안

### 배포 후 확인사항

1. Google Console에서 프로덕션 도메인을 OAuth 리디렉션 URI에 추가
2. 데이터베이스 연결 확인
3. 파일 업로드 디렉토리 권한 설정
4. HTTPS 인증서 설정 확인

배포가 완료되면 완전한 여행 소셜 플랫폼이 사용 가능합니다.