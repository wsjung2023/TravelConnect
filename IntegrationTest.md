# Tourgether Integration Test Plan

## 목적
Tourgether 플랫폼의 모든 핵심 기능을 실제 사용자 시나리오를 기반으로 통합 테스트하여 시스템의 안정성, 기능성, 그리고 사용자 경험을 검증합니다.

## 테스트 환경
- **환경**: Development & Staging
- **데이터베이스**: PostgreSQL (Neon)
- **브라우저**: Chrome, Safari, Firefox (최신 버전)
- **디바이스**: Desktop, Tablet, Mobile (iOS/Android)
- **언어**: 6개 언어 지원 (English, Korean, Japanese, Chinese, French, Spanish)

---

## 테스트 사용자 페르소나 (10명)

### 1. Yuki Tanaka (유키 타나카)
- **ID**: `test_user_001_yuki`
- **국적**: 일본 (Japan)
- **나이**: 24세
- **직업**: 대학원생 (문화인류학)
- **언어**: Japanese (primary), English (fluent)
- **여행 스타일**: 문화 탐방, 현지 음식, 사진 촬영
- **기술 수준**: 높음 (SNS 활성 사용자)
- **목표**: 서울에서 전통 문화 체험하고 친구들과 공유

### 2. Marcus Johnson
- **ID**: `test_user_002_marcus`
- **국적**: 미국 (USA)
- **나이**: 32세
- **직업**: 프리랜서 작가
- **언어**: English (native)
- **여행 스타일**: 배낭여행, 저렴한 숙소, 현지인과 교류
- **기술 수준**: 중상 (모바일 중심)
- **목표**: 동남아시아 여행 중 현지 가이드 찾기

### 3. Kim Min-ji (김민지)
- **ID**: `test_user_003_minji`
- **국적**: 한국 (South Korea)
- **나이**: 42세
- **직업**: 현지 투어 가이드
- **언어**: Korean (native), English (business level), Japanese (conversational)
- **여행 스타일**: 호스트/가이드
- **기술 수준**: 중간
- **목표**: 외국인 관광객에게 한국 문화 체험 제공 및 수익 창출

### 4. Sophie Dubois
- **ID**: `test_user_004_sophie`
- **국적**: 프랑스 (France)
- **나이**: 26세
- **직업**: 여행 인플루언서 (Instagram 50K followers)
- **언어**: French (native), English (fluent), Spanish (intermediate)
- **여행 스타일**: 럭셔리 & 트렌디, 사진/비디오 중심
- **기술 수준**: 매우 높음 (콘텐츠 크리에이터)
- **목표**: 독특한 여행 콘텐츠 제작 및 서비스 패키지 판매

### 5. Li Wei (李伟)
- **ID**: `test_user_005_liwei`
- **국적**: 중국 (China)
- **나이**: 36세
- **직업**: 비즈니스 컨설턴트
- **언어**: Chinese (native), English (business level)
- **여행 스타일**: 효율적, 비즈니스 미팅 + 관광
- **기술 수준**: 중간
- **목표**: 출장 중 짧은 시간에 효율적인 관광

### 6. Carlos & Maria Rodriguez
- **ID**: `test_user_006_carlos`, `test_user_007_maria`
- **국적**: 스페인 (Spain)
- **나이**: 62세, 60세 (은퇴 부부)
- **직업**: 은퇴자
- **언어**: Spanish (native), English (basic)
- **여행 스타일**: 여유로운 여행, 문화/역사 중심
- **기술 수준**: 낮음 (기본 스마트폰 사용)
- **목표**: 세계 여행하며 현지 친구 사귀기

### 7. Jack Thompson
- **ID**: `test_user_008_jack`
- **국적**: 호주 (Australia)
- **나이**: 22세
- **직업**: 대학생 (교환학생)
- **언어**: English (native)
- **여행 스타일**: 모험적, 저예산, 친구 사귀기
- **기술 수준**: 높음 (Gen Z)
- **목표**: 유럽 여행 중 현지 대학생들과 교류

### 8. Ana Silva
- **ID**: `test_user_009_ana`
- **국적**: 브라질 (Brazil)
- **나이**: 29세
- **직업**: 음식 블로거
- **언어**: Portuguese (native), English (fluent), Spanish (native-level)
- **여행 스타일**: 음식 탐방, 요리 클래스
- **기술 수준**: 높음 (블로거)
- **목표**: 각국 음식 체험 및 요리 배우기

### 9. Hans Schmidt
- **ID**: `test_user_010_hans`
- **국적**: 독일 (Germany)
- **나이**: 47세
- **직업**: 프로 사진작가
- **언어**: German (native), English (fluent)
- **여행 스타일**: 사진 촬영 중심, 일출/일몰
- **기술 수준**: 매우 높음 (전문가)
- **목표**: 여행 사진 포트폴리오 제작 및 사진 투어 가이드

### 10. Sarah Chen
- **ID**: `test_user_011_sarah`
- **국적**: 캐나다 (Canada)
- **나이**: 38세
- **직업**: 마케팅 매니저 (2명 자녀)
- **언어**: English (native), Chinese (conversational)
- **여행 스타일**: 가족 여행, 안전 중시, 계획적
- **기술 수준**: 중상
- **목표**: 아이들과 함께 교육적이고 안전한 여행

---

## 테스트 시나리오별 기능 매핑

### A. Authentication & Onboarding (인증 및 온보딩)
**테스트 기능:**
- 회원가입 (이메일/비밀번호)
- Google OAuth 로그인
- Replit Auth 로그인
- JWT 토큰 생성 및 검증
- 온보딩 프로세스
- 프로필 설정 (언어, 관심사, 위치)

**담당 페르소나:**
- Yuki, Marcus, Sophie, Jack (신규 가입)
- Min-ji, Li Wei (기존 사용자 로그인)

**테스트 케이스:**

#### TC-A1: 신규 회원가입 (Yuki)
1. 랜딩 페이지 접속
2. "Sign Up" 버튼 클릭
3. 이메일: `yuki.tanaka@test.com`, 비밀번호 입력
4. 회원가입 완료
5. 온보딩 모달 표시 확인
6. 언어 선택: Japanese, English
7. 관심사 선택: Culture, Food, Photography
8. 위치 입력: Tokyo, Japan
9. 온보딩 완료 확인

**예상 결과:**
- 사용자 계정 생성 성공
- JWT 토큰 발급 및 저장
- 프로필 정보 DB 저장
- 홈 화면으로 리다이렉트

#### TC-A2: Google OAuth 로그인 (Marcus)
1. 랜딩 페이지 접속
2. "Continue with Google" 클릭
3. Google 계정 선택: `marcus.johnson@test.com`
4. 권한 승인
5. 온보딩 건너뛰기 (선택)
6. 홈 화면 진입

**예상 결과:**
- OAuth 인증 성공
- 사용자 프로필 자동 생성
- 세션 유지

#### TC-A3: 기존 사용자 로그인 (Min-ji)
1. 랜딩 페이지 접속
2. "Log In" 버튼 클릭
3. 이메일: `kim.minji@test.com`, 비밀번호 입력
4. 로그인 성공
5. 이전 세션 정보 복원

**예상 결과:**
- JWT 토큰 검증 성공
- 기존 프로필 로드
- 알림, 메시지 등 동기화

---

### B. Profile Management (프로필 관리)
**테스트 기능:**
- 프로필 편집 (이름, 소개, 사진)
- 언어 설정 변경
- 관심사 업데이트
- 위치 설정 (Google Places API)
- Public Portfolio URL 생성
- Open to Meet 토글

**담당 페르소나:**
- Min-ji (호스트 프로필 완성)
- Sophie (인플루언서 포트폴리오)
- Hans (사진작가 포트폴리오)

**테스트 케이스:**

#### TC-B1: 호스트 프로필 완성 (Min-ji)
1. Profile 탭 클릭
2. "Edit Profile" 버튼 클릭
3. 프로필 사진 업로드 (JPG, 2MB)
4. Display Name: "Min-ji Kim"
5. Bio: "Experienced Seoul guide specializing in traditional Korean culture"
6. 언어 추가: Korean, English, Japanese
7. 관심사: Culture, Food, History
8. 위치: Seoul, South Korea (Google Places)
9. Public Profile URL: `seoul-guide-minji`
10. "Open to Meet" 활성화
11. 저장

**예상 결과:**
- 프로필 정보 업데이트 성공
- 이미지 업로드 및 썸네일 생성
- Public URL 접근 가능: `/portfolio/seoul-guide-minji`
- "Open to Meet" 상태 다른 사용자에게 표시

#### TC-B2: 인플루언서 포트폴리오 (Sophie)
1. Profile 편집 모달 열기
2. 프로필 사진 + 배너 이미지 업로드
3. Bio에 Instagram 링크 추가
4. 서비스 카테고리 설정: "Content Creator"
5. Public Portfolio URL: `sophie-travel-influencer`
6. 포트폴리오 페이지 접속
7. 게시물, 타임라인, 서비스 패키지 표시 확인

**예상 결과:**
- 공개 포트폴리오 접근 가능
- SEO 메타태그 적용 (Open Graph, Twitter Card)
- 소셜 미디어 공유 프리뷰 정상 표시

---

### C. Map & Location Features (지도 및 위치 기능)
**테스트 기능:**
- Google Maps 통합
- 사용자 위치 기반 POI 표시
- 커스텀 마커 (posts, experiences, POI)
- 클러스터링 (zoom level 기반)
- 위치 검색 (Google Places API)
- 지도에서 직접 피드 생성

**담당 페르소나:**
- Li Wei (효율적 관광 계획)
- Sarah (가족 여행지 탐색)
- Jack (친구 사귀기 위한 핫플 탐색)

**테스트 케이스:**

#### TC-C1: 위치 기반 POI 탐색 (Li Wei)
1. 홈 화면 (지도) 접속
2. 현재 위치: Seoul, Gangnam (위치 권한 허용)
3. POI Filters 클릭
4. "Restaurant", "Shopping Mall" 선택
5. 지도에 해당 POI 마커 표시 확인
6. 클러스터링 동작 확인 (줌 아웃 시)
7. 특정 레스토랑 마커 클릭
8. InfoWindow 정보 확인
9. "Nearby Experiences" 패널 열기
10. 필터: "All" → "Experiences" → "Posts"
11. 경험 카드 클릭 → 상세 페이지

**예상 결과:**
- Google Maps 정상 로드
- POI 필터링 작동
- 마커 클러스터링 zoom level 반응
- InfoWindow 정보 정확
- Nearby 패널 필터 작동

#### TC-C2: 위치 검색 및 피드 생성 (Sarah)
1. 지도 상단 검색창 클릭
2. "Gyeongbokgung Palace, Seoul" 검색
3. 검색 결과 선택
4. 지도가 해당 위치로 이동
5. 위치 마커 클릭
6. "Create Post Here" 옵션 클릭
7. 포스트 생성 모달 표시
8. 제목: "Beautiful palace visit with kids"
9. 사진 업로드 (3장)
10. 태그: #family #culture #seoul
11. 게시

**예상 결과:**
- Places API 검색 정상 작동
- 지도 자동 이동 및 마커 생성
- 위치 정보 포스트에 자동 포함
- 포스트가 Feed 및 지도에 표시

---

### D. Posts & Feed (게시물 및 피드)
**테스트 기능:**
- 포스트 생성 (텍스트, 이미지, 비디오)
- EXIF 데이터 추출 (위치, 촬영 시간)
- 위치 태그
- 해시태그
- 좋아요/댓글
- 가상화된 피드 (무한 스크롤)
- 포스트 필터링 (All/Posts/Experiences)
- 포스트 검색 (키워드)

**담당 페르소나:**
- Yuki (사진 중심 포스트)
- Ana (음식 블로그 포스트)
- Hans (전문 사진 포스트)

**테스트 케이스:**

