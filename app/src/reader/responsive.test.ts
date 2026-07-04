import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const READER_CSS = join(
  dirname(fileURLToPath(import.meta.url)),
  "../styles/reader.css",
);

describe("responsive", () => {
  it("hides rail at 980px and shrinks prose at 720px", () => {
    const css = readFileSync(READER_CSS, "utf8");
    expect(css).toContain("@media(max-width:980px)");
    expect(css).toMatch(/@media\(max-width:980px\)[\s\S]*\.rail\{display:none\}/);
    expect(css).toContain("@media(max-width:720px)");
    expect(css).toMatch(/@media\(max-width:720px\)[\s\S]*\.prose\{font-size:26px/);
  });
});