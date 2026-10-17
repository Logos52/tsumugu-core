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

import { fuzzyMatchGrammarPoint } from "./fuzzy-match.js";

import type { TaggedPoint } from "./reconcile.part4.js";

import { buildMergedPoint, chooseRepresentative, clusterWithinLesson, detectLessonAssignmentConflicts, lessonKey, makeCanonicalPatternId, parseLessonKey, sanitizeSlug } from "./reconcile.part3.js";

export function reconcileGrammarIndexes(
  indexes: Record<ExtractionSource, GrammarIndexFile>,
): {
  merged: MergedGrammarIndexFile;
  conflicts: LessonAssignmentConflict[];
  summary: ReconcileSummary;
} {
  const taggedPoints: TaggedPoint[] = [];
  const bySource = {} as Record<ExtractionSource, number>;

  for (const source of EXTRACTION_SOURCES) {
    const file = indexes[source];
    bySource[source] = file.points.length;
    file.points.forEach((point, index) => {
      taggedPoints.push({
        source,
        point,
        key: `${source}:${index}`,
      });
    });
  }

  const lessonBuckets = new Map<string, TaggedPoint[]>();
  for (const tagged of taggedPoints) {
    const key = lessonKey(tagged.point.book, tagged.point.lesson);
    const bucket = lessonBuckets.get(key) ?? [];
    bucket.push(tagged);
    lessonBuckets.set(key, bucket);
  }

  const conflicts = detectLessonAssignmentConflicts(taggedPoints);

  const mergedPoints: MergedGrammarPoint[] = [];
  const sortedLessonKeys = [...lessonBuckets.keys()].sort((a, b) => {
    const left = parseLessonKey(a);
    const right = parseLessonKey(b);
    return left.book - right.book || left.lesson - right.lesson;
  });

  for (const bucketKey of sortedLessonKeys) {
    const bucket = lessonBuckets.get(bucketKey)!;
    const clusters = clusterWithinLesson(bucket);
    for (const cluster of clusters) {
      const representative = chooseRepresentative(cluster);
      const conflict = conflicts.find((candidate) =>
        fuzzyMatchGrammarPoint(
          candidate.name_zh,
          candidate.structure_template,
          representative.point.name_zh,
          representative.point.structure_template,
        ),
      );
      mergedPoints.push(buildMergedPoint(cluster, conflict));
    }
  }

  mergedPoints.sort((a, b) => {
    if (a.book !== b.book) {
      return a.book - b.book;
    }
    if (a.lesson !== b.lesson) {
      return a.lesson - b.lesson;
    }
    return a.name_zh.localeCompare(b.name_zh, "zh-Hant");
  });

  
  
  const seenPatternIds = new Set<string>();
  const deduped: MergedGrammarPoint[] = [];
  for (const point of mergedPoints) {
    let pid = point.pattern_id?.trim();
    const baseKey = `${point.book}:${point.lesson}:${sanitizeSlug(point.name_zh)}`;
    if (!pid || seenPatternIds.has(pid)) {
      pid = makeCanonicalPatternId(point.book, point.lesson, point.name_zh);
      let suffix = 0;
      while (seenPatternIds.has(pid)) {
        suffix += 1;
        pid = `${makeCanonicalPatternId(point.book, point.lesson, point.name_zh)}-${suffix}`;
      }
      point.pattern_id = pid;
    }
    if (seenPatternIds.has(pid)) {
      
      continue;
    }
    seenPatternIds.add(pid);
    deduped.push(point);
  }
  mergedPoints.length = 0;
  mergedPoints.push(...deduped);

  const byBookLessonMap = new Map<string, number>();
  for (const point of mergedPoints) {
    const key = lessonKey(point.book, point.lesson);
    byBookLessonMap.set(key, (byBookLessonMap.get(key) ?? 0) + 1);
  }

  const summary: ReconcileSummary = {
    totalPoints: mergedPoints.length,
    bySource,
    confirmed: mergedPoints.filter((point) => point.status === "confirmed").length,
    review: mergedPoints.filter((point) => point.status === "review").length,
    orphans: mergedPoints.filter((point) => point.agreement === 1).length,
    lessonConflicts: conflicts.length,
    byBookLesson: [...byBookLessonMap.entries()]
      .map(([key, count]) => {
        const { book, lesson } = parseLessonKey(key);
        return { book, lesson, count };
      })
      .sort((a, b) => a.book - b.book || a.lesson - b.lesson),
  };

  const merged: MergedGrammarIndexFile = {
    source: "ACCC",
    edition: "1st",
    extracted: new Date().toISOString().slice(0, 10),
    reconciled: true,
    points: mergedPoints,
  };

  return { merged, conflicts, summary };
}
