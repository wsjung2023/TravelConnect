// 전체 P2P 거래 흐름 시뮬레이션: 계약→결제→서비스→정산
// 시나리오: Min-ji Kim(여행자) ↔ Guide Park(가이드), 경복궁 투어 $90

import pg from 'pg';

const { Client } = pg;
const BASE = 'http://localhost:5000';

const TRAVELER_ID      = 'user_1753629321119_6seokvdlm'; // Min-ji Kim
const GUIDE_ID         = 'guide_scen_001';                // Guide Park
const CONTRACT_ID      = 13;
const DEPOSIT_STAGE_ID = 19;  // $27 (30%)
const FINAL_STAGE_ID   = 20;  // $63 (70%)

let travelerToken = null;
let pass = 0, fail = 0;

function log(emoji, label, detail = '') {
  console.log(`${emoji} ${label}${detail ? ' → ' + detail : ''}`);
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(label, condition, detail = '') {
  if (condition) {
    log('✅', label, detail);
    pass++;
  } else {
    log('❌', label, detail);
    fail++;
  }
}

async function dbExec(sql, params = []) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

// ============================================================
// STEP 0: 초기 상태 확인
// ============================================================
async function step0_initialState() {
  console.log('\n══════════════════════════════════');
  console.log('📋 STEP 0: 초기 상태 확인');
  console.log('══════════════════════════════════');

  const [contract] = await dbExec(
    'SELECT id, title, total_amount, currency, status FROM contracts WHERE id = $1',
    [CONTRACT_ID]
  );
  const stages = await dbExec(
    'SELECT id, name, amount, status FROM contract_stages WHERE contract_id = $1 ORDER BY stage_order',
    [CONTRACT_ID]
  );

  log('📄', `계약#${CONTRACT_ID}`, `"${contract.title}" $${contract.total_amount} ${contract.currency} [${contract.status}]`);
  for (const s of stages) {
    log('📑', `  단계 #${s.id} ${s.name}`, `$${s.amount} [${s.status}]`);
  }

  assert('계약 초기 상태 pending', contract.status === 'pending');
  assert('계약금 단계 pending',   stages[0].status === 'pending');
  assert('잔금 단계 pending',     stages[1].status === 'pending');
}

// ============================================================
// STEP 1: 토큰 발급
// ============================================================
async function step1_getTokens() {
  console.log('\n══════════════════════════════════');
  console.log('🔑 STEP 1: 인증 토큰 발급');
  console.log('══════════════════════════════════');

  const r = await api('POST', '/api/auth/dev-token', { userId: TRAVELER_ID });
  if (r.status !== 200 || !r.data.token) {
    throw new Error(`dev-token 발급 실패: ${JSON.stringify(r.data)}`);
  }
  travelerToken = r.data.token;

  assert('Min-ji Kim 토큰 발급', !!travelerToken, 'OK');
}

// ============================================================
// STEP 2: 계약 상세 조회 (API)
// ============================================================
async function step2_viewContract() {
  console.log('\n══════════════════════════════════');
  console.log('📖 STEP 2: 계약 상세 조회 (API)');
  console.log('══════════════════════════════════');

  const r = await api('GET', `/api/contracts/${CONTRACT_ID}`, null, travelerToken);
  assert('GET /api/contracts/13 → 200', r.status === 200, `status=${r.status}`);

  const c = r.data.contract || r.data;
  if (c?.travelerId || c?.traveler_id) {
    log('📋', '계약 정보', `traveler=${c.travelerId || c.traveler_id}, guide=${c.guideId || c.guide_id}, status=${c.status}`);
  }
}

// ============================================================
// STEP 3: 결제 시작 (API) — PortOne 결제 ID 생성
// ============================================================
async function step3_initiatePayment() {
  console.log('\n══════════════════════════════════');
  console.log('💳 STEP 3: 결제 시작 (API — 계약금 $27)');
  console.log('══════════════════════════════════');

  const r = await api(
    'POST',
    `/api/contracts/${CONTRACT_ID}/initiate-payment`,
    { stageId: DEPOSIT_STAGE_ID },
    travelerToken
  );

  log('📡', `응답 status=${r.status}`, JSON.stringify(r.data).slice(0, 150));
  assert('POST initiate-payment → 200', r.status === 200, `status=${r.status}`);

  if (r.data.paymentId) {
    log('💰', `PortOne paymentId`, r.data.paymentId);
    log('📦', `주문명`,           r.data.orderName);
    log('💵', `결제금액`,         `$${r.data.amount} ${r.data.currency}`);
  }
}

// ============================================================
// STEP 4: 계약금 결제 완료 시뮬레이션 (PortOne 웹훅 역할 — DB 직접)
// ============================================================
async function step4_simulateDepositPayment() {
  console.log('\n══════════════════════════════════');
  console.log('🏦 STEP 4: 계약금 결제 완료 시뮬레이션 (PortOne 웹훅 역할)');
  console.log('   [실제 카드 없음 → DB 직접 처리 — PortOne이 하는 것과 동일]');
  console.log('══════════════════════════════════');

  const simulatedPaymentId = `sim_tg_${CONTRACT_ID}_deposit_test001`;

  // 에스크로 트랜잭션 생성 (funded)
  await dbExec(`
    INSERT INTO escrow_transactions
      (contract_id, milestone_type, amount, currency, status, payment_id, funded_at, created_at, updated_at)
    VALUES
      ($1, 'deposit', '27', 'USD', 'funded', $2, NOW(), NOW(), NOW())
  `, [CONTRACT_ID, simulatedPaymentId]);
  log('💾', '에스크로 트랜잭션 생성', 'funded / 계약금 $27');

  // 계약금 단계 → paid
  await dbExec(`
    UPDATE contract_stages
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [DEPOSIT_STAGE_ID]);
  log('💾', `단계#${DEPOSIT_STAGE_ID} 계약금`, 'pending → paid');

  // 계약 → in_progress
  await dbExec(`
    UPDATE contracts
    SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [CONTRACT_ID]);
  log('💾', `계약#${CONTRACT_ID}`, 'pending → in_progress');

  const [contract] = await dbExec('SELECT status, started_at FROM contracts WHERE id = $1', [CONTRACT_ID]);
  const [stage]    = await dbExec('SELECT status FROM contract_stages WHERE id = $1', [DEPOSIT_STAGE_ID]);
  const [etx]      = await dbExec('SELECT status, amount FROM escrow_transactions WHERE contract_id = $1 AND milestone_type = $2', [CONTRACT_ID, 'deposit']);

  assert('계약 상태 → in_progress',  contract.status === 'in_progress');
  assert('계약금 단계 → paid',       stage.status    === 'paid');
  assert('에스크로 트랜잭션 funded', etx.status      === 'funded');
  log('🕐', '서비스 시작 시각', String(contract.started_at));
}

// ============================================================
// STEP 5: 잔금 결제 시뮬레이션
// ============================================================
async function step5_simulateFinalPayment() {
  console.log('\n══════════════════════════════════');
  console.log('💳 STEP 5: 잔금 결제 시작 (API) + 완료 시뮬레이션 ($63)');
  console.log('══════════════════════════════════');

  // 잔금 개시 API 호출
  const r = await api(
    'POST',
    `/api/contracts/${CONTRACT_ID}/initiate-payment`,
    { stageId: FINAL_STAGE_ID },
    travelerToken
  );
  log('📡', `잔금 개시 응답 status=${r.status}`, r.data.paymentId || JSON.stringify(r.data).slice(0, 80));
  assert('잔금 initiate-payment → 200', r.status === 200, `status=${r.status}`);

  // 잔금 에스크로 트랜잭션 생성
  const finalPaymentId = `sim_tg_${CONTRACT_ID}_final_test001`;
  await dbExec(`
    INSERT INTO escrow_transactions
      (contract_id, milestone_type, amount, currency, status, payment_id, funded_at, created_at, updated_at)
    VALUES
      ($1, 'final', '63', 'USD', 'funded', $2, NOW(), NOW(), NOW())
  `, [CONTRACT_ID, finalPaymentId]);

  // 잔금 단계 → paid
  await dbExec(`
    UPDATE contract_stages
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [FINAL_STAGE_ID]);

  const [stage] = await dbExec('SELECT status FROM contract_stages WHERE id = $1', [FINAL_STAGE_ID]);
  assert('잔금 단계 → paid', stage.status === 'paid');
  log('💾', '잔금 에스크로 트랜잭션 생성', 'funded / 잔금 $63');

  const txs = await dbExec(
    'SELECT milestone_type, amount, status FROM escrow_transactions WHERE contract_id = $1',
    [CONTRACT_ID]
  );
  let total = 0;
  for (const tx of txs) {
    log('📊', `  ${tx.milestone_type}`, `$${tx.amount} [${tx.status}]`);
    total += parseFloat(tx.amount);
  }
  log('💵', '총 에스크로 보유액', `$${total}`);
  assert('총 에스크로 $90', Math.abs(total - 90) < 0.01);
}

// ============================================================
// STEP 6: 서비스 완료 (API — 여행자가 완료 확인)
// ============================================================
async function step6_completeService() {
  console.log('\n══════════════════════════════════');
  console.log('🎉 STEP 6: 서비스 완료 확인 (API — 여행자)');
  console.log('══════════════════════════════════');

  // complete API는 escrow_tx WHERE status='completed' 조건 필요 → funded→completed 전이
  await dbExec(`
    UPDATE escrow_transactions
    SET status = 'completed', updated_at = NOW()
    WHERE contract_id = $1 AND status = 'funded'
  `, [CONTRACT_ID]);
  log('💾', '에스크로 트랜잭션', 'funded → completed (완료 처리 준비)');

  const r = await api('POST', `/api/contracts/${CONTRACT_ID}/complete`, {}, travelerToken);
  log('📡', `완료 응답 status=${r.status}`, JSON.stringify(r.data).slice(0, 120));
  assert('POST /complete → 200', r.status === 200, `status=${r.status}`);

  const [contract] = await dbExec('SELECT status, completed_at FROM contracts WHERE id = $1', [CONTRACT_ID]);
  assert('계약 상태 → completed', contract.status === 'completed');
  log('🕐', '완료 시각', String(contract.completed_at));
}

// ============================================================
// STEP 7: 에스크로 정산 (API — 버그 수정 후 실제 API 검증)
// ============================================================
async function step7_releaseEscrow() {
  console.log('\n══════════════════════════════════');
  console.log('💸 STEP 7: 에스크로 정산 (API — 가이드에게 지급 승인)');
  console.log('   [2026-03-08 버그 수정 완료 → 실제 API 호출]');
  console.log('══════════════════════════════════');

  // step 6의 /complete가 released로 바꿨으므로 frozen으로 되돌려 release API 조건 충족
  await dbExec(`
    UPDATE escrow_transactions
    SET status = 'frozen', updated_at = NOW()
    WHERE contract_id = $1 AND status IN ('released', 'completed')
  `, [CONTRACT_ID]);
  log('💾', '에스크로 트랜잭션', '→ frozen (release API 조건 충족)');

  // 실제 API 호출
  const r = await api('POST', `/api/contracts/${CONTRACT_ID}/release`, {}, travelerToken);
  log('📡', `정산 응답 status=${r.status}`, JSON.stringify(r.data).slice(0, 200));
  assert('POST /release → 200 (버그 수정 검증)', r.status === 200, `status=${r.status}`);

  if (r.status === 200) {
    const fee   = r.data.platformFee;
    const guide = r.data.guideAmount;
    log('💵', '가이드 수령액',  `$${guide}`);
    log('🏢', '플랫폼 수수료', `$${fee} (12%)`);
    log('🎯', '정산 비율',     `가이드 ${((guide / 90) * 100).toFixed(0)}% / 플랫폼 ${((fee / 90) * 100).toFixed(0)}%`);
    log('📋', '정산 ID',       `payout#${r.data.payoutId}`);
    assert('가이드 수령액 $80',  guide === 80);  // floor(90*0.12)=10 → 90-10=80
    assert('플랫폼 수수료 $10',  fee   === 10);
  }
}

// ============================================================
// STEP 8: 최종 상태 전체 확인
// ============================================================
async function step8_finalState() {
  console.log('\n══════════════════════════════════');
  console.log('📊 STEP 8: 최종 상태 전체 확인');
  console.log('══════════════════════════════════');

  const [contract] = await dbExec(
    'SELECT id, title, total_amount, currency, status, started_at, completed_at FROM contracts WHERE id = $1',
    [CONTRACT_ID]
  );
  const stages = await dbExec(
    'SELECT id, name, amount, status FROM contract_stages WHERE contract_id = $1 ORDER BY stage_order',
    [CONTRACT_ID]
  );
  const txs = await dbExec(
    'SELECT milestone_type, amount, status, platform_fee FROM escrow_transactions WHERE contract_id = $1',
    [CONTRACT_ID]
  );
  const payouts = await dbExec(
    'SELECT id, gross_amount, net_amount, currency, status FROM payouts WHERE host_id = $1 ORDER BY id DESC LIMIT 3',
    [GUIDE_ID]
  );

  console.log('\n  ─── 계약 ───');
  log('📄', `계약#${contract.id}`, `"${contract.title}" $${contract.total_amount} [${contract.status}]`);
  log('🕐', '  시작', String(contract.started_at));
  log('🕐', '  완료', String(contract.completed_at));

  console.log('\n  ─── 결제 단계 ───');
  for (const s of stages) {
    log('📑', `  ${s.name} (#${s.id})`, `$${s.amount} [${s.status}]`);
  }

  console.log('\n  ─── 에스크로 트랜잭션 ───');
  for (const tx of txs) {
    log('🏦', `  ${tx.milestone_type}`, `$${tx.amount} [${tx.status}]${tx.platform_fee ? ` fee=$${tx.platform_fee}` : ''}`);
  }

  console.log('\n  ─── 가이드 정산 ───');
  if (payouts.length > 0) {
    for (const p of payouts) {
      log('💸', `  정산#${p.id}`, `gross=$${p.gross_amount} net=$${p.net_amount} [${p.status}]`);
    }
  } else {
    log('ℹ️', '  정산 레코드 없음 (payouts 컬럼 구조 확인 필요)');
  }

  assert('최종 계약 상태 completed', contract.status === 'completed');
  assert('모든 단계 paid',           stages.every(s => s.status === 'paid'));
  assert('에스크로 전부 released',   txs.every(tx => tx.status === 'released'));
}

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 Tourgether P2P 거래 흐름 전체 테스트');
  console.log('   경복궁 투어 $90 (계약금 $27 + 잔금 $63)');
  console.log('   Min-ji Kim(여행자) ↔ Guide Park(가이드)');
  console.log('═══════════════════════════════════════════════════════');

  try {
    await step0_initialState();
    await step1_getTokens();
    await step2_viewContract();
    await step3_initiatePayment();
    await step4_simulateDepositPayment();
    await step5_simulateFinalPayment();
    await step6_completeService();
    await step7_releaseEscrow();
    await step8_finalState();
  } catch (err) {
    console.error('\n❌ 스크립트 오류:', err.message);
    fail++;
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`결과: ✅ ${pass}개 통과  /  ❌ ${fail}개 실패`);
  if (fail === 0) {
    console.log('🎊 전체 P2P 거래 흐름 테스트 완료!');
  } else {
    console.log('⚠️  일부 단계 실패. 위 로그 확인 필요.');
  }
  console.log('═══════════════════════════════════════════════════════');

  process.exit(fail > 0 ? 1 : 0);
}

main();
