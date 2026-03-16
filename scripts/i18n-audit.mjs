// i18n 감사 스크립트 — 프론트엔드 코드의 t() 키를 스캔해 DB translations 테이블 및 seed-translations.json과 비교하여 누락 키를 출력한다.
// 실행: node scripts/i18n-audit.mjs [--seed-only]
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
    if (!rawKey.includes('.')) {
      keys.push({ namespace: defaultNs, key: rawKey });
      continue;
    }

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

function loadSeed() {
  if (!fs.existsSync(SEED_PATH)) return new Map();
  const data = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  const map = new Map();
  for (const entry of data) {
    const compound = `${entry.namespace}::${entry.key}`;
    if (!map.has(compound)) map.set(compound, new Set());
    map.get(compound).add(entry.locale);
  }
  return map;
}

async function loadDbTranslations() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT namespace, key, locale FROM translations`;
    const map = new Map();
    for (const row of rows) {
      const compound = `${row.namespace}::${row.key}`;
      if (!map.has(compound)) map.set(compound, new Set());
      map.get(compound).add(row.locale);
    }
    return map;
  } catch (err) {
    console.error('⚠️ DB 접속 실패, seed 파일만 비교합니다:', err.message);
    return null;
  }
}

function auditAgainst(nsKeyMap, sourceMap, sourceName) {
  const missing = [];
  const fullyMissing = [];
  const partiallyMissing = [];

  for (const [ns, keys] of nsKeyMap) {
    for (const key of keys) {
      const compound = `${ns}::${key}`;
      const existingLocales = sourceMap.get(compound);

      if (!existingLocales) {
        fullyMissing.push({ namespace: ns, key, missingLocales: [...LOCALES] });
        missing.push({ namespace: ns, key, missingLocales: [...LOCALES] });
      } else {
        const ml = LOCALES.filter(l => !existingLocales.has(l));
        if (ml.length > 0) {
          partiallyMissing.push({ namespace: ns, key, missingLocales: ml });
          missing.push({ namespace: ns, key, missingLocales: ml });
        }
      }
    }
  }

  return { missing, fullyMissing, partiallyMissing, sourceName, sourceSize: sourceMap.size };
}

function printResult(result) {
  console.log(`\n📊 비교 대상: ${result.sourceName} (${result.sourceSize}개 unique ns::key)`);

  if (result.missing.length === 0) {
    console.log(`✅ 모든 키가 ${result.sourceName}에 존재합니다. 누락 없음!`);
    return;
  }

  console.log(`❌ 누락 키 총 ${result.missing.length}개:`);

  if (result.fullyMissing.length > 0) {
    console.log(`  🔴 완전 누락 (모든 언어 없음): ${result.fullyMissing.length}개`);
    for (const m of result.fullyMissing) {
      console.log(`     ${m.namespace}::${m.key}`);
    }
  }

  if (result.partiallyMissing.length > 0) {
    console.log(`  🟡 부분 누락 (일부 언어 없음): ${result.partiallyMissing.length}개`);
    for (const m of result.partiallyMissing) {
      console.log(`     ${m.namespace}::${m.key} → [${m.missingLocales.join(', ')}]`);
    }
  }
}

async function main() {
  const seedOnly = process.argv.includes('--seed-only');
  console.log('🔍 i18n Audit — 프론트엔드 t() 키 비교\n');

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

  let dbAuditResult = null;
  if (!seedOnly) {
    const dbMap = await loadDbTranslations();
    if (dbMap) {
      dbAuditResult = auditAgainst(nsKeyMap, dbMap, 'DB translations');
      printResult(dbAuditResult);
    }
  }

  const seedMap = loadSeed();
  let seedAuditResult = null;
  if (seedMap.size > 0) {
    seedAuditResult = auditAgainst(nsKeyMap, seedMap, 'seed-translations.json');
    printResult(seedAuditResult);
  }

  console.log('\n💡 수정 방법: node scripts/i18n-sync.mjs 실행');

  const outputPath = path.join(ROOT, '.local', 'i18n-audit-result.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    totalCodeKeys,
    timestamp: new Date().toISOString(),
    db: dbAuditResult ? { missingKeys: dbAuditResult.missing, sourceSize: dbAuditResult.sourceSize } : null,
    seed: seedAuditResult ? { missingKeys: seedAuditResult.missing, sourceSize: seedAuditResult.sourceSize } : null,
  }, null, 2));
  console.log(`📄 결과 저장: ${outputPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
