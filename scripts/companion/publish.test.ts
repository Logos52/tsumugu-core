import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bandCapFor,
  bindingFailures,
  buildCompanionLessons,
  classifyReason,
  publishCompanion,
  type PublishPaths,
} from "./publish.js";

function seedRepo(opts: { reasons: string[]; book?: number }): PublishPaths {
  const root = mkdtempSync(join(tmpdir(), "companion-publish-"));
  const readingsDir = join(root, "out/readings");
  const vaultDir = join(root, "vault");
  mkdirSync(readingsDir, { recursive: true });
  mkdirSync(join(vaultDir, "readings/zh-Hant"), { recursive: true });

  const id = "b1l99-r1";
  const entry = {
    path: `readings/zh-Hant/${id}.prepared.json`,
    lang: "zh-Hant",
    title: "Seeded",
    kind: "dialogue",
    band: "A1",
    tocfl: 1,
    wordCounts: { 我: 3 },
  };
  writeFileSync(join(root, "manifest.json"), JSON.stringify([entry]));
  writeFileSync(
    join(root, "gate-report.json"),
    JSON.stringify({
      readings: [
        {
          unit: "b1l99",
          readingId: "r1",
          file: entry.path,
          book: opts.book ?? 1,
          lesson: 99,
          gate: { pass: opts.reasons.length === 0, reasons: opts.reasons },
        },
      ],
    }),
  );
  writeFileSync(join(root, "eligible.json"), JSON.stringify({ eligible_today: [id] }));
  writeFileSync(join(readingsDir, `${id}.prepared.json`), JSON.stringify({ schema: "prepared@2" }));
  writeFileSync(
    join(root, "highlights.json"),
    JSON.stringify({
      _meta: { what: "test" },
      B1L99: { title: "T", theme: "Th", grammar: [{ title: "嗎 questions" }] },
    }),
  );
  // Pre-existing vault manifest with the smoke fixture entry.
  writeFileSync(
    join(vaultDir, "__readings.json"),
    JSON.stringify([{ path: "readings/zh-Hant/clean.prepared.json", dateAdded: "2026-06-23T12:00:00Z" }]),
  );
  writeFileSync(join(vaultDir, "readings/zh-Hant/clean.prepared.json"), "{}");

  return {
    manifest: join(root, "manifest.json"),
    gateReport: join(root, "gate-report.json"),
    eligible: join(root, "eligible.json"),
    readingsDir,
    vaultDir,
    highlights: join(root, "highlights.json"),
  };
}

describe("companion publish guard (signed profile)", () => {
  it("refuses a seeded binding failure and writes nothing", () => {
    const paths = seedRepo({ reasons: ["script: Simplified/non-TW variant leak: 台 → 臺"] });
    expect(() => publishCompanion(paths)).toThrow(/REFUSING to publish/);
    // No writes: reading not copied, fixture entry + file untouched.
    expect(existsSync(join(paths.vaultDir, "readings/zh-Hant/b1l99-r1.prepared.json"))).toBe(false);
    expect(existsSync(join(paths.vaultDir, "companion-lessons.json"))).toBe(false);
    expect(existsSync(join(paths.vaultDir, "readings/zh-Hant/clean.prepared.json"))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(paths.vaultDir, "__readings.json"), "utf8"));
    expect(manifest).toEqual([
      { path: "readings/zh-Hant/clean.prepared.json", dateAdded: "2026-06-23T12:00:00Z" },
    ]);
  });

  it("fails closed on an unknown reason string", () => {
    const paths = seedRepo({ reasons: ["mystery: something new the gate learned to say"] });
    expect(() => publishCompanion(paths)).toThrow(/REFUSING/);
  });

  it("publishes when only advisory reasons remain, replacing the fixture", () => {
    const paths = seedRepo({
      reasons: [
        "prose: defLevelIndex not provided — cannot verify in-band coverage",
        "newVocab: 接 recurs 2×, need ≥3",
        "newGrammar: missing marker 句型",
        "polyphone: 你好/好 is polyphone (hảo, hiếu) but bridge morpheme has no reading",
        "prose: sentences[3] Han count 2 < min 4: 你呢？",
      ],
    });
    const res = publishCompanion(paths);
    expect(res.published).toBe(1);
    expect(res.removedFixture).toBe(true);
    const manifest = JSON.parse(readFileSync(join(paths.vaultDir, "__readings.json"), "utf8"));
    expect(manifest).toHaveLength(1);
    expect(manifest[0].path).toBe("readings/zh-Hant/b1l99-r1.prepared.json");
    expect(manifest[0].origin).toBe("companion");
    expect(existsSync(join(paths.vaultDir, "readings/zh-Hant/clean.prepared.json"))).toBe(false);
    const lessons = JSON.parse(readFileSync(join(paths.vaultDir, "companion-lessons.json"), "utf8"));
    expect(lessons).toEqual([{ unit: "B1L99", title: "T", theme: "Th", grammar: [{ name: "嗎 questions" }] }]);
  });

  it("is idempotent — publishing twice yields a byte-identical vault", () => {
    const paths = seedRepo({ reasons: [] });
    publishCompanion(paths);
    const snap = (): Record<string, string> => {
      const out: Record<string, string> = {};
      const walk = (dir: string, rel: string): void => {
        for (const name of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, name.name);
          const r = `${rel}/${name.name}`;
          if (name.isDirectory()) walk(p, r);
          else out[r] = readFileSync(p, "utf8");
        }
      };
      walk(paths.vaultDir, "");
      return out;
    };
    const first = snap();
    publishCompanion(paths);
    expect(snap()).toEqual(first);
  });
});

