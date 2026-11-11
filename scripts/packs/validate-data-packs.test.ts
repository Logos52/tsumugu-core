import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { formatIssue } from "./issues.js";
import { isRecord } from "./shapes.js";
import { validateFixture, validateRepo } from "./validate-data-packs.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const GOOD = join(HERE, "fixtures/good");
const BROKEN = join(HERE, "fixtures/broken");

function readFixture(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

describe("data pack fixtures", () => {
  for (const name of readdirSync(GOOD).filter((file) => file.endsWith(".json"))) {
    it(`passes ${name}`, () => {
      expect(validateFixture(readFixture(join(GOOD, name)))).toEqual([]);
    });
  }

  for (const name of readdirSync(BROKEN).filter((file) => file.endsWith(".json"))) {
    it(`fails ${name} with a clear message`, () => {
      const fixture = readFixture(join(BROKEN, name));
      if (!isRecord(fixture) || typeof fixture.expect !== "string") {
        throw new Error(`${name} needs a string expect`);
      }
      const issues = validateFixture(fixture);
      const text = issues.map((item) => formatIssue(item)).join("\n");
      expect(issues.length).toBeGreaterThan(0);
      expect(text).toContain(fixture.expect);
    });
  }
});

describe("shipped data packs", () => {
  it("passes vault readings, titles, companion lessons, and dict-search", () => {
    const report = validateRepo(ROOT);
    expect(report.issues.map((item) => formatIssue(item))).toEqual([]);
    expect(report.summary).toEqual([
      expect.stringMatching(/^vault-readings [1-9]\d*$/),
      expect.stringMatching(/^vault-titles [1-9]\d*$/),
      expect.stringMatching(/^companion-lessons [1-9]\d*$/),
      expect.stringMatching(/^dict-search [1-9]\d*$/),
    ]);
  });
});