#### TC-D1: EXIF 데이터 기반 포스트 (Yuki)
1. Feed 탭 → "Create Post" 버튼
2. 제목: "Amazing temple visit"
3. 사진 업로드 (EXIF 포함 JPEG, 5MB)
   - 촬영 시간: 2024-11-20 14:30
   - GPS: 37.5665° N, 126.9780° E
4. EXIF 자동 추출 확인
5. 위치 자동 표시: Seoul, South Korea
6. 해시태그: #temple #korea #culture
7. 게시

**예상 결과:**
- EXIF 데이터 추출 성공
- 위치 자동 태그
- 촬영 시간 표시
- 지도에 마커 생성
- Feed에 포스트 표시

#### TC-D2: 비디오 포스트 + 다국어 (Ana)
1. Feed → "Create Post"
2. 제목: "Making kimchi with locals!"
3. 비디오 업로드 (MP4, 10MB)
4. 위치 수동 입력: Seoul, Korea
5. 언어: Portuguese로 작성
6. 태그: #food #cooking #kimchi
7. 게시
8. 다른 사용자 (Marcus)가 포스트 확인
9. 자동 번역 버튼 표시 확인 (English)

**예상 결과:**
- 비디오 업로드 성공
- 썸네일 자동 생성
- 다국어 포스트 표시
- 번역 기능 제공 (향후)

#### TC-D3: 좋아요 & 댓글 (Jack → Yuki의 포스트)
1. Feed에서 Yuki의 temple 포스트 발견
2. 좋아요 ❤️ 클릭
3. 댓글 작성: "Great photo! Which temple is this?"
4. 댓글 게시
5. Yuki에게 알림 전송 확인

**예상 결과:**
- 좋아요 카운트 증가
- 댓글 실시간 표시
- 알림 시스템 작동 (Yuki에게 알림)

---

### E. Timeline & Trip Planning (타임라인 및 여행 계획)
**테스트 기능:**
- 타임라인 생성
- 미디어 import (EXIF 기반 날짜 그룹핑)
- 일별 포스트 정리
- 타임라인 복제
- 공개/비공개 설정
- 타임라인 공유

**담당 페르소나:**
- Yuki (여행 타임라인 생성)
- Hans (사진 포트폴리오 타임라인)
- Sarah (가족 여행 기록)

**테스트 케이스:**

#### TC-E1: 타임라인 생성 및 미디어 Import (Yuki)
1. Timeline 탭 → "Create Timeline"
2. 제목: "My Seoul Adventure 2024"
3. 설명: "5 days exploring Korean culture"
4. 날짜: 2024-11-18 ~ 2024-11-22
5. 공개 설정: Public
6. "Import Media" 클릭
7. 사진 15장 업로드 (EXIF 포함)
8. EXIF 날짜 기반 자동 그룹핑 확인
   - Day 1: 3장
   - Day 2: 5장
   - Day 3: 4장
   - Day 4: 3장
9. 각 날짜별 위치 마커 지도에 표시
10. 타임라인 저장

**예상 결과:**
- 미디어 일별 자동 정리
- 각 사진의 GPS 기반 지도 마커
- 타임라인 페이지 생성
- Public 접근 가능

#### TC-E2: 타임라인 복제 및 수정 (Hans)
1. 기존 "Iceland Photography Tour" 타임라인 선택
2. "Clone Timeline" 버튼 클릭
3. 새 제목: "Iceland Photography Tour 2025"
4. 일부 사진 삭제
5. 새 사진 추가
6. 설명 업데이트
7. 저장

**예상 결과:**
- 복제 성공
- 독립적인 타임라인 생성
- 원본 타임라인 영향 없음

---

### F. AI-Powered Features (AI 기능)
**테스트 기능:**
- **CineMap**: EXIF 기반 여행 비디오 스토리보드 생성
- **Mini Concierge**: 1시간 활동 계획 생성
- **AI Concierge**: 여행 어시스턴트 챗봇

**담당 페르소나:**
- Yuki (CineMap 사용)
- Li Wei (Mini Concierge 사용)
- Marcus (AI Concierge 사용)

**테스트 케이스:**

#### TC-F1: CineMap 비디오 생성 (Yuki)
1. Timeline → "My Seoul Adventure 2024" 선택
2. "CineMap" 탭 클릭
3. "Create Video" 버튼
4. 타임라인 선택
5. 언어: Japanese
6. "Generate" 클릭
7. AI 처리 중... (status: pending → generating)
8. 스토리보드 생성 완료 (30초 예상)
9. 비디오 프리뷰 확인
10. 다운로드

**예상 결과:**
- OpenAI API 호출 성공
- EXIF 데이터 기반 클러스터링
- 시네마틱 스토리보드 생성
- 비디오 파일 생성 (.mp4)
- 다운로드 가능

#### TC-F2: Mini Concierge 활용 (Li Wei)
1. 홈 화면 → "What to do for 1 hour?" 버튼 (보라색)
2. Mini Concierge 모달 열림
3. 현재 위치: Gangnam, Seoul (자동 감지)
4. 시간: 14:00
5. 예산: $20
6. 분위기: "Relaxing"
7. "Generate Plan" 클릭
8. AI가 3개 활동 제안:
   - Plan 1: 카페 방문 + 공원 산책
   - Plan 2: 박물관 방문
   - Plan 3: 한강 산책
9. Plan 1 선택
10. 지도에 경로 표시
11. "Start Plan" 클릭
12. 각 spot 체크인 기능 사용

**예상 결과:**
- OpenAI GPT-5.1 활용
- 위치/시간/예산 기반 맞춤 추천
- 지도 통합
- 체크인 시스템 작동

#### TC-F3: AI Concierge 대화 (Marcus)
1. Chat 탭 → "AI Concierge" 채널
2. 메시지 입력: "I'm in Seoul for 3 days. What should I do?"
3. AI 응답 확인
4. Follow-up: "I love street food. Any recommendations?"
5. AI가 주변 음식점 추천
6. "Book an experience" 링크 클릭
7. 경험 예약 페이지로 이동

**예상 결과:**
- 실시간 AI 응답
- 사용자 프로필 기반 추천
- 주변 경험 데이터 통합
- 예약 시스템 연계

---

### G. Chat & Real-time Communication (채팅 및 실시간 통신)
**테스트 기능:**
- 3-panel 채팅 인터페이스
- 채널 (토픽 기반)
- DM (1:1 대화)
- 실시간 WebSocket
- 메시지 번역
- 스레드 댓글
- 읽음 표시

**담당 페르소나:**
- Carlos & Maria (DM 번역 사용)
- Jack & Marcus (채널 채팅)
- Sophie → Min-ji (호스트 문의 DM)

**테스트 케이스:**

#### TC-G1: 채널 채팅 (Jack & Marcus)
1. Chat 탭 → "Seoul Travelers" 채널 생성
2. Jack이 초대 링크 공유
3. Marcus가 채널 참여
4. Jack: "Hey! Anyone exploring Hongdae tonight?"
5. Marcus (실시간 수신): "I'm in! What time?"
6. Jack: "How about 8pm at exit 9?"
7. Marcus: "Perfect, see you there!"
8. 읽음 표시 확인

**예상 결과:**
- WebSocket 실시간 메시지
- 채널 멤버 관리
- 읽음 상태 동기화

#### TC-G2: DM 번역 (Carlos → Min-ji)
1. Carlos가 Min-ji 프로필 방문
2. "Send Message" 버튼 클릭
3. DM 작성 (Spanish):
   "Hola! Me gustaría reservar un tour de cultura coreana."
4. 메시지 전송
5. Min-ji가 메시지 수신 (Korean UI)
6. 메시지에 마우스 호버 → 번역 아이콘 (🌐) 표시
7. 번역 아이콘 클릭
8. Google Translate API 호출
9. 번역 결과 표시 (Korean):
   "안녕하세요! 한국 문화 투어를 예약하고 싶습니다."
10. Min-ji가 Korean으로 답장
11. Carlos가 번역 기능으로 확인

**예상 결과:**
- 다국어 메시지 송수신
- 실시간 번역 (Google Translate API)
- 번역 캐싱 (중복 호출 방지)
- UI 언어 설정 반영

#### TC-G3: 스레드 댓글 (Sophie → Post)
1. Feed에서 인기 포스트 발견
2. 댓글 3개 이미 존재
3. "2 replies" 클릭
4. 스레드 패널 열림
5. 댓글 확인
6. 새 댓글 작성: "Love this spot!"
7. 실시간 업데이트 확인

**예상 결과:**
- 스레드 UI 표시
- 댓글 카운트 업데이트
- WebSocket 실시간 동기화

---

### H. Experiences & Booking (경험 및 예약)
**테스트 기능:**
- 경험 생성 (호스트)
- 슬롯 관리 (시간/가격/정원)
- 경험 검색
- 예약 시스템
- 리뷰 작성
- 호스트 대시보드

**담당 페르소나:**
- Min-ji (호스트 - 경험 생성)
- Yuki (여행자 - 예약)
- Sophie (리뷰 작성)

**테스트 케이스:**

#### TC-H1: 경험 생성 및 슬롯 관리 (Min-ji)
1. Profile → "Host" 탭
2. "Create Experience" 버튼
3. 경험 정보 입력:
   - 제목: "Traditional Korean Temple Tour"
   - 카테고리: Tours
   - 설명: "Explore ancient temples with a local expert"
   - 가격: $50/person
   - 최대 인원: 8명
   - 위치: Seoul, South Korea
4. 이미지 업로드 (5장)
5. 저장
6. "Manage Slots" 클릭
7. 슬롯 생성:
   - 날짜: 2024-12-01
   - 시간: 09:00 - 12:00
   - 정원: 8명
   - 상태: Available
8. Bulk 생성: 매주 토요일 09:00-12:00 (4주)
9. 저장

**예상 결과:**
- 경험 페이지 생성
- 슬롯 캘린더 표시
- 호스트 대시보드에 표시

#### TC-H2: 경험 검색 및 예약 (Yuki)
1. Marketplace 탭 (또는 Map의 Nearby)
2. 검색: "temple tour seoul"
3. 필터: Category = Tours, Price < $100
4. Min-ji의 "Traditional Korean Temple Tour" 발견
5. 경험 클릭 → 상세 페이지
6. 리뷰 확인 (평균 4.8/5.0)
7. "Book Now" 버튼
8. 슬롯 선택: 2024-12-01 09:00
9. 인원: 2명
10. 총 가격: $100
11. 결제 (테스트 모드)
12. 예약 확인 이메일

**예상 결과:**
- 검색 결과 정확
- 필터링 작동
- 예약 시스템 작동
- 슬롯 정원 감소 (8 → 6)
- 호스트에게 알림

#### TC-H3: 리뷰 작성 (Sophie)
1. Profile → "Bookings" → 완료된 예약
2. "Traditional Korean Temple Tour" 선택
3. "Write Review" 버튼
4. 평점: ⭐⭐⭐⭐⭐ (5/5)
5. 리뷰 작성:
   "Amazing experience! Min-ji is so knowledgeable and friendly."
6. 사진 업로드 (3장)
7. 제출

**예상 결과:**
- 리뷰 저장
- 경험 페이지에 표시
- 평균 평점 업데이트
- Min-ji에게 알림

---

### I. Service Templates & Purchase Proxy (서비스 템플릿 및 구매 대행)
**테스트 기능:**
- 서비스 템플릿 생성 (인플루언서)
- 서비스 패키지 관리
- 구매 요청 생성
- 견적 제공
- 주문 관리

**담당 페르소나:**
- Sophie (인플루언서 - 서비스 패키지)
- Marcus (구매 대행 요청)

**테스트 케이스:**

#### TC-I1: 서비스 패키지 생성 (Sophie)
1. Profile → "Services" 탭
2. "Create Service Template" 버튼
3. 템플릿 정보:
   - 이름: "Instagram Content Package"
   - 카테고리: Content Creation
   - 설명: "10 posts, 5 stories, location tagging"
   - 기본 가격: $500
