# Tourgether 코드기반 상세 작업지시서

기준 소스:
- `TravelConnect-main.zip`
- `Tourgether SNS 앱 UI_UX 3개월 리뉴얼 로드맵.pdf`

작성 기준:
- “지금 실제 코드에 무엇이 있는가”를 먼저 보고,
- 그 다음 “로드맵이 요구하는 제품 경험”과 비교하여,
- Replit에서 바로 실행 가능한 형태의 작업지시로 재정리함.

---

## 1. 한 줄 결론

현재 Tourgether는 **기능은 많지만 경험이 하나로 응집되지 않은 상태**다.
즉,
- 지도,
- 피드,
- 채팅,
- 타임라인,
- Mini Concierge,
- Open to Meet,
- CineMap
이 각각은 존재하거나 흔적이 있는데,
사용자가 느끼는 제품은 아직 **“지도 기반 고급 여행 SNS”**가 아니라 **“여행 관련 기능이 많이 들어간 모바일 웹앱”**에 더 가깝다.

이번 리뉴얼의 핵심은 단순 미화가 아니라,
**앱의 주인공을 ‘지도’에서 ‘지도 위의 사람과 이야기’로 교체하는 것**이다.

---

## 2. 내가 이해한 당신의 의도

내가 이해한 당신의 의도는 아래와 같다.

### 2.1 당신이 진짜 만들고 싶은 것
당신은 단순한 여행 정보 앱이나 지도 앱을 만들고 싶은 게 아니다.
당신이 원하는 것은:

1. **여행자와 현지인/가이드/호스트가 실제로 연결되는 앱**
2. **여행의 감정과 사람의 스토리가 지도 위에 흐르는 SNS**
3. **즉흥적 만남(Serendipity), Mini Concierge, CineMap 같은 Tourgether 고유 기능이 전면에 드러나는 앱**
4. **처음 켜는 순간부터 “이건 싸구려 MVP가 아니라 프리미엄 앱이다”라는 인상을 주는 앱**
5. **1인 개발 체제에서도 Replit로 점진적으로 구현 가능한 구조**

### 2.2 당신이 원하지 않는 것
당신은 아래 상태를 원하지 않는다.

- 지도만 있고 사람 냄새가 없는 앱
- 기능은 많지만 메뉴와 화면 흐름이 어수선한 앱
- 번역/채팅/타임라인/매칭이 각각 따로 노는 앱
- UI가 단순하고 가벼워 보여서 “대충 만든 앱”처럼 느껴지는 상태
- AI가 코드 여기저기에 막 덧칠되어 유지보수가 더 어려워지는 상태

### 2.3 이번 작업의 진짜 목표
이번 작업의 목표는 “예쁘게 바꾸기”가 아니다.
진짜 목표는 다음 3개다.

1. **제품 정체성 정렬**
   - 현재 코드가 Tourgether의 비전과 같은 방향을 보게 만든다.

2. **앱 구조 재정렬**
   - 홈/지도/탭/피드/채팅/타임라인 흐름을 하나의 제품 경험으로 묶는다.

3. **Replit 친화적 실행계획**
   - 큰 그림만 멋지게 말하는 게 아니라,
     실제 파일 단위 수정 지시로 떨어뜨린다.

---

## 3. PDF 플랜을 읽고 정리한 핵심 방향

로드맵의 핵심은 매우 선명하다.

- 현재 Tourgether는 기능은 있으나 UI/UX가 “단순 지도 앱 수준”이라 감정적 몰입과 SNS형 네트워킹을 이끌지 못하고 있고,
- 이를 “지도 위에 흐르는 사람들의 이야기”를 보여주는 감성 기반 여행 SNS로 바꾸려는 것이 목표다.
- Month 1은 디자인 시스템, 다크 지도, 탭 구조, 바텀시트 같은 뼈대 교체,
- Month 2는 콘텐츠 카드, 릴스형 피드, CineMap, Mini Concierge, Serendipity 같은 킬러 기능 시각화,
- Month 3는 마이크로 인터랙션, 랜딩페이지 통일, 다국어 채팅 UX, QA/폴리싱에 초점이 있다.
- 특히 Quick Wins로는 하단 네비게이션 교체, 브랜드 컬러 일괄 적용, 마커를 원형 이미지화, “지금 1시간 뭐하지” 노출, 폰트 가독성 개선이 제시되어 있다.

즉 이 플랜은 **겉모습 리뉴얼**이 아니라,
**Tourgether가 무엇을 우선적으로 보여줘야 하는 앱인지 재정의하는 문서**다.

---

## 4. 현재 소스코드 전체 분석 요약

### 4.1 기술 스택
현재 코드는 아래 축으로 구성된다.

