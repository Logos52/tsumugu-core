import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "../tsumugu/packages/engine");
const source = resolve(root, "scripts/ci/engine-stub");

if (!existsSync(target)) {
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}
