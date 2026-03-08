// 시스템 설정 시드 — system_config 테이블에 초기 설정값을 삽입하는 함수. 데이터는 systemConfigData.ts에 분리 보관.
import { storage } from '../storage';
import { SYSTEM_CONFIG_SEEDS } from './data/systemConfigData';

export { getSystemConfigSeeds, getConfigCategories, getConfigsByCategory } from './data/systemConfigData';

export async function seedSystemConfig(): Promise<{ created: number; skipped: number; updated: number }> {
  let created = 0;
  let skipped = 0;
  const updated = 0;

  const allConfigs = await storage.getAllSystemConfigs();
  const existingCount = allConfigs.length;

  if (existingCount >= SYSTEM_CONFIG_SEEDS.length) {
    console.log(`[SystemConfig Seed] DB already has ${existingCount} configs (seed: ${SYSTEM_CONFIG_SEEDS.length}), skipping.`);
    return { created: 0, skipped: existingCount, updated: 0 };
  }

  const existingKeys = new Set(allConfigs.map((c: any) => `${c.category}::${c.key}`));

  for (const config of SYSTEM_CONFIG_SEEDS) {
    if (existingKeys.has(`${config.category}::${config.key}`)) {
      skipped++;
      continue;
    }

    await storage.createSystemConfig(config);
    console.log(`[SystemConfig Seed] Created: ${config.category}.${config.key}`);
    created++;
  }

  console.log(`[SystemConfig Seed] Complete: ${created} created, ${updated} updated, ${skipped} skipped`);
  return { created, skipped, updated };
}
