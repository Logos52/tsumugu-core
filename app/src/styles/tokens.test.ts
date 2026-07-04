import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TOKENS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "tokens.css");
const css = readFileSync(TOKENS_PATH, "utf8");

describe("tokens.css", () => {
  it("maps semantic accent and status tokens from raw layer", () => {
    expect(css).toContain("--tsg-accent:var(--raw-violet)");
    expect(css).toContain("--tsg-st-new:var(--raw-new)");
    expect(css).toContain("--tsg-st-l1:var(--raw-learning)");
    expect(css).toContain("--tsg-st-known:var(--raw-jade)");
  });

  it("is a single spectral-teal palette (light default + dark), no palette switcher", () => {
    // Bare :root carries the active light palette; dark keys on data-theme only.
    expect(css).toContain(":root[data-theme=\"dark\"]");
    // The retired alternates and their [data-palette] selectors are gone.
    expect(css).not.toContain('data-palette="mist"');
    expect(css).not.toContain('data-palette="silk"');
    expect(css).not.toContain('data-palette="navy"');
  });

  it("uses the spectral-teal accent (light + dark)", () => {
    expect(css).toContain("--raw-violet:#0C8DAF"); // light accent
    expect(css).toContain("--raw-violet:#43ADC6"); // dark accent
  });

  it("keeps retired palette values inert (kept, not deleted)", () => {
    // Seal-red and Verdigris survive only inside the retired-values comments.
    expect(css).toContain("#C23A2A");
    expect(css).toContain("#3B8577");
    // …but neither is ever applied as the live accent.
    expect(css).not.toContain("--raw-violet:#C23A2A");
    expect(css).not.toContain("--raw-violet:#3B8577");
  });

  it("carries the faint format-signifier tokens per theme", () => {
    expect(css.match(/--tsg-fmt-dlg:/g)?.length).toBe(2);
    expect(css).toContain("--tsg-fmt-exp:");
  });

  it("defines the --tsg-ui / --tsg-on-ui neutral pair once per theme (light + dark)", () => {
    expect(css.match(/--tsg-ui:/g)?.length).toBe(2);
    expect(css.match(/--tsg-on-ui:/g)?.length).toBe(2);
  });

  it("reserves the accent and uses underline status (no status background fills on .w)", () => {
    const base = readFileSync(resolve(dirname(TOKENS_PATH), "base.css"), "utf8");
    expect(base.match(/\.tsg-status-\w+\s*\{[^}]*background/)).toBeNull();
    expect(base).toContain(".w.nw");
    expect(base).toContain("var(--raw-violet-soft)");
    expect(base).toContain(":root[data-rail=\"en\"] rt");
  });
});