- Frontend: React + Vite + TypeScript + Wouter + TanStack Query + Tailwind
- Backend: Express + TypeScript
- ORM/DB: Drizzle + PostgreSQL 계열 구조
- 지도: Google Maps JavaScript API
- 실시간: WebSocket
- AI: Mini Concierge / CineMap / 번역 / Concierge 라우트 존재
- 국제화: DB 기반 translations + i18next

즉, 완전히 초보적인 프로젝트는 아니다.
기능 축은 이미 꽤 넓다.

### 4.2 코드베이스의 실제 상태
현재 코드는 “기능 확장”은 많이 되었지만 “제품 경험 통합”은 덜 되었다.
다음 특징이 강하다.

1. **기능이 풍부하다**
   - 지도
   - 포스트/피드
   - 경험(Experience)
   - 타임라인
   - CineMap
   - Mini Concierge
   - 채팅/번역
   - Open to Meet
   - 구독/결제/계약
   - 관리자 화면

2. **하지만 UX 중심축이 분산되어 있다**
   - 홈이 곧 앱의 중심이지만,
   - 피드/채팅/프로필/타임라인이 각각 별도 라우트와 홈 내부 탭 구조로 이중 관리된다.

3. **로드맵이 원하는 화면 구조와 실제 화면 구조가 다르다**
   - 로드맵은 `[지도 | 탐색 | 만나기 | 채팅 | 나]`
   - 현재 코드는 `map / feed / timeline / chat / profile + create post FAB`

4. **코드 정리도가 균일하지 않다**
   - `server/routes/index.ts`처럼 모듈화된 구조가 있는 반면,
   - `server/routes.ts`라는 대형 legacy 진입점도 여전히 존재한다.

5. **리포지토리에 운영/개발/백업/문서/스크린샷이 한데 섞여 있다**
   - `legacy_src_bak`
   - 루트 PNG 스크린샷 다수
   - `attached_assets`
   - 대량의 md/docs 파일
   - 이는 Replit AI가 컨텍스트를 읽을 때 노이즈가 된다.

---

## 5. 코드에서 확인된 핵심 문제

### 문제 1. 내비게이션 구조가 제품 철학과 안 맞는다

#### 현재 상태
- `client/src/pages/home.tsx` 안에서 `activeTab`으로 내부 탭 렌더링을 관리한다.
- 그런데 하단 네비게이션 클릭 시 `feed`, `chat`, `profile`, `timeline`은 다시 `navigate('/feed')`, `navigate('/chat')`처럼 **별도 라우트로 이동**한다.
- 즉, 홈 내부 탭 구조와 독립 페이지 구조가 섞여 있다.

#### 왜 문제인가
이 구조는
- 상태 관리가 꼬이고,
- 탭 지속성이 약하고,
- “앱이 하나의 흐름으로 움직인다”는 느낌을 깨뜨린다.

#### 결과
현재 앱은 사용자에게
“하나의 통합 앱”이라기보다
“서로 다른 페이지를 돌아다니는 웹앱”처럼 느껴질 가능성이 크다.

---

### 문제 2. 로드맵의 중심인 ‘만나기’가 탭 구조에 없다

#### 현재 상태
하단 탭은 다음 구조다.
- map
- feed
- timeline
- chat
- profile
그리고 가운데에 create post FAB가 끼어 있다.

#### 로드맵 요구
로드맵은 분명히 다음 구조를 요구한다.
- 지도
- 탐색
- 만나기
- 채팅
- 나

#### 왜 문제인가
Tourgether의 차별점은 단순 피드가 아니라
**즉흥 만남, 주변 사람, Serendipity, 오프라인 연결**인데,
지금 구조는 그 킬러 기능을 메인 축이 아니라 부가기능처럼 취급한다.

---

### 문제 3. 지도 경험이 아직 Google Maps 중심 기능앱 느낌이다

#### 현재 상태
- `client/src/components/MapComponent.tsx`는 Google Maps 기반이다.
- `client/src/lib/loadGoogleMaps.ts`도 Google Maps 로더다.
- `useMapMarkers`, `usePOIMarkers` 역시 Google Maps 기반 최적화 훅이다.
- POI, 포스트, 체험, open users 등을 마커로 올리는 기능은 있다.

#### 문제의 본질
문제는 지도 엔진 자체보다도,
현재 지도 화면이 아직 **사람 중심 스토리 캔버스**보다 **기능형 맵 UI**에 가깝다는 것이다.

예:
- 프로필 버블보다 SVG/이모지 마커 느낌이 강함
- 바텀시트 중심 UX가 아님
- 다크 럭셔리 톤이 아님
- 주변 사람/스토리/만남의 감정선보다 기능 패널 느낌이 강함

