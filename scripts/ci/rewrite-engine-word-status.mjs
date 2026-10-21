import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argv, exit, stderr } from "node:process";

const engineRoot = argv[2];
if (!engineRoot) {
  stderr.write("usage: node scripts/ci/rewrite-engine-word-status.mjs <engine-package-dir>\n");
  exit(1);
}

const src = join(engineRoot, "src");

function read(rel) {
  return readFileSync(join(src, rel), "utf8");
}

function write(rel, text) {
  writeFileSync(join(src, rel), text);
}

function mustReplace(text, from, to, rel) {
  if (!text.includes(from)) {
    throw new Error(`missing pattern in ${rel}`);
  }
  return text.replace(from, to);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

const types = read("types.ts");
if (types.includes('| "1"') && !types.includes('| "l1"') && !types.includes('| "new"')) {
  stderr.write("word-status union already rewritten\n");
  exit(0);
}

let nextTypes = mustReplace(
  types,
  `export type WordStatus =
  | "new" // 0 — never graded; strongest highlight
  | "l1" // 1 — "New"
  | "l2" // 2 — "Recognized"
  | "l3" // 3 — "Familiar"
  | "l4" // 4 — "Learned"
  | "known" // ✓ — fully known
  | "ignored"; // ✗ — ignored (names, numerals, deliberate skips)`,
  `export type WordStatus =
  | "1"
  | "2"
  | "3"
  | "4"
  | "known"
  | "ignored";`,
  "types.ts",
);
nextTypes = mustReplace(
  nextTypes,
  `export const STATUS_ORDER: readonly WordStatus[] = [
  "new",
  "l1",
  "l2",
  "l3",
  "l4",
  "known",
  "ignored",
] as const;`,
  `export const STATUS_ORDER: readonly WordStatus[] = [
  "1",
  "2",
  "3",
  "4",
  "known",
  "ignored",
] as const;`,
  "types.ts",
);
nextTypes = mustReplace(
  nextTypes,
  `export const STATUS_LABELS: Record<WordStatus, string> = {
  new: "New",
  l1: "New",
  l2: "Recognized",
  l3: "Familiar",
  l4: "Learned",
  known: "Known",
  ignored: "Ignored",
};`,
  `export const STATUS_LABELS: Record<WordStatus, string> = {
  "1": "New",
  "2": "Recognized",
  "3": "Familiar",
  "4": "Learned",
  known: "Known",
  ignored: "Ignored",
};`,
  "types.ts",
);
nextTypes = mustReplace(
  nextTypes,
  `export const STATUS_LEVEL: Record<WordStatus, number | null> = {
  new: 0,
  l1: 1,
  l2: 2,
  l3: 3,
  l4: 4,
  known: null,
  ignored: null,
};`,
  `export const STATUS_LEVEL: Record<WordStatus, number | null> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  known: null,
  ignored: null,
};`,
  "types.ts",
);
write("types.ts", nextTypes);

let coloring = read("status/coloring.ts");
coloring = mustReplace(
  coloring,
  `const STATUS_INTENSITY: Record<WordStatus, number> = {
  new: 1.0,
  l1: 0.8,
  l2: 0.6,
  l3: 0.4,
  l4: 0.2,
  known: 0,
  ignored: 0,
};`,
  `const STATUS_INTENSITY: Record<WordStatus, number> = {
  "1": 1.0,
  "2": 0.6,
  "3": 0.4,
  "4": 0.2,
  known: 0,
  ignored: 0,
};`,
  "status/coloring.ts",
);
write("status/coloring.ts", coloring);

let resolveTs = read("crossref/resolve.ts");
resolveTs = mustReplace(
  resolveTs,
  `const KNOWN_RANK: Record<WordStatus, number> = {
  new: 0,
  l1: 1,
  l2: 2,
  l3: 3,
  l4: 4,
  known: 5,
  ignored: 5,
};`,
  `const KNOWN_RANK: Record<WordStatus, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  known: 5,
  ignored: 5,
};`,
  "crossref/resolve.ts",
);
resolveTs = resolveTs.replaceAll('current === "new"', 'current === "1"');
write("crossref/resolve.ts", resolveTs);

let wordStore = read("store/wordStore.ts");
wordStore = mustReplace(
  wordStore,
  `  return {
    new: 0,
    l1: 0,
    l2: 0,
    l3: 0,
    l4: 0,
    known: 0,
    ignored: 0,
  };`,
  `  return {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    known: 0,
    ignored: 0,
  };`,
  "store/wordStore.ts",
);
wordStore = wordStore.replaceAll('?? "new"', '?? "1"');
wordStore = wordStore.replaceAll('status: "new"', 'status: "1"');
write("store/wordStore.ts", wordStore);

let srs = read("crossref/srs.ts");
srs = srs.replaceAll('return "l3";', 'return "3";');
srs = srs.replaceAll('return "new";', 'return "1";');
write("crossref/srs.ts", srs);

for (const path of walk(src)) {
  const text = readFileSync(path, "utf8");
  const replaced = text
    .replaceAll('"l1"', '"1"')
    .replaceAll('"l2"', '"2"')
    .replaceAll('"l3"', '"3"')
    .replaceAll('"l4"', '"4"');
  if (replaced !== text) writeFileSync(path, replaced);
}

const leftovers = [];
for (const path of walk(src)) {
  const text = readFileSync(path, "utf8");
  if (text.includes('"l1"') || text.includes('"l2"') || text.includes('"l3"') || text.includes('"l4"')) {
    leftovers.push(path);
  }
  if (/\bl[1-4]:/.test(text)) leftovers.push(`${path} (bare level key)`);
}
const storeText = read("store/wordStore.ts");
if (storeText.includes('?? "new"') || storeText.includes('status: "new"')) leftovers.push("store/wordStore.ts new");
const resolveText = read("crossref/resolve.ts");
if (resolveText.includes('current === "new"')) leftovers.push("crossref/resolve.ts new");
if (leftovers.length) {
  stderr.write(`${leftovers.join("\n")}\n`);
  exit(1);
}

stderr.write("rewrote engine word-status union to 1|2|3|4|known|ignored\n");
