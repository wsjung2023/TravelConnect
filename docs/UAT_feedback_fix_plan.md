# Tourgether UAT 테스트 피드백 수정 계획서

## 개요
- **작성일**: 2025-12-28
- **테스트 기간**: 2025-12-28
- **피드백 수**: 25개 (이미지 기반)
- **테스트 사용자**: T01_t (Yuki Tanaka), T02_t (Min-ji Kim)

---

## 핵심 요구사항

### 1. i18n 다국어 번역
- **대상 언어**: 6개 (en, ko, ja, zh, fr, es)
- **저장 방식**: PostgreSQL `translations` 테이블
- **운영 배포**: 마이그레이션 SQL 스크립트로 퍼블리싱 시 자동 적용

### 2. 실시간 상호작용성 (SNS 핵심)
- **현재 상태**: WebSocket은 채팅/알림용으로만 사용 중
- **필요 기능**: 좋아요, 댓글, 팔로우 등 소셜 액션 실시간 브로드캐스트

---

## 피드백 상세 분석 (25개)

### 피드백 #1 (image_1766891007223.png)
- **화면**: 지도 화면 하단 네비게이션
- **문제**: "나" 탭에 내 사진으로 나올 수 있으면 좋겠음
- **분류**: UI/UX 개선
- **수정 파일**: `client/src/components/BottomNav.tsx`
- **수정 내용**: 네비게이션 "나" 탭에 현재 로그인 사용자의 프로필 이미지 표시

---

### 피드백 #2 (image_1766891019883.png)
- **화면**: 검색 결과 - 경복궁 게시글 상세
- **문제**: 한글 영문으로는 검색 잘됨 "kyungbok goong"
- **상태**: ✅ 정상 작동
- **비고**: 검색 기능 정상

---

### 피드백 #3 (image_1766891031901.png)
- **화면**: 지도 + 체험 상세 (Seoul Food Tour)
- **문제**: Food tour 검색 잘됨
- **상태**: ✅ 정상 작동
- **비고**: 체험 검색 기능 정상

---

### 피드백 #4 (image_1766891041936.png)
- **화면**: 새 게시글 작성 모달
- **문제 1**: 테마 종류 부족 (쇼핑이 없음) - DB에 충분한 값을 추가해야 함
- **문제 2**: 키가 그대로 노출 중 - DB에 값이 없는 듯 함
  - `post.gallery`
  - `post.takePhoto`
  - `post.recordVideo`
  - `post.addMedia`
  - `post.youtubeUrl`
  - `post.noMediaSelected`
- **분류**: i18n 번역 누락 + 데이터 추가
- **수정 파일**: 
  - `server/migrations/add_missing_translations.sql` (신규 생성)
  - `client/src/components/CreatePostModal.tsx` (테마 목록에 shopping 추가)
- **수정 내용**: 
  - translations 테이블에 누락된 키 6개 언어로 추가
  - 테마에 'shopping' 옵션 추가

---

### 피드백 #5 (image_1766891054903.png)
- **화면**: 지도 + 모뷔(피드) 화면
- **문제 1**: 게시글에 사진 넣고 위치 넣고 작성했으나 지도에 마커 표시 안됨
- **문제 2**: 모뷔에는 포스팅 되었는데 작성할때 반응이 없어서 여러 번 클릭했더니 클릭한 숫자만큼 중복 포스팅 되어버림
- **문제 3**: 삭제는 잘됨
- **분류**: 게시글 작성 문제
- **수정 파일**: 
  - `client/src/components/CreatePostModal.tsx`
  - `client/src/hooks/useMapMarkers.ts`
- **수정 내용**: 
  - mutation.isPending 상태로 버튼 disabled 처리 (중복 클릭 방지)
  - 게시글 작성 성공 시 '/api/posts' 쿼리 무효화 + 마커 갱신 트리거
  - 작성 중 로딩 상태 UI 표시

---

### 피드백 #6 (image_1766891065208.png)
- **화면**: 피드 상세 + 모뷔 피드 목록
- **문제 1**: T01_t가 작성한 포스팅에 T02t가 좋아요 눌렀으나, T01_t에 알람 도 안오고 실시간 숫자 안올라감
- **문제 2**: 모뷔에서 나갔다가 다시 들어왔지만 숫자 안바뀜 (새로운 알람도 없음)
- **분류**: 실시간 업데이트 문제 (Critical)
- **수정 파일**: 
  - `server/routes.ts` (POST /api/posts/:id/like)
  - `server/routes/social.ts`
