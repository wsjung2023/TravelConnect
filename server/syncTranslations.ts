import { db } from './db';
import { translations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
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
  console.log('[Translation Sync] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Translation Sync] CWD:', process.cwd());
  
  try {
    // 시드 파일 경로 (운영 배포 시 자동 마이그레이션용)
    const seedPath = path.join(process.cwd(), 'db', 'seed-translations.json');
    // 기존 경로 (하위 호환성)
    const legacyPath = path.join(process.cwd(), 'server', 'translationData.json');
    
    console.log('[Translation Sync] Checking seed path:', seedPath, '- exists:', fs.existsSync(seedPath));
    console.log('[Translation Sync] Checking legacy path:', legacyPath, '- exists:', fs.existsSync(legacyPath));
    
    let jsonPath = '';
    if (fs.existsSync(seedPath)) {
      jsonPath = seedPath;
    } else if (fs.existsSync(legacyPath)) {
      jsonPath = legacyPath;
    } else {
      console.log('[Translation Sync] No translation seed file found, skipping...');
      console.log('[Translation Sync] Directory contents of db/:', fs.existsSync(path.join(process.cwd(), 'db')) ? fs.readdirSync(path.join(process.cwd(), 'db')) : 'db folder not found');
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
          // 먼저 존재 여부 확인
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
