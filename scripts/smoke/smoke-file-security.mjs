// 파일 업로드 보안/안정성 종합 테스트 스크립트.
// [2026-03-08] 신규 생성: Object Storage 마이그레이션 후 보안·안정성 검증
// 실행: node scripts/smoke/smoke-file-security.mjs

const BASE_URL = 'http://127.0.0.1:5000';
let pass = 0;
let fail = 0;
const results = [];

function ok(label, detail = '') {
  const msg = `  ✅ ${label}${detail ? ` (${detail})` : ''}`;
  console.log(msg);
  results.push({ status: 'PASS', label });
  pass++;
}
function ng(label, detail = '') {
  const msg = `  ❌ ${label}${detail ? `: ${detail}` : ''}`;
  console.log(msg);
  results.push({ status: 'FAIL', label, detail });
  fail++;
}
function section(title) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ${title}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

// dev-token 발급 헬퍼
async function getDevToken(userId) {
  const res = await fetch(`${BASE_URL}/api/auth/dev-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(`dev-token 실패 (userId=${userId}): ${res.status}`);
  const { token } = await res.json();
  return token;
}

// 1x1 PNG 픽셀 (최소 이미지)
const MINIMAL_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);

// 파일 업로드 헬퍼
async function uploadFile(token, fileBlob, filename, extra = {}) {
  const formData = new FormData();
  formData.append('files', fileBlob, filename);
  return fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
    ...extra,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔒 파일 업로드 보안/안정성 종합 테스트`);
  console.log(`   대상: ${BASE_URL}\n`);

  // 테스트 유저 토큰 준비
  let tokenA, tokenB;
  try {
    // DB에서 실제 유저 2명 ID 조회
    const usersRes = await fetch(`${BASE_URL}/api/auth/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '45254510' }), // 가이드 유저
    });
    if (usersRes.ok) tokenA = (await usersRes.json()).token;

    const userBRes = await fetch(`${BASE_URL}/api/auth/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user_1753631816850_mh1bmzx4a' }), // 다른 유저
    });
    if (userBRes.ok) tokenB = (await userBRes.json()).token;
  } catch (e) {
    console.log(`⚠️ 토큰 발급 실패: ${e.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  section('T1. 인증 없이 업로드 시도 → 401 차단');
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const res = await uploadFile(null,
      new Blob([MINIMAL_PNG], { type: 'image/png' }), 'test.png'
    );
    if (res.status === 401) {
      ok('비로그인 업로드 차단', `401 Unauthorized`);
    } else {
      ng('비로그인 업로드 차단', `예상 401, 실제 ${res.status}`);
    }
  } catch (e) { ng('T1 오류', e.message); }

  // ──────────────────────────────────────────────────────────────────────────
  section('T2. 사용자 A 정상 업로드 → GCS 저장 확인');
  // ──────────────────────────────────────────────────────────────────────────
  let fileUrlA = null;
  try {
    if (!tokenA) throw new Error('토큰A 없음');
    const res = await uploadFile(tokenA,
      new Blob([MINIMAL_PNG], { type: 'image/png' }), 'user-a-photo.png'
    );
    if (!res.ok) {
      ng('사용자 A 업로드', `status: ${res.status}, body: ${await res.text()}`);
    } else {
      const data = await res.json();
      fileUrlA = data.files?.[0]?.url;
      if (fileUrlA && fileUrlA.startsWith('/api/files/')) {
        ok('사용자 A 업로드 성공', fileUrlA);
      } else {
        ng('업로드 URL 형식', `반환된 URL: ${fileUrlA}`);
      }
    }
  } catch (e) { ng('T2 오류', e.message); }

  // 업로드된 파일이 실제로 GCS에 저장됐는지 확인
  try {
    if (fileUrlA) {
      const res = await fetch(`${BASE_URL}${fileUrlA}`, { redirect: 'manual' });
      if (res.status === 302) {
        const location = res.headers.get('location') || '';
        if (location.includes('storage.googleapis.com')) {
          ok('GCS에 실제 저장 확인', `302 → storage.googleapis.com`);
        } else {
          ng('GCS redirect 확인', `location: ${location}`);
        }
      } else {
        ng('파일 접근 redirect', `예상 302, 실제 ${res.status}`);
      }
    } else {
      ng('GCS 저장 확인', '파일 URL 없음 (T2 실패로 인한 skip)');
    }
  } catch (e) { ng('GCS 확인 오류', e.message); }

  // ──────────────────────────────────────────────────────────────────────────
  section('T3. 사용자 B가 A의 파일 URL 접근 (소셜 미디어 = 공개)');
  // ──────────────────────────────────────────────────────────────────────────
  try {
    if (!fileUrlA) throw new Error('파일 URL 없음 (T2 실패)');
    // 사용자 B 인증 없이 접근 (공개 파일이어야 함)
    const res = await fetch(`${BASE_URL}${fileUrlA}`, { redirect: 'follow' });
    if (res.ok) {
      ok('타 유저 파일 접근 가능 (소셜 미디어 공개 파일)', `status: ${res.status}`);
    } else {
      ng('공개 파일 접근', `status: ${res.status}`);
    }
  } catch (e) { ng('T3 오류', e.message); }

  // ──────────────────────────────────────────────────────────────────────────
  section('T4. 사용자 A와 B 파일이 각각 독립 UUID로 저장 (덮어쓰기 불가)');
  // ──────────────────────────────────────────────────────────────────────────
  let fileUrlB = null;
  try {
    if (!tokenB) throw new Error('토큰B 없음');
    // 사용자 B가 동일한 원본 파일명으로 업로드
    const res = await uploadFile(tokenB,
      new Blob([MINIMAL_PNG], { type: 'image/png' }), 'user-a-photo.png' // 동일 파일명
    );
    if (!res.ok) {
      ng('사용자 B 업로드', `status: ${res.status}`);
    } else {
      const data = await res.json();
      fileUrlB = data.files?.[0]?.url;
      if (fileUrlA && fileUrlB && fileUrlA !== fileUrlB) {
        ok('A·B 파일이 서로 다른 UUID (덮어쓰기 없음)',
          `A: ${fileUrlA.split('/').pop()}, B: ${fileUrlB.split('/').pop()}`);
      } else if (fileUrlA === fileUrlB) {
        ng('파일 UUID 충돌!', `A와 B가 동일 URL: ${fileUrlA}`);
      } else {
        ok('사용자 B 업로드 성공', fileUrlB || '(URL 없음)');
      }
    }
  } catch (e) { ng('T4 오류', e.message); }

  // ──────────────────────────────────────────────────────────────────────────
  section('T5. 금지된 파일 형식 업로드 차단 (.exe, .php, .js)');
  // ──────────────────────────────────────────────────────────────────────────
  const forbidden = [
    { name: 'malware.exe', type: 'application/octet-stream' },
    { name: 'shell.php', type: 'application/x-php' },
    { name: 'script.js', type: 'application/javascript' },
    { name: 'hack.html', type: 'text/html' },
  ];
  for (const f of forbidden) {
    try {
      if (!tokenA) throw new Error('토큰A 없음');
      const res = await uploadFile(tokenA,
        new Blob(['evil content'], { type: f.type }), f.name
      );
      if (res.status === 400) {
        ok(`${f.name} 차단`, `400`);
      } else {
        ng(`${f.name} 차단 실패`, `status: ${res.status}`);
      }
    } catch (e) { ng(`T5 ${f.name} 오류`, e.message); }
  }

  // ──────────────────────────────────────────────────────────────────────────
  section('T6. 경로 탐색(Path Traversal) 공격 차단');
  // ──────────────────────────────────────────────────────────────────────────
  const pathAttacks = [
    '../../etc/passwd',
    '../.env',
    '%2e%2e%2fetc%2fpasswd',
  ];
  for (const attack of pathAttacks) {
    try {
      const res = await fetch(`${BASE_URL}/api/files/${encodeURIComponent(attack)}`, {
        redirect: 'manual',
      });
      // 400이거나 404여야 함 (파일 존재 안 하거나 검증 실패)
      if (res.status === 400 || res.status === 404) {
        ok(`경로 탐색 차단: ${attack}`, `${res.status}`);
      } else {
        ng(`경로 탐색 미차단: ${attack}`, `status: ${res.status}`);
      }
    } catch (e) { ng(`T6 오류 (${attack})`, e.message); }
  }

  // ──────────────────────────────────────────────────────────────────────────
  section('T7. 파일 크기 초과 차단 (>15MB)');
  // ──────────────────────────────────────────────────────────────────────────
  try {
    if (!tokenA) throw new Error('토큰A 없음');
    // 16MB 더미 데이터
    const bigBuffer = Buffer.alloc(16 * 1024 * 1024, 0x42);
    const res = await uploadFile(tokenA,
      new Blob([bigBuffer], { type: 'image/jpeg' }), 'toobig.jpg'
    );
    if (res.status === 400) {
      const body = await res.json();
      if (body.code === 'FILE_TOO_LARGE') {
        ok('15MB 초과 파일 차단', `code: FILE_TOO_LARGE`);
      } else {
        ok('15MB 초과 파일 차단', `status: 400`);
      }
    } else {
      ng('15MB 초과 차단 실패', `status: ${res.status}`);
    }
  } catch (e) {
    // 연결 자체가 끊길 수 있음 (서버가 큰 파일 거부)
    if (e.message.includes('fetch') || e.message.includes('socket') || e.message.includes('connect')) {
      ok('15MB 초과 차단 (연결 차단)', e.message.substring(0, 50));
    } else {
      ng('T7 오류', e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  section('T8. 최대 10개 파일 초과 업로드 차단');
  // ──────────────────────────────────────────────────────────────────────────
  try {
    if (!tokenA) throw new Error('토큰A 없음');
    const formData = new FormData();
    for (let i = 0; i < 11; i++) {
      formData.append('files',
        new Blob([MINIMAL_PNG], { type: 'image/png' }), `file-${i}.png`
      );
    }
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
      body: formData,
    });
    if (res.status === 400) {
      ok('11개 파일 업로드 차단', '400');
    } else {
      ng('11개 파일 차단 실패', `status: ${res.status}`);
    }
  } catch (e) { ng('T8 오류', e.message); }

  // ──────────────────────────────────────────────────────────────────────────
  section('T9. 서명 URL 만료 전 재요청 일관성');
  // ──────────────────────────────────────────────────────────────────────────
  try {
    if (!fileUrlA) throw new Error('파일 URL 없음 (T2 실패)');
    // 같은 파일을 두 번 요청해서 둘 다 접근 가능한지 확인
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}${fileUrlA}`, { redirect: 'follow' }),
      fetch(`${BASE_URL}${fileUrlA}`, { redirect: 'follow' }),
    ]);
    if (res1.ok && res2.ok) {
      ok('동일 파일 동시 요청 일관성', `둘 다 ${res1.status}`);
    } else {
      ng('동시 요청 불일치', `req1: ${res1.status}, req2: ${res2.status}`);
    }
  } catch (e) { ng('T9 오류', e.message); }

  // ──────────────────────────────────────────────────────────────────────────
  // 최종 결과
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log(`📊 최종 결과: ${pass} PASS / ${fail} FAIL / 전체 ${pass + fail}`);

  if (fail === 0) {
    console.log('🎉 SMOKE PASS — 모든 보안/안정성 테스트 통과');
  } else {
    console.log('\n❌ 실패 목록:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.label}${r.detail ? ': ' + r.detail : ''}`);
    });
    process.exit(1);
  }
  console.log('════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('💥 테스트 오류:', err);
  process.exit(1);
});
