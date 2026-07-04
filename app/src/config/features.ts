/**
 * v1 feature flags.
 *
 * Tsumugu Core v1 (PRD §1.3 / §12.1) ships a STATIC, LOCAL-ONLY, account-free
 * dual-rail reader over a generated catalog. Several larger surfaces were built
 * ahead of schedule — passwordless accounts + remote progress sync, the audio
 * voice/shadowing layer, in-app SRS flashcards, the grammar-point browser, and
 * the rich encoding/components modal. They are Phase-2/3 per the PRD, so they
 * stay in the tree but are gated OFF here.
 *
 * To bring one online for development, set the matching env at build time
 * (e.g. `VITE_FEATURE_ACCOUNTS=true pnpm dev`) — no code edit required.
 *
 * NOTE: the local-only WordStore (known-state coloring, progress math, paste
 * import) is NOT gated — it is core to the v1 reader. Only the networked /
 * deferred surfaces above are flagged.
 */

function envOn(key: string): boolean {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return v === "true" || v === "1";
  } catch {
    return false;
  }
}

export const FEATURES = {
  /** Passwordless login + remote server-sync of progress. PRD Phase 2. */
  accounts: envOn("VITE_FEATURE_ACCOUNTS"),
  /**
   * Local-only, file-based Sync panel (export/import UserDoc, copy-paste sync
   * code, BYO-URL pull, Anki export). Sync Stage 1 is 100% local — no server.
   * Default OFF: with the flag off there is ZERO sync surface in the product.
   */
  sync: envOn("VITE_FEATURE_SYNC"),
  /** Audio voice-notes / shadowing / per-cue practice bar. PRD §8.4 leave-behind. */
  voice: envOn("VITE_FEATURE_VOICE"),
  // `flashcards` + `grammar` flags removed 2026-07-02: their views were deleted
  // and the router now folds #flashcards/#grammar into #about, so the route
  // guards that once read these flags are gone.
  /** Rich in-app encoding / components modal. Deferred per WO-CORE-4. */
  encodingModal: envOn("VITE_FEATURE_ENCODING_MODAL"),
  // ── Monetization seams (built 2026-07-04 as unlinked options; PRD Phase 3).
  // All OFF by default and additionally inert until monetize/config.ts is
  // filled — pricing/ads/donate decisions stay open until Wedge signs off.
  /** Pro offer panel + entitlement-aware surfaces. */
  pro: envOn("VITE_FEATURE_PRO"),
  /** Engagement-side ad slots (never on lookups). */
  ads: envOn("VITE_FEATURE_ADS"),
  /** Quiet support/donate link. */
  donate: envOn("VITE_FEATURE_DONATE"),
} as const;

export type FeatureFlag = keyof typeof FEATURES;
