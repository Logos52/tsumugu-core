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

const SOURCE_PRIORITY: Record<ExtractionSource, number> = {
  qwen: 5,
  v2: 4,
  composer: 3,
  grok: 2,
  json: 1,
};

interface TaggedPoint {
  source: ExtractionSource;
  point: GrammarPoint;
  key: string;
}

interface LessonBucketKey {
  book: number;
  lesson: number;
}

function lessonKey(book: number, lesson: number): string {
  return `${book}:${lesson}`;
}

function parseLessonKey(key: string): LessonBucketKey {
  const [book, lesson] = key.split(":");
  return { book: Number(book), lesson: Number(lesson) };
}

function chooseRepresentative(points: TaggedPoint[]): TaggedPoint {
  return [...points].sort((a, b) => {
    const priorityDiff = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.point.pattern_id.localeCompare(b.point.pattern_id);
  })[0]!;
}

function clusterWithinLesson(points: TaggedPoint[]): TaggedPoint[][] {
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

function buildMergedPoint(
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

function sanitizeSlug(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 12)
    .toLowerCase() || "p";
}

function makeCanonicalPatternId(book: number, lesson: number, nameZh: string): string {
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

  // Robust dedup + canonical pattern_id: sources have collisions/bad ids (e.g. trailing -, internal dups in v2).
  // Use lesson+name based key for uniqueness; regenerate colliding/empty ids. One authoritative set.
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
      // absolute guard, should not reach
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

export function renderReconcileReport(
  summary: ReconcileSummary,
  conflicts: LessonAssignmentConflict[],
  mergedPoints: MergedGrammarPoint[],
): string {
  const lines: string[] = [
    "# ACCC Grammar Index Reconcile Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Total merged points: **${summary.totalPoints}**`,
    `- Confirmed: **${summary.confirmed}**`,
    `- Review: **${summary.review}**`,
    `- Orphans (agreement = 1): **${summary.orphans}**`,
    `- Lesson-assignment conflicts: **${summary.lessonConflicts}**`,
    "",
    "### Source counts",
    "",
    "| Source | Points |",
    "| --- | ---: |",
  ];

  for (const source of EXTRACTION_SOURCES) {
    lines.push(`| ${source} | ${summary.bySource[source]} |`);
  }

  lines.push("", "## Counts per book/lesson", "", "| Book | Lesson | Points |", "| ---: | ---: | ---: |");
  for (const row of summary.byBookLesson) {
    lines.push(`| ${row.book} | ${row.lesson} | ${row.count} |`);
  }

  lines.push("", "## Lesson-assignment conflicts", "");
  if (conflicts.length === 0) {
    lines.push("_None detected._");
  } else {
    for (const [index, conflict] of conflicts.entries()) {
      lines.push(
        `### ${index + 1}. ${conflict.name_zh}`,
        "",
        `- Structure: \`${conflict.structure_template}\``,
        `- Sources involved: ${conflict.sources.join(", ")}`,
        "",
        "| Book | Lesson | Sources |",
        "| ---: | ---: | --- |",
      );
      for (const assignment of conflict.assignments) {
        lines.push(
          `| ${assignment.book} | ${assignment.lesson} | ${assignment.sources.join(", ")} |`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Orphans (agreement = 1)", "");
  const orphans = mergedPoints.filter((point) => point.agreement === 1);
  if (orphans.length === 0) {
    lines.push("_None detected._");
  } else {
    lines.push("| Book | Lesson | Name | Source | Pattern ID |", "| ---: | ---: | --- | --- | --- |");
    for (const orphan of orphans) {
      lines.push(
        `| ${orphan.book} | ${orphan.lesson} | ${orphan.name_zh} | ${orphan.sources[0]} | ${orphan.pattern_id} |`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}