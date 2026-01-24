import { db } from './db';
import { translations } from '@shared/schema';
import fs from 'fs';
import path from 'path';

interface TranslationEntry {
  namespace: string;
  key: string;
  locale: string;
  value: string;
}

export async function syncTranslations(): Promise<void> {
  console.log('[Translation Sync] Starting translation sync...');
  
  try {
    // 시드 파일 경로 (운영 배포 시 자동 마이그레이션용)
    const seedPath = path.join(process.cwd(), 'db', 'seed-translations.json');
    // 기존 경로 (하위 호환성)
    const legacyPath = path.join(process.cwd(), 'server', 'translationData.json');
    
    let jsonPath = '';
    if (fs.existsSync(seedPath)) {
      jsonPath = seedPath;
    } else if (fs.existsSync(legacyPath)) {
      jsonPath = legacyPath;
    } else {
      console.log('[Translation Sync] No translation seed file found, skipping...');
      return;
    }
    
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const translationData: TranslationEntry[] = JSON.parse(rawData);
    
    console.log(`[Translation Sync] Found ${translationData.length} translations to sync from ${path.basename(jsonPath)}`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    // 배치로 처리 (100개씩)
    const batchSize = 100;
    for (let i = 0; i < translationData.length; i += batchSize) {
      const batch = translationData.slice(i, i + batchSize);
      
      for (const t of batch) {
        try {
          await db.insert(translations).values({
            namespace: t.namespace,
            key: t.key,
            locale: t.locale,
            value: t.value,
            isReviewed: false,
            version: 1
          }).onConflictDoNothing();
          insertedCount++;
        } catch (err) {
          skippedCount++;
        }
      }
    }
    
    console.log(`[Translation Sync] Completed: ${insertedCount} processed, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[Translation Sync] Error:', error);
  }
}
