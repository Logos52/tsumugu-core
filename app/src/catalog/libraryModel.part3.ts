import type { CatalogEntry } from "./types.js";

export type TopicKey = "food" | "family" | "city" | "travel" | "work" | "nature";

export type LibSort = "fit" | "new" | "short";

export type LibView = "gallery" | "table";

export type ReadingStatus = "in" | "stretch";

const KIND_FMT: Record<string, string> = {
  dialogue: "對話",
  story: "短文",
  explainer: "廣播",
  byo: "自訂",
};

export function formatLabel(entry: CatalogEntry): string {
  const title = entry.title ?? "";
  const idx = title.lastIndexOf("·");
  if (idx >= 0) {
    const suf = title.slice(idx + 1).trim().replace(/[一二三四五六七八九十百0-9]+$/u, "").trim();
    if (suf) return suf;
  }
  return KIND_FMT[entry.kind] ?? "短文";
}

export function descriptiveTitle(entry: CatalogEntry): string {
  const title = entry.title ?? entry.path;
  const idx = title.lastIndexOf("·");
  return (idx > 0 ? title.slice(0, idx) : title).trim() || title.trim();
}

export function bandNum(band: string): number {
  return band === "A1" ? 1 : band === "A2" ? 2 : band === "B1" ? 3 : 9;
}

const HAN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function hanNum(n: number): string {
  if (n < 0 || !Number.isFinite(n)) return String(n);
  if (n < 10) return HAN_DIGITS[n]!;
  if (n < 20) return n === 10 ? "十" : `十${HAN_DIGITS[n - 10]!}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${HAN_DIGITS[tens]!}十${ones ? HAN_DIGITS[ones]! : ""}`;
}

interface TopicMeta {
  zh: string;
  en: string;
  vi: string;
  
  v: string;
}

const TOPIC_META: Record<TopicKey, TopicMeta> = {
  food: { zh: "飲食", en: "Food & Markets", vi: "Ẩm thực & chợ", v: "var(--t-food)" },
  family: { zh: "家人", en: "Family & People", vi: "Gia đình & con người", v: "var(--t-family)" },
  city: { zh: "城市", en: "City Life", vi: "Đời sống thành phố", v: "var(--t-city)" },
  travel: { zh: "旅行", en: "Travel & Place", vi: "Du lịch & địa danh", v: "var(--t-travel)" },
  work: { zh: "工作", en: "Work & Study", vi: "Công việc & học tập", v: "var(--t-work)" },
  nature: { zh: "自然", en: "Nature & Seasons", vi: "Thiên nhiên & mùa", v: "var(--t-nature)" },
};
