#!/bin/bash

# 하드코딩 검사 스크립트
echo "🔍 하드코딩 검사 시작..."
echo "==============================="

# 검사할 파일 확장자
file_extensions=("*.js" "*.ts" "*.tsx" "*.jsx")

# 위험한 패턴들
patterns=(
    "API_KEY\s*=\s*['\"][^'\"]*['\"]"
    "CLIENT_ID\s*=\s*['\"][^'\"]*['\"]"
    "CLIENT_SECRET\s*=\s*['\"][^'\"]*['\"]"
    "PASSWORD\s*=\s*['\"][^'\"]*['\"]"
    "SECRET\s*=\s*['\"][^'\"]*['\"]"
    "TOKEN\s*=\s*['\"][^'\"]*['\"]"
    "mongodb://[^'\"]*"
    "postgres://[^'\"]*"
    "mysql://[^'\"]*"
    "redis://[^'\"]*"
    "https://[^'\"]*\.googleapis\.com/[^'\"]*"
)

found_issues=0

# 각 패턴별로 검사
for pattern in "${patterns[@]}"; do
    echo "검사 중: $pattern"
    
    for ext in "${file_extensions[@]}"; do
        results=$(find . -name "$ext" -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -Hn -E "$pattern" {} \; 2>/dev/null)
        
        if [ ! -z "$results" ]; then
            echo "⚠️  발견됨:"
            echo "$results"
            found_issues=1
        fi
    done
    echo ""
done

# 특별 검사: 구글 OAuth 키
echo "🔍 구글 OAuth 키 검사..."
google_patterns=(
    "[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com"
    "GOCSPX-[a-zA-Z0-9_-]+"
)

for pattern in "${google_patterns[@]}"; do
    for ext in "${file_extensions[@]}"; do
        results=$(find . -name "$ext" -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -Hn -E "$pattern" {} \; 2>/dev/null)
        
        if [ ! -z "$results" ]; then
            echo "🚨 구글 OAuth 키 발견:"
            echo "$results"
            found_issues=1
        fi
    done
done

echo "==============================="
if [ $found_issues -eq 0 ]; then
    echo "✅ 하드코딩된 민감한 정보 없음"
else
    echo "❌ 하드코딩 문제 발견! 즉시 수정 필요"
fi
echo "==============================="

exit $found_issues