#### 결론
지도는 이미 강점이지만,
지금 상태는 **Tourgether의 시그니처 무드**를 보여주지 못한다.

---

### 문제 4. Serendipity 관련 백엔드/스키마는 있는데, 프론트 핵심 경험이 없다

#### 현재 상태
코드에는 아래 흔적이 있다.
- `shared/schema.ts`에 quest / questParticipants / questHighlights 구조 존재
- open to meet 관련 사용자 컬럼 존재
- `OpenToMeetToggle` 존재
- `getOpenUsers`도 존재

#### 하지만
- 전용 “만나기” 화면이 없다.
- 레이더 UI가 없다.
- 주변 사용자 발견 → 매칭 → 첫 인사 → 대화방 진입 흐름이 핵심 화면으로 살아 있지 않다.
- `MapComponent.tsx`의 MiniMeet 관련 일부는 임시 비활성화 흔적이 있다.

#### 결론
백엔드 씨앗은 있는데,
사용자가 체감할 프론트 꽃이 아직 안 폈다.

---

### 문제 5. Feed는 있지만 ‘탐색’ 경험으로 브랜딩되어 있지 않다

#### 현재 상태
- `client/src/pages/feed.tsx`는 포스트/Experience 혼합형 피드다.
- virtualization, like, comment, save, detail modal 등 일반적인 기능이 있다.

#### 문제
로드맵은 탐색 탭을
- 릴스형,
- 몰입형,
- 장소/스토리/사람 발견 중심
으로 밀고 있다.

그런데 현재 피드는 구조상 아직
“게시글 리스트 + 경험 리스트”의 성격이 강하다.

#### 결론
피드는 존재하지만,
**탐색의 감각**은 아직 약하다.

---

### 문제 6. 채팅은 기능적이지만 프리미엄 다국어 UX는 아직 아니다

#### 현재 상태
- `client/src/components/EnhancedChatWindow.tsx`에서 메시지 번역 버튼이 있다.
- `/api/messages/:messageId/translate` 라우트도 있다.

#### 문제
로드맵이 요구하는 것은 단순 번역 버튼이 아니다.
원문/번역 토글,
언어 감지 뱃지,
자주 쓰는 여행 퀵 리플라이,
프리미엄 DM 경험이다.

#### 결론
지금 채팅은 “작동하는 번역 채팅”이지,
“여행에서 정말 쓰고 싶은 고급 번역 DM”은 아니다.

---

### 문제 7. 타임라인/CineMap은 존재하지만 앱의 영웅 화면은 아니다

#### 현재 상태
- `client/src/pages/timeline.tsx`
- `server/ai/cinemap.ts`
- `/api/cinemap/jobs`
구조가 이미 존재한다.

#### 문제
로드맵은 CineMap과 여행 경로가 브랜드의 상징처럼 보이길 원한다.
하지만 현재 구조에서는 타임라인/CineMap이 제품 정체성을 끌고 가는 메인 엔진보다는,
“좋은 기능 하나” 정도로 보일 가능성이 있다.

#### 결론
CineMap은 Tourgether의 간판이 될 자격이 있는데,
현재 UI에서는 아직 사이드 영웅이다.

---

### 문제 8. 라이트한 표정과 혼합된 스타일이 프리미엄 무게감을 깎는다

#### 현재 상태
- `client/src/index.css`에 색 토큰은 나름 신경 써서 정의되어 있다.
- 그러나 기본 바탕은 밝고 가벼우며,
- 헤더/버튼/카드/네비게이션 모두 전반적으로 “친근한 모바일 웹앱” 톤이 더 강하다.

#### 문제
당신이 원하는 앱은
- 무게감 있고
- 세련되고
- 비싸 보이고
- 감성적이면서도 신뢰감 있는 앱이다.

현재 색과 구조는 “좋은 출발점”은 되지만,
그 수준까지 밀어붙인 상태는 아니다.

---

### 문제 9. 일부 기능은 아직 stub / TODO 단계다

실제 코드에서 확인되는 것들:
- 저장 포스트 API는 빈 배열 반환
- billing 일부는 TODO
- timeline 라우트에 TODO 흔적 존재
- MiniMeet 일부 비활성화 흔적 존재
- report/save/template detail 등 TODO 존재

즉, 겉으로 기능이 많아 보여도,
제품 체험상 핵심이 되는 일부 포인트는 아직 임시 상태다.

---

### 문제 10. 리포지토리 구조가 Replit AI를 헷갈리게 만든다

현재 프로젝트 루트에는 아래가 섞여 있다.
- 실제 코드
- 백업
- PNG 캡처
- attached_assets
- legacy source backup
- 다량의 문서

