// 시드 실행 진입점 — 개발/운영 환경에서 초기 데이터(시스템 설정, 번역 등)를 DB에 삽입하기 위한 시드 스크립트를 순서대로 실행한다.
import { seedSystemConfig } from './systemConfigSeed';

async function runAllSeeds() {
  console.log('='.repeat(60));
  console.log('[Seed Runner] Starting database seeding...');
  console.log('='.repeat(60));

  try {
    console.log('\n[1/1] Running System Config Seeds...');
    const result = await seedSystemConfig();
    console.log(`✓ System Config: ${result.created} created, ${result.skipped} skipped`);

    console.log('\n' + '='.repeat(60));
    console.log('[Seed Runner] All seeds completed successfully!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n[Seed Runner] Error during seeding:', error);
    process.exit(1);
  }
}

runAllSeeds();
