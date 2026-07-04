/** Collapse whitespace and normalize punctuation for fuzzy comparison. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[？?！!。．，,、；;：:·…]+/g, " ")
    .replace(/[＋+]/g, " + ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNameZh(nameZh: string): string {
  return normalizeText(nameZh)
    .replace(/\s+/g, "")
    .replace(/[（）()]/g, "");
}

export function normalizeStructureTemplate(template: string): string {
  return normalizeText(template)
    .replace(/\b(sentence|s|np|vp|obj|subj)\b/g, "s")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeStructure(template: string): string[] {
  return normalizeStructureTemplate(template)
    .split(/[\s+]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function expectedCumulativeThrough(book: number, lesson: number): string {
  return `b${book}l${String(lesson).padStart(2, "0")}`;
}