이건 사람에겐 참을 수 있어도,
Replit AI나 Cursor 류 도구에겐 **강한 노이즈**다.
작업지시를 내려도 관련 없는 파일을 건드릴 확률이 높아진다.

---

## 6. 최종 진단

현재 Tourgether는 **기능 확장형 MVP**로서는 꽤 많이 와 있다.
하지만 당신이 원하는 건 그 단계가 아니다.

당신이 원하는 건:
- 기능이 많은 앱이 아니라,
- 방향이 선명한 앱,
- 한 화면만 봐도 브랜드와 철학이 느껴지는 앱,
- 사용자 감정과 만남이 살아 있는 앱이다.

그래서 이번 리뉴얼은 “코드 몇 군데 고치는 작업”이 아니라,
아래 세 가지를 동시에 해야 한다.

1. **앱 쉘 재정의**
2. **맵 중심 경험 재정의**
3. **Tourgether 킬러 기능 전면 배치**

---

## 7. 리뉴얼 구현 원칙

### 원칙 1. 기존 기능을 최대한 살리고 껍데기부터 새로 짠다
완전 재개발 금지.
현재 있는 기능을 살리되,
앱 쉘/네비게이션/화면 계층부터 새로 정리한다.

### 원칙 2. 홈 = 지도 + 바텀시트 중심으로 재설계한다
현재 홈은 지도 위에 검색바와 탭을 얹은 구조인데,
앞으로는
**지도는 배경 / 바텀시트는 콘텐츠 / 사람과 스토리는 전면**
구조로 간다.

### 원칙 3. “만나기”를 탭의 중심 기능으로 승격한다
Serendipity는 부가기능이 아니라 브랜드 중심 기능으로 승격한다.

### 원칙 4. 피드는 ‘탐색’으로 재브랜딩한다
리스트형 피드에서,
발견형/릴스형/장소 연결형 탐색 경험으로 바꾼다.

### 원칙 5. 기술 부채 정리를 UI보다 먼저 일부 수행한다
앱이 흔들리면 아무리 예뻐도 싸 보인다.
먼저 구조를 정리해야 한다.

---

## 8. Replit용 상세 작업지시서 (실행 순서)

아래 순서는 **실제 구현 우선순위**다.
반드시 위에서 아래로 진행한다.

---

# TICKET 1. 앱 쉘 구조 통합

## 목표
홈 내부 탭과 독립 페이지 라우트가 뒤섞인 구조를 정리하여,
Tourgether를 하나의 통합 앱처럼 느끼게 만든다.

## 수정 대상 파일
- `client/src/App.tsx`
- `client/src/pages/home.tsx`
- `client/src/components/BottomNavigation.tsx`
- 신규: `client/src/components/AppShell.tsx`
- 신규: `client/src/constants/navigation.ts`

## 작업 내용
1. `AppShell.tsx`를 만든다.
2. `AppShell`이 아래 5개 탭을 책임지게 한다.
   - map
   - explore
   - meet
   - chat
   - profile
3. 기존 `timeline`은 탭에서 빼고,
   프로필 또는 map/explore 진입점에서 접근하는 2차 화면으로 내린다.
4. `BottomNavigation.tsx`를 roadmap 기준으로 바꾼다.
   - 지도
   - 탐색
   - 만나기 (중앙 강조)
   - 채팅
   - 나
5. `home.tsx`는 더 이상 feed/chat/profile/timeline을 라우팅 분기하는 페이지가 아니라,
   **map 탭 화면** 전용 컨테이너로 단순화한다.
6. `App.tsx`의 `/feed`, `/chat`, `/profile` 개별 진입은 유지하되,
   메인 사용 동선은 `/` -> `AppShell` 안에서 이동하도록 만든다.

## 완료 기준
- 메인 앱은 항상 하나의 쉘 안에서 이동한다.
- 하단 탭이 모든 핵심 화면에서 유지된다.
- 페이지가 툭툭 끊기는 느낌이 줄어든다.

## 주의
기존 deep link나 direct route는 깨지지 않게 한다.

---

# TICKET 2. 디자인 토큰 재정의 (다크 럭셔리)

## 목표
현재 light-friendly 스타일을,
지도 중심 프리미엄 다크 스타일로 교체한다.

## 수정 대상 파일
- `client/src/index.css`
- `tailwind.config.ts`
- 신규: `client/src/styles/tokens.css`
- 신규: `client/src/styles/components.css`

## 작업 내용
1. 현재 CSS variable을 아래 방향으로 재정의한다.
   - Primary: `#7B5EA7`
   - Accent: `#FF6B6B`
   - Surface: `#1A1A2E`
   - Background dark scale: gray 950 ~ 700 중심
2. 밝은 흰 바탕 중심 화면을 줄이고,
   앱 기본 톤을 다크 기반으로 바꾼다.
