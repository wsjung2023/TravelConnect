#!/bin/bash

# 백업에서 복원하는 스크립트
echo "사용 가능한 백업 목록:"
ls -la backup/ | grep "^d" | tail -n +2

echo ""
echo "복원할 백업 폴더명을 입력하세요 (예: 20250727_112703_backup):"
read BACKUP_NAME

BACKUP_PATH="backup/$BACKUP_NAME"

if [ ! -d "$BACKUP_PATH" ]; then
    echo "❌ 백업 폴더를 찾을 수 없습니다: $BACKUP_PATH"
    exit 1
fi

echo "⚠️  현재 소스코드를 임시 백업 중..."
TEMP_BACKUP="backup/temp_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$TEMP_BACKUP"
cp -r client server shared src *.json *.ts *.html "$TEMP_BACKUP/" 2>/dev/null

echo "🔄 백업에서 복원 중: $BACKUP_PATH"

# 기존 파일들 삭제
rm -rf client server shared src 2>/dev/null
rm -f *.json *.ts *.html 2>/dev/null

# 백업에서 복원
cp -r "$BACKUP_PATH"/* . 2>/dev/null

echo "✅ 복원 완료!"
echo "📁 임시 백업 위치: $TEMP_BACKUP"
echo "🔧 이제 'npm install'을 실행하고 서버를 재시작하세요."