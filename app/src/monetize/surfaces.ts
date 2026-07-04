/**
 * Monetization surfaces — built, gated OFF, unlinked (options for later).
 *
 * Three quiet mounts, all config-driven and all rendering NOTHING until their
 * feature flag is on AND their config is filled:
 *   - mountProPanel  — the one room where buying happens (price/terms copy is
 *     allowed HERE per DESIGN-PRINCIPLES §11, and only here).
 *   - mountAdSlot    — engagement-side placements only (a finished reading, the
 *     daily strip). Never on lookups: ads must reward engagement, not tax the
 *     dictionary reflex. No provider configured → zero DOM, zero layout shift.
 *   - mountDonateCard — a single quiet support link.
 *
 * Wiring precedent: FEATURES.sync / mountSyncPanel. Light one up by setting the
 * env flag at build time and filling MONETIZE — no code edits.
 */
import { el, clear } from "../ui/dom.js";
import { isViRail } from "../catalog/libraryModel.js";
import { MONETIZE } from "./config.js";
import { isPro } from "./entitlement.js";

/** Engagement-side placements only — the deliberate, closed list. */
export type AdPlacement = "reading-end" | "library-interstice" | "daily-strip";

export interface Mounted {
  destroy: () => void;
}

const noop: Mounted = { destroy: () => {} };

/** Pro offer panel. Renders nothing until an offer is actually sellable. */
export function mountProPanel(host: HTMLElement): Mounted {
  const offer = MONETIZE.pro;
  if (isPro() || !offer.checkoutUrl || !offer.price || offer.benefits.length === 0) return noop;
  const vi = isViRail();
  const panel = el("aside", { class: "pro-panel", attrs: { "aria-label": "Pro" } });
  const list = offer.benefits
    .map((b) => `<li lang="zh-Hant">${b.zh}<span class="en">${vi ? b.vi : b.en}</span></li>`)
    .join("");
  panel.innerHTML =
    `<h3 class="pro-title">Pro</h3><ul class="pro-benefits">${list}</ul>` +
    `<a class="btn primary pro-cta" href="${offer.checkoutUrl}" rel="noopener">${offer.price}</a>`;
  host.append(panel);
  return { destroy: () => { panel.remove(); clear(host); } };
}

/** Ad slot. Pro readers and provider-less builds get nothing — not a gap, nothing. */
export function mountAdSlot(host: HTMLElement, placement: AdPlacement): Mounted {
  if (isPro() || !MONETIZE.ads.provider) return noop;
  const slot = el("div", { class: "ad-slot", dataset: { placement } });
  host.append(slot);
  return { destroy: () => slot.remove() };
}

/** Support link. One line, no pitch. */
export function mountDonateCard(host: HTMLElement): Mounted {
  const { href } = MONETIZE.donate;
  if (!href) return noop;
  const card = el("a", { class: "donate-card", attrs: { href, rel: "noopener" } });
  card.textContent = isViRail() ? "Ủng hộ Tsumugu" : "Support Tsumugu";
  host.append(card);
  return { destroy: () => card.remove() };
}
