# Tourgether 구현 로드맵
> 여행 공유경제 SNS 플랫폼 상세 개발 계획서
> 최종 업데이트: 2024년 12월

---

## 목차
1. [현재 개발 현황](#1-현재-개발-현황)
2. [Phase 1: MVP 완성](#phase-1-mvp-완성-4-6주)
3. [Phase 2: 신뢰 시스템 구축](#phase-2-신뢰-시스템-구축-6-8주)
4. [Phase 3: 매칭 및 소셜 강화](#phase-3-매칭-및-소셜-강화-8-10주)
5. [Phase 4: 안전 및 위험관리](#phase-4-안전-및-위험관리-6-8주)
6. [Phase 5: 수익 다변화](#phase-5-수익-다변화-8-12주)
7. [기술 아키텍처](#기술-아키텍처)
8. [우선순위 매트릭스](#우선순위-매트릭스)

---

## 1. 현재 개발 현황

### ✅ 완료된 기능

| 카테고리 | 기능 | 상태 | 비고 |
|---------|------|------|------|
| **SNS 코어** | 피드 (MoVi) | ✅ 완료 | 좋아요, 댓글, 위치태깅 |
| | 타임라인 | ✅ 완료 | 여행 일정 관리 |
| | 팔로우/팔로잉 | ✅ 완료 | |
| | 알림 시스템 | ✅ 완료 | 6종류 알림, 위치 인식 |
| **마켓플레이스** | Experience 등록/조회 | ✅ 완료 | 가이드 서비스 |
| | 예약 시스템 | ✅ 완료 | 슬롯 관리, 자동 만료 |
| | 에스크로 계약 | ✅ 완료 | 분할결제, 분쟁관리 |
| **결제** | PortOne 연동 | ✅ 완료 | KG이니시스 V2 |
| | 구독/Trip Pass | ✅ 완료 | USD 기반 |
| | 빌링키 등록 | ✅ 완료 | 자동결제 준비 |
| | 정산 배치 | ✅ 완료 | PortOne Transfer API |
| **AI** | AI Concierge | ✅ 기본 | GPT-5.1, 대화형 |
| | Mini Concierge | ✅ 완료 | 1시간 활동 플래너 |
| | CineMap | ✅ 완료 | EXIF 기반 스토리보드 |
| **커뮤니케이션** | 실시간 채팅 | ✅ 완료 | WebSocket, 3-panel |
| | DM 번역 | ✅ 완료 | Google Translate, 캐싱 |
| **지도** | Google Maps 통합 | ✅ 완료 | 클러스터링, POI 필터 |
| | Open to Meet | ✅ 완료 | 실시간 위치 공유 |
| **인프라** | i18n 6개국어 | ✅ 완료 | DB 기반 번역 |
| | 성능 최적화 | ✅ 완료 | 40+ 인덱스, LRU 캐시 |

### 🟡 부분 완료

| 기능 | 현재 상태 | 필요 작업 |
|------|----------|----------|
| 정산 대시보드 | 백엔드만 완료 | 프론트엔드 UI 필요 |
| AI Concierge | 기본 대화 | 구조화된 응답, 외부 API 연동 |
| 사용자 프로필 | 기본 정보 | 신뢰도 지표, 검증 배지 |

### ❌ 미구현

- 신원인증 (Jumio/Onfido)
- Travel Buddy 매칭
- Safety Dashboard / GPS 추적
- 위험감지 알림
- 보험 상품 연동
- 데이터 분석 대시보드

---

## Phase 1: MVP 완성 (4-6주)

> **목표**: 가이드가 실제로 수익을 확인하고 인출할 수 있는 완성된 거래 루프

### 1.1 수익금 대시보드 UI

**우선순위**: 🔴 Critical

기획서 참조: `APJT-ME-0170 수익금관리 정산`

```
구현 항목:
├── /earnings 페이지 신규 생성
│   ├── Total Earnings 카드 (차트 포함)
│   ├── Pending Payments 표시
│   ├── Available Balance 표시
│   └── Transaction History 리스트
├── Request Withdrawal 모달
│   ├── 금액 입력
│   ├── 계좌 정보 확인
│   └── 최소 인출 금액 검증 ($50)
└── View Detailed Report 기능
    ├── 기간별 필터
    ├── 거래 유형별 필터
    └── CSV 다운로드
```

**기술 구현**:
```typescript
// 필요한 API 엔드포인트 (대부분 존재, 일부 추가)
GET  /api/earnings/summary        // 요약 통계
GET  /api/earnings/history        // 거래 내역
POST /api/earnings/withdraw       // 인출 요청
GET  /api/earnings/report         // 상세 리포트
```

**DB 스키마 확장**:
```sql
-- withdrawals 테이블 (신규)
CREATE TABLE withdrawals (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  bank_account_id INTEGER REFERENCES bank_accounts(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  portone_transfer_id TEXT
);
```

**예상 소요**: 2주

---

### 1.2 AI Travel Planner 강화

**우선순위**: 🟠 High

기획서 참조: `AI 기반 추천상품 만들기(여행자)`

```
현재 AI Concierge 개선:
├── 구조화된 응답 포맷
│   ├── 일정표 (Itinerary)
│   ├── 예산 breakdown
│   ├── 추천 Experience 연동
│   └── 저장 가능한 Plan 객체
├── 외부 API 연동
│   ├── Google Places API (장소 정보)
│   ├── Weather API (날씨)
│   └── 플랫폼 내 Experience 검색
└── 대화 → 액션 전환
    ├── "이 일정 저장하기" 버튼
    ├── "가이드에게 문의하기" 버튼
    └── "Experience 예약하기" 버튼
```

**AI 응답 스키마**:
```typescript
interface TravelPlanResponse {
  summary: string;
  itinerary: {
    day: number;
    date: string;
    activities: {
      time: string;
      title: string;
      description: string;
      location: { lat: number; lng: number; name: string };
      estimatedCost: number;
      linkedExperienceId?: number; // 플랫폼 Experience 연동
    }[];
  }[];
  totalBudget: {
    accommodation: number;
    transportation: number;
    activities: number;
    food: number;
    total: number;
  };
  tips: string[];
  matchingExperiences: Experience[]; // 관련 Experience 추천
}
```

**예상 소요**: 2주

---

### 1.3 견적서 요청 시스템

**우선순위**: 🟠 High

기획서 참조: `APJT-INBOX-0090 여행요청에 대한 견적서 화면`

```
구현 항목:
├── 여행자 → 가이드 견적 요청
│   ├── Product Summary (Experience 기반)
│   ├── Request Details (옵션 체크박스)
│   ├── 날짜 선택 (Start/End)
│   ├── 인원 수
│   └── 추가 메모
├── 가이드 → 여행자 견적 응답
│   ├── 커스텀 가격 제안
│   ├── 포함/불포함 사항
│   ├── 일정 수정 제안
│   └── 유효기간 설정
└── 견적 → 계약 전환
    ├── 견적 수락 시 Contract 자동 생성
    └── 에스크로 결제 연동
```

**DB 스키마**:
```sql
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  experience_id INTEGER REFERENCES experiences(id),
  requester_id TEXT REFERENCES users(id),
  host_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- pending, responded, accepted, rejected, expired
  
  -- 요청 정보
  request_details JSONB,
  start_date DATE,
  end_date DATE,
  travelers INTEGER,
  notes TEXT,
  
  -- 응답 정보
  proposed_price DECIMAL(10,2),
  includes TEXT[],
  excludes TEXT[],
  counter_proposal TEXT,
  valid_until TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);
```

**예상 소요**: 1.5주

---

## Phase 2: 신뢰 시스템 구축 (6-8주)

> **목표**: 사용자 간 신뢰를 높여 거래 전환율 증가

### 2.1 신원인증 시스템

**우선순위**: 🔴 Critical (안전 필수)

기획서 참조: `APJT-ME-0090 신분 증빙화면`

```
인증 레벨 설계:
├── Level 1: 이메일 인증 (기존)
├── Level 2: 휴대폰 인증 (SMS)
├── Level 3: 신분증 인증 (AI 기반)
│   ├── Jumio 또는 Onfido 연동
│   ├── 실시간 사진 대조
│   └── 문서 위조 탐지
├── Level 4: 소셜 미디어 연동
│   ├── Facebook/Instagram 계정 연결
│   ├── LinkedIn (선택)
│   └── 온라인 평판 확인
└── Level 5: 고급 인증 (선택)
    ├── 비디오 셀카 인증
    └── 범죄기록 조회 (Checkr/GoodHire)
```

**기술 구현 - Onfido 연동**:
```typescript
// server/routes/verification.ts
import { Onfido } from '@onfido/api';

const onfido = new Onfido({ apiToken: process.env.ONFIDO_API_TOKEN });

// 1. 인증 세션 시작
app.post('/api/verification/start', async (req, res) => {
  const applicant = await onfido.applicant.create({
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email
  });
  
  const check = await onfido.check.create({
    applicantId: applicant.id,
    reportNames: ['document', 'facial_similarity_photo']
  });
  
  // SDK 토큰 생성해서 프론트엔드로 전달
  const sdkToken = await onfido.sdkToken.create({
    applicantId: applicant.id,
    referrer: process.env.APP_URL
  });
  
  return res.json({ sdkToken: sdkToken.token, checkId: check.id });
});

// 2. Webhook으로 결과 수신
app.post('/api/verification/webhook', async (req, res) => {
  const { payload } = req.body;
  if (payload.action === 'check.completed') {
    await updateUserVerificationLevel(payload.object.applicant_id, payload.object.result);
  }
});
```

**DB 스키마**:
```sql
CREATE TABLE user_verifications (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  level INTEGER DEFAULT 1,
  
  -- 각 인증 상태
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  phone_number TEXT,
  
  document_verified BOOLEAN DEFAULT false,
  document_provider TEXT, -- 'onfido', 'jumio'
  document_check_id TEXT,
  document_verified_at TIMESTAMP,
  
  social_verified BOOLEAN DEFAULT false,
  social_accounts JSONB, -- [{provider, profileUrl, followers}]
  
  video_verified BOOLEAN DEFAULT false,
  background_checked BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 프로필에 verification_level 표시
ALTER TABLE users ADD COLUMN verification_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN verification_badges TEXT[]; -- ['email', 'phone', 'id', 'social']
```

**프론트엔드 UI**:
```
/verify 페이지:
├── Step 1: Valid ID Upload
│   ├── 카메라/파일 업로드
│   ├── 신분증 종류 선택 (여권, 운전면허, 주민등록증)
│   └── Onfido SDK 임베드
├── Step 2: Profile Picture (Selfie)
│   ├── 실시간 촬영
│   ├── 조명/각도 가이드
│   └── 신분증 사진과 대조
├── Step 3: SMS Verification
│   ├── 전화번호 입력
│   ├── OTP 발송
│   └── 6자리 코드 확인
└── 완료 후 배지 표시
```

**예상 소요**: 3주

---

### 2.2 리뷰 시스템 강화

**우선순위**: 🟠 High

```
현재 → 개선:
├── 리뷰 필터링
│   ├── 욕설/비방 자동 감지 (AI)
│   ├── 가짜 리뷰 탐지 (패턴 분석)
│   └── 신고 기능 강화
├── 양방향 리뷰
│   ├── 여행자 → 가이드
│   ├── 가이드 → 여행자
│   └── 양쪽 작성 후 공개 (blind review)
├── 리뷰 분석
│   ├── 카테고리별 평점 (친절도, 정확성, 가성비 등)
│   ├── 키워드 자동 추출
│   └── 통계 시각화
└── 신뢰도 점수 계산
    ├── 리뷰 평균
    ├── 응답률
    ├── 취소율
    └── 거래 완료율
```

**DB 스키마 확장**:
```sql
ALTER TABLE reviews ADD COLUMN category_ratings JSONB;
-- {"friendliness": 5, "accuracy": 4, "value": 5, "communication": 4}

ALTER TABLE reviews ADD COLUMN is_verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN reported BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN ai_moderation_score DECIMAL(3,2);

CREATE TABLE review_reports (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES reviews(id),
  reporter_id TEXT REFERENCES users(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**예상 소요**: 2주

---

### 2.3 사용자 신뢰도 프로필

**우선순위**: 🟠 High

기획서 참조: `APJT-ME-0010 My 프로필 조회 화면`

```
프로필 강화:
├── Public Information 섹션
│   ├── 최근 활동 (received request, traveled, shared post)
│   ├── 응답 시간 ("보통 1시간 내 응답")
│   └── 가입 기간
├── Trust Indicators
│   ├── 인증 배지들
│   ├── 완료된 거래 수
│   ├── 리뷰 요약
│   └── Super Host/Verified Traveler 배지
├── Details 섹션
│   ├── 거주지
│   ├── 직업 (선택)
│   ├── 관계 상태 (선택)
│   └── 구사 언어
└── Hobbies/Interests
    ├── 태그 형태로 표시
    └── 매칭에 활용
```

**예상 소요**: 1.5주

---

## Phase 3: 매칭 및 소셜 강화 (8-10주)

> **목표**: 사용자 간 연결을 촉진하여 플랫폼 활성화

### 3.1 Travel Buddy 매칭

**우선순위**: 🟠 High

기획서 참조: `여행 버디 매칭 화면`, `여행 버디 팀 만들기`

```
매칭 알고리즘:
├── 기본 필터
│   ├── 여행 날짜 (겹치는 기간)
│   ├── 목적지
│   ├── 예산 범위
│   └── 언어
├── 호환성 점수 (AI 기반)
│   ├── 관심사 매칭 (Interests)
│   ├── 여행 스타일 (Adventure vs Relaxation)
│   ├── 연령대
│   └── 이전 리뷰 분석
└── 표시 정보
    ├── 매칭 이유 ("You both like to travel in January")
    ├── 공통점 리스트
    └── Send Buddy Request / Ask for more details
```

**DB 스키마**:
```sql
CREATE TABLE travel_plans (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  destination TEXT,
  start_date DATE,
  end_date DATE,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  travel_style TEXT[], -- ['adventure', 'relaxation', 'cultural', 'food']
  looking_for TEXT, -- 'buddy', 'guide', 'group'
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE buddy_requests (
  id SERIAL PRIMARY KEY,
  sender_id TEXT REFERENCES users(id),
  receiver_id TEXT REFERENCES users(id),
  travel_plan_id INTEGER REFERENCES travel_plans(id),
  message TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE travel_teams (
  id SERIAL PRIMARY KEY,
  name TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  max_members INTEGER DEFAULT 10,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE travel_team_members (
  team_id INTEGER REFERENCES travel_teams(id),
  user_id TEXT REFERENCES users(id),
  role TEXT DEFAULT 'member', -- 'leader', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
```

**AI 매칭 로직**:
```typescript
interface MatchScore {
  userId: string;
  score: number;
  reasons: string[];
  commonInterests: string[];
  travelOverlap: { start: Date; end: Date };
}

async function findBuddyMatches(userId: string, travelPlanId: number): Promise<MatchScore[]> {
  const userPlan = await getTravelPlan(travelPlanId);
  const userProfile = await getUserProfile(userId);
  
  // 1. 기본 필터 (목적지, 날짜)
  const candidates = await db.query(`
    SELECT tp.*, u.* FROM travel_plans tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.destination ILIKE $1
      AND tp.start_date <= $2 AND tp.end_date >= $3
      AND tp.user_id != $4
      AND tp.is_public = true
  `, [userPlan.destination, userPlan.endDate, userPlan.startDate, userId]);
  
  // 2. AI 호환성 점수 계산
  const matches = await Promise.all(candidates.map(async (c) => {
    const score = await calculateCompatibility(userProfile, c);
    return { ...c, score };
  }));
  
  // 3. 점수순 정렬
  return matches.sort((a, b) => b.score - a.score).slice(0, 20);
}
```

**예상 소요**: 4주

---

### 3.2 AI 기반 가이드 요청 매칭

**우선순위**: 🟡 Medium

기획서 참조: `AI 기반 추천 투어요청 찾기 화면`

```
가이드 입장 매칭:
├── 내 서비스와 맞는 요청 자동 추천
│   ├── 위치 기반 (내 활동 지역)
│   ├── 카테고리 매칭 (내 Experience 유형)
│   └── 예산 범위 매칭
├── 요청 필터링
│   ├── Location
│   ├── Date (Anytime / 특정 기간)
│   ├── Budget
│   └── Guests 수
└── 견적 제출 (Respond Now / Save for Later)
```

**예상 소요**: 2주

---

### 3.3 그룹 채팅 및 채널

**우선순위**: 🟡 Medium

```
Travel Team → Group Chat 연동:
├── 팀 생성 시 자동 채널 생성
├── 멤버 초대/관리
├── 공유 일정 (Shared Itinerary)
└── 비용 분담 기능 (선택)
```

**예상 소요**: 2주

---

## Phase 4: 안전 및 위험관리 (6-8주)

> **목표**: 사용자 안전 보장으로 플랫폼 신뢰도 극대화

### 4.1 Safety Dashboard

**우선순위**: 🔴 Critical

기획서 참조: `위험감지-위험 알림 대시보드(실시간)`

```
대시보드 구성:
├── Real-time Alerts
│   ├── Location-based (시위, 범죄 등)
│   ├── Weather (토네이도, 홍수 등)
│   └── Social signals (지역 이슈)
├── Emergency Response
│   ├── Emergency contact (Call now)
│   ├── Contact nearest embassy
│   └── 원클릭 도움 요청
└── Live Map View
    ├── 현재 위치 표시
    ├── 위험 지역 마킹
    └── 안전 경로 안내
```

**외부 API 연동**:
```typescript
// 위험 정보 소스
const safetyAPIs = {
  // 1. 미국 국무부 Travel Advisory
  stateGov: 'https://travel.state.gov/api',
  
  // 2. Sitata (여행 안전 전문)
  sitata: 'https://api.sitata.com/v1',
  
  // 3. OpenWeather Alerts
  weather: 'https://api.openweathermap.org/data/3.0',
  
  // 4. GDACS (자연재해)
  gdacs: 'https://www.gdacs.org/gdacsapi'
};
```

**DB 스키마**:
```sql
CREATE TABLE safety_alerts (
  id SERIAL PRIMARY KEY,
  type TEXT, -- 'weather', 'security', 'health', 'disaster'
  severity TEXT, -- 'info', 'warning', 'critical'
  title TEXT,
  description TEXT,
  location GEOGRAPHY(POINT, 4326),
  radius_km DECIMAL(10,2),
  source TEXT,
  external_id TEXT,
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_safety_subscriptions (
  user_id TEXT REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326),
  radius_km DECIMAL(10,2) DEFAULT 50,
  alert_types TEXT[], -- ['weather', 'security']
  PRIMARY KEY (user_id)
);
```

**예상 소요**: 3주

---

### 4.2 GPS 기반 안전 추적

**우선순위**: 🔴 Critical

기획서 참조: `GPS 추적 기반 여행자 보호 서비스`

```
미팅 안전 시스템:
├── 만남 시작 시
│   ├── 비상 연락처 사전 등록
│   ├── 예상 경로 및 시간 설정
│   └── 실시간 위치 공유 (선택적)
├── 진행 중
│   ├── 일정 시간마다 "안전확인" 요청
│   ├── 경로 이탈 감지 시 알림
│   └── 위치 이상 시 자동 경고
└── 응답 없음 시
    ├── 30초 카운트다운
    ├── 비상 연락처에 자동 알림
    └── 마지막 위치 공유
```

**Emergency Alert 팝업**:
```
기획서 참조: 위험감지-위험 경고 팝업(사용자 알림)

┌─────────────────────────────┐
│     Emergency Alert    [X]  │
├─────────────────────────────┤
│     Are you safe?           │
│                             │
│ We've detected an emergency │
│ situation in your area.     │
│ Please confirm your safety. │
│                             │
│    [00] min  [30] sec       │
│                             │
│  [ I'm Safe ]  [ Send Help ]│
│                             │
│ If you don't respond within │
│ 30 seconds, we'll notify    │
│ your emergency contacts.    │
└─────────────────────────────┘
```

**기술 구현**:
```typescript
// client/src/hooks/useSafetyTracking.ts
function useSafetyTracking(meetingId: number) {
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number>();
  
  const startTracking = async () => {
    // 1. 백그라운드 위치 권한 요청
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    
    // 2. 위치 감시 시작
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        // 서버로 위치 전송 (WebSocket)
        socket.emit('location:update', {
          meetingId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    
    // 3. 주기적 안전 확인 설정 (30분마다)
    setInterval(() => {
      showSafetyCheckPrompt();
    }, 30 * 60 * 1000);
  };
  
  return { startTracking, stopTracking, isTracking };
}
```

**예상 소요**: 3주

---

### 4.3 에스크로 강화 및 분쟁 해결

**우선순위**: 🟠 High (이미 기본 구현됨)

```
현재 → 개선:
├── 분쟁 유형 세분화 (7종 → 완료)
├── SLA 관리 (응답 시간 제한)
├── 중재자 기능
│   ├── 관리자 대시보드
│   ├── 증거 수집 도구
│   └── 부분 환불 계산기
└── 자동 에스컬레이션
    ├── 72시간 무응답 시 자동 처리
    └── 반복 분쟁 사용자 플래그
```

**예상 소요**: 1.5주

---

## Phase 5: 수익 다변화 (8-12주)

> **목표**: 플랫폼 지속가능성을 위한 다양한 수익원 확보

### 5.1 위치 기반 광고 시스템

**우선순위**: 🟡 Medium

기획서 참조: `광고유치 광고 수수료 모델`

```
광고 유형:
├── Native Feed Ads
│   ├── 피드 내 자연스러운 광고
│   ├── 레스토랑, 카페, 숙박 프로모션
│   └── CPC/CPM 모델
├── 지도 내 Sponsored POI
│   ├── 검색 결과 상위 노출
│   ├── 특별 마커 표시
│   └── 프로모션 정보 팝업
└── Push 알림 광고 (선택 사용자만)
    ├── 위치 기반 할인 쿠폰
    └── 이벤트 알림
```

**광고주 대시보드**:
```
├── 캠페인 생성
│   ├── 타겟 지역 설정
│   ├── 타겟 사용자 (여행자 vs 가이드)
│   ├── 예산 설정
│   └── 광고 소재 업로드
├── 성과 분석
│   ├── 노출수, 클릭수, CTR
│   ├── 전환 (예약/방문)
│   └── ROI 계산
└── 결제 관리
```

**예상 소요**: 4주

---

### 5.2 보험 상품 제휴

**우선순위**: 🟡 Medium

기획서 참조: `보험상품 제휴(BM)`

```
여행자 보험:
├── 기본 여행자 보험
│   ├── 여행 취소/중단
│   ├── 의료비
│   └── 수하물 분실
├── 맞춤형 보험 (Case by Case)
│   ├── 내 여행 구성에 따른 보험 커스텀
│   ├── 액티비티별 추가 보장
│   └── 고위험 활동 특약
└── 가이드 보험
    ├── 배상책임 보험
    └── 비즈니스 보험
```

**제휴 방식**:
```
1. API 연동 (예: 삼성화재, AXA 등)
   - 보험료 실시간 조회
   - 가입 프로세스 임베드
   - 수수료 수익 (10-20%)

2. 화이트라벨
   - Tourgether 브랜드 보험
   - 보험사 백엔드 사용
```

**예상 소요**: 4주 (파트너십 협상 제외)

---

### 5.3 데이터 비즈니스

**우선순위**: 🟢 Low (장기)

기획서 참조: `데이터 비지니스 제휴(BM)`

```
데이터 상품:
├── 여행 트렌드 리포트
│   ├── 인기 목적지 분석
│   ├── 시즌별 수요 패턴
│   └── 가격 동향
├── 지역 안전도 리포트
│   ├── 사용자 리뷰 기반
│   ├── 사고/분쟁 데이터
│   └── 실시간 안전 지수
└── 구매 대상
    ├── 여행사
    ├── 호텔/숙박업체
    ├── 보험사
    └── 정부/관광청
```

**예상 소요**: 6주+ (데이터 축적 필요)

---

### 5.4 로열티 프로그램

**우선순위**: 🟡 Medium

기획서 참조: `로열티 프로그램`

```
포인트 시스템:
├── Nav. 평판 Point
│   ├── 기능/성능적 혜택
│   ├── 현금처럼 사용 가능
│   └── 신뢰도 평판
├── Exp. 투어리즘 포인트
│   ├── 현금처럼 사용 가능
│   ├── Experience 결제 시 적립/사용
│   └── 등급별 적립률 차등
└── 활용
    ├── 가이드 교육 프로그램
    ├── 여행 패키지 설계 기능
    └── 오프라인 활용 (인터넷 없는 곳)
```

**예상 소요**: 3주

---

## 기술 아키텍처

### 현재 스택

```
Frontend:
├── React + TypeScript
├── Wouter (라우팅)
├── TanStack Query (상태관리)
├── Tailwind CSS + Radix UI
└── Vite (빌드)

Backend:
├── Node.js + Express
├── PostgreSQL (Neon)
├── Drizzle ORM
├── WebSocket (실시간)
└── PortOne (결제)

AI:
├── OpenAI GPT-5.1
└── Google Translate API

Infrastructure:
├── Replit (호스팅)
└── Object Storage (파일)
```

### Phase별 추가 기술

```
Phase 2:
├── Onfido/Jumio SDK (신원인증)
└── Twilio (SMS 인증)

Phase 4:
├── Sitata API (안전 정보)
├── OpenWeather API (날씨 알림)
├── Background Geolocation (React Native 또는 PWA)
└── FCM/APNs (푸시 알림)

Phase 5:
├── Google Ad Manager (광고)
├── 보험사 API
└── Analytics/BI 도구
```

---

## 우선순위 매트릭스

### Impact vs Effort

```
                    High Impact
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
    │  신원인증 (P2)     │  수익대시보드 (P1) │
    │  Safety (P4)       │  AI 플래너 (P1)    │
    │                    │  견적서 (P1)       │
    │                    │                    │
High├────────────────────┼────────────────────┤Low
Effort                   │                    Effort
    │                    │                    │
    │  데이터 비즈니스   │  리뷰 강화 (P2)    │
    │  보험 제휴         │  프로필 개선 (P2)  │
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
                    Low Impact
```

### 권장 실행 순서

1. **즉시 시작 (P1)**: 수익 대시보드 UI, AI Travel Planner 강화
2. **다음 분기 (P2)**: 신원인증, 리뷰 시스템
3. **6개월 내 (P3-P4)**: Buddy 매칭, Safety Dashboard
4. **1년 내 (P5)**: 광고, 보험, 데이터 비즈니스

---

## 리스크 및 고려사항

### 기술적 리스크

| 리스크 | 영향 | 대응 방안 |
|-------|------|----------|
| Onfido/Jumio 비용 | 높음 | 인증당 과금, 무료 티어 활용 후 확장 |
| GPS 배터리 소모 | 중간 | 적응형 추적 간격, 사용자 제어 |
| 실시간 알림 지연 | 중간 | 다중 채널 (WebSocket + Push) |
| 외부 API 의존성 | 높음 | 폴백 시스템, 캐싱 |

### 법적 고려사항

| 항목 | 설명 | 대응 |
|------|------|------|
| GDPR | EU 사용자 데이터 | 명시적 동의, 데이터 삭제권 |
| CCPA | 캘리포니아 | 데이터 접근/삭제 절차 |
| 위치 데이터 | 민감 정보 | 최소 수집, 암호화 저장 |
| 보험 규제 | 국가별 상이 | 파트너십 통한 우회 |

---

## 마일스톤 요약

| Phase | 기간 | 주요 산출물 | 예상 비용 |
|-------|------|------------|----------|
| P1 | 4-6주 | 수익 대시보드, AI 플래너, 견적서 | 개발 인력 |
| P2 | 6-8주 | 신원인증, 리뷰 시스템, 신뢰 프로필 | Onfido API 비용 |
| P3 | 8-10주 | Buddy 매칭, 가이드 매칭, 그룹 채팅 | 개발 인력 |
| P4 | 6-8주 | Safety Dashboard, GPS 추적 | Sitata API 비용 |
| P5 | 8-12주 | 광고, 보험, 데이터, 로열티 | 파트너십 비용 |

**총 예상 기간**: 8-12개월 (병렬 진행 시 단축 가능)

---

*이 문서는 기획 확정에 따라 지속적으로 업데이트됩니다.*
*마지막 수정: 2024년 12월*
