// Guardrail: block committing files over 400 lines; warn over 250 lines.
import fs from "node:fs";

const files = process.argv.slice(2).filter(Boolean);
if (files.length === 0) process.exit(0);

let hardFail = false;

for (const f of files) {
  try {
    if (!fs.existsSync(f)) continue;
    const stat = fs.statSync(f);
    if (!stat.isFile()) continue;

    const text = fs.readFileSync(f, "utf8");
    const lines = text.split("\n").length;

    if (lines > 400) {
      console.error(`❌ Guardrail: ${f} has ${lines} lines (>400). Split the file.`);
      hardFail = true;
    } else if (lines > 250) {
      console.warn(`⚠️ Guardrail: ${f} has ${lines} lines (>250). Consider splitting soon.`);
    }
  } catch (e) {
    console.warn(`⚠️ Guardrail: skipped ${f} (read error).`, e?.message ?? e);
  }
}

if (hardFail) process.exit(1);
process.exit(0);
