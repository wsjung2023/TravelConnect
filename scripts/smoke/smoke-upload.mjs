// Object Storage 마이그레이션 smoke test — /api/files/ redirect 및 신규 업로드 검증.
// [2026-03-08] 신규 생성: Object Storage 마이그레이션 검증 (T006)
// 실행: node scripts/smoke/smoke-upload.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'http://127.0.0.1:5000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0;
let fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ng(label, detail) { console.log(`  ❌ ${label}: ${detail}`); fail++; }

async function getDevToken(userId) {
  const res = await fetch(`${BASE_URL}/api/auth/dev-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`dev-token 실패: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function main() {
  console.log(`🧪 Object Storage smoke test — ${BASE_URL}`);
  console.log('');

  // ────────────────────────────────────────────────────────
  // Step 1: 기존 마이그레이션 파일 redirect 확인
  // ────────────────────────────────────────────────────────
  console.log('Step 1: 기존 파일 /api/files/ redirect 확인');
  const testFilename = 'fb939e29-88d0-4f26-af3d-bb23b0f5ce87.jpg'; // DB에 실제 있는 파일
  try {
    const res = await fetch(`${BASE_URL}/api/files/${testFilename}`, {
      redirect: 'manual', // redirect를 따르지 않고 302 코드 확인
    });
    if (res.status === 302) {
      const location = res.headers.get('location');
      if (location && location.includes('storage.googleapis.com')) {
        ok(`/api/files/${testFilename} → Object Storage redirect (302)`);
      } else {
        ng(`redirect location 확인`, `예상: storage.googleapis.com, 실제: ${location}`);
      }
    } else {
      ng(`/api/files/${testFilename}`, `예상 302, 실제 ${res.status}`);
    }
  } catch (e) {
    ng('Step 1 오류', e.message);
  }

  // ────────────────────────────────────────────────────────
  // Step 2: redirect 따라가서 실제 이미지 수신 확인
  // ────────────────────────────────────────────────────────
  console.log('\nStep 2: redirect 따라가서 실제 파일 수신 확인');
  try {
    const res = await fetch(`${BASE_URL}/api/files/${testFilename}`, {
      redirect: 'follow',
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      ok(`실제 파일 수신 성공 (status: ${res.status}, content-type: ${contentType.split(';')[0]})`);
    } else {
      ng('실제 파일 수신', `status: ${res.status}`);
    }
  } catch (e) {
    ng('Step 2 오류', e.message);
  }

  // ────────────────────────────────────────────────────────
  // Step 3: 신규 업로드 → Object Storage 저장 → URL 검증
  // ────────────────────────────────────────────────────────
  console.log('\nStep 3: 신규 파일 업로드 → Object Storage 확인');
  try {
    // dev-token 발급
    const token = await getDevToken('45254510');

    // 1x1 PNG 픽셀 생성 (최소한의 테스트 이미지)
    const minimalPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
      'hex'
    );

    const formData = new FormData();
    formData.append('files', new Blob([minimalPng], { type: 'image/png' }), 'smoke-test.png');

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      ng('업로드 요청', `status: ${uploadRes.status}, body: ${await uploadRes.text()}`);
    } else {
      const uploadData = await uploadRes.json();
      const uploadedFile = uploadData.files?.[0];
      if (!uploadedFile) {
        ng('업로드 응답', 'files 배열이 비어있음');
      } else {
        ok(`업로드 성공: ${uploadedFile.url}`);

        // 업로드된 파일이 Object Storage에서 접근 가능한지 확인
        const fileRes = await fetch(`${BASE_URL}${uploadedFile.url}`, {
          redirect: 'manual',
        });
        if (fileRes.status === 302) {
          const loc = fileRes.headers.get('location');
          if (loc && loc.includes('storage.googleapis.com')) {
            ok(`업로드된 파일 Object Storage redirect 확인 (302 → GCS)`);
          } else {
            ng('Object Storage redirect', `location: ${loc}`);
          }
        } else {
          ng('업로드 파일 접근', `status: ${fileRes.status}`);
        }
      }
    }
  } catch (e) {
    ng('Step 3 오류', e.message);
  }

  // ────────────────────────────────────────────────────────
  // 결과
  // ────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`결과: ${pass} PASS / ${fail} FAIL`);
  if (fail === 0) {
    console.log('✅ SMOKE PASS: Object Storage 마이그레이션 정상 동작');
  } else {
    console.log('❌ SMOKE FAIL');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Smoke test 오류:', err);
  process.exit(1);
});
