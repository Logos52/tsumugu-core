import { parsePreparedContent } from "@tsumugu/engine";
import { applyChromeLang, paintReadHead } from "./app/chrome.js";
import { createReaderState } from "./app/state.js";
import { applySettings, wireSeg } from "./app/toggles.js";
import { loadSettings, type ReaderSettings } from "./app/settings.js";
import { loadStore, getUserStore } from "./app/persist.js";
import { subscribeSession, getSession, restoreSession } from "./auth/session.js";
import { mountSyncPanel } from "./auth/accountView.js";
import { createWordPopup } from "./hover/wordPopup.js";
import { mountReader } from "./reader/reader.js";
import type { CorePreparedContent } from "./types/corePrepared.js";
import { createEncodingModal } from "./encoding/EncodingModal.js";
import { mountCatalogView } from "./catalog/catalogView.js";
import { FIXTURE_CATALOG } from "./catalog/fixtures/catalog.js";
import { queryFromHash } from "./catalog/facets.js";
import { createHttpVault, listVaultReadings, staticVaultBase } from "./host/httpVault.js";
import { mountCommandSwitcher } from "./library/switcher.js";
import { mountLibraryView, loadCompanionTitles } from "./library/LibraryView.js";
import { loadCompanionLessons, type CompanionLesson } from "./library/companionShelf.js";
import { SITE } from "./config/site.js";
import { clear } from "./ui/dom.js";
import { mountImportPanel } from "./import/importPanel.js";
import { mountProPanel, mountDonateCard } from "./monetize/surfaces.js";
import "./styles/reader.css";
import "./styles/catalog.css";
import { registerSW } from "./pwa/register.js";
import { trackEvent } from "./build/analytics.js";

// New shell + routing + i18n (scoped to app shell + homepage + routing foundation)
import { createTopNav, type NavSurface } from "./shell/nav.js";
import { createRouter, surfaceFromHash } from "./app/router.js";
import { createHomeSurface } from "./shell/home.js";
import { renderStaticPage } from "./shell/staticPages.js";
import { createFirstGradeToast } from "./shell/toast.js";
import { applyI18n, tKey as t } from "./i18n/strings.js";
import { updateSeo } from "./seo/meta.js";
import { FEATURES } from "./config/features.js";

function isReaderHash(hash: string): boolean {
  return hash.startsWith("#read=");
}

