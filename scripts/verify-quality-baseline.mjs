#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['client/src', 'server'];
const NO_CHECK_MARKER = '// @ts-nocheck';
const MAX_NO_CHECK_COUNT = 68; // keep reducing from previous baseline (73)

const forbiddenNoCheckFiles = [
  'server/index.ts',
  'server/db.ts',
  'server/routes/index.ts',
  'server/middleware/envCheck.ts',
  'server/middleware/validation.ts',
  'client/src/components/map/MapBottomSheet.tsx',
];

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));
const withNoCheck = files.filter((f) => {
  const firstLine = fs.readFileSync(f, 'utf8').split('\n', 1)[0] || '';
  return firstLine.includes(NO_CHECK_MARKER);
});

if (withNoCheck.length > MAX_NO_CHECK_COUNT) {
  console.error(`❌ Too many @ts-nocheck files: ${withNoCheck.length} (max ${MAX_NO_CHECK_COUNT})`);
  process.exit(1);
}

for (const f of forbiddenNoCheckFiles) {
  if (!fs.existsSync(f)) continue;
  const firstLine = fs.readFileSync(f, 'utf8').split('\n', 1)[0] || '';
  if (firstLine.includes(NO_CHECK_MARKER)) {
    console.error(`❌ Forbidden @ts-nocheck usage in core file: ${f}`);
    process.exit(1);
  }
}

console.log(`✅ Quality baseline passed: @ts-nocheck count ${withNoCheck.length}/${MAX_NO_CHECK_COUNT}`);
