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
    const jsonPath = path.join(process.cwd(), 'server', 'translationData.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.log('[Translation Sync] No translation data file found, skipping...');
      return;
    }
    
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const translationData: TranslationEntry[] = JSON.parse(rawData);
    
    console.log(`[Translation Sync] Found ${translationData.length} translations to sync`);
    
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
