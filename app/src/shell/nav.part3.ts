import { FEATURES } from "../config/features.js";

import { renderAppFooter } from "./footer.js";

import { applyI18n, tKey as t } from "../i18n/strings.js";

export type NavSurface = "home" | "library" | "account" | "reader" | "about";

export interface TopNavController {
  el: HTMLElement;
  setRail(rail: "en" | "vi"): void;
  setActive(surface: NavSurface): void;
  setLoggedIn(loggedIn: boolean): void;
  destroy(): void;
}

export const SYNC_ON = FEATURES.sync === true;

export function setActiveClass(header: HTMLElement, surface: NavSurface) {
  header.querySelectorAll<HTMLElement>(".navlink").forEach((a) => {
    const on = a.dataset.nav === surface;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

export function wireAppFooter(): void {
  const footer = document.getElementById("app-footer");
  if (!footer) return;
  renderAppFooter();
  applyI18n(footer);
}
