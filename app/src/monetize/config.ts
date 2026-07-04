/**
 * Monetization configuration — STRUCTURE ONLY, deliberately empty.
 *
 * Built ahead as unlinked options (2026-07-04, Wedge): the components exist and
 * are wired behind OFF feature flags so lighting one up later is an env flip +
 * config fill, not a build. No figures live in code — price points, tier
 * anchoring, and the ads-vs-free decision are OPEN (PRD-OUTLINE §9/§13.3) and
 * their specifics stay in the gitignored KB monetization note until sign-off.
 *
 * Blockers on record before Pro ships a bridge claim: CRITIC-FINDINGS #4 —
 * confirm the cognate-bridge output's data licenses clear a monetized product.
 */

export interface ProOffer {
  /** Display price, e.g. "US$4 / mo" — null until priced (PPP-aware later). */
  price: string | null;
  /** Checkout URL (Stripe Payment Link or successor) — null until it exists. */
  checkoutUrl: string | null;
  /** What Pro sells. Convenience, never content (PRD posture). */
  benefits: { zh: string; en: string; vi: string }[];
}

export interface AdsConfig {
  /** Ad provider snippet/id — null = no provider, slots render nothing. */
  provider: string | null;
}

export interface DonateConfig {
  /** Support link (Ko-fi / GitHub Sponsors / …) — null = surface renders nothing. */
  href: string | null;
}

export const MONETIZE: { pro: ProOffer; ads: AdsConfig; donate: DonateConfig } = {
  pro: { price: null, checkoutUrl: null, benefits: [] },
  ads: { provider: null },
  donate: { href: null },
};
