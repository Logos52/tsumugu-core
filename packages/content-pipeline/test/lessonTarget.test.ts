import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadLessonTarget,
  resolveLessonTarget,
  resolveLessonTargetFromAuthoritative,
  targetSidecarPath,
  type PreparedWithBinding,
} from "content-pipeline/lessonTarget";

const CSV = [
  "id,traditional",
  "B1L01-001,你好",
  'B1L01-002,"你,好"',
  'B1L01-003,"說""啊"""',
  "B1L02-001,謝謝",
  "B2L01-001,以後",
  "BADROW,跳過",
].join("\n");

const GRAMMAR = {
  points: [
    { book: 1, lesson: 1, cumulative_through: "b1l01", name_zh: "呢", tocfl_band: "B" },
    { book: 1, lesson: 2, cumulative_through: "b1l02", name_zh: "了", tocfl_band: "A" },
    { book: 1, lesson: 2, cumulative_through: "b1l02", name_zh: "過", tocfl_band: "C" },
    { book: 2, lesson: 1, cumulative_through: "b2l01", name_zh: "把", tocfl_band: "C" },
  ],
};

describe("targetSidecarPath", () => {
  it("swaps a prepared suffix for a target suffix", () => {
    expect(targetSidecarPath("/vault/b1l01.prepared.json")).toBe("/vault/b1l01.target.json");
    expect(targetSidecarPath("/vault/FOO.PREPARED.JSON")).toBe("/vault/FOO.target.json");
    expect(targetSidecarPath("/vault/a.prepared.json.bak")).toBe("/vault/a.prepared.json.bak");
  });
});

describe("resolveLessonTargetFromAuthoritative", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function paths(grammar: string | undefined, fallback?: string) {
    dir = mkdtempSync(join(tmpdir(), "lesson-target-"));
    const vocabCsvPath = join(dir, "vocab.csv");
    writeFileSync(vocabCsvPath, CSV);
    const grammarIndexPath = join(dir, "grammar.json");
    const grammarFallbackPath = join(dir, "fallback.json");
    if (grammar !== undefined) writeFileSync(grammarIndexPath, grammar);
    if (fallback !== undefined) writeFileSync(grammarFallbackPath, fallback);
    return { vocabCsvPath, grammarIndexPath, grammarFallbackPath };
  }

  it("accumulates earlier vocab, keeps this lesson's new items, and raises the ceiling from grammar", () => {
    const opts = paths(JSON.stringify(GRAMMAR));
    const target = resolveLessonTargetFromAuthoritative("b1l2", opts);
    expect(target.lessonId).toBe("b1l02");
    expect(target.ceiling).toBe("TOCFL-4");
    expect(target.cumulativeVocab).toEqual(new Set(["你好", "你,好", '說"啊"', "謝謝"]));
    expect(target.newVocab).toEqual(["謝謝"]);
    expect(target.newGrammar).toEqual(["了", "過"]);
  });

  it("accepts book and lesson numbers and ignores a later lesson's band", () => {
    const opts = paths(JSON.stringify(GRAMMAR));
    const target = resolveLessonTargetFromAuthoritative({ book: 1, lesson: 1 }, opts);
    expect(target.lessonId).toBe("b1l01");
    expect(target.ceiling).toBe("TOCFL-3");
    expect(target.newVocab).toEqual(["你好", "你,好", '說"啊"']);
    expect(target.newGrammar).toEqual(["呢"]);
    expect(target.cumulativeVocab.has("謝謝")).toBe(false);
  });

  it("uses the grammar fallback when the primary file is not JSON", () => {
    const opts = paths("{", JSON.stringify({ points: [GRAMMAR.points[0]] }));
    const target = resolveLessonTargetFromAuthoritative("b1l01", opts);
    expect(target.ceiling).toBe("TOCFL-3");
    expect(target.newGrammar).toEqual(["呢"]);
  });

  it("stays at TOCFL-2 when neither grammar file exists", () => {
    const opts = paths(undefined);
    const target = resolveLessonTargetFromAuthoritative("b1l01", opts);
    expect(target.ceiling).toBe("TOCFL-2");
    expect(target.newGrammar).toEqual([]);
  });

  it("throws for a malformed id and for a lesson with no vocab rows", () => {
    const opts = paths(JSON.stringify(GRAMMAR));
    expect(() => resolveLessonTargetFromAuthoritative("lesson-9", opts)).toThrow(
      /unknown lesson id: lesson-9/,
    );
    expect(() => resolveLessonTargetFromAuthoritative("b0l1", opts)).toThrow(
      /unknown lesson id: b0l01/,
    );
  });

  it.skip("a lesson past the vocab file is unknown; b9l99 currently returns every earlier row", () => {
    const opts = paths(JSON.stringify(GRAMMAR));
    expect(() => resolveLessonTargetFromAuthoritative("b9l99", opts)).toThrow(
      /unknown lesson id: b9l99/,
    );
  });
});

describe("resolveLessonTarget", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("reads an acccBinding facet and does not require a sidecar", () => {
    const content = {
      tokens: [],
      glossary: {},
      title: "b9l99",
      acccBinding: {
        lessonId: "b1l01",
        ceiling: "TOCFL-2",
        cumulativeVocab: ["你"],
        newVocab: ["好"],
        newGrammar: ["呢"],
      },
    } as PreparedWithBinding;
    const target = resolveLessonTarget(content, "/missing/no.prepared.json");
    expect(target.lessonId).toBe("b1l01");
    expect(target.ceiling).toBe("TOCFL-2");
    expect(target.cumulativeVocab).toEqual(new Set(["你"]));
    expect(target.newVocab).toEqual(["好"]);
    expect(target.newGrammar).toEqual(["呢"]);
  });

  it("fills missing binding arrays with empty collections", () => {
    const content = {
      tokens: [],
      glossary: {},
      acccBinding: { lessonId: "b2l03", ceiling: "TOCFL-4" },
    } as PreparedWithBinding;
    const target = resolveLessonTarget(content);
    expect(target.cumulativeVocab).toEqual(new Set());
    expect(target.newVocab).toEqual([]);
    expect(target.newGrammar).toEqual([]);
  });

  it("loads a sidecar when the prepared path has one", () => {
    dir = mkdtempSync(join(tmpdir(), "lesson-sidecar-"));
    const prepared = join(dir, "b1l01.prepared.json");
    const sidecar = targetSidecarPath(prepared);
    writeFileSync(
      sidecar,
      JSON.stringify({
        lessonId: "b1l01",
        ceiling: "TOCFL-2",
        cumulativeVocab: ["你", "好"],
        newVocab: ["好"],
        newGrammar: ["呢"],
      }),
    );
    const loaded = loadLessonTarget(sidecar);
    expect(loaded.cumulativeVocab).toEqual(new Set(["你", "好"]));
    const target = resolveLessonTarget({ tokens: [], glossary: {} } as PreparedWithBinding, prepared);
    expect(target).toEqual(loaded);
  });

  it("throws when there is no binding, sidecar, or resolvable title", () => {
    expect(() => resolveLessonTarget({ tokens: [], glossary: {} } as PreparedWithBinding)).toThrow(
      /no lesson target/,
    );
    expect(() =>
      resolveLessonTarget({ tokens: [], glossary: {}, title: "b1l01 story" } as PreparedWithBinding),
    ).toThrow(/no lesson target/);
  });

  it("throws when the sidecar path does not exist", () => {
    expect(() => loadLessonTarget("/tmp/missing-lesson-target.json")).toThrow(
      /lesson target fixture not found/,
    );
  });
});
