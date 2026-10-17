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
export async function openReadingFromPart(ctx: any, path: string): Promise<void> {
try { localStorage.setItem("tsumugu-core/lastReadingId", path); } catch {}
    
    
    
    try {
      const day = new Date().toISOString().slice(0, 10);
      const first = localStorage.getItem("tsumugu-core/firstReadDay");
      if (!first) {
        localStorage.setItem("tsumugu-core/firstReadDay", day);
        ctx.trackEvent("first_read");
      } else if (day !== first && localStorage.getItem("tsumugu-core/lastReturnDay") !== day) {
        localStorage.setItem("tsumugu-core/lastReturnDay", day);
        ctx.trackEvent("return_read");
      }
    } catch {  }
    const text = await ctx.vault.readText(path);
    if (!text) return;
    const parsed = ctx.parsePreparedContent(JSON.parse(text)) as CorePreparedContent;
    ctx.state.setContent(parsed);
    location.hash = `#read=${encodeURIComponent(path)}`;
    
    const surfaceEl = document.getElementById("surface");
    const readerH = document.getElementById("reader-host");
    if (surfaceEl) surfaceEl.hidden = true;
    if (readerH) readerH.hidden = false;
    ctx.showReaderView(ctx.catalogEl, ctx.workEl);
    ctx.reader.rebuildProse();
    ctx.paintReadHead(ctx.state);
    
    
    if (ctx.FEATURES.voice && ctx.reader.attachVoice) {
      void ctx.reader.attachVoice(true).then((vp: any) => { if (vp) console.debug("[tsumugu] voice demo attached (inert/speech fallback)"); });
    }
}

export async function bootTail2(ctx: any): Promise<any> {
ctx.router.start();

  const initialPath = ctx.readingPathFromHash(location.hash);
  const hasWordState = ctx.userStore.getWordStore().size() > 0;
  if (initialPath) {
    await ctx.openReading(initialPath);
    ctx.router.navigate("reader");
  } else if (ctx.isReaderHash(location.hash)) {
    ctx.showReaderView(ctx.catalogEl, ctx.workEl);
    ctx.router.navigate("reader");
  } else if (ctx.surfaceFromHash(location.hash).surface === "library") {
    
    
    ctx.showCatalogView(ctx.catalogEl, ctx.workEl);
    ctx.catalogView.render();
    ctx.router.navigate("library");
  } else if (!location.hash && hasWordState) {
    
    
    ctx.showCatalogView(ctx.catalogEl, ctx.workEl);
    ctx.catalogView.render();
    ctx.router.navigate("library");
  } else {
    
    ctx.router.navigate("home");
  }

  
  window.addEventListener("hashchange", () => {
    const path = ctx.readingPathFromHash(location.hash);
    if (path) {
      void ctx.openReading(path);
      
      if (ctx.router.current !== "reader") ctx.router.navigate("reader");
    }
  });

  
  ctx.applyI18n(document);
  ctx.updateSeo(ctx.router.current, ctx.settings.rail);

  
  (window as any).__tsumuguAuth = {
    subscribe: ctx.subscribeSession,
    get: ctx.getSession,
    openAccount: () => ctx.accountCtrl?.open(),
    userStore: ctx.userStore,
  };

  
  if (ctx.topNavCtrl) {
    const s0 = ctx.getSession();
    ctx.topNavCtrl.setLoggedIn(!!s0.userId);
  }

  
  
  
  
  const fireFirstGradeToast = ctx.createFirstGradeToast({
    message: ctx.t("toast.firstGrade", (document.documentElement.dataset.rail as "en" | "vi") || "en"),
    alreadyFired: hasWordState,
  });

  ctx.userStore.subscribe((ev: any) => {
    if (ev === "store" || ev === "doc" || ev === "sync") {
      (ctx.state as { store: typeof ctx.state.store }).store = ctx.userStore.getWordStore();
      try { ctx.catalogView.render(); } catch {  }
      const rail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
      if (ctx.homeCtrl) ctx.homeCtrl.render(rail);
      fireFirstGradeToast(ctx.userStore.getWordStore().size() > 0);
    }
  });

  ctx.subscribeSession(() => {
    try { ctx.catalogView.render(); } catch {  }
    const rail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
    if (ctx.homeCtrl) ctx.homeCtrl.render(rail);
  });
}