- **수정 내용**: 
  - 좋아요 생성 시 notification 테이블에 알림 생성
  - WebSocket으로 포스트 작성자에게 즉시 브로드캐스트
  - 클라이언트에서 좋아요 mutation 후 해당 포스트 쿼리 무효화

---

### 피드백 #7 (image_1766891074664.png)
- **화면**: 피드 상세 + 댓글 영역
- **문제 1**: 댓글 달아봤으나 여전히 새로고침이 되지 않아서 t01_t에게는 아무댓글도 안보이고
- **문제 2**: 좋아요 숫자도 안올라가고 알람도 안옴
- **분류**: 실시간 업데이트 문제 (Critical)
- **수정 파일**: 
  - `server/routes.ts` (POST /api/posts/:id/comments)
  - `client/src/components/PostDetailModal.tsx`
- **수정 내용**: 
  - 댓글 생성 시 notification 테이블에 알림 생성
  - WebSocket으로 포스트 작성자에게 즉시 브로드캐스트
  - 클라이언트에서 댓글 mutation 후 comments 쿼리 무효화

---

### 피드백 #8 (image_1766891084828.png)
- **화면**: 피드 상세보기 (사진 슬라이드 + 댓글)
- **문제 1**: 피드상세보기 들어가니까 댓글은 달려져 있는게 보임
- **문제 2**: 사진을 옆으로 넘길때 반응이 느리고 슬라이딩처리가 안되어 있음
- **문제 3**: 댓글에 달려져 있는 t02_t의 사용자 명이 뭔지 모르겠음
- **문제 4**: 좋아요는 카운티 안되어 보임 (모뷔 작성자에게는 숫자가 안올라감 - 1은 본인이 누른거임)
- **문제 5**: 위치 태그가 특정 장소가 아니라 대한민국 서울특별시 매우 광범위 함 (IFC몰 파크원에 찍었으면 거기가 나와야 되는데)
- **문제 6**: 댓글에 대해서 좋아요, 대댓글 기능이 없음
- **분류**: UI/UX + 실시간 + 위치 저장 문제
- **수정 파일**: 
  - `client/src/components/PostDetailModal.tsx` (사진 슬라이드)
  - `client/src/components/CreatePostModal.tsx` (위치 저장)
  - `server/routes.ts` (댓글 좋아요/대댓글 - 향후 기능)
- **수정 내용**: 
  - embla-carousel 스와이프 제스처 최적화
  - 댓글 작성자 이름 표시 개선 (username 대신 displayName 우선)
  - 위치 저장 시 place.name 또는 formatted_address 구체적 저장
  - 댓글 좋아요/대댓글은 향후 기능으로 분류

---

### 피드백 #9 (image_1766891094556.png)
- **화면**: 피드 카드 (좋아요, 댓글, 북마크 버튼)
- **문제 1**: 이버튼이 무슨 기능인지 전혀 감을 못잡겠는데 알려주길 바람 (북마크 버튼)
- **문제 2**: 실제 작동이 어떻게 되는지 그리고 이 사용자의 프로필로 가는 방법을 모르겠음
- **분류**: UI/UX 개선
- **수정 파일**: 
  - `client/src/components/PostCard.tsx` 또는 피드 카드 컴포넌트
  - `client/src/pages/feed.tsx`
- **수정 내용**: 
  - 북마크 버튼에 툴팁 추가 ("저장하기" / "Save")
  - 사용자 아바타/이름 클릭 시 프로필 페이지로 이동 기능 확인

---

### 피드백 #10 (image_1766891105362.png)
- **화면**: 지도 + Nearby 패널 (주변 체험)
- **문제**: 위치가 서울특별시까지밖에 안되어 있으므로 Nearby 패널에 당연히내 게시글이 안보임
- **분류**: 위치 저장 문제
- **수정 파일**: `client/src/components/CreatePostModal.tsx`
- **수정 내용**: 위치 저장 시 구체적인 좌표(latitude, longitude) 저장 확인 + place_id 저장

