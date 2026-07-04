/**
 * Entitlement — the one seam the app asks "is this reader Pro?".
 *
 * Local-only (mirrors the WordStore posture): the tier persists in this
 * browser; a future payments integration (Stripe webhook → sync) SETS the tier
 * through the same `setTier` seam, so nothing else in the app changes when
 * payments arrive. Free is the default and the absence-of-record state.
 */

export type Tier = "free" | "pro";

const KEY = "tsumugu-core/entitlement";

let cached: Tier | null = null;

export function getTier(): Tier {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY) === "pro" ? "pro" : "free";
  } catch {
    cached = "free";
  }
  return cached;
}

export function isPro(): boolean {
  return getTier() === "pro";
}

/** The single write path — payments/sync integrations call this, nothing else. */
export function setTier(tier: Tier): void {
  cached = tier;
  try {
    if (tier === "pro") localStorage.setItem(KEY, "pro");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — session-only tier */
  }
}

/** Test seam. */
export function resetEntitlementCache(): void {
  cached = null;
}
