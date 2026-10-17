
export function isCircularZhDef(
  headword: string,
  gloss: string,
  illustration?: string,
): boolean {
  if (headword === "") return false;
  if (gloss.includes(headword)) return true;
  if (illustration !== undefined && illustration.includes(headword)) return true;
  return false;
}

export function isEmptyZhDef(headword: string, gloss: string): boolean {
  const trimmed = gloss.trim();
  if (trimmed === "") return true;
  if (headword === "") return false;
  const stripped = trimmed.split(headword).join("").replace(/\s+/g, "").trim();
  return stripped.length === 0;
}