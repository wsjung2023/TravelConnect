// i18n 감사 서비스 — 프론트엔드 코드의 t() 키를 스캔하여 DB translations 테이블과 비교, 누락 키를 반환한다.
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { translations } from '@shared/schema';
import { sql } from 'drizzle-orm';

const LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
const CLIENT_SRC = path.join(process.cwd(), 'client', 'src');

export interface MissingKey {
  namespace: string;
  key: string;
  missingLocales: string[];
}

export interface AuditResult {
  totalCodeKeys: number;
  totalDbKeys: number;
  missingKeys: MissingKey[];
  orphanedDbKeys: number;
}

function scanFilesRecursive(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFilesRecursive(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function extractKeysFromFile(filePath: string): { namespace: string; key: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys: { namespace: string; key: string }[] = [];

  let defaultNs = 'ui';
  const nsMatch = content.match(/useTranslation\(\s*['"]([a-z_]+)['"]\s*\)/);
  const nsArrayMatch = content.match(/useTranslation\(\s*\[([^\]]+)\]\s*\)/);
  if (nsMatch && nsMatch[1]) {
    defaultNs = nsMatch[1];
  } else if (nsArrayMatch && nsArrayMatch[1]) {
    const first = nsArrayMatch[1].match(/['"]([a-z_]+)['"]/);
    if (first && first[1]) defaultNs = first[1];
  }

  const knownNamespaces = ['ui', 'billing', 'common', 'seo', 'toast', 'validation', 'interests', 'notification'];
  const tCallRegex = /\bt\(\s*['"]([\w.]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = tCallRegex.exec(content)) !== null) {
    const rawKey = match[1] ?? '';
    if (!rawKey) continue;

    if (!rawKey.includes('.')) {
      keys.push({ namespace: defaultNs, key: rawKey });
      continue;
    }

    const firstDot = rawKey.indexOf('.');
    const firstPart = rawKey.substring(0, firstDot);

    if (knownNamespaces.includes(firstPart)) {
      keys.push({ namespace: firstPart, key: rawKey.substring(firstDot + 1) });
    } else {
      keys.push({ namespace: defaultNs, key: rawKey });
    }
  }

  return keys;
}

export function extractAllCodeKeys(): Map<string, Set<string>> {
  const nsKeyMap = new Map<string, Set<string>>();
  const files = scanFilesRecursive(CLIENT_SRC, ['.tsx', '.ts']);

  for (const file of files) {
    const keys = extractKeysFromFile(file);
    for (const { namespace, key } of keys) {
      if (!nsKeyMap.has(namespace)) nsKeyMap.set(namespace, new Set());
      nsKeyMap.get(namespace)!.add(key);
    }
  }

  return nsKeyMap;
}

export async function auditI18nKeys(): Promise<AuditResult> {
  const codeKeys = extractAllCodeKeys();

  let totalCodeKeys = 0;
  codeKeys.forEach((keys) => { totalCodeKeys += keys.size; });

  const dbRows = await db
    .select({
      namespace: translations.namespace,
      key: translations.key,
      locale: translations.locale,
    })
    .from(translations);

  const dbKeySet = new Map<string, Set<string>>();
  for (const row of dbRows) {
    const compound = `${row.namespace}::${row.key}`;
    if (!dbKeySet.has(compound)) dbKeySet.set(compound, new Set());
    dbKeySet.get(compound)!.add(row.locale);
  }

  const totalDbKeys = dbKeySet.size;
  const missingKeys: MissingKey[] = [];

  codeKeys.forEach((keys, ns) => {
    keys.forEach((key) => {
      const compound = `${ns}::${key}`;
      const existingLocales = dbKeySet.get(compound);

      if (!existingLocales) {
        missingKeys.push({ namespace: ns, key, missingLocales: LOCALES.slice() });
      } else {
        const missing = LOCALES.filter(l => !existingLocales.has(l));
        if (missing.length > 0) {
          missingKeys.push({ namespace: ns, key, missingLocales: missing });
        }
      }
    });
  });

  return { totalCodeKeys, totalDbKeys, missingKeys, orphanedDbKeys: 0 };
}

export async function syncMissingKeys(missing: MissingKey[]): Promise<{ inserted: number; failed: number }> {
  if (missing.length === 0) return { inserted: 0, failed: 0 };

  let inserted = 0;
  let failed = 0;

  const existingRows = await db
    .select({
      namespace: translations.namespace,
      key: translations.key,
      locale: translations.locale,
      value: translations.value,
    })
    .from(translations)
    .where(sql`locale = 'en'`);

  const enValues = new Map<string, string>();
  for (const row of existingRows) {
    enValues.set(`${row.namespace}::${row.key}`, row.value);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const batchSize = 20;

  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const toTranslate: { namespace: string; key: string; locales: string[] }[] = [];

    for (const mk of batch) {
      toTranslate.push({ namespace: mk.namespace, key: mk.key, locales: mk.missingLocales });
    }

    let translatedMap: Record<string, Record<string, string>> = {};

    if (apiKey) {
      try {
        translatedMap = await translateBatch(apiKey, toTranslate, enValues);
      } catch (err) {
        console.error('[i18n Sync] OpenAI translation failed, using fallbacks:', err);
        translatedMap = generateFallbacks(toTranslate);
      }
    } else {
      translatedMap = generateFallbacks(toTranslate);
    }

    const values: { namespace: string; key: string; locale: string; value: string; isReviewed: boolean; version: number }[] = [];

    for (const item of toTranslate) {
      const compound = `${item.namespace}::${item.key}`;
      const translated = translatedMap[compound] || {};

      for (const locale of item.locales) {
        const value = translated[locale] || enValues.get(compound) || humanizeKey(item.key);
        values.push({
          namespace: item.namespace,
          key: item.key,
          locale,
          value,
          isReviewed: false,
          version: 1,
        });
      }
    }

    if (values.length > 0) {
      try {
        const result = await db
          .insert(translations)
          .values(values)
          .onConflictDoNothing()
          .returning({ id: translations.id });
        inserted += result.length;
      } catch (err) {
        console.error('[i18n Sync] DB insert error:', err);
        failed += values.length;
      }
    }
  }

  return { inserted, failed };
}

async function translateBatch(
  apiKey: string,
  items: { namespace: string; key: string; locales: string[] }[],
  enValues: Map<string, string>
): Promise<Record<string, Record<string, string>>> {
  const keysToTranslate: { compound: string; enValue: string; locales: string[] }[] = [];

  for (const item of items) {
    const compound = `${item.namespace}::${item.key}`;
    const enValue = enValues.get(compound) || humanizeKey(item.key);
    const nonEnLocales = item.locales.filter(l => l !== 'en');
    if (nonEnLocales.length > 0) {
      keysToTranslate.push({ compound, enValue, locales: nonEnLocales });
    }
  }

  if (keysToTranslate.length === 0) {
    const result: Record<string, Record<string, string>> = {};
    for (const item of items) {
      const compound = `${item.namespace}::${item.key}`;
      if (item.locales.includes('en')) {
        result[compound] = { en: enValues.get(compound) || humanizeKey(item.key) };
      }
    }
    return result;
  }

  const prompt = keysToTranslate.map((k, i) => `${i + 1}. "${k.enValue}" → [${k.locales.join(',')}]`).join('\n');

  const localeNames: Record<string, string> = {
    ko: 'Korean', ja: 'Japanese', zh: 'Chinese (Simplified)', fr: 'French', es: 'Spanish',
  };

  const allLocales = Array.from(new Set(keysToTranslate.flatMap(k => k.locales)));
  const localeDesc = allLocales
    .map(l => `${l}=${localeNames[l] || l}`)
    .join(', ');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a translation assistant for a travel SNS app called Tourgether. Translate UI text accurately and naturally. Locale codes: ${localeDesc}. Return ONLY valid JSON array. Each element: {"index": <1-based>, "translations": {"locale": "translated text"}}. Keep {{variables}} unchanged. Be concise for UI labels.`,
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  interface OpenAIResponse {
    choices?: Array<{ message?: { content?: string } }>;
  }
  const data: OpenAIResponse = await response.json() as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content || '[]';

  interface TranslationEntry {
    index: number;
    translations: Record<string, string>;
  }
  let parsed: TranslationEntry[];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    parsed = [];
  }

  const result: Record<string, Record<string, string>> = {};

  for (const item of items) {
    const compound = `${item.namespace}::${item.key}`;
    result[compound] = {};
    if (item.locales.includes('en')) {
      result[compound].en = enValues.get(compound) || humanizeKey(item.key);
    }
  }

  for (const entry of parsed) {
    const idx = (entry.index || 0) - 1;
    const translateItem = idx >= 0 && idx < keysToTranslate.length ? keysToTranslate[idx] : undefined;
    if (translateItem) {
      const compound = translateItem.compound;
      if (!result[compound]) result[compound] = {};
      for (const [locale, text] of Object.entries(entry.translations || {})) {
        result[compound][locale] = String(text);
      }
    }
  }

  return result;
}

function generateFallbacks(
  items: { namespace: string; key: string; locales: string[] }[]
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const item of items) {
    const compound = `${item.namespace}::${item.key}`;
    result[compound] = {};
    const enValue = humanizeKey(item.key);
    for (const locale of item.locales) {
      result[compound][locale] = enValue;
    }
  }
  return result;
}

function humanizeKey(key: string): string {
  const lastPart = key.split('.').pop() || key;
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

export async function updateSeedFile(missing: MissingKey[], translatedValues: Map<string, string>): Promise<number> {
  const seedPath = path.join(process.cwd(), 'db', 'seed-translations.json');
  if (!fs.existsSync(seedPath)) return 0;

  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as Array<{
    namespace: string; key: string; locale: string; value: string;
  }>;

  const existingSet = new Set(seed.map(e => `${e.namespace}::${e.key}::${e.locale}`));
  let added = 0;

  for (const mk of missing) {
    for (const locale of mk.missingLocales) {
      const compound = `${mk.namespace}::${mk.key}::${locale}`;
      if (existingSet.has(compound)) continue;

      const value = translatedValues.get(`${mk.namespace}::${mk.key}::${locale}`) || humanizeKey(mk.key);
      seed.push({ namespace: mk.namespace, key: mk.key, locale, value });
      existingSet.add(compound);
      added++;
    }
  }

  if (added > 0) {
    seed.sort((a, b) => {
      if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
      if (a.key !== b.key) return a.key.localeCompare(b.key);
      return a.locale.localeCompare(b.locale);
    });
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
  }

  return added;
}
