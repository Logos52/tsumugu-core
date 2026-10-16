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
  
  const btn = document.getElementById("themeBtn") || document.getElementById("shellThemeBtn");
  if (btn) btn.textContent = theme === "dark" ? "☾" : "☀";
}

function showCatalogView(catalogEl: HTMLElement, workEl: HTMLElement): void {
  catalogEl.hidden = false;
  workEl.hidden = false; 
}

function showReaderView(catalogEl: HTMLElement, workEl: HTMLElement): void {
  catalogEl.hidden = true;
  workEl.hidden = false;
}


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
  const store = userStore.getWordStore(); 
  const vault = createHttpVault(staticVaultBase());
  let catalog = await listVaultReadings(staticVaultBase());
  
  
  
  if (catalog.length === 0) catalog = FIXTURE_CATALOG;
  
  
  const companionLessons: CompanionLesson[] = await loadCompanionLessons(staticVaultBase());
  
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
  
  
  const encModal = FEATURES.encodingModal ? createEncodingModal() : null;
  if (encModal) (window as any).__tsgEnc = encModal;
  (window as any).__tsgReader = reader;
  paintReadHead(state);

  
  
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

  
  
  const accountCtrl = FEATURES.sync ? mountSyncPanel(document.body) : null;

  
  
  if (FEATURES.pro) mountProPanel(document.body);
  if (FEATURES.donate) mountDonateCard(document.body);

  
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
    
    const q = queryFromHash(location.hash);
    const next = q.facets.band ? location.hash.replace(/^#read=.*$/, "") : "#library";
    if (location.hash !== next) location.hash = next || "";
    showCatalogView(catalogEl, workEl);
    catalogView.render();
  });

  async function openReading(path: string): Promise<void> {
    try { localStorage.setItem("tsumugu-core/lastReadingId", path); } catch {}
    
    
    
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
    } catch {  }
    const text = await vault.readText(path);
    if (!text) return;
    const parsed = parsePreparedContent(JSON.parse(text)) as CorePreparedContent;
    state.setContent(parsed);
    location.hash = `#read=${encodeURIComponent(path)}`;
    
    const surfaceEl = document.getElementById("surface");
    const readerH = document.getElementById("reader-host");
    if (surfaceEl) surfaceEl.hidden = true;
    if (readerH) readerH.hidden = false;
    showReaderView(catalogEl, workEl);
    reader.rebuildProse();
    paintReadHead(state);
    
    
    if (FEATURES.voice && reader.attachVoice) {
      void reader.attachVoice(true).then((vp) => { if (vp) console.debug("[tsumugu] voice demo attached (inert/speech fallback)"); });
    }
  }

  
  function openContinue(): void {
    let last: string | null = null;
    try { last = localStorage.getItem("tsumugu-core/lastReadingId"); } catch {  }
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
    applyI18n(document); 
  }

  
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

  
  state.subscribe("settings", () => applyChromeLang(state));

  
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
    
    topnavHost.replaceWith(topNavCtrl.el);
  }

  
  
  
  subscribeSession((snap) => {
    if (topNavCtrl) {
      topNavCtrl.setLoggedIn(!!snap.userId);
    }
    
  });

  
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
        
        if (surfaceEl) surfaceEl.hidden = true;
        accountCtrl.open();
      } else if (surfaceEl) {
        
        surfaceEl.hidden = false;
        clear(surfaceEl);
        renderPhase2(surfaceEl, "Accounts & sync");
      }
      if (topNavCtrl) topNavCtrl.setActive("account");
      applyI18n(document);
      
      return;
    }

    
    if (surf === "about" || surf === "privacy" || surf === "terms" || surf === "feedback") {
      if (surfaceEl) {
        surfaceEl.hidden = false;
        if (readerHost) readerHost.hidden = true;
        if (catalogEl) catalogEl.hidden = true;
        clear(surfaceEl);
        renderStaticPage(surf, surfaceEl, currentRail);
        applyI18n(surfaceEl);
      }
      
      
      if (topNavCtrl) topNavCtrl.setActive(surf === "about" ? "about" : "home");
      return;
    }
  });

  
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
    
    
    showCatalogView(catalogEl, workEl);
    catalogView.render();
    router.navigate("library");
  } else if (!location.hash && hasWordState) {
    
    
    showCatalogView(catalogEl, workEl);
    catalogView.render();
    router.navigate("library");
  } else {
    
    router.navigate("home");
  }

  
  window.addEventListener("hashchange", () => {
    const path = readingPathFromHash(location.hash);
    if (path) {
      void openReading(path);
      
      if (router.current !== "reader") router.navigate("reader");
    }
  });

  
  applyI18n(document);
  updateSeo(router.current, settings.rail);

  
  (window as any).__tsumuguAuth = {
    subscribe: subscribeSession,
    get: getSession,
    openAccount: () => accountCtrl?.open(),
    userStore: userStore,
  };

  
  if (topNavCtrl) {
    const s0 = getSession();
    topNavCtrl.setLoggedIn(!!s0.userId);
  }

  
  
  
  
  const fireFirstGradeToast = createFirstGradeToast({
    message: t("toast.firstGrade", (document.documentElement.dataset.rail as "en" | "vi") || "en"),
    alreadyFired: hasWordState,
  });

  userStore.subscribe((ev) => {
    if (ev === "store" || ev === "doc" || ev === "sync") {
      (state as { store: typeof state.store }).store = userStore.getWordStore();
      try { catalogView.render(); } catch {  }
      const rail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
      if (homeCtrl) homeCtrl.render(rail);
      fireFirstGradeToast(userStore.getWordStore().size() > 0);
    }
  });

  subscribeSession(() => {
    try { catalogView.render(); } catch {  }
    const rail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
    if (homeCtrl) homeCtrl.render(rail);
  });
}

registerSW();

void boot().catch((err) => {
  console.error(err);
  const app = document.getElementById("app");
  if (app) {
    
    const banner = document.createElement("div");
    banner.style.cssText = "background:#fee2e2;color:#991b1b;padding:8px 12px;margin:8px;border:1px solid #fecaca;border-radius:6px;font-family:monospace";
    banner.textContent = `Boot failed: ${String(err)}`;
    app.prepend(banner);
  }
});