---

### 피드백 #11 (image_1766891114345.png)
- **화면**: 지도 + Nearby 패널 (열린 사람들)
- **문제**: T02_t minki 도 켜니까 t01_t 유키 한테는 민지도 뜸 둘다뜸 - 작동 원리 궁금함(거리, 현재 좌표기반인지 지도기반인지)
- **분류**: 기능 설명 필요
- **비고**: Open to Meet은 현재 지도 뷰포트 기반으로 표시됨. 문서화 또는 UI 설명 추가 권장

---

### 피드백 #12 (image_1766891125686.png)
- **화면**: 채팅 목록 + 채널 상세
- **문제 1**: T02_t민지가 니어바이에 열린사람인 t01_t 유키를 클릭 하니까 chat 화면으로 오는데 유키는 chat안나오고 채팅 리스트만 나옴
- **문제 2**: 어떻게 검색해야할지도 모르겠음
- **문제 3**: 바로 채팅이 열리든가, 프로필통해서 채팅을 할수 있어야하는데 그렇게 안됨
- **문제 4**: 검색도 안되는거같음 - 이름인 tanaka 로 검색하니까 tanaka라는 채널이 만들어져버림, 삭제도 안됨(채널떠나기)
- **분류**: 채팅 연결 문제 (Critical)
- **수정 파일**: 
  - `client/src/components/MapComponent.tsx` (onOpenUserClick 핸들러)
  - `client/src/pages/chat.tsx`
- **수정 내용**: 
  - Open to Meet 사용자 클릭 시 DM 대화방 생성 API 호출 → 해당 채팅방으로 이동
  - 채팅 검색 기능과 채널 생성 기능 분리
  - 채널 삭제(떠나기) 기능 수정

---

### 피드백 #13 (image_1766891135684.png)
- **화면**: 지도 + Nearby 패널 (피드 탭)
- **문제 1**: 피드탭 클릭 했으나 좀전에 올린 IFC몰 관련 글은 안보임(아마 위치가 서울특별시...이기때문 아닐지..nearby 에 표시를 못하는)
- **문제 2**: 그리고 사진이 없어서 그런지 전부 사진 깨짐
- **문제 3**: FEED-002 피드 모드 변경 (어디서 어떻게 하는지 모르겠음)
- **문제 4**: FEED-004 트랜딩 해시태그 : 어떻게 확인 하는지 모르겠음)
- **분류**: UI/UX + 위치 + 이미지 처리
- **수정 파일**: 
  - `client/src/components/CreatePostModal.tsx` (위치)
  - 피드 카드 컴포넌트 (사진 깨짐)
  - `client/src/pages/feed.tsx` (피드 모드)
- **수정 내용**: 
  - 위치 좌표 정확히 저장
  - 사진 없는 게시글에 기본 이미지 또는 빈 상태 UI 표시
  - 피드 정렬 옵션 UI 위치 명확화
  - 트렌딩 해시태그 UI 위치 명확화

---

### 피드백 #14 (image_1766891145088.png)
- **화면**: 새 게시글 작성 모달 (태국여행 - 치앙마이)
- **문제 1**: 동영상 첨부시 최대 몇 개인가? 16메가도 첨부가 안되네?
- **문제 2**: 여기서는 또 위치 가 추가 되네?
- **문제 3**: 키가 노출되고 있음 (post.addMedia 등)
- **분류**: 파일 업로드 제한 + i18n 번역 누락
- **수정 파일**: 
  - `server/routes.ts` (multer 설정)
  - `server/migrations/add_missing_translations.sql`
- **수정 내용**: 
  - 동영상 파일 크기 제한 확인 및 에러 메시지 개선
  - i18n 키 추가 (post.addMedia, post.videoTooLarge, post.videoTooLargeDesc)

---

### 피드백 #15 (image_1766891156749.png)
- **화면**: 새 게시글 작성 모달 + 브라우저 콘솔
- **문제 1**: 게시글 작성 실패
- **문제 2**: Console에 i18next::translator: missingKey 다수 표시됨
- **문제 3**: Internal Server Error (POST 500)
- **분류**: 서버 에러 + i18n 번역 누락
- **수정 파일**: 
  - `server/routes.ts` (POST /api/posts)
  - `server/migrations/add_missing_translations.sql`
