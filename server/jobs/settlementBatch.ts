/**
 * 호스트 정산 배치 작업 - Tourgether P2P 공유경제 플랫폼
 * 
 * 실행 시간: 매일 02:00 KST (17:00 UTC 전일)
 * 
 * 기능:
 * - 릴리스된 에스크로 트랜잭션 수집
 * - 호스트별 정산 처리
 * - KYC 검증 및 최소 금액 필터링
 * - PortOne Transfer API를 통한 계좌 이체
 * 
 * 참고: docs/pricing_dev_update.md 섹션 2.9.3
 */

import { settlementService, type SettlementSummary } from '../services/settlementService';

const SETTLEMENT_ENABLED = process.env.SETTLEMENT_ENABLED === 'true';
const KST_OFFSET = 9 * 60 * 60 * 1000; // UTC+9

interface SchedulerState {
  isRunning: boolean;
  lastRunAt: Date | null;
  lastResult: SettlementSummary | null;
  nextRunAt: Date | null;
  intervalId: NodeJS.Timeout | null;
}

const state: SchedulerState = {
  isRunning: false,
  lastRunAt: null,
  lastResult: null,
  nextRunAt: null,
  intervalId: null,
};

/**
 * 다음 02:00 KST 시간 계산
 */
function getNext0200KST(): Date {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET);
  
  const targetKST = new Date(kstNow);
  targetKST.setHours(2, 0, 0, 0);
  
  if (kstNow >= targetKST) {
    targetKST.setDate(targetKST.getDate() + 1);
  }
  
  return new Date(targetKST.getTime() - KST_OFFSET);
}

/**
 * 현재 시간이 02:00 KST 근처인지 확인 (±5분)
 */
function isAround0200KST(): boolean {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET);
  const hour = kstNow.getHours();
  const minute = kstNow.getMinutes();
  
  return hour === 2 && minute < 5;
}

/**
 * 정산 배치 실행
 */
async function runSettlementBatch(): Promise<SettlementSummary> {
  if (state.isRunning) {
    console.log('[SettlementBatch] Already running, skipping...');
    return {
      success: false,
      processedCount: 0,
      totalAmount: 0,
      skippedKycCount: 0,
      belowMinCount: 0,
      failedCount: 0,
      payoutIds: [],
      errors: ['Already running'],
    };
  }

  state.isRunning = true;
  state.lastRunAt = new Date();

  console.log('[SettlementBatch] ===========================================');
  console.log(`[SettlementBatch] Starting at ${state.lastRunAt.toISOString()}`);
  console.log('[SettlementBatch] ===========================================');

  try {
    const result = await settlementService.runDailySettlement();
    state.lastResult = result;

    console.log('[SettlementBatch] ===========================================');
    console.log('[SettlementBatch] Settlement completed');
    console.log(`[SettlementBatch] Processed: ${result.processedCount} hosts`);
    console.log(`[SettlementBatch] Total Amount: ${result.totalAmount.toLocaleString()} KRW`);
    console.log(`[SettlementBatch] Skipped (KYC): ${result.skippedKycCount}`);
    console.log(`[SettlementBatch] Skipped (Min): ${result.belowMinCount}`);
    console.log(`[SettlementBatch] Failed: ${result.failedCount}`);
    if (result.errors.length > 0) {
      console.log('[SettlementBatch] Errors:', result.errors);
    }
    console.log('[SettlementBatch] ===========================================');

    return result;
  } catch (error) {
    console.error('[SettlementBatch] Unexpected error:', error);
    const errorResult: SettlementSummary = {
      success: false,
      processedCount: 0,
      totalAmount: 0,
      skippedKycCount: 0,
      belowMinCount: 0,
      failedCount: 0,
      payoutIds: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
    state.lastResult = errorResult;
    return errorResult;
  } finally {
    state.isRunning = false;
    state.nextRunAt = getNext0200KST();
    console.log(`[SettlementBatch] Next run scheduled at ${state.nextRunAt.toISOString()}`);
  }
}

/**
 * 스케줄러 시작
 */
export function startSettlementScheduler(): void {
  if (!SETTLEMENT_ENABLED) {
    console.log('[SettlementBatch] Settlement disabled (SETTLEMENT_ENABLED=false)');
    return;
  }

  if (state.intervalId) {
    console.log('[SettlementBatch] Scheduler already running');
    return;
  }

  console.log('[SettlementBatch] Starting scheduler...');
  state.nextRunAt = getNext0200KST();
  console.log(`[SettlementBatch] Next run scheduled at ${state.nextRunAt.toISOString()}`);

  state.intervalId = setInterval(() => {
    if (isAround0200KST() && !state.isRunning) {
      const now = new Date();
      if (!state.lastRunAt || now.getTime() - state.lastRunAt.getTime() > 60 * 60 * 1000) {
        runSettlementBatch().catch(console.error);
      }
    }
  }, 60 * 1000);

  console.log('[SettlementBatch] Scheduler started (checking every minute)');
}

/**
 * 스케줄러 중지
 */
export function stopSettlementScheduler(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
    console.log('[SettlementBatch] Scheduler stopped');
  }
}

/**
 * 수동 실행 (관리자용)
 */
export async function runManualSettlement(): Promise<SettlementSummary> {
  console.log('[SettlementBatch] Manual settlement triggered');
  return await runSettlementBatch();
}

/**
 * 스케줄러 상태 조회
 */
export function getSchedulerStatus(): {
  enabled: boolean;
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: SettlementSummary | null;
} {
  return {
    enabled: SETTLEMENT_ENABLED,
    isRunning: state.isRunning,
    lastRunAt: state.lastRunAt?.toISOString() || null,
    nextRunAt: state.nextRunAt?.toISOString() || null,
    lastResult: state.lastResult,
  };
}

export { runSettlementBatch };
