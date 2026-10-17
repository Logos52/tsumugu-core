

type Tier = "free" | "pro";

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

export function setTier(tier: Tier): void {
  cached = tier;
  try {
    if (tier === "pro") localStorage.setItem(KEY, "pro");
    else localStorage.removeItem(KEY);
  } catch {
    
  }
}

export function resetEntitlementCache(): void {
  cached = null;
}
