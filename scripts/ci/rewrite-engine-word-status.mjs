import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { argv, exit, stderr } from "node:process";
import { blocks } from "./engine-status-blocks.mjs";

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
  if (!text.includes(from)) throw new Error(`missing pattern in ${rel}`);
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

const pending = new Map();
for (const [rel, from, to] of blocks) {
  const current = pending.has(rel) ? pending.get(rel) : read(rel);
  pending.set(rel, mustReplace(current, from, to, rel));
}

function edit(rel, transform) {
  const current = pending.has(rel) ? pending.get(rel) : read(rel);
  pending.set(rel, transform(current));
}

edit("crossref/resolve.ts", (text) => text.replaceAll('current === "new"', 'current === "1"'));
edit("store/wordStore.ts", (text) => text.replaceAll('?? "new"', '?? "1"').replaceAll('status: "new"', 'status: "1"'));
edit("crossref/srs.ts", (text) => text.replaceAll('return "l3";', 'return "3";').replaceAll('return "new";', 'return "1";'));

for (const [rel, text] of pending) write(rel, text);

for (const path of walk(src)) {
  const text = readFileSync(path, "utf8");
  const replaced = text.replaceAll('"l1"', '"1"').replaceAll('"l2"', '"2"').replaceAll('"l3"', '"3"').replaceAll('"l4"', '"4"');
  if (replaced !== text) writeFileSync(path, replaced);
}

const leftovers = [];
for (const path of walk(src)) {
  const text = readFileSync(path, "utf8");
  if (text.includes('"l1"') || text.includes('"l2"') || text.includes('"l3"') || text.includes('"l4"')) leftovers.push(path);
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
