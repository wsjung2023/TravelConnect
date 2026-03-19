# Tourgether AI Local Concierge & Serendipity Protocol v0.1

## 0. 문서 정보
- 작성일: 2025-11-16
- 버전: v0.1 (MVP 설계 초안)
- 대상: Tourgether Flutter + Supabase + LLM 기반 앱
- 기능 범위: 
  - A. AI 현지 미니 컨시어지 (Local Mini Concierge)
  - B. 세렌디피티 프로토콜 (근거리 3분 미션) — A의 확장 모듈

---

## 1. 제품 개요

### 1.1 컨셉
> “지금 여기서 할 만한 최고의 한 시간 + 우연한 연결”

- **AI 미니 컨시어지**가 유저의 현재 위치/시간/날씨/예산/취향을 기반으로 **3개의 초단기 플랜(카페+포토스팟+간식)**을 생성.
- 이 플랜을 실행하는 과정에서, 근처에 비슷한 관심사를 가진 유저가 있으면 **세렌디피티 미니 퀘스트(3~5분짜리 가벼운 공동 미션)**를 푸시로 제안.
- 두 기능은 동일한 **지도·POI·타임라인·LLM 인프라**를 공유하고, 세렌디피티는 미니 컨시어지 위에 얹히는 “소셜 확장”으로 설계.

### 1.2 목표
- 유저가 “뭘 할지 고민하는 시간”을 줄이고, **1시간 단위의 실행 가능한 경험**을 제공.
- 여행지에서 **가벼운 관계 맺기(3분 미션)**를 가능하게 해, Tourgether만의 차별화된 소셜 경험 제공.
- 장기적으로 **스폰서 POI / 미션 / 예약 연동**을 통해 수익화.

### 1.3 핵심 KPI (MVP 기준)
- 미니 컨시어지 버튼 클릭 대비
  - 플랜 생성 성공률 ≥ 90%
  - 생성된 플랜 중 1개 이상 실제 실행(체크/사진 업로드) 비율 ≥ 30%
- 세렌디피티 미션
  - 푸시 발송 대비 수락률 ≥ 10%
  - 수락된 미션 중 공동 하이라이트 생성률 ≥ 50%

---

## 2. 주요 기능 정의

### 2.1 공통

1. **사용자 컨텍스트 수집**
   - 실시간 위치 (lat, lng)
   - 시간대 (local time)
   - 날씨 정보 (간단 요약: 맑음/비/눈/흐림/폭염 등)
   - 예산 (간단 구간: 0, 1만, 3만, 5만+)
   - 동행 유형 (혼자 / 친구 / 연인 / 가족)
   - 취향 태그 (예: 카페, 힙한, 조용한, 사진, 야경, 로컬푸드 등)

2. **POI 데이터**
   - 내부 DB + 외부 API(구글 플레이스/카카오맵 등)에서 가져온 장소 정보
   - 기본 필드: id, name, type, lat, lng, 영업시간, 가격대, 평점, 썸네일

3. **LLM 연동**
   - Function Calling 기반으로 **구조화된 Mini Plan / Quest JSON** 생성
   - LLM은 “플랜 설계 + 설명 문장 + UX용 텍스트” 생성 담당

---

### 2.2 A. AI 현지 미니 컨시어지 (Local Mini Concierge)

#### 2.2.1 트리거
- 메인 지도 화면 하단/플로팅 버튼: **「지금 1시간 뭐하지?」**
- 선택 옵션 (모달)
  - 지금 기분/스타일: 힙함 / 조용함 / 로컬맛집 / 사진위주 / 아무거나
  - 시간: 1시간 / 2시간
  - 예산: 0 / 1만 / 3만 / 5만+

#### 2.2.2 동작 흐름 (하이레벨)
1. 유저가 버튼 클릭 → 컨텍스트 수집 (위치, 시간, 날씨, 옵션)
2. 서버 API `/ai/mini-plan` 호출
3. 서버에서
   - 근처 POI 후보 리스트 추출 (반경 1~2km)
   - LLM Function Call에 컨텍스트 + POI 후보 전달
4. LLM이 **3개의 Mini Plan** 생성
5. 결과를 클라이언트에 반환 → 카드 형태로 UI 표시 + 지도 핀 자동 배치
6. 유저는 **플랜 1개 선택 → “시작하기”** 누르면
   - 타임라인에 “Mini Plan #ID 시작” 이벤트 기록
   - 각 스팟 방문 시 체크/사진 업로드로 진행률 표시

#### 2.2.3 Mini Plan JSON 스키마 (LLM 출력)


