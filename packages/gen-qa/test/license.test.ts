import { describe, expect, it } from "vitest";
import {
  assertMonolingualSeedLicenses,
  moedictByNdSeedFixture,
  type ProvenanceManifest,
} from "@tsumugu/gen-qa";

function manifest(sources: ProvenanceManifest["sources"]): ProvenanceManifest {
  return { sources };
}

describe("assertMonolingualSeedLicenses", () => {
  it("accepts an empty manifest and permissive seed licenses", () => {
    expect(assertMonolingualSeedLicenses(manifest([]))).toEqual({
      ok: true,
      errors: [],
      notes: [],
    });
    const result = assertMonolingualSeedLicenses(
      manifest([
        { id: "authored", license: "authored", role: "generation-seed", text: "自寫" },
        { id: "cc0", license: "cc0", role: "generation-seed" },
        { id: "by", license: "cc-by", role: "generation-seed" },
        { id: "mit", license: "mit", role: "generation-seed" },
        { id: "apache", license: "apache-2.0", role: "generation-seed" },
        { id: "pd", license: "public-domain", role: "generation-seed" },
      ]),
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects share-alike, no-derivatives, and GFDL seeds", () => {
    const result = assertMonolingualSeedLicenses(
      manifest([
        { id: "sa", license: "cc-by-sa", role: "generation-seed" },
        { id: "nd", license: "cc-by-nd", role: "generation-seed" },
        { id: "gfdl", license: "gfdl", role: "generation-seed" },
      ]),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.join("\n")).toContain("cc-by-sa");
    expect(result.errors.join("\n")).toContain("cc-by-nd");
    expect(result.errors.join("\n")).toContain("gfdl");
    expect(result.notes).toEqual([]);
  });

  it("records forbidden licenses as notes when they are reference-only", () => {
    const result = assertMonolingualSeedLicenses(
      manifest([
        {
          id: "ref",
          license: "cc-by-sa",
          role: "reference-only",
          text: "教育部國語小字典",
        },
      ]),
    );
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.notes).toEqual(["ref: cc-by-sa recorded as reference-only (not a seed)"]);
  });

  it("rejects MoE dictionary text inside a generation seed", () => {
    const result = assertMonolingualSeedLicenses(
      manifest([{ id: "moe", license: "cc0", role: "generation-seed", text: "引自萌典" }]),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("萌典"))).toBe(true);
  });

  it("fails the built-in MoE BY-ND fixture on both license and text", () => {
    const result = assertMonolingualSeedLicenses(moedictByNdSeedFixture());
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("cc-by-nd"))).toBe(true);
    expect(result.errors.some((error) => error.includes("教育部國語小字典"))).toBe(true);
  });
});