- **수정 내용**: 
  - 서버 에러 로그 확인 후 원인 파악 및 수정
  - 누락된 i18n 키 전부 추가

---

### 피드백 #16 (image_1766891167125.png)
- **화면**: 미니컨시어지 플랜 선택 모달 + 에러 토스트
- **문제**: 게시글 작성 실패 에러 표시됨
- **분류**: 서버 에러
- **수정 파일**: `server/routes.ts`
- **수정 내용**: 피드백 #15와 동일 - 게시글 작성 API 에러 수정

---

### 피드백 #17 (image_1766891176231.png)
- **화면**: 지도 + Nearby Experiences 패널
- **문제**: 갑자기 t01_t 가 작성한게 t02_t 의 nearby에 보이기 시작하는데 아까는 안보였는데 왜 지금은 보이는지 왜 nearby에 보이는지 모르겠음. 좌표가어떻게 되어 있길래?
- **분류**: 기능 동작 원리 불명확
- **비고**: Nearby는 현재 지도 뷰포트 내의 게시글/체험을 표시함. 위치 좌표가 정확해야 표시됨.

---

### 피드백 #18 (image_1766891189929.png)
- **화면**: 지도 + 미니컨시어지 플랜 상세
- **문제**: 미니컨시어지는 의도 대로 잘 작동은 되는것 같기한데...뭔가 밋밋함
- **상태**: ✅ 기능 정상 작동
- **분류**: UI/UX 개선 (향후)
- **비고**: 미니컨시어지 UI 디자인 개선은 향후 과제

---

### 피드백 #19 (image_1766891202562.png)
- **화면**: 지도 + Open to Meet 마커
- **문제 1**: 아래 이걸 켜놔서 t02_t가 보여지는데, 클릭하면 채팅 메인으로만 가지고 말시킬수가 없음
- **문제 2**: t01_t는데 나한테 내가 보이는건 좋은데 ...그 이후 클릭하면 타인 클릭한것과 똑같이 작동하는 건 문제
- **분류**: 채팅 연결 + 본인 표시 문제
- **수정 파일**: 
  - `client/src/components/MapComponent.tsx`
  - `server/routes.ts` (/api/users/open)
- **수정 내용**: 
  - Open to Meet 사용자 클릭 시 DM 생성 및 채팅방 이동
  - 본인은 Open to Meet 목록에서 제외하거나, 클릭 시 다른 동작 (프로필 편집 등)

---

### 피드백 #20 (image_1766891211910.png)
- **화면**: 알림 드롭다운
- **문제**: 아까 일어난 일이 왜이렇게 한참있다가 알람이 왔을까? 한참있다가 알람이 나타남
- **분류**: 실시간 알림 지연 (Critical)
- **수정 파일**: 
  - `server/routes.ts` (sendNotificationToUser 함수)
  - WebSocket 브로드캐스트 로직
- **수정 내용**: 
  - 알림 생성 즉시 WebSocket으로 전송 확인
  - 알림 폴링 간격 확인 (현재 WebSocket이 끊어진 경우 폴백)

---

### 피드백 #21 (image_1766891296039.png)
- **화면**: 체험 상세 + 가이드 프로필
- **문제 1**: 체험 상세조회하여 가이드 클릭하면 가이드 프로필나옴
- **문제 2**: 오른쪽에 저거는 가이드 누르면 아래와 같은 화면이 나옴
- **문제 3**: guide.notFound, guide.notFoundDesc 키 노출
- **분류**: i18n 번역 누락 + 가이드 프로필 조회 문제
- **수정 파일**: 
  - `server/migrations/add_missing_translations.sql`
  - `client/src/pages/guide-profile.tsx`
  - `server/routes.ts` (가이드 조회 API)
- **수정 내용**: 
  - guide.* 관련 i18n 키 전부 추가
  - 가이드 프로필 조회 실패 시 에러 처리 개선

---

