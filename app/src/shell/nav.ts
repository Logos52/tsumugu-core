/**
 * App shell navigation: Verdigris TopNav (single-palette Bound Volume direction).
 * Sticky header = brand (紡 seal + Tsumugu + Beta pill) · bilingual Han+English nav
 * (Home · 課本架 Library · 讀 Reader · 誌 Blog · About) · rail switch · import ·
 * ⌘K search hint · 設 (settings popover) · Sync · light/dark theme toggle.
 * Grammar + Flashcards links are gone; the dictionary is never a nav tab
 * (it is reached via ⌘K and /c/ links). Vanilla DOM; wires into router + settings.
 *
 * The palette switcher is retired with the single-palette pick; only the theme
 * (light/dark) toggle remains. Brand lockup = 紡 seal + "Tsumugu" + a small green
 * "Beta" pill. `誌 Blog` leaves the SPA to the static /blog/ index (router.blogHref).
 * Chrome CSS (`.tsg-topnav`, `.primary-nav`, `.site-footer`, …) lives in the app
 * stylesheets; this module renders the markup + wires the JS.
 */

import { applyI18n, tKey as t } from "../i18n/strings.js";
import type { ReaderSettings } from "../app/settings.js";
import { applySettingsToRoot } from "../app/settings.js";
import { blogHref } from "../app/router.js";
import { FEATURES } from "../config/features.js";
import { mountSettingsView } from "../settings/SettingsView.js";
import { renderAppFooter } from "./footer.js";

/**
 * Surfaces the header can drive via {@link TopNavController.setActive}. `about`
 * is included so the About nav item carries `aria-current`; `blog` is not a
 * surface here (it is a full-page link out of the SPA).
 */
export type NavSurface = "home" | "library" | "account" | "reader" | "about";

export interface TopNavController {
  el: HTMLElement;
  setRail(rail: "en" | "vi"): void;
  setActive(surface: NavSurface): void;
  setLoggedIn(loggedIn: boolean): void;
  destroy(): void;
}

/** Sync nav entry shows only when the local Sync panel ships (VITE_FEATURE_SYNC). */
const SYNC_ON = FEATURES.sync === true;

