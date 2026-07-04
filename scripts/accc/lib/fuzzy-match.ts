import {
  normalizeNameZh,
  normalizeStructureTemplate,
  tokenizeStructure,
} from "./normalize.js";

const STRUCTURE_SIMILARITY_THRESHOLD = 0.62;
const NAME_SIMILARITY_THRESHOLD = 0.85;

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection += 1;
    }
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let i = 0; i < rows; i += 1) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  const distance = matrix[a.length]![b.length]!;
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

export function structureSimilarity(a: string, b: string): number {
  const normA = normalizeStructureTemplate(a);
  const normB = normalizeStructureTemplate(b);

  if (normA === normB) {
    return 1;
  }
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }

  const tokenScore = jaccardSimilarity(
    tokenizeStructure(normA),
    tokenizeStructure(normB),
  );
  const editScore = levenshteinRatio(normA, normB);
  return Math.max(tokenScore, editScore);
}

export function nameSimilarity(a: string, b: string): number {
  const normA = normalizeNameZh(a);
  const normB = normalizeNameZh(b);

  if (normA === normB) {
    return 1;
  }
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.92;
  }
  return levenshteinRatio(normA, normB);
}

export function fuzzyMatchGrammarPoint(
  nameA: string,
  structureA: string,
  nameB: string,
  structureB: string,
): boolean {
  const nameScore = nameSimilarity(nameA, nameB);
  const structureScore = structureSimilarity(structureA, structureB);

  if (nameScore >= 0.98 && structureScore >= 0.45) {
    return true;
  }
  if (nameScore >= NAME_SIMILARITY_THRESHOLD && structureScore >= STRUCTURE_SIMILARITY_THRESHOLD) {
    return true;
  }
  if (nameScore >= 0.75 && structureScore >= 0.9) {
    return true;
  }

  return false;
}