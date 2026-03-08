// uploads/ 로컬 디스크 파일을 Object Storage로 마이그레이션하는 스크립트.
// [2026-03-08] 신규 생성: multer diskStorage → Object Storage 마이그레이션 (T004)
// 실행: node scripts/migrate-uploads.mjs
// 주의: 서버가 실행 중인 상태에서 실행 가능 (DB 직접 접근)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Storage } from '@google-cloud/storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';

// MIME 타입 추론
function guessMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.heic': 'image/heic',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

// Object Storage 클라이언트 초기화
function createStorageClient() {
  return new Storage({
    credentials: {
      audience: 'replit',
      subject_token_type: 'access_token',
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: 'external_account',
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: { type: 'json', subject_token_field_name: 'access_token' },
      },
      universe_domain: 'googleapis.com',
    },
    projectId: '',
  });
}

// PUBLIC_OBJECT_SEARCH_PATHS에서 버킷명/공개 디렉터리 추출
function getPublicStoragePath() {
  const paths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
  const firstPath = paths.split(',')[0].trim();
  if (!firstPath) throw new Error('PUBLIC_OBJECT_SEARCH_PATHS 미설정');
  const parts = firstPath.replace(/^\//, '').split('/');
  return { bucketName: parts[0], publicDir: parts.slice(1).join('/') || 'public' };
}

// 단일 파일을 Object Storage에 업로드
async function uploadFileToObjectStorage(storageClient, bucketName, objectName, filePath, mimetype) {
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  const buffer = fs.readFileSync(filePath);
  await file.save(buffer, { contentType: mimetype, resumable: false });
}

async function main() {
  console.log('📦 Object Storage 마이그레이션 시작');
  console.log(`📂 소스: ${UPLOADS_DIR}`);

  // uploads/ 폴더 존재 확인
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('❌ uploads/ 폴더가 없습니다.');
    process.exit(1);
  }

  // 환경변수 확인
  const { bucketName, publicDir } = getPublicStoragePath();
  console.log(`🪣 버킷: ${bucketName}`);
  console.log(`📁 공개 디렉터리: ${publicDir}`);

  // Object Storage 클라이언트
  const storageClient = createStorageClient();

  // uploads/ 파일 목록 (숨김 파일 제외)
  const files = fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith('.'));
  console.log(`\n🗂️  총 ${files.length}개 파일 발견\n`);

  if (files.length === 0) {
    console.log('✅ 마이그레이션할 파일이 없습니다.');
    return;
  }

  let success = 0;
  let skip = 0;
  let fail = 0;
  const failedFiles = [];

  for (const filename of files) {
    const filePath = path.join(UPLOADS_DIR, filename);
    const stat = fs.statSync(filePath);

    // 0바이트 파일 건너뜀
    if (stat.size === 0) {
      console.log(`  ⏭️  SKIP (0 bytes): ${filename}`);
      skip++;
      continue;
    }

    const mimetype = guessMimeType(filename);
    const objectName = `${publicDir}/uploads/${filename}`;

    try {
      // Object Storage에 이미 존재하는지 확인
      const bucket = storageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();

      if (exists) {
        console.log(`  ✅ ALREADY EXISTS: ${filename}`);
        skip++;
        continue;
      }

      // 업로드
      await uploadFileToObjectStorage(storageClient, bucketName, objectName, filePath, mimetype);
      console.log(`  ✅ UPLOADED: ${filename} (${(stat.size / 1024).toFixed(1)}KB, ${mimetype})`);
      success++;
    } catch (err) {
      console.log(`  ❌ FAILED: ${filename} — ${err.message}`);
      fail++;
      failedFiles.push(filename);
    }
  }

  console.log('\n========================================');
  console.log(`📊 마이그레이션 결과:`);
  console.log(`   ✅ 업로드 성공: ${success}개`);
  console.log(`   ⏭️  건너뜀 (0B 또는 이미 존재): ${skip}개`);
  console.log(`   ❌ 실패: ${fail}개`);
  if (failedFiles.length > 0) {
    console.log(`   실패 파일: ${failedFiles.join(', ')}`);
  }
  console.log('========================================');

  if (fail === 0) {
    console.log('\n🎉 마이그레이션 완료! Object Storage에 모든 파일이 업로드되었습니다.');
    console.log('   DB URL (/api/files/{filename})은 변경 불필요 — /api/files/ 엔드포인트가 Object Storage로 redirect합니다.');
  } else {
    console.log('\n⚠️ 일부 파일 마이그레이션 실패. 위 목록을 확인하세요.');
  }
}

main().catch(err => {
  console.error('💥 마이그레이션 오류:', err);
  process.exit(1);
});
