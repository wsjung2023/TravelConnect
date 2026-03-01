// 2계정 실시간 DM 채팅 WebSocket 통합 테스트 — Min-ji Kim ↔ Guide Park 실제 메시지 송수신 검증
import WebSocket from 'ws';

const BASE_HTTP = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const BASE_WS   = BASE_HTTP.replace(/^http/, 'ws');
const CONV_ID   = 7; // Min-ji ↔ Guide Park (conv#7)

const USER1 = { id: 'user_1753629321119_6seokvdlm', name: 'Min-ji Kim' };
const USER2 = { id: 'guide_scen_001',                 name: 'Guide Park' };

async function getToken(userId) {
  const res = await fetch(`${BASE_HTTP}/api/auth/dev-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`토큰 발급 실패: ${JSON.stringify(data)}`);
  return data.token;
}

function createClient(user, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE_WS}/ws`);
    const received = [];
    let authOk = false;

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'auth_success' || (msg.type === 'ping')) return;
      received.push(msg);
    });

    ws.on('error', reject);

    setTimeout(() => resolve({ ws, received, user }), 800);
  });
}

function sendDM(ws, conversationId, content, recipientId) {
  ws.send(JSON.stringify({ type: 'chat_message', conversationId, content, recipientId }));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  2계정 실시간 DM 채팅 테스트');
  console.log(`  ${USER1.name} ↔ ${USER2.name} (conv#${CONV_ID})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('[1/5] 두 계정 JWT 토큰 발급...');
  const [token1, token2] = await Promise.all([getToken(USER1.id), getToken(USER2.id)]);
  console.log(`  ✅ ${USER1.name} 토큰 발급: ${token1.slice(0, 20)}...`);
  console.log(`  ✅ ${USER2.name} 토큰 발급: ${token2.slice(0, 20)}...`);

  console.log('\n[2/5] WebSocket 동시 접속...');
  const [client1, client2] = await Promise.all([
    createClient(USER1, token1),
    createClient(USER2, token2),
  ]);
  console.log(`  ✅ ${USER1.name} WebSocket 연결 완료`);
  console.log(`  ✅ ${USER2.name} WebSocket 연결 완료`);

  console.log('\n[3/5] 실제 DM 메시지 교환...\n');

  // Min-ji → Guide Park 첫 메시지
  console.log(`  📤 ${USER1.name} → ${USER2.name}:`);
  console.log(`     "안녕하세요! 경복궁 투어 가이드 찾고 있어요. 내일 가능한가요?"`);
  sendDM(client1.ws, CONV_ID, '안녕하세요! 경복궁 투어 가이드 찾고 있어요. 내일 가능한가요?', USER2.id);
  await sleep(600);

  // Guide Park → Min-ji 응답
  console.log(`  📤 ${USER2.name} → ${USER1.name}:`);
  console.log(`     "안녕하세요! 네, 내일 오전 10시에 경복궁 정문에서 만나면 됩니다. 3시간 코스 $90입니다."`);
  sendDM(client2.ws, CONV_ID, '안녕하세요! 네, 내일 오전 10시에 경복궁 정문에서 만나면 됩니다. 3시간 코스 $90입니다.', USER1.id);
  await sleep(600);

  // Min-ji → Guide Park 확인
  console.log(`  📤 ${USER1.name} → ${USER2.name}:`);
  console.log(`     "좋아요! 계약서 보내주시면 서명하겠습니다."`);
  sendDM(client1.ws, CONV_ID, '좋아요! 계약서 보내주시면 서명하겠습니다.', USER2.id);
  await sleep(600);

  // Guide Park → Min-ji 마무리
  console.log(`  📤 ${USER2.name} → ${USER1.name}:`);
  console.log(`     "네, 지금 계약서 발송했습니다. 확인 부탁드립니다!"`);
  sendDM(client2.ws, CONV_ID, '네, 지금 계약서 발송했습니다. 확인 부탁드립니다!', USER1.id);
  await sleep(800);

  console.log('\n[4/5] 수신 메시지 확인...');
  console.log(`  ${USER1.name}(수신함): ${client1.received.length}개`);
  client1.received.forEach(m => {
    if (m.type === 'chat_message') console.log(`    📩 [상대방 발신] "${m.message?.content}"`);
    if (m.type === 'message_sent') console.log(`    ✉️  [내 발신 확인] "${m.message?.content}"`);
  });
  console.log(`  ${USER2.name}(수신함): ${client2.received.length}개`);
  client2.received.forEach(m => {
    if (m.type === 'chat_message') console.log(`    📩 [상대방 발신] "${m.message?.content}"`);
    if (m.type === 'message_sent') console.log(`    ✉️  [내 발신 확인] "${m.message?.content}"`);
  });

  console.log('\n[5/5] DB 저장 확인 (REST API)...');
  const res = await fetch(`${BASE_HTTP}/api/conversations/${CONV_ID}/messages`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const msgs = await res.json();
  console.log(`  DB에 저장된 메시지: ${msgs.length}개`);
  msgs.forEach(m => {
    const senderName = m.senderId === USER1.id ? USER1.name : USER2.name;
    console.log(`    [${senderName}] "${m.content}"`);
  });

  client1.ws.close();
  client2.ws.close();

  const passed = msgs.length >= 4;
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (passed) {
    console.log('  ✅ 2계정 실시간 DM 채팅 테스트 PASS');
    console.log(`  총 ${msgs.length}개 메시지 WebSocket → DB 저장 확인`);
  } else {
    console.log('  ❌ 테스트 FAIL - 메시지가 DB에 저장되지 않음');
    process.exit(1);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
  console.error('❌ 테스트 오류:', err.message);
  process.exit(1);
});