```json
{
  "plans": [
    {
      "id": "string (서버에서 재생성)",
      "title": "경복궁 감성 산책 + 카페 + 어묵꼬치",
      "summary": "야경이 예쁜 돌담길 산책 후 따뜻한 라떼와 어묵꼬치로 마무리하는 1시간 코스",
      "estimated_duration_min": 60,
      "estimated_distance_m": 850,
      "tags": ["야경", "사진", "카페", "로컬간식"],
      "spots": [
        {
          "poi_id": "external_or_internal_id",
          "name": "카페 어딘가",
          "lat": 37.123,
          "lng": 126.123,
          "stay_min": 25,
          "reason": "창가석에서 고궁 야경이 잘 보이는 카페",
          "recommended_menu": "라떼, 치즈케이크",
          "price_range": "7000~12000"
        },
        {
          "poi_id": null,
          "name": "돌담길 포토스팟",
          "lat": 37.124,
          "lng": 126.121,
          "stay_min": 15,
          "reason": "사람이 적고 조용한 인생샷 포인트",
          "photo_pose_hint": "걷는 샷 + 로우 앵글"
        },
        {
          "poi_id": "market_123",
          "name": "통인시장 어묵꼬치",
          "lat": 37.125,
          "lng": 126.120,
          "stay_min": 20,
          "reason": "현지인에게 인기 있는 간식 스팟",
          "expected_price": 2000
        }
      ]
    }
  ]
}
```

#### 2.2.4 화면 설계(요약)

1. **트리거 버튼**
   - 지도 메인 화면 오른쪽 하단 Floating Action Button (FAB)
   - 텍스트: `지금 1시간 뭐하지?` / 아이콘: 번개 or 전구

2. **옵션 모달**
   - 라디오/Chip: 시간, 예산, 분위기
   - CTA: `플랜 만들기`

3. **플랜 후보 리스트 화면**
   - 카드 3개 가로 슬라이드 or 세로 리스트
   - 각 카드: 제목 / 요약 / 예상시간 / 예상거리 / 3개 스팟 썸네일
   - 카드 클릭 → 상세 보기 (지도 + 스텝별 설명)

4. **플랜 실행 화면**
   - 상단: 타이틀, 진행률(스텝 1/3)
   - 중단: 현재 스팟 상세 (사진+설명)
   - 하단: 
     - `체크인` 버튼
     - `사진 찍고 기록 남기기` (타임라인 업로드)
   - 스텝 완료 시 자동으로 다음 스팟으로 이동

---

### 2.3 B. 세렌디피티 프로토콜 — 미니 컨시어지 확장

#### 2.3.1 개념
- 미니 컨시어지를 사용 중이거나, 특정 지역에서 **유사한 태그/타임라인을 가진 유저들끼리** 근접(50~150m)할 경우
- “3분짜리 가벼운 미션”을 제안
- 예: 
  - “같은 플랜을 고른 사람과 함께 3컷 사진 찍기”
  - “서로 추천 메뉴 하나씩 고르기”

#### 2.3.2 트리거 시나리오

1. **시나리오 A: 같은 Mini Plan을 선택한 유저끼리**
   - 같은 플랜 ID를 선택한 유저가 반경 100m 이내에 있을 때
   - 조건:
     - 두 유저 모두 세렌디피티 ON
     - 최근 10분 이내에 앱 활성화 (백그라운드 허용 시 추가옵션)

2. **시나리오 B: 관심사/태그 기반**
   - 같은 카페/시장 근처, 태그가 비슷(사진+카페+로컬푸드 등)
   - 반경 50~150m 내에 2명 이상

#### 2.3.3 퀘스트 JSON 스키마

```json
{
  "quest_id": "qst_20251116_001",
  "title": "야경 인생샷 3컷 미션",
  "description": "근처 여행자와 함께 경복궁 돌담길에서 서로 한 장씩 사진을 찍어주세요.",
  "duration_min": 5,
  "reward_type": "highlight",
  "reward_detail": "공동 하이라이트 클립 자동 생성",
  "required_actions": [
    {
      "type": "photo_upload",
      "count": 2,
      "note": "각자 1장 이상 업로드"
    }
  ],
  "location": {
    "lat": 37.123,
    "lng": 126.123,
    "radius_m": 80
  }
}
```

#### 2.3.4 UX 흐름

1. 근접/매칭 조건 만족 → 서버에서 퀘스트 생성
2. 두 유저에게 푸시/인앱 알림

   - 상단 Banner / 모달:
     - `🍀 근처에 비슷한 여행자 발견!`
     - `3분 미션: 야경 인생샷 3컷 찍기`
     - 버튼: `[참여] [다음에]`

3. 둘 다 [참여]를 누르면
   - 간단한 Matching 화면:
     - “OO님도 참여 중”
     - 익명 아바타 + 국기/언어 정도만 노출

4. 퀘스트 실행 화면
   - 미션 설명 + 남은 시간 타이머
   - 서로 사진 업로드 → 완료 시 체크 표시

