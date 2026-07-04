#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatValidationErrors,
  validateGrammarIndex,
} from "./lib/validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DEFAULT_PATH = join(REPO_ROOT, "private", "dangdai-grammar-index.FINAL.json");

function main(): void {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const mergedMode = flags.has("--merged");
  const nonFlagArgs = argv.filter((a) => !a.startsWith("--"));
  const targetPath = nonFlagArgs[0] ?? DEFAULT_PATH;
  const raw = readFileSync(targetPath, "utf8");
  const data: unknown = JSON.parse(raw);
  const result = validateGrammarIndex(data, { merged: mergedMode });

  if (!result.ok) {
    console.error(`FAIL ${targetPath}`);
    console.error(formatValidationErrors(result.errors));
    process.exit(1);
  }

  console.log(`OK ${targetPath}`);
}

main();