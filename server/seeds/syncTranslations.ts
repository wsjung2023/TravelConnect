// 번역 시드 동기화 — seed JSON 파일의 SHA256 해시를 비교하여 변경 시에만 upsert한다.
import { db } from '../db';
import { translations, systemConfig } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
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

const HASH_CONFIG_CATEGORY = 'i18n';
const HASH_CONFIG_KEY = 'seed_hash';

function findSeedPath(): string | null {
  for (const seedPath of SEED_PATHS) {
    if (fs.existsSync(seedPath)) return seedPath;
  }
  return null;
}

function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function getStoredHash(): Promise<string | null> {
  try {
    const rows = await db
      .select({ valueString: systemConfig.valueString })
      .from(systemConfig)
      .where(and(eq(systemConfig.category, HASH_CONFIG_CATEGORY), eq(systemConfig.key, HASH_CONFIG_KEY)))
      .limit(1);
    return rows.length > 0 ? rows[0].valueString : null;
  } catch {
    return null;
  }
}

async function saveHash(hash: string): Promise<void> {
  try {
    const existing = await db
      .select({ id: systemConfig.id })
      .from(systemConfig)
      .where(and(eq(systemConfig.category, HASH_CONFIG_CATEGORY), eq(systemConfig.key, HASH_CONFIG_KEY)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(systemConfig)
        .set({ valueString: hash })
        .where(eq(systemConfig.id, existing[0].id));
    } else {
      await db.insert(systemConfig).values({
        category: HASH_CONFIG_CATEGORY,
        subcategory: 'sync',
        key: HASH_CONFIG_KEY,
        valueType: 'string',
        valueString: hash,
        displayName: 'Seed Translations SHA256 Hash',
        displayNameKo: '시드 번역 파일 SHA256 해시',
        description: 'Auto-managed hash to skip redundant translation sync on startup',
        descriptionKo: '서버 재시작 시 불필요한 번역 동기화를 건너뛰기 위한 자동 관리 해시',
        isActive: true,
        isEditable: false,
        sortOrder: 100,
      });
    }
  } catch (err) {
    console.error('[Translation Sync] Failed to save hash:', err);
  }
}

export async function syncTranslations(): Promise<void> {
  try {
    const seedPath = findSeedPath();
    if (!seedPath) {
      console.log('[Translation Sync] No seed file found, skipping.');
      return;
    }

    const currentHash = computeFileHash(seedPath);
    const storedHash = await getStoredHash();

    if (currentHash === storedHash) {
      console.log('[Translation Sync] Seed file unchanged (hash match), skipping.');
      return;
    }

    console.log(`[Translation Sync] Seed file changed, syncing...`);
    const raw = fs.readFileSync(seedPath, 'utf-8');
    const entries: TranslationEntry[] = JSON.parse(raw);
    console.log(`[Translation Sync] ${entries.length} entries to process.`);

    let inserted = 0;
    let skipped = 0;
    let hadBatchError = false;

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
        hadBatchError = true;
        console.error(`[Translation Sync] Batch error at offset ${i}:`, err);
        skipped += batch.length;
      }
    }

    if (hadBatchError) {
      console.warn(`[Translation Sync] Completed with errors: ${inserted} inserted, ${skipped} skipped. Hash NOT saved — will retry on next restart.`);
    } else {
      await saveHash(currentHash);
      console.log(`[Translation Sync] Completed: ${inserted} inserted, ${skipped} already exist.`);
    }
  } catch (error) {
    console.error('[Translation Sync] Fatal error:', error);
  }
}
