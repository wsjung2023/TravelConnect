# 개발 기본 지침 (DEVELOPMENT GUIDELINES)

## 절대 금지 사항 (NEVER DO)

### 1. 하드코딩 금지 (절대 원칙)
- ❌ API 키, 비밀번호, 토큰을 코드에 직접 작성 금지
- ❌ 데이터베이스 연결 정보 하드코딩 금지
- ❌ 외부 서비스 URL 하드코딩 금지
- ❌ **어떤 값이든 하드코딩이 필요하다고 판단되면 작업 전 사용자에게 반드시 문의**
- ✅ 항상 환경변수 사용: `process.env.API_KEY`
- ✅ Replit Secrets 활용
- ✅ 사용자 승인 후에만 하드코딩 진행

### 2. 보안 규칙
- ❌ 민감한 정보를 Git에 커밋 금지
- ❌ 콘솔에 민감한 정보 출력 금지
- ✅ .gitignore에 민감한 파일 추가
- ✅ 에러 메시지에서 민감한 정보 제거

### 3. 코드 품질
- ❌ 중복 코드 작성 금지
- ❌ 매직 넘버 사용 금지
- ✅ 함수와 변수에 명확한 이름 사용
- ✅ 주석으로 복잡한 로직 설명

## 필수 준수 사항 (MUST DO)

### 1. 환경변수 사용
```javascript
// ❌ 잘못된 예
const API_KEY = "sk-1234567890abcdef";

// ✅ 올바른 예
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
```

### 2. 에러 처리
```javascript
// ✅ 항상 에러 처리 포함
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('API 호출 실패:', error.message); // 민감한 정보 제외
  throw new Error('외부 서비스 연결 실패');
}
```

### 3. 타입 안전성
```typescript
// ✅ 타입 정의 사용
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}
```

## 검사 항목 체크리스트

### 코드 검토 시 확인사항
- [ ] 하드코딩된 API 키 없음
- [ ] 하드코딩된 URL 없음
- [ ] 하드코딩된 비밀번호 없음
- [ ] 환경변수 검증 로직 있음
- [ ] 적절한 에러 처리 있음
- [ ] 민감한 정보 로깅 없음

### 배포 전 확인사항
- [ ] 모든 환경변수 설정됨
- [ ] .gitignore 업데이트됨
- [ ] 테스트 통과함
- [ ] 보안 스캔 통과함

## 시스템 설정값 관리 (DB 방식)

### 하드코딩 대신 DB 테이블 사용
```typescript
// ❌ 잘못된 예 - 하드코딩
const DEFAULT_TIMEOUT = 5000;
const API_BASE_URL = "https://api.example.com";

// ✅ 올바른 예 - DB에서 관리
const timeout = await getSystemSetting('api', 'default_timeout');
const baseUrl = await getSystemSetting('api', 'base_url');
```

### system_settings 테이블 구조
- **category**: 설정 분류 (oauth, api, ui, business 등)
- **key**: 설정 키 이름
- **value**: 설정값
- **description**: 설정 설명
- **isActive**: 활성화 여부

### 기본 시스템 설정 카테고리
- `oauth`: OAuth 관련 설정 (콜백 URL, 스코프 등)
- `api`: API 관련 설정 (타임아웃, 기본 URL 등)
- `ui`: UI 관련 설정 (기본 테마, 언어 등)
- `business`: 비즈니스 로직 설정 (기본값, 제한값 등)

## 자동 검사 규칙

### 금지된 패턴들
```regex
// 이런 패턴들을 찾으면 즉시 수정
- API_KEY\s*=\s*["'][^"']*["']
- PASSWORD\s*=\s*["'][^"']*["']
- SECRET\s*=\s*["'][^"']*["']
- TOKEN\s*=\s*["'][^"']*["']
- https?://[^"'\s]+\.com[^"'\s]*
```

## 위반 시 대응 방안
1. **즉시 수정**: 하드코딩 발견 시 환경변수로 변경
2. **Git 히스토리 정리**: 민감한 정보가 Git에 들어간 경우
3. **키 재발급**: 노출된 API 키는 즉시 무효화 후 재발급
4. **문서 업데이트**: 변경사항을 문서에 반영

## 이 지침의 관리
- 📍 파일 위치: `DEVELOPMENT_GUIDELINES.md`
- 🔄 업데이트: 새로운 보안 요구사항 발생 시
- 📋 검토: 모든 코드 변경 전 필수 확인
- ⚠️ 준수: 이 지침을 위반하는 코드 작성 절대 금지

## 연락처
문제 발생 시 즉시 보고하고 해결방안 협의