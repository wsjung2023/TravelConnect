#!/bin/bash

# 백업 생성 스크립트
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/${TIMESTAMP}_backup"

echo "백업 생성 중: $BACKUP_DIR"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 주요 소스코드 파일들 복사
cp -r client "$BACKUP_DIR/"
cp -r server "$BACKUP_DIR/"
cp -r shared "$BACKUP_DIR/"
cp -r src "$BACKUP_DIR/" 2>/dev/null || true

# 설정 파일들 복사
cp components.json "$BACKUP_DIR/" 2>/dev/null || true
cp drizzle.config.ts "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
cp tsconfig.json "$BACKUP_DIR/"
cp vite.config.ts "$BACKUP_DIR/"
cp tailwind.config.ts "$BACKUP_DIR/"
cp postcss.config.js "$BACKUP_DIR/" 2>/dev/null || true
cp index.html "$BACKUP_DIR/"
cp README_LOCAL_SETUP.md "$BACKUP_DIR/" 2>/dev/null || true
cp replit.md "$BACKUP_DIR/" 2>/dev/null || true

# 백업 정보 파일 생성
echo "백업 생성일: $(date)" > "$BACKUP_DIR/backup_info.txt"
echo "백업 내용: 파일 업로드 시스템 완료" >> "$BACKUP_DIR/backup_info.txt"
echo "복원 방법: 이 폴더의 내용을 프로젝트 루트로 복사" >> "$BACKUP_DIR/backup_info.txt"

# tar.gz 백업도 생성
tar -czf "${BACKUP_DIR}.tar.gz" -C backup "$(basename $BACKUP_DIR)"

echo "✅ 백업 완료: $BACKUP_DIR"
echo "✅ 압축 백업: ${BACKUP_DIR}.tar.gz"

ls -la "$BACKUP_DIR"