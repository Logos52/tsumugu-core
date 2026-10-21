import { openReadingFromPart, bootTail2 } from "./main.fns1.js";
import { bootTail3 } from "./main.fns2.js";
import { bootTail4 } from "./main.fns3.js";
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
import { attachVocabImport } from "./import/vocabImport.js";
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
  const ctx: any = {};
  attachVocabImport(ctx);

  ctx.restoreSession = restoreSession; ctx.loadSettings = loadSettings; ctx.applySettings = applySettings; ctx.setThemeBtn = setThemeBtn; ctx.getUserStore = getUserStore; ctx.createHttpVault = createHttpVault; ctx.staticVaultBase = staticVaultBase; ctx.listVaultReadings = listVaultReadings; ctx.FIXTURE_CATALOG = FIXTURE_CATALOG; ctx.loadCompanionLessons = loadCompanionLessons; ctx.loadCompanionTitles = loadCompanionTitles; ctx.loadFixture = loadFixture; ctx.createReaderState = createReaderState; ctx.createWordPopup = createWordPopup; ctx.mountReader = mountReader; ctx.FEATURES = FEATURES; ctx.createEncodingModal = createEncodingModal; ctx.paintReadHead = paintReadHead; ctx.mountLibraryView = mountLibraryView; ctx.trackEvent = trackEvent; ctx.mountCommandSwitcher = mountCommandSwitcher; ctx.mountSyncPanel = mountSyncPanel; ctx.mountProPanel = mountProPanel; ctx.mountDonateCard = mountDonateCard; ctx.mountImportPanel = mountImportPanel; ctx.showReaderView = showReaderView; ctx.queryFromHash = queryFromHash; ctx.showCatalogView = showCatalogView; ctx.parsePreparedContent = parsePreparedContent; ctx.applyChromeLang = applyChromeLang; ctx.applyI18n = applyI18n; ctx.wireSeg = wireSeg; ctx.createRouter = createRouter; ctx.createTopNav = createTopNav; ctx.updateSeo = updateSeo; ctx.getSession = getSession; ctx.subscribeSession = subscribeSession; ctx.createHomeSurface = createHomeSurface; ctx.clear = clear; ctx.renderPhase2 = renderPhase2; ctx.renderStaticPage = renderStaticPage; ctx.readingPathFromHash = readingPathFromHash; ctx.isReaderHash = isReaderHash; ctx.surfaceFromHash = surfaceFromHash; ctx.createFirstGradeToast = createFirstGradeToast; ctx.t = t;
return bootTail4(ctx);
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