// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createHomeSurface } from "./home.js";
import { tKey as t } from "../i18n/strings.js";

describe("createHomeSurface (marketing front)", () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    document.documentElement.dataset.rail = "en";
  });

  afterEach(() => {
    host.remove();
  });

  it("renders the hero + rail chooser with translated copy, not raw keys", () => {
    const home = createHomeSurface({ onRailChange: () => {}, onNavigate: () => {} });
    host.append(home.el);
    home.render("en");

    const text = home.el.textContent ?? "";
    expect(text).toContain(t("home.hero.headline", "en"));
    expect(text).toContain(t("home.hero.subhead", "en"));
    expect(text).toContain(t("home.rail.chooser", "en"));
    expect(text).not.toContain("home.hero.headline");
    expect(text).not.toContain("home.rail.chooser");
  });

  it("marks the chooser card matching the active rail", () => {
    const home = createHomeSurface({ onRailChange: () => {}, onNavigate: () => {} });
    host.append(home.el);

    home.render("vi");
    expect(home.el.querySelector(".chooser-btn.vi.active")).not.toBeNull();
    expect(home.el.querySelector(".chooser-btn.en.active")).toBeNull();

    home.render("en");
    expect(home.el.querySelector(".chooser-btn.en.active")).not.toBeNull();
    expect(home.el.querySelector(".chooser-btn.vi.active")).toBeNull();
  });

  it("fires onRailChange when a chooser card is clicked", () => {
    let picked: string | null = null;
    const home = createHomeSurface({ onRailChange: (r) => { picked = r; }, onNavigate: () => {} });
    host.append(home.el);
    home.render("en");
    home.el.querySelector<HTMLButtonElement>(".chooser-btn.vi")!.click();
    expect(picked).toBe("vi");
  });
});