describe("signed-profile reason classification", () => {
  it("carve-out exempts ≤3-Han terminal utterances only", () => {
    expect(classifyReason("prose: sentences[3] Han count 2 < min 4: 你呢？", 1)).toBe("advisory");
    expect(classifyReason("prose: sentences[3] Han count 3 < min 4: 乙：好啊！", 1)).toBe("advisory");
    // 4+ Han short-sentence reasons or non-terminal fragments still bind.
    expect(classifyReason("prose: sentences[3] Han count 3 < min 4: 然後就", 1)).toBe("binding");
  });

  it("band cap is 60 for Books 1-2 and 80 for Books 3+", () => {
    expect(bandCapFor(1)).toBe(60);
    expect(bandCapFor(2)).toBe(60);
    expect(bandCapFor(3)).toBe(80);
    expect(bandCapFor(5)).toBe(80);
    const long62 = "prose: sentences[17] Han count 62 > max 60: 畢業以後我希望";
    expect(classifyReason(long62, 3)).toBe("advisory"); // within B3+ cap
    expect(classifyReason(long62, 2)).toBe("binding"); // genuine B2 run-on
    expect(classifyReason("prose: sentences[1] Han count 87 > max 60: 這", 3)).toBe("binding");
  });

  it("script / glossary / paragraph / vi-rail reasons bind; A/B/H/recycle stay advisory", () => {
    expect(classifyReason("script: Simplified/non-TW variant leak: 台 → 臺", 1)).toBe("binding");
    expect(classifyReason("glossary: missing usable gloss for unknown word 支援", 1)).toBe("binding");
    expect(classifyReason("paragraph[0]: distinct opener ratio 0.45 < min 0.6", 1)).toBe("binding");
    expect(classifyReason("vi-rail: missing bridge for 學校", 1)).toBe("binding");
    expect(classifyReason("prose: defLevelIndex not provided — cannot verify in-band coverage", 1)).toBe("advisory");
    expect(classifyReason("newVocab: 姓 recurs 1×, need ≥3", 1)).toBe("advisory");
    expect(classifyReason("newGrammar: missing marker A-not-A問句", 1)).toBe("advisory");
    expect(
      classifyReason("polyphone: 小姐/姐 is polyphone (tỷ, thư) but bridge morpheme has no reading", 1),
    ).toBe("advisory");
  });

  it("bindingFailures filters by the record's own book", () => {
    const rec = {
      unit: "b3l01",
      readingId: "r1",
      file: "readings/zh-Hant/b3l01-r1.prepared.json",
      book: 3,
      lesson: 1,
      gate: {
        pass: false,
        reasons: [
          "prose: sentences[17] Han count 62 > max 60: 畢業以後",
          "newVocab: 接 recurs 2×, need ≥3",
        ],
      },
    };
    expect(bindingFailures(rec)).toEqual([]);
  });
});

describe("buildCompanionLessons", () => {
  it("projects units sorted, skipping _meta and empty grammar names", () => {
    const rows = buildCompanionLessons({
      _meta: { x: 1 },
      B1L02: { title: "b", theme: "t2", grammar: [{ title: "" }, { title: "了 change" }] },
      B1L01: { title: "a", theme: "t1" },
    });
    expect(rows.map((r) => r.unit)).toEqual(["B1L01", "B1L02"]);
    expect(rows[1].grammar).toEqual([{ name: "了 change" }]);
  });
});
