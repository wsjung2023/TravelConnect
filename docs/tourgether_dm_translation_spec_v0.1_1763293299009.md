# Tourgether DM 번역 & 요약 기능 설계 v0.1

## 0. 문서 정보
- 작성일: 2025-11-16
- 버전: v0.1
- 대상: Tourgether DM(채팅) 기능 확장
- 단계:
  - 1단계: 무료 / Google 번역 API 또는 유사 무료 리소스 활용
  - 2단계: 유료 / 고급 AI 번역 + 대화 요약 & 할 일 생성

---

## 1. 제품 개요

### 1.1 문제 정의
- 외국인 ↔ 현지인, 서로 언어가 달라 DM으로 소통하는 데 장벽이 큼.
- 인스타/기존 메신저도 번역 기능은 있지만
  - 문장 단위 직역, 뉘앙스 부족
  - 대화가 길어지면 **정리/요약이 없음**

### 1.2 목표
1. **1단계(무료)**: 비용 거의 없이, “대화 가능한 수준의 번역” 제공
2. **2단계(유료)**: 여행/만남 상황에 특화된
   - 자연스러운 번역
   - 대화 요약
   - 할 일(To-do) / 일정 생성
   - 언어 학습에 도움이 되는 표현 정리까지 제공

### 1.3 공통 UX 원칙
- DM 상단에 단일 토글: `번역 ON/OFF`
- 번역된 문장은 **원문 아래에 작은 글씨**로 표시
- 요약/할일 생성은 **대화 종료 시점** 또는 사용자가 버튼을 눌렀을 때 실행

---

## 2. 공통 기능 요구사항

1. **언어 감지**
   - 각 메시지의 언어 자동 감지 (ko, en, ja, th, etc.)
   - 대화방 기준 “내 언어 / 상대 언어”를 추론

2. **번역 방향**
   - 기본: 
     - 상대가 보낸 메시지 → 내 언어로 자동 번역
   - 옵션:
     - 내가 쓴 메시지도 미리보기로 상대 언어로 번역해서 보여주기 (2단계에서 UX 강화)

3. **토글 동작**
   - `번역 ON`일 때만 번역 API 호출
   - OFF 시에는 기존 메시지만 표시

4. **캐싱**
   - 한번 번역한 메시지는 DB에 저장하여 재호출 시 API 비용 0원

5. **에러 처리**
   - 번역 실패 시: “번역에 실패했어요. 다시 시도해주세요.” 메시지
   - API 요청 제한/쿼터 초과 시: “오늘 번역 무료 사용량을 모두 사용했어요.”

---

## 3. 1단계 (무료) — Google 관련 리소스 기반 번역

> 목표: *실제 비용은 거의 0원에 가깝게 유지하되*, 사용자에게 “번역 메신저 같다”는 느낌을 주는 것.

### 3.1 아키텍처 개요

- 후보 전략
  1. Google 번역 공식 Cloud Translation API
     - 단, Free Tier 내에서만 사용 → 쿼터 엄격 관리
  2. 또는 사용자의 브라우저/디바이스에 의존한 클라이언트 사이드 번역(초기 단계에 실험 가능)
     - 예: WebView + Google Translate UI 또는 브라우저 확장 사용 유도 (정식 서비스 전에는 피쳐 플래그로만 테스트)

> 이 문서는 메인 플랜으로 **Cloud Translation API Free Tier + 강력 캐싱 전략**을 가정.

### 3.2 동작 흐름

1. 유저가 DM방에서 `번역 ON` 토글
2. 새 메시지 수신 시
   - 번역 캐시 테이블 조회
   - 존재하면 즉시 번역 결과 표시
   - 없으면:
     - 메시지 텍스트를 Google Translation API에 요청
     - 결과를 DB에 저장 후, 화면에 표시

### 3.3 데이터 모델

1. `dm_threads`
   - id
   - user1_id
   - user2_id
   - user1_default_lang
   - user2_default_lang
   - user1_translate_on (bool)
   - user2_translate_on (bool)

2. `dm_messages`
   - id
   - thread_id (FK)
   - sender_id
   - text_original
   - language_detected
   - created_at

3. `dm_translations`
   - id
   - message_id (FK)
   - target_lang
   - translated_text
   - provider ("google")
   - created_at

### 3.4 API 설계 (1단계)

#### 3.4.1 번역 토글 변경

**PATCH** `/api/dm/thread/{thread_id}/translate`

- Request
```json
{
  "user_id": "uuid",
  "translate_on": true
}
```

#### 3.4.2 메시지 전송

**POST** `/api/dm/thread/{thread_id}/message`

- Request
```json
{
  "sender_id": "uuid",
  "text": "원문 텍스트"
}
```

- 서버 처리
  - 언어 감지 → `language_detected` 저장
  - 해당 스레드의 상대방이 `translate_on = true`일 경우
    - 비동기로 번역 작업 큐에 등록

#### 3.4.3 번역 결과 조회

**GET** `/api/dm/thread/{thread_id}/messages?since=timestamp`

- Response 예시
```json
[
  {
    "message_id": "123",
    "sender_id": "user_a",
    "text_original": "こんにちは",
    "language_detected": "ja",
    "translations": [
      {
        "target_lang": "ko",
        "translated_text": "안녕하세요"
      }
    ]
  }
]
```

### 3.5 비용 제어 전략

1. **Free Tier 한도 내 일일 제한**
   - 일일 문자열/문자 수 기준으로 제한
   - 초과 시: “오늘의 무료 번역 한도를 초과했어요.” 표시