4. 저장
5. "Create Package" 버튼
6. 패키지 상세:
   - 이름: "Seoul Content Week"
   - 기간: 7일
   - 포함 사항: 사진 촬영, 편집, 게시
   - 가격: $1,200
7. 저장

**예상 결과:**
- 서비스 템플릿 생성
- 패키지 Public Portfolio에 표시
- 예약 가능 상태

#### TC-I2: 구매 대행 요청 (Marcus)
1. Purchase Proxy 페이지
2. "Create Request" 버튼
3. 요청 정보:
   - 상품명: "Traditional Korean Pottery"
   - 예상 가격: $80
   - 수량: 2개
   - 배송지: USA, California
   - 추가 설명: "Handmade celadon pottery"
4. 제출
5. 요청 상태: Pending
6. 관리자/호스트가 견적 제공
7. Marcus 확인 및 승인
8. 주문 상태: Confirmed

**예상 결과:**
- 요청 생성 성공
- 알림 시스템 작동
- 견적 관리 기능
- 주문 추적 가능

---

### J. Social Features (소셜 기능)
**테스트 기능:**
- 팔로우/언팔로우
- 팔로워/팔로잉 목록
- 알림 시스템 (6가지 타입)
- Open to Meet
- 사용자 검색

**담당 페르소나:**
- Jack (친구 사귀기)
- Yuki (팔로우 시스템)
- Ana (알림 확인)

**테스트 케이스:**

#### TC-J1: 팔로우 시스템 (Jack → Marcus)
1. Feed에서 Marcus의 포스트 발견
2. 프로필 사진 클릭 → 프로필 페이지
3. "Follow" 버튼 클릭
4. Marcus에게 알림 전송
5. Marcus의 팔로워 카운트 +1
6. Jack의 피드에 Marcus 포스트 표시
7. 언팔로우 테스트

**예상 결과:**
- 팔로우 관계 생성
- 알림 전송
- 카운트 업데이트
- 피드 알고리즘 반영

#### TC-J2: Open to Meet (Jack & Yuki)
1. Jack이 "Open to Meet" 활성화
2. Yuki가 "Open to Meet" 활성화
3. 홈 화면 → "Nearby Travelers" 섹션
4. Jack과 Yuki 서로 표시
5. Jack이 Yuki에게 DM 전송
6. "Hi! I saw you're open to meet. Want to grab coffee?"
7. Yuki 수락
8. 만남 계획

**예상 결과:**
- Open to Meet 사용자 실시간 표시
- 위치 기반 매칭
- DM 연계

#### TC-J3: 알림 시스템 (Ana)
1. Ana가 포스트 작성
2. 다양한 알림 수신:
   - **Like**: Jack이 포스트 좋아요
   - **Comment**: Sophie가 댓글 작성
   - **Follow**: Marcus가 팔로우
   - **Mention**: Hans가 포스트에서 @Ana 멘션
   - **Booking**: Min-ji 경험 예약 완료
   - **Message**: Carlos DM 전송
3. 알림 아이콘 (🔔) 배지 표시
4. 알림 패널 열기
5. 각 알림 클릭 → 해당 페이지 이동

**예상 결과:**
- 6가지 알림 타입 작동
- 실시간 배지 업데이트
- 알림 클릭 내비게이션

---

### K. Admin Panel (관리자 패널)
**테스트 기능:**
- Commerce 통계 대시보드
- 포스트 관리
- 시스템 설정
- DB Admin 인터페이스
- SQL 쿼리 실행

**담당 페르소나:**
- Min-ji (admin 권한)

**테스트 케이스:**

#### TC-K1: Commerce 대시보드 (Min-ji)
1. Admin 패널 접속
2. Commerce Dashboard 확인:
   - 총 수익: $12,500
   - 예약 건수: 85건
   - 활성 호스트: 23명
   - 평균 평점: 4.7/5.0
3. 차트 확인 (최근 30일)
4. 호스트별 수익 순위

**예상 결과:**
- 실시간 통계 표시
- 차트 렌더링
- 데이터 정확성

#### TC-K2: DB Admin (Min-ji)
1. Admin → "Database" 탭
2. 테이블 목록 확인
3. "users" 테이블 선택
4. 그리드 뷰로 데이터 확인
5. 필터: email LIKE '%test%'
6. SQL 쿼리 실행:
   ```sql
   SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '7 days';
   ```
7. 결과 확인: 최근 7일 포스트 수

**예상 결과:**
- 안전한 SQL 실행
- 그리드 뷰 작동
- 실시간 통계

---

## 통합 테스트 시나리오 (End-to-End)

### 시나리오 1: 완전한 여행 경험 (Yuki의 서울 여행)
**목표**: 회원가입부터 타임라인 생성, CineMap 비디오 제작까지 전체 여정 테스트

1. **Day 0 - 회원가입 및 준비**
   - 회원가입 (이메일)
   - 프로필 설정 (일본어, 영어)
   - 관심사: 문화, 음식, 사진
   - "Open to Meet" 활성화

2. **Day 1 - 서울 도착**
   - 지도에서 호텔 위치 확인
   - Mini Concierge로 저녁 계획 생성
   - 추천 레스토랑 방문
   - 포스트 작성 (사진 + EXIF)
   - Jack (다른 여행자) 팔로우

3. **Day 2 - 경험 예약**
   - Min-ji의 "Traditional Temple Tour" 검색
   - 예약 (12월 1일 09:00)
   - DM으로 Min-ji에게 질문
   - AI Concierge에게 서울 팁 요청

4. **Day 3 - 투어 참여**
   - 경험 참여 (Min-ji 가이드)
   - 사진 15장 촬영 (EXIF 포함)
   - 리뷰 작성 (5성)
   - Sophie (인플루언서) DM 교환

5. **Day 4-5 - 자유 여행**
   - 매일 포스트 작성
   - 다른 사용자 콘텐츠 좋아요/댓글
   - Open to Meet으로 현지인과 커피
   - 쇼핑 구매 대행 요청

6. **Day 6 - 귀국 후**
   - 타임라인 생성 "My Seoul Adventure"
   - 사진 import (EXIF 기반 자동 정리)
   - CineMap 비디오 생성
   - 비디오 다운로드 및 Instagram 공유
   - Public Portfolio 완성

**예상 결과**:
- 모든 핵심 기능 사용
- 완전한 사용자 여정 경험
- 데이터 일관성 유지
- 시스템 안정성 확인

---

### 시나리오 2: 호스트 비즈니스 운영 (Min-ji의 가이드 사업)
**목표**: 호스트 관점에서 경험 생성, 예약 관리, 수익 추적 전 과정 테스트

1. **초기 설정**
   - 호스트 프로필 완성
   - Public Portfolio URL 설정
   - 서비스 카테고리 설정

2. **경험 생성**
   - 3개 경험 생성:
     - Temple Tour ($50, 3시간)
     - Cooking Class ($80, 4시간)
     - Night Market Walk ($30, 2시간)
   - 각 경험별 슬롯 생성 (4주치)

3. **예약 관리**
   - Yuki의 예약 수락
   - Marcus의 예약 요청 확인
   - Sophie와 DM 상담
   - 슬롯 시간 조정

4. **투어 진행**
   - 예약 확인
   - 투어 완료 체크
   - 리뷰 수신

5. **수익 관리**
   - Admin 대시보드에서 수익 확인
   - 월별 통계 분석
   - 서비스 가격 조정

**예상 결과**:
- 호스트 워크플로우 완성
- 예약 시스템 안정성
- 수익 추적 정확성

---

### 시나리오 3: 인플루언서 비즈니스 (Sophie의 콘텐츠 제작)
**목표**: 인플루언서의 서비스 판매, 포트폴리오 관리, 클라이언트 관리 테스트

1. **포트폴리오 구축**
   - Public Portfolio 완성
   - 서비스 템플릿 생성
   - 서비스 패키지 3개 등록

2. **콘텐츠 마케팅**
   - 매일 포스트 작성 (사진/비디오)
   - 해시태그 전략
   - 타임라인 생성 (여행별)
   - CineMap 비디오 제작

3. **클라이언트 관리**
   - 서비스 문의 DM 수신
   - 견적 제공
   - 계약 확정
   - 작업 진행

4. **수익 창출**
   - 서비스 판매 완료
   - 리뷰 수집
   - 포트폴리오 업데이트

**예상 결과**:
- 인플루언서 비즈니스 모델 검증
- 서비스 판매 프로세스 완성
- 포트폴리오 시스템 안정성

---

### 시나리오 4: Serendipity Protocol - 우연한 만남 (Jack & Yuki)
**목표**: 근접 여행자 발견, 공동 퀘스트 수행, 하이라이트 생성 전 과정 테스트

1. **초기 설정**
   - Jack: 프로필 → Serendipity Protocol 활성화
   - Yuki: 프로필 → Serendipity Protocol 활성화
   - 둘 다 서울 명동 지역 방문 중

2. **위치 기반 매칭**
   - Jack: Mini Concierge에서 "명동 맛집" 플랜 선택
   - Yuki: 동일 지역에서 유사한 태그 (음식, 사진)
   - 시스템: 150m 반경 내 유사 관심사 감지
   - 양쪽에 Serendipity 알림 전송

3. **퀘스트 생성 및 수락**
   - 시스템: "야경 인생샷 3컷 미션" 퀘스트 생성
   - Jack: 퀘스트 알림 수신 → 수락
   - Yuki: 퀘스트 알림 수신 → 수락
   - 퀘스트 상태: "in_progress"

4. **퀘스트 수행**
   - Jack: 사진 2장 업로드
   - Yuki: 사진 2장 업로드
   - 5분 제한 시간 내 완료
   - 양쪽 모두 "완료" 제출

5. **하이라이트 생성**
   - 시스템: 공동 하이라이트 자동 생성
   - 참가자들에게 완료 알림
   - 프로필에서 하이라이트 확인

**예상 결과**:
- 위치 기반 매칭 정확성
- 퀘스트 라이프사이클 완성
- 실시간 알림 전송
- 공동 하이라이트 생성 성공

---

### L. Serendipity Protocol (우연한 만남 프로토콜)
**테스트 기능:**
- 위치 업데이트 및 트래킹
- Serendipity 활성화/비활성화 토글
- 근접 사용자 매칭 (150m 반경)
- 퀘스트 생성/수락/거절/완료
- 공동 하이라이트 생성
- 알림 시스템

**담당 페르소나:**
- Jack, Yuki (동일 지역 여행자)
- Marcus, Li Wei (비즈니스 관광객)
- Carlos & Maria (커플 여행자)

**테스트 케이스:**

#### TC-L1: Serendipity 토글 (Jack)
1. 프로필 페이지 접속
2. Serendipity Protocol 토글 확인
3. 활성화 → 토스트 메시지 "근처의 비슷한 여행자를 발견하면 알려드릴게요!"
4. 비활성화 → 토스트 메시지 "Serendipity 기능이 꺼졌습니다."
5. 서버 측 `serendipityEnabled` 상태 확인

**예상 결과:**
- UI 토글 즉시 반응
- 서버 상태 동기화
- 토스트 메시지 표시

#### TC-L2: 위치 업데이트 (Yuki)
1. Mini Concierge에서 플랜 체크인
2. 시스템이 자동으로 위치 업데이트 (API 호출)
3. `lastLatitude`, `lastLongitude`, `lastLocationUpdatedAt` 업데이트 확인

**예상 결과:**
- 위치 정보 DB 저장
- 타임스탬프 갱신

#### TC-L3: 근접 매칭 (Jack & Yuki)
1. Jack: 위도 37.5665, 경도 126.978에서 플랜 체크인
2. Yuki: 위도 37.5667, 경도 126.979에서 플랜 체크인 (약 50m 거리)
3. 둘 다 동일한 플랜 ID 또는 유사 태그
4. 시스템: `/api/serendipity/check` 호출
5. 매칭 결과: `matched: true`, `nearbyUsers: [Yuki]`