function readingPathFromHash(hash: string): string | null {
  if (!isReaderHash(hash)) return null;
  const raw = hash.slice("#read=".length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function loadFixture(): Promise<CorePreparedContent> {
  const res = await fetch("/fixtures/sample.prepared.json");
  const json = await res.json();
  return parsePreparedContent(json);
}

function setThemeBtn(theme: "light" | "dark"): void {
  // themeBtn now lives in shell topnav; update if legacy one exists
  const btn = document.getElementById("themeBtn") || document.getElementById("shellThemeBtn");
  if (btn) btn.textContent = theme === "dark" ? "☾" : "☀";
}

function showCatalogView(catalogEl: HTMLElement, workEl: HTMLElement): void {
  catalogEl.hidden = false;
  workEl.hidden = false; // keep visible for coverage etc; router controls outer
}

function showReaderView(catalogEl: HTMLElement, workEl: HTMLElement): void {
  catalogEl.hidden = true;
  workEl.hidden = false;
}

/** Notice shown when a Phase-2 surface is reached while its feature flag is off. */
function renderPhase2(host: HTMLElement, title: string): void {
  host.innerHTML = `<div class="tsg-shell" style="padding:2rem;max-width:680px;margin:0 auto">
    <h2 style="margin:0 0 .5rem">${title}</h2>
    <p style="color:var(--tsg-muted)">This arrives in a later phase. Tsumugu Beta is a static, local-only reader. Your progress lives in this browser with no account.</p>
    <p><a href="#home">← Back to home</a></p>
  </div>`;
}

async function boot(): Promise<void> {
  restoreSession();
  const settings = loadSettings();
  applySettings(settings);
  setThemeBtn(settings.theme);

  const userStore = getUserStore();
  const store = userStore.getWordStore(); // central, supports login merge later
  const vault = createHttpVault(staticVaultBase());
  let catalog = await listVaultReadings(staticVaultBase());
  // Fall back to the fixture catalog when the published manifest yields no
  // valid entries (httpVault already drops rows lacking band/kind/wordCounts,
  // so length alone is the validity signal).
  if (catalog.length === 0) catalog = FIXTURE_CATALOG;
  // Companion lesson metadata (title/theme/grammar) for the library shelf;
  // degrades to [] when companion-lessons.json is absent.
  const companionLessons: CompanionLesson[] = await loadCompanionLessons(staticVaultBase());
  // Tri-rail reading titles (EN/VI/ZH) — the library's interest layer; {} when absent.
  const readingTitles = await loadCompanionTitles(staticVaultBase());

  const content = await loadFixture();
  const state = createReaderState(content, store, settings);

  const workQuery = document.querySelector(".work");
  const prose = document.getElementById("prose");
  if (!(workQuery instanceof HTMLElement) || !prose) throw new Error("Reader shell markup missing");
  const workEl: HTMLElement = workQuery;

  const catalogEl =
    document.getElementById("catalog") ??
    (() => {
      const el = document.createElement("section");
      el.id = "catalog";
      el.className = "tsg-catalog-host";
      workEl.parentElement?.insertBefore(el, workEl);
      return el;
    })();

  const popup = createWordPopup(state);
  const reader = mountReader(prose, state, popup, vault);
  // Rich encoding/components modal is Phase-2 (WO-CORE-4 deferred). When off, the
  // popup "Form" affordance falls back to its inline hint instead of the modal.
  const encModal = FEATURES.encodingModal ? createEncodingModal() : null;
  if (encModal) (window as any).__tsgEnc = encModal;
  (window as any).__tsgReader = reader;
  paintReadHead(state);

  // The settled library page (2026-07): 課本架/級別架 band + title-led table.
  // Progress affordances (continue, coverage) return later as an enhancement.
  const catalogView = mountLibraryView(catalogEl, {
    catalog,
    titles: readingTitles,
    lessons: companionLessons,
    onOpen: (path) => {
      trackEvent("catalog_open", { path });
      void openReading(path);
    },
  });

  const switcher = mountCommandSwitcher({
    catalog,
    getStatus: (lang, word) => state.store.getStatus(lang, word),
    onSelect: (path) => void openReading(path),
  });

  // Sync panel (local-only export/import, Lane C Stage 1) behind VITE_FEATURE_SYNC.
  // Gated off → not mounted, no nav entry, #account routes to a Phase-2 notice.
  const accountCtrl = FEATURES.sync ? mountSyncPanel(document.body) : null;

  // Monetization seams (Phase 3) — built as unlinked options; flags default OFF
  // and the surfaces are additionally inert until monetize/config.ts is filled.
  if (FEATURES.pro) mountProPanel(document.body);
  if (FEATURES.donate) mountDonateCard(document.body);

  // Rebind state.store + refresh surfaces after login/merge (ref change inside userStore)
  const importPanel = mountImportPanel(document.body, {
    state,
    vault,
    onLoaded: () => {
      showReaderView(catalogEl, workEl);
      reader.rebuildProse();
      paintReadHead(state);
    },
  });

  document.getElementById("pasteBtn")?.addEventListener("click", () => importPanel.open());
  document.getElementById("catalogBtn")?.addEventListener("click", () => {
    // navigate to library surface via router hash
    const q = queryFromHash(location.hash);
    const next = q.facets.band ? location.hash.replace(/^#read=.*$/, "") : "#library";
    if (location.hash !== next) location.hash = next || "";
    showCatalogView(catalogEl, workEl);
    catalogView.render();
  });

  async function openReading(path: string): Promise<void> {
    try { localStorage.setItem("tsumugu-core/lastReadingId", path); } catch {}
    // Probe metric (2026-07-04 decision): return-reading rate. Cookieless day
    // flags in localStorage; events fire only when the analytics beacon ships
    // (GOATCOUNTER_CODE at deploy). Rate = return_read uniques ÷ first_read.
    try {
      const day = new Date().toISOString().slice(0, 10);
      const first = localStorage.getItem("tsumugu-core/firstReadDay");
      if (!first) {
        localStorage.setItem("tsumugu-core/firstReadDay", day);
        trackEvent("first_read");
      } else if (day !== first && localStorage.getItem("tsumugu-core/lastReturnDay") !== day) {
        localStorage.setItem("tsumugu-core/lastReturnDay", day);
        trackEvent("return_read");
      }
    } catch { /* storage unavailable — unmeasured, never blocking */ }
    const text = await vault.readText(path);
    if (!text) return;
    const parsed = parsePreparedContent(JSON.parse(text)) as CorePreparedContent;
    state.setContent(parsed);
    location.hash = `#read=${encodeURIComponent(path)}`;
    // ensure reader surface visible
    const surfaceEl = document.getElementById("surface");
    const readerH = document.getElementById("reader-host");
    if (surfaceEl) surfaceEl.hidden = true;
    if (readerH) readerH.hidden = false;
    showReaderView(catalogEl, workEl);
    reader.rebuildProse();
    paintReadHead(state);
    // Voice/shadowing is Phase-2 (PRD §8.4 leave-behind) and ships no audio
    // assets in v1; only attach when the feature is explicitly enabled.
    if (FEATURES.voice && reader.attachVoice) {
      void reader.attachVoice(true).then((vp) => { if (vp) console.debug("[tsumugu] voice demo attached (inert/speech fallback)"); });
    }
  }

  /** Continue: reopen the last reading if one exists, else land on the library hub. */
  function openContinue(): void {
    let last: string | null = null;
    try { last = localStorage.getItem("tsumugu-core/lastReadingId"); } catch { /* ignore */ }
    if (last) {
      void openReading(last);
      router.navigate("reader");
    } else {
      router.navigate("library");
    }
  }

  state.subscribe("content", () => {
    reader.rebuildProse();
    paintReadHead(state);
  });

  function patchSettings(patch: Partial<ReaderSettings>): void {
    state.updateSettings(patch);
    applySettings(state.settings);
    setThemeBtn(state.settings.theme);
    applyChromeLang(state);
    applyI18n(document); // re-render any i18n chrome
  }

  // Note: railSeg is no longer in DOM (global rail now in TopNav). Reader-local segs still here.
  const scriptSeg = document.getElementById("scriptSeg");
  const readingSeg = document.getElementById("readingSeg");
  const glossSeg = document.getElementById("glossSeg");
  if (scriptSeg) wireSeg(scriptSeg, "script", (script) => {
    patchSettings({ script: script as ReaderSettings["script"] });
    reader.rebuildProse();
  });
  if (readingSeg) wireSeg(readingSeg, "reading", (reading) => {
    patchSettings({ reading: reading as ReaderSettings["reading"] });
    reader.rebuildProse();
  });
  if (glossSeg) wireSeg(glossSeg, "gloss", (gloss) => {
    patchSettings({ gloss: gloss as ReaderSettings["gloss"] });
    applyChromeLang(state);
  });

  // Palette/theme now driven from shell nav (see below). Keep legacy compat if elements exist.
  state.subscribe("settings", () => applyChromeLang(state));

  // ========== NEW: Router + AppShell + Homepage ==========
  const surfaceEl = document.getElementById("surface");
  const readerHost = document.getElementById("reader-host");
  const topnavHost = document.getElementById("topnav");

  const router = createRouter();

  let topNavCtrl: ReturnType<typeof createTopNav> | null = null;
  let homeCtrl: ReturnType<typeof createHomeSurface> | null = null;

  if (topnavHost) {
    topNavCtrl = createTopNav({
      onNavigate: (s: NavSurface) => router.navigate(s),
      onRailChange: (rail) => {
        patchSettings({
          rail,
          reading: rail === "vi" ? "hv" : "py",
          gloss: rail === "vi" ? "vi" : "en",
        });
        popup.close();
        if (homeCtrl) homeCtrl.render(rail);
        if (topNavCtrl) topNavCtrl.setRail(rail);
        applyI18n(document);
        updateSeo(router.current, rail);
      },
      onPaletteChange: (palette) => patchSettings({ palette }),
      onThemeToggle: () => {
        const nextTheme = (document.documentElement.dataset.theme as ReaderSettings["theme"]) || "light";
        patchSettings({ theme: nextTheme });
      },
      onImport: () => importPanel.open(),
      onCommandK: () => switcher.open(),
      onContinue: () => openContinue(),
      getSettings: () => state.settings,
      onSettingsChange: (patch) => {
        patchSettings(patch);
        if (patch.knownStateOn !== undefined) reader.rebuildProse();
        if (patch.script !== undefined || patch.reading !== undefined) reader.rebuildProse();
      },
      initialRail: settings.rail,
      initialLoggedIn: !!getSession().userId,
    });
    // insert the shell header (replace placeholder)
    topnavHost.replaceWith(topNavCtrl.el);
  }

  // Keep topnav auth label in sync with real session.
  // Subscribe *after* topNavCtrl is initialized to avoid TDZ.
  // subscribeSession emits current value synchronously.
  subscribeSession((snap) => {
    if (topNavCtrl) {
      topNavCtrl.setLoggedIn(!!snap.userId);
    }
    // also sync root data if profile has rail/uiLang (future)
  });

  // Render surface on route change
  router.onChange((surf, detail) => {
    const currentRail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
    updateSeo(surf, currentRail);

    if (surf === "home") {
      if (surfaceEl) surfaceEl.hidden = false;
      if (readerHost) readerHost.hidden = true;
      if (catalogEl) catalogEl.hidden = true;

      if (!homeCtrl && surfaceEl) {
        homeCtrl = createHomeSurface({
          onRailChange: (rail) => {
            patchSettings({
              rail,
              reading: rail === "vi" ? "hv" : "py",
              gloss: rail === "vi" ? "vi" : "en",
            });
            if (topNavCtrl) topNavCtrl.setRail(rail);
            homeCtrl?.render(rail);
            applyI18n(document);
            updateSeo(router.current, rail);
          },
          onNavigate: (s) => router.navigate(s),
        });
        surfaceEl.appendChild(homeCtrl.el);
      }
      if (homeCtrl) homeCtrl.render(currentRail);
      if (topNavCtrl) topNavCtrl.setActive("home");
      applyI18n(document);
      return;
    }

    if (surf === "library") {
      if (surfaceEl) surfaceEl.hidden = true;
      if (readerHost) readerHost.hidden = true;
      if (catalogEl) catalogEl.hidden = false;
      showCatalogView(catalogEl, workEl);
      catalogView.render();
      if (topNavCtrl) topNavCtrl.setActive("library");
      applyI18n(document);
      return;
    }

    if (surf === "reader") {
      if (surfaceEl) surfaceEl.hidden = true;
      if (readerHost) readerHost.hidden = false;
      if (catalogEl) catalogEl.hidden = true;
      showReaderView(catalogEl, workEl);
      if (topNavCtrl) topNavCtrl.setActive("reader");
      applyI18n(document);
      return;
    }

    if (surf === "account") {
      if (readerHost) readerHost.hidden = true;
      if (catalogEl) catalogEl.hidden = true;
      if (accountCtrl) {
        // Account is a modal surface (not a full page replace). Open panel over a blank surface.
        if (surfaceEl) surfaceEl.hidden = true;
        accountCtrl.open();
      } else if (surfaceEl) {
        // Accounts are Phase-2 (gated off): show a notice rather than a dead route.
        surfaceEl.hidden = false;
        clear(surfaceEl);
        renderPhase2(surfaceEl, "Accounts & sync");
      }
      if (topNavCtrl) topNavCtrl.setActive("account");
      applyI18n(document);
      // Do not leave #account hash polluting; router will have set it but panel owns state.
      return;
    }

    // Static footer pages (colophon + method fold into About via the router).
    if (surf === "about" || surf === "privacy" || surf === "terms" || surf === "feedback") {
      if (surfaceEl) {
        surfaceEl.hidden = false;
        if (readerHost) readerHost.hidden = true;
        if (catalogEl) catalogEl.hidden = true;
        clear(surfaceEl);
        renderStaticPage(surf, surfaceEl, currentRail);
        applyI18n(surfaceEl);
      }
      // About is a nav item → carry aria-current; privacy/feedback have no nav
      // entry, so they fall back to highlighting Home.
      if (topNavCtrl) topNavCtrl.setActive(surf === "about" ? "about" : "home");
      return;
    }
  });

  // Initial navigation (home by default; reader hash takes precedence)
  router.start();

  const initialPath = readingPathFromHash(location.hash);
  const hasWordState = userStore.getWordStore().size() > 0;
  if (initialPath) {
    await openReading(initialPath);
    router.navigate("reader");
  } else if (isReaderHash(location.hash)) {
    showReaderView(catalogEl, workEl);
    router.navigate("reader");
  } else if (surfaceFromHash(location.hash).surface === "library") {
    // Route through the router's parser so shared library deep links with
    // filter state ("#library=&lt=food&lq=…") and facet hashes survive boot.
    showCatalogView(catalogEl, workEl);
    catalogView.render();
    router.navigate("library");
  } else if (!location.hash && hasWordState) {
    // Returning visitor with progress boots straight to the library hub;
    // the marketing home is for first / signed-out visits.
    showCatalogView(catalogEl, workEl);
    catalogView.render();
    router.navigate("library");
  } else {
    // default to the marketing home landing
    router.navigate("home");
  }

  // Keep hash reader changes wired
  window.addEventListener("hashchange", () => {
    const path = readingPathFromHash(location.hash);
    if (path) {
      void openReading(path);
      // router will receive via its listener but we force
      if (router.current !== "reader") router.navigate("reader");
    } else if (!isReaderHash(location.hash)) {
      // could be library or home; router change will handle
    }
  });

  // Apply i18n + SEO once at end
  applyI18n(document);
  updateSeo(router.current, settings.rail);

  // Expose auth session for future nav / <AuthButton> (read-only integration point)
  (window as any).__tsumuguAuth = {
    subscribe: subscribeSession,
    get: getSession,
    openAccount: () => accountCtrl?.open(),
    userStore: userStore,
  };

  // Initial sync of nav login state (in case session restored)
  if (topNavCtrl) {
    const s0 = getSession();
    topNavCtrl.setLoggedIn(!!s0.userId);
  }

  // First-grade toast: fires once when the learner's word-state first becomes
  // non-empty in-session. Suppressed for returning visitors who already had
  // progress at boot. (Seam: Lane C's WordStore does not yet emit a dedicated
  // first-grade event; we approximate via store size.)
  const fireFirstGradeToast = createFirstGradeToast({
    message: t("toast.firstGrade", (document.documentElement.dataset.rail as "en" | "vi") || "en"),
    alreadyFired: hasWordState,
  });

  userStore.subscribe((ev) => {
    if (ev === "store" || ev === "doc" || ev === "sync") {
      (state as { store: typeof state.store }).store = userStore.getWordStore();
      try { catalogView.render(); } catch { /* ignore */ }
      const rail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
      if (homeCtrl) homeCtrl.render(rail);
      fireFirstGradeToast(userStore.getWordStore().size() > 0);
    }
  });

  subscribeSession(() => {
    try { catalogView.render(); } catch { /* ignore */ }
    const rail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
    if (homeCtrl) homeCtrl.render(rail);
  });
}

registerSW();

void boot().catch((err) => {
  console.error(err);
  const app = document.getElementById("app");
  if (app) {
    // Preserve footer and structure; show a non-destructive error banner
    const banner = document.createElement("div");
    banner.style.cssText = "background:#fee2e2;color:#991b1b;padding:8px 12px;margin:8px;border:1px solid #fecaca;border-radius:6px;font-family:monospace";
    banner.textContent = `Boot failed: ${String(err)}`;
    app.prepend(banner);
  }
});