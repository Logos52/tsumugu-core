import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readText(path)) as T;
}

export async function writeText(path: string, data: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data, "utf8");
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeText(path, JSON.stringify(value, null, 2) + "\n");
}

export function nfcTerm(term: string): string {
  return term.normalize("NFC");
}

const FILESYSTEM_HOSTILE = /[\s/\\<>:"|?*]/;

export function encodingBasename(term: string, slug?: string): string {
  const nfc = nfcTerm(term);
  if (slug !== undefined && slug !== "") return slugify(slug);
  if (FILESYSTEM_HOSTILE.test(nfc)) {
    throw new Error(
      `term "${term}" contains filesystem-hostile characters; pass an explicit slug: override ` +
        `(see ARCHITECTURE.md §3 — e.g. frontmatter slug: for terms with /, whitespace, or symbols)`,
    );
  }
  const slugged = slugify(nfc);
  if (slugged !== nfc) {
    throw new Error(
      `term "${term}" cannot be used as a verbatim filename (slugify → "${slugged}"); ` +
        `pass an explicit slug: override (see ARCHITECTURE.md §3)`,
    );
  }
  return nfc;
}

export function encodingFilename(term: string, slug?: string): string {
  return encodingBasename(term, slug);
}

export function slugify(s: string): string {
  const trimmed = nfcTerm(s)
    .trim()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}\-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return trimmed || "untitled";
}