**예상 결과:**
- 150m 반경 내 사용자 감지
- 유사 관심사 매칭
- 퀘스트 자동 생성

#### TC-L4: 퀘스트 라이프사이클 (Jack)
1. 퀘스트 알림 수신
2. `/api/serendipity/quest/{id}/accept` 호출
3. 상태: "invited" → "accepted"
4. 다른 참가자도 수락 시: 퀘스트 "in_progress"
5. 결과 제출: `/api/serendipity/quest/{id}/complete`
6. 모든 참가자 완료 시: 퀘스트 "completed"

**예상 결과:**
- 상태 전이 정확성
- 참가자 동기화
- 완료 조건 검증

#### TC-L5: 퀘스트 거절 (Marcus)
1. 퀘스트 알림 수신
2. "거절" 클릭
3. `/api/serendipity/quest/{id}/decline` 호출
4. 참가자 상태: "declined"
5. 다른 참가자에게 영향 없음

**예상 결과:**
- 개별 거절 처리
- 퀘스트 유지 (다른 참가자 있을 경우)

#### TC-L6: 하이라이트 생성 (Jack & Yuki)
1. 퀘스트 완료 (둘 다 사진 업로드)
2. 시스템: `quest_highlights` 테이블에 레코드 생성
3. 하이라이트 미디어 URL 저장
4. 메타데이터: 참가자 정보, 사진 목록, 위치
5. 참가자들에게 완료 알림

**예상 결과:**
- 하이라이트 자동 생성
- 미디어 통합
- 참가자 정보 포함

#### TC-L7: 내 퀘스트 목록 (Yuki)
1. `/api/serendipity/quests` 호출
2. 진행 중, 완료된 퀘스트 목록 반환
3. 각 퀘스트별 상태, 참가자, 하이라이트 정보

**예상 결과:**
- 사용자별 퀘스트 필터링
- 상태별 정렬
- 연관 데이터 포함

---

## 테스트 체크리스트

### 기능별 테스트 항목

#### Authentication
- [ ] 이메일/비밀번호 회원가입
- [ ] Google OAuth 로그인
- [ ] Replit Auth 로그인
- [ ] JWT 토큰 생성 및 검증
- [ ] 세션 유지
- [ ] 로그아웃
- [ ] 비밀번호 재설정

#### Profile
- [ ] 프로필 편집
- [ ] 프로필 사진 업로드
- [ ] 언어 설정
- [ ] 관심사 설정
- [ ] Public Portfolio URL
- [ ] Open to Meet

#### Map
- [ ] Google Maps 로드
- [ ] 사용자 위치 표시
- [ ] POI 마커
- [ ] 클러스터링
- [ ] InfoWindow
- [ ] 위치 검색

#### Posts
- [ ] 포스트 생성 (텍스트)
- [ ] 이미지 업로드
- [ ] 비디오 업로드
- [ ] EXIF 추출
- [ ] 위치 태그
- [ ] 해시태그
- [ ] 좋아요
- [ ] 댓글
- [ ] 가상화 피드

#### Timeline
- [ ] 타임라인 생성
- [ ] 미디어 import
- [ ] 일별 정리
- [ ] 타임라인 복제
- [ ] 공개/비공개

#### AI Features
- [ ] CineMap 비디오 생성
- [ ] Mini Concierge 계획
- [ ] AI Concierge 대화

#### Chat
- [ ] 채널 생성
- [ ] DM 전송
- [ ] 실시간 메시지
- [ ] 메시지 번역
- [ ] 스레드 댓글
- [ ] 읽음 표시

#### Experiences
- [ ] 경험 생성
- [ ] 슬롯 관리
- [ ] 예약 시스템
- [ ] 리뷰 작성

#### Social
- [ ] 팔로우/언팔로우
- [ ] 알림 시스템
- [ ] Open to Meet

#### Admin
- [ ] Commerce 대시보드
- [ ] DB Admin
- [ ] SQL 쿼리

---

## 성능 테스트

### Load Testing
- **목표**: 동시 사용자 100명 처리
- **시나리오**:
  - 100명이 동시에 Feed 로드
  - 50명이 동시에 포스트 작성
  - WebSocket 연결 100개 유지
- **측정 지표**:
  - 응답 시간 < 2초
  - 에러율 < 1%
  - WebSocket 지연 < 500ms

### Database Performance
- **쿼리 최적화**:
  - N+1 문제 확인
  - 인덱스 활용
  - 쿼리 실행 계획 분석
- **목표**:
  - 평균 쿼리 시간 < 100ms
  - 복잡한 쿼리 < 500ms

---

## 보안 테스트

### Authentication Security
- [ ] JWT 토큰 유효성 검증
- [ ] 만료된 토큰 거부
- [ ] SQL Injection 방어
- [ ] XSS 방어
- [ ] CSRF 방어

### File Upload Security
- [ ] MIME 타입 검증
- [ ] 파일 크기 제한
- [ ] 악성 파일 차단
- [ ] UUID 기반 파일명

### API Security
- [ ] Rate Limiting
- [ ] 권한 검증
- [ ] 입력 검증
- [ ] SQL 쿼리 안전성

---

## 브라우저 & 디바이스 호환성

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive 디자인
- [ ] Touch 제스처

### 화면 크기
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667, 428x926)

---

## 다국어 테스트

### 언어별 테스트
- [ ] English
- [ ] Korean
- [ ] Japanese
- [ ] Chinese
- [ ] French
- [ ] Spanish

### 번역 품질
- [ ] UI 번역 완성도
- [ ] 폰트 지원
- [ ] 날짜/시간 형식
- [ ] 통화 표시

---

## 버그 리포팅 템플릿

```markdown
### Bug Report

**제목**: [간단한 버그 설명]

**테스트 케이스**: TC-X1

**페르소나**: Yuki Tanaka

**재현 단계**:
1. 
2. 
3. 

**예상 결과**:
[무엇이 일어나야 하는가]

**실제 결과**:
[무엇이 일어났는가]

**스크린샷**:
[스크린샷 첨부]

**환경**:
- 브라우저: Chrome 120
- OS: macOS 14
- 디바이스: Desktop

**우선순위**: Critical / High / Medium / Low

**추가 정보**:
[콘솔 에러, 로그 등]
```

---

## 테스트 실행 계획

### Phase 1: 기본 기능 (Week 1)
- Authentication (TC-A1 ~ TC-A3)
- Profile (TC-B1 ~ TC-B2)
- Map (TC-C1 ~ TC-C2)

### Phase 2: 콘텐츠 & 소셜 (Week 2)
- Posts & Feed (TC-D1 ~ TC-D3)
- Timeline (TC-E1 ~ TC-E2)
- Social (TC-J1 ~ TC-J3)

### Phase 3: 커머스 & AI (Week 3)
- Experiences (TC-H1 ~ TC-H3)
- AI Features (TC-F1 ~ TC-F3)
- Service Templates (TC-I1 ~ TC-I2)

### Phase 4: 통신 & 관리 (Week 4)
- Chat (TC-G1 ~ TC-G3)
- Admin (TC-K1 ~ TC-K2)
- 통합 시나리오 1-3

### Phase 5: 성능 & 보안 (Week 5)
- Load Testing
- Security Testing
- Browser Compatibility

---

## 성공 기준

### 기능 테스트
- ✅ 모든 테스트 케이스 통과율 > 95%
- ✅ Critical 버그 0건
- ✅ High 버그 < 5건

### 성능 테스트
- ✅ 평균 응답 시간 < 2초
- ✅ 동시 사용자 100명 처리
- ✅ WebSocket 지연 < 500ms

### 보안 테스트
- ✅ 모든 보안 체크리스트 통과
- ✅ 취약점 0건

### 사용자 경험
- ✅ 모바일 반응형 완벽 작동
- ✅ 6개 언어 번역 완성도 > 90%
- ✅ 사용자 시나리오 완료율 > 90%

---

## 추가 고려사항

### CI/CD Integration
- 자동화된 E2E 테스트 (Playwright/Cypress)
- Unit 테스트 (Jest/Vitest)
- API 테스트 (Postman/Insomnia)

### Monitoring
- Sentry 에러 트래킹
- Google Analytics 이벤트
- 서버 로그 모니터링

### Accessibility
- WCAG 2.1 Level AA 준수
- 스크린 리더 지원
- 키보드 네비게이션

---

---

## M. Smart Feed & Hashtag System (스마트 피드 & 해시태그)

**테스트 기능:**
- 스마트 피드 알고리즘 (참여도, 친밀도, 관심사, 해시태그, 거리, 신선도, 인기속도)
- 해시태그 시스템 (자동완성, 팔로우, 트렌딩)
- 피드 모드 전환 (Smart/Latest/Nearby/Popular/Hashtag)
- 해시태그 다국어 지원 (6개 언어)

**담당 페르소나:**
- Yuki (해시태그 팔로우 및 트렌딩)
- Sophie (인플루언서 - 해시태그 전략)
- Jack (스마트 피드 개인화)
- Marcus (피드 모드 전환)

### 테스트 케이스

#### TC-M1: 해시태그 자동완성 (Yuki)
1. Feed → "Create Post"
2. 본문에 "#서" 입력
3. 자동완성 드롭다운 표시 확인:
   - #서울 (1,234 posts)
   - #서울맛집 (567 posts)
   - #서울여행 (890 posts)
4. "#서울맛집" 선택
5. 게시

**예상 결과:**
- 자동완성 1초 내 응답
- 사용량 기준 정렬
- 다국어 태그 혼합 표시
- 선택한 태그 하이라이트

#### TC-M2: 해시태그 팔로우 (Sophie)
1. 탐색 페이지 → 트렌딩 해시태그 섹션
2. "#travel" 태그 클릭
3. 해시태그 상세 페이지:
   - 팔로워 수: 5,432
   - 게시물 수: 12,345
   - 관련 게시물 목록
4. "Follow" 버튼 클릭
5. 피드에서 #travel 게시물 우선 표시 확인
6. 알림: "New post with #travel"

**예상 결과:**
- 해시태그 팔로우 성공
- 피드 알고리즘에 반영 (+15점)
- 관련 알림 수신

#### TC-M3: 트렌딩 해시태그 (Jack)
1. 탐색 페이지 접속
2. "Trending Now" 섹션 확인
3. 트렌딩 태그 목록:
   - 🔥 #seoul (↑120%)
   - 🔥 #streetfood (↑85%)
   - 🔥 #nightlife (↑60%)
4. 24시간/7일 기간 토글
5. 지역별 필터 (현재 위치)

**예상 결과:**
- 실시간 트렌딩 계산
- 증가율 표시
- 지역 필터 작동

#### TC-M4: 스마트 피드 모드 (Marcus)
1. Feed 페이지 접속
2. 피드 모드 선택 드롭다운 확인:
   - 🧠 Smart (추천)
   - 🕐 Latest (최신)
   - 📍 Nearby (가까운)
   - 🔥 Popular (인기)
   - #️⃣ Hashtag (팔로우 태그)
3. "Smart" 모드 선택
4. 피드 순서 확인:
   - 팔로우한 사람 포스트 상위
   - 팔로우한 해시태그 포스트 상위
   - 관심사 매칭 포스트
5. "Nearby" 모드 전환
6. 거리 기준 정렬 확인

**예상 결과:**
- 각 모드별 다른 피드 순서
- Smart 모드: 통합 점수 기반
- 모드 전환 즉시 반영

#### TC-M5: 피드 점수 계산 검증 (Sophie)
1. Sophie가 새 포스트 작성
2. 30분 내 좋아요 20개, 댓글 5개 수신
3. 다른 사용자 피드에서 상위 노출 확인
4. 트렌딩 해시태그 포함 시 추가 점수
5. 팔로워의 피드에서 최우선 노출

