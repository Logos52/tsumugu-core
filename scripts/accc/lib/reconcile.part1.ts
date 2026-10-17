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