export function createTopNav(opts: {
  onNavigate: (s: NavSurface) => void;
  onRailChange: (rail: "en" | "vi") => void;
  onPaletteChange: (p: ReaderSettings["palette"]) => void;
  onThemeToggle: () => void;
  onImport: () => void;
  onCommandK: () => void;
  onContinue: () => void;
  /** Settings popover content (Lane C's SettingsView). */
  getSettings: () => ReaderSettings;
  onSettingsChange: (patch: Partial<ReaderSettings>) => void;
  initialRail?: "en" | "vi";
  initialLoggedIn?: boolean;
}): TopNavController {
  const rail = opts.initialRail ?? "en";

  const header = document.createElement("header");
  header.className = "topnav tsg-topnav";

  // a11y skip link
  const skip = document.createElement("a");
  skip.href = "#surface";
  skip.className = "tsg-skip-link";
  skip.textContent = t("a11y.skip", document.documentElement.dataset.rail === "vi" ? "vi" : "en") || "Skip to content";
  skip.setAttribute("aria-label", "Skip navigation");
  header.append(skip);

  header.innerHTML += `
    <a class="brand" href="#home" data-nav="home" title="Tsumugu Beta" data-i18n-title="brand.name">
      <span class="knot">紡</span>
      <span class="word">Tsumugu</span>
      <span class="beta-pill">Beta</span>
    </a>

    <nav class="primary-nav" aria-label="Primary">
      <a href="#home" class="navlink" data-nav="home">Home</a>
      <a href="#library" class="navlink" data-nav="library">課本架 <span class="en">Library</span></a>
      <a href="#read" class="navlink" data-nav="reader">讀 <span class="en">Reader</span></a>
      <a href="${blogHref()}" class="navlink" data-nav="blog">誌 <span class="en">Blog</span></a>
      <a href="#about" class="navlink" data-nav="about">About</a>
    </nav>

    <div class="spacer"></div>

    <!-- Global rail switcher (EN ⇄ VI): drives locale + reader defaults + hero chooser -->
    <div class="seg brandseg rail-switch" id="railSeg" title="English learner ⇄ Vietnamese learner" data-i18n-title="rail.label">
      <span class="lbl" data-i18n="rail.label">Rail</span>
      <button type="button" data-rail="vi" class="${rail === "vi" ? "on" : ""}" data-i18n="rail.vi">VI 越</button>
      <button type="button" data-rail="en" class="${rail === "en" ? "on" : ""}" data-i18n="rail.en">EN 英</button>
    </div>

    <button class="iconbtn" id="importBtn" type="button" title="Import text" data-i18n-title="nav.import">📋</button>
    <button class="khint" id="cmdkBtn" type="button" title="Search (⌘K)" data-i18n-title="nav.search"><kbd>⌘K</kbd><span class="khint-tx">搜尋 <span class="en">search</span></span></button>
    <button class="iconbtn" id="settingsBtn" type="button" title="Settings" data-i18n-title="settings.title" aria-haspopup="dialog" aria-expanded="false">設</button>
    ${SYNC_ON ? `<a href="#account" class="navlink sync-link" data-nav="account" data-surface="account" data-i18n="nav.sync">Sync</a>` : ""}
    <button class="iconbtn theme-toggle" id="themeBtn" type="button" title="Light / dark" data-i18n-title="settings.theme">☀</button>
  `;

  // Settings popover (mounts Lane C's SettingsView on first open)
  const settingsPop = document.createElement("div");
  settingsPop.className = "tsg-settings-pop";
  settingsPop.setAttribute("role", "dialog");
  settingsPop.hidden = true;
  header.append(settingsPop);
  let settingsMounted = false;

  // ── Nav links ──────────────────────────────────────────────────────────
  // SPA routes are intercepted (preventDefault) so an existing deep link
  // (e.g. `#read=<path>`) is not clobbered by the anchor's bare hash. `blog`
  // is a real navigation out of the SPA to the static /blog/ index, so its
  // click is left to the browser.
  header.querySelectorAll<HTMLAnchorElement>(".navlink, .brand").forEach((link) => {
    link.addEventListener("click", (ev) => {
      const nav = link.dataset.nav;
      if (nav === "blog") return; // full-page navigation to /blog/
      if (nav === "continue") {
        ev.preventDefault();
        opts.onContinue();
      } else if (
        nav === "home" ||
        nav === "library" ||
        nav === "account" ||
        nav === "reader" ||
        nav === "about"
      ) {
        ev.preventDefault();
        opts.onNavigate(nav);
      }
    });
  });

  // ── Rail switcher ──────────────────────────────────────────────────────
  const railSeg = header.querySelector<HTMLDivElement>("#railSeg")!;
  const railBtns = railSeg.querySelectorAll<HTMLButtonElement>("button[data-rail]");
  railBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextRail = btn.dataset.rail as "en" | "vi";
      railBtns.forEach((b) => b.classList.toggle("on", b === btn));
      document.documentElement.dataset.rail = nextRail;
      const defaults = nextRail === "vi" ? { reading: "hv", gloss: "vi" } : { reading: "py", gloss: "en" };
      Object.assign(document.documentElement.dataset, defaults);
      opts.onRailChange(nextRail);
      applyI18n(header);
    });
  });

  // ── Theme toggle ───────────────────────────────────────────────────────
  const themeBtn = header.querySelector<HTMLButtonElement>("#themeBtn")!;
  function updateThemeBtn(theme: "light" | "dark") {
    themeBtn.textContent = theme === "dark" ? "☾" : "☀";
  }
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    updateThemeBtn(next);
    opts.onThemeToggle();
  });

  // ── Import + ⌘K ────────────────────────────────────────────────────────
  header.querySelector<HTMLButtonElement>("#importBtn")?.addEventListener("click", () => opts.onImport());
  header.querySelector<HTMLButtonElement>("#cmdkBtn")?.addEventListener("click", () => opts.onCommandK());

  // ── 設 settings popover ─────────────────────────────────────────────────
  const settingsBtn = header.querySelector<HTMLButtonElement>("#settingsBtn")!;
  function closeSettings() {
    settingsPop.hidden = true;
    settingsBtn.setAttribute("aria-expanded", "false");
  }
  function openSettings() {
    if (!settingsMounted) {
      mountSettingsView(settingsPop, {
        getSettings: opts.getSettings,
        onChange: opts.onSettingsChange,
      });
      settingsMounted = true;
    }
    settingsPop.hidden = false;
    settingsBtn.setAttribute("aria-expanded", "true");
  }
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (settingsPop.hidden) openSettings();
    else closeSettings();
  });
  document.addEventListener("pointerdown", (ev) => {
    if (settingsPop.hidden) return;
    const target = ev.target;
    if (target instanceof Node && (settingsPop.contains(target) || settingsBtn.contains(target))) return;
    closeSettings();
  });

  // ── initial state ──────────────────────────────────────────────────────
  updateThemeBtn((document.documentElement.dataset.theme as "light" | "dark") || "light");
  setActiveClass(header, "home");

  applyI18n(header);
  wireAppFooter();

  function setActive(surface: NavSurface) {
    setActiveClass(header, surface);
    document.documentElement.dataset.page = surface;
  }

  function setRail(next: "en" | "vi") {
    railBtns.forEach((b) => b.classList.toggle("on", b.dataset.rail === next));
    document.documentElement.dataset.rail = next;
  }

  function setLoggedIn(_li: boolean) {
    // Sync/account label is Lane C's Sync surface; no auth chip in v1 chrome.
  }

  function destroy() {
    header.remove();
  }

  return { el: header, setRail, setActive, setLoggedIn, destroy };
}

function setActiveClass(header: HTMLElement, surface: NavSurface) {
  header.querySelectorAll<HTMLElement>(".navlink").forEach((a) => {
    const on = a.dataset.nav === surface;
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/** Helper: apply settings patch from global rail etc. */
export function syncRailToSettings(rail: "en" | "vi", onPatch: (p: Partial<ReaderSettings>) => void): void {
  const patch: Partial<ReaderSettings> = {
    rail,
    ...(rail === "vi" ? { reading: "hv", gloss: "vi" } : { reading: "py", gloss: "en" }),
  };
  onPatch(patch);
  applySettingsToRoot({
    ...({ rail: "en", script: "trad", reading: "py", gloss: "en", theme: "light", palette: "seal", knownStateOn: false } as ReaderSettings),
    ...patch,
  });
}

/** Render the shared site footer + apply i18n (links use hash routes / static blog). */
export function wireAppFooter(): void {
  const footer = document.getElementById("app-footer");
  if (!footer) return;
  renderAppFooter();
  applyI18n(footer);
}
