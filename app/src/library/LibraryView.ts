/**
 * Library (content browser) surface — canonical for browse.
 *
 * 2026-07: the settled library page (libraryPage.ts — 課本架/級別架 tabs, slim
 * shelf + part columns, title-led scoped reading table) replaces the stacked
 * catalogView hub as the #library surface. catalogView stays in-tree unrouted
 * until the progress layer (continue strip, coverage) returns as an
 * enhancement over this cold-start baseline.
 *
 * Re-exports the mount for compat + shell navigation.
 */
export {
  mountLibraryPage as mountLibraryView,
  loadCompanionTitles,
  type LibraryPageOpts as LibraryViewOpts,
  type TitlesMap,
} from "./libraryPage.js";