3. 컴포넌트 레벨 토큰 정의:
   - 탭바
   - 카드
   - 바텀시트
   - 채팅 버블
   - pill/chip
   - floating action button
4. 헤더, 카드, 모달 border radius를 통일한다.
5. 텍스트 hierarchy를 정리한다.
   - Hero / H1 / H2 / Body / Caption
6. 폰트 line-height와 letter spacing을 정리한다.

## 완료 기준
- 한 화면만 봐도 이전보다 훨씬 무게감 있어 보인다.
- 색이 튀지 않고, 다크맵과 잘 어울린다.
- 컴포넌트마다 스타일 편차가 줄어든다.

---

# TICKET 3. 하단 네비게이션 전면 개편

## 목표
현재 `map/feed/timeline/chat/profile` 구조를
로드맵 기준 구조로 변경한다.

## 수정 대상 파일
- `client/src/components/BottomNavigation.tsx`
- `client/src/constants/navigation.ts`
- `client/src/pages/home.tsx`
- `client/src/pages/chat.tsx`
- `client/src/pages/profile.tsx`

## 작업 내용
1. 탭 정의를 상수화한다.
2. 현재 `timeline` 탭 제거.
3. `feed` -> `explore`로 명칭/의미 변경.
4. 중앙 FAB는 `Create Post`가 아니라 `Meet` 진입용으로 전환 검토.
   - 단, 포스트 작성은 map 화면 내 secondary FAB 또는 bottom sheet CTA로 이동.
5. `profile` 탭은 “나” 톤으로 단순화.

## 완료 기준
- 탭 이름만 봐도 앱 의도가 보인다.
- 중앙 버튼이 Tourgether의 차별점을 말한다.

---

# TICKET 4. 홈 지도 화면을 “지도 + 바텀시트” 구조로 바꾸기

## 목표
현재 MapComponent 중심 화면을,
사람과 콘텐츠가 살아 움직이는 지도 홈으로 바꾼다.

## 수정 대상 파일
- `client/src/pages/home.tsx`
- `client/src/components/MapComponent.tsx`
- 신규: `client/src/components/map/MapBottomSheet.tsx`
- 신규: `client/src/components/map/NearbyPeopleSheet.tsx`
- 신규: `client/src/components/map/NearbyStoriesSheet.tsx`

## 작업 내용
1. 지도 위에 콘텐츠를 겹치는 현재 구조를,
   하단에서 끌어올리는 바텀시트 중심으로 재구성한다.
2. 바텀시트 상태 3단계:
   - collapsed
   - half
   - expanded
3. collapsed에서는 다음만 보이게 한다.
   - 주변 여행자 수
   - 주변 스토리 수
   - 오늘 추천 액션 1개
4. half/expanded에서 아래 섹션 노출:
   - nearby people
   - nearby stories
   - 추천 장소/플랜
5. 지도 마커 클릭 시 full-screen modal이 아니라 시트 내용이 바뀌게 한다.
6. 현재 SearchHeader는 바텀시트/맵 헤더 구조와 맞게 재배치한다.

## 완료 기준
- 첫 화면 인상이 ‘지도 툴’이 아니라 ‘살아있는 여행 공간’처럼 느껴진다.
- 지도와 콘텐츠가 경쟁하지 않고 공존한다.

---

# TICKET 5. 지도 마커를 사람/스토리 중심으로 재설계

## 목표
현재 SVG/이모지 중심 마커를,
프로필 버블 + 스토리 버블 중심으로 고급화한다.

## 수정 대상 파일
- `client/src/hooks/useMapMarkers.ts`
- `client/src/hooks/usePOIMarkers.ts`
- `client/src/components/CustomMapMarker.tsx`
- 신규: `client/src/components/map/ProfileBubbleMarker.tsx`
- 신규: `client/src/components/map/StoryClusterMarker.tsx`

## 작업 내용
1. 포스트 마커와 오픈 유저 마커를 분리된 디자인 시스템으로 재작성한다.
2. open user는 원형 프로필 + ring + subtle pulse로 표시한다.
3. 포스트/스토리는 썸네일형 원형/rounded bubble cluster로 만든다.
4. 현재 이모지 위주 POI는 보조 계층으로 내린다.
5. 사용자/스토리 마커가 POI보다 우선적으로 시각 강조되도록 z-index/렌더 우선순위를 조정한다.
6. marker clustering UI를 좀 더 세련되게 바꾼다.

## 완료 기준
- “지도는 사람 중심”이라는 로드맵 원칙이 시각적으로 보인다.

---

# TICKET 6. Google Maps 유지 + 다크맵 스타일링 1차 적용

