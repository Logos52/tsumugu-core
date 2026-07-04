import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyReading } from "../src/readingChecks.js";
import {
  FIXTURE_CHAR_VI,
  FIXTURE_DEF_INDEX,
  FIXTURE_HANVIET,
  FAKE_ZH_PACK,
  loadFixturePair,
  storeWithCumulativeKnown,
} from "./helpers.js";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES_DIR = resolve(PKG_DIR, "test/fixtures");

function baseOpts(stem: string) {
  const { prepared, target } = loadFixturePair(stem);
  return {
    content: prepared,
    target,
    store: storeWithCumulativeKnown(target),
    defLevelIndex: FIXTURE_DEF_INDEX,
    hanviet: FIXTURE_HANVIET,
    charVi: FIXTURE_CHAR_VI,
    pack: FAKE_ZH_PACK,
  };
}

describe("verifyReading", () => {
  it("passes the clean fixture with an empty/anonymous WordStore", async () => {
    const { prepared, target } = loadFixturePair("clean");
    const report = await verifyReading({
      content: prepared,
      target,
      defLevelIndex: FIXTURE_DEF_INDEX,
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      pack: FAKE_ZH_PACK,
    });
    expect(report.pass).toBe(true);
    expect(report.reasons).toEqual([]);
    expect(report.achievedLevel).toMatch(/^TOCFL-[1-3]$/);
    expect(report.aboveBandTokens).toEqual([]);
    expect(report.scriptLeaks).toEqual([]);
    expect(report.bridgeFailures).toEqual([]);
    expect(report.polyphoneRisks).toEqual([]);
    expect(report.newTargetRecycle.every((r) => r.ok)).toBe(true);
  });

  it("fails planted above-band tokens", async () => {
    const report = await verifyReading(baseOpts("above-band"));
    expect(report.pass).toBe(false);
    expect(report.aboveBandTokens.some((t) => t.word === "怪獸")).toBe(true);
    expect(report.reasons.some((r) => r.includes("怪獸"))).toBe(true);
  });

  it("fails planted Simplified script leaks", async () => {
    const report = await verifyReading(baseOpts("simplified-leak"));
    expect(report.pass).toBe(false);
    expect(report.scriptLeaks.length).toBeGreaterThan(0);
    expect(report.reasons.some((r) => r.startsWith("script:"))).toBe(true);
  });

  it("fails ungrounded bridge cognates", async () => {
    const report = await verifyReading(baseOpts("ungrounded-bridge"));
    expect(report.pass).toBe(false);
    expect(report.bridgeFailures.some((b) => b.etymon === "臆")).toBe(true);
    expect(report.reasons.some((r) => r.includes("臆"))).toBe(true);
  });

  it("fails polyphone silent-drop readings", async () => {
    const report = await verifyReading({
      ...baseOpts("polyphone"),
      store: storeWithCumulativeKnown(loadFixturePair("polyphone").target),
    });
    expect(report.pass).toBe(false);
    expect(report.polyphoneRisks.some((p) => p.char === "上")).toBe(true);
    expect(report.reasons.some((r) => r.startsWith("polyphone:"))).toBe(true);
  });

  it("fails paragraph repetition violations", async () => {
    const report = await verifyReading(baseOpts("repetition-spread"));
    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.includes("朋友"))).toBe(true);
  });

  it("fails length spread when sentences are uniform", async () => {
    const report = await verifyReading(baseOpts("length-spread"));
    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.includes("length spread"))).toBe(true);
  });

  it("fails closed when bridge glossary present but charVi/hanviet omitted", async () => {
    const { prepared, target } = loadFixturePair("clean");
    const report = await verifyReading({
      content: prepared,
      target,
      defLevelIndex: FIXTURE_DEF_INDEX,
      pack: FAKE_ZH_PACK,
    });
    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.includes("charVi index required"))).toBe(true);
    expect(report.reasons.some((r) => r.includes("hanviet index required"))).toBe(true);
  });

  it("fails missing new-target recycle", async () => {
    const report = await verifyReading(baseOpts("missing-new-target"));
    expect(report.pass).toBe(false);
    expect(report.newTargetRecycle.find((r) => r.word === "散步")?.ok).toBe(false);
    expect(report.reasons.some((r) => r.includes("散步"))).toBe(true);
  });

  it("collects all failures without short-circuiting", async () => {
    const { prepared, target } = loadFixturePair("above-band");
    const content = {
      ...prepared,
      tokens: prepared.tokens.map((t) =>
        t.text === "看見" ? { text: "学", isWord: true } : t,
      ),
    };
    const report = await verifyReading({
      content,
      target: {
        ...target,
        cumulativeVocab: new Set([...target.cumulativeVocab, "学"]),
      },
      store: storeWithCumulativeKnown(target),
      defLevelIndex: FIXTURE_DEF_INDEX,
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      pack: FAKE_ZH_PACK,
    });
    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.startsWith("script:"))).toBe(true);
    expect(report.reasons.some((r) => r.includes("怪獸"))).toBe(true);
  });

  it("respects config overrides (ABOVE_BAND_ALLOWANCE flips above-band to pass)", async () => {
    const opts = baseOpts("above-band");
    const strict = await verifyReading(opts);
    expect(strict.pass).toBe(false);

    const lenient = await verifyReading({
      ...opts,
      config: { ABOVE_BAND_ALLOWANCE: 1 },
    });
    expect(lenient.pass).toBe(true);
  });

  it("enforces MIN_SENTENCES and length spread using prose utils", async () => {
    const { prepared, target } = loadFixturePair("clean");
    // clean has 4 sentences, spread=12 >=8
    const report = await verifyReading({
      ...baseOpts("clean"),
    });
    expect(report.pass).toBe(true);
    expect(report.reasons.filter((r) => r.includes("sentence") || r.includes("spread")).length).toBe(0);
  });

  it("flags missing newGrammar marker", async () => {
    const base = baseOpts("clean");
    const badTarget = { ...base.target, newGrammar: ["不該出現的標記"] };
    const report = await verifyReading({ ...base, target: badTarget });
    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.includes("newGrammar"))).toBe(true);
  });

  it("requires some VI bridge entries (no rail at all fails)", async () => {
    const { prepared, target } = loadFixturePair("clean");
    const noBridgeContent = {
      ...prepared,
      glossary: {}, // strip all
    };
    const report = await verifyReading({
      content: noBridgeContent,
      target,
      defLevelIndex: FIXTURE_DEF_INDEX,
      hanviet: FIXTURE_HANVIET,
      charVi: FIXTURE_CHAR_VI,
      pack: FAKE_ZH_PACK,
    });
    expect(report.pass).toBe(false);
    expect(report.reasons.some((r) => r.includes("vi-rail"))).toBe(true);
  });
});

describe("reading-checks CLI", () => {
  it("prints OK with exit 0 for the clean fixture", () => {
    const out = execFileSync(
      "pnpm",
      [
        "exec",
        "tsx",
        "src/cli.ts",
        "--def-index",
        "test/fixtures/def-index.json",
        "test/fixtures/clean.prepared.json",
      ],
      { cwd: PKG_DIR, encoding: "utf8" },
    );
    expect(out).toContain("OK");
    expect(out).toContain("clean.prepared.json");
  });

  it("prints FAIL with exit nonzero for a planted-fail fixture", () => {
    let exitCode = 0;
    try {
      execFileSync(
        "pnpm",
        [
          "exec",
          "tsx",
          "src/cli.ts",
          "--def-index",
          "test/fixtures/def-index.json",
          "test/fixtures/above-band.prepared.json",
        ],
        { cwd: PKG_DIR, encoding: "utf8" },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      const combined = `${e.stdout ?? ""}${e.stderr ?? ""}`;
      expect(combined).toContain("FAIL");
      expect(combined).toContain("above-band.prepared.json");
    }
    expect(exitCode).not.toBe(0);
  });
});