### 피드백 #22 (image_1766891304918.png)
- **화면**: 가이드 프로필 상세
- **문제 1**: 버튼과 탭 등이 이 키가 그대로 노출되는중 언어 데이터 없음
  - `guide.sendMessage`
  - `guide.experiencesTab`
  - `guide.storiesTab`
  - `guide.reviewsTab`
  - `guide.viewDetails`
  - `guide.hours`
  - `guide.maxParticipants`
  - `guide.verifiedGuide`
  - `guide.categoryTour`
  - `guide.categoryFood`
- **문제 2**: 메시지 버튼이 안먹힘
- **문제 3**: 가이드리뷰탭 누르면 아무것도 없음
- **문제 4**: 전반적으로 뒤로 가기 버튼이 없음
- **분류**: i18n 번역 누락 + 기능 미구현
- **수정 파일**: 
  - `server/migrations/add_missing_translations.sql`
  - `client/src/pages/guide-profile.tsx`
- **수정 내용**: 
  - guide.* 관련 i18n 키 전부 추가 (6개 언어)
  - sendMessage 버튼 onClick 핸들러 구현 (DM 생성 → 채팅 이동)
  - 뒤로가기 버튼 상단에 추가
  - 리뷰탭 빈 상태 UI 표시

---

### 피드백 #23 (image_1766891314317.png)
- **화면**: 체험 예약 폼 + 프로필 예약 탭
- **문제 1**: 예약 하기 누르면 예약이 되었다고 나오는데 또하면 또 예약 됨
- **문제 2**: 예약할때 결제기능이 전혀 없이 예약됨
- **문제 3**: 상품의 날짜별 갯수 제한은 없는가?
- **문제 4**: 예약 내역이 어떤 알람에도 안들
- **문제 5**: 내예약에도 없음
- **분류**: 예약 시스템 문제 (Critical)
- **수정 파일**: 
  - `client/src/components/BookingModal.tsx` 또는 `SlotBookingModal.tsx`
  - `server/routes.ts` (booking 생성 API)
  - `client/src/pages/profile.tsx` (예약 탭)
- **수정 내용**: 
  - 예약 전 동일 사용자/슬롯 중복 체크
  - 예약 시 결제 플로우 연동 (PortOne)
  - 슬롯 잔여 수량 체크
  - 예약 생성 시 호스트에게 알림 생성
  - 예약 목록 API 연결 확인

---

### 피드백 #24 (image_1766891323345.png)
- **화면**: 프로필 - 체험 탭
- **문제**: 체험에 뜨긴함. 이화면에서 체험과 예약의 차이가 뭔인가
- **분류**: UI/UX - 용어 설명 필요
- **비고**: 
  - "체험": 내가 등록한 체험 상품
  - "예약": 내가 예약한 다른 사람의 체험
  - UI에 설명 문구 또는 탭 이름 개선 필요

---

### 피드백 #25 (image_1766891390992.png)
- **화면**: UAT 시나리오 기반 종합 정리
- **내용**:

#### 25-1. HOST 관련
- 호스트 되기 버튼 누르면 바로 인증된호스트가 되어버림 - 중간 과정이 없음
- **수정 파일**: `server/routes.ts` (호스트 신청 API)
- **수정 내용**: 신청 → 심사 대기 → 승인 플로우 추가

#### 25-2. MAP-006
- 지도에서 게시글 작성 : 지도에서 게시글 작성시 특정 장소를 입력하거나 특정위치에 놓고 작성했는데, 해당 위치에 핀이 안생김
- **수정 파일**: `client/src/components/CreatePostModal.tsx`, `client/src/hooks/useMapMarkers.ts`
- **수정 내용**: 게시글 작성 후 마커 갱신 트리거

#### 25-3. FEED-004
- 내용이 무슨 내용인지 몰라서 테스트를 못하겠음
- **비고**: UAT 시나리오 문서 확인 필요

#### 25-4. FEED-002
- 피드 모드 선택기에서 '최신순' 선택 그런기능이 어디있는지 못찾겠음
- **수정 파일**: `client/src/pages/feed.tsx`
- **수정 내용**: 정렬 옵션 UI 위치 명확화

#### 25-5. FEED-007
- 위치태깅 게시글 핀이 안생김
- **수정 파일**: 피드백 #5, #25-2와 동일

