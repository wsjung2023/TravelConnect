#!/bin/bash

# 백업 복원 스크립트
# 사용법: ./restore_backup.sh [백업폴더명]

BACKUP_DIR=${1:-"20250727_073327_working_state"}

echo "=== 백업 복원 시작 ==="
echo "복원할 백업: backup/$BACKUP_DIR"

if [ ! -d "backup/$BACKUP_DIR" ]; then
    echo "❌ 백업 폴더가 존재하지 않습니다: backup/$BACKUP_DIR"
    echo "사용 가능한 백업 목록:"
    ls backup/
    exit 1
fi

echo "현재 파일을 backup_current에 백업 중..."
mkdir -p backup_current
cp -r client server shared *.json *.ts *.js *.md backup_current/ 2>/dev/null

echo "백업에서 파일 복원 중..."
cp -r backup/$BACKUP_DIR/* ./

echo "✅ 복원 완료!"
echo "복원된 파일 개수: $(find backup/$BACKUP_DIR -type f | wc -l)개"
echo ""
echo "서버 재시작이 필요합니다."