## 목표
지금 당장 Mapbox 전면 교체까지 가지 않고,
현재 Google Maps 기반에서 다크 스타일과 정보 밀도 조절을 먼저 한다.

## 수정 대상 파일
- `client/src/components/MapComponent.tsx`
- 신규: `client/src/constants/mapStyles.ts`

## 작업 내용
1. Google Maps custom styles로 다크맵 1차 적용.
2. POI/도로/라벨 시각 강도를 줄인다.
3. 브랜드 색과 충돌하지 않는 지도 톤을 만든다.
4. 현재 위치 표시를 고급 pulse marker로 바꾼다.
5. 추후 Mapbox 전환을 염두에 두고 map style config를 상수 분리한다.

## 완료 기준
- 완전한 Mapbox가 아니어도,
  현재보다 훨씬 감성적인 지도 인상이 난다.

## 주의
로드맵은 Mapbox를 말하지만,
현재 코드기반 현실적으로는 Google Maps 스타일링 -> 이후 Mapbox 전환 2단계 접근이 안전하다.

---

# TICKET 7. Explore 탭 재구성 (피드 -> 탐색)

## 목표
현재 피드를 단순 리스트가 아니라,
Tourgether의 발견 경험으로 재브랜딩한다.

## 수정 대상 파일
- `client/src/pages/feed.tsx`
- `client/src/components/VirtualizedFeed.tsx`
- 신규: `client/src/components/explore/ExploreHeader.tsx`
- 신규: `client/src/components/explore/ExploreReels.tsx`
- 신규: `client/src/components/explore/ExploreCardFeed.tsx`

## 작업 내용
1. feed 화면명을 내부적으로 explore로 전환한다.
2. 상단에 mode toggle 추가:
   - stories
   - reels
   - nearby
3. 카드형 피드를 계속 살리되,
   full-screen vertical viewer 모드를 추가한다.
4. 장소 보기 CTA를 지도와 강하게 연결한다.
5. 경험(Experience) 카드와 일반 포스트 카드 UI를 공통 패턴으로 정리한다.
6. 해시태그/장소/사람 발견 중심의 탐색 진입점 강화.

## 완료 기준
- 사용자가 “게시판”이 아니라 “탐색 공간”에 들어왔다는 느낌을 받는다.

---

# TICKET 8. Meet 탭 신설 (Serendipity 중심)

## 목표
Open to Meet, 주변 사용자, 우연한 만남, 첫 인사, DM 연결을 하나의 전용 화면으로 만든다.

## 수정 대상 파일
- 신규: `client/src/pages/meet.tsx`
- 신규: `client/src/components/meet/MeetRadar.tsx`
- 신규: `client/src/components/meet/NearbyTravelerCard.tsx`
- 신규: `client/src/components/meet/FirstHelloSheet.tsx`
- `client/src/components/OpenToMeetToggle.tsx`
- `client/src/components/BottomNavigation.tsx`
- 필요 시 `server/routes/profile.ts`

## 작업 내용
1. 전용 Meet 화면을 만든다.
2. 화면 구성:
   - 상단: 내 상태(Open to Meet on/off)
   - 중단: 레이더/주변 여행자 시각화
   - 하단: nearby traveler cards
3. 각 카드에 다음 CTA 제공:
   - 인사 건네기
   - 프로필 보기
   - 공통 관심사 보기
4. 인사 건네기 -> conversation 생성 -> chat으로 자연 전환
5. open users API 응답을 화면 요구에 맞게 보강 필요 시 BFF shape 추가

## 완료 기준
- “만나기”가 메뉴 속 옵션이 아니라,
  Tourgether의 얼굴처럼 보인다.

---

# TICKET 9. Mini Concierge를 지도 홈/만나기와 연결

## 목표
Mini Concierge를 숨은 AI 기능이 아니라,
즉시 행동을 유도하는 메인 CTA로 격상한다.

## 수정 대상 파일
- `client/src/components/MiniConcierge/*`
- `client/src/components/MapComponent.tsx`
- `client/src/pages/meet.tsx`
- `server/routes/ai.ts`

## 작업 내용
1. “지금 1시간 뭐하지?” CTA를 지도 홈 collapsed sheet와 Meet 탭 양쪽에 노출.
2. 결과 카드를 지금보다 더 프리미엄하게 재구성.
   - option A/B/C
   - 소요 시간
   - 거리
   - 분위기 태그
   - 바로 이동 / 같이 갈 사람 찾기 CTA
3. plan 실행 후 check-in, share, invite 흐름 강화.
4. 추후 Serendipity와 연결 가능한 데이터 shape 확보.

## 완료 기준
- Mini Concierge가 부가 AI가 아니라 여행 행동 유도 엔진처럼 느껴진다.

---