#### 25-6. FEED-011
- 전반적으로 실시간성이 없음 댓글, 좋아요, 채팅, 등 실시간성 문제 있음
- **수정 파일**: `server/routes.ts`, WebSocket 로직
- **수정 내용**: 소셜 액션 WebSocket 브로드캐스트 추가

#### 25-7. FEED-012
- 프로필에서 북마크 안보인
- **수정 파일**: `client/src/pages/profile.tsx`
- **수정 내용**: 북마크 탭 구현 확인

#### 25-8. FEED-013
- SNS 공유 문제
- **수정 파일**: 공유 기능 관련 컴포넌트
- **수정 내용**: SNS 공유 기능 구현 확인

#### 25-9. CHAT-001~010
- 전반적으로 채팅 상호작용 안됨, 채팅으로 연결이 안됨, 프로필이든, 노출 기능이든 서로 상호 작용 채팅연결 테스트가 안됨 (상대방 검색도 안되고, 나의 기본 프로필명도 이상하게 나옴)
- **수정 파일**: 
  - `client/src/components/MapComponent.tsx`
  - `client/src/pages/chat.tsx`
  - `client/src/pages/profile.tsx`
- **수정 내용**: 
  - Open to Meet 클릭 시 DM 생성 및 채팅방 이동
  - 채팅 검색/생성 분리
  - 프로필에서 DM 시작 버튼 추가

#### 25-10. EXP-001
- 마켓플레이스페이지로 가는 방법이 없음 (URL로 가세요라는 말따위 인정할생각없음)
- **수정 파일**: `client/src/App.tsx` 또는 네비게이션 컴포넌트
- **수정 내용**: 마켓플레이스 접근 버튼/링크 추가

#### 25-11. EXP-002~005
- 테스트불가
- **비고**: EXP-001 해결 후 테스트 가능

#### 25-12. EXP-009~012
- 체험의 수량, 날짜별 마감, 중복 예약 되어버리는 문제, 체험 예약시 결제도 안함
- **수정 파일**: 피드백 #23과 동일

#### 25-13. HOST-001
- 호스트신청 허들이 없음. 신청하면 바로 인증되었다고 나옴
- **수정 파일**: `server/routes.ts`
- **수정 내용**: 호스트 신청 심사 플로우 추가

#### 25-14. HOST-002
- 호스트 대시보드로 갈방법이 없음(URL로 가세요라는 말따위 인정할생각없음)
- **수정 파일**: `client/src/pages/profile.tsx`
- **수정 내용**: 호스트인 경우 "호스트 대시보드" 버튼 추가

---

## 수정 대상 파일 요약

### 신규 생성 파일
| 파일 | 설명 |
|------|------|
| `server/migrations/add_missing_translations.sql` | i18n 누락 키 6개 언어 마이그레이션 |

### 수정 대상 파일 (서버)
| 파일 | 수정 항목 |
|------|----------|
| `server/routes.ts` | 실시간 좋아요/댓글 알림 WebSocket 브로드캐스트, 예약 중복 체크, 호스트 심사 플로우, Open to Meet 본인 제외 |
| `server/routes/social.ts` | 좋아요/댓글 알림 생성 |
| `server/routes/chat.ts` | DM 생성 API 확인 |

### 수정 대상 파일 (클라이언트)
| 파일 | 수정 항목 |
|------|----------|
| `client/src/components/CreatePostModal.tsx` | 중복 클릭 방지, 위치 저장 개선, 테마에 shopping 추가 |
| `client/src/components/MapComponent.tsx` | Open to Meet 클릭 시 DM 생성 및 채팅 이동, 본인 제외 |
| `client/src/components/PostDetailModal.tsx` | 사진 슬라이드 최적화, 댓글 무효화 |
| `client/src/components/BottomNav.tsx` | 프로필 이미지 표시, 마켓플레이스 링크 |
| `client/src/components/BookingModal.tsx` | 결제 플로우 연동 |
| `client/src/pages/chat.tsx` | 검색/생성 분리 |
| `client/src/pages/guide-profile.tsx` | 메시지 버튼 구현, 뒤로가기, i18n |
| `client/src/pages/profile.tsx` | 호스트 대시보드 링크, 북마크 탭, 예약 목록 |
| `client/src/pages/feed.tsx` | 정렬 옵션 UI 명확화 |
| `client/src/hooks/useMapMarkers.ts` | 게시글 작성 후 마커 갱신 |
| 피드 카드 컴포넌트 | 사진 없을 때 기본 UI, 북마크 툴팁 |

