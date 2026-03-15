// @ts-nocheck
// 배치 스케줄러 — 만료 예약, 완료 체험, 슬롯 재계산, 정산 배치 4개 스케줄러의 정의·시작·정지를 담당한다.
import { getBooleanConfig, getNumberConfig } from './services/configService';
import type { storage as StorageType } from './storage';

export interface SchedulerHandle {
  name: string;
  intervalId: NodeJS.Timeout | null;
  isProcessing: boolean;
  enabled: boolean;
  intervalMinutes: number;
}

export const schedulerHandles: Record<string, SchedulerHandle> = {
  expired_bookings: { name: 'Expired Bookings', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 5 },
  completed_experiences: { name: 'Completed Experiences', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 60 },
  slot_recalculation: { name: 'Slot Recalculation', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 1440 },
  settlement_batch: { name: 'Settlement Batch', intervalId: null, isProcessing: false, enabled: false, intervalMinutes: 1 },
};

export function stopScheduler(key: string): void {
  const handle = schedulerHandles[key];
  if (handle?.intervalId) {
    clearInterval(handle.intervalId);
    handle.intervalId = null;
    handle.enabled = false;
    console.log(`⏹️ Scheduler stopped: ${handle.name}`);
  }
}

export function stopAllSchedulers(): void {
  for (const key of Object.keys(schedulerHandles)) {
    stopScheduler(key);
  }
}

export function getSchedulerHandles() {
  return Object.entries(schedulerHandles).map(([key, h]) => ({
    key,
    name: h.name,
    enabled: h.enabled,
    intervalMinutes: h.intervalMinutes,
    isProcessing: h.isProcessing,
  }));
}

export async function startBookingScheduler(storageInstance: typeof StorageType): Promise<void> {
  console.log('🔄 Checking scheduler configurations from DB...');

  const expiredEnabled = await getBooleanConfig('scheduler', 'expired_bookings_enabled', false);
  const expiredInterval = await getNumberConfig('scheduler', 'expired_bookings_interval_minutes', 5);
  const completedEnabled = await getBooleanConfig('scheduler', 'completed_experiences_enabled', false);
  const completedInterval = await getNumberConfig('scheduler', 'completed_experiences_interval_minutes', 60);
  const slotEnabled = await getBooleanConfig('scheduler', 'slot_recalculation_enabled', false);
  const slotHour = await getNumberConfig('scheduler', 'slot_recalculation_hour', 3);
  const settlementEnabled = await getBooleanConfig('scheduler', 'settlement_batch_enabled', false);

  if (expiredEnabled) {
    const handle = schedulerHandles.expired_bookings;
    handle.enabled = true;
    handle.intervalMinutes = expiredInterval;
    handle.intervalId = setInterval(async () => {
      if (handle.isProcessing) return;
      handle.isProcessing = true;
      try {
        const count = await storageInstance.processExpiredBookings();
        if (count > 0) console.log(`✅ Processed ${count} expired bookings`);
      } catch (error) {
        console.error('❌ Error processing expired bookings:', error);
      } finally {
        handle.isProcessing = false;
      }
    }, expiredInterval * 60 * 1000);
    console.log(`▶️ Expired Bookings scheduler: ON (every ${expiredInterval}min)`);
  } else {
    console.log('⏸️ Expired Bookings scheduler: OFF');
  }

  if (completedEnabled) {
    const handle = schedulerHandles.completed_experiences;
    handle.enabled = true;
    handle.intervalMinutes = completedInterval;
    handle.intervalId = setInterval(async () => {
      if (handle.isProcessing) return;
      handle.isProcessing = true;
      try {
        const count = await storageInstance.processCompletedExperiences();
        if (count > 0) console.log(`✅ Processed ${count} completed experiences`);
      } catch (error) {
        console.error('❌ Error processing completed experiences:', error);
      } finally {
        handle.isProcessing = false;
      }
    }, completedInterval * 60 * 1000);
    console.log(`▶️ Completed Experiences scheduler: ON (every ${completedInterval}min)`);
  } else {
    console.log('⏸️ Completed Experiences scheduler: OFF');
  }

  if (slotEnabled) {
    const handle = schedulerHandles.slot_recalculation;
    handle.enabled = true;
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(slotHour, 0, 0, 0);
    if (now >= nextRun) nextRun.setDate(nextRun.getDate() + 1);
    const delay = nextRun.getTime() - now.getTime();
    console.log(`▶️ Slot Recalculation scheduler: ON (daily at ${slotHour}:00, next: ${nextRun.toISOString()})`);
    setTimeout(async () => {
      const run = async () => {
        if (handle.isProcessing) return;
        handle.isProcessing = true;
        try {
          await storageInstance.recalculateSlotAvailability();
          console.log('✅ Daily slot availability recalculated');
        } catch (error) {
          console.error('❌ Error in slot recalculation:', error);
        } finally {
          handle.isProcessing = false;
        }
      };
      await run();
      handle.intervalId = setInterval(run, 24 * 60 * 60 * 1000);
    }, delay);
  } else {
    console.log('⏸️ Slot Recalculation scheduler: OFF');
  }

  if (settlementEnabled) {
    const handle = schedulerHandles.settlement_batch;
    handle.enabled = true;
    try {
      const { startSettlementScheduler } = await import('./jobs/settlementBatch');
      startSettlementScheduler();
      console.log('▶️ Settlement Batch scheduler: ON');
    } catch (error) {
      console.error('❌ Settlement scheduler failed to start:', error);
    }
  } else {
    console.log('⏸️ Settlement Batch scheduler: OFF');
  }

  console.log('✅ Scheduler initialization complete');
}
