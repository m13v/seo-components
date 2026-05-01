#!/usr/bin/env node
// Lints components for the mobile-grid-overflow bug class.
//
// On a `grid grid-cols-1 ...` container (mobile-default), a child with
// `col-span-2` (or higher, ungated by a breakpoint prefix) forces CSS Grid
// to create an implicit 2nd column. Subsequent `col-span-1` siblings then
// render at 50% width and long words wrap one character per line.
//
// Caught and fixed once on 2026-04-30 (BentoGrid → studyly.io). This script
// scans for the same pattern in any component file so a future edit cannot
// silently reintroduce it.
//
// Rule: a class string in *.tsx may not contain `col-span-N` or `row-span-N`
// where N > 1 unless it is preceded (anywhere in the same string) by a
// responsive breakpoint prefix (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) attached
// to the same span utility (e.g. `sm:col-span-2`).
//
// Exit 1 on any violation.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "src", "components");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

// Match a string literal (className= "..." or `...`) and capture its body.
// We stay conservative: scan literal-by-literal, not full template parsing.
const STRING_LITERAL = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
const SPAN_HIT = /(?<!\w)(col-span|row-span)-([2-9]|1[0-2])(?!\w)/g;
const RESPONSIVE = /(sm|md|lg|xl|2xl):(col-span|row-span)-([2-9]|1[0-2])/;

let violations = 0;
const files = walk(ROOT);

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");

  lines.forEach((line, idx) => {
    let m;
    STRING_LITERAL.lastIndex = 0;
    while ((m = STRING_LITERAL.exec(line)) !== null) {
      const body = m[2];
      // Strip every responsive-prefixed match so the next regex only sees
      // bare (mobile-applied) spans.
      const stripped = body.replace(new RegExp(RESPONSIVE, "g"), "");
      const bare = stripped.match(SPAN_HIT);
      if (bare) {
        violations++;
        console.error(
          `${relative(ROOT, file)}:${idx + 1}  ungated mobile span: ${bare.join(", ")}`
        );
        console.error(`    in: "${body}"`);
        console.error(
          `    fix: prefix with sm:/md:/lg: so it only applies above mobile-1col grid (e.g. sm:col-span-2).`
        );
      }
    }
  });
}

if (violations > 0) {
  console.error(`\n${violations} violation(s). See https://github.com/m13v/seo-components#mobile-grid-rule`);
  process.exit(1);
}
console.log(`OK: scanned ${files.length} component file(s), no ungated mobile col-span/row-span found.`);