5. 완료 후
   - 두 사람의 사진들을 합쳐 **공동 하이라이트 카드/릴** 자동 생성
   - 각자의 타임라인과 미니 플랜 기록에 연결

#### 2.3.5 세렌디피티 ON/OFF 설정
- 프로필 or 설정 화면에서 토글
  - `세렌디피티 알림 받기 (ON/OFF)`
- 미니 플랜 실행 화면에서도 Quicky 토글 가능

---

## 3. 데이터 모델 설계 (초안)

### 3.1 주요 테이블

1. `users`
   - id
   - nickname
   - language
   - home_country
   - created_at

2. `user_profile`
   - user_id (FK)
   - age_group
   - travel_style_tags (array)
   - serenity_on (bool)
   - last_active_at
   - last_location (point)

3. `mini_plans`
   - id
   - user_id
   - title
   - summary
   - estimated_duration_min
   - estimated_distance_m
   - tags (array)
   - status (generated / started / completed / cancelled)
   - created_at

4. `mini_plan_spots`
   - id
   - mini_plan_id (FK)
   - order_index
   - poi_id (nullable)
   - name
   - lat
   - lng
   - stay_min
   - meta_json (메뉴, 포즈 힌트 등)

5. `quests`
   - id
   - type (serendipity / sponsor)
   - title
   - description
   - duration_min
   - reward_type
   - reward_detail
   - location_point
   - radius_m
   - status (active / expired)
   - created_at

6. `quest_participants`
   - id
   - quest_id (FK)
   - user_id
   - joined_at
   - completed_at (nullable)
   - result_json (업로드한 사진 아이디, 체크인 정보 등)

7. `quest_highlights`
   - id
   - quest_id
   - highlight_media_url
   - meta_json
   - created_at

8. `pois`
   - id
   - external_source (google / kakao / internal)
   - external_id
   - name
   - type
   - lat
   - lng
   - rating
   - price_level
   - opening_hours_json

---

## 4. API 설계 (초안)

### 4.1 미니 플랜 생성

**POST** `/api/ai/mini-plan`

- Request

```json
{
  "user_id": "uuid",
  "location": { "lat": 37.123, "lng": 126.123 },
  "time_minutes": 60,
  "budget_level": "low | mid | high",
  "mood": "chill | hip | local_food | photo | anything",
  "companions": "solo | couple | friends | family"
}
```

- Response

```json
{
  "plans": [
    {
      "plan_id": "uuid",
      "title": "...",
      "summary": "...",
      "estimated_duration_min": 60,
      "estimated_distance_m": 800,
      "spots": [ ... ]
    }
  ]
}
```

### 4.2 미니 플랜 시작/체크인

- **POST** `/api/mini-plan/{plan_id}/start`
- **POST** `/api/mini-plan/{plan_id}/spot/{spot_id}/checkin`

### 4.3 세렌디피티 퀘스트 매칭

- **POST** `/api/serendipity/check`
  - 서버 사이드에서 주기적으로(or 위치 업데이트 시) 호출
  - 거리 + 태그 기반 매칭

- **POST** `/api/serendipity/quest/{quest_id}/accept`
- **POST** `/api/serendipity/quest/{quest_id}/complete`

---

## 5. LLM 프롬프트 설계 (요약)

### 5.1 미니 플랜 생성용 System Prompt (개략)

> 너는 여행 전문가이자 로컬 가이드다. 사용자의 현재 위치, 시간, 날씨, 예산, 선호 스타일, 그리고 주변 장소(POI) 목록을 보고, 사용자가 1시간 안에 실행할 수 있는 3개의 미니 플랜을 설계하라. 각 플랜은 카페/사진 스팟/간단한 간식 또는 산책 등의 조합으로 구성한다. 반드시 JSON 스키마에 맞춰서 답변하고, 설명은 한국어로, 장소명은 원문 그대로 유지하라.

### 5.2 세렌디피티 퀘스트 템플릿
- 내부 템플릿 기반 (LLM 생성을 최소화)
- 타입별로 3~5개 프리셋 정의
  - `photo_3shots`, `cafe_menu_swap`, `hidden_spot_finder` 등

---

## 6. 단계별 롤아웃

### 6.1 Phase 1 (2~3주) — 미니 컨시어지 단독

- 위치 + 날씨 + 시간대 기반 미니 플랜 3개 생성
- POI는 초기에는 수동/간단 API 연동
- 세렌디피티 기능은 OFF (설정 UI에 “준비 중” 표시)

### 6.2 Phase 2 — 세렌디피티 알파

- 동일 플랜 선택자 간 근접 퀘스트 1종
- 사진 업로드 기반 공동 하이라이트 카드 생성

### 6.3 Phase 3 — 스폰서/상업 연동

- 스폰서 POI/퀘스트 테이블 추가
- 특정 카페/뮤지엄이 미니 플랜/퀘스트 우선 노출되도록 Boost
