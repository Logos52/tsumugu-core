

import { el, clear } from "../ui/dom.js";
import { applyI18n, getCurrentLocale, tKey as t } from "../i18n/strings.js";

export type StaticPage = "about" | "privacy" | "terms" | "feedback";


export function staticPageFromHash(hash: string): StaticPage | null {
  const clean = (hash || "").replace(/^#/, "").toLowerCase();
  if (clean === "about" || clean === "colophon" || clean === "method") return "about";
  if (clean === "privacy") return "privacy";
  if (clean === "terms") return "terms";
  if (clean === "feedback") return "feedback";
  return null;
}

function pageBody(page: StaticPage, locale: ReturnType<typeof getCurrentLocale>): string {
  const body = t(`${page}.body`, locale);
  if (page === "feedback") {
    const mail = "hello@tsumugu.cc";
    return `${body}<p><a href="mailto:${mail}">${mail}</a></p>`;
  }
  if (page === "about") {
    
    const method = t("method.body", locale);
    const colophon = t("colophon.body", locale);
    const methodTitle = t("method.title", locale);
    const colophonTitle = t("colophon.title", locale);
    return `${body}<h3>${methodTitle}</h3>${method}<h3>${colophonTitle}</h3>${colophon}`;
  }
  if (!body) return "";
  return body;
}

export function mountStaticPage(host: HTMLElement, page: StaticPage): HTMLElement {
  clear(host);
  const locale = getCurrentLocale();
  const wrap = el("article", { class: "tsg-static-page", id: `${page}-surface` });
  wrap.append(
    el("h2", { text: t(`${page}.title`, locale) }),
    el("div", { class: "tsg-static-body", html: pageBody(page, locale) }),
  );
  host.append(wrap);
  applyI18n(wrap, locale);
  return wrap;
}


export function renderStaticPage(
  kind: StaticPage,
  root: HTMLElement,
  _rail: "en" | "vi" = "vi",
): void {
  mountStaticPage(root, kind);
}
