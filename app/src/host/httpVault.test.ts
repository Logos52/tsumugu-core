import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpVault, listVaultReadings, staticVaultBase } from "./httpVault.js";

const CATALOG = [
  {
    path: "readings/zh-Hant/clean.prepared.json",
    kind: "story" as const,
    origin: "generated" as const,
    band: "A1" as const,
    tocfl: 1 as const,
    sentences: 6,
    minutes: 2,
    dateAdded: "2026-06-23",
    totalWords: 28,
    wordCounts: {},
    newWords: 3,
    hasAudio: false,
  },
];

describe("createHttpVault", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("staticVaultBase resolves to /vault/ at root base", () => {
    expect(staticVaultBase()).toBe("/vault/");
  });

  it("returns null on 404 prepared fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const vault = createHttpVault("/vault/");
    await expect(vault.readText("readings/zh-Hant/missing.prepared.json")).resolves.toBeNull();
  });

  it("writeText throws read-only error", async () => {
    const vault = createHttpVault("/vault/");
    await expect(vault.writeText("x.json", "{}")).rejects.toThrow(/read-only/i);
  });

  it("listVaultReadings returns CatalogEntry[] from __readings.json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.endsWith("__readings.json")) {
          return new Response(JSON.stringify(CATALOG), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
    await expect(listVaultReadings("/vault/")).resolves.toEqual(CATALOG);
  });

  it("skips entries missing band/kind/wordCounts and warns (validity guard)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mixed = [
      ...CATALOG,
      { path: "readings/zh-Hant/thin.prepared.json" }, // thin: no band/kind/wordCounts
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.endsWith("__readings.json")) {
          return new Response(JSON.stringify(mixed), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
    await expect(listVaultReadings("/vault/")).resolves.toEqual(CATALOG);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("thin.prepared.json"));
  });

  it("yields zero valid entries for a real thin manifest (fixture-fallback trigger)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // The real thin manifest: 1 entry, no band → zero valid → Lane B's fallback fires.
    const thin = [{ path: "readings/zh-Hant/only.prepared.json", title: "Only" }];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.endsWith("__readings.json")) {
          return new Response(JSON.stringify(thin), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
    await expect(listVaultReadings("/vault/")).resolves.toEqual([]);
  });
});