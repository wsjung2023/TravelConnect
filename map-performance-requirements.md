# Map Performance Optimization Requirements

## 목표: 1,000핀에서도 스무스

## 수용 기준
- 도심에서 1,000핀 렌더 시 FPS 45+
- 초기 진입/스크롤 지연 없음

## 구현 사항

### 1. MapComponent.tsx 최적화
- **pan/zoom 150ms debounce**: 맵 이동/줌 변경 시 150ms 디바운스 적용
- **현재 뷰포트 내 핀만 렌더링**: 간단한 bbox 필터로 가시 영역 핀만 처리

### 2. 마커 클러스터링  
- **200개↑ 마커**: 자동 클러스터링 활성화
- **간단 집계 또는 라이브러리 사용**: 성능 우선

## 현재 상태
- 기본 debouncing 구현됨 (useDebounce hook 추가)
- viewport bounds 인터페이스 정의됨
- visiblePosts 필터링 기본 구조 추가됨
- shouldShowClusters 로직 기본 틀 마련

## 추가 구현 필요
1. Map event listeners에 bounds_changed 추가
2. 150ms 디바운스 정확한 적용
3. 마커 렌더링 로직에 성능 최적화 적용
4. 클러스터링 알고리즘 개선
5. 1000+ 마커 시나리오 테스트 및 검증

## 파일 위치
- `client/src/components/MapComponent.tsx`: 메인 최적화 타겟