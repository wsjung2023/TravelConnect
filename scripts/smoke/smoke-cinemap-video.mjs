// CineMap 영상 생성 완료 스모크 테스트 — job 생성 → 폴링(최대 3분) → 영상 파일 검증
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const MAX_WAIT_MS = 180_000; // 3분
const POLL_INTERVAL_MS = 5_000; // 5초

let pass = 0;
let fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, detail) {
  console.error(`  ❌ ${label}`);
  if (detail) console.error(`     ${String(detail).slice(0, 200)}`);
  fail++;
}

async function post(path, cookieHeader, csrfToken, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

async function get(path, cookieHeader) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookieHeader } });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})), res };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

console.log('\n🎬 CineMap 영상 생성 스모크 테스트');
console.log(`   대상: ${BASE}\n`);

// 1. 로그인
const loginRes = await fetch(`${BASE}/api/auth/demo-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
if (!loginRes.ok) { ko('demo-login 실패'); process.exit(1); }
const setCookies = loginRes.headers.getSetCookie?.() ?? [];
const csrfToken = setCookies.find((c) => c.startsWith('tg_csrf='))?.match(/tg_csrf=([^;]+)/)?.[1] ?? '';
const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
ok('demo-login 성공');

// 2. 타임라인 조회
const timelinesRes = await get('/api/timelines', cookieHeader);
const timelines = timelinesRes.json;
if (!Array.isArray(timelines) || timelines.length === 0) {
  ko('타임라인 없음 — 테스트 계정에 타임라인이 필요합니다');
  process.exit(1);
}
const timelineId = timelines[0].id;
ok(`타임라인 확인 (id=${timelineId}, title="${timelines[0].title}")`);

// 3. CineMap job 생성 (BGM/TTS 없이 — 비용 최소화)
const jobRes = await post('/api/cinemap/jobs', cookieHeader, csrfToken, {
  timelineId,
  config: { bgmType: 'none', ttsEnabled: false },
});
if (!jobRes.ok) {
  ko('POST /api/cinemap/jobs 실패', JSON.stringify(jobRes.json));
  process.exit(1);
}
const jobId = jobRes.json.job?.id;
if (!jobId) { ko('job.id 없음', JSON.stringify(jobRes.json)); process.exit(1); }
ok(`CineMap job 생성 (id=${jobId})`);

// 4. 완료까지 폴링
console.log('');
const startMs = Date.now();
let finalJob = null;

while (true) {
  const elapsed = Math.round((Date.now() - startMs) / 1000);

  if (Date.now() - startMs > MAX_WAIT_MS) {
    ko(`폴링 타임아웃 (${MAX_WAIT_MS / 1000}초 초과)`);
    process.exit(1);
  }

  const pollRes = await get(`/api/cinemap/jobs/${jobId}`, cookieHeader);
  const job = pollRes.json.job;
  const status = job?.status;
  const stage = job?.stage;

  if (status === 'completed') {
    finalJob = job;
    ok(`영상 생성 완료 (${elapsed}초 소요)`);
    break;
  }

  if (status === 'failed') {
    ko(`영상 생성 실패 (${elapsed}초 경과)`, job?.errorMessage);
    process.exit(1);
  }

  console.log(`  ⏳ 폴링 중... (${elapsed}s, status=${status}, stage=${stage ?? '-'})`);
  await sleep(POLL_INTERVAL_MS);
}

// 5. resultVideoUrl 검증
const videoUrl = finalJob?.resultVideoUrl;
if (!videoUrl) {
  ko('resultVideoUrl 없음');
  process.exit(1);
}
ok(`resultVideoUrl 존재 (${videoUrl})`);

// 6. Object Storage 302 redirect 확인
const fileRes = await fetch(`${BASE}${videoUrl}`, {
  redirect: 'manual',
  headers: { Cookie: cookieHeader },
});
if (fileRes.status !== 302) {
  ko(`Object Storage redirect 실패 (status=${fileRes.status}, expected 302)`);
} else {
  ok('Object Storage 302 redirect 확인');
}

// 7. 실제 파일 수신 + 크기 확인
const redirectUrl = fileRes.headers.get('location');
if (!redirectUrl) {
  ko('redirect Location 헤더 없음');
} else {
  const fileDownload = await fetch(redirectUrl);
  if (!fileDownload.ok) {
    ko(`파일 다운로드 실패 (status=${fileDownload.status})`);
  } else {
    const buf = Buffer.from(await fileDownload.arrayBuffer());
    if (buf.length === 0) {
      ko('파일 크기 0 bytes');
    } else {
      ok(`실제 파일 수신 성공 (${buf.length.toLocaleString()} bytes)`);
    }
  }
}

// 결과
console.log(`\n${'─'.repeat(40)}`);
console.log(`📊 결과: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) {
  console.error('❌ SMOKE FAIL');
  process.exit(1);
} else {
  console.log('✅ CineMap 영상 생성 스모크 PASS\n');
}
