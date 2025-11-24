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

**문서 버전**: 1.0  
**작성일**: 2024-11-24  
**작성자**: Tourgether QA Team  
**검토자**: [TBD]
