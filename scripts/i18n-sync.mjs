// i18n 동기화 스크립트 — 누락된 번역 키를 OpenAI로 자동 번역 후 DB + seed 파일에 upsert한다.
// 실행: node scripts/i18n-sync.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CLIENT_SRC = path.join(ROOT, 'client', 'src');
const SEED_PATH = path.join(ROOT, 'db', 'seed-translations.json');
const LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
const KNOWN_NAMESPACES = ['ui', 'billing', 'common', 'seo', 'toast', 'validation', 'interests', 'notification'];

function scanFiles(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...scanFiles(full, ext));
    else if (ext.some(e => entry.name.endsWith(e))) results.push(full);
  }
  return results;
}

function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = [];
  let defaultNs = 'ui';

  const nsMatch = content.match(/useTranslation\(\s*['"]([a-z_]+)['"]\s*\)/);
  const nsArrayMatch = content.match(/useTranslation\(\s*\[([^\]]+)\]\s*\)/);
  if (nsMatch) defaultNs = nsMatch[1];
  else if (nsArrayMatch) {
    const first = nsArrayMatch[1].match(/['"]([a-z_]+)['"]/);
    if (first) defaultNs = first[1];
  }

  const tCallRegex = /\bt\(\s*['"]([\w.]+)['"]/g;
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    const rawKey = match[1];
    if (!rawKey.includes('.')) continue;
    const firstDot = rawKey.indexOf('.');
    const firstPart = rawKey.substring(0, firstDot);

    if (KNOWN_NAMESPACES.includes(firstPart)) {
      keys.push({ namespace: firstPart, key: rawKey.substring(firstDot + 1) });
    } else {
      keys.push({ namespace: defaultNs, key: rawKey });
    }
  }
  return keys;
}

function humanizeKey(key) {
  const lastPart = key.split('.').pop() || key;
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

async function translateBatch(apiKey, items) {
  const localeNames = { ko: 'Korean', ja: 'Japanese', zh: 'Chinese (Simplified)', fr: 'French', es: 'Spanish' };
  const nonEnItems = items.filter(i => i.locales.some(l => l !== 'en'));

  if (nonEnItems.length === 0) return {};

  const prompt = nonEnItems.map((k, i) => {
    const targetLocales = k.locales.filter(l => l !== 'en');
    return `${i + 1}. "${k.enValue}" → [${targetLocales.join(',')}]`;
  }).join('\n');

  const allLocales = [...new Set(nonEnItems.flatMap(k => k.locales.filter(l => l !== 'en')))];
  const localeDesc = allLocales.map(l => `${l}=${localeNames[l] || l}`).join(', ');

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

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  let parsed;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    console.error('⚠️ OpenAI 응답 파싱 실패, fallback 사용');
    parsed = [];
  }

  const result = {};
  for (const entry of parsed) {
    const idx = (entry.index || 0) - 1;
    if (idx >= 0 && idx < nonEnItems.length) {
      const key = `${nonEnItems[idx].namespace}::${nonEnItems[idx].key}`;
      result[key] = entry.translations || {};
    }
  }
  return result;
}

async function main() {
  console.log('🔄 i18n Sync — 누락 키 자동 번역 + DB/seed 동기화\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const sql = neon(dbUrl);

  const files = scanFiles(CLIENT_SRC, ['.tsx', '.ts']);
  console.log(`📂 스캔 파일: ${files.length}개`);

  const nsKeyMap = new Map();
  for (const file of files) {
    const keys = extractKeysFromFile(file);
    for (const { namespace, key } of keys) {
      if (!nsKeyMap.has(namespace)) nsKeyMap.set(namespace, new Set());
      nsKeyMap.get(namespace).add(key);
    }
  }

  let totalCodeKeys = 0;
  for (const keys of nsKeyMap.values()) totalCodeKeys += keys.size;
  console.log(`🔑 코드 t() 키: ${totalCodeKeys}개`);

  const dbRows = await sql`SELECT namespace, key, locale FROM translations`;
  const dbKeySet = new Map();
  for (const row of dbRows) {
    const compound = `${row.namespace}::${row.key}`;
    if (!dbKeySet.has(compound)) dbKeySet.set(compound, new Set());
    dbKeySet.get(compound).add(row.locale);
  }
  console.log(`📦 DB 키: ${dbKeySet.size}개 (unique ns::key)\n`);

  const enRows = await sql`SELECT namespace, key, value FROM translations WHERE locale = 'en'`;
  const enValues = new Map();
  for (const row of enRows) {
    enValues.set(`${row.namespace}::${row.key}`, row.value);
  }

  const missing = [];
  for (const [ns, keys] of nsKeyMap) {
    for (const key of keys) {
      const compound = `${ns}::${key}`;
      const existing = dbKeySet.get(compound);
      if (!existing) {
        missing.push({ namespace: ns, key, missingLocales: [...LOCALES] });
      } else {
        const ml = LOCALES.filter(l => !existing.has(l));
        if (ml.length > 0) {
          missing.push({ namespace: ns, key, missingLocales: ml });
        }
      }
    }
  }

  if (missing.length === 0) {
    console.log('✅ 누락 키 없음! 모든 키가 DB에 존재합니다.');
    return;
  }

  const totalMissing = missing.reduce((sum, m) => sum + m.missingLocales.length, 0);
  console.log(`❌ 누락: ${missing.length}개 키, ${totalMissing}개 번역 항목\n`);

  const apiKey = process.env.OPENAI_API_KEY;
  const BATCH = 15;
  let dbInserted = 0;
  let dbFailed = 0;
  const allTranslated = new Map();

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    console.log(`  ⏳ 배치 ${Math.floor(i / BATCH) + 1}/${Math.ceil(missing.length / BATCH)}: ${batch.length}개 키 처리 중...`);

    const translateItems = batch.map(m => ({
      namespace: m.namespace,
      key: m.key,
      locales: m.missingLocales,
      enValue: enValues.get(`${m.namespace}::${m.key}`) || humanizeKey(m.key),
    }));

    let translatedMap = {};

    if (apiKey) {
      try {
        translatedMap = await translateBatch(apiKey, translateItems);
      } catch (err) {
        console.error(`  ⚠️ 번역 실패 (fallback 사용):`, err.message);
      }
    } else {
      console.log('  ⚠️ OPENAI_API_KEY 없음, 영어 fallback 사용');
    }

    for (const item of translateItems) {
      const compound = `${item.namespace}::${item.key}`;
      const translated = translatedMap[compound] || {};

      for (const locale of item.locales) {
        let value;
        if (locale === 'en') {
          value = item.enValue;
        } else {
          value = translated[locale] || item.enValue;
        }

        allTranslated.set(`${compound}::${locale}`, value);

        try {
          await sql`
            INSERT INTO translations (namespace, key, locale, value, is_reviewed, version)
            VALUES (${item.namespace}, ${item.key}, ${locale}, ${value}, false, 1)
            ON CONFLICT (namespace, key, locale) DO NOTHING
          `;
          dbInserted++;
        } catch (err) {
          console.error(`  ❌ DB 삽입 실패: ${compound}::${locale}`, err.message);
          dbFailed++;
        }
      }
    }
  }

  console.log(`\n📊 DB 결과: ${dbInserted}개 삽입, ${dbFailed}개 실패`);

  let seedAdded = 0;
  if (fs.existsSync(SEED_PATH)) {
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
    const existingSet = new Set(seed.map(e => `${e.namespace}::${e.key}::${e.locale}`));

    for (const m of missing) {
      for (const locale of m.missingLocales) {
        const compound = `${m.namespace}::${m.key}::${locale}`;
        if (existingSet.has(compound)) continue;
        const value = allTranslated.get(compound) || humanizeKey(m.key);
        seed.push({ namespace: m.namespace, key: m.key, locale, value });
        existingSet.add(compound);
        seedAdded++;
      }
    }

    if (seedAdded > 0) {
      seed.sort((a, b) => {
        if (a.namespace !== b.namespace) return a.namespace.localeCompare(b.namespace);
        if (a.key !== b.key) return a.key.localeCompare(b.key);
        return a.locale.localeCompare(b.locale);
      });
      fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + '\n');
    }
  }

  console.log(`📄 seed 파일: ${seedAdded}개 추가`);
  console.log('\n✅ i18n 동기화 완료!');
}

main().catch(err => {
  console.error('💥 오류:', err);
  process.exit(1);
});
