# AI 모델 설정 가이드

## 개요
Tourgether의 AI 기능(CineMap, Mini Concierge, AI Concierge)에서 사용하는 OpenAI 모델을 환경 변수로 동적으로 변경할 수 있습니다.

## 비용 최적화 전략

### 모델별 비용 비교 (2025년 11월 기준)
- **GPT-5.1** (`gpt-5.1-chat-latest`) - 최고 품질, 최고 비용
- **GPT-5 mini** (`gpt-5-mini`) - 균형잡힌 성능, 중간 비용 (추천)
- **GPT-4.1** (`gpt-4.1`) - 범용 모델, 낮은 비용
- **GPT-4o mini** (`gpt-4o-mini`) - 가장 저렴, 기본 성능

## 설정 방법

### 1. 모든 AI 서비스에 동일 모델 적용
Replit Secrets에서 `AI_MODEL` 환경 변수를 설정:

```bash
AI_MODEL=gpt-5-mini
```

이렇게 하면 CineMap, Mini Concierge, AI Concierge 모두 `gpt-5-mini` 모델을 사용합니다.

### 2. 서비스별 개별 모델 적용 (권장)
각 서비스의 특성에 맞춰 다른 모델을 사용할 수 있습니다:

```bash
# CineMap은 고품질 스토리텔링이 중요 → 프리미엄 모델
CINEMAP_AI_MODEL=gpt-5.1-chat-latest

# Mini Concierge는 빠른 응답 필요 → 저렴한 모델
MINI_CONCIERGE_AI_MODEL=gpt-5-mini

# AI Concierge는 대화형 → 중간 모델
CONCIERGE_AI_MODEL=gpt-5-mini
```

### 3. 우선순위
환경 변수는 다음 우선순위로 적용됩니다:
1. **서비스별 변수** (예: `CINEMAP_AI_MODEL`)
2. **공통 변수** (`AI_MODEL`)
3. **기본값** (`gpt-5.1-chat-latest`)

## 추천 설정

### 최대 비용 절감 (품질 다소 저하)
```bash
AI_MODEL=gpt-5-mini
```

### 균형잡힌 설정 (추천)
```bash
CINEMAP_AI_MODEL=gpt-5.1-chat-latest  # 스토리텔링은 고품질 유지
MINI_CONCIERGE_AI_MODEL=gpt-5-mini    # 플랜 생성은 저렴한 모델
CONCIERGE_AI_MODEL=gpt-5-mini          # 대화는 저렴한 모델
```

### 최고 품질 (기본 설정)
```bash
# 환경 변수 미설정 시 기본값 사용
# 모든 서비스가 gpt-5.1-chat-latest 사용
```

## 적용 방법

### Replit에서 설정
1. Replit 프로젝트 열기
2. 좌측 메뉴에서 "Secrets" (🔒) 클릭
3. 원하는 환경 변수 추가 (예: `AI_MODEL`, `CINEMAP_AI_MODEL` 등)
4. 워크플로우 재시작 (자동 재시작됨)

### 로컬 개발 시
`.env` 파일에 환경 변수 추가:
```bash
cp .env.example .env
# .env 파일 편집
AI_MODEL=gpt-5-mini
```

## 모델 선택 가이드

### CineMap (영상 스토리보드)
- **추천**: `gpt-5.1-chat-latest` (고품질 스토리텔링)
- **절약**: `gpt-5-mini` (기본 스토리텔링)

### Mini Concierge (1시간 플랜)
- **추천**: `gpt-5-mini` (빠르고 효율적)
- **고급**: `gpt-5.1-chat-latest` (더 창의적인 추천)

### AI Concierge (대화형 어시스턴트)
- **추천**: `gpt-5-mini` (빠른 응답)
- **고급**: `gpt-5.1-chat-latest` (자연스러운 대화)

## 참고사항
- 환경 변수 변경 후 워크플로우가 자동으로 재시작됩니다
- 잘못된 모델명을 입력하면 OpenAI API 에러가 발생합니다
- 모델별 토큰 제한 및 요금은 [OpenAI 공식 문서](https://platform.openai.com/docs/models) 참고
