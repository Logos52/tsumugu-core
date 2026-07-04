#!/usr/bin/env tsx
import { writeFileSync } from "node:fs";

import { resolveLessonTarget } from "./lib/lesson-target.js";

function main(): void {
  const lessonArg = process.argv[2];
  if (!lessonArg) {
    console.error("usage: resolve-lesson-target <b4l3> [--json out.json]");
    process.exit(2);
  }

  const outPath = process.argv.includes("--json")
    ? process.argv[process.argv.indexOf("--json") + 1]
    : undefined;

  const target = resolveLessonTarget(lessonArg);

  const payload = JSON.stringify(target, null, 2);
  if (outPath) {
    writeFileSync(outPath, `${payload}\n`, "utf8");
    console.log(`wrote ${outPath}`);
  } else {
    console.log(payload);
  }

  console.error(
    `resolved ${target.lesson}: ${target.cumulativeVocab.length} cumulative vocab, ` +
      `${target.cumulativeHanzi.length} hanzi, ${target.newVocab.length} new vocab, ` +
      `${target.newGrammar.length} new grammar`,
  );
}

main();