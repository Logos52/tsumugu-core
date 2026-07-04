// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTier, isPro, setTier, resetEntitlementCache } from "./entitlement.js";
import { mountProPanel, mountAdSlot, mountDonateCard } from "./surfaces.js";
import { MONETIZE } from "./config.js";

describe("entitlement", () => {
  beforeEach(() => {
    localStorage.clear();
    resetEntitlementCache();
  });

  it("defaults to free and round-trips pro through the single write seam", () => {
    expect(getTier()).toBe("free");
    expect(isPro()).toBe(false);
    setTier("pro");
    expect(isPro()).toBe(true);
    resetEntitlementCache();
    expect(getTier()).toBe("pro"); // persisted
    setTier("free");
    expect(localStorage.getItem("tsumugu-core/entitlement")).toBeNull();
  });
});

describe("monetization surfaces (unlinked options — inert until configured)", () => {
  let host: HTMLElement;
  beforeEach(() => {
    localStorage.clear();
    resetEntitlementCache();
    host = document.createElement("div");
    document.body.append(host);
  });
  afterEach(() => {
    host.remove();
    MONETIZE.pro.price = null;
    MONETIZE.pro.checkoutUrl = null;
    MONETIZE.pro.benefits = [];
    MONETIZE.ads.provider = null;
    MONETIZE.donate.href = null;
  });

  it("all render NOTHING with the shipped (empty) config", () => {
    mountProPanel(host);
    mountAdSlot(host, "reading-end");
    mountDonateCard(host);
    expect(host.childNodes).toHaveLength(0);
  });

  it("pro panel renders the offer once one is sellable, and never for Pro readers", () => {
    MONETIZE.pro.price = "US$X / mo";
    MONETIZE.pro.checkoutUrl = "https://example.com/checkout";
    MONETIZE.pro.benefits = [{ zh: "測試", en: "test", vi: "thử" }];
    const m = mountProPanel(host);
    expect(host.querySelector(".pro-panel")).not.toBeNull();
    expect(host.querySelector(".pro-cta")?.getAttribute("href")).toBe("https://example.com/checkout");
    m.destroy();
    setTier("pro");
    mountProPanel(host);
    expect(host.querySelector(".pro-panel")).toBeNull();
  });

  it("ad slot renders only with a provider, never for Pro readers, on closed placements", () => {
    MONETIZE.ads.provider = "test-provider";
    mountAdSlot(host, "reading-end");
    expect(host.querySelector('.ad-slot[data-placement="reading-end"]')).not.toBeNull();
    setTier("pro");
    const before = host.querySelectorAll(".ad-slot").length;
    mountAdSlot(host, "daily-strip");
    expect(host.querySelectorAll(".ad-slot")).toHaveLength(before);
  });

  it("donate card is a single quiet link when configured", () => {
    MONETIZE.donate.href = "https://example.com/support";
    mountDonateCard(host);
    const a = host.querySelector<HTMLAnchorElement>("a.donate-card");
    expect(a?.getAttribute("href")).toBe("https://example.com/support");
    expect(a?.textContent).toBe("Support Tsumugu");
  });
});
