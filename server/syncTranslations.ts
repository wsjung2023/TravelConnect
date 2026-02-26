import { db } from './db';
import { translations } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
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
    const seedPath = path.join(process.cwd(), 'db', 'seed-translations.json');
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
    
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(translations);
    const existingCount = Number(countResult.count);
    
    console.log(`[Translation Sync] DB has ${existingCount} rows, seed file has ${translationData.length} entries`);
    
    if (existingCount >= translationData.length) {
      console.log('[Translation Sync] DB already has enough translations, skipping sync.');
      return;
    }
    
    if (existingCount > 0 && existingCount >= translationData.length * 0.9) {
      console.log('[Translation Sync] DB has 90%+ of seed data, skipping sync.');
      return;
    }
    
    console.log(`[Translation Sync] Syncing missing translations...`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    const batchSize = 100;
    for (let i = 0; i < translationData.length; i += batchSize) {
      const batch = translationData.slice(i, i + batchSize);
      
      for (const t of batch) {
        try {
          const existing = await db.select({ id: translations.id })
            .from(translations)
            .where(and(
              eq(translations.namespace, t.namespace),
              eq(translations.key, t.key),
              eq(translations.locale, t.locale)
            ))
            .limit(1);
          
          if (existing.length === 0) {
            await db.insert(translations).values({
              namespace: t.namespace,
              key: t.key,
              locale: t.locale,
              value: t.value,
              isReviewed: false,
              version: 1
            });
            insertedCount++;
          } else {
            skippedCount++;
          }
        } catch (err) {
          skippedCount++;
        }
      }
    }
    
    console.log(`[Translation Sync] Completed: ${insertedCount} inserted, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[Translation Sync] Error:', error);
  }
}