2. **캐시 100% 활용**
   - 같은 메시지를 여러 기기에서 볼 때도 추가 요청 없음
   - 동일 텍스트 + 동일 언어쌍에 대해 재사용 가능 (간단한 hashing으로 구현 가능)

3. **길이 제한**
   - 1단계에서는 한 메시지 최대 XXX자 (예: 500자) 이상은 잘라서 번역

---

## 4. 2단계 (유료) — AI 기반 번역 + 요약 & 할 일 생성

> 이 단계에서 Tourgether DM은 “단순 번역기”를 넘어서 **여행/만남용 AI 비서**가 됨.

### 4.1 기능 개요

1. **고급 번역**
   - LLM or 상위급 번역 API 사용
   - 뉘앙스, 존댓말, 반말 조절 등 옵션 제공

2. **대화 요약**
   - 하루/세션 단위로 “오늘 대화 요약” 생성
   - 꼭 기억해야 할 정보만 추려서 보여줌

3. **할 일(To-do) 추출**
   - “내일 7시에 만나자”, “티켓 예매하기” 같은 문장에서 액션 아이템 자동 추출

4. **일정 연동(선택)**
   - To-do 중 시간/날짜가 명시된 것은 “일정으로 추가” 제안

5. **유료 모델**
   - 예시:
     - 월 구독 (번역+요약 무제한, 혹은 상한 큰 플랜)
     - 혹은 코인/토큰 충전제 (요약/고급 번역 호출 시 차감)

### 4.2 UX 흐름

#### 4.2.1 번역 부분
- 1단계와 거의 동일하나:
  - 번역 아래 “자연스러운 표현로 바꾸기” 버튼 또는
  - “친근하게 말하기 / 정중하게 말하기” 선택 옵션 제공

#### 4.2.2 대화 요약 생성

1. 유저가 DM 상단 버튼 클릭
   - `오늘 대화 요약` / `Summary`

2. 서버에서 해당 기간(예: 오늘 00시~지금) 메시지를 수집

3. LLM에 아래와 같은 프롬프트 전달

```json
{
  "messages": [
    { "from": "me", "lang": "ko", "text": "내일 7시에 신주쿠역에서 만날래요?" },
    { "from": "them", "lang": "ja", "text": "いいですね！7時に新宿駅東口で会いましょう。" }
  ],
  "my_language": "ko"
}
```

- LLM 출력 포맷 예시:

```json
{
  "summary": "내일 저녁 7시에 신주쿠역 동쪽 출구에서 만나기로 함. 돈카츠를 먹을 가능성이 있음.",
  "todos": [
    {
      "title": "신주쿠역 동쪽 출구로 7시까지 가기",
      "due_datetime": "2025-11-17T19:00:00+09:00",
      "meta": { "place": "신주쿠역 동쪽 출구" }
    },
    {
      "title": "돈카츠 맛집 1곳 정도 미리 찾아보기",
      "due_datetime": null
    }
  ]
}
```

#### 4.2.3 결과 UI
- 요약: 상단 카드 형태로 표시
- 할 일: 체크박스 리스트 + “일정에 추가” 버튼
- 일정 추가 시: 내부 캘린더 or 외부(구글 캘린더 등) 연동 고려

### 4.3 데이터 모델 추가 항목

1. `dm_summaries`
   - id
   - thread_id
   - user_id (누가 요청했는지)
   - period_start
   - period_end
   - summary_text
   - todos_json
   - created_at

2. `user_subscriptions`
   - id
   - user_id
   - plan_type (free / pro / plus 등)
   - status
   - started_at
   - expires_at

### 4.4 API 설계 (2단계)

#### 4.4.1 요약 생성

**POST** `/api/dm/thread/{thread_id}/summary`

- Request
```json
{
  "user_id": "uuid",
  "period": "today"  // or custom
}
```

- Response
```json
{
  "summary_text": "요약 내용...",
  "todos": [
    {
      "title": "티켓 예매하기",
      "due_datetime": null
    }
  ]
}
```

#### 4.4.2 할 일 저장/일정 연동
- **POST** `/api/user/{user_id}/todos`
- (확장) **POST** `/api/user/{user_id}/calendar-events`

---

## 5. 요금/제한 정책 제안 (초안)

### 5.1 1단계(무료)
- Google 번역 Free Tier 내에서 동작
- 1일 메시지 번역 문자 수 제한 (예: 10,000~20,000자 수준)
- 초과 시 번역 기능 일시 제한 (다음 날 리셋)

### 5.2 2단계(유료)
- 월 구독 플랜 예시
  - Free: 일일 번역 한도 + 요약 기능 0회
  - Lite: 번역 넉넉 + 하루 요약 3회
  - Pro: 번역 무제한에 가까운 수준 + 요약 무제한 + 고급 톤 조절 번역

- 구체 금액은 인프라 비용 + 사용자 반응에 따라 추후 결정.

---

## 6. 단계적 롤아웃 제안

1. **Step 1 — 번역 ON/OFF UX + 캐시 구조만 먼저 구현**
   - 실제 번역은 Mock 데이터로 시작해도 됨 (개발 속도 우선)

2. **Step 2 — Google 번역 연동 (1단계 완성)**
   - 실제 API 연동 + 쿼터/에러 로깅

3. **Step 3 — LLM 기반 요약 기능 베타 (내부 테스트)**
   - 비용 모니터링 + UX 튜닝

4. **Step 4 — 유료 플랜 연결**
   - 번역/요약 사용량을 기준으로 유료 플랜 기획
