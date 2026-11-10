import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  charViHas,
  hanVietReadings,
  loadCharVi,
  loadHanViet,
  resetHanVietCaches,
} from "content-pipeline/hanviet";

describe("hanviet index", () => {
  let dir = "";

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    resetHanVietCaches();
  });

  function scratch(): string {
    dir = mkdtempSync(join(tmpdir(), "hanviet-"));
    return dir;
  }

  it("prefers a non-empty hanViets list, otherwise a single hanViet string", () => {
    const root = scratch();
    const jsonPath = join(root, "hanviet.json");
    writeFileSync(
      jsonPath,
      JSON.stringify({
        中: { hanViet: "trung", pinyinMap: { "*": "trung" } },
        國: { hanViets: ["quốc", "quốc2"], pinyinMap: {} },
        空: {},
        人: { hanViets: [], hanViet: "nhân" },
      }),
    );
    const index = loadHanViet(jsonPath);
    expect(hanVietReadings(index, "中")).toEqual(["trung"]);
    expect(index.get("中")?.pinyinMap).toEqual({ "*": "trung" });
    expect(hanVietReadings(index, "國")).toEqual(["quốc", "quốc2"]);
    expect(hanVietReadings(index, "空")).toEqual([]);
    expect(index.get("空")?.pinyinMap).toEqual({});
    expect(hanVietReadings(index, "人")).toEqual(["nhân"]);
    expect(hanVietReadings(index, "無")).toEqual([]);
  });

  it("reads char_vi heads, skipping blanks and comments", () => {
    const root = scratch();
    const txtPath = join(root, "char_vi.txt");
    writeFileSync(txtPath, "# comment\n\n中_trung\n國\n  人_nhân extra\n");
    const chars = loadCharVi(txtPath);
    expect(charViHas(chars, "中")).toBe(true);
    expect(charViHas(chars, "國")).toBe(true);
    expect(charViHas(chars, "人")).toBe(true);
    expect(charViHas(chars, "無")).toBe(false);
  });

  it("throws when the file is missing and does not cache an explicit path", () => {
    const root = scratch();
    expect(() => loadHanViet(join(root, "missing.json"))).toThrow(/hanviet\.json not found/);
    expect(() => loadCharVi(join(root, "missing.txt"))).toThrow(/char_vi\.txt not found/);

    const first = join(root, "a.json");
    const second = join(root, "b.json");
    writeFileSync(first, JSON.stringify({ 中: { hanViet: "trung" } }));
    writeFileSync(second, JSON.stringify({ 國: { hanViet: "quốc" } }));
    expect(hanVietReadings(loadHanViet(first), "中")).toEqual(["trung"]);
    expect(hanVietReadings(loadHanViet(second), "國")).toEqual(["quốc"]);
    expect(hanVietReadings(loadHanViet(second), "中")).toEqual([]);
  });
});
