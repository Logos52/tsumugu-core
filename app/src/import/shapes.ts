export type VocabStatus = "1" | "2" | "3" | "4" | "known" | "ignored";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isVocabStatus(status: string): status is VocabStatus {
  return status === "1" || status === "2" || status === "3" || status === "4" || status === "known" || status === "ignored";
}
