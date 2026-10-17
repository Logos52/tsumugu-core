import type { CompanionLesson } from "./companionShelf.part2.js";

export function isCompanionLesson(value: unknown): value is CompanionLesson {
  return !!value && typeof (value as CompanionLesson).unit === "string";
}