# TICKET 10. Timeline / CineMap을 브랜드 영웅 화면으로 승격

## 목표
타임라인과 CineMap을 단순 기능이 아니라,
Tourgether의 상징 경험으로 만든다.

## 수정 대상 파일
- `client/src/pages/timeline.tsx`
- `client/src/components/VirtualizedTimeline.tsx`
- `client/src/components/TimelineCard.tsx`
- `server/ai/cinemap.ts`
- `server/routes/ai.ts`

## 작업 내용
1. timeline list를 더 cinematic하게 재설계한다.
2. 각 timeline card에 아래를 강조:
   - 여행 제목
   - 날짜
   - 이동 경로 요약
   - 대표 이미지
   - CineMap 상태
3. completed CineMap은 큰 썸네일+play CTA로 영웅 영역에 노출.
4. 타임라인 상세에서 route polyline 시각화 강화.
5. EXIF 기반 스토리 생성 흐름을 onboarding처럼 보이게 정리.

## 완료 기준
- 사용자가 “이 앱은 내 여행을 영화처럼 남겨준다”는 인상을 받는다.

---

# TICKET 11. DM 번역 UX 고도화

## 목표
기존 번역 버튼 수준의 채팅을,
실제 여행 상황에서 쓰고 싶은 번역 DM으로 끌어올린다.

## 수정 대상 파일
- `client/src/components/EnhancedChatWindow.tsx`
- `client/src/pages/chat.tsx`
- `server/routes/chat.ts`
- 필요 시 `shared/schema.ts`

## 작업 내용
1. 메시지 번역 버튼을 토글 UX로 정리.
2. 번역 상태 UI 추가:
   - translated badge
   - source language badge
   - 원문 보기 / 번역 보기
3. 자주 쓰는 여행 회화 quick reply chips 추가.
4. AI Concierge 채널과 일반 DM의 시각 계층 차이를 더 세련되게 만든다.
5. 메시지 bubble spacing, timestamp, CTA hover 상태 정리.

## 완료 기준
- 다국어 채팅이 기능적으로도, 시각적으로도 더 신뢰감 있어 보인다.

---

# TICKET 12. 프로필을 ‘나’ + 수익화 허브로 재정의

## 목표
현재 profile을 단순 계정 화면이 아니라,
여행 이력, open-to-meet, guide/service 판매, portfolio를 묶는 허브로 만든다.

## 수정 대상 파일
- `client/src/pages/profile.tsx`
- `client/src/components/ProfileEditModal.tsx`
- `client/src/pages/PublicPortfolio.tsx`

## 작업 내용
1. 프로필 헤더 재설계:
   - 대표 사진
   - 자기소개
   - 여행 레벨/배지
   - 언어
   - 관심사
2. 섹션 구분:
   - 내 타임라인
   - 판매 중 서비스
   - 포트폴리오
   - Open to Meet 상태
3. 공개 포트폴리오와 앱 내 프로필의 톤을 통일.

## 완료 기준
- “나” 탭이 단순 설정이 아니라,
  내 여행 정체성과 수익화 허브가 된다.

---

# TICKET 13. 기술부채 정리 (Replit AI 혼동 방지)

## 목표
실제 코드 작업 효율을 높이기 위해 리포지토리 노이즈를 줄인다.

## 수정 대상 대상
- 루트 구조 전반
- `legacy_src_bak/`
- 루트 png 캡처들
- `attached_assets/`
- docs 일부

## 작업 내용
1. 실제 런타임에 필요 없는 루트 PNG는 `docs/_screenshots_archive/`로 이동.
2. `legacy_src_bak`는 archive 폴더로 이동.
3. `attached_assets`는 런타임 불필요 시 archive 처리.
4. Replit AI에게 작업 시 제외할 폴더를 `GUARDRAILS.md`에 명시.
5. “수정 허용 파일 범위” 규칙 추가.

## 완료 기준
- Replit가 관련 없는 파일을 덜 건드린다.
- 작업 속도와 정확도가 올라간다.

---

# TICKET 14. routes 정리 2단계

## 목표
모듈화된 라우터와 legacy giant route의 충돌 위험을 줄인다.

## 수정 대상 파일
- `server/routes.ts`
- `server/routes/index.ts`
- legacy route 파일들

## 작업 내용
1. 현재 사용 중인 엔드포인트와 legacy 엔드포인트를 목록화한다.
2. 중복 endpoint를 제거하거나 주석 문서화한다.
3. 신규 기능은 반드시 `server/routes/*.ts` 하위 모듈에만 추가한다.
4. `server/routes.ts`는 점진적으로 thin entrypoint로 축소한다.

## 완료 기준
- API 구조가 더 예측 가능해진다.
- 기능 추가 시 혼선이 줄어든다.

