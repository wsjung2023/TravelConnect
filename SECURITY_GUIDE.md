# 🔒 보안 가이드

## API 키 관리 원칙

### ❌ 절대 하지 말아야 할 것
- API 키를 소스코드에 하드코딩
- .env 파일을 Git에 커밋
- API 키를 GitHub, Discord, 채팅 등에 공유

### ✅ 올바른 방법

#### 1. 환경변수 사용
```javascript
// ❌ 잘못된 방법
const API_KEY = "AIzaSyBxxxxxxxxxxxxxxxxxxxxxx";

// ✅ 올바른 방법  
const API_KEY = process.env.GOOGLE_API_KEY;
```

#### 2. .env 파일 관리
```bash
# .env 파일 생성 (Git에 올리지 말 것!)
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
```

#### 3. .gitignore 설정
```
.env
.env.*
**/googleAuth.ts
```

## API 키 노출 시 대응

### 1. 즉시 조치
1. 노출된 키를 즉시 무효화/재생성
2. Git 히스토리에서 완전 제거
3. 새로운 키로 교체

### 2. Google Cloud Console에서 키 교체
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. API 및 서비스 > 사용자 인증 정보
3. 기존 OAuth 2.0 클라이언트 ID 삭제
4. 새로운 OAuth 2.0 클라이언트 ID 생성
5. 새 키를 환경변수에만 저장

### 3. 재배포
- 소스코드 변경 없이 환경변수만 업데이트
- Replit Secrets에 새 키 저장
- 애플리케이션 재시작

## Replit에서 보안 설정

### Secrets 사용
1. Replit 프로젝트에서 "Secrets" 탭 클릭
2. 새 Secret 추가:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `VITE_GOOGLE_MAPS_API_KEY`

### 코드에서 사용
```javascript
// 자동으로 process.env에서 읽어옴
const clientId = process.env.GOOGLE_CLIENT_ID;
```

## 체크리스트

- [ ] .env 파일이 .gitignore에 포함되어 있는가?
- [ ] 소스코드에 하드코딩된 키가 없는가?
- [ ] Replit Secrets에 모든 키가 설정되어 있는가?
- [ ] 이전에 노출된 키들이 모두 무효화되었는가?

**기억하세요: 한번 노출된 API 키는 영원히 위험합니다!**