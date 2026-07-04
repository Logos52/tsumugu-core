import {
  type GrammarIndexFile,
  type GrammarPoint,
  type ValidationError,
  type ValidationResult,
} from "./grammar-index-types.js";
import { expectedCumulativeThrough } from "./normalize.js";

const VALID_TOCFL_BANDS = new Set(["A", "B", "C"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validatePoint(
  point: unknown,
  index: number,
  options: { requireStatus: boolean },
): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `points[${index}]`;

  if (!isRecord(point)) {
    return [{ path, message: "point must be an object" }];
  }

  const book = point.book;
  const lesson = point.lesson;
  if (typeof book !== "number" || !Number.isInteger(book) || book < 1) {
    errors.push({ path: `${path}.book`, message: "book must be a positive integer" });
  }
  if (typeof lesson !== "number" || !Number.isInteger(lesson) || lesson < 1) {
    errors.push({ path: `${path}.lesson`, message: "lesson must be a positive integer" });
  }

  if (typeof point.pattern_id !== "string" || point.pattern_id.trim() === "") {
    errors.push({ path: `${path}.pattern_id`, message: "pattern_id must be a non-empty string" });
  }
  if (typeof point.name_zh !== "string" || point.name_zh.trim() === "") {
    errors.push({ path: `${path}.name_zh`, message: "name_zh must be a non-empty string" });
  }
  if (typeof point.structure_template !== "string" || point.structure_template.trim() === "") {
    errors.push({
      path: `${path}.structure_template`,
      message: "structure_template must be a non-empty string",
    });
  }
  if (typeof point.cumulative_through !== "string" || point.cumulative_through.trim() === "") {
    errors.push({
      path: `${path}.cumulative_through`,
      message: "cumulative_through must be a non-empty string",
    });
  } else if (
    typeof book === "number" &&
    Number.isInteger(book) &&
    typeof lesson === "number" &&
    Number.isInteger(lesson)
  ) {
    const expected = expectedCumulativeThrough(book, lesson);
    if (point.cumulative_through !== expected) {
      errors.push({
        path: `${path}.cumulative_through`,
        message: `cumulative_through must be ${expected}, got ${point.cumulative_through}`,
      });
    }
  }

  if (typeof point.tocfl_band !== "string" || !VALID_TOCFL_BANDS.has(point.tocfl_band)) {
    errors.push({
      path: `${path}.tocfl_band`,
      message: `tocfl_band must be one of ${[...VALID_TOCFL_BANDS].join(", ")}`,
    });
  }

  if (options.requireStatus) {
    if (point.status !== "confirmed" && point.status !== "review") {
      errors.push({
        path: `${path}.status`,
        message: 'status must be "confirmed" or "review" when validating merged index',
      });
    }
  } else if ("status" in point) {
    errors.push({
      path: `${path}.status`,
      message: "status must not be present in FINAL index",
    });
  }

  return errors;
}

export function validateGrammarIndex(
  data: unknown,
  options: { merged?: boolean } = {},
): ValidationResult {
  const errors: ValidationError[] = [];
  const requireStatus = options.merged === true;

  if (!isRecord(data)) {
    return { ok: false, errors: [{ path: "$", message: "index must be an object" }] };
  }

  if (typeof data.source !== "string" || data.source.trim() === "") {
    errors.push({ path: "source", message: "source must be a non-empty string" });
  }
  if (typeof data.edition !== "string" || data.edition.trim() === "") {
    errors.push({ path: "edition", message: "edition must be a non-empty string" });
  }
  if (typeof data.extracted !== "string" || data.extracted.trim() === "") {
    errors.push({ path: "extracted", message: "extracted must be a non-empty string" });
  }
  if (!Array.isArray(data.points)) {
    errors.push({ path: "points", message: "points must be an array" });
    return { ok: false, errors };
  }

  const seenPatternIds = new Map<string, number>();
  data.points.forEach((point, index) => {
    for (const error of validatePoint(point, index, { requireStatus })) {
      errors.push(error);
    }

    if (isRecord(point) && typeof point.pattern_id === "string") {
      const firstIndex = seenPatternIds.get(point.pattern_id);
      if (firstIndex !== undefined) {
        errors.push({
          path: `points[${index}].pattern_id`,
          message: `duplicate pattern_id ${point.pattern_id} (first seen at points[${firstIndex}])`,
        });
      } else {
        seenPatternIds.set(point.pattern_id, index);
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map((error) => `${error.path}: ${error.message}`).join("\n");
}

export function assertValidGrammarIndex(
  data: unknown,
  options: { merged?: boolean } = {},
): GrammarIndexFile {
  const result = validateGrammarIndex(data, options);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result.errors));
  }
  return data as GrammarIndexFile;
}

export function createValidFixturePoint(overrides: Partial<GrammarPoint> = {}): GrammarPoint {
  return {
    pattern_id: "accc-b1l01-fixture",
    name_zh: "呢",
    name_pinyin: "ne",
    structure_template: "S1 V O , S2 呢 ?",
    function_tag: "question / interrogative",
    book: 1,
    lesson: 1,
    cumulative_through: "b1l01",
    source_ref: {
      pdf: "fixture.pdf",
      page: 1,
    },
    taxonomy_id: null,
    tocfl_band: "A",
    confidence: "high",
    extraction_method: "text",
    later_appearances: [],
    ...overrides,
  };
}