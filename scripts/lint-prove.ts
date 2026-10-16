import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "scripts/lint-fixtures");
const message = "Comments are not allowed";

interface LintRun {
  status: number | null;
  output: string;
}

function lint(file: string): LintRun {
  const result = spawnSync("pnpm", ["exec", "eslint", "--no-ignore", file], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function fail(detail: string): never {
  console.error(detail);
  process.exit(1);
}

const bad = lint(join(fixtures, "bad.ts"));
if (bad.status === 0 || bad.status === null || !bad.output.includes(message)) {
  fail(`comment fixture should fail with "${message}"\n${bad.output}`);
}

const good = lint(join(fixtures, "good.ts"));
if (good.status !== 0) {
  fail(`clean fixture should pass\n${good.output}`);
}

const shebang = lint(join(fixtures, "shebang.ts"));
if (shebang.status !== 0) {
  fail(`shebang fixture should pass\n${shebang.output}`);
}

console.log("lint:prove ok");
