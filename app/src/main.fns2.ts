import { bootTail2 } from "./main.fns1.js";
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
export function bootTail3(ctx: any): any {
let topNavCtrl: ReturnType<typeof createTopNav> | null = null;
  let homeCtrl: ReturnType<typeof createHomeSurface> | null = null;

  if (ctx.topnavHost) {
    topNavCtrl = ctx.createTopNav({
      onNavigate: (s: NavSurface) => ctx.router.navigate(s),
      onRailChange: (rail: any) => {
        ctx.patchSettings({
          rail,
          reading: rail === "vi" ? "hv" : "py",
          gloss: rail === "vi" ? "vi" : "en",
        });
        ctx.popup.close();
        if (homeCtrl) homeCtrl.render(rail);
        if (topNavCtrl) topNavCtrl.setRail(rail);
        ctx.applyI18n(document);
        ctx.updateSeo(ctx.router.current, rail);
      },
      onPaletteChange: (palette: any) => ctx.patchSettings({ palette }),
      onThemeToggle: () => {
        const nextTheme = (document.documentElement.dataset.theme as ReaderSettings["theme"]) || "light";
        ctx.patchSettings({ theme: nextTheme });
      },
      onImport: () => ctx.importPanel.open(),
      onCommandK: () => ctx.switcher.open(),
      onContinue: () => ctx.openContinue(),
      getSettings: () => ctx.state.settings,
      onSettingsChange: (patch: any) => {
        ctx.patchSettings(patch);
        if (patch.knownStateOn !== undefined) ctx.reader.rebuildProse();
        if (patch.script !== undefined || patch.reading !== undefined) ctx.reader.rebuildProse();
      },
      initialRail: ctx.settings.rail,
      initialLoggedIn: !!ctx.getSession().userId,
    });

    if (topNavCtrl) ctx.topnavHost.replaceWith(topNavCtrl.el);
  }




  ctx.subscribeSession((snap: any) => {
    if (topNavCtrl) {
      topNavCtrl.setLoggedIn(!!snap.userId);
    }

  });


  ctx.router.onChange((surf: any, detail: any) => {
    const currentRail = (document.documentElement.dataset.rail as "en" | "vi") || "en";
    ctx.updateSeo(surf, currentRail);

    if (surf === "home") {
      if (ctx.surfaceEl) ctx.surfaceEl.hidden = false;
      if (ctx.readerHost) ctx.readerHost.hidden = true;
      if (ctx.catalogEl) ctx.catalogEl.hidden = true;

      if (!homeCtrl && ctx.surfaceEl) {
        homeCtrl = ctx.createHomeSurface({
          onRailChange: (rail: any) => {
            ctx.patchSettings({
              rail,
              reading: rail === "vi" ? "hv" : "py",
              gloss: rail === "vi" ? "vi" : "en",
            });
            if (topNavCtrl) topNavCtrl.setRail(rail);
            homeCtrl?.render(rail);
            ctx.applyI18n(document);
            ctx.updateSeo(ctx.router.current, rail);
          },
          onNavigate: (s: any) => ctx.router.navigate(s),
        });
        if (homeCtrl) ctx.surfaceEl.appendChild(homeCtrl.el);
      }
      if (homeCtrl) homeCtrl.render(currentRail);
      if (topNavCtrl) topNavCtrl.setActive("home");
      ctx.applyI18n(document);
      return;
    }

    if (surf === "library") {
      if (ctx.surfaceEl) ctx.surfaceEl.hidden = true;
      if (ctx.readerHost) ctx.readerHost.hidden = true;
      if (ctx.catalogEl) ctx.catalogEl.hidden = false;
      ctx.showCatalogView(ctx.catalogEl, ctx.workEl);
      ctx.catalogView.render();
      if (topNavCtrl) topNavCtrl.setActive("library");
      ctx.applyI18n(document);
      return;
    }

    if (surf === "reader") {
      if (ctx.surfaceEl) ctx.surfaceEl.hidden = true;
      if (ctx.readerHost) ctx.readerHost.hidden = false;
      if (ctx.catalogEl) ctx.catalogEl.hidden = true;
      ctx.showReaderView(ctx.catalogEl, ctx.workEl);
      if (topNavCtrl) topNavCtrl.setActive("reader");
      ctx.applyI18n(document);
      return;
    }

    if (surf === "account") {
      if (ctx.readerHost) ctx.readerHost.hidden = true;
      if (ctx.catalogEl) ctx.catalogEl.hidden = true;
      if (ctx.accountCtrl) {

        if (ctx.surfaceEl) ctx.surfaceEl.hidden = true;
        ctx.accountCtrl.open();
      } else if (ctx.surfaceEl) {

        ctx.surfaceEl.hidden = false;
        ctx.clear(ctx.surfaceEl);
        ctx.renderPhase2(ctx.surfaceEl, "Accounts & sync");
      }
      if (topNavCtrl) topNavCtrl.setActive("account");
      ctx.applyI18n(document);

      return;
    }


    if (surf === "about" || surf === "privacy" || surf === "terms" || surf === "feedback") {
      if (ctx.surfaceEl) {
        ctx.surfaceEl.hidden = false;
        if (ctx.readerHost) ctx.readerHost.hidden = true;
        if (ctx.catalogEl) ctx.catalogEl.hidden = true;
        ctx.clear(ctx.surfaceEl);
        ctx.renderStaticPage(surf, ctx.surfaceEl, currentRail);
        ctx.applyI18n(ctx.surfaceEl);
      }


      if (topNavCtrl) topNavCtrl.setActive(surf === "about" ? "about" : "home");
      return;
    }
  }); ctx.topNavCtrl = topNavCtrl; ctx.homeCtrl = homeCtrl;
return bootTail2(ctx);
}
