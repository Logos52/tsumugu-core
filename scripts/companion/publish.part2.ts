import { dirname, join, resolve } from "node:path";

import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(HERE, "../..");

export interface PublishPaths {
  
  manifest: string;
  
  gateReport: string;
  
  eligible: string;
  
  readingsDir: string;
  
  vaultDir: string;
  
  highlights: string;
}

export function defaultPaths(root: string = REPO_ROOT): PublishPaths {
  return {
    manifest: join(root, "out/companion/manifest.json"),
    gateReport: join(root, "out/companion/gate-report.json"),
    eligible: join(root, "out/companion/eligible-2026-07-02.json"),
    readingsDir: join(root, "out/companion/readings"),
    vaultDir: join(root, "app/public/vault"),
    highlights: join(root, "mockups/lesson-highlights.json"),
  };
}

export interface GateRecord {
  unit: string;
  readingId: string;
  file: string;
  book: number;
  lesson: number;
  gate: { pass: boolean; reasons: string[] };
}

export interface CatalogRow {
  path: string;
  origin?: string;
  [k: string]: unknown;
}

export function bandCapFor(book: number): number {
  return book >= 3 ? 80 : 60;
}

const RE_TOO_SHORT = /^prose: sentences\[\d+\] Han count (\d+) < min \d+: (.+)$/;

const RE_TOO_LONG = /^prose: sentences\[\d+\] Han count (\d+) > max \d+/;

export function classifyReason(reason: string, book: number): "advisory" | "binding" {
  
  if (reason.startsWith("newVocab:")) return "advisory"; 
  if (reason.startsWith("newGrammar:")) return "advisory"; 
  if (reason.startsWith("polyphone:")) return "advisory"; 
  if (reason.startsWith("ci:")) return "advisory"; 
  if (reason.startsWith("prose:")) {
    if (reason.includes("defLevelIndex not provided")) return "advisory"; 
    const short = RE_TOO_SHORT.exec(reason);
    if (short) {
      
      
      const count = Number(short[1]);
      const text = short[2].trim();
      const terminal = text.slice(-1);
      if (count <= 3 && (terminal === "。" || terminal === "！" || terminal === "？")) return "advisory";
      return "binding";
    }
    const long = RE_TOO_LONG.exec(reason);
    if (long) {
      
      return Number(long[1]) <= bandCapFor(book) ? "advisory" : "binding";
    }
    return "binding"; 
  }
  
  return "binding";
}