---

# TICKET 15. 랜딩페이지와 앱 톤 통일

## 목표
앱과 웹 랜딩이 같은 브랜드처럼 느껴지게 만든다.

## 수정 대상 파일
- `client/src/pages/landing.tsx`
- `client/src/pages/seo/*`
- `client/public/seo-hero/*`
- `client/src/lib/seoConfig.ts`

## 작업 내용
1. 랜딩 hero를 앱 리뉴얼 톤에 맞춘다.
2. CineMap, Meet, Mini Concierge를 핵심 가치로 재배치.
3. 앱 캡처도 리뉴얼 UI 기준으로 교체.
4. 다운로드 CTA를 명확하게.

## 완료 기준
- 웹에서 본 기대감이 앱 첫 화면과 이어진다.

---

## 9. 구현 우선순위 (실전)

### 반드시 먼저 할 것
1. Ticket 1 앱 쉘 통합
2. Ticket 2 디자인 토큰 재정의
3. Ticket 3 하단 네비 개편
4. Ticket 4 지도 + 바텀시트
5. Ticket 5 사람 중심 마커

### 그다음 할 것
6. Ticket 8 Meet 탭 신설
7. Ticket 9 Mini Concierge 전면 배치
8. Ticket 7 Explore 재구성
9. Ticket 10 Timeline / CineMap 승격
10. Ticket 11 DM 번역 UX 고도화

### 병행/후행
11. Ticket 13 리포 노이즈 정리
12. Ticket 14 routes 정리
13. Ticket 15 랜딩 통일

---

## 10. 현실적인 강한 의견

### 의견 1. 지금 당장 Mapbox 전면교체부터 들어가면 위험하다
로드맵 문서상으론 맞지만,
현재 코드베이스는 이미 Google Maps 중심으로 훅/마커/POI/검색이 촘촘히 묶여 있다.

따라서 현실적으로는:
- 1차: Google Maps 다크 스타일 + UX 재구성
- 2차: Mapbox 전환 여부 판단
이 맞다.

### 의견 2. 타임라인 탭은 메인 탭에서 빼는 게 맞다
브랜드상 중요한 기능이지만,
일상 사용 흐름의 핵심 탭은 아니다.
메인 5탭은 아래가 더 강하다.
- 지도
- 탐색
- 만나기
- 채팅
- 나

### 의견 3. 포스트 작성 FAB보다 Meet FAB가 더 Tourgether답다
지금 Tourgether의 차별점은 콘텐츠 업로드 자체가 아니라,
**여행 현장의 연결**이다.
그래서 중심 CTA는 작성보다 만남/행동이 더 낫다.

### 의견 4. 현재 repo는 너무 많은 것을 한 폴더에 안고 있다
이건 예술이 아니라 전투다.
1인 개발 + Replit 환경에서는 깔끔함이 곧 생산성이다.
루트 정리는 미룰수록 손해다.

---

## 11. 최종 지시 문장 (Replit용 상위 프롬프트)

아래 문장을 Replit 상위 작업 지시의 출발점으로 사용해도 된다.

```md
We are refactoring Tourgether from a feature-heavy travel web app into a premium map-first travel social network focused on people, stories, serendipity, and local action.

Do NOT redesign blindly. First preserve all working business logic and existing API contracts unless explicitly changed.

Primary goals:
1. Unify app shell and bottom navigation into 5 tabs: Map / Explore / Meet / Chat / Me.
2. Convert the current home experience into a map + bottom-sheet architecture.
3. Make people and story markers visually dominant over generic POI markers.
4. Elevate Meet (Serendipity) and Mini Concierge to top-level product experiences.
5. Re-theme the app into a premium dark, cinematic, high-trust visual language.
6. Keep Timeline/CineMap as a premium hero feature, but not as a main tab.
7. Reduce repo noise and avoid touching archive/legacy files unless explicitly instructed.

Important constraints:
- Keep current React + Vite + Wouter + TanStack Query structure.
- Do not break current auth, feed, chat, timeline, profile, AI, or billing flows.
- Prefer incremental refactor over big-bang rewrite.
- Use file-by-file changes with clear acceptance criteria.
- If a route already exists, adapt it rather than duplicating it.
- Preserve direct routes, but make the main user flow happen inside a unified app shell.
```

---

## 12. 마지막 판단

이 프로젝트는 망가진 게 아니다.
오히려 위험한 지점까지는 잘 왔다.
문제는 부족함보다 **분산**이다.

지금 Tourgether는 보석이긴 한데,
원석이 여러 상자에 나뉘어 들어 있다.
이번 작업의 본질은 새 보석을 만드는 게 아니라,
그 조각들을 하나의 왕관으로 조립하는 일이다.

