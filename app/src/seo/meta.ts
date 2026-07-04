/**
 * Per-locale document title + meta description for SPA surfaces.
 */

import { getLocale, tKey as t } from "../i18n/strings.js";
import type { Surface } from "../app/router.js";

export type SeoSurface = Surface;

const SEO_KEYS: Record<SeoSurface, { title: string; description: string }> = {
  home: { title: "seo.home.title", description: "seo.home.description" },
  library: { title: "seo.library.title", description: "seo.library.description" },
  account: { title: "seo.account.title", description: "seo.account.description" },
  reader: { title: "seo.reader.title", description: "seo.reader.description" },
  about: { title: "seo.about.title", description: "seo.about.description" },
  privacy: { title: "seo.privacy.title", description: "seo.privacy.description" },
  terms: { title: "seo.terms.title", description: "seo.terms.description" },
  feedback: { title: "seo.feedback.title", description: "seo.feedback.description" },
  // Blog is a static section: `#blog` redirects out of the SPA before any
  // in-app SEO is applied. Reuse the home strings to keep the map exhaustive.
  blog: { title: "seo.home.title", description: "seo.home.description" },
};

function setMetaDescription(content: string): void {
  let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!el) {
    el = document.createElement("meta");
    el.name = "description";
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Update `<title>`, meta description, and `<html lang>` from rail/locale. */
export function updateSeo(surface: SeoSurface, rail: "en" | "vi"): void {
  const locale = getLocale(rail);
  const keys = SEO_KEYS[surface] ?? SEO_KEYS.home;
  document.documentElement.lang = locale === "vi" ? "vi" : "en";
  document.title = t(keys.title, locale);
  setMetaDescription(t(keys.description, locale));
}