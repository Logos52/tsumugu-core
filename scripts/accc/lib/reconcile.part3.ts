import { fuzzyMatchGrammarPoint } from "./fuzzy-match.js";

import {
  EXTRACTION_SOURCES,
  type ExtractionSource,
  type GrammarIndexFile,
  type GrammarPoint,
  type LessonAssignmentConflict,
  type MergedGrammarIndexFile,
  type MergedGrammarPoint,
  type ReconcileSummary,
} from "./grammar-index-types.js";

import { SOURCE_PRIORITY } from "./reconcile.part4.js";

import type { TaggedPoint } from "./reconcile.part4.js";

interface LessonBucketKey {
  book: number;
  lesson: number;
}

export function lessonKey(book: number, lesson: number): string {
  return `${book}:${lesson}`;
}

export function parseLessonKey(key: string): LessonBucketKey {
  const [book, lesson] = key.split(":");
  return { book: Number(book), lesson: Number(lesson) };
}

export function chooseRepresentative(points: TaggedPoint[]): TaggedPoint {
  return [...points].sort((a, b) => {
    const priorityDiff = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.point.pattern_id.localeCompare(b.point.pattern_id);
  })[0]!;
}

export function clusterWithinLesson(points: TaggedPoint[]): TaggedPoint[][] {
  const clusters: TaggedPoint[][] = [];

  for (const tagged of points) {
    let matchedCluster: TaggedPoint[] | undefined;
    for (const cluster of clusters) {
      const representative = cluster[0]!;
      if (
        fuzzyMatchGrammarPoint(
          representative.point.name_zh,
          representative.point.structure_template,
          tagged.point.name_zh,
          tagged.point.structure_template,
        )
      ) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      const duplicate = matchedCluster.some(
        (existing) =>
          existing.source === tagged.source &&
          existing.point.pattern_id === tagged.point.pattern_id,
      );
      if (!duplicate) {
        matchedCluster.push(tagged);
      }
    } else {
      clusters.push([tagged]);
    }
  }

  return clusters;
}

export function buildMergedPoint(
  cluster: TaggedPoint[],
  lessonConflict?: LessonAssignmentConflict,
): MergedGrammarPoint {
  const representative = chooseRepresentative(cluster);
  const sources = [...new Set(cluster.map((item) => item.source))].sort(
    (a, b) => SOURCE_PRIORITY[b] - SOURCE_PRIORITY[a],
  );
  const agreement = sources.length;
  const lessonUnanimous =
    new Set(cluster.map((item) => lessonKey(item.point.book, item.point.lesson))).size === 1;
  const status: MergedGrammarPoint["status"] =
    agreement >= 3 && lessonUnanimous ? "confirmed" : "review";

  const merged: MergedGrammarPoint = {
    ...representative.point,
    sources,
    agreement,
    status,
  };

  if (lessonConflict) {
    merged.lesson_assignments = lessonConflict.assignments;
  }

  return merged;
}

export function sanitizeSlug(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 12)
    .toLowerCase() || "p";
}

export function makeCanonicalPatternId(book: number, lesson: number, nameZh: string): string {
  const ll = String(lesson).padStart(2, "0");
  const slug = sanitizeSlug(nameZh);
  return `accc-b${book}l${ll}-${slug}`;
}

export function detectLessonAssignmentConflicts(
  taggedPoints: TaggedPoint[],
): LessonAssignmentConflict[] {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const parentKey = parent.get(key);
    if (!parentKey || parentKey === key) {
      parent.set(key, key);
      return key;
    }
    const root = find(parentKey);
    parent.set(key, root);
    return root;
  };
  const union = (a: string, b: string): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  };

  for (let i = 0; i < taggedPoints.length; i += 1) {
    for (let j = i + 1; j < taggedPoints.length; j += 1) {
      const left = taggedPoints[i]!;
      const right = taggedPoints[j]!;
      if (
        fuzzyMatchGrammarPoint(
          left.point.name_zh,
          left.point.structure_template,
          right.point.name_zh,
          right.point.structure_template,
        )
      ) {
        union(left.key, right.key);
      }
    }
  }

  const groups = new Map<string, TaggedPoint[]>();
  for (const tagged of taggedPoints) {
    const root = find(tagged.key);
    const bucket = groups.get(root) ?? [];
    bucket.push(tagged);
    groups.set(root, bucket);
  }

  const conflicts: LessonAssignmentConflict[] = [];
  for (const group of groups.values()) {
    const assignmentMap = new Map<string, ExtractionSource[]>();
    for (const tagged of group) {
      const key = lessonKey(tagged.point.book, tagged.point.lesson);
      const sources = assignmentMap.get(key) ?? [];
      if (!sources.includes(tagged.source)) {
        sources.push(tagged.source);
      }
      assignmentMap.set(key, sources);
    }

    if (assignmentMap.size <= 1) {
      continue;
    }

    const representative = chooseRepresentative(group);
    conflicts.push({
      name_zh: representative.point.name_zh,
      structure_template: representative.point.structure_template,
      assignments: [...assignmentMap.entries()]
        .map(([key, sources]) => {
          const { book, lesson } = parseLessonKey(key);
          return { book, lesson, sources: sources.sort() };
        })
        .sort((a, b) => a.book - b.book || a.lesson - b.lesson),
      sources: [...new Set(group.map((item) => item.source))].sort(),
    });
  }

  return conflicts.sort((a, b) => a.name_zh.localeCompare(b.name_zh, "zh-Hant"));
}
