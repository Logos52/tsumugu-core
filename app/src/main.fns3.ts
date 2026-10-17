import { openReadingFromPart } from "./main.fns1.js";
import { bootTail3 } from "./main.fns2.js";
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
export async function bootTail4(ctx: any): Promise<any> {
ctx.restoreSession();
  const settings = ctx.loadSettings();
  ctx.applySettings(settings);
  ctx.setThemeBtn(settings.theme);

  const userStore = ctx.getUserStore();
  const store = userStore.getWordStore(); 
  const vault = ctx.createHttpVault(ctx.staticVaultBase());
  let catalog = await ctx.listVaultReadings(ctx.staticVaultBase());



  if (catalog.length === 0) catalog = ctx.FIXTURE_CATALOG;


  const companionLessons: CompanionLesson[] = await ctx.loadCompanionLessons(ctx.staticVaultBase());

  const readingTitles = await ctx.loadCompanionTitles(ctx.staticVaultBase());

  const content = await ctx.loadFixture();
  const state = ctx.createReaderState(content, store, settings);

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

  const popup = ctx.createWordPopup(state);
  const reader = ctx.mountReader(prose, state, popup, vault);


  const encModal = ctx.FEATURES.encodingModal ? ctx.createEncodingModal() : null;
  if (encModal) (window as any).__tsgEnc = encModal;
  (window as any).__tsgReader = reader;
  ctx.paintReadHead(state);



  const catalogView = ctx.mountLibraryView(catalogEl, {
    catalog,
    titles: readingTitles,
    lessons: companionLessons,
    onOpen: (path: any) => {
      ctx.trackEvent("catalog_open", { path });
      void openReading(path);
    },
  });

  const switcher = ctx.mountCommandSwitcher({
    catalog,
    getStatus: (lang: any, word: any) => state.store.getStatus(lang, word),
    onSelect: (path: any) => void openReading(path),
  });



  const accountCtrl = ctx.FEATURES.sync ? ctx.mountSyncPanel(document.body) : null;



  if (ctx.FEATURES.pro) ctx.mountProPanel(document.body);
  if (ctx.FEATURES.donate) ctx.mountDonateCard(document.body);


  const importPanel = ctx.mountImportPanel(document.body, {
    state,
    vault,
    onLoaded: () => {
      ctx.showReaderView(catalogEl, workEl);
      reader.rebuildProse();
      ctx.paintReadHead(state);
    },
  });

  document.getElementById("pasteBtn")?.addEventListener("click", () => importPanel.open());
  document.getElementById("catalogBtn")?.addEventListener("click", () => {

    const q = ctx.queryFromHash(location.hash);
    const next = q.facets.band ? location.hash.replace(/^#read=.*$/, "") : "#library";
    if (location.hash !== next) location.hash = next || "";
    ctx.showCatalogView(catalogEl, workEl);
    catalogView.render();
  }); ctx.vault = vault; ctx.state = state; ctx.catalogEl = catalogEl; ctx.workEl = workEl; ctx.reader = reader;
const openReading = (path: string) => openReadingFromPart(ctx, path);


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
    ctx.paintReadHead(state);
  });

  function patchSettings(patch: Partial<ReaderSettings>): void {
    state.updateSettings(patch);
    ctx.applySettings(state.settings);
    ctx.setThemeBtn(state.settings.theme);
    ctx.applyChromeLang(state);
    ctx.applyI18n(document); 
  }


  const scriptSeg = document.getElementById("scriptSeg");
  const readingSeg = document.getElementById("readingSeg");
  const glossSeg = document.getElementById("glossSeg");
  if (scriptSeg) ctx.wireSeg(scriptSeg, "script", (script: any) => {
    patchSettings({ script: script as ReaderSettings["script"] });
    reader.rebuildProse();
  });
  if (readingSeg) ctx.wireSeg(readingSeg, "reading", (reading: any) => {
    patchSettings({ reading: reading as ReaderSettings["reading"] });
    reader.rebuildProse();
  });
  if (glossSeg) ctx.wireSeg(glossSeg, "gloss", (gloss: any) => {
    patchSettings({ gloss: gloss as ReaderSettings["gloss"] });
    ctx.applyChromeLang(state);
  });


  state.subscribe("settings", () => ctx.applyChromeLang(state));


  const surfaceEl = document.getElementById("surface");
  const readerHost = document.getElementById("reader-host");
  const topnavHost = document.getElementById("topnav");

  const router = ctx.createRouter();

  ctx.topnavHost = topnavHost; ctx.router = router; ctx.patchSettings = patchSettings; ctx.popup = popup; ctx.importPanel = importPanel; ctx.switcher = switcher; ctx.openContinue = openContinue; ctx.state = state; ctx.reader = reader; ctx.settings = settings; ctx.surfaceEl = surfaceEl; ctx.readerHost = readerHost; ctx.catalogEl = catalogEl; ctx.workEl = workEl; ctx.catalogView = catalogView; ctx.accountCtrl = accountCtrl; ctx.userStore = userStore; ctx.openReading = openReading;
return bootTail3(ctx);
}
