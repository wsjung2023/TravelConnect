#!/bin/bash

# 고급 하드코딩 검사 스크립트
echo "🔍 고급 하드코딩 검사 시작..."
echo "==============================="

found_issues=0

# 실제 하드코딩된 키 패턴 (환경변수 사용 제외)
echo "📍 실제 하드코딩된 API 키 검사..."
hardcoded_keys=$(find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | \
    grep -v node_modules | grep -v .git | grep -v dist | \
    xargs grep -n -E "(API_KEY|CLIENT_ID|CLIENT_SECRET|PASSWORD|SECRET|TOKEN)\s*=\s*['\"][^'\"]+['\"]" | \
    grep -v "process.env" | grep -v "import.meta.env")

if [ ! -z "$hardcoded_keys" ]; then
    echo "🚨 하드코딩된 키 발견:"
    echo "$hardcoded_keys"
    found_issues=1
fi

# 구글 OAuth 클라이언트 ID/Secret 패턴
echo "📍 구글 OAuth 키 하드코딩 검사..."
google_hardcoded=$(find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | \
    grep -v node_modules | grep -v .git | grep -v dist | \
    xargs grep -n -E "['\"][0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com['\"]|['\"]GOCSPX-[a-zA-Z0-9_-]+['\"]")

if [ ! -z "$google_hardcoded" ]; then
    echo "🚨 하드코딩된 구글 OAuth 키 발견:"
    echo "$google_hardcoded"
    found_issues=1
fi

# JWT Secret 하드코딩 검사
echo "📍 JWT Secret 하드코딩 검사..."
jwt_hardcoded=$(find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | \
    grep -v node_modules | grep -v .git | grep -v dist | \
    xargs grep -n -E "JWT_SECRET.*=.*['\"][^'\"]+['\"]" | \
    grep -v "process.env")

if [ ! -z "$jwt_hardcoded" ]; then
    echo "🚨 하드코딩된 JWT Secret 발견:"
    echo "$jwt_hardcoded"
    found_issues=1
fi

# 데이터베이스 URL 하드코딩 검사
echo "📍 데이터베이스 URL 하드코딩 검사..."
db_hardcoded=$(find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | \
    grep -v node_modules | grep -v .git | grep -v dist | \
    xargs grep -n -E "['\"]postgres://[^'\"]*['\"]|['\"]mongodb://[^'\"]*['\"]|['\"]mysql://[^'\"]*['\"]" | \
    grep -v "process.env" | grep -v "DATABASE_URL")

if [ ! -z "$db_hardcoded" ]; then
    echo "🚨 하드코딩된 데이터베이스 URL 발견:"
    echo "$db_hardcoded"
    found_issues=1
fi

echo "==============================="
if [ $found_issues -eq 0 ]; then
    echo "✅ 하드코딩 문제 없음 - 모든 민감한 정보가 환경변수로 처리됨"
else
    echo "❌ 하드코딩 문제 발견! 즉시 수정 필요"
fi
echo "==============================="

exit $found_issues