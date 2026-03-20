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
const UI_LOCALE_PATHS = {
  en: path.join(ROOT, 'client', 'public', 'locales', 'en', 'ui.json'),
  ko: path.join(ROOT, 'client', 'public', 'locales', 'ko', 'ui.json'),
};
const LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];
const KNOWN_NAMESPACES = ['ui', 'billing', 'common', 'seo', 'toast', 'validation', 'interests', 'notification'];
const DYNAMIC_KEY_PREFIX_ALLOWLIST = [
  'ui::contract.scope.',
  'ui::contract.milestone.',
  'ui::sreq.serviceType.',
];

const HARDCODED_STRING_SKIP_PATTERNS = [
  /className\s*=|data-testid|aria-|queryKey|mutationKey|background|linear-gradient|radial-gradient|rgba\(|var\(--|http|\/api\//,
  /import\s|from\s+['"]/ ,
  /^(?:[A-Za-z0-9_./:#%-]+)$/ ,
  /^(?:M\d|\d+%|\d+px|[A-Fa-f0-9]{6,}|@type|@graph)$/ ,
];

function shouldSkipHardcodedLine(line, value) {
  if (!value || value.length < 4) return true;
  if (line.includes('t(')) return true;
  if (HARDCODED_STRING_SKIP_PATTERNS.some((pattern) => pattern.test(line) || pattern.test(value))) return true;
  return false;
}

function extractHardcodedCandidates(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const candidates = [];
  const lines = content.split(/\r?\n/);
  const patterns = [
    />\s*([^<>{}\n]{4,})\s*</g,
    /(?:title|description|placeholder|label|text|alt)\s*=\s*['"]([^'"\n]{4,})['"]/g,
    /toast\(\{[^\n]*(?:title|description):\s*['"]([^'"\n]{4,})['"]/g,
    /throw new Error\(\s*['"]([^'"\n]{4,})['"]/g,
  ];

  lines.forEach((line, index) => {
    for (const regex of patterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const value = (match[1] || '').trim();
        if (shouldSkipHardcodedLine(line, value)) continue;
        candidates.push({ filePath, line: index + 1, value });
      }
    }
  });

  return candidates;
}

function printHardcodedCandidates(candidates) {
  console.log(`\n🧱 하드코딩 문자열 후보: ${candidates.length}개`);
  if (candidates.length === 0) {
    console.log('   없음');
    return;
  }
  console.log('   주의: 사용자 노출 문자열 후보만 휴리스틱으로 잡은 목록입니다. 일부는 예외/SEO 문구일 수 있습니다.');
  for (const candidate of candidates.slice(0, 120)) {
    const rel = path.relative(ROOT, candidate.filePath);
    console.log(`   ${rel}:${candidate.line} → ${candidate.value}`);
  }
  if (candidates.length > 120) {
    console.log(`   ... ${candidates.length - 120}개 더`);
  }
}

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

function flattenLocaleObject(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const compoundKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenLocaleObject(value, compoundKey, out);
    } else {
      out.set(compoundKey, value);
    }
  }
  return out;
}

function collectCodeCompounds(nsKeyMap) {
  const compounds = new Set();
  for (const [namespace, keys] of nsKeyMap) {
    for (const key of keys) compounds.add(`${namespace}::${key}`);
  }
  return compounds;
}

function findUnusedCandidates(sourceMap, nsKeyMap) {
  const codeCompounds = collectCodeCompounds(nsKeyMap);
  const unusedCandidates = [];

  for (const compound of sourceMap.keys()) {
    if (codeCompounds.has(compound)) continue;
    if (DYNAMIC_KEY_PREFIX_ALLOWLIST.some(prefix => compound.startsWith(prefix))) continue;
    unusedCandidates.push(compound);
  }

  unusedCandidates.sort();
  return unusedCandidates;
}

function auditLocaleJson(seedMap, locale, filePath) {
  if (!fs.existsSync(filePath)) return null;
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const flat = flattenLocaleObject(json);
  const missing = [];

  for (const compound of seedMap.keys()) {
    const [namespace, key] = compound.split('::');
    if (namespace !== 'ui') continue;
    const locales = seedMap.get(compound);
    if (!locales?.has(locale)) continue;
    if (!flat.has(key)) missing.push(key);
  }

  missing.sort();
  return {
    locale,
    filePath,
    totalKeys: flat.size,
    missingKeys: missing,
  };
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

function printUnusedCandidates(sourceName, unusedCandidates) {
  console.log(`\n🧹 미사용 후보 (${sourceName} 기준): ${unusedCandidates.length}개`);
  if (unusedCandidates.length === 0) {
    console.log('   없음');
    return;
  }
  console.log('   주의: 이 목록은 하드코딩 문자열, 동적 키, 네임스페이스 이동 때문에 오탐일 수 있습니다.');
  for (const compound of unusedCandidates.slice(0, 80)) {
    console.log(`   ${compound}`);
  }
  if (unusedCandidates.length > 80) {
    console.log(`   ... ${unusedCandidates.length - 80}개 더`);
  }
}

function printLocaleAudit(localeAudit) {
  if (!localeAudit) return;
  console.log(`\n📁 locale ui.json (${localeAudit.locale}) 키 수: ${localeAudit.totalKeys}`);
  if (localeAudit.missingKeys.length === 0) {
    console.log('✅ seed 기준 누락 없음');
    return;
  }
  console.log(`❌ seed에는 있지만 locale ui.json에 없는 키: ${localeAudit.missingKeys.length}개`);
  for (const key of localeAudit.missingKeys.slice(0, 80)) {
    console.log(`   ${key}`);
  }
  if (localeAudit.missingKeys.length > 80) {
    console.log(`   ... ${localeAudit.missingKeys.length - 80}개 더`);
  }
}

async function main() {
  const seedOnly = process.argv.includes('--seed-only');
  console.log('🔍 i18n Audit — 프론트엔드 t() 키 비교\n');

  const files = scanFiles(CLIENT_SRC, ['.tsx', '.ts']);
  console.log(`📂 스캔 파일: ${files.length}개`);

  const hardcodedCandidates = files.flatMap((file) => extractHardcodedCandidates(file));

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
  let seedUnusedCandidates = [];
  if (seedMap.size > 0) {
    seedAuditResult = auditAgainst(nsKeyMap, seedMap, 'seed-translations.json');
    printResult(seedAuditResult);
    seedUnusedCandidates = findUnusedCandidates(seedMap, nsKeyMap);
    printUnusedCandidates('seed-translations.json', seedUnusedCandidates);
  }

  printHardcodedCandidates(hardcodedCandidates);

  const localeAudits = Object.entries(UI_LOCALE_PATHS).map(([locale, filePath]) =>
    auditLocaleJson(seedMap, locale, filePath)
  );
  for (const localeAudit of localeAudits) {
    printLocaleAudit(localeAudit);
  }

  console.log('\n💡 수정 방법: node scripts/i18n-sync.mjs 실행');

  const outputPath = path.join(ROOT, '.local', 'i18n-audit-result.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    totalCodeKeys,
    timestamp: new Date().toISOString(),
    db: dbAuditResult ? { missingKeys: dbAuditResult.missing, sourceSize: dbAuditResult.sourceSize } : null,
    seed: seedAuditResult ? {
      missingKeys: seedAuditResult.missing,
      sourceSize: seedAuditResult.sourceSize,
      unusedCandidates: seedUnusedCandidates,
    } : null,
    locales: localeAudits,
  }, null, 2));
  console.log(`📄 결과 저장: ${outputPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
