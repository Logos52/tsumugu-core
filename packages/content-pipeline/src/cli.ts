#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePreparedContent } from "@tsumugu/engine";
import { parseArgs, str } from "./args.js";
import { loadCharVi, loadHanViet } from "./hanviet.js";
import { loadDefLevelIndex, type DefLevelIndex } from "./genQa.js";
import { resolveLessonTarget } from "./lessonTarget.js";
import { verifyReading } from "./readingChecks.js";
import { appendSkipLog } from "./skipLog.js";

async function main(): Promise<void> {
  const { _, opts } = parseArgs(process.argv.slice(2));
  const paths = _.filter((p) => !p.startsWith("-"));
  const skipLogPath = str(opts, "skip-log");

  if (paths.length === 0) {
    console.error("usage: reading-checks [--skip-log <queue.jsonl>] <reading.prepared.json>...");
    process.exit(2);
  }

  let defLevelIndex: DefLevelIndex | undefined;
  const defIndexPath = str(opts, "def-index");
  if (defIndexPath) {
    defLevelIndex = JSON.parse(readFileSync(defIndexPath, "utf8")) as DefLevelIndex;
  } else {
    try {
      defLevelIndex = loadDefLevelIndex();
    } catch {
      console.error(
        "error: private def-level pack not found — use --def-index <tocfl+freq.json> " +
          "or install packs/private/zh-hant/data",
      );
      process.exit(2);
    }
  }

  let hanviet;
  let charVi;
  try {
    hanviet = loadHanViet();
    charVi = loadCharVi();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`error: hanviet/char_vi load failed (${msg})`);
    process.exit(2);
  }

  let anyFail = false;

  for (const path of paths) {
    const raw = readFileSync(path, "utf8");
    const content = parsePreparedContent(raw);
    const target = resolveLessonTarget(content, path);

    const report = await verifyReading({
      content,
      target,
      ...(defLevelIndex ? { defLevelIndex } : {}),
      ...(hanviet ? { hanviet } : {}),
      ...(charVi ? { charVi } : {}),
    });

    if (report.pass) {
      console.log(`OK   ${path}`);
    } else {
      anyFail = true;
      console.log(`FAIL ${path}:`);
      for (const reason of report.reasons) {
        console.log(`  ${reason}`);
      }
      if (skipLogPath) appendSkipLog(report, path, skipLogPath);
    }
  }

  process.exit(anyFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
});