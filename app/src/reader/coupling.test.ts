import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN = [
  // transcript/voice/encoding-modal now ported for Bucket C (11.5) — no old #/ routes or personal coupling
  "splitter",
  "theater",
  "fsVault",
  "dictionaryProvider",
] as const;

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory() && name.name !== "test") out.push(...walkTs(p));
    else if (name.name.endsWith(".ts") && !name.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("no leftover coupling", () => {
  it("reader.ts and wordPopup.ts contain no forbidden references (voice/transcript ports exempted for Bucket C)", () => {
    function codeOnly(text: string): string {
      return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    }

    for (const file of ["reader/reader.ts", "hover/wordPopup.ts"]) {
      const text = codeOnly(readFileSync(join(SRC, file), "utf8"));
      for (const token of FORBIDDEN) {
        expect(text, `${file} must not reference ${token}`).not.toContain(token);
      }
    }
  });

  it("zero #/encoding hits in shipped app/src (comments allowed for docs)", () => {
    function codeOnly(text: string): string {
      return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    }
    for (const file of walkTs(SRC)) {
      const text = codeOnly(readFileSync(file, "utf8"));
      expect(text, file).not.toContain("#/encoding");
    }
  });
});