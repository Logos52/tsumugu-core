import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  encodingBasename,
  encodingFilename,
  nfcTerm,
  readJson,
  readText,
  slugify,
  writeJson,
  writeText,
} from "@tsumugu/gen-qa";

describe("slugify and NFC", () => {
  it("folds spaces and slashes into single hyphens and drops other symbols", () => {
    expect(slugify("  Hello / World  ")).toBe("Hello-World");
    expect(slugify("a--b")).toBe("a-b");
    expect(slugify("你好")).toBe("你好");
    expect(slugify("???")).toBe("untitled");
    expect(slugify("")).toBe("untitled");
  });

  it("normalizes combining marks to NFC", () => {
    expect(nfcTerm("e\u0301")).toBe("\u00e9");
    expect(slugify("e\u0301")).toBe("\u00e9");
  });
});

describe("encoding filenames", () => {
  it("uses a clean term as its own filename", () => {
    expect(encodingBasename("你好")).toBe("你好");
    expect(encodingFilename("Hello")).toBe("Hello");
  });

  it("rejects hostile or lossy terms unless a slug is passed", () => {
    expect(() => encodingBasename("a/b")).toThrow(/filesystem-hostile/);
    expect(() => encodingBasename("a b")).toThrow(/filesystem-hostile/);
    expect(() => encodingBasename("hello!")).toThrow(/verbatim filename/);
  });

  it("slugifies an explicit override and ignores an empty slug", () => {
    expect(encodingBasename("a/b", "Hello World")).toBe("Hello-World");
    expect(encodingBasename("a/b", "???")).toBe("untitled");
    expect(encodingFilename("你好", "")).toBe("你好");
  });
});

describe("json io", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("creates parent directories and round-trips pretty JSON", async () => {
    dir = mkdtempSync(join(tmpdir(), "gen-qa-io-"));
    const path = join(dir, "nested", "doc.json");
    const value = { n: 1, s: "學" };
    await writeJson(path, value);
    expect(await readText(path)).toBe(`${JSON.stringify(value, null, 2)}\n`);
    expect(await readJson<typeof value>(path)).toEqual(value);
  });

  it("writes plain text under a new directory", async () => {
    dir = mkdtempSync(join(tmpdir(), "gen-qa-io-"));
    const path = join(dir, "out", "note.txt");
    await writeText(path, "你好\n");
    expect(await readText(path)).toBe("你好\n");
  });
});