**점수 계산 확인:**
- 참여도: (20×1 + 5×2 + 0×3) × 0.22 = 6.6
- 친밀도: 팔로워에게 +10 × 0.20 = 2.0
- 해시태그: 트렌딩 태그 +5 × 0.12 = 0.6
- 신선도: 30분 내 = 0.95 × 0.11 = 0.1
- 인기속도: 높음 × 0.08 = 0.8
- **예상 총점: ~10.1** (상위 노출)

**예상 결과:**
- 인기 게시물 상위 노출
- 점수 기반 정렬 확인

#### TC-M6: 해시태그 다국어 지원 (Li Wei)
1. 언어 설정: Chinese
2. 트렌딩 페이지 접속
3. 해시태그 번역 표시:
   - #맛집 → #美食 (표시)
   - #travel → #旅行 (표시)
4. Chinese로 검색: "美食"
5. 관련 게시물 표시 (한국어/영어/중국어 혼합)

**예상 결과:**
- 해시태그 다국어 번역
- 크로스 언어 검색
- 원본 태그 + 번역 동시 표시

#### TC-M7: 피드 개인화 설정 (Ana)
1. 설정 → 피드 설정
2. 가중치 커스터마이징:
   - 참여도: 30% (기본 22%)
   - 음식 관련: +20%
   - 거리: 10% (기본 12%)
3. 저장
4. 피드 새로고침
5. 음식 관련 게시물 비중 증가 확인

**예상 결과:**
- 사용자 정의 가중치 저장
- 피드 알고리즘 반영
- 관심사 기반 개인화

### 통합 시나리오: 해시태그 바이럴 (Sophie → Community)

**시나리오**: Sophie가 새로운 해시태그 #SeoulHiddenGems 시작

1. Sophie가 포스트 작성: "#SeoulHiddenGems 숨겨진 카페 발견!"
2. 팔로워들이 좋아요 + 댓글
3. 다른 사용자들이 같은 태그로 게시물 작성
4. 24시간 내 50개 게시물 → 트렌딩 진입
5. 트렌딩 섹션에 표시
6. 더 많은 사용자가 태그 팔로우
7. 해시태그 페이지에 모든 게시물 집계

**예상 결과:**
- 새 해시태그 자동 생성
- 트렌딩 알고리즘 반영
- 커뮤니티 확산 효과

---

## Smart Feed & Hashtag 체크리스트

### 해시태그 시스템
- [ ] 해시태그 자동완성 (1초 내 응답)
- [ ] 해시태그 팔로우/언팔로우
- [ ] 트렌딩 해시태그 (24h/7d)
- [ ] 해시태그 검색
- [ ] 해시태그 상세 페이지
- [ ] 해시태그 다국어 번역 (6개 언어)
- [ ] 관련 해시태그 추천

### 스마트 피드
- [ ] 피드 모드 전환 (Smart/Latest/Nearby/Popular/Hashtag)
- [ ] 참여도 점수 계산
- [ ] 친밀도 점수 계산
- [ ] 관심사 매칭
- [ ] 해시태그 관련성 점수
- [ ] 거리 기반 점수
- [ ] 신선도 감쇠
- [ ] 인기속도 보너스
- [ ] 개인화 가중치 설정

### 백그라운드 작업
- [ ] 해시태그 메트릭 집계 (매시간)
- [ ] 피드 점수 재계산 (실시간)
- [ ] 트렌딩 계산 (매시간)
- [ ] 캐시 갱신

### 성능
- [ ] 피드 로딩 < 2초
- [ ] 자동완성 < 500ms
- [ ] 무한 스크롤 버퍼링 없음

---

---

## Phase 6: PG사 심사 준비 (완료)

### 테스트 시나리오: 법적 문서 및 Footer

#### TC-P6-1: 법적 문서 접근 (전체 사용자)
1. `/legal` 페이지 접속
2. 이용약관, 개인정보처리방침, 환불정책 링크 확인
3. 각 문서 클릭하여 내용 확인
4. Footer에 사업자 정보 표시 확인

**예상 결과:**
- 모든 법적 문서 접근 가능
- Footer에 사업자등록번호, 통신판매업신고번호, 대표자명 표시

#### TC-P6-2: 결제 동의 체크박스 (결제 플로우)
1. 예약 결제 페이지 접속
2. 결제 전 동의 체크박스 확인:
   - 이용약관 동의
   - 개인정보처리방침 동의
   - 환불정책 동의
3. 모두 체크해야 결제 버튼 활성화

**예상 결과:**
- 3개 동의 체크박스 표시
- 미체크 시 결제 버튼 비활성화

**구현 완료 (December 5, 2025):**
- `client/public/legal/refund_policy_ko.md` - 환불정책 마크다운
- `client/src/pages/legal.tsx` - 법적 문서 뷰어
- `client/src/components/Footer.tsx` - 사업자 정보 Footer
- `client/src/components/PaymentAgreement.tsx` - 결제 동의 체크박스

---

## Phase 7: 프론트엔드 결제 통합 (완료)

### 테스트 시나리오: PortOne SDK 결제

#### TC-P7-1: 구독 관리 페이지 접근 (모든 사용자)
1. `/subscription` 페이지 접속
2. 4개 탭 확인: 사용량, 플랜, 결제 수단, 결제 내역
3. 각 탭 전환 동작 확인

**예상 결과:**
- 구독 관리 페이지 정상 로드
- 탭 전환 시 해당 섹션 표시

#### TC-P7-2: 사용량 대시보드 (로그인 사용자)
1. 사용량 탭 클릭
2. AI 메시지, 번역, 컨시어지 사용량 확인
3. 무료 한도 대비 사용량 표시

**예상 결과:**
- 현재 사용량 / 한도 표시
- 프로그레스 바 시각화

#### TC-P7-3: 플랜 선택 및 결제 (로그인 사용자)
1. 플랜 탭 클릭
2. Traveler Plus 플랜 선택
3. 결제 버튼 클릭
4. PortOne 결제창 호출 확인

**예상 결과:**
- 플랜 목록 표시 (가격, 기능)
- 결제창 정상 호출

#### TC-P7-4: 결제 수단 관리 (로그인 사용자)
1. 결제 수단 탭 클릭
2. 카드 추가 버튼 클릭
3. 빌링키 발급 프로세스 확인
4. 등록된 카드 목록 확인
5. 기본 결제수단 설정
6. 카드 삭제

**예상 결과:**
- 빌링키 발급 가능
- 카드 CRUD 동작

#### TC-P7-5: 결제 내역 조회 (로그인 사용자)
1. 결제 내역 탭 클릭
2. 최근 결제 목록 확인
3. 결제 상세 정보 확인 (금액, 날짜, 상태)

**예상 결과:**
- 결제 내역 목록 표시
- 상세 정보 확인 가능

**구현 완료 (December 5, 2025):**
- `client/src/hooks/usePayment.ts` - PortOne SDK 동적 로드 및 결제 훅
- `client/src/components/PaymentButton.tsx` - 결제 버튼 컴포넌트
- `client/src/components/BillingKeyForm.tsx` - 빌링키 발급/관리 UI
- `client/src/pages/subscription.tsx` - 구독 관리 페이지

**API 엔드포인트:**
- `GET /api/billing/config` - PortOne 설정 정보
- `POST /api/billing/prepare-payment` - 결제 준비
- `POST /api/billing/confirm-payment` - 결제 완료 확인
- `GET /api/billing/billing-keys` - 빌링키 목록 조회
- `POST /api/billing/billing-key` - 빌링키 등록
- `DELETE /api/billing/billing-keys/:id` - 빌링키 삭제
- `PUT /api/billing/billing-keys/:id/default` - 기본 빌링키 설정
- `GET /api/billing/trip-passes` - Trip Pass 목록
- `GET /api/billing/history` - 결제 내역 조회

---

## Phase 8: 빌링키 DB 테이블 및 Storage 통합 (완료)

### 테스트 시나리오: 빌링키 CRUD

#### TC-P8-1: 빌링키 등록 (로그인 사용자)
1. `/subscription` → 결제 수단 탭
2. 카드 추가 클릭
3. PortOne 빌링키 발급 진행
4. 등록 완료 확인

**예상 결과:**
- 빌링키 DB 저장
- 첫 번째 카드는 자동으로 기본 설정
- API 응답에서 빌링키 마스킹 (앞 8자리...뒤 4자리)

#### TC-P8-2: 빌링키 목록 조회 (로그인 사용자)
1. `/subscription` → 결제 수단 탭
2. 등록된 카드 목록 확인
3. 카드사명, 마스킹된 카드번호 표시

**예상 결과:**
- 사용자의 빌링키만 조회
- 민감 정보 마스킹 표시

#### TC-P8-3: 기본 빌링키 변경 (로그인 사용자)
1. 결제 수단 탭에서 다른 카드 선택
2. "기본으로 설정" 클릭
3. 기본 카드 변경 확인

**예상 결과:**
- 기존 기본 카드 해제
- 새 카드 기본 설정

#### TC-P8-4: 빌링키 삭제 (로그인 사용자)
1. 결제 수단 탭에서 카드 삭제 클릭
2. 확인 다이얼로그 표시
3. 삭제 완료 확인
4. 기본 카드 삭제 시 다음 카드로 자동 전환

**예상 결과:**
- 빌링키 DB에서 삭제
- 기본 카드 자동 전환

#### TC-P8-5: 보안 검증 (공격 시나리오)
1. 다른 사용자의 빌링키 ID로 삭제 시도
2. 전체 카드번호(16자리) 등록 시도

**예상 결과:**
- 다른 사용자 빌링키 접근 불가 (401/404)
- 전체 카드번호 저장 차단 (400)

**구현 완료 (December 5, 2025):**
- `shared/schema.ts` - billingKeys 테이블 스키마
- `server/storage.ts` - IStorage 인터페이스 확장 및 CRUD 구현
- `server/routes.ts` - API 엔드포인트 실제 Storage 연동

**billingKeys 테이블:**
```sql
CREATE TABLE billing_keys (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  billing_key TEXT NOT NULL,
  card_name TEXT,
  card_number TEXT,
  card_type TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**보안 기능:**
1. 사용자 소유권 검증 - 다른 사용자의 빌링키 접근 불가
2. 첫 번째 빌링키 자동 기본 설정
3. 기본 빌링키 삭제 시 다음 키로 자동 전환
4. API 응답에서 빌링키 마스킹 (앞 8자리...뒤 4자리)
5. 전체 카드번호(16자리) 저장 차단 - 마스킹된 형태만 허용

---

## Phase 9: 프로덕션 배포 준비 (진행 중)

### 9.1 목표

프로덕션 환경에서 안전하고 안정적인 결제 서비스 운영을 위한 준비

### 9.2 필수 구현 항목

| 작업 | 파일 | 우선순위 | 상태 |
|------|------|----------|------|
| 웹훅 서명 검증 구현 | `server/routes.ts` | 🔴 필수 | ✅ 완료 |
| 결제 로그 테이블 추가 | `shared/schema.ts` | 🔴 필수 | ✅ 완료 |
| 결제 로그 Storage 메서드 | `server/storage.ts` | 🔴 필수 | ✅ 완료 |
| 웹훅 이벤트 로그 기록 | `server/routes.ts` | 🔴 필수 | ✅ 완료 |
| 환경 변수 검증 미들웨어 | `server/routes.ts` | 🟡 중요 | 예정 |
| Sentry 결제 에러 추적 | `server/routes.ts` | 🟡 중요 | 예정 |
| 프로덕션 체크리스트 문서화 | `docs/` | 🟢 권장 | 예정 |

### 9.3 웹훅 서명 검증

```typescript
// PortOne 웹훅 서명 검증
import crypto from 'crypto';

