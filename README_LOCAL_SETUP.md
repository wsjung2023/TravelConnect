# 🚀 Tourgether - 로컬 개발 환경 설정 가이드

## 📋 프로젝트 개요
Tourgether는 여행자들이 현지 경험을 공유하고 발견할 수 있는 소셜 플랫폼입니다.

### 주요 기능
- ✅ Google Maps 통합 인터랙티브 지도
- ✅ 실시간 파일 업로드/저장 시스템 (이미지/동영상)  
- ✅ PostgreSQL 데이터베이스
- ✅ React + TypeScript 프론트엔드
- ✅ Express.js 백엔드 API
- ✅ POI 필터링 및 지도 마커 시스템
- ✅ 사용자 인증 및 세션 관리
- ✅ 반응형 모바일 디자인

## 🛠️ 기술 스택
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect)
- **Maps**: Google Maps JavaScript API
- **File Upload**: Multer
- **Real-time**: WebSocket

## 📦 설치 및 실행

### 1. 프로젝트 압축 해제
```bash
tar -xzf tourgether_complete_source_YYYYMMDD_HHMMSS.tar.gz
cd tourgether
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 프로젝트 루트에 생성하고 다음을 추가:

```env
# 데이터베이스 (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/tourgether

# Google Maps API 키
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# 세션 보안
SESSION_SECRET=your_secure_session_secret

# Replit Auth (로컬에서는 사용 안함)
REPLIT_DB_URL=optional_for_local
```

### 4. 데이터베이스 설정
```bash
# PostgreSQL 설치 (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# 데이터베이스 생성
sudo -u postgres createdb tourgether

# 스키마 동기화
npm run db:push
```

### 5. 개발 서버 실행
```bash
npm run dev
```

서버가 시작되면:
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api

## 📁 프로젝트 구조

```
tourgether/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 가능한 UI 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트 (home, feed, chat, profile)
│   │   ├── lib/           # 유틸리티 함수 및 설정
│   │   └── hooks/         # React 커스텀 훅
├── server/                # Express 백엔드
│   ├── routes.ts          # API 라우트 정의
│   ├── db.ts             # 데이터베이스 연결 설정
│   ├── storage.ts        # 데이터베이스 작업 인터페이스
│   ├── auth.ts           # 인증 미들웨어
│   └── index.ts          # 서버 진입점
├── shared/               # 프론트엔드/백엔드 공유 코드
│   └── schema.ts         # 데이터베이스 스키마 및 타입
├── uploads/              # 업로드된 파일 저장소
├── components.json       # shadcn/ui 설정
├── drizzle.config.ts     # Drizzle ORM 설정
├── package.json          # 프로젝트 의존성
├── tailwind.config.ts    # Tailwind CSS 설정
├── tsconfig.json         # TypeScript 설정
└── vite.config.ts       # Vite 빌드 도구 설정
```

## 🔧 개발 도구

### 사용 가능한 스크립트
```bash
npm run dev          # 개발 서버 시작
npm run build        # 프로덕션 빌드
npm run db:generate  # Drizzle 마이그레이션 생성
npm run db:push      # 데이터베이스 스키마 동기화
npm run db:studio    # Drizzle Studio (데이터베이스 GUI)
```

### 데이터베이스 관리
```bash
# 스키마 변경 후 데이터베이스 업데이트
npm run db:push

# Drizzle Studio로 데이터 확인
npm run db:studio
```

## 🌍 Google Maps API 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. Maps JavaScript API, Places API, Geocoding API 활성화
4. API 키 생성 및 도메인 제한 설정
5. `.env` 파일에 `VITE_GOOGLE_MAPS_API_KEY` 추가

## 🗄️ 데이터베이스 스키마

주요 테이블:
- `users` - 사용자 정보
- `posts` - 여행 게시물 (이미지/동영상 포함)
- `experiences` - 여행 경험 상품
- `bookings` - 예약 정보
- `conversations` - 채팅 대화
- `messages` - 채팅 메시지
- `trips` - 여행 계획

## 🔐 인증 시스템

로컬 개발 환경에서는 Replit Auth 대신 간단한 세션 기반 인증을 사용할 수 있습니다.

## 📱 모바일 최적화

모바일 우선 반응형 디자인으로 구현되어 있습니다:
- 하단 네비게이션
- 터치 친화적 인터페이스
- PWA 지원 준비

## 🚀 배포

### Replit에서 배포
원본 Replit 환경에서는 자동으로 배포됩니다.

### 다른 플랫폼 배포
```bash
# 프로덕션 빌드
npm run build

# 빌드 파일은 dist/ 폴더에 생성됩니다
```

## 🐛 문제 해결

### 일반적인 문제들

1. **데이터베이스 연결 실패**
   - DATABASE_URL이 올바른지 확인
   - PostgreSQL 서버가 실행 중인지 확인

2. **Google Maps가 로드되지 않음**
   - API 키가 유효한지 확인
   - 필요한 API들이 활성화되어 있는지 확인

3. **파일 업로드 실패**
   - uploads/ 폴더 권한 확인
   - 파일 크기 제한 (50MB) 확인

## 📞 지원

문제가 발생하면 다음을 확인해주세요:
1. 모든 환경 변수가 설정되었는지
2. 데이터베이스가 연결되었는지
3. Google Maps API 키가 유효한지

---

**Happy Coding! 🎉**