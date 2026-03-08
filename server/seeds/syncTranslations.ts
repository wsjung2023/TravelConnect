// 번역 시드 동기화 — seed JSON 파일의 항목을 translations 테이블에 누락된 것만 삽입한다 (INSERT ON CONFLICT DO NOTHING).
import { db } from '../db';
import { translations } from '@shared/schema';
import fs from 'fs';
import path from 'path';

interface TranslationEntry {
  namespace: string;
  key: string;
  locale: string;
  value: string;
}

const BATCH_SIZE = 100;
const SEED_PATHS = [
  path.join(process.cwd(), 'db', 'seed-translations.json'),
  path.join(process.cwd(), 'server', 'translationData.json'),
];

function loadSeedFile(): TranslationEntry[] | null {
  for (const seedPath of SEED_PATHS) {
    if (fs.existsSync(seedPath)) {
      console.log(`[Translation Sync] Loading seed file: ${seedPath}`);
      const raw = fs.readFileSync(seedPath, 'utf-8');
      return JSON.parse(raw) as TranslationEntry[];
    }
  }
  return null;
}

export async function syncTranslations(): Promise<void> {
  console.log('[Translation Sync] Starting...');

  try {
    const entries = loadSeedFile();
    if (!entries) {
      console.log('[Translation Sync] No seed file found, skipping.');
      return;
    }

    console.log(`[Translation Sync] Seed file has ${entries.length} entries. Upserting missing keys...`);

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const values = batch.map(t => ({
        namespace: t.namespace,
        key: t.key,
        locale: t.locale,
        value: t.value,
        isReviewed: false,
        version: 1,
      }));

      try {
        const result = await db
          .insert(translations)
          .values(values)
          .onConflictDoNothing()
          .returning({ id: translations.id });

        inserted += result.length;
        skipped += batch.length - result.length;
      } catch (err) {
        console.error(`[Translation Sync] Batch error at offset ${i}:`, err);
        skipped += batch.length;
      }
    }

    console.log(`[Translation Sync] Completed: ${inserted} inserted, ${skipped} already exist.`);
  } catch (error) {
    console.error('[Translation Sync] Fatal error:', error);
  }
}