---

## 수정 우선순위

### 1단계: i18n 번역 데이터 (긴급)
- `server/migrations/add_missing_translations.sql` 생성
- 6개 언어 × 약 30개 키 = 180개 INSERT문

### 2단계: 실시간 상호작용성 (핵심)
- 좋아요/댓글 시 notification 생성 + WebSocket 브로드캐스트
- 알림 즉시 전송 확인

### 3단계: 게시글 작성 문제
- 중복 클릭 방지
- 위치 저장 개선
- 마커 갱신

### 4단계: 채팅/Open to Meet 연결
- Open to Meet 클릭 시 DM 연결
- 검색/생성 분리
- 본인 제외

### 5단계: 네비게이션 개선
- 마켓플레이스 접근
- 호스트 대시보드 접근
- 피드 정렬 UI

### 6단계: 예약 시스템
- 결제 연동
- 중복 예약 방지
- 수량 제한

### 7단계: UI/UX 개선
- 프로필 사진
- 슬라이드 최적화
- 툴팁 추가

---

## 누락된 i18n 키 목록 (6개 언어 필요)

### namespace: ui

#### post 관련
- `post.gallery`
- `post.takePhoto`
- `post.recordVideo`
- `post.addMedia`
- `post.youtubeUrl`
- `post.noMediaSelected`
- `post.videoTooLarge`
- `post.videoTooLargeDesc`

#### guide 관련
- `guide.notFound`
- `guide.notFoundDesc`
- `guide.sendMessage`
- `guide.experiencesTab`
- `guide.storiesTab`
- `guide.reviewsTab`
- `guide.viewDetails`
- `guide.hours`
- `guide.maxParticipants`
- `guide.verifiedGuide`
- `guide.categoryTour`
- `guide.categoryFood`

#### themes 관련
- `themes.shopping`

---

## 실시간 브로드캐스트 구현 명세

### 1. 좋아요 실시간 알림
```typescript
// server/routes.ts - POST /api/posts/:id/like
// 1. 좋아요 생성
const like = await storage.createLike({ postId, userId });

// 2. 포스트 작성자에게 알림 생성 (본인 제외)
if (post.userId !== userId) {
  const notification = await storage.createNotification({
    userId: post.userId,
    type: 'LIKE',
    message: `${liker.displayName}님이 회원님의 게시글을 좋아합니다`,
    relatedId: postId,
    actorId: userId,
  });
  
  // 3. WebSocket으로 즉시 전송
  sendNotificationToUser(post.userId, notification);
  
  // 4. 좋아요 카운트 브로드캐스트 (해당 포스트를 보고 있는 모든 사용자에게)
  broadcastToPost(postId, { type: 'like_count_updated', postId, count: newCount });
}
```

### 2. 댓글 실시간 알림
```typescript
// server/routes.ts - POST /api/posts/:id/comments
// 1. 댓글 생성
const comment = await storage.createComment({ postId, userId, content });

// 2. 포스트 작성자에게 알림 생성 (본인 제외)
if (post.userId !== userId) {
  const notification = await storage.createNotification({
    userId: post.userId,
    type: 'COMMENT',
    message: `${commenter.displayName}님이 댓글을 남겼습니다: ${content.slice(0, 30)}...`,
    relatedId: postId,
    actorId: userId,
  });
  
  // 3. WebSocket으로 즉시 전송
  sendNotificationToUser(post.userId, notification);
  
  // 4. 새 댓글 브로드캐스트 (해당 포스트를 보고 있는 모든 사용자에게)
  broadcastToPost(postId, { type: 'new_comment', postId, comment });
}
```

---

## 비고

- 이 문서는 25개 테스트 피드백을 기반으로 작성됨
- 각 수정 사항은 해당 파일의 관련 함수/컴포넌트에서 수정
- i18n 마이그레이션은 6개 언어 전부 포함하여 운영 배포 시 자동 적용
- 실시간성은 SNS 플랫폼의 핵심이므로 최우선 수정
