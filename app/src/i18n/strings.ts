
import type { StringsA } from "./stringsKeysA.js";
import type { StringsB } from "./stringsKeysB.js";
import { enA } from "./stringsEnA.js";
import { enB } from "./stringsEnB.js";
import { viA } from "./stringsViA.js";
import { viB } from "./stringsViB.js";

type Locale = "en" | "vi";

export interface Strings extends StringsA, StringsB {}

const EN: Strings = { ...enA, ...enB };
const VI: Strings = { ...viA, ...viB };

const all: Record<Locale, any> = { en: EN, vi: VI };

export function getLocale(uiLang: Locale | string | undefined): Locale {
  return uiLang === "vi" ? "vi" : "en";
}

function t(locale: Locale, key: keyof Strings): string {
  return all[locale]?.[key] ?? all.en[key] ?? String(key);
}

export function tKey(key: string, locale: Locale = "en"): string {
  
  if (key in (all[locale] || {})) return (all[locale])[key] ?? (all.en)[key] ?? key;
  
  const flat = (globalThis as any).__TSG_FLAT_STRINGS;
  if (flat && flat[key]) return flat[key][locale] ?? flat[key].en ?? key;
  return String(key);
}

const getLocaleFromRail = getLocale;

export function resolveUiLocale(explicit?: Locale): Locale {
  if (explicit) return explicit;
  const root = document.documentElement;
  if (root?.dataset?.uiLang === "vi" || root?.dataset?.uiLang === "en") {
    return root.dataset.uiLang;
  }
  return root?.dataset?.rail === "vi" ? "vi" : "en";
}

function setUiLang(lang: Locale): void {
  document.documentElement.dataset.uiLang = lang;
  applyI18n(document, lang);
}

export function applyI18n(root: HTMLElement | Document = document, locale?: Locale): void {
  const loc = resolveUiLocale(locale);
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n!;
    el.textContent = tKey(k, loc);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const k = el.dataset.i18nTitle!;
    el.title = tKey(k, loc);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-placeholder]").forEach((el) => {
    const k = el.dataset.i18nPlaceholder!;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.placeholder = tKey(k, loc);
    }
  });
}

export function getCurrentLocale(): Locale {
  try {
    return resolveUiLocale();
  } catch {
    return "vi";
  }
}

export function tFormat(key: string, locale: Locale, vars: Record<string, string | number>): string {
  let out = tKey(key, locale);
  for (const [name, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${name}}`, String(value));
  }
  return out;
}

const STRINGS: Record<string, { en: string; vi: string }> = {
  "nav.home": { en: "Home", vi: "Trang chủ" },
  "nav.library": { en: "Library", vi: "Thư viện" },
  "nav.grammar": { en: "Grammar", vi: "Ngữ pháp" },
  "nav.flashcards": { en: "Review", vi: "Ôn tập" },
  "nav.account": { en: "Account", vi: "Tài khoản" },
  "nav.login": { en: "Log in", vi: "Đăng nhập" },
  "brand.name": { en: "Tsumugu", vi: "Tsumugu" },
  "brand.tag": { en: "Beta", vi: "Beta" },
  "rail.label": { en: "Rail", vi: "Rail" },
  "rail.en": { en: "EN", vi: "EN" },
  "rail.vi": { en: "VI", vi: "VI" },
  "action.start": { en: "Start reading", vi: "Bắt đầu đọc" },
  "action.browse": { en: "Browse library", vi: "Duyệt thư viện" },
};

(globalThis as any).__TSG_FLAT_STRINGS = STRINGS;

function tLegacy(key: string, locale: Locale = "en"): string {
  const entry = STRINGS[key];
  if (entry) return entry[locale] ?? entry.en ?? key;
  return tKey(key, locale);
}
