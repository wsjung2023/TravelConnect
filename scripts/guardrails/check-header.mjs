// Guardrail: require 1-line description at top for newly added files.
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const stagedFiles = process.argv.slice(2).filter(Boolean);
if (stagedFiles.length === 0) process.exit(0);

// Detect newly added files in git index (status "A")
let added = new Set();
try {
  const out = execSync("git diff --cached --name-status --diff-filter=A", { encoding: "utf8" });
  for (const line of out.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/, 2);
    const status = parts[0];
    const file = parts[1];
    if (status === "A" && file) added.add(file);
  }
} catch {
  // If git isn't available, don't block commits.
  process.exit(0);
}

const needCheck = stagedFiles.filter((f) => added.has(f));
if (needCheck.length === 0) process.exit(0);

function firstMeaningfulLine(text) {
  const lines = text.split("\n");
  let i = 0;
  if (lines[0]?.startsWith("#!")) i = 1; // allow shebang
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    return line;
  }
  return "";
}

function isOkHeader(file, line) {
  const ext = path.extname(file).toLowerCase();
  if ([".json", ".lock", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".pdf"].includes(ext)) return true;

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    return line.startsWith("//") && line.replace("//", "").trim().length >= 5;
  }
  if (ext === ".md") return line.startsWith("#") || line.startsWith(">") || line.length >= 5;
  if (ext === ".css") return line.startsWith("/*") || line.startsWith("//");
  return true; // default: don't block
}

let fail = false;
for (const f of needCheck) {
  try {
    const text = fs.readFileSync(f, "utf8");
    const line = firstMeaningfulLine(text);
    if (!isOkHeader(f, line)) {
      console.error(`❌ Guardrail: New file "${f}" must start with a 1-line description.`);
      console.error(`   Example for TS/TSX: // What this file does (one line)`);
      fail = true;
    }
  } catch (e) {
    console.warn(`⚠️ Guardrail: skipped ${f} (read error).`, e?.message ?? e);
  }
}

if (fail) process.exit(1);
process.exit(0);