const verifyWebhookSignature = (
  payload: string, 
  signature: string, 
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};
```

### 9.4 결제 로그 테이블

```typescript
// paymentLogs 테이블 - 모든 결제 이벤트 기록
export const paymentLogs = pgTable('payment_logs', {
  id: serial('id').primaryKey(),
  paymentId: text('payment_id').notNull(),
  userId: text('user_id').references(() => users.id),
  eventType: text('event_type').notNull(), // PAYMENT_READY, PAYMENT_PAID, PAYMENT_FAILED, WEBHOOK_RECEIVED
  eventData: text('event_data'), // JSON 문자열
  amount: integer('amount'),
  status: text('status'),
  errorMessage: text('error_message'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 9.5 환경 변수 체크리스트

**필수 환경 변수:**
```bash
# PortOne 결제 (프로덕션)
PORTONE_STORE_ID=store_xxx
PORTONE_CHANNEL_KEY=channel_xxx
PORTONE_API_SECRET=secret_xxx
PORTONE_WEBHOOK_SECRET=webhook_secret_xxx

# Sentry 에러 모니터링
SENTRY_DSN=https://xxx@sentry.io/xxx

# 프로덕션 환경
NODE_ENV=production
```

### 9.6 테스트 체크리스트

- [x] 웹훅 서명 검증 테스트 ✅
- [x] 결제 로그 저장 테스트 ✅
- [ ] 환경 변수 누락 시 에러 처리
- [ ] Sentry 에러 전송 확인
- [ ] HTTPS 강제 리다이렉트 확인
- [ ] 결제 실패 시 알림 발송

### 9.8 구현 완료 (December 5, 2025)

**구현 파일:**
- `shared/schema.ts` - paymentLogs 테이블 스키마
- `server/storage.ts` - 결제 로그 CRUD 메서드
- `server/routes.ts` - 웹훅 이벤트 로그 기록

**paymentLogs 테이블:**
```sql
CREATE TABLE payment_logs (
  id SERIAL PRIMARY KEY,
  payment_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data TEXT,
  amount INTEGER,
  status TEXT,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**기록되는 이벤트 타입:**
- `WEBHOOK_PAYMENT_PAID` - 결제 성공
- `WEBHOOK_PAYMENT_CANCELLED` - 결제 취소
- `WEBHOOK_PAYMENT_FAILED` - 결제 실패
- `WEBHOOK_BILLINGKEY_ISSUED` - 빌링키 발급
- `WEBHOOK_BILLINGKEY_DELETED` - 빌링키 삭제

**Storage 메서드:**
- `createPaymentLog(data)` - 결제 로그 생성
- `getPaymentLogsByPaymentId(paymentId)` - 결제 ID로 로그 조회
- `getPaymentLogsByUserId(userId, limit)` - 사용자 ID로 로그 조회

### 9.7 PG사 심사 제출 가이드

**심사 필수 서류:**
1. 사업자등록증
2. 통신판매업신고증
3. 이용약관 URL
4. 개인정보처리방침 URL
5. 환불정책 URL
6. 서비스 소개서

**심사 전 확인 사항:**
- [ ] 모든 법적 문서 URL 접근 가능
- [ ] Footer에 사업자 정보 표시
- [ ] 결제 전 동의 체크박스 동작
- [ ] 테스트 결제 성공 확인

---

## Phase 10: 정기 결제 (구독) 자동화 (진행 중)

### 10.1 목표

Trip Pass 및 구독 플랜의 정기 결제 자동화

### 10.2 필수 구현 항목

| 작업 | 파일 | 우선순위 | 상태 |
|------|------|----------|------|
| 구독 스케줄러 서비스 | `server/services/subscriptionScheduler.ts` | 🔴 필수 | ✅ 완료 |
| 빌링키 기반 자동 결제 | `server/services/portoneClient.ts` | 🔴 필수 | ✅ 완료 |
| 결제 재시도 로직 (3회) | `server/services/subscriptionScheduler.ts` | 🔴 필수 | ✅ 완료 |
| 구독 만료 알림 | `server/services/subscriptionScheduler.ts` | 🟡 중요 | ✅ 완료 |
| 갱신 실패 시 서비스 제한 | `server/routes.ts` | 🟡 중요 | ✅ 완료 |

### 10.8 API 엔드포인트 (관리자 전용)

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/admin/scheduler/run` | POST | 스케줄러 수동 실행 |
| `/api/admin/subscription/:id/renew` | POST | 단일 구독 수동 갱신 |
| `/api/admin/scheduler/send-reminders` | POST | 만료 예정 알림 발송 |

### 10.9 DB 스키마 변경

`user_subscriptions` 테이블에 추가된 필드:
- `retry_count` (integer, default 0) - 결제 재시도 횟수
- `last_retry_at` (timestamp) - 마지막 재시도 시간
- `next_retry_at` (timestamp) - 다음 재시도 예정 시간
- `last_payment_error` (text) - 마지막 결제 실패 사유

### 10.3 구독 스케줄러 설계

```typescript
// 매일 자정 (KST 00:00) 실행
const SCHEDULER_CRON = '0 0 * * *';

// 스케줄러 작업:
// 1. 오늘 만료 예정인 구독 조회
// 2. 각 구독에 대해 빌링키로 자동 결제 시도
// 3. 결제 성공: 구독 기간 연장
// 4. 결제 실패: 재시도 카운트 증가, 알림 발송
// 5. 3회 실패: 구독 일시 정지
```

### 10.4 빌링키 결제 플로우

```
1. 스케줄러가 만료 예정 구독 조회
   ↓
2. 사용자의 기본 빌링키 조회
   ↓
3. PortOne API로 빌링키 결제 요청
   POST /payments/{paymentId}/billing-key
   ↓
4. 결제 결과 확인
   ↓
5-a. 성공: 구독 기간 연장, 결제 로그 기록
5-b. 실패: 재시도 스케줄링, 알림 발송
```

### 10.5 재시도 정책

| 시도 | 간격 | 조치 |
|------|------|------|
| 1회차 실패 | 즉시 | 1일 후 재시도 예약 |
| 2회차 실패 | +1일 | 2일 후 재시도 예약, 알림 발송 |
| 3회차 실패 | +2일 | 구독 일시 정지, 결제수단 변경 요청 |

### 10.6 알림 종류

| 알림 유형 | 발송 시점 | 내용 |
|----------|----------|------|
| 만료 예정 | D-7, D-3, D-1 | "구독이 X일 후 갱신됩니다" |
| 결제 실패 | 실패 즉시 | "결제에 실패했습니다. 결제수단을 확인해주세요" |
| 구독 정지 | 3회 실패 후 | "구독이 일시 정지되었습니다" |
| 갱신 완료 | 결제 성공 | "구독이 갱신되었습니다" |

### 10.7 테스트 시나리오

#### TC-P10-1: 자동 결제 성공 (정상 케이스)
1. 테스트 사용자에게 빌링키 등록
2. 만료 예정 구독 생성
3. 스케줄러 수동 실행
4. 결제 성공 확인
5. 구독 기간 연장 확인

**예상 결과:**
- 결제 로그에 성공 기록
- 구독 endDate가 30일 연장

#### TC-P10-2: 자동 결제 실패 및 재시도
1. 테스트 사용자에게 잔액 부족 카드 등록
2. 만료 예정 구독 생성
3. 스케줄러 수동 실행
4. 결제 실패 확인
5. retryCount 증가 확인
6. 알림 발송 확인

**예상 결과:**
- 결제 로그에 실패 기록
- retryCount = 1
- 실패 알림 발송

#### TC-P10-3: 3회 실패 후 구독 정지
1. 3회 결제 실패 시뮬레이션
2. 구독 상태 확인

**예상 결과:**
- 구독 상태 = 'suspended'
- 서비스 제한 적용

### 10.10 아키텍트 피드백 반영 사항

| 문제점 | 해결 방법 | 상태 |
|--------|----------|------|
| 중복 재시도 가능성 | nextRetryAt 체크 조건 추가 | ✅ 완료 |
| 빌링키 조회 실패 | userId + billingKey 조합으로 조회 | ✅ 완료 |
| 알림 타입 enum 불일치 | 기존 'promotion' 타입 사용 | ✅ 완료 |
| 관리자 권한 검증 | isAdmin 체크 구현 | ✅ 완료 |

---

## Phase 11: 프로덕션 배포 체크리스트 ✅ 완료

### 11.1 목표

PG사 심사 통과 및 안전한 프로덕션 배포를 위한 최종 점검

### 11.2 필수 체크리스트

#### 11.2.1 환경 변수 검증 ✅

| 환경 변수 | 용도 | 필수 여부 | 상태 |
|----------|------|----------|------|
| `PORTONE_API_SECRET` | PortOne API 인증 | 🔴 필수 | ✅ 검증됨 |
| `PORTONE_STORE_ID` | 상점 ID | 🔴 필수 | ✅ 검증됨 |
| `PORTONE_CHANNEL_KEY` | 결제 채널 키 (KG이니시스) | 🔴 필수 | ✅ 검증됨 |
| `PORTONE_WEBHOOK_SECRET` | 웹훅 서명 검증 | 🔴 필수 | ✅ 검증됨 |
| `DATABASE_URL` | PostgreSQL 연결 | 🔴 필수 | ✅ 검증됨 |
| `OPENAI_API_KEY` | AI 서비스 | ⚪ 선택 | ✅ 검증됨 |
| `GOOGLE_TRANSLATE_API_KEY` | 번역 서비스 | ⚪ 선택 | ✅ 검증됨 |

**구현 파일:** `server/middleware/envCheck.ts`

**주요 기능:**
- `validateStartupEnv()`: 서버 시작 시 필수 환경 변수 검증
- `requirePaymentEnv`: 결제 API 호출 전 검증 미들웨어
- `requireAiEnv`: AI API 호출 전 검증 미들웨어
- `getEnvStatus()`: 관리자용 환경 변수 상태 조회
- `logEnvStatus()`: 환경 변수 상태 로그 출력

#### 11.2.2 법적 문서 URL ✅

| 문서 | URL 패턴 | 상태 |
|------|----------|------|
| 이용약관 | `/legal/terms` | ✅ 완료 |
| 개인정보처리방침 | `/legal/privacy` | ✅ 완료 |
| 환불정책 | `/legal/refund` | ✅ 완료 |
| 위치기반서비스 약관 | `/legal/location` | ✅ 완료 |
| 쿠키 정책 | `/legal/cookies` | ✅ 완료 |
| 오픈소스 라이선스 | `/legal/oss` | ✅ 완료 |
| 전자상거래 표시사항 | Footer | ✅ 완료 |

**구현 파일:**
- `client/src/pages/legal.tsx` (법적 문서 페이지)
- `client/public/legal/*.md` (마크다운 문서 6개)

**특징:**
- 관리자 편집 모드 지원 (`?admin=true`)
- ReactMarkdown 렌더링
- 다크모드 지원

#### 11.2.3 보안 점검 ✅

| 항목 | 설명 | 상태 |
|------|------|------|
| 웹훅 서명 검증 | HMAC-SHA256 검증 | ✅ 완료 |
| 빌링키 마스킹 | 앞 8자리만 로그 기록 | ✅ 완료 |
| 카드번호 비저장 | 16자리 저장 차단 | ✅ 완료 |
| 관리자 권한 | isAdmin 검증 | ✅ 완료 |
| Rate Limiting | API 요청 제한 | ✅ 완료 |

**Rate Limiting 설정 (`server/index.ts`):**
- 일반 API: 1분당 120회
- 인증 API: 1분당 20회

#### 11.2.4 에러 추적

| 항목 | 도구 | 상태 |
|------|------|------|
| 서버 에러 | Sentry (@sentry/node 설치됨) | ⚪ 설정 대기 |
| 결제 실패 로그 | paymentLogs 테이블 | ✅ 완료 |
| 웹훅 이벤트 | paymentLogs 테이블 | ✅ 완료 |

### 11.3 PG사 심사 준비

#### 11.3.1 필수 서류

1. 사업자등록증
2. 통신판매업신고증
3. 대표자 신분증 사본
4. 통장 사본 (정산용)

#### 11.3.2 웹사이트 요구사항 ✅

| 요구사항 | 상세 | 상태 |
|----------|------|------|
| SSL 인증서 | HTTPS 필수 | ✅ Replit 제공 |
| 사업자 정보 | Footer에 표시 | ✅ 완료 |
| 결제 동의 | 체크박스 동작 | ✅ 완료 |
| 환불 안내 | 명확한 정책 | ✅ 완료 |

**Footer 사업자 정보 (`client/src/components/Footer.tsx`):**
- 상호명: 투게더 주식회사
- 대표: 홍길동
- 사업자등록번호: 000-00-00000
- 통신판매업신고: 제0000-서울강남-0000호
- 주소: 서울특별시 강남구 테헤란로 000, 0층
- 고객센터: 1234-5678 (평일 09:00~18:00)
- 통신판매중개자 면책 고지

### 11.4 구현 완료 항목

| 작업 | 파일 | 상태 |
|------|------|------|
| 환경 변수 검증 미들웨어 | `server/middleware/envCheck.ts` | ✅ 완료 |
| 법적 문서 페이지 | `client/src/pages/legal.tsx` | ✅ 완료 |
| 법적 문서 마크다운 | `client/public/legal/*.md` | ✅ 완료 |
| Footer 사업자 정보 | `client/src/components/Footer.tsx` | ✅ 완료 |
| Rate Limiting | `server/index.ts` | ✅ 완료 |
| Sentry 패키지 | `@sentry/node`, `@sentry/react` | ✅ 설치됨 |

### 11.5 남은 작업

| 작업 | 우선순위 | 비고 |
|------|----------|------|
| Sentry DSN 설정 | 🟡 중요 | 프로덕션 배포 시 설정 |
| 실제 사업자 정보 업데이트 | 🔴 필수 | 법인 설립 후 |
| PG사 심사 제출 | 🔴 필수 | 서류 준비 후 |

---

## Phase 12: 호스트 정산 배치 시스템 ✅ 완료

### 12.1 목표

릴리스된 에스크로 트랜잭션을 호스트에게 자동으로 정산하는 배치 시스템 구현

### 12.2 핵심 개념

**정산 플로우:**
```
에스크로 릴리스 → 정산 대기 → 호스트별 그룹화 → KYC 검증 → 최소금액 필터링 → 
PortOne Transfer API → 계좌 이체 → 정산 완료
```

**정산 조건:**
- 에스크로 상태: `released`
- payoutId: `null` (미정산)
- KYC 상태: `verified`
- 최소 금액: 10,000원 이상

**플랫폼 수수료:**
- P2P 거래: 12%
- 수수료 = `grossAmount * 0.12`
- 호스트 수령액 = `grossAmount - platformFee`

### 12.3 DB 스키마

#### payouts 테이블 (정산 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial | PK |
| hostId | varchar | 호스트 사용자 ID |
| periodStart | date | 정산 기간 시작 |
| periodEnd | date | 정산 기간 종료 |
| grossAmount | decimal | 총 금액 |
| totalFees | decimal | 플랫폼 수수료 |
| netAmount | decimal | 호스트 수령액 |
| currency | varchar | 통화 (KRW) |
| transactionCount | integer | 트랜잭션 수 |
| status | varchar | 상태 |
| bankCode | varchar | 은행 코드 |
| accountNumber | varchar | 계좌번호 |
| accountHolderName | varchar | 예금주 |
| portoneTransferId | varchar | PortOne 송금 ID |
| portoneTransferStatus | varchar | PortOne 송금 상태 |
| scheduledAt | timestamp | 예정일 |
| processedAt | timestamp | 처리 시작일 |
| completedAt | timestamp | 완료일 |
| failedAt | timestamp | 실패일 |
| failureReason | text | 실패 사유 |
| metadata | jsonb | 트랜잭션 ID 목록 등 |

**status 상태값:**
- `pending`: 대기 중
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패
- `on_hold`: 보류 (정보 불완전)

#### escrowTransactions 확장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| payoutId | integer | 정산 연결 (FK) |
| platformFee | decimal | 플랫폼 수수료 |

#### escrowAccounts 확장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| bankCode | varchar | 은행 코드 |
| accountNumber | varchar | 계좌번호 |
| accountHolderName | varchar | 예금주명 |

### 12.4 서비스 아키텍처

#### settlementService.ts

| 메서드 | 설명 |
|--------|------|
| `listReleasedTransactionsWithoutPayout()` | 미정산 릴리스 트랜잭션 조회 |
| `groupByHostAndFilter()` | 호스트별 그룹화 및 KYC/최소금액 필터링 |
| `createPayout()` | 정산 레코드 생성 |
| `attachTransactionsToPayout()` | 에스크로 트랜잭션에 payoutId 연결 |
| `moveToWithdrawable()` | pending → withdrawable 잔액 이동 |
| `processPayout()` | PortOne Transfer API 호출 |
| `deductFromWithdrawable()` | 출금 후 잔액 차감 |
| `runDailySettlement()` | 일일 정산 배치 실행 |
| `getHostPayouts()` | 호스트별 정산 내역 조회 |
| `getSettlementStats()` | 정산 통계 조회 |
| `retryFailedPayout()` | 실패 정산 재시도 |
| `getRecentPayouts()` | 최근 정산 목록 조회 |

#### portoneClient.ts 확장

```typescript
transferToBank(params: {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  reason: string;
}): Promise<{
  success: boolean;
  transferId?: string;
  error?: string;
}>
```

#### settlementBatch.ts

| 함수 | 설명 |
|------|------|
| `startSettlementScheduler()` | 스케줄러 시작 (02:00 KST) |
| `stopSettlementScheduler()` | 스케줄러 중지 |
| `runManualSettlement()` | 수동 정산 실행 |
| `getSchedulerStatus()` | 스케줄러 상태 조회 |

### 12.5 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `SETTLEMENT_ENABLED` | 정산 활성화 플래그 | `false` |

**프로덕션에서 활성화:**
```bash
SETTLEMENT_ENABLED=true
```

### 12.6 API 엔드포인트

#### 관리자 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/settlements/status` | 스케줄러 상태 및 통계 |
| POST | `/api/admin/settlements/run` | 수동 정산 실행 |
| GET | `/api/admin/settlements` | 최근 정산 목록 |
| POST | `/api/admin/settlements/:id/retry` | 실패 정산 재시도 |

#### 호스트 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/host/payouts` | 본인 정산 내역 조회 |

### 12.7 테스트 시나리오

#### TC-P12-1: 일일 정산 성공 (정상 케이스)

**사전 조건:**
- 호스트 A: KYC verified, 은행 정보 등록
- 릴리스된 에스크로 트랜잭션 3건 (총 50,000원)

**테스트 절차:**
1. 관리자로 로그인
2. `POST /api/admin/settlements/run` 호출
3. 정산 결과 확인

**예상 결과:**
- payout 레코드 생성 (status: completed)
- 호스트 수령액: 44,000원 (50,000 - 12%)
- portoneTransferId 생성
- 에스크로 트랜잭션에 payoutId 연결

#### TC-P12-2: KYC 미인증 호스트 스킵

**사전 조건:**
- 호스트 B: KYC pending
- 릴리스된 에스크로 트랜잭션 2건

**테스트 절차:**
1. 수동 정산 실행
2. 호스트 B 정산 여부 확인

**예상 결과:**
- 호스트 B 정산 건너뜀
- summary.skippedKycCount = 1
- 트랜잭션 payoutId 여전히 null

#### TC-P12-3: 최소 금액 미달 스킵

**사전 조건:**
- 호스트 C: KYC verified
- 릴리스된 에스크로 트랜잭션 1건 (5,000원)

**테스트 절차:**
1. 수동 정산 실행
2. 호스트 C 정산 여부 확인

**예상 결과:**
- 호스트 C 정산 건너뜀 (최소 10,000원 미달)
- summary.belowMinCount = 1
- 다음 정산 주기까지 누적

#### TC-P12-4: 은행 정보 누락 시 보류

**사전 조건:**
- 호스트 D: KYC verified, 은행 정보 미등록
- 릴리스된 에스크로 트랜잭션 (20,000원)

**테스트 절차:**
1. 수동 정산 실행
2. payout 상태 확인

**예상 결과:**
- payout 생성됨
- status: `on_hold`
- failureReason: "Bank account information incomplete"

#### TC-P12-5: 실패 정산 재시도

**사전 조건:**
- 실패한 payout 레코드 (status: failed)

**테스트 절차:**
1. `POST /api/admin/settlements/:id/retry` 호출
2. 정산 결과 확인

**예상 결과:**
- 정산 재시도
- 성공 시 status: completed
- 실패 시 status: failed 유지

### 12.8 Idempotency 보장

| 메커니즘 | 설명 |
|----------|------|
| payoutId 체크 | 이미 payoutId가 설정된 트랜잭션 제외 |
| 트랜잭션 단위 연결 | 정산 생성 직후 트랜잭션에 payoutId 설정 |
| 상태 기반 필터링 | released & payoutId=null 조건만 처리 |

### 12.9 구현 파일

| 파일 | 역할 |
|------|------|
| `server/services/settlementService.ts` | 정산 비즈니스 로직 |
| `server/services/portoneClient.ts` | PortOne Transfer API 통합 |
| `server/jobs/settlementBatch.ts` | Cron 스케줄러 |
| `server/routes.ts` | API 라우트 추가 |
| `server/index.ts` | 스케줄러 시작 |
| `shared/schema.ts` | payouts 테이블 및 확장 |

### 12.10 한국 세금 관련 고려사항

**호스트 정산 시:**
- 원천징수세 (3.3%): 사업소득세 + 지방소득세
- 부가가치세: 호스트가 사업자인 경우 별도 신고
- 세금계산서: 플랫폼 수수료에 대해 발행 필요

**플랫폼 수익:**
- 부가가치세 매출: 수수료의 10%
- 수수료 12% 중 약 1.09%가 VAT

---

## Phase 13: 계약 분할 결제 시스템 ✅ 완료

### 13.1 목표

P2P 계약에서 계약금/중도금/잔금 분할 결제를 지원하여 양측의 리스크를 분산하고 결제 유연성 제공

### 13.2 핵심 개념

**분할 결제 플로우:**
```
계약 생성 → 결제 플랜 선택 → 마일스톤 생성 → 계약금 결제 → 
중도금 결제(선택) → 잔금 결제 → 서비스 완료 → 마일스톤 릴리스 → 정산
```

**결제 플랜 유형:**
| 플랜 | 계약금 | 중도금 | 잔금 | 사용 사례 |
|------|--------|--------|------|-----------|
| single | 100% | 0% | 0% | 소액 일시불 |
| two_step | 30% | 0% | 70% | 일반 투어/서비스 |
| three_step | 30% | 30% | 40% | 장기/고가 여행 패키지 |

**비율 검증:**
- `depositRate + interimRate + finalRate = 100%`
- two_step: `interimRate = 0` 필수
- three_step: `interimRate > 0` 필수

### 13.3 DB 스키마 확장

#### contracts 테이블 추가 필드

| 컬럼 | 타입 | 설명 |
|------|------|------|
| paymentType | varchar(10) | 결제 유형 (full/split) |
| paymentPlan | varchar(15) | 결제 플랜 (single/two_step/three_step) |
| depositRate | decimal(5,2) | 계약금 비율 (기본 30%) |
| interimRate | decimal(5,2) | 중도금 비율 (기본 0%) |
| finalRate | decimal(5,2) | 잔금 비율 (기본 70%) |
| depositAmount | decimal(10,2) | 계약금 금액 (캐시) |
| interimAmount | decimal(10,2) | 중도금 금액 (캐시) |
| finalAmount | decimal(10,2) | 잔금 금액 (캐시) |
| depositDueDate | date | 계약금 납부 기한 |
| interimDueDate | date | 중도금 납부 기한 |
| finalDueDate | date | 잔금 납부 기한 |
| currentMilestone | varchar(20) | 현재 마일스톤 (deposit/interim/final/completed) |

#### escrowTransactions 테이블 추가 필드

| 컬럼 | 타입 | 설명 |
|------|------|------|
| refundedAmount | decimal(10,2) | 환불된 금액 |
| outstandingAmount | decimal(10,2) | 미수금 |
| dueDate | date | 납부 기한 |

**milestoneType 값:**
- `deposit`: 계약금
- `interim`: 중도금
- `final`: 잔금

**status 확장:**
- `partial_refund`: 부분 환불됨

### 13.4 서비스 아키텍처

#### splitPaymentService.ts

| 메서드 | 설명 |
|--------|------|
| `validateConfig()` | 분할 결제 설정 검증 (비율 합계 100% 등) |
| `getDefaultRates()` | 플랜별 기본 비율 반환 |
| `calculateMilestoneAmounts()` | 총액에서 마일스톤 금액 계산 |
| `setupSplitPayment()` | 계약에 분할 결제 설정 적용 |
| `createMilestoneTransactions()` | 마일스톤별 에스크로 트랜잭션 생성 |
| `getContractPaymentSummary()` | 계약 결제 요약 조회 |
| `processMilestonePayment()` | 마일스톤 결제 처리 |
| `advanceMilestone()` | 다음 마일스톤으로 진행 |
| `releaseMilestone()` | 마일스톤 릴리스 (서비스 완료 후) |
| `processPartialRefund()` | 부분 환불 처리 |
| `processFullRefund()` | 전체 환불 처리 |
| `getOverdueMilestones()` | 납부 기한 지난 마일스톤 조회 |
| `checkAllMilestonesComplete()` | 모든 마일스톤 완료 확인 |
| `completeContract()` | 계약 완료 처리 |

### 13.5 API 엔드포인트

#### 분할 결제 설정

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/contracts/:id/split-payment` | 분할 결제 설정 적용 |
| GET | `/api/contracts/:id/payment-summary` | 결제 요약 조회 |

#### 마일스톤 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/escrow/:transactionId/pay` | 마일스톤 결제 처리 |
| POST | `/api/escrow/:transactionId/release` | 마일스톤 릴리스 |
| POST | `/api/escrow/:transactionId/partial-refund` | 부분 환불 |

#### 계약 관리

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/contracts/:id/full-refund` | 전체 환불 |
| POST | `/api/contracts/:id/complete` | 계약 완료 |

#### 관리자 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/overdue-milestones` | 연체 마일스톤 조회 |

### 13.6 테스트 시나리오

#### TC-P13-1: 2단계 분할 결제 성공

**사전 조건:**
- 여행자와 가이드 간 계약 생성 (totalAmount: 100,000원)

**테스트 절차:**
1. `POST /api/contracts/:id/split-payment` 호출
   - paymentPlan: "two_step"
   - depositDueDate: 오늘
   - finalDueDate: 서비스일
2. 계약금(30,000원) 결제
3. 잔금(70,000원) 결제
4. 서비스 완료 후 릴리스

**예상 결과:**
- 2개의 escrowTransaction 생성 (deposit, final)
- 계약금 결제 → currentMilestone: "final"
- 잔금 결제 → currentMilestone: "completed"
- 릴리스 후 정산 대상 포함

#### TC-P13-2: 3단계 분할 결제

**사전 조건:**
- 장기 투어 계약 (totalAmount: 500,000원)

**테스트 절차:**
1. three_step 플랜 설정
   - depositRate: 30, interimRate: 30, finalRate: 40
2. 각 단계별 결제 진행
3. 마일스톤 진행 확인

**예상 결과:**
- 3개의 escrowTransaction 생성
- 금액: 150,000 + 150,000 + 200,000 = 500,000
- 순차적 마일스톤 진행

#### TC-P13-3: 부분 환불

**사전 조건:**
- 계약금 결제 완료 (30,000원, status: funded)

**테스트 절차:**
1. `POST /api/escrow/:id/partial-refund`
   - amount: 10,000
   - reason: "서비스 범위 축소"
2. 환불 결과 확인

**예상 결과:**
- refundedAmount: 10,000
- outstandingAmount: 20,000
- status: "partial_refund"

#### TC-P13-4: 전체 환불 (계약 취소)

**사전 조건:**
- 계약금 + 중도금 결제 완료

**테스트 절차:**
1. `POST /api/contracts/:id/full-refund`
   - reason: "불가피한 취소"
2. 계약 상태 확인

**예상 결과:**
- 모든 funded 트랜잭션 환불됨
- contract status: "cancelled"
- 호스트 pendingBalance 조정

#### TC-P13-5: 비율 검증 실패

**테스트 절차:**
1. `POST /api/contracts/:id/split-payment`
   - depositRate: 30, interimRate: 30, finalRate: 50 (합계 110%)

**예상 결과:**
- 400 에러: "Rate sum must be 100%"

### 13.7 마일스톤 상태 전이

```
pending → funded → released → [정산 대상]
    ↓         ↓
    └→ refunded (전체 환불)
              ↓
        partial_refund (부분 환불)
```

### 13.8 구현 파일

| 파일 | 역할 |
|------|------|
| `server/services/splitPaymentService.ts` | 분할 결제 비즈니스 로직 |
| `server/routes.ts` | API 엔드포인트 추가 |
| `shared/schema.ts` | contracts/escrowTransactions 확장 |

### 13.9 정산과의 연동

- 분할 결제된 각 마일스톤은 개별 escrowTransaction
- `released` 상태의 트랜잭션만 정산 대상
- 호스트 정산 시 모든 릴리스된 마일스톤 합산
- 부분 환불 시 `amount - refundedAmount`로 정산

### 13.10 보안 및 정합성

#### 권한 검증

| 엔드포인트 | 권한 | 역할 제한 |
|-----------|------|----------|
| `split-payment` | 계약 당사자 | 양측 모두 |
| `payment-summary` | 계약 당사자 | 양측 모두 |
| `pay` | 계약 여행자 | traveler만 |
| `release` | 계약 여행자 | traveler만 |
| `partial-refund` | 계약 당사자 | 양측 모두 |
| `full-refund` | 계약 당사자 | 양측 모두 |
| `complete` | 계약 여행자 | traveler만 |
| `overdue-milestones` | 관리자 | admin만 |

#### Idempotency 보장

| 메커니즘 | 설명 |
|----------|------|
| paymentId 중복 체크 | DB에서 기존 paymentId 존재 여부 확인 |
| 릴리스 중복 방지 | `released` 상태에서 재요청 시 거부 |
| 금액 검증 필수 | paidAmount 필수, ±0.01 허용 오차 |

#### 잔액 관리

| 상태 | 동작 |
|------|------|
| 결제(funded) | pending 잔액 증가 |
| 릴리스(released) | pending → withdrawable 이동 |
| 부분환불 | pending 또는 withdrawable 차감 |
| 전체환불 | 모든 funded/released 잔액 차감 |

---

## Phase 14: 분쟁 관리 시스템 (Dispute Management)

### 14.1 개요

P2P 거래에서 발생하는 분쟁을 체계적으로 처리하는 시스템입니다.

**분쟁 플로우:**
```
분쟁 생성 → 접수(open) → 검토(under_review) → 증거 요청 → 중재 → 해결/종료
```

### 14.2 분쟁 유형

| 유형 | 설명 |
|------|------|
| `service_not_provided` | 서비스 미제공 |
| `service_quality` | 서비스 품질 불만 |
| `unauthorized_charge` | 무단 청구 |
| `cancellation_refund` | 취소/환불 분쟁 |
| `host_no_show` | 호스트 노쇼 |
| `traveler_no_show` | 여행자 노쇼 |
| `other` | 기타 |

### 14.3 분쟁 상태 전이

```
open ──────────► under_review ──────────► evidence_requested
  │                   │                          │
  │                   ▼                          ▼
  │            awaiting_response ───────► mediation
  │                   │                          │
  │                   ▼                          ▼
  └──► withdrawn    escalated ───────────► resolved_*
                        │                       │
                        └───────────────────────▼
                                            closed
```

**해결 유형:**
- `resolved_favor_initiator`: 제기자 승리
- `resolved_favor_respondent`: 상대방 승리
- `resolved_partial`: 부분 해결

### 14.4 SLA (서비스 수준 협약)

| 우선순위 | 응답 기한 |
|---------|----------|
| urgent | 4시간 |
| high | 24시간 |
| normal | 48시간 |
| low | 72시간 |

### 14.5 API 엔드포인트

#### 사용자 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/disputes` | 분쟁 생성 |
| GET | `/api/disputes` | 내 분쟁 목록 |
| GET | `/api/disputes/:id` | 분쟁 상세 (증거, 활동 포함) |
| POST | `/api/disputes/:id/evidence` | 증거 제출 |
| POST | `/api/disputes/:id/withdraw` | 분쟁 철회 |
| POST | `/api/disputes/:id/comment` | 코멘트 추가 |

#### 관리자 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/admin/disputes` | 분쟁 목록 조회 |
| GET | `/api/admin/disputes/stats` | 분쟁 통계 |
| POST | `/api/admin/disputes/:id/assign` | 담당자 배정 |
| POST | `/api/admin/disputes/:id/status` | 상태 변경 |
| POST | `/api/admin/disputes/:id/resolve` | 분쟁 해결 |
| POST | `/api/admin/disputes/:id/escalate` | 상위 단계 전달 |
| POST | `/api/admin/disputes/check-sla` | SLA 위반 체크 |

### 14.6 분쟁 생성 예시

```bash
curl -X POST /api/disputes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "respondentId": "host_123",
    "contractId": 456,
    "escrowTransactionId": 789,
    "disputeType": "service_not_provided",
    "disputedAmount": "50000",
    "title": "서비스 미제공",
    "description": "예약된 투어가 진행되지 않았습니다."
  }'
```

### 14.7 분쟁 해결 예시

```bash
curl -X POST /api/admin/disputes/1/resolve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "full_refund",
    "resolutionSummary": "호스트 귀책으로 인한 전액 환불",
    "refundAmount": "50000",
    "favoredParty": "initiator"
  }'
```

### 14.8 에스크로 연동

- 분쟁 생성 시 관련 에스크로 트랜잭션이 `disputed` 상태로 변경
- 분쟁 해결 시 환불 유형에 따라:
  - `full_refund`: 전액 환불, 호스트 잔액 차감
  - `partial_refund`: 부분 환불, 해당 금액만 차감
  - `no_refund`: 환불 없음, 에스크로 상태 유지
- 분쟁 철회 시 에스크로 상태 `funded`로 복원

### 14.9 구현 파일

| 파일 | 설명 |
|------|------|
| `shared/schema.ts` | dispute_cases, dispute_evidence, dispute_activities 테이블 |
| `server/services/disputeService.ts` | 분쟁 비즈니스 로직 |
| `server/routes.ts` | API 엔드포인트 |

---

**문서 버전**: 1.9  
**최종 수정일**: 2025-12-05  
**작성자**: Tourgether QA Team  
**검토자**: [TBD]

---

## 구현 완료 요약

| Phase | 제목 | 상태 |
|-------|------|------|
| Phase 1-4 | 기본 기능 및 인증 | ✅ 완료 |
| Phase 5 | AI 사용량 제한 | ✅ 완료 |
| Phase 6 | 결제 시스템 기반 | ✅ 완료 |
| Phase 7 | Trip Pass | ✅ 완료 |
| Phase 8 | 정기 구독 | ✅ 완료 |
| Phase 9 | 에스크로 시스템 | ✅ 완료 |
| Phase 10 | 정기 결제 자동화 | ✅ 완료 |
| Phase 11 | 프로덕션 배포 체크리스트 | ✅ 완료 |
| Phase 12 | 호스트 정산 배치 시스템 | ✅ 완료 |
| Phase 13 | 계약 분할 결제 시스템 | ✅ 완료 |
| Phase 14 | 분쟁 관리 시스템 | ✅ 완료 |
